const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { validateFileType } = require('../middlewares/fileValidator');
const { policyActionLimiter } = require('../middlewares/rateLimiter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isS3Configured, uploadFileToS3 } = require('../utils/s3');
const catchAsync = require('../utils/catchAsync');
const { calculateTotalPremium, validateAmount, validateDates } = require('../utils/finance');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/issues');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.log("Skipping mkdir on Vercel: ", err.message);
  }
}

// Setup multer storage (Memory Storage for Vercel)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit to prevent DoS
});

// Issue a new policy and optionally upload documents
router.post('/', authenticateToken, policyActionLimiter, upload.array('files'), validateFileType, catchAsync(async (req, res) => {
  const connection = await req.db.getConnection();
  await connection.beginTransaction();

  try {
    const data = JSON.parse(req.body.data);
    const { customer, vehicle, policy, payment, followUp, installmentSchedule } = data;
    
    // Validate Dates
    validateDates(policy.start_date, policy.expiry_date);
    if (policy.prb_start_date || policy.prb_expiry_date) {
        validateDates(policy.prb_start_date, policy.prb_expiry_date);
    }
    
    let customerId = customer.id;

    // 1. Handle Customer
      if (!customerId) {
      // Create new customer (with unique code using timestamp to avoid duplicates)
      const customerCode = `CUS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
      const [custResult] = await connection.query(
        `INSERT INTO customers (
          customer_code, prefix, first_name, last_name, phone, alt_phone, line_id, facebook, 
          dob, age, id_card_no, address, moo, soi, road, sub_district, district, province, zipcode, 
          note, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerCode, customer.prefix, customer.first_name, customer.last_name, customer.phone, customer.alt_phone || null,
          customer.line_id, customer.facebook, customer.dob || null, customer.age || null, customer.id_card_no || null,
          customer.address, customer.moo, customer.soi, customer.road,
          customer.sub_district, customer.district, customer.province, customer.zipcode, 
          customer.note, req.user.id
        ]
      );
      customerId = custResult.insertId;
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE', 'customers', customerId, `Created customer ${customerCode} via Single Page Form`]);
    } else {
      // Update existing customer
      await connection.query(
        `UPDATE customers SET 
          prefix=?, first_name=?, last_name=?, phone=?, alt_phone=?, line_id=?, facebook=?, 
          dob=?, age=?, id_card_no=?, address=?, moo=?, soi=?, road=?, sub_district=?, district=?, 
          province=?, zipcode=?, note=? 
         WHERE id=?`,
        [
          customer.prefix, customer.first_name, customer.last_name, customer.phone, customer.alt_phone || null,
          customer.line_id, customer.facebook, customer.dob || null, customer.age || null, customer.id_card_no || null,
          customer.address, customer.moo, customer.soi, customer.road, customer.sub_district, customer.district,
          customer.province, customer.zipcode, customer.note, customerId
        ]
      );
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'UPDATE', 'customers', customerId, `Updated customer ID ${customerId} via Single Page Form`]);
    }

    let vehicleId = null;
    let policyId = null;
    let nonMotorPolicyId = null;

    // 2. Handle Vehicle & Policy
    const isMotor = policy.category === 'motor';

    if (isMotor) {
      if (vehicle.id) {
        // Update existing vehicle
        await connection.query(
          `UPDATE vehicles SET 
            customer_id=?, vehicle_type=?, brand=?, model=?, year=?, color=?, 
            plate_no=?, plate_province=?, vin=?, engine_no=?, sum_insured=?, tax_expiry=?
           WHERE id=?`,
          [
            customerId, vehicle.vehicle_type, vehicle.brand, vehicle.model, vehicle.year, vehicle.color,
            vehicle.plate_no, vehicle.plate_province, vehicle.vin, vehicle.engine_no, vehicle.sum_insured || null, vehicle.tax_expiry || null,
            vehicle.id
          ]
        );
        vehicleId = vehicle.id;
        await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'UPDATE', 'vehicles', vehicleId, `Updated vehicle ID ${vehicleId} via Single Page Form`]);
      } else {
        // Insert new Vehicle
        const [vehResult] = await connection.query(
          `INSERT INTO vehicles (
            customer_id, vehicle_type, brand, model, year, color, 
            plate_no, plate_province, vin, engine_no, sum_insured, tax_expiry
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId, vehicle.vehicle_type, vehicle.brand, vehicle.model, vehicle.year, vehicle.color,
            vehicle.plate_no, vehicle.plate_province, vehicle.vin, vehicle.engine_no, vehicle.sum_insured || null, vehicle.tax_expiry || null
          ]
        );
        vehicleId = vehResult.insertId;
      }

      // Recalculate financial values securely
      const commissionPercent = validateAmount(policy.commission_percent || 0, 'Commission Percent');
      const commissionBaht = validateAmount(policy.commission_baht || 0, 'Commission Baht');
      const netPremium = validateAmount(policy.net_premium || 0, 'Net Premium');
      const stampDuty = validateAmount(policy.stamp_duty || 0, 'Stamp Duty');
      const vatAmount = validateAmount(policy.vat || 0, 'VAT');
      const totalPremium = calculateTotalPremium(netPremium, stampDuty, vatAmount);

      // Insert Motor Policy (with unique generated policy number to avoid duplicate entry error)
      const policyNo = policy.policy_no || `POL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
      const [polResult] = await connection.query(
        `INSERT INTO policies (
          customer_id, vehicle_id, policy_no, company, type, sum_insured,
          net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
          prb_start_date, prb_expiry_date, start_date, expiry_date, status, 
          sales_person_id, created_by, repair_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, vehicleId, policyNo, policy.company, policy.type, policy.sum_insured || null,
          netPremium, stampDuty, vatAmount, totalPremium,
          commissionPercent, commissionBaht,
          policy.prb_start_date || null, policy.prb_expiry_date || null, 
          policy.start_date || null, policy.expiry_date || null, policy.status || 'รอดำเนินการ',
          req.user.id, req.user.id, policy.repair_type || 'อู่'
        ]
      );
      policyId = polResult.insertId;
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE', 'policies', policyId, `Created motor policy ${policyNo}`]);
    } else {
      // Non-Motor Policy
      // Recalculate financial values securely
      const commissionPercent = validateAmount(policy.commission_percent || 0, 'Commission Percent');
      const commissionBaht = validateAmount(policy.commission_baht || 0, 'Commission Baht');
      const netPremium = validateAmount(policy.net_premium || 0, 'Net Premium');
      const stampDuty = validateAmount(policy.stamp_duty || 0, 'Stamp Duty');
      const vatAmount = validateAmount(policy.vat || 0, 'VAT');
      const totalPremium = calculateTotalPremium(netPremium, stampDuty, vatAmount);

      const policyNo = policy.policy_no || `NM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
      const [nmPolResult] = await connection.query(
        `INSERT INTO non_motor_policies (
          customer_id, policy_no, company, non_motor_type_id, insured_name, sum_insured,
          net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
          start_date, expiry_date, status, note, additional_data, created_by, sales_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, policyNo, policy.company, policy.non_motor_type_id, policy.insured_name || `${customer.first_name} ${customer.last_name}`,
          policy.sum_insured || null, netPremium, stampDuty, vatAmount, totalPremium,
          commissionPercent, commissionBaht, policy.start_date || null, policy.expiry_date || null,
          policy.status || 'รอดำเนินการ', policy.note, JSON.stringify(policy.additional_data || {}), req.user.id, req.user.id
        ]
      );
      nonMotorPolicyId = nmPolResult.insertId;
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE', 'non_motor_policies', nonMotorPolicyId, `Created non-motor policy ${policyNo}`]);
    }

    // 3. Handle Payment
    if (payment && payment.payment_method) {
      const [payResult] = await connection.query(
        `INSERT INTO payments (
          policy_id, non_motor_policy_id, payment_method, installments, pay_date, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          policyId, nonMotorPolicyId, payment.payment_method, payment.installments || 1, 
          payment.pay_date || null, payment.status || 'รอดำเนินการ'
        ]
      );
      const paymentId = payResult.insertId;

      if (payment.payment_method === 'เงินผ่อน' && installmentSchedule && installmentSchedule.length > 0) {
        for (const inst of installmentSchedule) {
          await connection.query(
            `INSERT INTO installments (
              payment_id, installment_no, due_date, amount, balance_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              paymentId, inst.installment_no, inst.due_date, inst.amount, inst.amount, inst.status
            ]
          );
        }
      }
    }

    // 4. Handle Follow Up (Activity Log / Future Task)
    if (followUp && followUp.status) {
      // In this system, we don't have a dedicated follow_ups table, so we use activity_logs to store the intent
      // Or we can just update the policy status
      if (isMotor && policyId) {
        await connection.query('UPDATE policies SET status = ? WHERE id = ?', [followUp.status, policyId]);
      } else if (!isMotor && nonMotorPolicyId) {
        await connection.query('UPDATE non_motor_policies SET status = ? WHERE id = ?', [followUp.status, nonMotorPolicyId]);
      }
      
      const targetTable = isMotor ? 'policies' : 'non_motor_policies';
      const targetId = isMotor ? policyId : nonMotorPolicyId;
      const details = `Follow up: Status [${followUp.status}], Next Date: ${followUp.next_date || '-'}, Note: ${followUp.note || '-'}`;
      
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'FOLLOW_UP', targetTable, targetId, details]);
    }

    // 5. Handle Documents (Files)
    const fileDataList = JSON.parse(req.body.fileData || '[]');
    let localFileIdx = 0;
    
    for (let i = 0; i < fileDataList.length; i++) {
      const fData = fileDataList[i];
      let filePath = '';
      let fileType = 'image/jpeg';
      let fileSize = 0;
      let fileBuffer = null;
      
      if (fData.file_path && fData.file_path.startsWith('http')) {
        // Already uploaded to Cloudinary
        filePath = fData.file_path;
        fileType = fData.file_type || 'image/jpeg';
        fileSize = fData.file_size || 0;
      } else {
        // Uploaded locally (fallback)
        const file = req.files ? req.files[localFileIdx] : null;
        if (!file) continue;
        fileType = file.mimetype;
        fileSize = file.size;
        fileBuffer = file.buffer; // keep buffer to write to disk
        localFileIdx++;
      }
      
      const fileName = fData.name || 'document';
      
      if (isMotor) {
        const [docResult] = await connection.query(
          `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, note, uploaded_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [customerId, policyId, fData.type_id, fileName, filePath, fileType, fileSize, fData.note || '', req.user.id]
        );
        
        if (fileBuffer) {
          const newDocId = docResult.insertId;
          const s3Key = `documents/motor_${newDocId}`;
          
          if (isS3Configured) {
            try {
              await uploadFileToS3(fileBuffer, s3Key, fileType);
            } catch (e) {
              console.error('S3 upload error:', e);
              throw e; // file_data column removed; propagate error
            }
          } else {
            const diskPath = path.join(__dirname, '../../uploads/documents', `motor_${newDocId}`);
            try {
              fs.writeFileSync(diskPath, fileBuffer);
            } catch(e) {
              console.error('File write error:', e);
              throw e; // file_data column removed; propagate error
            }
          }
          filePath = `/api/documents/file/${newDocId}`;
          await connection.query('UPDATE documents SET file_path = ? WHERE id = ?', [filePath, newDocId]);
        }
      } else {
        const [docResult] = await connection.query(
          `INSERT INTO non_motor_documents (non_motor_policy_id, document_type_id, name, file_path, file_type, file_size, note, uploaded_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [nonMotorPolicyId, fData.type_id, fileName, filePath, fileType, fileSize, fData.note || '', req.user.id]
        );
        
        if (fileBuffer) {
          const newDocId = docResult.insertId;
          const s3Key = `documents/non_motor_${newDocId}`;
          
          if (isS3Configured) {
            try {
              await uploadFileToS3(fileBuffer, s3Key, fileType);
            } catch (e) {
              console.error('S3 upload error:', e);
              throw e; // file_data column removed; propagate error
            }
          } else {
            const diskPath = path.join(__dirname, '../../uploads/documents', `non_motor_${newDocId}`);
            try {
              fs.writeFileSync(diskPath, fileBuffer);
            } catch(e) {
              console.error('File write error:', e);
              throw e; // file_data column removed; propagate error
            }
          }
          filePath = `/api/non-motor-policies/documents/file/${newDocId}`;
          await connection.query('UPDATE non_motor_documents SET file_path = ? WHERE id = ?', [filePath, newDocId]);
        }
      }
    }

    // 6. Handle AI Correction Logging
    const rawAiData = data.rawAiData;
    if (rawAiData) {
      const discrepancies = [];
      
      const cleanVal = (val) => {
        if (val === null || val === undefined) return '';
        return val.toString().toLowerCase().trim().replace(/[\s\-,.:]/g, '');
      };

      // Compare customer fields
      const customerFields = ['prefix', 'first_name', 'last_name', 'phone', 'id_card_no', 'sub_district', 'district', 'province', 'zipcode'];
      customerFields.forEach(field => {
        const ocrVal = cleanVal(rawAiData.customer?.[field]);
        const savedVal = cleanVal(customer?.[field]);
        if (ocrVal !== savedVal) {
          discrepancies.push({
            section: 'customer',
            field,
            ocr_value: rawAiData.customer?.[field] || '',
            saved_value: customer?.[field] || '',
            type: ocrVal === '' ? 'missed' : 'incorrect'
          });
        }
      });

      // Compare vehicle fields (if motor)
      if (isMotor && rawAiData.vehicle && vehicle) {
        const vehicleFields = ['brand', 'model', 'year', 'color', 'plate_no', 'plate_province', 'vin', 'engine_no'];
        vehicleFields.forEach(field => {
          const ocrVal = cleanVal(rawAiData.vehicle?.[field]);
          const savedVal = cleanVal(vehicle?.[field]);
          if (ocrVal !== savedVal) {
            discrepancies.push({
              section: 'vehicle',
              field,
              ocr_value: rawAiData.vehicle?.[field] || '',
              saved_value: vehicle?.[field] || '',
              type: ocrVal === '' ? 'missed' : 'incorrect'
            });
          }
        });
      }

      // Compare policy fields
      if (rawAiData.policy && policy) {
        const policyFields = ['company', 'type', 'policy_no', 'sum_insured', 'net_premium', 'total_premium'];
        policyFields.forEach(field => {
          const ocrVal = cleanVal(rawAiData.policy?.[field]);
          const savedVal = cleanVal(policy?.[field]);
          if (ocrVal !== savedVal) {
            discrepancies.push({
              section: 'policy',
              field,
              ocr_value: rawAiData.policy?.[field] || '',
              saved_value: policy?.[field] || '',
              type: ocrVal === '' ? 'missed' : 'incorrect'
            });
          }
        });
      }

      if (discrepancies.length > 0) {
        try {
          await connection.query(
            `INSERT INTO ai_correction_logs (policy_id, non_motor_policy_id, document_type, ocr_raw_data, saved_data, discrepancies) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              policyId || null,
              nonMotorPolicyId || null,
              rawAiData.document_type || 'unknown',
              JSON.stringify(rawAiData),
              JSON.stringify({ customer, vehicle, policy }),
              JSON.stringify(discrepancies)
            ]
          );
        } catch (dbErr) {
          console.error('Error saving AI correction log:', dbErr);
        }
      }
    }

    await connection.commit();

    // Log policy issuance activity
    try {
      const { logActivity } = require('../utils/activityLogger');
      const policyTypeStr = isMotor ? `รถยนต์ (${policy?.type || '-'})` : `Non-Motor (${policy?.type || '-'})`;
      const custName = `${customer?.prefix || ''}${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();
      const pNo = policy?.policy_no || '-';
      await logActivity(req.db, req, {
        action: 'CREATE_POLICY',
        entity_type: isMotor ? 'policy' : 'non_motor_policy',
        entity_id: isMotor ? policyId : nonMotorPolicyId,
        description: `ออกกรมธรรม์ใหม่ ${policyTypeStr} เลขที่ [${pNo}] ลูกค้า: ${custName} (เบี้ยรวม: ${policy?.total_premium || '-'} บาท)`
      });
    } catch (logErr) {}

    res.status(201).json({ message: 'บันทึกข้อมูลลูกค้าและกรมธรรม์สำเร็จ', customerId, policyId, nonMotorPolicyId });

  } catch (error) {
    await connection.rollback();
    console.error('Transaction Error:', error);
    
    let errMsg = error.message;
    if (error.code === 'ER_DUP_ENTRY') {
      const match = errMsg.match(/Duplicate entry '(.*)' for key '(.*)'/);
      if (match) {
        const val = match[1];
        const key = match[2];
        if (key.includes('policy_no')) {
          errMsg = `เลขที่กรมธรรม์ "${val}" นี้มีในระบบแล้ว กรุณาใช้เลขอื่น หรือตรวจสอบข้อมูลเดิม`;
        } else if (key.includes('customer_code')) {
          errMsg = `รหัสลูกค้า "${val}" ซ้ำในระบบ กรุณาลองใหม่อีกครั้ง`;
        } else if (key.includes('phone')) {
          errMsg = `เบอร์โทรศัพท์ "${val}" นี้มีในระบบแล้ว กรุณาค้นหาลูกค้าจากช่องดึงข้อมูลลูกค้าเก่าอัตโนมัติ`;
        } else if (key.includes('plate_no')) {
          errMsg = `ทะเบียนรถ "${val}" นี้มีในระบบแล้ว กรุณาค้นหาข้อมูลรถจากช่องดึงข้อมูลอัตโนมัติ`;
        } else {
          errMsg = `ข้อมูล "${val}" ซ้ำในระบบ (${key})`;
        }
      } else {
        errMsg = 'มีข้อมูลซ้ำในระบบ (Duplicate Entry)';
      }
    }

    const err = new Error('เกิดข้อผิดพลาด: ' + errMsg);
    err.statusCode = 500;
    throw err;
  } finally {
    connection.release();
  }
}));

module.exports = router;

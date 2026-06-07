const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.post('/', authenticateToken, upload.array('files'), async (req, res) => {
  const connection = await req.db.getConnection();
  await connection.beginTransaction();

  try {
    const data = JSON.parse(req.body.data);
    const { customer, vehicle, policy, payment, followUp, installmentSchedule } = data;
    let customerId = customer.id;

    // 1. Handle Customer
    if (!customerId) {
      // Create new customer
      const customerCode = `CUS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000)).padStart(4, '0')}`;
      const [custResult] = await connection.query(
        `INSERT INTO customers (
          customer_code, prefix, first_name, last_name, phone, email, line_id, facebook, 
          dob, age, id_card_no, address, moo, soi, road, sub_district, district, province, zipcode, occupation, 
          note, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerCode, customer.prefix, customer.first_name, customer.last_name, customer.phone,
          customer.email, customer.line_id, customer.facebook, customer.dob || null, customer.age || null,
          customer.id_card_no, customer.address, customer.moo, customer.soi, customer.road,
          customer.sub_district, customer.district, customer.province, customer.zipcode, customer.occupation,
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
          prefix=?, first_name=?, last_name=?, phone=?, email=?, line_id=?, facebook=?, 
          dob=?, age=?, id_card_no=?, address=?, moo=?, soi=?, road=?, sub_district=?, district=?, 
          province=?, zipcode=?, occupation=?, note=? 
         WHERE id=?`,
        [
          customer.prefix, customer.first_name, customer.last_name, customer.phone, customer.email,
          customer.line_id, customer.facebook, customer.dob || null, customer.age || null, customer.id_card_no,
          customer.address, customer.moo, customer.soi, customer.road, customer.sub_district, customer.district,
          customer.province, customer.zipcode, customer.occupation, customer.note, customerId
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
      // Insert Vehicle
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

      // Calculate Commission for Motor
      let commissionPercent = 0;
      if (policy.type === 'ประกันภัยชั้น 1') commissionPercent = 18;
      else if (policy.type === 'ประกันภัยชั้น 2+') commissionPercent = 25;
      else if (policy.type === 'ประกันภัยชั้น 3+') commissionPercent = 25;
      else if (policy.type === 'ประกันภัยชั้น 3') commissionPercent = 18;
      
      const netPremium = parseFloat(policy.net_premium) || 0;
      const commissionBaht = netPremium * (commissionPercent / 100);

      // Insert Motor Policy
      const policyNo = policy.policy_no || `POL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000)).padStart(4, '0')}`;
      const [polResult] = await connection.query(
        `INSERT INTO policies (
          customer_id, vehicle_id, policy_no, company, type, sum_insured,
          net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
          prb_start_date, prb_expiry_date, start_date, expiry_date, status, 
          sales_person_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, vehicleId, policyNo, policy.company, policy.type, policy.sum_insured || null,
          netPremium, policy.stamp_duty || 0, policy.vat || 0, policy.total_premium || 0,
          commissionPercent, commissionBaht,
          policy.prb_start_date || null, policy.prb_expiry_date || null, 
          policy.start_date || null, policy.expiry_date || null, policy.status || 'รอดำเนินการ',
          req.user.id, req.user.id
        ]
      );
      policyId = polResult.insertId;
      await connection.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CREATE', 'policies', policyId, `Created motor policy ${policyNo}`]);
    } else {
      // Non-Motor Policy
      let commissionPercent = 0;
      const typeName = policy.type_name || ''; // e.g., 'ประกันภัยขนส่งสินค้า'
      if (typeName.includes('ขนส่ง')) commissionPercent = 10;
      else if (typeName.includes('อัคคีภัย') || typeName.includes('ไฟไหม้')) commissionPercent = 23;
      else if (typeName.includes('PA') || typeName.includes('อุบัติเหตุ')) commissionPercent = 18;

      const netPremium = parseFloat(policy.net_premium) || 0;
      const commissionBaht = netPremium * (commissionPercent / 100);

      const policyNo = policy.policy_no || `NM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000)).padStart(4, '0')}`;
      const [nmPolResult] = await connection.query(
        `INSERT INTO non_motor_policies (
          customer_id, policy_no, company, non_motor_type_id, insured_name, sum_insured,
          net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
          start_date, expiry_date, status, note, additional_data, created_by, sales_person_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, policyNo, policy.company, policy.non_motor_type_id, policy.insured_name || `${customer.first_name} ${customer.last_name}`,
          policy.sum_insured || null, netPremium, policy.stamp_duty || 0, policy.vat || 0, policy.total_premium || 0,
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
    if (req.files && req.files.length > 0) {
      const fileDataList = JSON.parse(req.body.fileData || '[]');
      // fileDataList maps index to document_type_id and note
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const fData = fileDataList[i] || { type_id: 6, note: '' }; // default to 'อื่นๆ'
        
        const filePath = `/uploads/${file.filename}`;
        
        if (isMotor) {
          await connection.query(
            `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, note, uploaded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customerId, policyId, fData.type_id, file.originalname, filePath, file.mimetype, file.size, fData.note, req.user.id]
          );
        } else {
          await connection.query(
            `INSERT INTO non_motor_documents (non_motor_policy_id, document_type_id, name, file_path, file_type, file_size, note, uploaded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nonMotorPolicyId, fData.type_id, file.originalname, filePath, file.mimetype, file.size, fData.note, req.user.id]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'บันทึกข้อมูลลูกค้าและกรมธรรม์สำเร็จ', customerId, policyId, nonMotorPolicyId });

  } catch (error) {
    await connection.rollback();
    console.error('Transaction Error:', error);
    res.status(500).json({ error: 'Failed to issue policy: ' + error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;

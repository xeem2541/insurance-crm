const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const axios = require('axios');

// Use memory storage for quick processing without saving to disk permanently
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.post('/extract', authenticateToken, upload.array('images', 10), async (req, res) => {
  let startTime;
  try {
    startTime = Date.now();
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const apiKey = (req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY_REQUIRED' });
    }

    const prompt = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากเอกสารเกี่ยวกับการประกันภัยรถยนต์ของประเทศไทย ได้แก่ ตารางกรมธรรม์ประกันภัยรถยนต์ภาคสมัครใจ (Voluntary Policy Schedule), ตารางกรมธรรม์ประกันภัยรถยนต์ภาคบังคับ (พ.ร.บ. / PRB Schedule), ใบเสร็จรับเงิน/ใบกำกับภาษี, รายการจดทะเบียนรถยนต์ (Vehicle Registration Book), และสลิปการโอนเงินชำระเงินของธนาคาร (Bank Transfer Slip)
    จงวิเคราะห์ภาพถ่ายที่ส่งมาอย่างละเอียด ดึงข้อมูลด้วยความถูกต้องแม่นยำสูงสุด 100% และจำแนกประเภทเอกสารโดยอัตโนมัติ 
    ตอบกลับ in รูปแบบ JSON Object ตามโครงสร้างที่กำหนดเท่านั้น ห้ามมีคำอธิบายอื่นนอกเหนือจาก JSON ห้ามใส่เครื่องหมายคำพูดครอบ JSON หรือใช้ Markdown (\`\`\`)

    กฎการประมวลผลและการสแกนอย่างละเอียด:
    1. จำแนกประเภทเอกสาร (Document Classification):
       - ตรวจสอบว่ารูปภาพคือเอกสารอะไร และระบุประเภทในฟิลด์ "document_type" ดังนี้:
         * "voluntary_policy" = กรมธรรม์สมัครใจ (ประเภท 1, 2+, 3+, 3)
         * "prb_policy" = กรมธรรม์ภาคบังคับ (พ.ร.บ.)
         * "vehicle_book" = สมุดคู่มือจดทะเบียนรถ หรือใบคู่มือจดทะเบียนรถ
         * "payment_slip" = สลิปโอนเงินทางธนาคาร
         * "unknown" = ไม่สามารถระบุประเภทได้ชัดเจน
    2. การวิเคราะห์ความคมชัดและวันหมดอายุ (Verification & Warnings):
       - วิเคราะห์ว่ารูปถ่ายเอกสารมีความคมชัดสมบูรณ์ อ่านง่ายหรือไม่ หากมีจุดที่อ่านยาก/ขาดหาย/เบลอ หรือมีข้อผิดพลาด ให้เขียนคำแจ้งเตือนภาษาไทยสั้นๆ ลงใน "validation.warning_message"
       - ตรวจเช็คว่า กรมธรรม์หรือสลิปหมดอายุหรือยัง (เช็คว่าวันสิ้นสุดคุ้มครองของกรมธรรม์ หรือวันโอนในสลิป เก่ากว่าปัจจุบันหรือไม่) หากหมดอายุหรือนานผิดปกติให้ระบุ "is_expired" เป็น true
    3. การแยกชื่อและคำนำหน้าลูกค้า (Customer Name):
       - คำนำหน้า (prefix): แยกคำนำหน้า เช่น นาย, นาง, นางสาว, น.ส., บริษัท, หจก., บมจ., พญ., นพ.
       - ชื่อจริง (first_name): ชื่อจริง หรือชื่อนิติบุคคล/บริษัท (ในกรณีบริษัท ให้ใส่ชื่อบริษัททั้งหมดที่เหลือ เช่น "แอปเปิ้ล ทรานสปอร์ต จำกัด")
       - นามสกุล (last_name): นามสกุลของบุคคล (หากเป็นนิติบุคคล/บริษัท ให้เว้นว่างเป็น "")
    4. การแยกที่อยู่อย่างชาญฉลาด (Thai Address Parser):
       - sub_district: ตำบล หรือ แขวง (ดึงเฉพาะชื่อ เช่น "คลองจั่น" ตัด ต. หรือ ตำบล หรือ แขวง ออก)
       - district: อำเภอ หรือ เขต (ดึงเฉพาะชื่อ เช่น "บางกะปิ" ตัด อ. หรือ อำเภอ หรือ เขต ออก)
       - province: จังหวัด (ดึงเฉพาะชื่อ เช่น "กรุงเทพมหานคร" ตัด จ. หรือ จังหวัด ออก)
       - zipcode: รหัสไปรษณีย์ 5 หลักเท่านั้น
       - address: **บ้านเลขที่เท่านั้น** (เฉพาะบ้านเลขที่ เช่น "12/34" หรือ "99/1" ห้ามใส่ หมู่, ซอย, ถนน หรืออาคาร เข้ามารวมในฟิลด์นี้เด็ดขาด) และตัดคำว่า "เลขที่" หรือ "บ้านเลขที่" ออกให้เหลือแต่เลขบ้านเลขที่จริงเท่านั้น
       - moo: **หมู่ หรือ หมู่ที่** ของผู้เอาประกันภัย (ดึงเฉพาะตัวเลขหรือข้อความหมู่ เช่น "5" หรือ "หมู่ที่ 5" หากไม่มีให้ใส่ "") **ห้ามเอาคำว่าหมู่ไปรวมในฟิลด์ address**
       - soi: **ซอย** (เช่น "สุขุมวิท 3" หรือ "ซอย 3" หากไม่มีให้ใส่ "") **ห้ามเอาซอยไปรวมในฟิลด์ address**
       - road: **ถนน** (เช่น "สุขุมวิท" หรือ "ถนนสุขุมวิท" หากไม่มีให้ใส่ "") **ห้ามเอาถนนไปรวมในฟิลด์ address**
    5. วันที่และวันคุ้มครอง (Date Handling):
       - รูปแบบ YYYY-MM-DD เสมอ
       - แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (ปี พ.ศ. ลบด้วย 543)
       - start_date (วันเริ่มต้นคุ้มครอง): ให้ดึงจากหัวข้อ 'ระยะเวลาเอาประกันภัย' หรือ 'ระยะเวลาประกันภัย' -> 'เริ่มต้นวันที่' หรือ 'จากวันที่' เท่านั้น **ห้ามดึงวันจดทะเบียนรถ หรือวันออกเอกสาร หรือวันคุ้มครองของ พ.ร.บ. มาใส่ปนเด็ดขาด**
       - expiry_date (วันสิ้นสุดคุ้มครอง): ให้ดึงจากหัวข้อ 'ระยะเวลาเอาประกันภัย' หรือ 'ระยะเวลาประกันภัย' -> 'สิ้นสุดวันที่' หรือ 'ถึงวันที่' เท่านั้น **ห้ามดึงวันภาษีสิ้นสุด หรือวันจดทะเบียนรถ หรือวันคุ้มครองของ พ.ร.บ. มาใส่ปนเด็ดขาด**
    6. ข้อมูลตัวเลขและการเงิน (Financial & Number Figures):
       - ให้นำลูกน้ำ (,) เครื่องหมายเงิน (฿) หรือช่องว่างออกให้หมด ให้เหลือเฉพาะตัวเลขทศนิยมเพียวๆ เช่น "15,500.00" -> "15500.00"
       - ตัวเลขทั้งหมดในระบบต้องใช้เลขอารบิกเท่านั้น ห้ามส่งเลขไทย (เช่น ๑, ๒, ๓) กลับมาโดยเด็ดขาด
    7. ข้อมูลรถยนต์ (Vehicle Info):
       - vehicle_type: ประเภทรถ เช่น รถเก๋ง, รถกระบะ, รถจักรยานยนต์, รถกระบะ 4 ประตู, รถโดยสาร, รถ 6 ล้อ, รถ 10 ล้อ, รถพ่วง, รถเพื่อการเกษตร
       - sum_insured: **ทุนประกันภัยของตัวรถยนต์** (ดึงจากหมวด "ความเสียหายต่อรถยนต์" หรือ "รถยนต์สูญหาย/ไฟไหม้" เท่านั้น **ห้ามดึงค่าความรับผิดต่อบุคคลภายนอก 500,000 หรือ 1,000,000 เด็ดขาด** หากเป็นประกันชั้น 3 หรือเอกสาร พ.ร.บ. ให้ระบุเป็น 0)
       - color: **สีรถยนต์** แปลงเป็นภาษาไทยให้ตรงกับตัวเลือก เช่น ขาว, ดำ, เทา, บรอนซ์เงิน, บรอนซ์ทอง, แดง, น้ำเงิน, ฟ้า, น้ำตาล, เขียว, เหลือง, ส้ม, ชมพู (หากไม่มีให้ระบุสีตามที่เห็นในภาพ)
    8. สลิปโอนเงิน (Bank Transfer Slip Data):
       - ดึงเฉพาะเมื่อเอกสารคือสลิปโอนเงินธนาคาร เพื่อกรอกลงใน "payment_slip_data"
       - ดึงยอดเงิน วันที่และเวลาโอน ชื่อผู้โอน ธนาคารต้นทาง และปลายทาง
    9. กฎความถูกต้องและการกรองขยะ (Strict Sanitization Rules):
       - หากไม่พบข้อมูลในฟิลด์ใดๆ ให้ส่งกลับเป็นสตริงว่าง "" เสมอ ห้ามใส่คำว่า "ไม่มี", "ไม่ระบุ", "N/A", หรือเครื่องหมายขีด "-" หรือช่องว่างเด็ดขาด
       - สำหรับเบอร์โทรศัพท์ (phone) และเลขบัตรประชาชน (id_card_no) ต้องประกอบด้วยตัวเลขอารบิกเท่านั้น ห้ามใส่เครื่องหมายลบ (-), ช่องว่าง, วงเล็บ หรือตัวอักษรใดๆ ปะปน

    โครงสร้าง JSON ที่ต้องการส่งกลับ (ห้ามเปลี่ยนชื่อ Key เด็ดขาด):
    {
      "document_type": "voluntary_policy | prb_policy | vehicle_book | payment_slip | unknown",
      "validation": {
        "is_clear": true,
        "warning_message": "ข้อความเตือนในกรณีรูปภาพเบลอ มีจุดแสงสะท้อน ข้อมูลสำคัญอ่านไม่ได้ หรือกรมธรรม์หมดอายุ (ภาษาไทย)",
        "is_expired": false
      },
      "payment_slip_data": {
        "bank_sender": "ธนาคารต้นทาง (เช่น กสิกรไทย)",
        "bank_receiver": "ธนาคารปลายทาง (เช่น ไทยพาณิชย์)",
        "amount": "จำนวนเงินโอน (ตัวเลขทศนิยมเพียวๆ เช่น 15000.00)",
        "transfer_date_time": "วันเวลาโอน (YYYY-MM-DD)",
        "sender_name": "ชื่อผู้โอนเงิน",
        "ref_no": "เลขที่อ้างอิงสลิป"
      },
      "customer": {
        "prefix": "คำนำหน้า",
        "first_name": "ชื่อจริง หรือ ชื่อบริษัท",
        "last_name": "นามสกุล (ถ้าเป็นบริษัทให้เว้นว่าง)",
        "phone": "เบอร์โทรศัพท์ของผู้เอาประกันภัย/ลูกค้า (**เน้นย้ำ: ให้กรอกเฉพาะตัวเลขล้วน ไม่มีขีดหรือช่องว่าง ห้ามดึงเบอร์บริษัทประกันภัย เช่น 1557, 1484 หรือเบอร์ตัวแทน/นายหน้ามาใส่เด็ดขาด หากหาจากข้อมูลผู้เอาประกันภัยไม่ได้ ให้ใส่เป็นสตริงว่าง \"\"**)",
        "id_card_no": "เลขบัตรประจำตัวประชาชน 13 หลักของผู้เอาประกันภัย (**เน้นย้ำ: ส่งเฉพาะตัวเลขล้วน 13 หลักเท่านั้น ไม่มีขีดหรือช่องว่าง หากหาไม่พบให้ส่งเป็นสตริงว่าง \"\"**)",
        "dob": "วันเดือนปีเกิด (YYYY-MM-DD)",
        "address": "บ้านเลขที่ (เฉพาะบ้านเลขที่เท่านั้น ห้ามมีคำว่า หมู่ หรือซอย ถนน ปนอยู่ และตัดคำว่า เลขที่ หรือ บ้านเลขที่ ออก)",
        "moo": "หมู่ หรือ หมู่ที่ (เช่น 5 หรือ หมู่ที่ 5)",
        "soi": "ซอย",
        "road": "ถนน",
        "sub_district": "ตำบล/แขวง",
        "district": "อำเภอ/เขต",
        "province": "จังหวัด",
        "zipcode": "รหัสไปรษณีย์"
      },
      "vehicle": {
        "vehicle_type": "ประเภทรถ",
        "brand": "ยี่ห้อรถ",
        "model": "รุ่นรถ",
        "year": "ปีรถ (ค.ศ.)",
        "color": "สีรถยนต์",
        "plate_no": "เลขทะเบียนรถ (ไม่รวมจังหวัด)",
        "plate_province": "จังหวัดของทะเบียนรถ",
        "vin": "เลขตัวถัง",
        "engine_no": "เลขเครื่องยนต์",
        "registration_date": "วันจดทะเบียนรถ (YYYY-MM-DD)",
        "sum_insured": "ทุนประกันภัยของรถ"
      },
      "policy": {
        "company": "ชื่อบริษัทประกันภัย",
        "type": "ประเภทประกัน (เช่น ประกันภัยชั้น 1, ชั้น 2+, พ.ร.บ.)",
        "category": "motor หรือ non-motor",
        "policy_no": "เลขที่กรมธรรม์",
        "sum_insured": "ทุนประกันภัยตัวรถ",
        "net_premium": "เบี้ยสุทธิก่อนภาษี (ตัวเลข)",
        "stamp_duty": "อากรแสตมป์ (ตัวเลข)",
        "vat": "ภาษีมูลค่าเพิ่ม (ตัวเลข)",
        "total_premium": "เบี้ยประกันภัยรวม (ตัวเลข)",
        "start_date": "วันเริ่มต้นคุ้มครอง (YYYY-MM-DD)",
        "expiry_date": "วันสิ้นสุดคุ้มครอง (YYYY-MM-DD)"
      }
    }`;

    const imageParts = req.files.map(file => ({
      inline_data: {
        mime_type: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }));

    const modelsToTry = [
      { name: 'gemini-3.1-flash-lite', timeout: 12000 },  // High quota (500 RPD) - Primary model for fast, reliable scans
      { name: 'gemini-3.5-flash', timeout: 8000 },        // Flagship model (20 RPD) - Fallback
      { name: 'gemini-2.5-flash-lite', timeout: 6000 }    // Final speed-focused fallback (20 RPD)
    ];

    let lastError = null;
    let responseText = null;
    let usedModelName = 'unknown';

    for (const modelConfig of modelsToTry) {
      try {
        console.log(`Trying Gemini model: ${modelConfig.name}`);
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.name}:generateContent`,
          {
            contents: [
              {
                parts: [
                  { text: prompt },
                  ...imageParts // Support multiple images seamlessly
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          },
          {
            headers: {
              'x-goog-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            timeout: modelConfig.timeout
          }
        );
        
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.data.candidates[0].content.parts[0].text;
          usedModelName = modelConfig.name;
          console.log(`Successfully processed with model: ${modelConfig.name}`);
          break; // Success! Exit the loop
        }
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.warn(`Failed with model ${modelConfig.name}:`, msg);
        
        // If it's a key/auth issue (400 Bad Request (often invalid key), 401 Unauthorized, 403 Forbidden), 
        // fail immediately since other models will also fail
        if (status === 400 || status === 401 || status === 403) {
          throw error;
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error('ทุกโมเดลของ Gemini เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง');
    }
    
    // Clean up markdown syntax if Gemini returns it despite instructions
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", jsonText);
      return res.status(500).json({ error: 'Failed to parse AI response into JSON. Please try again with a clearer image.' });
    }

    // Verify Premium Math Formula: net_premium + stamp_duty + vat = total_premium
    if (parsedData && parsedData.policy) {
      let net = parseFloat(parsedData.policy.net_premium || 0);
      let stamp = parseFloat(parsedData.policy.stamp_duty || 0);
      let vat = parseFloat(parsedData.policy.vat || 0);
      let total = parseFloat(parsedData.policy.total_premium || 0);

      if (net > 0 && total > 0) {
        const calculatedTotal = net + stamp + vat;
        const diff = Math.abs(calculatedTotal - total);

        if (diff > 0.001) {
          if (diff < 5.0) {
            // Mismatch is small (likely due to OCR decimal reading errors), auto-adjust VAT
            console.log(`Small premium math mismatch detected: Calculated ${calculatedTotal}, Real ${total}. Adjusting VAT...`);
            vat = total - net - stamp;
            parsedData.policy.vat = vat.toFixed(2);
            
            if (!parsedData.validation) {
              parsedData.validation = { is_clear: true, warning_message: '', is_expired: false };
            }
            const adjustMsg = "ระบบตรวจสอบคำนวณปรับทศนิยมเบี้ยและภาษีมูลค่าเพิ่มให้ถูกต้องตรงกับยอดชำระแล้ว";
            parsedData.validation.warning_message = parsedData.validation.warning_message 
              ? `${parsedData.validation.warning_message} (${adjustMsg})`
              : adjustMsg;
          } else {
            // Significant mismatch, add a warning
            if (!parsedData.validation) {
              parsedData.validation = { is_clear: true, warning_message: '', is_expired: false };
            }
            const mismatchMsg = `ยอดเบี้ยคำนวณสแกน (สุทธิ ${net} + อากร ${stamp} + VAT ${vat} = ${calculatedTotal.toFixed(2)}) ไม่ตรงกับเบี้ยรวมจริงในรูป (${total})`;
            parsedData.validation.warning_message = parsedData.validation.warning_message 
              ? `${parsedData.validation.warning_message} * ${mismatchMsg}`
              : mismatchMsg;
          }
        }
      }
    }

    // Check if ID card is present but invalid in length
    if (parsedData?.customer?.id_card_no) {
      const cleanId = parsedData.customer.id_card_no.replace(/\D/g, '');
      if (cleanId.length > 0 && cleanId.length !== 13) {
        if (!parsedData.validation) {
          parsedData.validation = { is_clear: true, warning_message: '', is_expired: false };
        }
        const idMsg = `เลขบัตรประชาชนที่สแกนได้มี ${cleanId.length} หลัก (ไม่ครบ 13 หลัก)`;
        parsedData.validation.warning_message = parsedData.validation.warning_message 
          ? `${parsedData.validation.warning_message} * ${idMsg}`
          : idMsg;
      }
    }

    const processingTimeMs = Date.now() - startTime;
    let hasWarning = false;
    let warningMsg = '';
    let docType = parsedData?.document_type || 'unknown';
    
    if (parsedData?.validation?.warning_message) {
      hasWarning = true;
      warningMsg = parsedData.validation.warning_message;
    }

    if (req.db) {
      req.db.query(
        'INSERT INTO ai_usage_logs (document_type, is_success, has_warning, warning_message, model_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
        [docType, true, hasWarning, warningMsg, usedModelName, processingTimeMs]
      ).catch(err => console.error("Error logging AI usage:", err));
    }

    res.json(parsedData);

  } catch (error) {
    const processingTimeMs = startTime ? (Date.now() - startTime) : 0;
    const apiError = error.response?.data?.error?.message || error.message;
    console.error('OCR Error Details:', error.response?.data || error);
    
    if (req.db) {
      req.db.query(
        'INSERT INTO ai_usage_logs (document_type, is_success, has_warning, warning_message, model_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
        ['unknown', false, false, apiError, 'unknown', processingTimeMs]
      ).catch(err => console.error("Error logging failed AI usage:", err));
    }

    res.status(500).json({ error: apiError });
  }
});

module.exports = router;

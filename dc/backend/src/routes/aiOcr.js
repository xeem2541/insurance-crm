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

    กฎเหล็กเพื่อเพิ่มความแม่นยำสูงสุด 100% และป้องกันความสับสน (Confusion Prevention Checklist):
    
    1. การแยกแยะ "เลขตัวถัง" และ "เลขเครื่องยนต์" (VIN vs Engine No):
       - **เลขตัวถัง/เลขตัวรถ (vin):** มักจะอยู่หัวข้อ 'เลขตัวถัง' หรือ 'เลขตัวรถ' หรือ 'Chassis No.' เป็นรหัสตัวเลขผสมอักษรยาว 17 หลัก (สำหรับรถยนต์รุ่นใหม่ เช่น ขึ้นต้นด้วย MRH..., MNT..., PM1..., PL3...) ห้ามมีขีด (-) หรือเว้นวรรค
       - **เลขเครื่องยนต์ (engine_no):** มักจะระบุใต้หัวข้อ 'เลขเครื่องยนต์' หรือ 'Engine No.' เป็นรหัสตัวเลขผสมอักษรที่สั้นกว่าเลขตัวถัง (ประมาณ 6-12 หลัก เช่น ขึ้นต้นด้วย 1NZ, 2AR, 4JK, K24A)
       - *ห้ามสลับเลขเครื่องยนต์กับเลขตัวถังอย่างเด็ดขาด* ตรวจเช็คตำแหน่งของฉลากกำกับให้ถี่ถ้วน
       
    2. การคัดเลือก "ทุนประกันภัยตัวรถยนต์" (Sum Insured):
       - **ทุนประกันภัย (sum_insured):** จะต้องสแกนหาตัวเลขจำนวนเงินเอาประกันภัยของ "ตัวรถยนต์เอาประกันภัย" เท่านั้น ซึ่งมักระบุอยู่ในตารางความรับผิดต่อตัวรถยนต์ภายใต้ข้อความ 'ความเสียหายต่อรถยนต์' หรือ 'รถยนต์สูญหาย/ไฟไหม้' (มูลค่ามักอยู่ช่วง 100,000 ถึง 2,000,000 บาท เป็นเลขจำนวนเต็มหรือหลักแสนกลมๆ เช่น 350,000, 500,000)
       - *ห้ามนำวงเงินคุ้มครองความรับผิดต่อบุคคลภายนอก* (เช่น ความคุ้มครองต่อชีวิต/ร่างกายบุคคลภายนอก 500,000 บาท หรือ 1,000,000 บาท หรือความคุ้มครองทรัพย์สินบุคคลภายนอก 1,000,000 หรือ 5,000,000 บาท) มาใส่เป็นทุนประกันรถยนต์เป็นอันขาด!
       - *ห้ามนำเบี้ยประกันภัย* (เช่น เบี้ยสุทธิ 12,000.00 หรือเบี้ยรวม 13,500.00) มาใส่ในช่องทุนประกันภัยนี้
       - หากเป็นเอกสาร พ.ร.บ. (prb_policy) หรือเป็นประกันภัยประเภท 3 (ชั้น 3 ที่ไม่คุ้มครองตัวรถ) ให้ระบุทุนประกันภัยรถยนต์เป็น 0
       
    3. การกรองและจัดรูปแบบชื่อและคำนำหน้าลูกค้า (Customer Name & Info):
       - **คำนำหน้า (prefix):** แยกคำนำหน้าออกมาใส่ฟิลด์ prefix เท่านั้น เช่น นาย, นาง, นางสาว, น.ส., เด็กชาย, เด็กหญิง, บริษัท, บจก., หจก., พญ., นพ.
       - **ชื่อจริง (first_name):** ชื่อจริงของบุคคล หรือชื่อบริษัท/นิติบุคคลทั้งหมดที่เหลือ (เช่น ถ้าเป็น "บริษัท แอปเปิ้ล ทรานสปอร์ต จำกัด" ให้ prefix คือ "บริษัท" และ first_name คือ "แอปเปิ้ล ทรานสปอร์ต จำกัด")
       - **นามสกุล (last_name):** นามสกุลของบุคคลจริง (ห้ามดึงข้อมูลบริษัทประกันภัย เช่น วิริยะประกันภัย หรือเบอร์คอลเซ็นเตอร์มาใส่ และหากเป็นนิติบุคคล/บริษัท ให้ใส่สตริงว่าง "")
       - **เบอร์โทรศัพท์ (phone):** ดึงเบอร์โทรศัพท์หลักของลูกค้าผู้เอาประกันภัย/ผู้ติดต่อหลัก ส่งเฉพาะตัวเลขล้วน (ความยาว 9-10 หลัก ไม่มีขีดและช่องว่าง) *ห้ามดึงเบอร์โทรศัพท์ของบริษัทประกันภัย (เช่น 1557, 1484, 02-xxx-xxxx) หรือเบอร์ตัวแทน/นายหน้ามาใส่เป็นเบอร์โทรลูกค้าอย่างเด็ดขาด*
       - **เบอร์โทรศัพท์สำรอง/เพิ่มเติม (alt_phone):** ดึงเบอร์โทรศัพท์สำรอง เบอร์บ้าน หรือเบอร์มือถือตัวที่สองของลูกค้าที่ปรากฏอยู่ในเอกสาร (หากมี) ส่งเฉพาะตัวเลขล้วน (ความยาว 9-10 หลัก ไม่มีขีดและช่องว่าง) หากไม่มีให้ส่งเป็นสตริงว่าง ""
       - **เลขบัตรประชาชน (id_card_no):** ดึงเฉพาะเลขบัตรประจำตัวประชาชน 13 หลักของผู้เอาประกันภัย ส่งเฉพาะตัวเลขล้วน ไม่มีขีดหรือช่องว่าง หากหาไม่พบให้ส่งเป็นสตริงว่าง ""

    4. การแยกแยะที่อยู่รายตำบล/แขวง/อำเภอ/เขต/จังหวัด (Thai Address Parser):
       - **ตำบล/แขวง (sub_district):** ดึงเฉพาะชื่อตำบล/แขวงเท่านั้น เช่น "คลองจั่น" ตัดคำนำหน้า เช่น ต., ตำบล, แขวง ออก
       - **อำเภอ/เขต (district):** ดึงเฉพาะชื่ออำเภอ/เขตเท่านั้น เช่น "บางกะปิ" ตัดคำนำหน้า เช่น อ., อำเภอ, เขต ออก
       - **จังหวัด (province):** ดึงเฉพาะชื่อจังหวัดเท่านั้น เช่น "กรุงเทพมหานคร" หรือ "นนทบุรี" ตัดคำนำหน้า เช่น จ., จังหวัด ออก
       - *กรณียกเว้นสำหรับกรุงเทพมหานคร:* ไม่มีตำบล/อำเภอ ให้ใส่ชื่อ แขวง ลงใน sub_district และชื่อ เขต ลงใน district โดยห้ามมีคำว่า แขวง หรือ เขต ปะปน (เช่น แขวงคลองเตย -> sub_district = "คลองเตย", เขตคลองเตย -> district = "คลองเตย")
       - *กรณียกเว้นสำหรับอำเภอเมือง:* สำหรับอำเภอเมืองของจังหวัดต่างๆ ให้คงคำว่า "เมือง" เอาไว้ เช่น "เมืองนนทบุรี" หรือ "เมืองเชียงใหม่" เพราะเป็นชื่อเฉพาะของอำเภอ ไม่ใช่คำนำหน้าทั่วไป
       - **บ้านเลขที่ (address):** บ้านเลขที่เท่านั้น เช่น "123/45" หรือ "99/1" *ห้ามนำหมู่, ซอย, ถนน หรือชื่ออาคารมารวมในฟิลด์นี้* และตัดคำว่า "เลขที่" หรือ "บ้านเลขที่" ออก
       - **หมู่ (moo):** ดึงเฉพาะตัวเลขหมู่หรือข้อความ เช่น "5" หรือ "หมู่ที่ 5"
       - **ซอย (soi) และ ถนน (road):** ดึงชื่อซอยและชื่อถนน เช่น soi = "สุขุมวิท 3", road = "สุขุมวิท"
       - **รหัสไปรษณีย์ (zipcode):** ดึงเฉพาะรหัสไปรษณีย์ 5 หลักของที่อยู่นั้นเท่านั้น ส่งเฉพาะตัวเลขล้วน 5 หลัก ไม่มีขีดหรือช่องว่างเด็ดขาด หากหาไม่พบให้ส่งเป็นสตริงว่าง ""

    5. การจัดการวันที่และวันคุ้มครอง (Date Handling):
       - รูปแบบ YYYY-MM-DD เสมอ
       - แปลงปี พ.ศ. ให้เป็น ค.ศ. เสมอ (ค.ศ. = พ.ศ. - 543)
       - **วันเริ่มต้นคุ้มครอง (start_date):** ให้ดึงจากหัวข้อ 'ระยะเวลาเอาประกันภัย' (Period of Insurance) -> 'เริ่มต้นวันที่' หรือ 'จากวันที่' ของตัวตารางหลักประกันภัยรถยนต์สมัครใจ ห้ามดึงวันจดทะเบียนรถ หรือวันออกเอกสาร หรือวันออกกรมธรรม์ หรือวันคุ้มครองของ พ.ร.บ. มาปะปน
       - **วันสิ้นสุดคุ้มครอง (expiry_date):** ให้ดึงจากหัวข้อ 'ระยะเวลาเอาประกันภัย' -> 'สิ้นสุดวันที่' หรือ 'ถึงวันที่'
       - *ห้ามสลับช่อง* ระหว่างวันที่เริ่มต้นคุ้มครอง วันสิ้นสุดคุ้มครอง วันที่ทำสัญญา (Issue Date) หรือวันภาษีหมดอายุ

    6. การตรวจสอบตัวเลขทางการเงิน (Financial verification):
       - เอาเครื่องหมายลูกน้ำ (,) เครื่องหมายเงิน (฿) หรือช่องว่างออกให้หมด เหลือเฉพาะตัวเลขทศนิยมเพียวๆ เช่น "15,500.00" -> "15500.00"

    7. กฎการตรวจสอบความถูกต้องทั่วไป (General Sanitization Rules):
       - หากไม่พบข้อมูลในฟิลด์ใดๆ ให้ส่งกลับเป็นสตริงว่าง "" เสมอ ห้ามใส่คำว่า "ไม่มี", "ไม่ระบุ", "N/A", หรือเครื่องหมายขีด "-" เด็ดขาด

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
        "alt_phone": "เบอร์โทรศัพท์สำรองหรือเบอร์ติดต่อเพิ่มเติมของลูกค้า/ผู้ติดต่อสำรอง (**เน้นย้ำ: ส่งเฉพาะตัวเลขล้วน 9-10 หลัก ไม่มีขีดหรือช่องว่าง หากหาไม่พบหรือไม่มีให้ส่งเป็นสตริงว่าง \"\"**)",
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
      { name: 'gemini-2.5-pro', timeout: 15000 },         // Smartest: 2.5 Pro (Highest reasoning & accuracy)
      { name: 'gemini-1.5-pro', timeout: 15000 },         // Stable Pro: 1.5 Pro
      { name: 'gemini-3.1-flash-lite', timeout: 12000 },  // High quota fallback (500 RPD)
      { name: 'gemini-2.5-flash', timeout: 10000 },       // Flash fallback (20 RPD)
      { name: 'gemini-2.5-flash-lite', timeout: 8000 }    // Flash Lite fallback (20 RPD)
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

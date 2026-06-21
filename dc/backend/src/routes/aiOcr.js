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

    const prompt = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากเอกสารการประกันภัยของประเทศไทย ทั้งประกันภัยรถยนต์ (Motor Insurance ได้แก่ ตารางกรมธรรม์สมัครใจ, ตารางกรมธรรม์ภาคบังคับ/พ.ร.บ., เล่มทะเบียนรถ) และประกันภัยอื่นๆ ที่ไม่ใช่รถยนต์ (Non-Motor Insurance ได้แก่ ประกันอุบัติเหตุส่วนบุคคล/PA, ประกันสุขภาพ, ประกันอัคคีภัย/ไฟไหม้, ประกันภัยขนส่งสินค้า, ประกันชีวิต ฯลฯ) รวมถึงใบเสร็จรับเงิน และสลิปการโอนเงินชำระเงินของธนาคาร (Bank Transfer Slip)
    จงวิเคราะห์ภาพถ่ายที่ส่งมาอย่างละเอียด ดึงข้อมูลด้วยความถูกต้องแม่นยำสูงสุด 100% และจำแนกประเภทเอกสารและประเภทการรับประกันภัยโดยอัตโนมัติ 
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
       - **การตรวจเช็คปีที่ถูกต้อง (Year Check Rule):** ตรวจสอบปี พ.ศ. ในวันที่เริ่มและสิ้นสุดให้ดี (โดยทั่วไปจะห่างกัน 1 ปีพอดี เช่น เริ่มต้น 2569 สิ้นสุด 2570 หรือวันเดียวกันแต่คนละปี หากในตารางมีเลขปีที่ดูเลือนราง ให้ใช้บริบทระยะเวลาความคุ้มครอง 1 ปีในการคำนวณและยืนยันปีที่ถูกต้อง เช่น หากเริ่มต้นเป็น 31/03/2569 สิ้นสุดย่อมเป็น 31/03/2570)

    6. การตรวจสอบตัวเลขทางการเงิน (Financial verification):
       - เอาเครื่องหมายลูกน้ำ (,) เครื่องหมายเงิน (฿) หรือช่องว่างออกให้หมด เหลือเฉพาะตัวเลขทศนิยมเพียวๆ เช่น "15,500.00" -> "15500.00"

    7. กฎการตรวจสอบความถูกต้องทั่วไป (General Sanitization Rules):
       - หากไม่พบข้อมูลในฟิลด์ใดๆ ให้ส่งกลับเป็นสตริงว่าง "" เสมอ ห้ามใส่คำว่า "ไม่มี", "ไม่ระบุ", "N/A", หรือเครื่องหมายขีด "-" เด็ดขาด

    8. การคัดแยกประเภทการรับประกันภัย (Motor vs Non-Motor Classification):
       - หากเอกสารเป็นประกันภัยรถยนต์ หรือ พ.ร.บ. ให้ระบุ policy.category = "motor"
       - หากเอกสารเป็นประกันภัยประเภทอื่นที่ไม่ใช่เกี่ยวกับรถยนต์ เช่น ประกันสุขภาพ, ประกันอุบัติเหตุส่วนบุคคล (PA), ประกันอัคคีภัย/ไฟไหม้, ประกันภัยขนส่งสินค้า, ประกันชีวิต ฯลฯ ให้ระบุ policy.category = "non-motor" และระบุชื่อประเภทประกันภัยใน policy.type (เช่น "ประกันสุขภาพ", "ประกันภัยอุบัติเหตุส่วนบุคคล (PA)", "ประกันอัคคีภัย") และให้ปล่อยฟิลด์ข้อมูลตัวรถ (vehicle) เป็นสตริงว่างทั้งหมด ""

    9. การคัดแยกและแปลงชื่อบริษัทประกันภัยให้ถูกต้องตามมาตรฐาน (Insurance Company Mapping Checklist):
       - เมื่อตรวจพบชื่อย่อหรือชื่อเรียกของบริษัทประกันภัยในรูปภาพ ให้สวมและตอบกลับในฟิลด์ policy.company เป็นชื่อทางการเต็มรูปแบบตามตารางเปรียบเทียบต่อไปนี้เสมอ:
         * "วิริยะ", "วิริยะประกันภัย" ➡️ "บริษัท วิริยะประกันภัย จำกัด (มหาชน)"
         * "กรุงเทพ", "กรุงเทพประกันภัย", "BKI" ➡️ "บริษัท กรุงเทพประกันภัย จำกัด (มหาชน)"
         * "ธนชาต", "ธนชาตประกันภัย" ➡️ "บริษัท ธนชาตประกันภัย จำกัด (มหาชน)"
         * "ทิพย", "ทิพยประกันภัย", "TIP" ➡️ "บริษัท ทิพยประกันภัย จำกัด (มหาชน)"
         * "โตเกียวมารีน", "คุ้มภัยโตเกียวมารีน" ➡️ "บริษัท คุ้มภัยโตเกียวมารีนประกันภัย (ประเทศไทย) จำกัด (มหาชน)"
         * "ไทยวิวัฒน์", "ไทยวิวัฒน์ประกันภัย" ➡️ "บริษัท ไทยวิวัฒน์ จำกัด (มหาชน)"
         * "เมืองไทย", "เมืองไทยประกันภัย" ➡️ "บริษัท เมืองไทยประกันภัย จำกัด (มหาชน)"
         * "แอกซ่า", "แอกซ่าประกันภัย", "AXA" ➡️ "บริษัท แอกซ่าประกันภัย จำกัด (มหาชน)"
         * "MSIG", "เอ็ม เอส ไอ จี" ➡️ "บริษัท เอ็ม เอส ไอ จี ประกันภัย (ประเทศไทย) จำกัด (มหาชน)"
         * "LMG", "แอลเอ็มจี" ➡️ "บริษัท แอลเอ็มจี ประกันภัย จำกัด (มหาชน)"
         * "ชับบ์", "ชับบ์สามัคคี", "Chubb" ➡️ "บริษัท ชับบ์สามัคคีประกันภัย จำกัด (มหาชน)"
         * "นวกิจ", "นวกิจประกันภัย" ➡️ "บริษัท นวกิจประกันภัย จำกัด (มหาชน)"
         * "เออร์โก้", "เออร์โก", "Ergo" ➡️ "บริษัท เออร์โกประกันภัย (ประเทศไทย) จำกัด (มหาชน)"
         * "ไอโออิ", "ไอโออิกรุงเทพ", "Aioi" ➡️ "บริษัท ไอโออิ กรุงเทพ ประกันภัย จำกัด (มหาชน)"
         * "อลิอันซ์", "อลิอันซ์อยุธยา", "Allianz" ➡️ "บริษัท อลิอันซ์ อยุธยา ประกันภัย จำกัด (มหาชน)"
         * "เทเวศ", "เทเวศประกันภัย" ➡️ "บริษัท เทเวศประกันภัย จำกัด (มหาชน)"
         * "อินทร", "อินทรประกันภัย" ➡️ "บริษัท อินทรประกันภัย จำกัด (มหาชน)"
         * "มิตรแท้", "มิตรแท้ประกันภัย" ➡️ "บริษัท มิตรแท้ประกันภัย จำกัด (มหาชน)"

    10. การเพิ่มความแม่นยำภาษาไทยและการสะกดคำ (Thai OCR Spellchecking & Accuracy Rule):
        - โปรดวิเคราะห์และสังเกตพยัญชนะ สระ และวรรณยุกต์ภาษาไทยอย่างละเอียดถี่ถ้วนที่สุด (เช่น สระบน ิ ี ึ ื สระล่าง ุ ู และวรรณยุกต์ ่ ้ ๊ ๋ รวมถึงตัวการันต์ ์ และไม้ไต่คู้ ็) ห้ามอ่านข้ามหรือสะกดตกหล่นอย่างเด็ดขาด โดยเฉพาะการพิมพ์ทับซ้อนกันในฟอนต์ภาษาไทยบางแบบ เช่น "ดิ์", "ปิ่", "สิทธิ์", "สุทธิ์"
        
    11. กฎการวิเคราะห์และแก้ไขตัวสะกดผิดพลาดตามพจนานุกรมและบริบทภาษาไทย (Thai Context-Aware Spellchecking & Reconstruction):
        - จงแปลงตัวอักษรหรือคำที่สแกนผิดพลาดจากลักษณะฟอนต์เอกสาร (OCR Typos) ให้เป็นคำภาษาไทยที่เป็นชื่อเรียกหรือคำศัพท์ที่เป็นทางการและถูกต้อง 100% เสมอ เช่น:
          * แก้ไขตัวสะกดทั่วไป: "บรีษัท" หรือ "บรษัท" ➡️ "บริษัท", "ห้างห้นส่วน" ➡️ "ห้างหุ้นส่วน", "ตารางกรมธรรม" ➡️ "ตารางกรมธรรม์", "ผ้อาวประกันภัย" ➡️ "ผู้เอาประกันภัย", "เลขที" ➡️ "เลขที่"
          * แก้ไขชื่อบริษัทประกันภัย: ตรวจสอบและแมปปิ้งชื่อตามตารางกฎข้อที่ 9 อย่างเคร่งครัด
          * แก้ไขชื่อจังหวัด ทะเบียน อำเภอ และตำบล: ห้ามสะกดผิดเพี้ยนเด็ดขาด เช่น "บางกะป๊" ➡️ "บางกะปิ", "คลองเต้ย" ➡️ "คลองเตย", "คลองจ้น" ➡️ "คลองจั่น", "กรุงเทพฯ" หรือ "กรุงเทพมหานตร" ➡️ "กรุงเทพมหานคร", "ยานนาวา" ไม่ใช่ "ยานนาว๊", "ประเวศ" ไม่ใช่ "ประเวศน์"
          
    12. ความถูกต้องสมบูรณ์ของตัวเลขและรหัสและการอ่านแบบแม่นยำสูง (High-Precision Digit & Number Integrity Rules):
        - **การตรวจจับตัวเลขทุกตัวอย่างถี่ถ้วนที่สุด:** ห้ามข้ามตัวเลข ห้ามประเมินตัวเลขต่ำหรือสูงกว่าจริง และห้ามประมาณค่าโดยไม่มีข้อมูล
        - **ห้ามสับสนรูปร่างตัวเลขที่ใกล้เคียงกัน:** โปรดวิเคราะห์ส่วนโค้งและเหลี่ยมของฟอนต์อย่างละเอียด ห้ามสับสนระหว่างเลข 0 กับ 8, 3 กับ 8, 1 กับ 7, 5 กับ 6, 9 กับ 0, 9 กับ 8
        - **เลขตัวถัง/เลขตัวรถ (vin):** ต้องมีจำนวนหลักอักษรผสมตัวเลขรวมกันครบ 17 หลักพอดิบพอดีเท่านั้น (ห้ามขาดหรือเกิน) และโปรดตรวจเช็คความคล้ายคลึงอย่างรอบคอบ เช่น ห้ามสับสนระหว่างเลข 0 กับอักษร O หรือ Q, เลข 1 กับอักษร I, เลข 8 กับอักษร B, เลข 2 กับอักษร Z, เลข 5 กับอักษร S
        - **เลขบัตรประชาชน (id_card_no):** ต้องมีจำนวนตัวเลขครบ 13 หลักเท่านั้น ห้ามสับสนระหว่างเลข 1 กับ 7 หรือ 0 กับ 8 หรือ 3 กับ 8
        - **เบอร์โทรศัพท์ (phone / alt_phone):** ต้องระบุเป็นตัวเลข 9-10 หลัก ไม่มีขีดหรือช่องว่าง และต้องเริ่มด้วยหมายเลขเบอร์โทรศัพท์ที่ถูกต้องในประเทศไทย (เช่น 08, 09, 06, 02)
        - **ความสอดคล้องของตัวเลขทางการเงิน (Financial Decimal & Math Precision):** 
          * ตรวจจับจุดทศนิยมของจำนวนเงินอย่างถูกต้อง 100% เช่น เบี้ยประกันภัย 15500.00 หรือ 15500.25 ห้ามเลื่อนจุดทศนิยม ห้ามนำจุดทศนิยมออก
          * ทำการตรวจสอบความสอดคล้องตามหลักคณิตศาสตร์เสมอ: (เบี้ยสุทธิ net_premium + อากรแสตมป์ stamp_duty + ภาษี vat = เบี้ยรวม total_premium). หากมีตัวเลขจุดทศนิยมหรือหลักใดหลักหนึ่งของค่าเหล่านี้ถูกบดบังหรือสแกนผิดพลาด ให้คำนวณเปรียบเทียบหาตัวเลขที่สูญหายเพื่อให้สมการนี้ถูกต้อง 100%
        - **เลขทะเบียนรถ (Plate Number):** สกัดเฉพาะส่วนของตัวเลขและตัวอักษรของเลขทะเบียนให้ครบทุกตัว เช่น "1กข 1234" หรือ "กข 12" อ่านหลักตัวเลขและตัวอักษรให้คมชัด ไม่ขาดตกหล่น และห้ามสับเปลี่ยนลำดับตัวเลข
        
    13. การเพิ่มความแม่นยำภาษาอังกฤษและการสะกดคำ (English OCR Accuracy & Alphanumeric Spellchecking Rule):
        - **วิเคราะห์อักษรภาษาอังกฤษและคำเฉพาะอย่างแม่นยำที่สุด (High-Precision English Character Recognition):** 
          * โดยเฉพาะรหัสตัวอักษรผสมตัวเลข (Alphanumeric codes) เช่น เลขตัวถัง (vin) หรือเลขเครื่องยนต์ (engine_no) ที่เป็นภาษาอังกฤษ 
          * ตรวจสอบรูปร่างของฟอนต์ภาษาอังกฤษที่มีลักษณะคล้ายคลึงกันอย่างรอบคอบที่สุด ห้ามสับสนระหว่างอักษร O กับเลข 0 หรืออักษร Q, อักษร I กับเลข 1 หรืออักษร L เล็ก (l), อักษร U กับ V หรือ Y, อักษร D กับอักษร O หรือเลข 0, อักษร B กับเลข 8, อักษร S กับเลข 5, อักษร Z กับเลข 2
          * ยี่ห้อรถและรุ่นรถยนต์ (Vehicle Brand & Model Names) มักพิมพ์เป็นภาษาอังกฤษ ให้สะกดคำภาษาอังกฤษของแบรนด์รถยนต์หลักและรุ่นรถยนต์ให้ถูกต้องตามมาตรฐานสากลเสมอ เช่น TOYOTA (ไม่ใช่ TOYOT4), HONDA, ISUZU (ไม่ใช่ ISUZV), MAZDA, NISSAN, MITSUBISHI, MG, FORD, CHEVROLET, HILUX REVO (ไม่ใช่ HILUX REVOO หรือ REVO1), CIVIC, CITY, D-MAX (ไม่ใช่ D-MAXX), FORTUNER เป็นต้น
          * คำย่อและคำศัพท์ภาษาอังกฤษในตารางประกันภัยและใบเสร็จ เช่น VAT, Net Premium, Stamp Duty, Total Premium, Policy No., Chassis No., Engine No. ต้องวิเคราะห์ตัวสะกดภาษาอังกฤษให้ถูกต้องสมบูรณ์ ห้ามอ่านบิดเบือนหรือเพี้ยนตัวอักษร
          
    14. ขั้นตอนการตรวจสอบตัวเองรอบที่สอง (Self-Verification Reflection Loop):
        - ก่อนที่จะสร้างผลลัพธ์ JSON ส่งกลับมา ให้ทำการตรวจทาน (Double Check) ข้อมูล JSON ทุกฟิลด์ที่คุณดึงมาได้เปรียบเทียบกับภาพเอกสารต้นฉบับอย่างละเอียดอีก 2 รอบ 
        - หากพบว่ามีสะกดตกหล่น ตัวอักษรบิดเบือน หรือคำสะกดภาษาไทย/อังกฤษที่สะกดผิดเพี้ยน ให้ทำการสะกดแก้ไขปรับปรุงให้ถูกต้องตรงกับชื่อเรียกที่เป็นทางการก่อนนำเสนอข้อมูลออกมา

    โครงสร้าง JSON ที่ต้องการส่งกลับ (ห้ามเปลี่ยนชื่อ Key เด็ดขาด):
    {
      "document_type": "voluntary_policy | prb_policy | non_motor_policy | vehicle_book | payment_slip | unknown",
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

    let availableModels = [];
    try {
      const modelsRes = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: {
          'x-goog-api-key': apiKey
        },
        timeout: 5000
      });
      if (modelsRes.data && Array.isArray(modelsRes.data.models)) {
        availableModels = modelsRes.data.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        console.log("Fetched available Gemini models from API:", availableModels.join(", "));
      }
    } catch (e) {
      console.warn("Failed to fetch available Gemini models:", e.response?.data?.error?.message || e.message);
    }

    const preferredModels = [
      'gemini-3.5-flash',
      'gemini-2.5-flash'
    ];

    let modelsToTry = preferredModels
      .filter(name => availableModels.includes(name))
      .map(name => ({ name, timeout: 35000 }));

    if (modelsToTry.length === 0) {
      modelsToTry = [
        { name: 'gemini-3.5-flash', timeout: 35000 },
        { name: 'gemini-2.5-flash', timeout: 35000 }
      ];
    }

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
              temperature: 0.0
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

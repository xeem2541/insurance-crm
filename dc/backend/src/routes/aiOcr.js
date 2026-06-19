const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Use memory storage for quick processing without saving to disk permanently
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.post('/extract', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY_REQUIRED' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Fallback to the classic gemini-pro-vision which is universally available
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการดึงข้อมูลจากตารางกรมธรรม์ประกันภัยของประเทศไทย (Insurance Policy Schedule)
จงอ่านรูปภาพที่แนบมา และดึงข้อมูลให้แม่นยำที่สุด 100% โดยให้ผลลัพธ์เป็น JSON Object เท่านั้น ห้ามมีคำอธิบายอื่นใด ห้ามมี Markdown (\`\`\`) ครอบ

กฎการดึงข้อมูลที่ต้องทำตามอย่างเคร่งครัด:
1. การแยกชื่อ: ให้แยก คำนำหน้า (นาย/นาง/นางสาว/บริษัท), ชื่อจริง, และ นามสกุล ออกจากกันอย่างชัดเจน
2. เบอร์โทร: ให้ตัดขีดออก เหลือแต่ตัวเลขเท่านั้น เช่น 0812345678
3. วันที่: ต้องแปลงเป็นรูปแบบ YYYY-MM-DD เสมอ โดยให้แปลงปี พ.ศ. เป็น ค.ศ. (เอาปี พ.ศ. ลบด้วย 543) เช่น 01/01/2567 กลายเป็น 2024-01-01
4. ตัวเลขเงิน: ให้นำลูกน้ำ (,) ออกทั้งหมด ให้เหลือแค่ตัวเลขเพียวๆ เช่น 15,000.00 กลายเป็น 15000.00
5. ประเภทรถ: ให้สรุปเป็นคำสั้นๆ เช่น รถเก๋ง, รถกระบะ, รถตู้
6. ถ้าข้อมูลไหนไม่มีในรูปภาพ ให้ใส่ค่าเป็นสตริงว่าง "" (ห้ามใส่ null หรือคำว่า ไม่มี)

โครงสร้าง JSON ที่ต้องการ (ห้ามเปลี่ยน Key):
{
  "customer": {
    "prefix": "คำนำหน้า",
    "first_name": "ชื่อจริง หรือ ชื่อบริษัท",
    "last_name": "นามสกุล (ถ้าเป็นบริษัทให้เว้นว่าง)",
    "phone": "เบอร์โทรศัพท์ (เฉพาะตัวเลข)",
    "address": "บ้านเลขที่ หมู่ ซอย ถนน",
    "sub_district": "ตำบล/แขวง",
    "district": "อำเภอ/เขต",
    "province": "จังหวัด",
    "zipcode": "รหัสไปรษณีย์"
  },
  "vehicle": {
    "vehicle_type": "ประเภทรถ (เช่น รถเก๋ง, รถกระบะ)",
    "brand": "ยี่ห้อรถ (เช่น Toyota, Honda, Isuzu)",
    "model": "รุ่นรถ",
    "year": "ปีรถ/รุ่นปี",
    "plate_no": "เลขทะเบียนรถ (ไม่รวมจังหวัด)",
    "plate_province": "จังหวัดของทะเบียนรถ",
    "vin": "เลขตัวถัง (Chassis No.)",
    "engine_no": "เลขเครื่องยนต์ (Engine No.)"
  },
  "policy": {
    "company": "ชื่อบริษัทประกันภัย",
    "type": "ประเภทประกัน (เช่น ประกันภัยชั้น 1, ชั้น 2+, พ.ร.บ.)",
    "category": "motor หรือ non-motor",
    "policy_no": "เลขที่กรมธรรม์",
    "sum_insured": "ทุนประกันภัย (ตัวเลขไม่มีลูกน้ำ)",
    "net_premium": "เบี้ยสุทธิก่อนภาษี (ตัวเลขไม่มีลูกน้ำ)",
    "stamp_duty": "อากรแสตมป์ (ตัวเลขไม่มีลูกน้ำ)",
    "vat": "ภาษีมูลค่าเพิ่ม (ตัวเลขไม่มีลูกน้ำ)",
    "total_premium": "เบี้ยประกันภัยรวม (ตัวเลขไม่มีลูกน้ำ)",
    "start_date": "วันเริ่มต้นคุ้มครอง (YYYY-MM-DD)",
    "expiry_date": "วันสิ้นสุดคุ้มครอง (YYYY-MM-DD)"
  }
}`;

    const imageParts = req.files.map(file => ({
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype
      }
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();
    
    // Clean up markdown syntax if Gemini returns it despite instructions
    let jsonText = responseText.trim();
    if (jsonText.startsWith('\`\`\`json')) {
      jsonText = jsonText.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    } else if (jsonText.startsWith('\`\`\`')) {
      jsonText = jsonText.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", jsonText);
      return res.status(500).json({ error: 'Failed to parse AI response into JSON. Please try again with a clearer image.' });
    }

    res.json(parsedData);

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Error processing image: ' + error.message });
  }
});

module.exports = router;

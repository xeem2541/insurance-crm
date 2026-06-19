const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const axios = require('axios');

// Use memory storage for quick processing without saving to disk permanently
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.post('/extract', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const apiKey = (req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(401).json({ error: 'GEMINI_API_KEY_REQUIRED' });
    }

    // No need to initialize OpenAI client, we will use axios

    const prompt = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากตารางกรมธรรม์ประกันภัยของประเทศไทย (Insurance Policy Schedule)
จงอ่านรูปภาพที่แนบมา วิเคราะห์อย่างละเอียด และดึงข้อมูลให้ถูกต้องแม่นยำ 100% โดยตอบกลับในรูปแบบ JSON Object ตามโครงสร้างที่กำหนดเท่านั้น ห้ามมีคำอธิบายอื่นใด ห้ามมี Markdown (\`\`\`) ครอบ

กฎการดึงข้อมูลที่ต้องปฏิบัติตามอย่างเคร่งครัดเพื่อความฉลาดและแม่นยำสูงสุด:
1. การแยกชื่อและคำนำหน้าลูกค้า (Customer Name):
   - คำนำหน้า (prefix): แยกคำนำหน้า เช่น นาย, นาง, นางสาว, น.ส., บริษัท, หจก., บมจ., พญ., นพ.
   - ชื่อจริง (first_name): ชื่อจริงของบุคคล หรือชื่อบริษัท (ในกรณีบริษัท ให้ใส่ชื่อบริษัททั้งหมดที่เหลือ เช่น "แอปเปิ้ล ทรานสปอร์ต จำกัด")
   - นามสกุล (last_name): นามสกุลของบุคคล (หากเป็นนิติบุคคล/บริษัท ให้เว้นว่างเป็น "")
2. การแยกที่อยู่อย่างชาญฉลาด (Thai Address Parser):
   - sub_district: ตำบล หรือ แขวง (ให้ตัดคำนำหน้า "ต." หรือ "ตำบล" หรือ "แขวง" ออก เหลือแค่ชื่อ เช่น "คลองจั่น")
   - district: อำเภอ หรือ เขต (ให้ตัดคำนำหน้า "อ." หรือ "อำเภอ" หรือ "เขต" ออก เหลือแค่ชื่อ เช่น "บางกะปิ")
   - province: จังหวัด (ให้ตัดคำนำหน้า "จ." หรือ "จังหวัด" ออก เหลือแค่ชื่อ เช่น "กรุงเทพมหานคร", "นนทบุรี")
   - zipcode: รหัสไปรษณีย์ 5 หลักเท่านั้น
   - address: ส่วนที่เหลือทั้งหมดของที่อยู่ (เช่น บ้านเลขที่, หมู่, ซอย, ถนน, อาคาร)
3. การแปลงวันที่แบบครอบคลุม (Date Conversion):
   - ต้องเป็นรูปแบบ YYYY-MM-DD เสมอ
   - แปลงปี พ.ศ. เป็น ค.ศ. เสมอ (ปี พ.ศ. ลบด้วย 543) เช่น พ.ศ. 2567 -> 2024, ปี 67 -> 2024
   - รองรับรูปแบบเดือนภาษาไทย: เช่น "15 ม.ค. 2567" หรือ "15 มกราคม 2567" -> "2024-01-15"
   - รองรับเครื่องหมายทับ: เช่น "05/12/2566" -> "2023-12-05"
4. ตัวเลขการเงิน (Financial Figures):
   - ให้นำลูกน้ำ (,) เครื่องหมายเงิน (฿) หรือช่องว่างออกให้หมด ให้เหลือเฉพาะตัวเลขเพียวๆ ที่สามารถนำไปคำนวณต่อได้ทันที เช่น "15,500.00" -> "15500.00", "500" -> "500.00"
5. ข้อมูลรถยนต์ (Vehicle Info):
   - vehicle_type: สรุปประเภทรถสั้นๆ เช่น รถเก๋ง, รถกระบะ, รถตู้, รถจักรยานยนต์
   - brand: ยี่ห้อรถยนต์ แปลงเป็นภาษาอังกฤษตัวพิมพ์ใหญ่ตัวแรกเสมอ เช่น TOYOTA -> Toyota, HONDA -> Honda, ISUZU -> Isuzu
   - year: ปีจดทะเบียนหรือรุ่นปี ค.ศ. (ถ้าในภาพเป็น พ.ศ. ให้ลบ 543 เพื่อเป็น ค.ศ. เช่น 2562 -> 2019)
6. หากไม่พบข้อมูลใดๆ ในรูปภาพ:
   - ให้ใส่เป็นสตริงว่าง "" เสมอ (ห้ามใส่ null, ห้ามใส่ "ไม่มี", ห้ามข้าม Key นั้นๆ)

โครงสร้าง JSON ที่ต้องการส่งกลับ (ห้ามเปลี่ยนชื่อ Key เด็ดขาด):
{
  "customer": {
    "prefix": "คำนำหน้า",
    "first_name": "ชื่อจริง หรือ ชื่อบริษัท",
    "last_name": "นามสกุล (ถ้าเป็นบริษัทให้เว้นว่าง)",
    "phone": "เบอร์โทรศัพท์ (เฉพาะตัวเลขไม่มีขีด)",
    "address": "บ้านเลขที่ หมู่ ซอย ถนน",
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
    "plate_no": "เลขทะเบียนรถ (ไม่รวมจังหวัด)",
    "plate_province": "จังหวัดของทะเบียนรถ",
    "vin": "เลขตัวถัง",
    "engine_no": "เลขเครื่องยนต์"
  },
  "policy": {
    "company": "ชื่อบริษัทประกันภัย",
    "type": "ประเภทประกัน (เช่น ประกันภัยชั้น 1, ชั้น 2+, พ.ร.บ.)",
    "category": "motor หรือ non-motor",
    "policy_no": "เลขที่กรมธรรม์",
    "sum_insured": "ทุนประกันภัย (ตัวเลขเพียวๆ)",
    "net_premium": "เบี้ยสุทธิก่อนภาษี (ตัวเลขเพียวๆ)",
    "stamp_duty": "อากรแสตมป์ (ตัวเลขเพียวๆ)",
    "vat": "ภาษีมูลค่าเพิ่ม (ตัวเลขเพียวๆ)",
    "total_premium": "เบี้ยประกันภัยรวม (ตัวเลขเพียวๆ)",
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

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
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
        }
      }
    );

    const responseText = response.data.candidates[0].content.parts[0].text;
    
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
    const apiError = error.response?.data?.error?.message || error.message;
    console.error('OCR Error Details:', error.response?.data || error);
    res.status(500).json({ error: apiError });
  }
});

module.exports = router;

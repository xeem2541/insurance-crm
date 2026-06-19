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
    // Use gemini-1.5-pro which has a free tier quota
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
You are an expert data entry assistant for an insurance CRM. 
Analyze the provided image(s) of an insurance policy schedule (ตารางกรมธรรม์) and extract the following data fields. 
Return ONLY a valid JSON object matching the exact structure below, without any markdown formatting or comments.

If a field is not found or unclear, leave it empty ("").
Dates should be formatted as "YYYY-MM-DD" where possible, converting Thai Buddhist Era (พ.ศ.) to Gregorian Year (ค.ศ.) by subtracting 543. 
For phone numbers, extract digits only.

Expected JSON structure:
{
  "customer": {
    "prefix": "e.g., นาย, นาง, นางสาว",
    "first_name": "",
    "last_name": "",
    "phone": "",
    "address": "",
    "sub_district": "",
    "district": "",
    "province": "",
    "zipcode": ""
  },
  "vehicle": {
    "vehicle_type": "e.g., รถเก๋ง, รถกระบะ",
    "brand": "e.g., Toyota",
    "model": "",
    "year": "",
    "plate_no": "",
    "plate_province": "",
    "vin": "Chassis no / เลขตัวถัง",
    "engine_no": ""
  },
  "policy": {
    "company": "Insurance Company Name",
    "type": "e.g., ประกันภัยชั้น 1, ชั้น 2+",
    "category": "motor or non-motor",
    "policy_no": "",
    "sum_insured": "Total sum insured (number only)",
    "net_premium": "Premium before tax (number only)",
    "stamp_duty": "Stamp duty (number only)",
    "vat": "VAT (number only)",
    "total_premium": "Total premium (number only)",
    "start_date": "YYYY-MM-DD",
    "expiry_date": "YYYY-MM-DD"
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

const axios = require('axios');

const apiKey = 'AQ.Ab8RN6LW2ZxhBDZ904riJeugR122p0aGo1Lf-54IDL7ExXoJUQ';

// 1x1 pixel black JPEG image in base64
const base64Image = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const prompt = `คุณคือระบบ AI OCR อัจฉริยะที่เชี่ยวชาญที่สุดในการวิเคราะห์และดึงข้อมูลจากตารางกรมธรรม์ประกันภัยและสมุดทะเบียนรถของประเทศไทย (Insurance Policy Schedule / Vehicle Registration Book)
จงอ่านรูปภาพที่แนบมา วิเคราะห์อย่างละเอียด และดึงข้อมูลให้ถูกต้องแม่นยำ 100% โดยตอบกลับในรูปแบบ JSON Object ตามโครงสร้างที่กำหนดเท่านั้น ห้ามมีคำอธิบายอื่นใด ห้ามมี Markdown (\`\`\`) ครอบ`;

async function testOCR(modelName) {
  console.log(`Testing OCR with model: ${modelName}...`);
  const start = Date.now();
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      },
      { timeout: 15000 }
    );
    const duration = Date.now() - start;
    const responseText = res.data.candidates[0].content.parts[0].text;
    console.log(`>> Model ${modelName} OCR Success in ${duration}ms!`);
    console.log(`>> Response: ${responseText}\n`);
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`>> Model ${modelName} OCR Failed in ${duration}ms:`, err.response?.data?.error?.message || err.message);
  }
}

async function main() {
  const models = [
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro'
  ];
  for (const model of models) {
    await testOCR(model);
    console.log('');
  }
}

main();

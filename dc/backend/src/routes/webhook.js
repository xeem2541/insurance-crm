const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini if API key is provided
let genAI = null;
let generativeModel = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  generativeModel = genAI.getGenerativeModel({ model: "gemini-pro" });
}

// System prompt for Gemini
const SYSTEM_PROMPT = `
คุณคือ "แอดมินเปิ้ล" เป็นผู้เชี่ยวชาญด้านการขายประกันภัยทุกประเภทของบริษัท "เปิ้ลประกันภัย" 
หน้าที่ของคุณคือให้คำปรึกษา แนะนำ ตอบคำถามเกี่ยวกับการทำประกันภัย (ประกันรถยนต์, ประกันสุขภาพ, ประกันชีวิต ฯลฯ)
คุณต้องตอบด้วยความสุภาพ เป็นกันเอง มีหางเสียง (ค่ะ/คะ) และกระตือรือร้นในการให้ข้อมูล
ตอบให้กระชับและเป็นธรรมชาติ เหมาะกับการอ่านในแชท LINE (ไม่ตอบยาวเป็นเรียงความ)
ถ้าลูกค้าถามคำถามทั่วไป ให้เน้นให้ความรู้เกี่ยวกับประกันภัยอย่างแนบเนียน
`;

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Store group ID to send notifications to
const GROUP_ID_FILE = path.join(__dirname, '../../line_group_id.txt');

router.post('/', async (req, res) => {
  res.status(200).send('OK'); // Always return 200 OK immediately for LINE webhooks

  const events = req.body.events;
  if (!events || events.length === 0) return;

  for (const event of events) {
    console.log('Received LINE event:', JSON.stringify(event));
    
    // If the bot is invited to a group, or someone types in a group, save the Group ID!
    if (event.source.type === 'group' || event.source.type === 'room') {
      const groupId = event.source.groupId || event.source.roomId;
      try {
        await req.db.query(
          "INSERT INTO master_data (category, value, label) VALUES ('LINE_GROUP', ?, 'Office Group') ON DUPLICATE KEY UPDATE value = ?",
          [groupId, groupId]
        );
        console.log("Saved LINE Group ID:", groupId);
      } catch (err) {
        console.error("Error saving group ID:", err);
      }
    }

    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();
      let replyText = '';
      let policyFound = false;
      
      // Feature: Check policy if text looks like an ID, Plate, or Policy No.
      if (text.length >= 6) { 
        try {
          const [policies] = await req.db.query(`
            SELECT p.policy_no, p.company, p.type, p.expiry_date, v.plate_no, c.first_name
            FROM policies p
            JOIN customers c ON p.customer_id = c.id
            LEFT JOIN vehicles v ON p.vehicle_id = v.id
            WHERE c.id_card_no = ? OR v.plate_no LIKE ? OR p.policy_no = ?
            ORDER BY p.expiry_date DESC LIMIT 1
          `, [text, `%${text}%`, text]);

          if (policies.length > 0) {
            const p = policies[0];
            const expDate = new Date(p.expiry_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
            replyText = `สวัสดีคุณ ${p.first_name} 👋\n\nกรมธรรม์รถทะเบียน ${p.plate_no || '-'}\nบริษัท: ${p.company} (ชั้น ${p.type})\nเลขกรมธรรม์: ${p.policy_no}\n\n⏳ จะหมดอายุวันที่:\n${expDate}`;
            policyFound = true;
          }
        } catch (error) {
          console.error('Error querying policy:', error);
        }
      }

      // If no policy is found, and it's a direct message to the bot, use AI.
      if (!policyFound && event.source.type === 'user') {
        if (generativeModel) {
          try {
            console.log("Passing message to Gemini API...");
            const result = await generativeModel.generateContent({
              contents: [{ role: 'user', parts: [{ text }] }],
              systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }]}
            });
            replyText = result.response.text();
          } catch (aiError) {
            console.error('Gemini API Error:', aiError);
            replyText = 'ขออภัยค่ะ ตอนนี้สมอง AI ของแอดมินกำลังปรับปรุง ไม่สามารถตอบคำถามได้ชั่วคราวนะคะ 🙏';
          }
        } else {
          // Fallback if no GEMINI_API_KEY is configured
          replyText = 'ขออภัยค่ะ ไม่พบข้อมูลกรมธรรม์จากรหัสที่คุณพิมพ์มาค่ะ 🥺 (ยังไม่ได้ตั้งค่า API Key สำหรับ AI)';
        }
      }

      if (replyText) {
        try {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: replyText }]
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            }
          });
        } catch (replyError) {
          console.error('Error replying to LINE:', replyError);
        }
      }
    }
  }
});

module.exports = router;

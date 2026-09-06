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
  const apiKey = process.env.GEMINI_API_KEY.trim();
  genAI = new GoogleGenerativeAI(apiKey);
  
  generativeModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  // Select best model
  axios.get(`https://generativelanguage.googleapis.com/v1beta/models`, {
    headers: { 'x-goog-api-key': apiKey }
  })
    .then(res => {
      const models = res.data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      const preferredModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash'
      ];
      
      const bestModel = preferredModels.find(m => models.includes(m)) || 'gemini-3.5-flash';
      generativeModel = genAI.getGenerativeModel({ model: bestModel });
      console.log(`🤖 Line Bot initialized with best available model: ${bestModel}`);
    })
    .catch(err => {
      console.error("❌ Error fetching models:", err.message);
    });
}

// System prompt for Gemini
const SYSTEM_PROMPT = `
คุณคือ "แอดมินเปิ้ล" เป็นผู้เชี่ยวชาญด้านการขายและบริการประกันภัยทุกประเภทของสำนักงาน "เปิ้ลประกันภัย"
หน้าที่ของคุณคือให้คำปรึกษา แนะนำ ตอบคำถามเกี่ยวกับการทำประกันภัย (เช่น ประกันรถยนต์ชั้น 1, 2+, 3+, พ.ร.บ., ประกันสุขภาพ, ประกันชีวิต)

กฎในการสื่อสารที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. น้ำเสียง: สุภาพ เป็นกันเอง มีความเห็นอกเห็นใจ (Empathy) กระตือรือร้น และต้องมีหางเสียง (ค่ะ/คะ) เสมอ
2. รูปแบบข้อความ: กระชับ อ่านง่าย เหมาะกับการอ่านในแชท LINE (ห้ามตอบยาวเป็นเรียงความ ให้แบ่งบรรทัดและใช้ Emoji อย่างเหมาะสม)
3. การเสนอราคา: ห้ามแต่งเรื่องหรือมโนราคาเบี้ยประกันขึ้นมาเองเด็ดขาด หากลูกค้าถามราคา ให้สอบถามข้อมูลเบื้องต้นก่อน เช่น ยี่ห้อรถ รุ่นรถ ปีจดทะเบียน หรือประเภทประกันที่สนใจ เพื่อให้แอดมินหรือเจ้าหน้าที่เสนอราคาที่ถูกต้องในภายหลัง
4. การเคลม: หากลูกค้าแจ้งอุบัติเหตุหรือต้องการเคลม ให้แสดงความห่วงใยก่อน (เช่น "ทุกคนปลอดภัยไหมคะ?") และแนะนำให้เตรียมเอกสาร หรือรอแอดมินตัวจริงมาช่วยเหลือทันที
5. ข้อมูลส่วนตัว: ห้ามมโนเลขกรมธรรม์หรือข้อมูลส่วนตัวลูกค้า หากลูกค้าต้องการเช็กข้อมูล ให้แนะนำลูกค้าพิมพ์ "เลขทะเบียนรถ" หรือ "เลขบัตรประชาชน" ส่งมาในแชท เพื่อให้ระบบดึงข้อมูลอัตโนมัติ
6. ที่ตั้งสำนักงาน: ถ้าลูกค้าถามหาที่ตั้งสำนักงาน แผนที่ พิกัด หรือหน้าร้าน ให้แจ้งว่าเดินทางสะดวก มีที่จอดรถ และแนบลิงก์ Google Maps นี้เสมอ: https://maps.app.goo.gl/uzHeCxL2g3KtWPRd7
7. ติดต่อพนักงาน: หากลูกค้าดูหงุดหงิด หรือพิมพ์บอกว่า "ขอคุยกับคน", "ติดต่อพนักงาน", "แอดมิน" ให้คุณตอบรับลูกค้าอย่างสุภาพ และ **ต้องพิมพ์คำว่า [NOTIFY_ADMIN] ต่อท้ายข้อความของคุณเสมอ** เพื่อให้ระบบแจ้งเตือนแอดมินที่เป็นคนจริงๆ
`;

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// Notify Admin Function
async function notifyAdminGroup(db, messageText) {
  try {
    const [rows] = await db.query("SELECT value FROM master_data WHERE category = 'LINE_GROUP'");
    if (rows.length > 0) {
      for (const row of rows) {
        await axios.post('https://api.line.me/v2/bot/message/push', {
          to: row.value,
          messages: [{ type: 'text', text: messageText }]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
          }
        });
      }
    }
  } catch (err) {
    console.error('Error notifying admin:', err);
  }
}

// Image Download Helper
async function downloadImage(messageId) {
  try {
    const response = await axios.get(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

router.post('/', async (req, res) => {
  res.status(200).send('OK'); 

  const events = req.body.events;
  if (!events || events.length === 0) return;

  for (const event of events) {
    console.log('Received LINE event:', event.type);
    
    // Save Group ID
    if (event.source.type === 'group' || event.source.type === 'room') {
      const groupId = event.source.groupId || event.source.roomId;
      try {
        await req.db.query(
          "INSERT INTO master_data (category, value) VALUES ('LINE_GROUP', ?) ON DUPLICATE KEY UPDATE value = ?",
          [groupId, groupId]
        );
      } catch (err) {}
    } else if (event.source.type === 'user' && event.type === 'message' && event.message.type === 'text') {
      if (event.message.text.trim() === '#admin_notify_on') {
        const userId = event.source.userId;
        await req.db.query(
          "INSERT INTO master_data (category, value) VALUES ('LINE_GROUP', ?) ON DUPLICATE KEY UPDATE value = ?",
          [userId, userId]
        );
        axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: '✅ เปิดการแจ้งเตือนสำหรับแอดมินแล้ว' }]
        }, { headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }});
        continue;
      } else if (event.message.text.trim() === '#admin_notify_off') {
        const userId = event.source.userId;
        await req.db.query("DELETE FROM master_data WHERE category = 'LINE_GROUP' AND value = ?", [userId]);
        axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: '❌ ปิดการแจ้งเตือนสำหรับแอดมินแล้ว' }]
        }, { headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }});
        continue;
      }
    }

    if (event.type === 'message' && (event.message.type === 'text' || event.message.type === 'image')) {
      let text = event.message.type === 'text' ? event.message.text.trim() : '';
      let replyMessages = [];
      let policyFound = false;
      const isGroupOrRoom = event.source.type === 'group' || event.source.type === 'room';
      
      if (isGroupOrRoom && (
        text.includes('ออกจากระบบ') ||
        text.includes('ออกจากกลุ่ม') ||
        text.includes('ออกไป') ||
        text.includes('แอดมิน ออก')
      )) {
        // Leave group logic
        const replyTextLeave = 'แอดมินเปิ้ลขออนุญาตออกจากกลุ่มก่อนนะคะ หากต้องการใช้งานอีกครั้งสามารถเชิญกลับเข้ามาได้ตลอดเวลาค่ะ 🙏😊';
        try {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: replyTextLeave }]
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            }
          });
          
          const groupId = event.source.groupId || event.source.roomId;
          const leaveType = event.source.type === 'room' ? 'room' : 'group';
          await axios.post(`https://api.line.me/v2/bot/${leaveType}/${groupId}/leave`, {}, {
            headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
          });
          
          await req.db.query("DELETE FROM master_data WHERE category = 'LINE_GROUP' AND value = ?", [groupId]);
        } catch (e) {
          console.error('Error leaving group:', e);
        }
        continue;
      } else if (!isGroupOrRoom && text === 'ออกจากระบบ') {
        replyMessages.push({ type: 'text', text: 'สำหรับแชทเดี่ยว แอดมินไม่สามารถกดออกจากห้องแชทได้ค่ะ หากต้องการยกเลิกการติดต่อ คุณลูกค้าสามารถกดบล็อก (Block) แอดมินได้เลยนะคะ 🙏' });
      }
      
      // Feature: Check policy if text looks like an ID, Plate, or Policy No.
      if (event.message.type === 'text' && text.length >= 6) { 
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
            
            // Flex Message for Policy
            const flexMsg = {
              type: 'flex',
              altText: 'ข้อมูลกรมธรรม์ของคุณ',
              contents: {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: '🚗 ข้อมูลกรมธรรม์', weight: 'bold', size: 'xl', color: '#1DB446' },
                    { type: 'text', text: 'สวัสดีคุณ ' + p.first_name + ' 👋', margin: 'md' },
                    { type: 'separator', margin: 'md' },
                    { type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm', contents: [
                      { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: 'บริษัท', size: 'sm', color: '#555555', flex: 1 },
                        { type: 'text', text: p.company + ' (ชั้น ' + p.type + ')', size: 'sm', color: '#111111', flex: 2, wrap: true }
                      ]},
                      { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: 'ทะเบียน', size: 'sm', color: '#555555', flex: 1 },
                        { type: 'text', text: p.plate_no || '-', size: 'sm', color: '#111111', flex: 2 }
                      ]},
                      { type: 'box', layout: 'horizontal', contents: [
                        { type: 'text', text: 'เลขกรมธรรม์', size: 'sm', color: '#555555', flex: 1 },
                        { type: 'text', text: p.policy_no, size: 'sm', color: '#111111', flex: 2, wrap: true }
                      ]}
                    ]},
                    { type: 'separator', margin: 'md' },
                    { type: 'box', layout: 'horizontal', margin: 'md', contents: [
                      { type: 'text', text: 'วันหมดอายุ', size: 'sm', color: '#555555', flex: 1 },
                      { type: 'text', text: expDate, size: 'sm', color: '#ff334b', weight: 'bold', flex: 2 }
                    ]}
                  ]
                }
              }
            };
            replyMessages.push(flexMsg);
            policyFound = true;
          }
        } catch (error) {
          console.error('Error querying policy:', error);
        }
      }

      // Fallback to Gemini AI
      if (!policyFound && event.source.type === 'user' && !isGroupOrRoom) {
        const userId = event.source.userId;
        if (generativeModel) {
          try {
            let currentPrompt = SYSTEM_PROMPT;
            try {
              const [promptRows] = await req.db.query("SELECT value FROM master_data WHERE category = 'BotPrompt' LIMIT 1");
              if (promptRows.length > 0 && promptRows[0].value.trim() !== '') {
                currentPrompt = promptRows[0].value;
              }
            } catch(dbErr) {}

            // Load Chat History (latest 10, chronological)
            const [historyRows] = await req.db.query(
              "SELECT role, message FROM (SELECT id, role, message FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 10) sub ORDER BY id ASC",
              [userId]
            );
            
            let contents = [];
            for (const row of historyRows) {
              if (contents.length > 0 && contents[contents.length - 1].role === row.role) {
                // Merge consecutive messages from the same role
                contents[contents.length - 1].parts[0].text += '\n' + row.message;
              } else {
                contents.push({ role: row.role, parts: [{ text: row.message }] });
              }
            }

            // Current message part
            let currentParts = [];
            if (event.message.type === 'image') {
              const imageBuffer = await downloadImage(event.message.id);
              if (imageBuffer) {
                currentParts.push({
                  inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' }
                });
                currentParts.push({ text: 'ผู้ใช้ส่งรูปภาพมา ช่วยวิเคราะห์หรือตอบกลับรูปภาพนี้' });
              }
            } else {
              currentParts.push({ text: text });
            }

            if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
              contents[contents.length - 1].parts.push(...currentParts);
            } else {
              contents.push({ role: 'user', parts: currentParts });
            }

            // Initialize Gemini Chat
            const modelConfig = genAI.getGenerativeModel({
               model: generativeModel.model,
               systemInstruction: currentPrompt
            });

            const result = await modelConfig.generateContent({ contents: contents });
            let aiText = result.response.text();

            // Admin Notify check
            if (aiText.includes('[NOTIFY_ADMIN]')) {
              aiText = aiText.replace('[NOTIFY_ADMIN]', '').trim();
              notifyAdminGroup(req.db, `🚨 ผู้ใช้ (ID: ${userId}) ขอคุยกับพนักงาน!\n\nข้อความล่าสุด: ${text}`);
            }

            replyMessages.push({ type: 'text', text: aiText });

            // Save to Chat History
            if (event.message.type === 'text') {
               await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, text]);
            } else if (event.message.type === 'image') {
               await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, '[ส่งรูปภาพ]']);
            }
            await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'model', ?)", [userId, aiText]);

          } catch (aiError) {
            console.error('Gemini API Error:', aiError);
            const errMsg = aiError.message ? aiError.message.substring(0, 50) : 'Unknown Error';
            replyMessages.push({ type: 'text', text: `ขออภัยค่ะ ระบบ AI ขัดข้อง (Error: ${errMsg})` });
          }
        } else {
          replyMessages.push({ type: 'text', text: 'ขออภัยค่ะ ยังไม่ได้ตั้งค่า API Key สำหรับ AI' });
        }
      }

      if (replyMessages.length > 0) {
        try {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: replyMessages
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            }
          });
        } catch (replyError) {
          console.error('Error replying to LINE:', replyError.response?.data || replyError.message);
        }
      }
    }
  }
});

module.exports = router;

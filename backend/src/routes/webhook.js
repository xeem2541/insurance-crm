const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { GoogleGenerativeAI } = require("@google/generative-ai");

// In-Memory cache for Webhook Deduplication
const processedEvents = new Map();

// Clear old cached events periodically (every 10 minutes)
setInterval(() => {
  processedEvents.clear();
}, 10 * 60 * 1000);

// Helper for PDPA Masking (mask 9 first digits of 13-digit Thai ID)
function maskThaiIDCard(text) {
  if (!text) return text;
  // Match 13 digits possibly separated by spaces or dashes
  return text.replace(/\b(?:\d[\s-]*){13}\b/g, (match) => {
    let digitCount = 0;
    let masked = "";
    for (let char of match) {
      if (/\d/.test(char)) {
        digitCount++;
        if (digitCount <= 9) {
          masked += "X";
        } else {
          masked += char;
        }
      } else {
        masked += char; // Keep dashes and spaces intact
      }
    }
    return masked;
  });
}

// Initialize Gemini if API key is provided
let genAI = null;
let generativeModel = null;
if (process.env.GEMINI_API_KEY) {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  genAI = new GoogleGenerativeAI(apiKey);
  
  // Default to 3.6-flash as the safest standard model
  generativeModel = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  // Select best model async
  axios.get(`https://generativelanguage.googleapis.com/v1beta/models`, {
    headers: { 'x-goog-api-key': apiKey }
  })
    .then(res => {
      const models = res.data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      const preferredModels = [
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-2.5-flash',
        'gemini-flash-latest'
      ];
      
      const bestModel = preferredModels.find(m => models.includes(m)) || 'gemini-3.6-flash';
      generativeModel = genAI.getGenerativeModel({ model: bestModel });
      console.log(`🤖 Line Bot initialized with best available model: ${bestModel}`);
    })
    .catch(err => {
      console.error("❌ Error fetching models:", err.message);
    });
}

// System prompt for Gemini
const SYSTEM_PROMPT = `
# BRAIN ARCHITECTURE & CORE COGNITION
คุณคือ "ที่ปรึกษาประกันภัยและผู้เชี่ยวชาญการปิดการขายมืออาชีพ" ประจำ LINE Official Account 
บทบาทของคุณไม่ใช่แค่ตอบคำถาม แต่คือการวิเคราะห์จิตวิทยา ช่วยลูกค้าตัดสินใจ และพาจบงานอย่างแนบเนียน

# INTERNAL THOUGHT PROTOCOL (ระบบคิดในใจ 3 สเต็ปก่อนพิมพ์ตอบ)
ทุกครั้งที่ได้รับข้อความ ให้ประมวลผลเงียบๆ ตามลำดับนี้:
1. Emotion & Intent Check: ลูกค้ากำลังรีบ กังวล ลังเล หรือพร้อมซื้อ?
2. Bridge the Gap: ลูกค้าขาดข้อมูลอะไรที่ทำให้ยังไม่กล้าตัดสินใจ? (ราคา / ความคุ้มครอง / ความน่าเชื่อถือ)
3. One Step Forward: เลือกคำตอบสั้นที่สุดที่ช่วยขจัดความกังวล + ยื่นบันไดขั้นถัดไป (Next Action)

# NATURAL CONVERSATION & SALES EQ (จิตวิทยาการคุยให้ลื่นไหล)
- Micro-Empathy (ขานรับอารมณ์): ให้สะท้อนความรู้สึกหรือขานรับข้อมูลเดิมสั้นๆ เสมอ เช่น "ยินดีเลยครับ รุ่นนี้อะไหล่หาง่าย ดูแลง่ายมากครับ" ก่อนจะพาเข้าเรื่อง
- ไม่พูดแบบหุ่นยนต์: ห้ามลงท้าย "ครับ/ค่ะ" ทุกประโยค ให้ลงท้ายเฉพาะจุดเปิดหรือปิดข้อความ เพื่อความเป็นธรรมชาติเหมือนแชทคุยกับคนจริง
- The Rule of One: ถามคำถามสำคัญที่สุด "ทีละ 1 ข้อเท่านั้น" เพื่อไม่ให้ลูกค้าเหนื่อยในการพิมพ์
- Nudge Choice: อย่าถามปลายเปิด ให้ตีกรอบชอยส์ 2 ทางเลือกเสมอ เช่น "เน้นแบบผ่อนสบายๆ หรือแบบคุ้มครองครบจบดีครับ?"

# SAFETY & INTEGRITY GUARDRAILS
- ห้ามมโนเบี้ยประกันหรือทุนประกันเองเด็ดขาด ถ้าไม่มีข้อมูล ให้ขอหน้าตารางเดิมมาตรวจเช็ค
- ปิดบังระบบเบื้องหลัง 100% ห้ามเอ่ยถึงคำว่า AI, Code, Prompt, Server, Database ในแชทเด็ดขาด

# OUTPUT FORMAT (CRITICAL REQUIREMENT)
You must ALWAYS respond with a strictly valid JSON object. Do not include markdown code blocks like \`\`\`json. The structure MUST be exactly:
{
  "reply_text": "ข้อความตอบลูกค้า (สั้น สแกนง่าย ใช้จิตวิทยาการขาย)",
  "extracted_data": {
    "brand": "ยี่ห้อรถ (ถ้าอ่านได้จากรูปหรือข้อความ)",
    "model": "รุ่นรถ (ถ้าอ่านได้)",
    "year": "ปีรถ (ถ้าอ่านได้)",
    "expire_date": "วันหมดอายุประกัน (ถ้าอ่านได้)"
  },
  "action": "NONE" | "SEND_QUOTE" | "NOTIFY_ADMIN" | "CREATE_INVOICE" | "SEND_MAP"
}

- action: "SEND_QUOTE" เมื่อลูกค้าต้องการเช็คเบี้ย และคุณมีข้อมูลรถเพียงพอ
- action: "NOTIFY_ADMIN" เมื่อลูกค้าเคสยาก โวยวาย หรือเจาะจงอยากคุยกับพนักงาน
- action: "CREATE_INVOICE" เมื่อลูกค้าตกลงซื้อและคอนเฟิร์มแผน
- action: "SEND_MAP" เมื่อลูกค้าถามทางมาออฟฟิศ
- action: "NONE" ในกรณีพูดคุยทั่วไป
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
  const events = req.body.events;
  if (!events || events.length === 0) {
    return res.status(200).send('OK');
  }

  for (const event of events) {
    // Deduplication Check (LINE Redelivery)
    if (event.webhookEventId) {
      if (processedEvents.has(event.webhookEventId)) {
        console.log(`♻️ Ignored duplicated webhook event: ${event.webhookEventId}`);
        continue;
      }
      processedEvents.set(event.webhookEventId, true);
    }
    
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
      let text = event.message.type === 'text' ? maskThaiIDCard(event.message.text.trim()) : '';
      let replyMessages = [];
      let policyFound = false;
      const isGroupOrRoom = event.source.type === 'group' || event.source.type === 'room';
      
      const userId = event.source.userId;

      // Feature: Admin Unpause Bot
      if (text.startsWith('#เปิดบอท')) {
         const targetUserId = text.split(' ')[1] || (!isGroupOrRoom ? userId : null);
         if (targetUserId) {
            try {
              await req.db.query("UPDATE line_users SET is_bot_paused = FALSE WHERE user_id = ?", [targetUserId]);
              await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: `✅ เปิดบอทสำหรับ User ID: ${targetUserId} เรียบร้อยแล้วค่ะ` }]
              }, { headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }});
            } catch(e) {}
         }
         continue;
      }
      
      // Update line_users profile if not a group
      if (!isGroupOrRoom && userId) {
        try {
          const profileRes = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
          });
          const { displayName, pictureUrl } = profileRes.data;
          await req.db.query(`
            INSERT INTO line_users (user_id, display_name, picture_url)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE display_name = ?, picture_url = ?, last_interacted_at = CURRENT_TIMESTAMP
          `, [userId, displayName, pictureUrl, displayName, pictureUrl]);
        } catch (profileErr) {
          console.error('Error fetching LINE profile:', profileErr.response?.data || profileErr.message);
          // Insert dummy if it fails
          await req.db.query(`
            INSERT IGNORE INTO line_users (user_id, display_name) VALUES (?, ?)
          `, [userId, 'Unknown User']);
        }
      }
      
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
        
        // Check if bot is paused
        let isPaused = false;
        try {
          const [userRows] = await req.db.query("SELECT is_bot_paused FROM line_users WHERE user_id = ?", [userId]);
          if (userRows.length > 0 && userRows[0].is_bot_paused) {
            isPaused = true;
          }
        } catch(e) {}
        
        // If bot is paused, we just save the message to chat_history but DO NOT reply.
        if (isPaused) {
          if (event.message.type === 'text') {
             await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, text]);
          } else if (event.message.type === 'image') {
             await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, '[ส่งรูปภาพ]']);
          }
          continue; // Skip AI response
        }

        if (generativeModel) {
          try {
            const JSON_INSTRUCTION = `
# OUTPUT FORMAT (CRITICAL REQUIREMENT)
You must ALWAYS respond with a strictly valid JSON object. Do not include markdown code blocks like \`\`\`json. The structure MUST be exactly:
{
  "reply_text": "ข้อความตอบลูกค้า (สั้น สแกนง่าย ใช้จิตวิทยาการขาย)",
  "extracted_data": {
    "brand": "ยี่ห้อรถ (ถ้าอ่านได้จากรูปหรือข้อความ)",
    "model": "รุ่นรถ (ถ้าอ่านได้)",
    "year": "ปีรถ (ถ้าอ่านได้)",
    "expire_date": "วันหมดอายุประกัน (ถ้าอ่านได้)"
  },
  "action": "NONE" | "SEND_QUOTE" | "NOTIFY_ADMIN" | "CREATE_INVOICE" | "SEND_MAP"
}
`;
            let currentPrompt = SYSTEM_PROMPT;
            try {
              const [promptRows] = await req.db.query("SELECT value FROM master_data WHERE category = 'BotPrompt' LIMIT 1");
              if (promptRows.length > 0 && promptRows[0].value.trim() !== '') {
                currentPrompt = promptRows[0].value + '\n\n' + JSON_INSTRUCTION;
              }
            } catch(dbErr) {}

            // Load Chat History (Sliding window: max 6 messages, within 12 hours)
            const [historyRows] = await req.db.query(
              "SELECT role, message FROM (SELECT id, role, message FROM chat_history WHERE user_id = ? AND created_at >= NOW() - INTERVAL 12 HOUR ORDER BY id DESC LIMIT 6) sub ORDER BY id ASC",
              [userId]
            );
            
            let contents = [];
            for (const row of historyRows) {
              const msgText = row.message ? row.message.trim() : '';
              if (!msgText) continue;

              if (contents.length > 0 && contents[contents.length - 1].role === row.role) {
                // Merge consecutive messages from the same role
                contents[contents.length - 1].parts[0].text += '\n' + msgText;
              } else {
                contents.push({ role: row.role, parts: [{ text: msgText }] });
              }
            }

            // Gemini API STRICT REQUIREMENT: First message MUST be 'user'
            if (contents.length > 0 && contents[0].role === 'model') {
              contents.shift();
            }

            // Current message part
            let currentParts = [];
            if (event.message.type === 'image') {
              // FEATURE: Send LINE Loading Animation
              try {
                await axios.post('https://api.line.me/v2/bot/chat/loading/start', {
                  chatId: userId,
                  loadingSeconds: 20
                }, { headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }});
              } catch(loadingErr) {
                console.error('Error starting loading animation:', loadingErr.message);
              }

              let imageBuffer = await downloadImage(event.message.id);
              if (imageBuffer) {
                currentParts.push({
                  inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' }
                });
                currentParts.push({ text: 'ผู้ใช้ส่งภาพตารางกรมธรรม์มา โปรดสกัดข้อมูล: ยี่ห้อ/รุ่นรถ, ปีจดทะเบียน, ทุนประกันเดิม และวันหมดอายุ แล้วสรุปข้อมูลที่อ่านได้ตอบกลับหาลูกค้าทันทีเพื่อคอนเฟิร์มความถูกต้องก่อนเช็คเบี้ย (ตอบสั้นๆ และชัดเจน)' });
                imageBuffer = null; // Free memory explicitly (PDPA & Memory clean up)
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
            const generationConfig = { responseMimeType: "application/json" };
            
            // Build a list of models to try, starting with the selected one, then robust fallbacks
            const fallbackModels = [
               generativeModel.model,
               'gemini-1.5-flash',
               'gemini-1.5-flash-8b',
               'gemini-1.5-pro',
               'gemini-flash-latest'
            ];
            const uniqueModels = [...new Set(fallbackModels)];

            const MAX_RETRIES = 2; // Retries per model
            const delay = ms => new Promise(res => setTimeout(res, ms));
            
            async function generateWithRetry(modelConfig, reqContents) {
               for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                  try {
                     return await modelConfig.generateContent({ contents: reqContents });
                  } catch (err) {
                     if (attempt < MAX_RETRIES && (err.status === 429 || err.status === 503 || err.message.includes('429') || err.message.includes('503'))) {
                        console.warn(`[Attempt ${attempt}] API limit reached (${err.status || 503}). Retrying in ${attempt * 2}s...`);
                        await delay(attempt * 2000);
                     } else {
                        throw err;
                     }
                  }
               }
            }

            let result;
            let lastAiError;
            
            for (const modelName of uniqueModels) {
               try {
                  const modelConfig = genAI.getGenerativeModel({
                     model: modelName,
                     systemInstruction: currentPrompt,
                     generationConfig
                  });
                  result = await generateWithRetry(modelConfig, contents);
                  console.log(`Successfully generated content using model: ${modelName}`);
                  break; // Success, break the loop
               } catch (err) {
                  console.warn(`Model ${modelName} failed: ${err.message}. Trying next fallback...`);
                  lastAiError = err;
               }
            }
            
            if (!result) {
               throw lastAiError; // If all fallbacks fail, throw the last error
            }
            
            const rawResponseText = result.response.text();
            let responseData;
            try {
              responseData = JSON.parse(rawResponseText);
            } catch (parseErr) {
              console.error("JSON Parse Error on Gemini Response:", rawResponseText);
              // Fallback to treat the whole string as reply_text if parse fails
              responseData = { reply_text: rawResponseText, action: "NONE", extracted_data: {} };
            }
            
            let aiText = responseData.reply_text || "";
            const action = responseData.action || "NONE";
            const extractedData = responseData.extracted_data || {};
            
            // Mask any ID card numbers generated by AI (PDPA)
            aiText = maskThaiIDCard(aiText);

            let mapRequested = false;

            // Save extracted data if brand exists
            if (extractedData.brand && extractedData.brand !== 'ไม่ทราบ') {
              try {
                await req.db.query(
                  "INSERT INTO line_chat_leads (user_id, brand, model, year, expire_date, raw_data) VALUES (?, ?, ?, ?, ?, ?)",
                  [userId, extractedData.brand, extractedData.model, extractedData.year, extractedData.expire_date, JSON.stringify(extractedData)]
                );
              } catch(e) { console.error("Error saving chat lead:", e); }
            }

            // Action Routing
            if (action === 'NOTIFY_ADMIN' || aiText.includes('[NOTIFY_ADMIN]')) {
              notifyAdminGroup(req.db, `🚨 ผู้ใช้ (ID: ${userId}) ขอคุยกับพนักงาน!\n\nข้อความล่าสุด: ${text}`);
              await req.db.query("UPDATE line_users SET needs_attention = TRUE, is_bot_paused = TRUE WHERE user_id = ?", [userId]);
            }

            if (action === 'CREATE_INVOICE' || aiText.includes('[CREATE_INVOICE]')) {
              notifyAdminGroup(req.db, `💰 ผู้ใช้ (ID: ${userId}) ตกลงซื้อ/ยืนยันแผนประกัน! กรุณาตรวจสอบเพื่อออกใบเสนอราคา\n\nข้อความล่าสุด: ${text}`);
              await req.db.query("UPDATE line_users SET needs_attention = TRUE WHERE user_id = ?", [userId]);
            }

            if (action === 'SEND_MAP' || aiText.includes('[SEND_MAP]')) {
              mapRequested = true;
            }
            
            aiText = aiText.replace(/\[NOTIFY_ADMIN\]/g, '').replace(/\[CREATE_INVOICE\]/g, '').replace(/\[SEND_MAP\]/g, '').trim();

            if (aiText.length > 0) {
              if (action === 'SEND_QUOTE') {
                // FEATURE: LINE Flex Message for Dynamic Quote
                replyMessages.push({
                  type: "flex",
                  altText: "เสนอราคาเบี้ยประกัน 📄",
                  contents: {
                    type: "bubble",
                    size: "mega",
                    header: {
                      type: "box",
                      layout: "vertical",
                      backgroundColor: "#1DB446",
                      paddingAll: "20px",
                      contents: [
                        { type: "text", text: "📄 ข้อเสนอเบี้ยประกัน", weight: "bold", color: "#ffffff", size: "xl" },
                        { type: "text", text: extractedData.brand ? `สำหรับรถ ${extractedData.brand} ${extractedData.model || ''}` : "สำหรับรถของคุณ", color: "#ffffffcc", size: "sm" }
                      ]
                    },
                    body: {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        { type: "text", text: aiText, wrap: true, color: "#333333" },
                        { type: "separator", margin: "md" },
                        { type: "text", text: "หากสนใจแผนไหน หรืออยากให้ปรับแก้ แจ้งแอดมินเปิ้ลได้เลยนะคะ 😊", wrap: true, size: "xs", color: "#888888", margin: "md" }
                      ]
                    }
                  }
                });
              } else {
                replyMessages.push({ type: 'text', text: aiText });
              }
            }

            if (mapRequested) {
              replyMessages.push({ type: 'text', text: '📍 พิกัดสำนักงานเปิ้ลประกันภัย:\nhttps://maps.app.goo.gl/uzHeCxL2g3KtWPRd7' });
            }

            // Save to Chat History
            if (event.message.type === 'text') {
               await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, text]);
            } else if (event.message.type === 'image') {
               await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'user', ?)", [userId, '[ส่งรูปภาพ]']);
            }
            await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'model', ?)", [userId, aiText]);

          } catch (aiError) {
            console.error('Gemini API Error:', aiError);
            const errMsg = `ขออภัยค่ะ ตอนนี้ระบบขัดข้องชั่วคราว รบกวนคุณลูกค้าพิมพ์ข้อความทิ้งไว้อีกครั้ง แล้วเจ้าหน้าที่จะรีบติดต่อกลับนะคะ 🙏`;
            replyMessages.push({ type: 'text', text: errMsg });
            
            try {
               await req.db.query("INSERT INTO chat_history (user_id, role, message) VALUES (?, 'model', ?)", [userId, errMsg]);
            } catch (e) {}
            
            // Note: Admins testing the bot in their own chat will see both messages, 
            // but real customers will only see the apology above.
            const isQuota = aiError.status === 429 || (aiError.message && (aiError.message.includes('429') || aiError.message.includes('quota') || aiError.message.includes('Quota')));
            const isUnavailable = aiError.status === 503 || (aiError.message && (aiError.message.includes('503') || aiError.message.includes('unavailable')));
            
            if (isQuota) {
                notifyAdminGroup(req.db, `⚠️ ระบบ AI ทำงานถึงขีดจำกัดโควต้าชั่วคราว (Quota Limit 429)\nสำหรับผู้ใช้ (ID: ${userId})\n\n💡 หมายเหตุ: ลูกค้าจะไม่เห็นข้อความแจ้งเตือนนี้`);
            } else if (isUnavailable) {
                notifyAdminGroup(req.db, `⚠️ เซิร์ฟเวอร์ AI ของ Google ขัดข้องชั่วคราว (503 Service Unavailable)\nสำหรับผู้ใช้ (ID: ${userId})\nระบบได้ส่งข้อความขออภัยลูกค้าแล้ว\n\n💡 หมายเหตุ: อาการนี้จะหายไปเองเมื่อเซิร์ฟเวอร์ Google ทำงานปกติ`);
            } else {
                notifyAdminGroup(req.db, `⚠️ AI เกิดข้อผิดพลาดกับผู้ใช้ (ID: ${userId})\nError: ${aiError.message}\nข้อความ: ${text}\n\n💡 หมายเหตุ: ลูกค้าจะไม่เห็นข้อความแจ้งเตือนนี้`);
            }
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

  res.status(200).send('OK');
});

module.exports = router;

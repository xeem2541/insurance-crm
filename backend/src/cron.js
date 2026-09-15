const cron = require('node-cron');
const line = require('@line/bot-sdk');
const { sendLineNotify } = require('./services/lineNotify');

const botConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const lineClient = new line.messagingApi.MessagingApiClient({ channelAccessToken: botConfig.channelAccessToken });

const startCronJobs = (db) => {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily cron job for expiring policies...');
    try {
      const [policies] = await db.query(`
        SELECT p.policy_no, c.first_name, c.last_name, v.plate_no, p.expiry_date,
               DATEDIFF(p.expiry_date, CURDATE()) as days_left, 'Motor' as policy_type
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        WHERE p.status IN ('สำเร็จ', 'ชำระครบแล้ว')
          AND DATEDIFF(p.expiry_date, CURDATE()) IN (30, 15, 7, 3, 1, 0)
        UNION ALL
        SELECT np.policy_no, c.first_name, c.last_name, '-' as plate_no, np.expiry_date,
               DATEDIFF(np.expiry_date, CURDATE()) as days_left, 'Non-Motor' as policy_type
        FROM non_motor_policies np
        JOIN customers c ON np.customer_id = c.id
        WHERE np.status IN ('สำเร็จ', 'ชำระครบแล้ว')
          AND DATEDIFF(np.expiry_date, CURDATE()) IN (30, 15, 7, 3, 1, 0)
        ORDER BY days_left ASC
      `);

      if (policies.length > 0) {
        const flexContents = [];
        
        policies.slice(0, 10).forEach((p, index) => {
          if (index > 0) {
            flexContents.push({ type: "separator", margin: "md" });
          }
          
          const typeColor = p.policy_type === 'Motor' ? '#4CAF50' : '#FF9800';
          const typeLabel = p.policy_type === 'Motor' ? 'รถยนต์' : 'Non-Motor';
          const plateInfo = p.policy_type === 'Motor' ? (p.plate_no || 'ไม่ระบุ') : '-';
          
          flexContents.push({
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: typeLabel, color: typeColor, size: "sm", flex: 2, weight: "bold" },
                  { type: "text", text: `${p.first_name} ${p.last_name}`, wrap: true, color: "#333333", size: "sm", flex: 5, weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: "ทะเบียน", color: "#aaaaaa", size: "sm", flex: 2 },
                  { type: "text", text: plateInfo, wrap: true, color: "#666666", size: "sm", flex: 5 }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: "หมดอายุ", color: "#aaaaaa", size: "sm", flex: 2 },
                  { 
                    type: "text", 
                    text: p.days_left === 0 ? "วันนี้" : `อีก ${p.days_left} วัน`, 
                    wrap: true, 
                    color: p.days_left <= 7 ? "#ff0000" : "#666666", 
                    size: "sm", 
                    flex: 5, 
                    weight: p.days_left <= 7 ? "bold" : "regular" 
                  }
                ]
              }
            ]
          });
        });

        if (policies.length > 10) {
          flexContents.push({ type: "separator", margin: "md" });
          flexContents.push({
            type: "text",
            text: `และลูกค้าอีก ${policies.length - 10} ราย...`,
            size: "sm",
            color: "#aaaaaa",
            margin: "md",
            align: "center"
          });
        }

        const flexMessage = {
          type: "flex",
          altText: `⏰ แจ้งเตือนกรมธรรม์ใกล้หมดอายุ! (ติดตาม ${policies.length} ราย)`,
          contents: {
            type: "bubble",
            size: "giga",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#ff5252",
              paddingAll: "20px",
              contents: [
                { type: "text", text: "⏰ แจ้งเตือนต่ออายุประกัน", weight: "bold", color: "#ffffff", size: "xl" },
                { type: "text", text: `วันนี้มีลูกค้าต้องติดตาม ${policies.length} ราย`, color: "#ffffffcc", size: "sm", margin: "md" }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: flexContents
            }
          }
        };
        
        await sendLineNotify(flexMessage, db);
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  // Bot Job 1: Auto-Unpause (Every hour)
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running Auto-Unpause job...');
    try {
      const [users] = await db.query(
        `SELECT user_id FROM line_users 
         WHERE is_bot_paused = TRUE 
         AND needs_attention = FALSE
         AND last_interacted_at < NOW() - INTERVAL 12 HOUR`
      );

      for (const user of users) {
        await db.query(
          'UPDATE line_users SET is_bot_paused = FALSE WHERE user_id = ?',
          [user.user_id]
        );
        console.log(`[Cron] Auto-unpaused bot for user: ${user.user_id}`);
        try {
          await lineClient.pushMessage({
            to: user.user_id,
            messages: [{ type: 'text', text: 'แอดมินเปิดระบบผู้ช่วยอัตโนมัติให้แล้วครับ หากมีคำถามเพิ่มเติมพิมพ์มาได้เลยนะครับ 😊' }]
          });
        } catch (e) {
          console.error('[Cron] Push message failed for auto-unpause:', e.message);
        }
      }
    } catch (error) {
      console.error('[Cron] Auto-Unpause Error:', error);
    }
  });

  // Bot Job 2: Follow-up Reminders (Every hour at minute 30)
  cron.schedule('30 * * * *', async () => {
    console.log('[Cron] Running Follow-up Reminders job...');
    try {
      const [leads] = await db.query(
        `SELECT l.id, l.user_id, l.brand, l.model, u.last_interacted_at 
         FROM line_chat_leads l
         JOIN line_users u ON l.user_id = u.user_id
         WHERE l.status = 'NEW'
         AND u.last_interacted_at < NOW() - INTERVAL 24 HOUR`
      );

      for (const lead of leads) {
        await db.query(
          'UPDATE line_chat_leads SET status = ? WHERE id = ?',
          ['FOLLOWED_UP', lead.id]
        );
        console.log(`[Cron] Followed-up with user: ${lead.user_id}`);
        try {
          let carText = 'รถของคุณ';
          if (lead.brand && lead.brand !== 'ไม่ทราบ') {
            carText = `${lead.brand} ${lead.model || ''}`.trim();
          }
          await lineClient.pushMessage({
            to: lead.user_id,
            messages: [{ 
              type: 'text', 
              text: `สวัสดีครับ ขออนุญาตติดตามเรื่องประกัน ${carText} นะครับ 😊 ไม่ทราบว่าสนใจแผนที่เสนอไปไหมครับ หรืออยากให้ลองปรับแผน/ทุนประกันตรงไหน แจ้งผมได้เลยนะครับ` 
            }]
          });
        } catch (e) {
          console.error('[Cron] Push message failed for follow-up:', e.message);
        }
      }
    } catch (error) {
      console.error('[Cron] Follow-up Error:', error);
    }
  });

  console.log('Cron jobs scheduled.');
};

module.exports = { startCronJobs };

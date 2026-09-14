const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Verify cron job secret from Vercel to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'apple-insurance-cron-secret-123';

router.get('/backup', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('Unauthorized cron attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Starting Vercel Serverless Backup...');
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    
    // 1. Fetch data from DB
    const tables = ['customers', 'vehicles', 'policies', 'non_motor_policies', 'payments', 'installments'];
    const dbData = {};

    for (const table of tables) {
      const [rows] = await req.db.query(`SELECT * FROM ${table}`);
      dbData[table] = rows;
    }

    // Convert to JSON buffer
    const jsonData = JSON.stringify(dbData, null, 2);
    const jsonBuffer = Buffer.from(jsonData, 'utf-8');

    // 2. Email the backup
    if (process.env.GMAIL_USER && process.env.ADMIN_EMAIL) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `✅ 🟢 [Insurance CRM] สำเร็จ - การสำรองข้อมูล Serverless (${dateStr})`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h2 style="color: #fbbf24; margin: 0;">🛡️ System Backup Report (Vercel)</h2>
          </div>
          <div style="padding: 20px; background-color: #f8fafc;">
            <h3 style="color: #16a34a;">การสำรองข้อมูลเสร็จสมบูรณ์</h3>
            <p><strong>วันที่:</strong> ${new Date().toLocaleString('th-TH')}</p>
            <p><strong>จำนวนข้อมูลลูกค้า:</strong> ${dbData.customers.length} รายการ</p>
            <p><strong>จำนวนกรมธรรม์ Motor:</strong> ${dbData.policies.length} รายการ</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #475569; font-size: 14px;">ระบบได้ทำการสำรองฐานข้อมูลเป็นไฟล์ JSON แนบมาพร้อมกับอีเมลนี้เรียบร้อยแล้ว</p>
          </div>
        </div>
        `,
        attachments: [
          {
            filename: `database_dump_${dateStr}.json`,
            content: jsonBuffer
          }
        ]
      });
      console.log('Email sent successfully');
    } else {
      console.log('Skipping email: GMAIL_USER or ADMIN_EMAIL not set');
    }

    res.json({ message: 'Backup completed successfully', size: jsonBuffer.length });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-notify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn('Unauthorized cron attempt (daily-notify)');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Running daily Vercel cron job for expiring policies...');
  try {
    const { sendLineNotify } = require('../services/lineNotify');
    const [policies] = await req.db.query(`
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
      
      await sendLineNotify(flexMessage, req.db);
    }
    res.json({ message: 'Daily notification processed successfully', notified: policies.length });
  } catch (error) {
    console.error('Vercel Cron job error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

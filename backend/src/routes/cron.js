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

module.exports = router;

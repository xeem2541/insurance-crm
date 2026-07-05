const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
require('dotenv').config();

const backupDir = path.join(__dirname, '../../../backups');
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const sendEmail = async (subject, htmlContent) => {
  if (!process.env.GMAIL_USER || !process.env.ADMIN_EMAIL) {
    console.log('Skipping email notification: GMAIL_USER or ADMIN_EMAIL not set.');
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: subject,
      html: htmlContent
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const runBackup = async () => {
  console.log('Starting automated backup...');
  const dateStr = new Date().toISOString().split('T')[0];
  const sqlFile = path.join(backupDir, `db_backup_${dateStr}.sql`);
  const zipFile = path.join(backupDir, `full_backup_${dateStr}.zip`);

  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS ? `-p"${process.env.DB_PASS}"` : '';
  const dbName = process.env.DB_NAME || 'insurance_crm';
  const dbHost = process.env.DB_HOST || 'localhost';

  // 1. Dump Database
  const dumpCmd = `mysqldump -h ${dbHost} -u ${dbUser} ${dbPass} ${dbName} > "${sqlFile}"`;
  
  exec(dumpCmd, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup Error: ${error.message}`);
      await sendEmail(
        `🚨 🔴 [Insurance CRM] ล้มเหลว - การสำรองข้อมูลรายเดือน (${dateStr})`,
        `<h3>เกิดข้อผิดพลาดในการสำรองฐานข้อมูล</h3><p>Error: ${error.message}</p><p>โปรดตรวจสอบว่ามีการติดตั้ง mysqldump ไว้บนเซิร์ฟเวอร์หรือไม่</p>`
      );
      return;
    }

    // 2. Zip Database + Uploads folder
    const output = fs.createWriteStream(zipFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      console.log(`Backup completed: ${zipFile} (${archive.pointer()} total bytes)`);
      
      // Cleanup the .sql file since it's now in the zip
      if (fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }

      // 3. Delete backups older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      fs.readdirSync(backupDir).forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && file.endsWith('.zip') && stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old backup: ${file}`);
        }
      });

      // 4. Send Success Email
      await sendEmail(
        `✅ 🟢 [Insurance CRM] สำเร็จ - การสำรองข้อมูลรายเดือน (${dateStr})`,
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h2 style="color: #fbbf24; margin: 0;">🛡️ System Backup Report</h2>
          </div>
          <div style="padding: 20px; background-color: #f8fafc;">
            <h3 style="color: #16a34a;">การสำรองข้อมูลเสร็จสมบูรณ์</h3>
            <p><strong>วันที่:</strong> ${new Date().toLocaleString('th-TH')}</p>
            <p><strong>ขนาดไฟล์ Backup:</strong> ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #475569; font-size: 14px;">ระบบได้ทำการสำรองฐานข้อมูล (Database) และไฟล์เอกสารลูกค้าทั้งหมดในโฟลเดอร์ uploads เรียบร้อยแล้ว ไฟล์ถูกบีบอัดเป็น Zip อย่างปลอดภัย</p>
            <p style="color: #475569; font-size: 14px;">ไฟล์ที่เก่ากว่า 30 วันจะถูกระบบลบทิ้งอัตโนมัติเพื่อป้องกันพื้นที่ฮาร์ดดิสก์เต็ม</p>
          </div>
        </div>
        `
      );
    });

    archive.on('error', async (err) => {
      console.error('Archiver Error:', err);
      await sendEmail(
        `🚨 🔴 [Insurance CRM] ล้มเหลว - การบีบอัดไฟล์ Backup (${dateStr})`,
        `<h3>เกิดข้อผิดพลาดตอนบีบอัดไฟล์ ZIP</h3><p>Error: ${err.message}</p>`
      );
    });

    archive.pipe(output);

    // Append files
    archive.file(sqlFile, { name: `db_backup_${dateStr}.sql` });
    
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    archive.finalize();
  });
};

module.exports = runBackup;

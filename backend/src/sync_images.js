const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');

const uploadDir = '/app/uploads';
const tidbUri = 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/insurance_db?ssl={"rejectUnauthorized":true}';
const renderBackendUrl = 'https://insurance-crm-kpff.onrender.com';

// Helper to download a file from URL
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      } else {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let connection;
  try {
    connection = await mysql.createConnection({ uri: tidbUri });

    // Fetch documents
    const [docs] = await connection.query("SELECT * FROM documents WHERE deleted_at IS NULL");
    const [nonMotorDocs] = await connection.query("SELECT * FROM non_motor_documents WHERE deleted_at IS NULL");
    
    const allDocs = [...docs, ...nonMotorDocs];

    let downloadCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const doc of allDocs) {
      let fileUrl = doc.file_path;
      if (!fileUrl) continue;

      let filename = path.basename(fileUrl);
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }

      const destPath = path.join(uploadDir, filename);

      if (fs.existsSync(destPath)) {
        skipCount++;
        continue;
      }

      let downloadUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        downloadUrl = `${renderBackendUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
      }

      try {
        await downloadFile(downloadUrl, destPath);
        downloadCount++;
        console.log(`[ดาวน์โหลดสำเร็จ] ${doc.name} -> ${filename}`);
      } catch (err) {
        failCount++;
      }
    }

    if (downloadCount > 0) {
      console.log(`[AutoSync] ดาวน์โหลดรูปล่าสุดเสร็จสิ้น: ${downloadCount} รูป ลงใน D:\\Apple Insurance\\รูป`);
    }

    await connection.end();
  } catch (err) {
    // silently catch connection errors to keep the server clean
  }
}

// Export a function to start the auto sync loop
function startAutoSync() {
  console.log("[AutoSync] ระบบดึงรูปอัตโนมัติแบบเบื้องหลังเริ่มทำงานแล้ว (ดึงลง D:\\Apple Insurance\\รูป)...");
  setInterval(async () => {
    try {
      await main();
    } catch (e) {}
  }, 2000);
}

module.exports = { startAutoSync };

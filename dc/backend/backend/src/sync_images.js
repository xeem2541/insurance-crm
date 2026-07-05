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
  console.log("=== เริ่มดึงข้อมูลรูปภาพจากเว็บหลักลงเครื่อง ===");
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let connection;
  try {
    console.log("กำลังเชื่อมต่อฐานข้อมูล Cloud TiDB...");
    connection = await mysql.createConnection({ uri: tidbUri });
    console.log("เชื่อมต่อสำเร็จ!");

    // Fetch documents
    const [docs] = await connection.query("SELECT * FROM documents WHERE deleted_at IS NULL");
    const [nonMotorDocs] = await connection.query("SELECT * FROM non_motor_documents WHERE deleted_at IS NULL");
    
    const allDocs = [...docs, ...nonMotorDocs];
    console.log(`พบไฟล์เอกสารทั้งหมดในระบบคลาวด์: ${allDocs.length} ไฟล์`);

    let downloadCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const doc of allDocs) {
      let fileUrl = doc.file_path;
      if (!fileUrl) continue;

      // Extract filename
      let filename = path.basename(fileUrl);
      
      // If it contains query parameters (e.g. cloudinary URL), clean it up
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }

      const destPath = path.join(uploadDir, filename);

      // Check if file already exists in D:/รูป
      if (fs.existsSync(destPath)) {
        skipCount++;
        continue;
      }

      // Determine source URL
      let downloadUrl = fileUrl;
      if (!fileUrl.startsWith('http')) {
        // Local uploaded file on Render, download from Render url
        downloadUrl = `${renderBackendUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
      }

      console.log(`[${downloadCount + skipCount + failCount + 1}/${allDocs.length}] กำลังดาวน์โหลด: ${doc.name} (${filename})...`);

      try {
        await downloadFile(downloadUrl, destPath);
        downloadCount++;
      } catch (err) {
        console.warn(`⚠️ ไม่สามารถโหลดไฟล์ได้ (ข้าม): ${doc.name}. ข้อผิดพลาด: ${err.message}`);
        failCount++;
      }
    }

    console.log("\n==========================================");
    console.log(" ดึงรูปภาพเสร็จสิ้นเรียบร้อยแล้ว!");
    console.log(` - ดาวน์โหลดไฟล์ใหม่สำเร็จ: ${downloadCount} ไฟล์`);
    console.log(` - ข้ามไฟล์เดิมที่มีอยู่แล้ว: ${skipCount} ไฟล์`);
    if (failCount > 0) {
      console.log(` - ไฟล์เก่าที่พังบนคลาวด์ (ข้าม): ${failCount} ไฟล์`);
    }
    console.log("==========================================");

    await connection.end();
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการรันสคริปต์:", err.message);
  }
}

main();

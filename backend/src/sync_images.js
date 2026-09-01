const fs = require('fs');
const path = require('path');
const https = require('https');
const { pool } = require('./db');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
const renderBackendUrl = process.env.RENDER_BACKEND_URL || 'https://insurance-crm-kpff.onrender.com';

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

let isSyncRunning = false;

async function syncImages(dbPool = pool) {
  if (isSyncRunning) return;
  isSyncRunning = true;

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Use shared pool with query retry
    const [docs] = await dbPool.query("SELECT * FROM documents WHERE deleted_at IS NULL");
    const [nonMotorDocs] = await dbPool.query("SELECT * FROM non_motor_documents WHERE deleted_at IS NULL");
    
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
        console.log(`[AutoSync] ดาวน์โหลดสำเร็จ: ${doc.name} -> ${filename}`);
      } catch (err) {
        failCount++;
        console.error(`[AutoSync] ดาวน์โหลดล้มเหลว: ${doc.name} -> ${filename}, สาเหตุ: ${err.message}`);
      }
    }

    if (downloadCount > 0) {
      console.log(`[AutoSync] ซิงค์ไฟล์รูปภาพใหม่เรียบร้อย: ${downloadCount} รูป`);
    }
  } catch (err) {
    console.error('[AutoSync] Error during image synchronization:', err.message);
  } finally {
    isSyncRunning = false;
  }
}

// Export a function to start the auto sync loop with reasonable interval (every 30s)
function startAutoSync(dbPool = pool) {
  console.log("[AutoSync] ระบบดึงรูปอัตโนมัติแบบเบื้องหลังเริ่มทำงานแล้ว (Sync ทุก 30 วินาที)...");
  
  // Initial run after 5 seconds
  setTimeout(() => {
    syncImages(dbPool);
  }, 5000);

  // Periodic run every 30 seconds
  setInterval(() => {
    syncImages(dbPool);
  }, 30000);
}

module.exports = { startAutoSync, syncImages };

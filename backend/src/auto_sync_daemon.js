const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');

const uploadDir = 'D:/รูป';
const tidbUri = 'mysql://BsRyTEVHX6fudsU.root:MqZz2WMqULDfGPqu@gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000/insurance_db?ssl={"rejectUnauthorized":true}';
const renderBackendUrl = 'https://insurance-crm-kpff.onrender.com';

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

async function runSync() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  let connection;
  try {
    connection = await mysql.createConnection({ uri: tidbUri });
    const [docs] = await connection.query("SELECT * FROM documents WHERE deleted_at IS NULL");
    const [nonMotorDocs] = await connection.query("SELECT * FROM non_motor_documents WHERE deleted_at IS NULL");
    const allDocs = [...docs, ...nonMotorDocs];

    for (const doc of allDocs) {
      let fileUrl = doc.file_path;
      if (!fileUrl) continue;
      
      let filename = path.basename(fileUrl).split('?')[0];
      const destPath = path.join(uploadDir, filename);

      if (!fs.existsSync(destPath)) {
        let downloadUrl = fileUrl.startsWith('http') ? fileUrl : `${renderBackendUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
        try {
          await downloadFile(downloadUrl, destPath);
        } catch (e) {
          // ignore download errors
        }
      }
    }
    await connection.end();
  } catch (e) {
    // ignore db errors
  }
}

async function startDaemon() {
  while (true) {
    await runSync();
    await new Promise(r => setTimeout(r, 2000));
  }
}

startDaemon();

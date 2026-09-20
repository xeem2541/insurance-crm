const fs = require('fs');
const path = require('path');
const { uploadFileToS3, isS3Configured } = require('../src/utils/s3');
// Use mysql2 to connect directly to TiDB
const mysql = require('mysql2/promise');
require('dotenv').config();

const uploadsDir = path.join(__dirname, '../uploads/documents');

async function migrate() {
  if (!isS3Configured) {
    console.error('Error: S3 is not configured in .env');
    process.exit(1);
  }

  if (!fs.existsSync(uploadsDir)) {
    console.error(`Uploads directory not found: ${uploadsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files to migrate to S3...`);

  const connection = await mysql.createConnection(process.env.DB_URI);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (file === '.gitkeep' || file === '.DS_Store') continue;

    const filePath = path.join(uploadsDir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const buffer = fs.readFileSync(filePath);
    
    // Determine S3 key
    const s3Key = `documents/${file}`; // e.g., documents/motor_123 or documents/non_motor_456
    
    // Attempt upload
    try {
      // Best guess for mimetype since files on disk might lack extensions
      let mimetype = 'application/octet-stream';
      if (file.endsWith('.pdf')) mimetype = 'application/pdf';
      else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) mimetype = 'image/jpeg';
      else if (file.endsWith('.png')) mimetype = 'image/png';
      else {
        // Many files are saved as motor_123 without extension. We can use file-type if needed,
        // but since we proxy it via /api/documents/file/:id which sets Content-Type from DB, 
        // the S3 content-type isn't strictly required for viewing, but it's good practice.
      }

      await uploadFileToS3(buffer, s3Key, mimetype);
      successCount++;
      console.log(`[SUCCESS] Uploaded ${file} -> ${s3Key}`);
    } catch (err) {
      console.error(`[FAILED] Failed to upload ${file}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nMigration completed.`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Failed:  ${failCount}`);

  await connection.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});

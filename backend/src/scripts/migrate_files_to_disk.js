const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { pool } = require('../db');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/documents');

async function migrateFiles() {
  if (!fsSync.existsSync(UPLOADS_DIR)) {
    fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const connection = await pool.getConnection();
  console.log('[Migration] Starting Base64 to Disk migration...');

  try {
    // 1. Motor Documents
    console.log('[Migration] Fetching motor documents...');
    const [motorDocs] = await connection.query('SELECT id, file_data FROM documents WHERE file_data IS NOT NULL');
    
    let motorSuccess = 0;
    for (const doc of motorDocs) {
      if (doc.file_data) {
        const buffer = Buffer.from(doc.file_data, 'base64');
        const filePath = path.join(UPLOADS_DIR, `motor_${doc.id}`);
        await fs.writeFile(filePath, buffer);
        motorSuccess++;
      }
    }
    console.log(`[Migration] Successfully saved ${motorSuccess} motor documents to disk.`);

    // 2. Non-Motor Documents
    console.log('[Migration] Fetching non-motor documents...');
    const [nonMotorDocs] = await connection.query('SELECT id, file_data FROM non_motor_documents WHERE file_data IS NOT NULL');
    
    let nonMotorSuccess = 0;
    for (const doc of nonMotorDocs) {
      if (doc.file_data) {
        const buffer = Buffer.from(doc.file_data, 'base64');
        const filePath = path.join(UPLOADS_DIR, `non_motor_${doc.id}`);
        await fs.writeFile(filePath, buffer);
        nonMotorSuccess++;
      }
    }
    console.log(`[Migration] Successfully saved ${nonMotorSuccess} non-motor documents to disk.`);
    
    // We intentionally DO NOT update file_path column.
    // The frontend relies on file_path = '/api/documents/file/123'
    // We will update the backend endpoints to read from the disk using the ID.

    // 3. Clear file_data to reclaim space
    console.log('[Migration] Nullifying file_data in DB to reclaim space...');
    await connection.query('UPDATE documents SET file_data = NULL WHERE file_data IS NOT NULL');
    await connection.query('UPDATE non_motor_documents SET file_data = NULL WHERE file_data IS NOT NULL');

    console.log('[Migration] Migration completed successfully.');
  } catch (error) {
    console.error('[Migration] Failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateFiles();

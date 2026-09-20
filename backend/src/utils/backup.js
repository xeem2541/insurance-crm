const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../db');
const archiver = require('archiver');
const fsSync = require('fs');

/**
 * Performs a complete backup of the database tables to a JSON file,
 * then zips it and cleans up old backups.
 */
async function performDatabaseBackup() {
  const dateStr = new Date().toISOString().split('T')[0];
  const backupsDir = path.join(__dirname, '../../../backups');

  try {
    // 1. Ensure backups directory exists
    await fs.mkdir(backupsDir, { recursive: true });

    console.log(`[Backup] Starting database backup for ${dateStr}...`);

    // 2. Fetch all tables from DB
    const tables = [
      'users',
      'customers',
      'vehicles',
      'policies',
      'non_motor_policies',
      'document_types',
      'documents',
      'activity_logs',
      'master_data',
      'payments',
      'installments',
      'migrations'
    ];

    const dbData = {};
    const connection = await pool.getConnection();
    try {
      for (const table of tables) {
        try {
          const [rows] = await connection.query(`SELECT * FROM ${table}`);
          dbData[table] = rows;
        } catch (tableErr) {
          console.warn(`[Backup] Table ${table} might not exist. Skipping.`);
        }
      }
    } finally {
      connection.release();
    }

    // 3. Save to JSON and Zip
    const jsonPath = path.join(backupsDir, `db_backup_${dateStr}.json`);
    const zipPath = path.join(backupsDir, `db_backup_${dateStr}.zip`);

    await fs.writeFile(jsonPath, JSON.stringify(dbData, null, 2), 'utf-8');

    await new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(zipPath);
      const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(jsonPath, { name: `db_backup_${dateStr}.json` });
      archive.finalize();
    });

    // Remove the raw JSON file to save space
    await fs.unlink(jsonPath);

    console.log(`[Backup] Backup completed successfully: ${zipPath}`);

    // 4. Cleanup backups older than 7 days
    const files = await fs.readdir(backupsDir);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('db_backup_') && file.endsWith('.zip')) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          await fs.unlink(filePath);
          console.log(`[Backup] Deleted old backup: ${file}`);
        }
      }
    }

  } catch (error) {
    console.error('[Backup] Database backup failed:', error);
  }
}

module.exports = performDatabaseBackup;

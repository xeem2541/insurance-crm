const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../db');

/**
 * Runs SQL migration scripts in order.
 * Ensures each script is run only once by tracking it in the `migrations` table.
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../../database/migrations');
  
  try {
    const connection = await pool.getConnection();
    
    try {
      // Ensure migrations table exists
      await connection.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Read migration files
      let files = [];
      try {
        files = await fs.readdir(migrationsDir);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('[Migrations] Migrations directory not found, skipping.');
          return;
        }
        throw err;
      }

      // Filter SQL files and sort alphabetically (001_, 002_, etc.)
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));

      if (sqlFiles.length === 0) {
        console.log('[Migrations] No migration files found.');
        return;
      }

      // Fetch already executed migrations
      const [executedRows] = await connection.query('SELECT filename FROM migrations');
      const executedFiles = new Set(executedRows.map(r => r.filename));

      // Run pending migrations
      for (const file of sqlFiles) {
        if (!executedFiles.has(file)) {
          console.log(`[Migrations] Running migration: ${file}...`);
          
          const filePath = path.join(migrationsDir, file);
          const sqlContent = await fs.readFile(filePath, 'utf8');
          
          // Split queries if multiple statements exist
          const queries = sqlContent
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);
            
          await connection.beginTransaction();
          
          try {
            for (const query of queries) {
              try {
                await connection.query(query);
              } catch (qErr) {
                // Ignore safe errors for idempotency
                const safeErrors = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_CANT_DROP_FIELD_OR_KEY', 'ER_BAD_TABLE_ERROR'];
                if (safeErrors.includes(qErr.code)) {
                  console.warn(`[Migrations] Ignored expected error in ${file}: ${qErr.code}`);
                } else {
                  throw qErr;
                }
              }
            }
            // Mark as executed
            await connection.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
            
            await connection.commit();
            console.log(`[Migrations] Completed: ${file}`);
          } catch (migrationErr) {
            await connection.rollback();
            console.error(`[Migrations] Error executing ${file}:`, migrationErr);
            throw migrationErr;
          }
        }
      }
      
      console.log('[Migrations] All migrations are up to date.');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[Migrations] Failed to run migrations:', err);
    throw err;
  }
}

module.exports = runMigrations;

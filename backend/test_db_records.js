const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'app_user',
    password: 'app_password',
    database: 'insurance_db',
    port: 3306,
    charset: 'utf8mb4'
  });

  try {
    console.log('Connecting to database...');
    const [policies] = await pool.query('SELECT id, policy_no, company, total_premium, created_at FROM policies ORDER BY id DESC LIMIT 5');
    console.log('Latest 5 Policies:', policies);

    const [logs] = await pool.query('SELECT id, policy_id, document_type, created_at FROM ai_correction_logs ORDER BY id DESC LIMIT 5');
    console.log('Latest 5 AI Correction Logs:', logs);
  } catch (e) {
    console.error('Error querying database:', e);
  } finally {
    await pool.end();
  }
}

run();

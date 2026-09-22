require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function setAdminId() {
  const connection = await mysql.createConnection(process.env.DB_URI);

  const userId = 'U90bf2669b1d454c38d3879b9bd7a3a24';

  console.log('Connected to TiDB.');
  
  // Clear any existing LINE_GROUP entries first so it ONLY notifies this one
  await connection.query("DELETE FROM master_data WHERE category = 'LINE_GROUP'");
  
  // Insert the new one
  await connection.query(
    "INSERT INTO master_data (category, value) VALUES ('LINE_GROUP', ?)",
    [userId]
  );
  
  console.log(`Successfully set admin notification ID to: ${userId}`);
  
  await connection.end();
}

setAdminId().catch(console.error);
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection(process.env.DB_URI);
  try {
    await conn.query(`
      ALTER TABLE customers 
      ADD COLUMN search_text TEXT GENERATED ALWAYS AS (
        CONCAT_WS(' ', 
          IFNULL(prefix, ''), 
          IFNULL(first_name, ''), 
          IFNULL(last_name, ''), 
          IFNULL(phone, ''), 
          IFNULL(id_card_no, ''), 
          IFNULL(customer_code, '')
        )
      ) VIRTUAL
    `);
    console.log("Virtual generated column added successfully.");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    conn.end();
  }
}

run();

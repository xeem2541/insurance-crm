require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const { sendLineNotify } = require('./src/services/lineNotify');

async function testNotify() {
  const connection = await mysql.createConnection(process.env.DB_URI);
  
  console.log('Connected to DB, sending test notification...');
  
  await sendLineNotify('✅ [ทดสอบระบบ] การแจ้งเตือนสำหรับแอดมินทำงานสำเร็จเรียบร้อยแล้วครับ!', connection);
  
  console.log('Finished.');
  await connection.end();
}

testNotify().catch(console.error);
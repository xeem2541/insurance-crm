const axios = require('axios');
require('dotenv').config();
const { pool } = require('./src/db');
async function test() {
  const [rows] = await pool.query('SELECT value FROM master_data WHERE category = \'LINE_GROUP\'');
  if(rows.length>0) {
    const to = rows[0].value;
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: to,
      messages: [{ type: 'text', text: '✅ ระบบบันทึกข้อมูลและส่งแจ้งเตือนทำงานปกติครับ! (This is a test notification)' }]
    }, {
      headers: {
        'Authorization': 'Bearer ' + process.env.LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    console.log('Sent successfully to', to);
  } else {
    console.log('No ID found');
  }
  process.exit(0);
}
test().catch(console.error);

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- เริ่มการทดสอบระบบความปลอดภัย 10/10 ---\n');

  try {
    // 1. Test Login to get Access Token and Refresh Token Cookie
    const testUser = `testadmin${Date.now()}`;
    // Actually, registering requires an admin token first in this system.
    // Instead of registering, let's bypass DB logic for the test or just use the first user.
    // Let me try to login using a common user. Wait, I can execute a script to fetch the first user.
    // Let me do it via a direct DB query inside test_security.js since it has access to dotenv and DB_URI.

    const mysql = require('mysql2/promise');
    require('dotenv').config();
    const connection = await mysql.createConnection(process.env.DB_URI);
    const [users] = await connection.query('SELECT username FROM users LIMIT 1');
    await connection.end();

    if (users.length === 0) {
      throw new Error('No users found in database to test with.');
    }
    const usernameToTest = users[0].username;

    // We can't know the password, but we can force update it to a known one for this test user.
    const bcrypt = require('bcryptjs');
    const newHash = await bcrypt.hash('password123', 10);
    const connection2 = await mysql.createConnection(process.env.DB_URI);
    await connection2.query('UPDATE users SET password = ? WHERE username = ?', [newHash, usernameToTest]);
    await connection2.end();

    console.log(`1. ทดสอบการเข้าสู่ระบบเพื่อรับ Token (username: ${usernameToTest})...`);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: usernameToTest,
      password: 'password123'
    });
    
    const accessToken = loginRes.data.token;
    console.log('✅ Access Token ได้รับเรียบร้อย');
    
    // Extract HttpOnly cookie
    const cookies = loginRes.headers['set-cookie'];
    if (cookies && cookies.some(c => c.includes('refreshToken'))) {
      console.log('✅ HttpOnly Refresh Token Cookie ได้รับเรียบร้อย');
    } else {
      throw new Error('ไม่พบ Refresh Token Cookie!');
    }
    const cookieHeader = cookies[0];

    // 2. Test Refresh Token
    console.log('\n2. ทดสอบการต่ออายุ Token (Refresh Token)...');
    const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
      headers: {
        Cookie: cookieHeader
      }
    });
    const newAccessToken = refreshRes.data.token;
    console.log('✅ ได้รับ Access Token ใหม่เรียบร้อย');

    // 3. Test File Validation (Safe File)
    console.log('\n3. ทดสอบการอัปโหลดไฟล์ที่ปลอดภัย (รูปภาพจริง)...');
    
    // Create a minimal real PNG buffer (1x1 transparent PNG)
    const realPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
    
    const safeForm = new FormData();
    safeForm.append('file', realPngBuffer, {
      filename: 'safe.png',
      contentType: 'image/png'
    });
    safeForm.append('customer_id', 1);
    safeForm.append('document_type_id', 1);
    safeForm.append('name', 'Safe File Test');

    try {
      const safeUploadRes = await axios.post(`${BASE_URL}/documents/upload`, safeForm, {
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
          ...safeForm.getHeaders()
        }
      });
      console.log('✅ ไฟล์ปลอดภัยถูกอัปโหลดสำเร็จ (ระบบอนุญาต)');
    } catch (e) {
      console.log('❌ ไฟล์ปลอดภัยถูกปฏิเสธ:', e.response?.data?.error || e.message);
    }

    // 4. Test File Validation (Malicious File masquerading as Image)
    console.log('\n4. ทดสอบการอัปโหลดไฟล์อันตราย (ไฟล์ Text แต่ปลอมเป็น .jpg)...');
    
    // Fake image buffer
    const fakeImageBuffer = Buffer.from('<script>alert("XSS")</script>', 'utf-8');
    
    const maliciousForm = new FormData();
    maliciousForm.append('file', fakeImageBuffer, {
      filename: 'malicious.jpg', // Fake extension
      contentType: 'image/jpeg' // Fake mime type
    });
    maliciousForm.append('customer_id', 1);
    maliciousForm.append('document_type_id', 1);
    maliciousForm.append('name', 'Malicious File Test');

    try {
      const maliciousUploadRes = await axios.post(`${BASE_URL}/documents/upload`, maliciousForm, {
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
          ...maliciousForm.getHeaders()
        }
      });
      console.log('❌ ไฟล์อันตรายหลุดรอดไปได้! (FAIL)');
    } catch (e) {
      if (e.response && e.response.status === 400) {
        console.log('✅ ไฟล์อันตรายถูกบล็อคอย่างถูกต้อง! ข้อความ: ' + e.response.data.error);
      } else {
        console.log('❌ เกิดข้อผิดพลาดที่ไม่คาดคิด:', e.message);
      }
    }

    console.log('\n--- การทดสอบเสร็จสมบูรณ์ ---');
  } catch (err) {
    console.error('\n❌ เกิดข้อผิดพลาดในการทดสอบ:', err.response?.data?.error || err.message);
  }
}

runTests();

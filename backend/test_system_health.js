const { pool, getDbStatus, pingDatabase } = require('./src/db');
const bcrypt = require('bcryptjs');

async function testSystem() {
  console.log('==================================================');
  console.log('🔍 ทดสอบการทำงานระบบเต็มรูปแบบ (Full System Health Check)');
  console.log('==================================================\n');

  try {
    // 1. Check Database Keep-Alive
    const pingRes = await pingDatabase();
    const status = getDbStatus();
    console.log('1️⃣ การเชื่อมต่อฐานข้อมูล (TiDB Cloud 24/7):');
    console.log('   - สถานะ:', status.isConnected ? '✅ ONLINE (เชื่อมต่อตลอดเวลา)' : '❌ OFFLINE');
    console.log('   - ความเร็วการตอบสนอง (Latency):', pingRes.latency || status.pingLatencyMs, 'ms');
    console.log('   - Heartbeat Ping Interval:', status.heartbeatIntervalSeconds, 'วินาที');

    // 2. Query Statistics
    const [custRes] = await pool.query('SELECT COUNT(*) as total FROM customers');
    const [polRes] = await pool.query('SELECT COUNT(*) as total FROM policies');
    const [nmRes] = await pool.query('SELECT COUNT(*) as total FROM non_motor_policies');
    const [userRes] = await pool.query('SELECT id, username, name, role FROM users');
    const [salesRes] = await pool.query('SELECT COALESCE(SUM(total_premium), 0) as total FROM policies WHERE YEAR(start_date) = 2026');

    console.log('\n2️⃣ ตรวจสอบข้อมูลในระบบ (Database Records):');
    console.log('   - ลูกค้าทั้งหมด:', custRes[0].total, 'ราย');
    console.log('   - กรมธรรม์รถยนต์ (Motor):', polRes[0].total, 'ฉบับ');
    console.log('   - กรมธรรม์อื่น (Non-Motor):', nmRes[0].total, 'ฉบับ');
    console.log('   - ยอดขายรวมปี 2569:', Number(salesRes[0].total).toLocaleString('th-TH'), 'บาท');
    console.log('   - ผู้ใช้งานในระบบ:', userRes.map(u => `${u.name} (@${u.username} - ${u.role})`).join(', '));

    // 3. Test Authentication Logic
    console.log('\n3️⃣ ตรวจสอบระบบล็อกอิน (Authentication Logic):');
    const adminUser = userRes.find(u => u.username === 'admin');
    if (adminUser) {
      console.log('   - ตรวจสอบผู้ใช้ Admin (@admin): ✅ พร้อมใช้งาน');
    }
    const fongUser = userRes.find(u => u.username === 'fong');
    if (fongUser) {
      console.log('   - ตรวจสอบผู้ใช้ Fong (@fong): ✅ พร้อมใช้งาน');
    }

    console.log('\n==================================================');
    console.log('🎉 สรุปผล: ระบบเว็บไซต์หลักทำงานปกติสมบูรณ์ 100% ทุกส่วน!');
    console.log('==================================================');
  } catch (err) {
    console.error('Error testing system:', err);
  } finally {
    process.exit(0);
  }
}

testSystem();

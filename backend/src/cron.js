const cron = require('node-cron');
const { sendLineNotify } = require('./services/lineNotify');

const startCronJobs = (db) => {
  // Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily cron job for expiring policies...');
    try {
      const [policies] = await db.query(`
        SELECT p.policy_no, c.first_name, c.last_name, v.plate_no, p.expiry_date,
               DATEDIFF(p.expiry_date, CURDATE()) as days_left, 'Motor' as policy_type
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        WHERE p.status IN ('สำเร็จ', 'ชำระครบแล้ว')
          AND DATEDIFF(p.expiry_date, CURDATE()) IN (30, 15, 7, 3, 1, 0)
        UNION ALL
        SELECT np.policy_no, c.first_name, c.last_name, '-' as plate_no, np.expiry_date,
               DATEDIFF(np.expiry_date, CURDATE()) as days_left, 'Non-Motor' as policy_type
        FROM non_motor_policies np
        JOIN customers c ON np.customer_id = c.id
        WHERE np.status IN ('สำเร็จ', 'ชำระครบแล้ว')
          AND DATEDIFF(np.expiry_date, CURDATE()) IN (30, 15, 7, 3, 1, 0)
        ORDER BY days_left ASC
      `);

      if (policies.length > 0) {
        let msg = `⏰ แจ้งเตือนกรมธรรม์ใกล้หมดอายุ!\nวันนี้มีลูกค้าต้องติดตาม ${policies.length} ราย:\n\n`;
        policies.forEach(p => {
          const typeLabel = p.policy_type === 'Motor' ? 'รถยนต์' : 'Non-Motor';
          const plateInfo = p.policy_type === 'Motor' ? `(${p.plate_no || 'ไม่ระบุทะเบียน'})` : '';
          msg += `- [${typeLabel}] ${p.first_name} ${p.last_name} ${plateInfo}\n  หมดอายุในอีก ${p.days_left} วัน\n`;
        });
        
        await sendLineNotify(msg, db);
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
  console.log('Cron jobs scheduled.');
};

module.exports = { startCronJobs };

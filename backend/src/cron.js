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
        const flexContents = [];
        
        policies.slice(0, 10).forEach((p, index) => {
          if (index > 0) {
            flexContents.push({ type: "separator", margin: "md" });
          }
          
          const typeColor = p.policy_type === 'Motor' ? '#4CAF50' : '#FF9800';
          const typeLabel = p.policy_type === 'Motor' ? 'รถยนต์' : 'Non-Motor';
          const plateInfo = p.policy_type === 'Motor' ? (p.plate_no || 'ไม่ระบุ') : '-';
          
          flexContents.push({
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: typeLabel, color: typeColor, size: "sm", flex: 2, weight: "bold" },
                  { type: "text", text: `${p.first_name} ${p.last_name}`, wrap: true, color: "#333333", size: "sm", flex: 5, weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: "ทะเบียน", color: "#aaaaaa", size: "sm", flex: 2 },
                  { type: "text", text: plateInfo, wrap: true, color: "#666666", size: "sm", flex: 5 }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: "หมดอายุ", color: "#aaaaaa", size: "sm", flex: 2 },
                  { 
                    type: "text", 
                    text: p.days_left === 0 ? "วันนี้" : `อีก ${p.days_left} วัน`, 
                    wrap: true, 
                    color: p.days_left <= 7 ? "#ff0000" : "#666666", 
                    size: "sm", 
                    flex: 5, 
                    weight: p.days_left <= 7 ? "bold" : "regular" 
                  }
                ]
              }
            ]
          });
        });

        if (policies.length > 10) {
          flexContents.push({ type: "separator", margin: "md" });
          flexContents.push({
            type: "text",
            text: `และลูกค้าอีก ${policies.length - 10} ราย...`,
            size: "sm",
            color: "#aaaaaa",
            margin: "md",
            align: "center"
          });
        }

        const flexMessage = {
          type: "flex",
          altText: `⏰ แจ้งเตือนกรมธรรม์ใกล้หมดอายุ! (ติดตาม ${policies.length} ราย)`,
          contents: {
            type: "bubble",
            size: "giga",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#ff5252",
              paddingAll: "20px",
              contents: [
                { type: "text", text: "⏰ แจ้งเตือนต่ออายุประกัน", weight: "bold", color: "#ffffff", size: "xl" },
                { type: "text", text: `วันนี้มีลูกค้าต้องติดตาม ${policies.length} ราย`, color: "#ffffffcc", size: "sm", margin: "md" }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: flexContents
            }
          }
        };
        
        await sendLineNotify(flexMessage, db);
      }
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
  console.log('Cron jobs scheduled.');
};

module.exports = { startCronJobs };

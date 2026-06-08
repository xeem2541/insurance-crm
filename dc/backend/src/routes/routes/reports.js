const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Get generic report data (Sales, Commission, etc.)
router.get('/', [authenticateToken, authorizeRole(['Admin', 'Manager', 'Sales'])], async (req, res) => {
  const { type, start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    let query = '';
    let params = [start_date, end_date];

    switch(type) {
      case 'sales_daily':
        query = `
          SELECT DATE(start_date) as date, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE(start_date)
          ORDER BY date ASC
        `;
        break;
      case 'sales_monthly':
        query = `
          SELECT DATE_FORMAT(start_date, '%Y-%m') as month, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(start_date, '%Y-%m')
          ORDER BY month ASC
        `;
        break;
      case 'renewal':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left
          FROM policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN vehicles v ON p.vehicle_id = v.id
          WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN ? AND ?
          ORDER BY p.expiry_date ASC
        `;
        break;
      case 'arrears':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, v.plate_no
          FROM policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN vehicles v ON p.vehicle_id = v.id
          WHERE p.status = 'รอผ่อนชำระ' AND p.start_date BETWEEN ? AND ?
          ORDER BY p.start_date DESC
        `;
        break;
      case 'non_motor_sales_daily':
        query = `
          SELECT DATE(start_date) as date, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM non_motor_policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE(start_date)
          ORDER BY date ASC
        `;
        break;
      case 'non_motor_sales_monthly':
        query = `
          SELECT DATE_FORMAT(start_date, '%Y-%m') as month, SUM(total_premium) as total_sales, COUNT(id) as policy_count, SUM(commission_baht) as total_commission
          FROM non_motor_policies 
          WHERE status = 'สำเร็จ' AND start_date BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(start_date, '%Y-%m')
          ORDER BY month ASC
        `;
        break;
      case 'non_motor_renewal':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, t.name as type_name, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left
          FROM non_motor_policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
          WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN ? AND ?
          ORDER BY p.expiry_date ASC
        `;
        break;
      case 'non_motor_arrears':
        query = `
          SELECT p.*, c.first_name, c.last_name, c.phone, t.name as type_name
          FROM non_motor_policies p
          JOIN customers c ON p.customer_id = c.id
          LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
          WHERE p.status = 'รอผ่อนชำระ' AND p.start_date BETWEEN ? AND ?
          ORDER BY p.start_date DESC
        `;
        break;
      case 'sales_by_person':
        query = `
          SELECT 
            u.name as 'พนักงานขาย',
            COUNT(pol.id) as 'จำนวนกรมธรรม์',
            SUM(pol.total_premium) as 'ยอดขายรวม',
            SUM(pol.commission_baht) as 'คอมมิชชันรวม'
          FROM users u
          LEFT JOIN (
            SELECT id, sales_person_id, total_premium, commission_baht, status, start_date FROM policies
            UNION ALL
            SELECT id, sales_person_id, total_premium, commission_baht, status, start_date FROM non_motor_policies
          ) as pol ON u.id = pol.sales_person_id 
            AND pol.status IN ('สำเร็จ', 'ชำระครบแล้ว')
            AND pol.start_date BETWEEN ? AND ?
          GROUP BY u.id, u.name
          HAVING COUNT(pol.id) > 0
          ORDER BY SUM(pol.total_premium) DESC
        `;
        break;
      case 'sales_by_company':
        query = `
          SELECT 
            company as 'บริษัทประกันภัย',
            COUNT(id) as 'จำนวนกรมธรรม์',
            SUM(total_premium) as 'ยอดขายรวม'
          FROM (
            SELECT company, total_premium, status, start_date FROM policies
            UNION ALL
            SELECT company, total_premium, status, start_date FROM non_motor_policies
          ) as all_pol
          WHERE status IN ('สำเร็จ', 'ชำระครบแล้ว') AND start_date BETWEEN ? AND ?
          GROUP BY company
          ORDER BY SUM(total_premium) DESC
        `;
        break;
      case 'sales_by_type':
        query = `
          SELECT 
            type_name as 'ประเภทประกันภัย',
            COUNT(id) as 'จำนวนกรมธรรม์',
            SUM(total_premium) as 'ยอดขายรวม'
          FROM (
            SELECT type as type_name, total_premium, status, start_date FROM policies
            UNION ALL
            SELECT t.name as type_name, p.total_premium, p.status, p.start_date 
            FROM non_motor_policies p 
            LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
          ) as all_types
          WHERE status IN ('สำเร็จ', 'ชำระครบแล้ว') AND start_date BETWEEN ? AND ?
          GROUP BY type_name
          ORDER BY SUM(total_premium) DESC
        `;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const [rows] = await req.db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

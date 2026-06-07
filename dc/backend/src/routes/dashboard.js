const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [customers] = await req.db.query('SELECT COUNT(*) as count FROM customers');
    
    // Motor queries
    const [mPolicies] = await req.db.query('SELECT COUNT(*) as count FROM policies');
    const [mSalesThisMonth] = await req.db.query(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND MONTH(start_date) = MONTH(CURRENT_DATE()) AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
    const [mSalesThisYear] = await req.db.query(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
    const [mCommThisMonth] = await req.db.query(`SELECT SUM(commission_baht) as total FROM policies WHERE status = 'สำเร็จ' AND MONTH(start_date) = MONTH(CURRENT_DATE()) AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
    const [mExpiringPolicies] = await req.db.query(`
      SELECT p.*, c.first_name, c.last_name, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Motor' as category
      FROM policies p 
      JOIN customers c ON p.customer_id = c.id 
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
    `);
    const [mMonthlySales] = await req.db.query(`SELECT MONTH(start_date) as month, SUM(total_premium) as total_sales FROM policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = YEAR(CURRENT_DATE()) GROUP BY MONTH(start_date)`);

    // Non-Motor queries
    let nmPolicies = [{count: 0}], nmSalesThisMonth = [{total: 0}], nmSalesThisYear = [{total: 0}], nmCommThisMonth = [{total: 0}], nmExpiringPolicies = [], nmMonthlySales = [];
    try {
      [nmPolicies] = await req.db.query('SELECT COUNT(*) as count FROM non_motor_policies');
      [nmSalesThisMonth] = await req.db.query(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND MONTH(start_date) = MONTH(CURRENT_DATE()) AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
      [nmSalesThisYear] = await req.db.query(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
      [nmCommThisMonth] = await req.db.query(`SELECT SUM(commission_baht) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND MONTH(start_date) = MONTH(CURRENT_DATE()) AND YEAR(start_date) = YEAR(CURRENT_DATE())`);
      [nmExpiringPolicies] = await req.db.query(`
        SELECT p.*, c.first_name, c.last_name, NULL as plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Non-Motor' as category, t.name as type_name
        FROM non_motor_policies p 
        JOIN customers c ON p.customer_id = c.id 
        LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
        WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
      `);
      [nmMonthlySales] = await req.db.query(`SELECT MONTH(start_date) as month, SUM(total_premium) as total_sales FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = YEAR(CURRENT_DATE()) GROUP BY MONTH(start_date)`);
    } catch (e) {
      console.log('Non-motor tables might not exist yet');
    }

    const [documents] = await req.db.query('SELECT COUNT(*) as count FROM documents WHERE deleted_at IS NULL');
    const [newCustomers] = await req.db.query(`SELECT COUNT(*) as count FROM customers WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);

    // Merge and sort expiring policies
    const allExpiring = [...mExpiringPolicies, ...nmExpiringPolicies].sort((a, b) => a.days_left - b.days_left);

    // Merge monthly sales
    const mergedMonthlySalesMap = {};
    mMonthlySales.forEach(row => { mergedMonthlySalesMap[row.month] = { month: row.month, motor_sales: row.total_sales, non_motor_sales: 0 }; });
    nmMonthlySales.forEach(row => { 
      if (!mergedMonthlySalesMap[row.month]) mergedMonthlySalesMap[row.month] = { month: row.month, motor_sales: 0, non_motor_sales: 0 };
      mergedMonthlySalesMap[row.month].non_motor_sales = row.total_sales;
    });
    const mergedMonthlySales = Object.values(mergedMonthlySalesMap).sort((a, b) => a.month - b.month);

    // Top 10 Companies by Sales (Motor)
    const [topCompanies] = await req.db.query(`
      SELECT company, SUM(total_premium) as total_sales, COUNT(*) as policy_count 
      FROM policies 
      WHERE status = 'สำเร็จ'
      GROUP BY company 
      ORDER BY total_sales DESC 
      LIMIT 10
    `);

    // Top 10 Sales Persons (Motor)
    const [topSales] = await req.db.query(`
      SELECT u.name, SUM(p.total_premium) as total_sales, COUNT(p.id) as policy_count 
      FROM policies p
      JOIN users u ON p.sales_person_id = u.id
      WHERE p.status = 'สำเร็จ'
      GROUP BY u.id, u.name 
      ORDER BY total_sales DESC 
      LIMIT 10
    `);

    res.json({
      totalCustomers: customers[0].count,
      totalPolicies: mPolicies[0].count,
      totalNonMotorPolicies: nmPolicies[0].count,
      totalDocuments: documents[0].count,
      newCustomersThisMonth: newCustomers[0].count,
      salesThisMonth: mSalesThisMonth[0].total || 0,
      salesThisYear: mSalesThisYear[0].total || 0,
      commThisMonth: mCommThisMonth[0].total || 0,
      nmSalesThisMonth: nmSalesThisMonth[0].total || 0,
      nmSalesThisYear: nmSalesThisYear[0].total || 0,
      nmCommThisMonth: nmCommThisMonth[0].total || 0,
      expiringPolicies: allExpiring,
      monthlySales: mergedMonthlySales,
      topCompanies: topCompanies,
      topSales: topSales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

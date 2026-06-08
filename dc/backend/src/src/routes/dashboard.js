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

    // Installment / Payment queries
    let cashSalesTotal = 0, installmentSalesTotal = 0, unpaidInstallmentTotal = 0, collectedThisMonth = 0;
    let overdueCustomersCount = 0, upcomingInstallments = [];
    try {
      const [cashRes] = await req.db.query(`
        SELECT SUM(IFNULL(p.total_premium, np.total_premium)) as total 
        FROM payments pm 
        LEFT JOIN policies p ON pm.policy_id = p.id AND p.status = 'สำเร็จ'
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id AND np.status = 'สำเร็จ'
        WHERE pm.payment_method = 'เงินสด' AND (p.id IS NOT NULL OR np.id IS NOT NULL)
      `);
      cashSalesTotal = cashRes[0].total || 0;
      
      const [instRes] = await req.db.query(`
        SELECT SUM(IFNULL(p.total_premium, np.total_premium)) as total 
        FROM payments pm 
        LEFT JOIN policies p ON pm.policy_id = p.id AND p.status = 'สำเร็จ'
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id AND np.status = 'สำเร็จ'
        WHERE pm.payment_method = 'เงินผ่อน' AND (p.id IS NOT NULL OR np.id IS NOT NULL)
      `);
      installmentSalesTotal = instRes[0].total || 0;

      const [unpaidRes] = await req.db.query("SELECT SUM(balance_amount) as total FROM installments WHERE status IN ('รอชำระ', 'ค้างชำระ')");
      unpaidInstallmentTotal = unpaidRes[0].total || 0;

      const [collectedRes] = await req.db.query("SELECT SUM(paid_amount) as total FROM installments WHERE status IN ('ชำระแล้ว', 'ชำระบางส่วน') AND MONTH(payment_date) = MONTH(CURRENT_DATE()) AND YEAR(payment_date) = YEAR(CURRENT_DATE())");
      collectedThisMonth = collectedRes[0].total || 0;

      const [overdueCustRes] = await req.db.query("SELECT COUNT(DISTINCT IFNULL(pm.policy_id, pm.non_motor_policy_id)) as count FROM installments i JOIN payments pm ON i.payment_id = pm.id WHERE i.status = 'ค้างชำระ' OR (i.status = 'รอชำระ' AND i.due_date < CURRENT_DATE())");
      overdueCustomersCount = overdueCustRes[0].count || 0;

      const [upcomingRes] = await req.db.query(`
        SELECT i.*, IFNULL(p.policy_no, np.policy_no) as policy_no, c.first_name, c.last_name, c.phone
        FROM installments i 
        JOIN payments pm ON i.payment_id = pm.id 
        LEFT JOIN policies p ON pm.policy_id = p.id
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id
        JOIN customers c ON (p.customer_id = c.id OR np.customer_id = c.id)
        WHERE i.status = 'รอชำระ' AND i.due_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
        ORDER BY i.due_date ASC
      `);
      upcomingInstallments = upcomingRes;
    } catch (e) {
      console.log('Installment tables might not exist yet', e.message);
    }

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
      topSales: topSales,
      cashSalesTotal,
      installmentSalesTotal,
      unpaidInstallmentTotal,
      collectedThisMonth,
      overdueCustomersCount,
      upcomingInstallments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

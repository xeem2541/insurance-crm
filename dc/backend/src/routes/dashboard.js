const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const targetMonth = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const targetYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const [customers] = await req.db.query('SELECT COUNT(*) as count FROM customers');
    
    // Motor queries
    const [mPolicies] = await req.db.query('SELECT COUNT(*) as count FROM policies');
    const [mSalesThisMonth] = await req.db.query(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND MONTH(created_at) = ? AND YEAR(created_at) = ?`, [targetMonth, targetYear]);
    const [mSalesThisYear] = await req.db.query(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND YEAR(created_at) = ?`, [targetYear]);
    const [mCommThisMonth] = await req.db.query(`SELECT SUM(commission_baht) as total FROM policies WHERE status = 'สำเร็จ' AND MONTH(created_at) = ? AND YEAR(created_at) = ?`, [targetMonth, targetYear]);
    const [mExpiringPolicies] = await req.db.query(`
      SELECT p.*, c.first_name, c.last_name, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Motor' as category
      FROM policies p 
      JOIN customers c ON p.customer_id = c.id 
      LEFT JOIN vehicles v ON p.vehicle_id = v.id
      WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
    `);
    const [mMonthlySales] = await req.db.query(`SELECT MONTH(created_at) as month, SUM(total_premium) as total_sales FROM policies WHERE status = 'สำเร็จ' AND YEAR(created_at) = ? GROUP BY MONTH(created_at)`, [targetYear]);

    // Non-Motor queries
    let nmPolicies = [{count: 0}], nmSalesThisMonth = [{total: 0}], nmSalesThisYear = [{total: 0}], nmCommThisMonth = [{total: 0}], nmExpiringPolicies = [], nmMonthlySales = [];
    try {
      [nmPolicies] = await req.db.query('SELECT COUNT(*) as count FROM non_motor_policies');
      [nmSalesThisMonth] = await req.db.query(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND MONTH(created_at) = ? AND YEAR(created_at) = ?`, [targetMonth, targetYear]);
      [nmSalesThisYear] = await req.db.query(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(created_at) = ?`, [targetYear]);
      [nmCommThisMonth] = await req.db.query(`SELECT SUM(commission_baht) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND MONTH(created_at) = ? AND YEAR(created_at) = ?`, [targetMonth, targetYear]);
      [nmExpiringPolicies] = await req.db.query(`
        SELECT p.*, c.first_name, c.last_name, NULL as plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Non-Motor' as category, t.name as type_name
        FROM non_motor_policies p 
        JOIN customers c ON p.customer_id = c.id 
        LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
        WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
      `);
      [nmMonthlySales] = await req.db.query(`SELECT MONTH(created_at) as month, SUM(total_premium) as total_sales FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(created_at) = ? GROUP BY MONTH(created_at)`, [targetYear]);
    } catch (e) {
      console.log('Non-motor tables might not exist yet');
    }

    const [documents] = await req.db.query('SELECT COUNT(*) as count FROM documents WHERE deleted_at IS NULL');
    const [newCustomers] = await req.db.query(`SELECT COUNT(*) as count FROM customers WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`, [targetMonth, targetYear]);

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

      const [collectedRes] = await req.db.query("SELECT SUM(paid_amount) as total FROM installments WHERE status IN ('ชำระแล้ว', 'ชำระบางส่วน') AND MONTH(payment_date) = ? AND YEAR(payment_date) = ?", [targetMonth, targetYear]);
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

    // List of customers who bought policies in this selected month
    let monthlyCustomers = [];
    try {
      const [mcRes] = await req.db.query(`
        SELECT 
          c.first_name, c.last_name, c.phone,
          p.policy_no, p.start_date, p.expiry_date, p.created_at, p.total_premium, 'Motor' as policy_type
        FROM policies p JOIN customers c ON p.customer_id = c.id 
        WHERE MONTH(p.created_at) = ? AND YEAR(p.created_at) = ? AND p.status IN ('สำเร็จ', 'ชำระครบแล้ว')
        UNION ALL
        SELECT 
          c.first_name, c.last_name, c.phone,
          np.policy_no, np.start_date, np.expiry_date, np.created_at, np.total_premium, 'Non-Motor' as policy_type
        FROM non_motor_policies np JOIN customers c ON np.customer_id = c.id 
        WHERE MONTH(np.created_at) = ? AND YEAR(np.created_at) = ? AND np.status IN ('สำเร็จ', 'ชำระครบแล้ว')
        ORDER BY created_at DESC
      `, [targetMonth, targetYear, targetMonth, targetYear]);
      monthlyCustomers = mcRes;
    } catch (e) {
      console.log('Error fetching monthly customers', e.message);
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
      WHERE status = 'สำเร็จ' AND YEAR(created_at) = ?
      GROUP BY company 
      ORDER BY total_sales DESC 
      LIMIT 10
    `, [targetYear]);

    // Top 10 Sales Persons (Motor)
    const [topSales] = await req.db.query(`
      SELECT u.name, SUM(p.total_premium) as total_sales, COUNT(p.id) as policy_count 
      FROM policies p
      JOIN users u ON p.sales_person_id = u.id
      WHERE p.status = 'สำเร็จ' AND YEAR(p.created_at) = ?
      GROUP BY u.id, u.name 
      ORDER BY total_sales DESC 
      LIMIT 10
    `, [targetYear]);

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
      upcomingInstallments,
      monthlyCustomers,
      selectedMonth: targetMonth,
      selectedYear: targetYear
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

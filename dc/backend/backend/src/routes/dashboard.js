const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const targetMonth = req.query.month === 'all' ? 'all' : (req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1);
    const targetYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const safeQuery = async (query, params = []) => {
      try {
        const [rows] = await req.db.query(query, params);
        return rows;
      } catch (e) {
        return [];
      }
    };

    const monthFilter = (col) => {
      if (targetMonth === 'all') {
        return { sql: `YEAR(${col}) = ?`, params: [targetYear] };
      } else {
        return { sql: `MONTH(${col}) = ? AND YEAR(${col}) = ?`, params: [targetMonth, targetYear] };
      }
    };

    const q_motorSales = monthFilter('start_date');
    const q_motorComm = monthFilter('start_date');
    const q_nonMotorSales = monthFilter('start_date');
    const q_nonMotorComm = monthFilter('start_date');
    const q_newCustomers = monthFilter('created_at');
    const q_installments = monthFilter('payment_date');
    const q_monthlyCustomers_m = monthFilter('p.start_date');
    const q_monthlyCustomers_nm = monthFilter('np.start_date');
    const q_aiStats = monthFilter('created_at');
    const q_aiDocTypes = monthFilter('created_at');
    const q_aiCorrections = monthFilter('created_at');

    const queries = [
      safeQuery('SELECT COUNT(*) as count FROM customers'),
      safeQuery('SELECT COUNT(*) as count FROM policies'),
      safeQuery(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND ${q_motorSales.sql}`, q_motorSales.params),
      safeQuery(`SELECT SUM(total_premium) as total FROM policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = ?`, [targetYear]),
      safeQuery(`SELECT SUM(commission_baht) as total FROM policies WHERE status = 'สำเร็จ' AND ${q_motorComm.sql}`, q_motorComm.params),
      safeQuery(`
        SELECT p.*, c.first_name, c.last_name, v.plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Motor' as category
        FROM policies p 
        JOIN customers c ON p.customer_id = c.id 
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
      `),
      safeQuery(`SELECT MONTH(start_date) as month, SUM(total_premium) as total_sales FROM policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = ? GROUP BY MONTH(start_date)`, [targetYear]),
      
      // non-motor
      safeQuery('SELECT COUNT(*) as count FROM non_motor_policies'),
      safeQuery(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND ${q_nonMotorSales.sql}`, q_nonMotorSales.params),
      safeQuery(`SELECT SUM(total_premium) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = ?`, [targetYear]),
      safeQuery(`SELECT SUM(commission_baht) as total FROM non_motor_policies WHERE status = 'สำเร็จ' AND ${q_nonMotorComm.sql}`, q_nonMotorComm.params),
      safeQuery(`
        SELECT p.*, c.first_name, c.last_name, NULL as plate_no, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left, 'Non-Motor' as category, t.name as type_name
        FROM non_motor_policies p 
        JOIN customers c ON p.customer_id = c.id 
        LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
        WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
      `),
      safeQuery(`SELECT MONTH(start_date) as month, SUM(total_premium) as total_sales FROM non_motor_policies WHERE status = 'สำเร็จ' AND YEAR(start_date) = ? GROUP BY MONTH(start_date)`, [targetYear]),
      
      // other
      safeQuery('SELECT COUNT(*) as count FROM documents WHERE deleted_at IS NULL'),
      safeQuery(`SELECT COUNT(*) as count FROM customers WHERE ${q_newCustomers.sql}`, q_newCustomers.params),
      
      // installments / payments
      safeQuery(`
        SELECT SUM(IFNULL(p.total_premium, np.total_premium)) as total 
        FROM payments pm 
        LEFT JOIN policies p ON pm.policy_id = p.id AND p.status = 'สำเร็จ'
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id AND np.status = 'สำเร็จ'
        WHERE pm.payment_method = 'เงินสด' AND (p.id IS NOT NULL OR np.id IS NOT NULL)
      `),
      safeQuery(`
        SELECT SUM(IFNULL(p.total_premium, np.total_premium)) as total 
        FROM payments pm 
        LEFT JOIN policies p ON pm.policy_id = p.id AND p.status = 'สำเร็จ'
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id AND np.status = 'สำเร็จ'
        WHERE pm.payment_method = 'เงินผ่อน' AND (p.id IS NOT NULL OR np.id IS NOT NULL)
      `),
      safeQuery("SELECT SUM(balance_amount) as total FROM installments WHERE status IN ('รอชำระ', 'ค้างชำระ')"),
      safeQuery(`SELECT SUM(paid_amount) as total FROM installments WHERE status IN ('ชำระแล้ว', 'ชำระบางส่วน') AND ${q_installments.sql}`, q_installments.params),
      safeQuery("SELECT COUNT(DISTINCT IFNULL(pm.policy_id, pm.non_motor_policy_id)) as count FROM installments i JOIN payments pm ON i.payment_id = pm.id WHERE i.status = 'ค้างชำระ' OR (i.status = 'รอชำระ' AND i.due_date < CURRENT_DATE())"),
      safeQuery(`
        SELECT i.*, IFNULL(p.policy_no, np.policy_no) as policy_no, c.first_name, c.last_name, c.phone
        FROM installments i 
        JOIN payments pm ON i.payment_id = pm.id 
        LEFT JOIN policies p ON pm.policy_id = p.id
        LEFT JOIN non_motor_policies np ON pm.non_motor_policy_id = np.id
        JOIN customers c ON (p.customer_id = c.id OR np.customer_id = c.id)
        WHERE i.status = 'รอชำระ' AND i.due_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
        ORDER BY i.due_date ASC
      `),
      
      safeQuery(`
        SELECT 
          c.first_name, c.last_name, c.phone,
          p.policy_no, p.start_date, p.expiry_date, p.created_at, p.total_premium, 'Motor' as policy_type
        FROM policies p JOIN customers c ON p.customer_id = c.id 
        WHERE ${q_monthlyCustomers_m.sql} AND p.status IN ('สำเร็จ', 'ชำระครบแล้ว')
        UNION ALL
        SELECT 
          c.first_name, c.last_name, c.phone,
          np.policy_no, np.start_date, np.expiry_date, np.created_at, np.total_premium, 'Non-Motor' as policy_type
        FROM non_motor_policies np JOIN customers c ON np.customer_id = c.id 
        WHERE ${q_monthlyCustomers_nm.sql} AND np.status IN ('สำเร็จ', 'ชำระครบแล้ว')
        ORDER BY start_date DESC
      `, [...q_monthlyCustomers_m.params, ...q_monthlyCustomers_nm.params]),
      
      safeQuery(`
        SELECT company, SUM(total_premium) as total_sales, COUNT(*) as policy_count 
        FROM policies 
        WHERE status = 'สำเร็จ' AND YEAR(start_date) = ?
        GROUP BY company 
        ORDER BY total_sales DESC 
        LIMIT 10
      `, [targetYear]),
      
      safeQuery(`
        SELECT u.name, SUM(p.total_premium) as total_sales, COUNT(p.id) as policy_count 
        FROM policies p
        JOIN users u ON p.sales_person_id = u.id
        WHERE p.status = 'สำเร็จ' AND YEAR(p.start_date) = ?
        GROUP BY u.id, u.name 
        ORDER BY total_sales DESC 
        LIMIT 10
      `, [targetYear]),
      
      safeQuery(`
        SELECT 
          COUNT(*) as total_scans,
          SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as successful_scans,
          SUM(CASE WHEN has_warning = 1 THEN 1 ELSE 0 END) as warning_scans,
          AVG(processing_time_ms) as avg_processing_time
        FROM ai_usage_logs
        WHERE ${q_aiStats.sql}
      `, q_aiStats.params),
      
      safeQuery(`
        SELECT document_type, COUNT(*) as count 
        FROM ai_usage_logs 
        WHERE ${q_aiDocTypes.sql} AND is_success = 1
        GROUP BY document_type
      `, q_aiDocTypes.params),

      safeQuery(`
        SELECT discrepancies 
        FROM ai_correction_logs 
        WHERE ${q_aiCorrections.sql}
      `, q_aiCorrections.params)
    ];

    const [
      customers, mPolicies, mSalesThisMonth, mSalesThisYear, mCommThisMonth, mExpiringPolicies, mMonthlySales,
      nmPolicies, nmSalesThisMonth, nmSalesThisYear, nmCommThisMonth, nmExpiringPolicies, nmMonthlySales,
      documents, newCustomers,
      cashRes, instRes, unpaidRes, collectedRes, overdueCustRes, upcomingInstallments,
      monthlyCustomers, topCompanies, topSales,
      aiStatsRes, aiDocTypesRes, aiCorrectionsRes
    ] = await Promise.all(queries);

    let cashSalesTotal = parseFloat(cashRes?.[0]?.total) || 0;
    let installmentSalesTotal = parseFloat(instRes?.[0]?.total) || 0;
    let unpaidInstallmentTotal = parseFloat(unpaidRes?.[0]?.total) || 0;
    let collectedThisMonth = parseFloat(collectedRes?.[0]?.total) || 0;
    let overdueCustomersCount = overdueCustRes?.[0]?.count || 0;

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

    res.json({
      totalCustomers: customers[0].count,
      totalPolicies: mPolicies[0].count,
      totalNonMotorPolicies: nmPolicies[0].count,
      totalDocuments: documents[0].count,
      newCustomersThisMonth: newCustomers[0].count,
      salesThisMonth: parseFloat(mSalesThisMonth[0].total) || 0,
      salesThisYear: parseFloat(mSalesThisYear[0].total) || 0,
      commThisMonth: parseFloat(mCommThisMonth[0].total) || 0,
      nmSalesThisMonth: parseFloat(nmSalesThisMonth[0].total) || 0,
      nmSalesThisYear: parseFloat(nmSalesThisYear[0].total) || 0,
      nmCommThisMonth: parseFloat(nmCommThisMonth[0].total) || 0,
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
      selectedYear: targetYear,
      aiStats: aiStatsRes[0] || { total_scans: 0, successful_scans: 0, warning_scans: 0, avg_processing_time: 0 },
      aiDocTypes: aiDocTypesRes || [],
      aiCorrectionStats: (() => {
        const fieldCorrections = {};
        let totalCorrectionsCount = 0;
        const correctionScansCount = aiCorrectionsRes ? aiCorrectionsRes.length : 0;

        if (aiCorrectionsRes && aiCorrectionsRes.length > 0) {
          aiCorrectionsRes.forEach(row => {
            let list = [];
            try {
              list = typeof row.discrepancies === 'string' ? JSON.parse(row.discrepancies) : row.discrepancies;
            } catch (e) {
              list = [];
            }
            if (Array.isArray(list)) {
              list.forEach(item => {
                const key = `${item.section}.${item.field}`;
                fieldCorrections[key] = (fieldCorrections[key] || 0) + 1;
                totalCorrectionsCount++;
              });
            }
          });
        }

        return {
          total_corrections: totalCorrectionsCount,
          correction_scans: correctionScansCount,
          field_corrections: fieldCorrections
        };
      })()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

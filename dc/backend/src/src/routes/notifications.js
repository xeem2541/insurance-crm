const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = {
      overdue: [],
      upcoming: [],
      expiring: []
    };

    // 1. Overdue Installments
    try {
      const [overdue] = await req.db.query(`
        SELECT i.id, i.installment_no, i.amount, i.due_date, IFNULL(pol.policy_no, npol.policy_no) as policy_no, c.first_name, c.last_name 
        FROM installments i
        JOIN payments p ON i.payment_id = p.id
        LEFT JOIN policies pol ON p.policy_id = pol.id
        LEFT JOIN non_motor_policies npol ON p.non_motor_policy_id = npol.id
        JOIN customers c ON (c.id = pol.customer_id OR c.id = npol.customer_id)
        WHERE i.status = 'ค้างชำระ' OR (i.status IN ('รอชำระ', 'ชำระบางส่วน') AND i.due_date < CURRENT_DATE())
        ORDER BY i.due_date ASC
      `);
      notifications.overdue = overdue;
    } catch (e) {
      console.log('Error fetching overdue notifications:', e.message);
    }

    // 2. Upcoming Installments (Next 3 days)
    try {
      const [upcoming] = await req.db.query(`
        SELECT i.id, i.installment_no, i.amount, i.due_date, IFNULL(pol.policy_no, npol.policy_no) as policy_no, c.first_name, c.last_name 
        FROM installments i
        JOIN payments p ON i.payment_id = p.id
        LEFT JOIN policies pol ON p.policy_id = pol.id
        LEFT JOIN non_motor_policies npol ON p.non_motor_policy_id = npol.id
        JOIN customers c ON (c.id = pol.customer_id OR c.id = npol.customer_id)
        WHERE i.status IN ('รอชำระ', 'ชำระบางส่วน') AND i.due_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY)
        ORDER BY i.due_date ASC
      `);
      notifications.upcoming = upcoming;
    } catch (e) {
      console.log('Error fetching upcoming notifications:', e.message);
    }

    // 3. Expiring Policies (Next 30 days)
    try {
      const [expiring] = await req.db.query(`
        SELECT p.id, p.policy_no, c.first_name, c.last_name, 'Motor' as category, p.expiry_date, DATEDIFF(p.expiry_date, CURRENT_DATE()) as days_left
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.status = 'สำเร็จ' AND p.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)
        
        UNION ALL
        
        SELECT np.id, np.policy_no, c.first_name, c.last_name, 'Non-Motor' as category, np.expiry_date, DATEDIFF(np.expiry_date, CURRENT_DATE()) as days_left
        FROM non_motor_policies np
        JOIN customers c ON np.customer_id = c.id
        WHERE np.status = 'สำเร็จ' AND np.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)
        
        ORDER BY days_left ASC
      `);
      notifications.expiring = expiring;
    } catch (e) {
      console.log('Error fetching expiring policies:', e.message);
    }

    // Add total count
    notifications.total = notifications.overdue.length + notifications.upcoming.length + notifications.expiring.length;

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

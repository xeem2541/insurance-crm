const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all payments with policy and customer details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.payment_method, p.installments, p.pay_date, p.status, p.created_at,
        IFNULL(pol.policy_no, npol.policy_no) as policy_no,
        IFNULL(pol.total_premium, npol.total_premium) as total_premium,
        IFNULL(pol.company, npol.company) as company,
        c.first_name, c.last_name, c.phone, c.customer_code
      FROM payments p
      LEFT JOIN policies pol ON p.policy_id = pol.id
      LEFT JOIN non_motor_policies npol ON p.non_motor_policy_id = npol.id
      LEFT JOIN customers c ON c.id = pol.customer_id OR c.id = npol.customer_id
      ORDER BY p.created_at DESC
    `;
    const [rows] = await req.db.query(query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get installments for a specific payment
router.get('/:id/installments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT * FROM installments WHERE payment_id = ? ORDER BY installment_no ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark an installment as paid
router.put('/installments/:id', authenticateToken, async (req, res) => {
  const connection = await req.db.getConnection();
  await connection.beginTransaction();
  
  try {
    const installmentId = req.params.id;
    const { paid_amount, payment_date } = req.body;
    
    // Get current installment details
    const [insts] = await connection.query('SELECT * FROM installments WHERE id = ?', [installmentId]);
    if (insts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Installment not found' });
    }
    
    const installment = insts[0];
    const incomingPaidAmount = parseFloat(paid_amount) || 0;
    
    // Accumulate total paid
    const currentPaidAmount = parseFloat(installment.paid_amount) || 0;
    const newTotalPaidAmount = currentPaidAmount + incomingPaidAmount;
    
    // Calculate new balance
    const totalAmount = parseFloat(installment.amount) || 0;
    let newBalanceAmount = totalAmount - newTotalPaidAmount;
    if (newBalanceAmount < 0) newBalanceAmount = 0;
    
    // Determine status
    let newStatus = 'ชำระบางส่วน';
    if (newBalanceAmount <= 0) {
      newStatus = 'ชำระแล้ว';
    }

    const payDate = payment_date || new Date().toISOString().split('T')[0];
    
    await connection.query(
      'UPDATE installments SET paid_amount = ?, balance_amount = ?, status = ?, payment_date = ? WHERE id = ?',
      [newTotalPaidAmount, newBalanceAmount, newStatus, payDate, installmentId]
    );
    
    // Check if all installments for this payment are now paid
    const paymentId = installment.payment_id;
    const [allInsts] = await connection.query('SELECT status FROM installments WHERE payment_id = ?', [paymentId]);
    
    const allPaid = allInsts.every(i => i.status === 'ชำระแล้ว');
    if (allPaid) {
      await connection.query('UPDATE payments SET status = "ชำระครบแล้ว" WHERE id = ?', [paymentId]);
      
      // We might also want to update the actual policy status if we are tracking it there
    } else {
      await connection.query('UPDATE payments SET status = "กำลังผ่อนชำระ" WHERE id = ?', [paymentId]);
    }
    
    await connection.commit();
    res.json({ message: 'บันทึกการรับชำระเงินสำเร็จ' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Mark a cash payment as paid
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, pay_date } = req.body;
    const qStatus = status || 'ชำระครบแล้ว';
    const qDate = pay_date || new Date().toISOString().split('T')[0];
    
    await req.db.query('UPDATE payments SET status = ?, pay_date = ? WHERE id = ?', [qStatus, qDate, req.params.id]);
    res.json({ message: 'อัปเดตสถานะการชำระเงินสดสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a payment
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await req.db.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบรายการชำระเงินสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

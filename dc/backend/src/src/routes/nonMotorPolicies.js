const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all non-motor policies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = `
      SELECT p.*, 
             c.first_name, c.last_name, c.customer_code, c.phone,
             t.name as type_name,
             u.name as sales_person_name
      FROM non_motor_policies p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN non_motor_types t ON p.non_motor_type_id = t.id
      LEFT JOIN users u ON p.sales_person_id = u.id
      WHERE (c.first_name LIKE ? OR c.last_name LIKE ? OR p.policy_no LIKE ?)
    `;

    // Filter by sales person if the user is Sales
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];
    if (req.user.role === 'Sales') {
      query += ` AND p.sales_person_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY p.created_at DESC`;
    
    const [rows] = await req.db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch non-motor policies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get non-motor types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM non_motor_types WHERE is_active = TRUE ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch non-motor types error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create non-motor policy
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      customer_id, policy_no, company, non_motor_type_id, insured_name,
      sum_insured, net_premium, stamp_duty, vat, total_premium,
      commission_percent, commission_baht, start_date, expiry_date,
      status, note, additional_data, sales_person_id
    } = req.body;

    const query = `
      INSERT INTO non_motor_policies (
        customer_id, policy_no, company, non_motor_type_id, insured_name,
        sum_insured, net_premium, stamp_duty, vat, total_premium,
        commission_percent, commission_baht, start_date, expiry_date,
        status, note, additional_data, created_by, sales_person_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert additional_data to JSON string
    const addDataJson = additional_data ? JSON.stringify(additional_data) : null;

    const [result] = await req.db.query(query, [
      customer_id, policy_no, company, non_motor_type_id, insured_name,
      sum_insured || 0, net_premium || 0, stamp_duty || 0, vat || 0, total_premium || 0,
      commission_percent || 0, commission_baht || 0, start_date, expiry_date,
      status || 'รอดำเนินการ', note, addDataJson, req.user.id, sales_person_id || req.user.id
    ]);

    res.status(201).json({ id: result.insertId, message: 'Policy created successfully' });
  } catch (error) {
    console.error('Create non-motor policy error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'เลขกรมธรรม์นี้มีในระบบแล้ว' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update non-motor policy
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, policy_no, company, non_motor_type_id, insured_name,
      sum_insured, net_premium, stamp_duty, vat, total_premium,
      commission_percent, commission_baht, start_date, expiry_date,
      status, note, additional_data, sales_person_id
    } = req.body;

    const query = `
      UPDATE non_motor_policies SET 
        customer_id=?, policy_no=?, company=?, non_motor_type_id=?, insured_name=?,
        sum_insured=?, net_premium=?, stamp_duty=?, vat=?, total_premium=?,
        commission_percent=?, commission_baht=?, start_date=?, expiry_date=?,
        status=?, note=?, additional_data=?, sales_person_id=?
      WHERE id = ?
    `;

    const addDataJson = additional_data ? JSON.stringify(additional_data) : null;

    await req.db.query(query, [
      customer_id, policy_no, company, non_motor_type_id, insured_name,
      sum_insured || 0, net_premium || 0, stamp_duty || 0, vat || 0, total_premium || 0,
      commission_percent || 0, commission_baht || 0, start_date, expiry_date,
      status || 'รอดำเนินการ', note, addDataJson, sales_person_id || req.user.id,
      id
    ]);

    res.json({ message: 'Policy updated successfully' });
  } catch (error) {
    console.error('Update non-motor policy error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'เลขกรมธรรม์นี้มีในระบบแล้ว' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

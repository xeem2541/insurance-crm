const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

// Get all customers with search and month filter
router.get('/', authenticateToken, async (req, res) => {
  const { search, month } = req.query;
  
  let query = `
    SELECT c.*, 
      (SELECT v.plate_no FROM vehicles v WHERE v.customer_id = c.id ORDER BY v.created_at DESC LIMIT 1) as plate_no,
      (SELECT CONCAT(p.company, ' - ', p.type) FROM policies p WHERE p.customer_id = c.id ORDER BY p.created_at DESC LIMIT 1) as motor_type,
      (SELECT CONCAT(np.company, ' - ', t.name) FROM non_motor_policies np JOIN non_motor_types t ON np.non_motor_type_id = t.id WHERE np.customer_id = c.id ORDER BY np.created_at DESC LIMIT 1) as non_motor_type
    FROM customers c 
  `;
  
  let conditions = [];
  let params = [];
  
  if (search) {
    conditions.push(`(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)`);
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }
  
  if (month) {
    conditions.push(`DATE_FORMAT(c.created_at, '%Y-%m') = ?`);
    params.push(month);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }
  
  query += ` ORDER BY c.created_at DESC`;

  try {
    const [customers] = await req.db.query(query, params);
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [customers] = await req.db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(customers[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', authenticateToken, async (req, res) => {
  const { 
    customer_code, prefix, first_name, last_name, phone, line_id, facebook, 
    dob, age, address, province, zipcode, secondary_contact, 
    customer_status, lead_status, source, note 
  } = req.body;
  
  try {
    const dummyIdCard = 'D' + Date.now();
    const [result] = await req.db.query(
      `INSERT INTO customers (
        customer_code, prefix, first_name, last_name, phone, alt_phone, line_id, facebook, 
        dob, age, address, province, zipcode, secondary_contact, 
        customer_status, lead_status, source, note, created_by, id_card_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_code, prefix, first_name, last_name, phone, req.body.alt_phone || null, line_id, facebook, 
        dob || null, age || null, address, province, zipcode, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.user.id, dummyIdCard
      ]
    );
    
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'customers', result.insertId, `Created customer ${customer_code}`]);

    res.status(201).json({ id: result.insertId, message: 'Customer created successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Customer code or ID card already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, async (req, res) => {
  const { 
    prefix, first_name, last_name, phone, line_id, facebook, 
    dob, age, address, province, zipcode, secondary_contact, 
    customer_status, lead_status, source, note 
  } = req.body;
  
  try {
    await req.db.query(
      `UPDATE customers SET 
        prefix=?, first_name=?, last_name=?, phone=?, alt_phone=?, line_id=?, facebook=?, 
        dob=?, age=?, address=?, province=?, zipcode=?, secondary_contact=?, 
        customer_status=?, lead_status=?, source=?, note=? 
       WHERE id=?`,
      [
        prefix, first_name, last_name, phone, req.body.alt_phone || null, line_id, facebook, 
        dob || null, age || null, address, province, zipcode, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.params.id
      ]
    );

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'customers', req.params.id, `Updated customer ID ${req.params.id}`]);

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'ID card already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

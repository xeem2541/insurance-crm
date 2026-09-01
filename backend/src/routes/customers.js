const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');

// Get all customers with search, month filter, and pagination
router.get('/', authenticateToken, async (req, res) => {
  const { search, month, page, limit } = req.query;
  
  // Pagination parameters
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 50;
  const offset = (currentPage - 1) * itemsPerPage;
  
  let conditions = [];
  let params = [];
  
  if (search) {
    const searchParam = `%${search}%`;
    const cleanSearch = `%${search.replace(/[\s-]/g, '')}%`;
    conditions.push(`(
      c.first_name LIKE ? OR 
      c.last_name LIKE ? OR 
      CONCAT(IFNULL(c.prefix, ''), IFNULL(c.first_name, ''), ' ', IFNULL(c.last_name, '')) LIKE ? OR
      CONCAT(IFNULL(c.first_name, ''), ' ', IFNULL(c.last_name, '')) LIKE ? OR
      c.phone LIKE ? OR 
      c.customer_code LIKE ? OR 
      c.id_card_no LIKE ? OR 
      EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.customer_id = c.id 
          AND (
            REPLACE(REPLACE(v.plate_no, ' ', ''), '-', '') LIKE ? OR 
            REPLACE(REPLACE(v.vin, ' ', ''), '-', '') LIKE ? OR 
            REPLACE(REPLACE(v.engine_no, ' ', ''), '-', '') LIKE ?
          )
      )
    )`);
    params.push(
      searchParam, searchParam, searchParam, searchParam, 
      searchParam, searchParam, searchParam, 
      cleanSearch, cleanSearch, cleanSearch
    );
  }
  
  if (month) {
    conditions.push(`DATE_FORMAT(c.created_at, '%Y-%m') = ?`);
    params.push(month);
  }
  
  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = ` WHERE ` + conditions.join(' AND ');
  }

  try {
    // 1. Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM customers c ${whereClause}`;
    const [countResult] = await req.db.query(countQuery, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / itemsPerPage);

    // 2. Get data
    const query = `
      SELECT c.*, 
        (SELECT v.plate_no FROM vehicles v WHERE v.customer_id = c.id ORDER BY v.created_at DESC LIMIT 1) as plate_no,
        (SELECT CONCAT(p.company, ' - ', p.type) FROM policies p WHERE p.customer_id = c.id ORDER BY p.created_at DESC LIMIT 1) as motor_type,
        (SELECT CONCAT(np.company, ' - ', t.name) FROM non_motor_policies np JOIN non_motor_types t ON np.non_motor_type_id = t.id WHERE np.customer_id = c.id ORDER BY np.created_at DESC LIMIT 1) as non_motor_type
      FROM customers c 
      ${whereClause} 
      ORDER BY c.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    // Add limit and offset to params
    const queryParams = [...params, itemsPerPage, offset];
    const [customers] = await req.db.query(query, queryParams);
    
    res.json({
      data: customers,
      total,
      totalPages,
      currentPage,
      itemsPerPage
    });
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
router.post('/', authenticateToken, [
  body('first_name').notEmpty().withMessage('กรุณาระบุชื่อจริง').trim(),
  body('phone').notEmpty().withMessage('กรุณาระบุเบอร์โทรศัพท์').trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง', details: errors.array() });
  }

  const { 
    customer_code, prefix, first_name, last_name, phone, line_id, facebook, 
    dob, age, address, province, zipcode, secondary_contact, 
    customer_status, lead_status, source, note, id_card_no
  } = req.body;
  
  try {
    const [result] = await req.db.query(
      `INSERT INTO customers (
        customer_code, prefix, first_name, last_name, phone, alt_phone, line_id, facebook, 
        dob, age, id_card_no, address, province, zipcode, secondary_contact, 
        customer_status, lead_status, source, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_code, prefix, first_name, last_name, phone, req.body.alt_phone || null, line_id, facebook, 
        dob || null, age || null, id_card_no || null, address, province, zipcode, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.user.id
      ]
    );
    
    try {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req.db, req, {
        action: 'CREATE_CUSTOMER',
        entity_type: 'customer',
        entity_id: result.insertId,
        description: `เพิ่มลูกค้าใหม่ [${customer_code}] ${prefix || ''}${first_name} ${last_name || ''} (เบอร์: ${phone || '-'})`
      });
    } catch (e) {}

    res.status(201).json({ id: result.insertId, message: 'Customer created successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'รหัสลูกค้านี้มีในระบบแล้ว' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticateToken, [
  body('first_name').notEmpty().withMessage('กรุณาระบุชื่อจริง').trim(),
  body('phone').notEmpty().withMessage('กรุณาระบุเบอร์โทรศัพท์').trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง', details: errors.array() });
  }

  const { 
    prefix, first_name, last_name, phone, line_id, facebook, 
    dob, age, address, province, zipcode, secondary_contact, 
    customer_status, lead_status, source, note, id_card_no
  } = req.body;
  
  try {
    await req.db.query(
      `UPDATE customers SET 
        prefix=?, first_name=?, last_name=?, phone=?, alt_phone=?, line_id=?, facebook=?, 
        dob=?, age=?, id_card_no=?, address=?, province=?, zipcode=?, secondary_contact=?, 
        customer_status=?, lead_status=?, source=?, note=? 
       WHERE id=?`,
      [
        prefix, first_name, last_name, phone, req.body.alt_phone || null, line_id, facebook, 
        dob || null, age || null, id_card_no || null, address, province, zipcode, secondary_contact, 
        customer_status || 'ลูกค้าใหม่', lead_status || 'สนใจ', source, note, req.params.id
      ]
    );

    try {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req.db, req, {
        action: 'UPDATE_CUSTOMER',
        entity_type: 'customer',
        entity_id: req.params.id,
        description: `แก้ไขข้อมูลลูกค้า ID [${req.params.id}]: ${prefix || ''}${first_name} ${last_name || ''}`
      });
    } catch (e) {}

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'ID card already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await req.db.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    try {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req.db, req, {
        action: 'DELETE_CUSTOMER',
        entity_type: 'customer',
        entity_id: req.params.id,
        description: `ลบข้อมูลลูกค้า ID [${req.params.id}] ออกจากระบบ`
      });
    } catch (e) {}
      
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ error: 'ไม่สามารถลบได้เนื่องจากลูกค้าคนนี้มีข้อมูลกรมธรรม์หรือรถยนต์ผูกอยู่' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

module.exports = router;

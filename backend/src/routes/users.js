const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middlewares/auth');

const catchAsync = require('../utils/catchAsync');

// Get all users (Admin only)
router.get('/', authenticateToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  const [users] = await req.db.query('SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 500');
  res.json(users);
}));

// Create new user (Admin only)
router.post('/', authenticateToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  const { username, password, name, role } = req.body;
  
  // Check if username already exists
  const [existing] = await req.db.query('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้งาน (Username) นี้ถูกใช้ไปแล้ว' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await req.db.query(
    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, name, role || 'Sales']
  );
  res.status(201).json({ message: 'สร้างผู้ใช้งานสำเร็จ' });
}));

// Update user (Admin only)
router.put('/:id', authenticateToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  const { name, role, password } = req.body;
  
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await req.db.query(
      'UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?',
      [name, role, hashedPassword, req.params.id]
    );
  } else {
    await req.db.query(
      'UPDATE users SET name = ?, role = ? WHERE id = ?',
      [name, role, req.params.id]
    );
  }
  res.json({ message: 'อัปเดตผู้ใช้งานสำเร็จ' });
}));

// Delete user (Admin only)
router.delete('/:id', authenticateToken, catchAsync(async (req, res) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Forbidden' });
  
  // Prevent deleting oneself
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  }
  
  try {
    await req.db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (error) {
    // Catch specifically for foreign key constraints, pass others to global error handler
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'ไม่สามารถลบได้เนื่องจากผู้ใช้นี้เชื่อมโยงกับข้อมูลลูกค้าหรือกรมธรรม์' });
    }
    throw error;
  }
}));

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { error: 'เข้าสู่ระบบผิดพลาดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await req.db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Check if secret is the default fallback, issue a warning in logs
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment variables! Using default fallback.');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      secret || 'super_secret_key_123',
      { expiresIn: '1d' }
    );

    // Record Login Activity
    try {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req.db, {
        user: { id: user.id, name: user.name, role: user.role },
        headers: req.headers,
        socket: req.socket
      }, {
        action: 'LOGIN',
        entity_type: 'auth',
        entity_id: user.id,
        description: `ผู้ใช้งาน ${user.name} (${user.role}) เข้าสู่ระบบสำเร็จ`
      });
    } catch (e) {}

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Employee Registration Endpoint (Admin Only)
router.post('/register', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  const { username, password, name, role, email, phone } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ-นามสกุล, ชื่อผู้ใช้, รหัสผ่าน)' });
  }

  try {
    const cleanUsername = username.trim();
    const [existing] = await req.db.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้งาน (Username) นี้ถูกใช้ไปแล้ว กรุณาเลือกชื่อผู้ใช้งานอื่น' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role || 'Staff';

    const [result] = await req.db.query(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      [cleanUsername, hashedPassword, name.trim(), assignedRole]
    );

    // Record Register Activity
    try {
      const { logActivity } = require('../utils/activityLogger');
      await logActivity(req.db, {
        user: { id: result.insertId, name: name.trim(), role: assignedRole },
        headers: req.headers,
        socket: req.socket
      }, {
        action: 'REGISTER',
        entity_type: 'users',
        entity_id: result.insertId,
        description: `พนักงานใหม่ ${name.trim()} (@${cleanUsername} - ${assignedRole}) สมัครสมาชิกสำเร็จ`
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนพนักงานสำเร็จเรียบร้อย! สามารถเข้าสู่ระบบได้ทันที',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.query('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [users] = await req.db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = users[0];
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    await req.db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

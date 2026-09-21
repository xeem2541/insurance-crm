const express = require('express');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } = require('../utils/jwt');
const catchAsync = require('../utils/catchAsync');
const { body, validationResult } = require('express-validator');

// Validation middleware generator
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({ error: errors.array()[0].msg });
  };
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate([
  body('username').notEmpty().withMessage('กรุณากรอกชื่อผู้ใช้ (Username)'),
  body('password').notEmpty().withMessage('กรุณากรอกรหัสผ่าน (Password)'),
]), catchAsync(async (req, res) => {
  const { username, password } = req.body;
  
  const [users] = await req.db.query('SELECT * FROM users WHERE username = ?', [username]);
  if (users.length === 0) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  const user = users[0];
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }

  const token = generateAccessToken(user);
  const { token: refreshToken } = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

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
}));

// Employee Registration Endpoint (Admin Only)
router.post('/register', authenticateToken, authorizeRole(['Admin']), validate([
  body('username').notEmpty().withMessage('กรุณากรอกชื่อผู้ใช้งาน'),
  body('password').notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
    .isLength({ min: 8 }).withMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
    .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อย 1 ตัว'),
  body('name').notEmpty().withMessage('กรุณากรอกชื่อ-นามสกุล'),
]), catchAsync(async (req, res) => {
  const { username, password, name, role } = req.body;
  
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
}));

router.get('/me', authenticateToken, catchAsync(async (req, res) => {
  const [users] = await req.db.query('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(users[0]);
}));

router.put('/change-password', authenticateToken, validate([
  body('currentPassword').notEmpty().withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),
  body('newPassword').notEmpty().withMessage('กรุณากรอกรหัสผ่านใหม่')
    .isLength({ min: 8 }).withMessage('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร')
    .matches(/(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('รหัสผ่านใหม่ต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อย 1 ตัว'),
]), catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
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
}));

router.post('/refresh', catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ error: 'Token has been revoked or is invalid. Please login again.' });
    }

    const [users] = await req.db.query('SELECT id, username, name, role FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(403).json({ error: 'User no longer exists' });
    }

    const user = users[0];
    
    // Sign new access token
    const token = generateAccessToken(user);
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } catch (error) {
    // Refresh token invalid or expired
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
}));

router.post('/logout', (req, res) => {
  // C-09: Blacklist the refresh token's jti so it can't be reused even if stolen
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken); // decode without verify (we're revoking it anyway)
      if (decoded?.jti) {
        revokeRefreshToken(decoded.jti, decoded.exp);
      }
    } catch (e) {
      // Malformed token — ignore
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

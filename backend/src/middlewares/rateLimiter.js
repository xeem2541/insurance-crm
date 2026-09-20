const rateLimit = require('express-rate-limit');

// Global Rate Limiter for general API endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Limiter for sensitive endpoints like file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 uploads per 15 minutes per IP
  message: { error: 'อัปโหลดไฟล์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่ (Too many upload requests)' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for resource-intensive operations like creating policies
const policyActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 policies created/issued per 15 mins per IP
  message: { error: 'ทำรายการบ่อยเกินไป กรุณารอสักครู่ (Too many policy actions)' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  uploadLimiter,
  policyActionLimiter
};

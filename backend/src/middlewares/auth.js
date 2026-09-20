const { verifyAccessToken } = require('../utils/jwt');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // W-01 fix: Do NOT accept token from query string (logs/history exposure)
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const user = verifyAccessToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  req.user = user;
  next();
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. No user session.' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    const allowed = roles.map(r => r.toLowerCase());
    if (userRole === 'admin' || allowed.includes(userRole) || allowed.includes('*')) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
  };
};

module.exports = { authenticateToken, authorizeRole };

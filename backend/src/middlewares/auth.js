const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_123', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
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

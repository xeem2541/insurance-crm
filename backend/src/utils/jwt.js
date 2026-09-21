const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// C-09: In-Memory Refresh Token Blacklist (stores jti/fingerprint, not full token)
// On serverless, this resets per instance — acceptable trade-off vs. full DB blacklist
// For multi-instance deployments, replace with Redis/DB-backed store
const revokedTokens = new Map(); // jti -> expiry timestamp

// Prune expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedTokens.entries()) {
    if (exp < now) revokedTokens.delete(jti);
  }
}, 10 * 60 * 1000);

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[SECURITY FATAL] JWT_SECRET is not set in environment variables! Cannot sign/verify token.');
    throw new Error('Server error: Missing security configuration');
  }
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    console.warn('[SECURITY] JWT_REFRESH_SECRET is not set. Set it separately from JWT_SECRET for better security.');
    return getAccessSecret();
  }
  return secret;
};

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    getAccessSecret(),
    { expiresIn: '8h' }
  );
};

/**
 * Generate a long-lived refresh token with a unique jti
 */
const generateRefreshToken = (user) => {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    { id: user.id, username: user.username, jti },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
  return { token, jti };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getAccessSecret());
  } catch (err) {
    return null;
  }
};

/**
 * Verify refresh token, taking blacklist into account
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, getRefreshSecret());
    if (isTokenRevoked(decoded.jti)) {
      return null;
    }
    return decoded;
  } catch (err) {
    return null;
  }
};

/**
 * Revoke a refresh token (Add jti to blacklist)
 */
const revokeRefreshToken = (jti, exp) => {
  if (jti && exp) {
    revokedTokens.set(jti, exp * 1000); // JWT exp is in seconds, Map needs milliseconds
  }
};

/**
 * Check if a token jti is in the blacklist
 */
const isTokenRevoked = (jti) => {
  if (!jti) return false;
  const exp = revokedTokens.get(jti);
  if (exp && exp > Date.now()) {
    return true; // Token is revoked and its original expiry hasn't passed yet
  }
  return false;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isTokenRevoked
};

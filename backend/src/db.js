const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool configuration
const poolConfig = {
  uri: process.env.DB_URI ? process.env.DB_URI : undefined,
  host: process.env.DB_URI ? undefined : (process.env.DB_HOST || 'localhost'),
  user: process.env.DB_URI ? undefined : (process.env.DB_USER || 'app_user'),
  password: process.env.DB_URI ? undefined : (process.env.DB_PASSWORD || 'app_password'),
  database: process.env.DB_URI ? undefined : (process.env.DB_NAME || 'insurance_db'),
  port: process.env.DB_URI ? undefined : (process.env.DB_PORT || 3306),
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  dateStrings: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 seconds keepalive probe
  connectTimeout: 30000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
};

// Create the shared connection pool
let pool = mysql.createPool(poolConfig);

// Real-time status tracking
const dbStatus = {
  isConnected: false,
  lastPingTime: null,
  pingLatencyMs: 0,
  totalPings: 0,
  failedPings: 0,
  reconnectCount: 0,
  startedAt: new Date().toISOString(),
  lastError: null
};

// Heartbeat ping function (SELECT 1)
async function pingDatabase() {
  const startTime = Date.now();
  try {
    const [rows] = await pool.query('SELECT 1 AS heartbeat');
    const latency = Date.now() - startTime;
    dbStatus.isConnected = true;
    dbStatus.lastPingTime = new Date().toISOString();
    dbStatus.pingLatencyMs = latency;
    dbStatus.totalPings++;
    dbStatus.lastError = null;
    return { success: true, latency };
  } catch (error) {
    dbStatus.isConnected = false;
    dbStatus.failedPings++;
    dbStatus.lastError = error.message;
    console.warn(`[DB Keep-Alive] Ping failed (${error.code || error.message}). Attempting recovery...`);
    
    // Check if error is a connection loss error, try pool recreate if critical
    if (['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ER_NET_PACKETS_OUT_OF_ORDER'].includes(error.code)) {
      try {
        dbStatus.reconnectCount++;
        console.log('[DB Keep-Alive] Reconnecting pool...');
        pool = mysql.createPool(poolConfig);
        await pool.query('SELECT 1');
        dbStatus.isConnected = true;
        console.log('[DB Keep-Alive] Successfully reconnected to database!');
      } catch (recErr) {
        console.error('[DB Keep-Alive] Reconnection attempt failed:', recErr.message);
      }
    }
    return { success: false, error: error.message };
  }
}

// Active Heartbeat: Ping every 25 seconds to keep TCP connection & TiDB Cloud active 24/7
const HEARTBEAT_INTERVAL_MS = 25000;
let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;
  console.log('[DB Keep-Alive] ระบบรักษาการเชื่อมต่อฐานข้อมูลตลอดเวลา (Heartbeat Ping ทุก 25 วินาที) เริ่มทำงานแล้ว...');
  // Initial ping
  pingDatabase();
  heartbeatTimer = setInterval(async () => {
    await pingDatabase();
  }, HEARTBEAT_INTERVAL_MS);
}

// Query helper with automatic retry on transient connection drops
async function queryWithRetry(sql, params = [], maxRetries = 2) {
  let attempts = 0;
  while (attempts <= maxRetries) {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      attempts++;
      const isTransient = [
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'ETIMEDOUT',
        'EPIPE',
        'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
        'ER_NET_PACKETS_OUT_OF_ORDER'
      ].includes(error.code);

      if (isTransient && attempts <= maxRetries) {
        console.warn(`[DB Retry] Query failed (${error.code}). Retrying attempt ${attempts}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 500 * attempts));
        continue;
      }
      throw error;
    }
  }
}

// Function to get current DB status
function getDbStatus() {
  return {
    ...dbStatus,
    uptimeSeconds: Math.floor((Date.now() - new Date(dbStatus.startedAt).getTime()) / 1000),
    heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_MS / 1000
  };
}

// Start heartbeat immediately on module load
startHeartbeat();

module.exports = {
  pool,
  get poolInstance() { return pool; },
  pingDatabase,
  queryWithRetry,
  getDbStatus,
  startHeartbeat
};

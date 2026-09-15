const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const { startCronJobs } = require('./cron');
const cron = require('node-cron');
// Vercel doesn't run backups
let runBackup;
if (require.main === module) {
  try {
    runBackup = require('./cron/backup');
  } catch (e) {
    console.log('Backup module not found. Please upload cron/backup.js to enable automated backups.');
  }
}

// Process Crash Prevention (Keeps server alive 24/7 even on unexpected edge cases)
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH PREVENTED] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.disable('etag'); // ป้องกัน Vercel คืนค่า 304 แล้วตัด CORS Header ทิ้ง

// Middleware ป้องกันการ Cache API (แก้ปัญหา Vercel Cache 304)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false, // allow cross-origin images/resources if needed
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xFrameOptions: { action: 'deny' },
}));

// CORS: Allow frontend Vercel URLs + localhost for dev
const allowedOrigins = [
  // Production URLs (set in Vercel env vars)
  process.env.FRONTEND_URL,
  // Known Vercel deployment URLs
  'https://insurance-crm-five-wine.vercel.app',
  'https://insurance-crm-frontend.vercel.app',
  // Localhost for local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

const corsOptions = {
  origin: [
    'https://insurance-crm-five-wine.vercel.app',
    'https://insurance-crm-frontend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200, 
};

app.use(cors(corsOptions));
// Handle OPTIONS preflight for all routes
app.options('*', cors(corsOptions));


const cookieParser = require('cookie-parser');

// Body parsers
app.use(express.json({ limit: '500kb' })); // Limit body size to prevent payload DOS
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());

// Data Sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection pool with 24/7 keepalive & heartbeat
const { pool, getDbStatus, pingDatabase, queryWithRetry } = require('./db');



// Pass pool to request object so routes can use it
app.use((req, res, next) => {
  // Intercept query to use the resilient retry logic automatically
  req.db = new Proxy(pool, {
    get(target, prop) {
      if (prop === 'query') return queryWithRetry;
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  next();
});

if (require.main === module) {
  const { initDb } = require('./initDb');
  initDb();
} else {
  // For Vercel Serverless, we skip the heavy DB migration checks on every cold start
  console.log('Skipping initDb() on Vercel serverless environment');
}

// Root endpoints for uptime monitors & load balancers
app.get('/', async (req, res) => {
  await pingDatabase();
  res.json({
    status: 'ok',
    message: 'Apple Insurance CRM API is running 24/7',
    database: getDbStatus().isConnected ? 'connected' : 'connecting'
  });
});
app.get('/health', async (req, res) => {
  await pingDatabase();
  const status = getDbStatus();
  res.status(status.isConnected ? 200 : 503).json({
    status: status.isConnected ? 'ok' : 'degraded',
    service: 'insurance-crm-api',
    database: status.isConnected ? 'connected' : 'disconnected'
  });
});

// Health check endpoint for external pingers / uptime monitors
app.get('/api/health', async (req, res) => {
  await pingDatabase();
  const status = getDbStatus();
  res.status(status.isConnected ? 200 : 503).json({
    status: status.isConnected ? 'ok' : 'degraded',
    service: 'insurance-crm-api',
    database: status.isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed real-time DB status endpoint
app.get('/api/db-status', (req, res) => {
  res.json({
    ...getDbStatus(),
    serverTime: new Date().toISOString()
  });
});

// Force manual DB ping & refresh
app.post('/api/db-ping', async (req, res) => {
  const result = await pingDatabase();
  res.json(result);
});

// Basic route
app.get('/api', async (req, res) => {
  await pingDatabase();
  res.json({ 
    message: 'Insurance API is running',
    database: getDbStatus().isConnected ? 'connected (24/7 keepalive active)' : 'connecting'
  });
});

// Fix DB route (Manual trigger)
app.get('/api/fix-db', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    let results = [];
    
    // Keep id_card_no, just drop unique index and ensure it exists
    try {
      await connection.query(`ALTER TABLE customers DROP INDEX id_card_no`);
      results.push(`Dropped index id_card_no`);
    } catch (e) {
      results.push(`Index id_card_no error: ${e.message}`);
    }
    try {
      await connection.query(`ALTER TABLE customers ADD COLUMN id_card_no VARCHAR(20) NULL`);
      results.push(`Added column id_card_no`);
    } catch (e) {
      results.push(`Column id_card_no exists or error: ${e.message}`);
    }

    const dropColumns = ['email', 'occupation'];
    for (const col of dropColumns) {
      try {
        await connection.query(`ALTER TABLE customers DROP INDEX ${col}`);
        results.push(`Dropped index ${col}`);
      } catch (e) {
        results.push(`Index ${col} error: ${e.message}`);
      }
      try {
        await connection.query(`ALTER TABLE customers DROP COLUMN ${col}`);
        results.push(`Dropped column ${col}`);
      } catch (e) {
        results.push(`Column ${col} error: ${e.message}`);
      }
    }
    
    // Also drop from update query if exists? No, just the schema is enough.
    res.json({ message: 'Database fix executed!', details: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Safe route loader to prevent crashes if files are missing
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/master-data', require('./routes/masterData'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/non-motor-policies', require('./routes/nonMotorPolicies'));
app.use('/api/issue-policy', require('./routes/issuePolicy'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai-ocr', require('./routes/aiOcr'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/line-admin', require('./routes/lineAdmin'));
app.use('/api/cron', require('./routes/cron'));

// Schedule Automated Backup every 1st day of the month at 01:00 AM (End of month backup)
// Moved to Vercel Cron

// Cloud Server Keep-Alive (Ping self every 4 minutes to prevent cloud hosting from sleeping)
function startServerKeepAlive() {
  const targetUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || 'https://insurance-crm-kpff.onrender.com';
  if (!targetUrl) return;

  const https = require('https');
  const http = require('http');
  
  const pingUrl = targetUrl.endsWith('/api/health') ? targetUrl : `${targetUrl.replace(/\/+$/, '')}/api/health`;
  
  console.log(`[Server Keep-Alive] ตัวป้องกันเซิร์ฟเวอร์หลับเริ่มทำงาน (Ping: ${pingUrl} ทุก 4 นาที)...`);
  
  setInterval(() => {
    const client = pingUrl.startsWith('https') ? https : http;
    client.get(pingUrl, (res) => {
      // res.resume() to consume data and free memory
      res.resume();
    }).on('error', (err) => {
      // Ignore network errors in local dev
    });
  }, 4 * 60 * 1000);
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จักบนเซิร์ฟเวอร์'
  });
});

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Start server keep-alive
    startServerKeepAlive();

    // Start the auto image sync background worker
    try {
      const { startAutoSync } = require('./sync_images');
      startAutoSync(pool);
    } catch (err) {
      console.error('Failed to start auto sync:', err);
    }
  });
}

module.exports = app;

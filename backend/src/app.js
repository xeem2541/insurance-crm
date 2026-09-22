const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { startCronJobs } = require('./cron');
const cron = require('node-cron');
const { authenticateToken, authorizeRole } = require('./middlewares/auth');
const morgan = require('morgan');
const { logger, captureConsole } = require('./utils/logger');

// Capture all console.log/error/warn globally
captureConsole();
// Vercel doesn't run backups
let runBackup;
if (require.main === module) {
  try {
    runBackup = require('./cron/backup');
  } catch (e) {
    console.log('Backup module not found. Please upload cron/backup.js to enable automated backups.');
  }
}

// Process Crash Prevention & Graceful Shutdown
process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err);
  if (logger && logger.error) logger.error(`Uncaught Exception: ${err.message}`);
  // Do not exit process in Vercel to allow function to return 500 properly
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  if (logger && logger.error) logger.error(`Unhandled Rejection: ${reason}`);
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

// CORS: Restrict to configured FRONTEND_URL and local dev if not in production
const allowedOrigins = [
  'https://www.appleinsurance-crm.com',
  'https://appleinsurance-crm.com'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl requests, server-to-server)
    if (!origin) return callback(null, true);
    
    // Strict CORS: Only allow defined origins in production
    if (
      allowedOrigins.indexOf(origin) !== -1 || 
      process.env.NODE_ENV !== 'production' ||
      origin.endsWith('.vercel.app') // Allow Vercel deployments
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api', globalLimiter);

// Request ID injection
const crypto = require('crypto');
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// Request Logging via Morgan (stream to Winston)
// Includes reqId in structured JSON format
morgan.token('reqId', (req) => req.id);
app.use(morgan(':reqId :method :url :status :res[content-length] - :response-time ms', { 
  stream: { 
    write: message => {
      // Winston will parse this as text but structured files will keep JSON structure
      logger.info(message.trim(), { reqId: message.split(' ')[0] });
    }
  } 
}));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection pool with 24/7 keepalive & heartbeat
const { pool, getDbStatus, pingDatabase, queryWithRetry } = require('./db');
const db = pool;



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
  // For Vercel Serverless: run DB migrations on cold start (schema changes only, no seeding)
  const runMigrations = require('./utils/runMigrations');
  runMigrations().catch(err => console.error('[Vercel] Migration error:', err));
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
// Health Check Endpoint for Auto-Recovery / Load Balancers
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'UP', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    if (logger && logger.error) logger.error('Health Check Failed:', error);
    res.status(503).json({ status: 'DOWN', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

const { getSystemHealth, startSystemMonitor } = require('./utils/monitor');

// Health check endpoint for external pingers / uptime monitors (Comprehensive)
app.get('/api/health', async (req, res) => {
  await pingDatabase();
  const dbStatus = getDbStatus();
  const sysHealth = await getSystemHealth();
  
  const isHealthy = dbStatus.isConnected && sysHealth && sysHealth.disk.isHealthy && sysHealth.memory.isHealthy;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'insurance-crm-api',
    database: dbStatus.isConnected ? 'connected' : 'disconnected',
    system: sysHealth,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed real-time DB status endpoint — Admin only
app.get('/api/db-status', authenticateToken, authorizeRole(['Admin']), (req, res) => {
  res.json({
    ...getDbStatus(),
    serverTime: new Date().toISOString()
  });
});

// Force manual DB ping & refresh — Admin only
app.post('/api/db-ping', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
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

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err);
  
  const statusCode = err.statusCode || 500;
  
  // Alert on Critical Errors (Line Notify)
  if (statusCode === 500 && process.env.LINE_NOTIFY_TOKEN) {
    axios.post('https://notify-api.line.me/api/notify', `message=\n🚨 [Production Error] 🚨\nURL: ${req.originalUrl}\nMsg: ${err.message}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.LINE_NOTIFY_TOKEN}`
      }
    }).catch(e => console.error('Failed to send Line Notify:', e.message));
  }

  res.status(statusCode).json({
    status: 'error',
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'เกิดข้อผิดพลาดที่ไม่รู้จักบนเซิร์ฟเวอร์' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Start server keep-alive
    startServerKeepAlive();

    // Start system resource monitoring (Disk/RAM)
    try {
      startSystemMonitor();
    } catch (err) {
      console.error('Failed to start system monitor:', err);
    }

    // Start the auto image sync background worker
    try {
      const { startAutoSync } = require('./sync_images');
      startAutoSync(pool);
    } catch (err) {
      console.error('Failed to start auto sync:', err);
    }

    // Schedule Automated Backup daily at 00:00 (Midnight)
    try {
      const performDatabaseBackup = require('./utils/backup');
      cron.schedule('0 0 * * *', () => {
        console.log('[Cron] Running scheduled database backup...');
        performDatabaseBackup();
      });
      console.log('[Cron] Daily database backup scheduled at 00:00');
    } catch (err) {
      console.error('Failed to schedule backup cron:', err);
    }
  });
}

module.exports = app;

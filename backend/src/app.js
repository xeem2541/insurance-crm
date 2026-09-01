const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const helmet = require('helmet');
const xss = require('xss-clean');
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
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Vercel cron jobs)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain (covers all preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicit whitelist
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS BLOCKED] Origin: ${origin}`);
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};

app.use(cors(corsOptions));
// Handle OPTIONS preflight for all routes
app.options('*', cors(corsOptions));


app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Body parsers
app.use(express.json({ limit: '500kb' })); // Limit body size to prevent payload DOS
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

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
const { pool, getDbStatus, pingDatabase } = require('./db');

// ✅ Migration flag table — แต่ละ ALTER TABLE รันแค่ครั้งเดียว ไม่ซ้ำทุก cold start
async function runMigrationOnce(connection, key, sql) {
  const [rows] = await connection.query('SELECT id FROM schema_migrations WHERE migration_key = ?', [key]);
  if (rows.length > 0) return; // already ran
  try {
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (migration_key) VALUES (?)', [key]);
    console.log(`[Migration] ${key} ✅`);
  } catch (e) {
    // Log error but don't crash — migration might have already been applied manually
    console.warn(`[Migration] ${key} skipped:`, e.message?.substring(0, 80));
  }
}

// Test connection and seed Admin
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');

    // ✅ Create migration tracker table first
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        migration_key VARCHAR(120) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- Column Migrations (run once each) ---
    await runMigrationOnce(connection, 'drop_unique_id_card_no',
      'ALTER TABLE customers DROP INDEX id_card_no');
    await runMigrationOnce(connection, 'add_customers_id_card_no',
      'ALTER TABLE customers ADD COLUMN id_card_no VARCHAR(20) NULL');
    await runMigrationOnce(connection, 'add_policies_repair_type',
      "ALTER TABLE policies ADD COLUMN repair_type VARCHAR(50) NULL DEFAULT 'อู่'");
    await runMigrationOnce(connection, 'add_policies_job_type',
      "ALTER TABLE policies ADD COLUMN job_type VARCHAR(50) DEFAULT 'งานใหม่' AFTER status");
    await runMigrationOnce(connection, 'add_non_motor_job_type',
      "ALTER TABLE non_motor_policies ADD COLUMN job_type VARCHAR(50) DEFAULT 'งานใหม่' AFTER status");
    await runMigrationOnce(connection, 'drop_customers_email',
      'ALTER TABLE customers DROP COLUMN email');
    await runMigrationOnce(connection, 'drop_customers_occupation',
      'ALTER TABLE customers DROP COLUMN occupation');
    await runMigrationOnce(connection, 'add_customers_address_fields',
      'ALTER TABLE customers ADD COLUMN moo VARCHAR(50), ADD COLUMN soi VARCHAR(100), ADD COLUMN road VARCHAR(100), ADD COLUMN sub_district VARCHAR(100), ADD COLUMN district VARCHAR(100)');
    await runMigrationOnce(connection, 'add_customers_alt_phone',
      'ALTER TABLE customers ADD COLUMN alt_phone VARCHAR(20) DEFAULT NULL');
    await runMigrationOnce(connection, 'add_policies_prb_dates',
      'ALTER TABLE policies ADD COLUMN prb_start_date DATE, ADD COLUMN prb_expiry_date DATE');
    await runMigrationOnce(connection, 'add_ai_correction_non_motor_id',
      'ALTER TABLE ai_correction_logs ADD COLUMN non_motor_policy_id INT NULL AFTER policy_id');

    // Seed Admin user if not exists
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await connection.query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'System Administrator', 'Admin']
      );
    }

    // Create Performance Indexes (IF NOT EXISTS equivalent — catch duplicate error)
    try { await connection.query('CREATE INDEX idx_policies_dates ON policies (start_date, expiry_date)'); } catch(e) {}
    try { await connection.query('CREATE INDEX idx_non_motor_dates ON non_motor_policies (start_date, expiry_date)'); } catch(e) {}
    try { await connection.query('CREATE INDEX idx_documents_deleted ON documents (deleted_at, created_at)'); } catch(e) {}
    try { await connection.query('CREATE INDEX idx_customers_code ON customers (customer_code)'); } catch(e) {}

    // Auto-migrate tables for Document Upload feature
    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const [docTypesCount] = await connection.query('SELECT COUNT(*) as count FROM document_types');
    if (docTypesCount[0].count === 0) {
      await connection.query(`
        INSERT INTO document_types (id, name, description) VALUES 
        (1, 'ตารางกรมธรรม์', 'หน้าตารางกรมธรรม์ประกันภัย'),
        (2, 'ใบเสร็จรับเงิน', 'หลักฐานการชำระเงิน'),
        (3, 'สำเนาบัตรประชาชน', 'เอกสารยืนยันตัวตนลูกค้า'),
        (4, 'สำเนาทะเบียนรถ', 'เอกสารแสดงความเป็นเจ้าของรถ'),
        (5, 'รูปถ่ายรถยนต์', 'รูปถ่ายสภาพรถยนต์ก่อนทำประกัน'),
        (6, 'อื่นๆ', 'เอกสารอื่นๆ')
      `);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        policy_id INT,
        document_type_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        version INT DEFAULT 1,
        note TEXT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE SET NULL,
        FOREIGN KEY (document_type_id) REFERENCES document_types(id)
      )
    `);
    console.log('Document tables verified');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        document_type VARCHAR(100),
        is_success BOOLEAN DEFAULT FALSE,
        has_warning BOOLEAN DEFAULT FALSE,
        warning_message TEXT,
        model_used VARCHAR(100),
        processing_time_ms INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_correction_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        policy_id INT NULL,
        non_motor_policy_id INT NULL,
        document_type VARCHAR(100),
        ocr_raw_data JSON,
        saved_data JSON,
        discrepancies JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Auto-migrate non-motor tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS non_motor_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    const [nmTypesCount] = await connection.query('SELECT COUNT(*) as count FROM non_motor_types');
    if (nmTypesCount[0].count === 0) {
      await connection.query(`
        INSERT INTO non_motor_types (id, name) VALUES 
        (1, 'ประกันภัยอุบัติเหตุส่วนบุคคล (PA)'),
        (2, 'ประกันภัยการขนส่งสินค้า'),
        (3, 'ประกันอัคคีภัย'),
        (4, 'ประกันภัยความรับผิดต่อบุคคลภายนอก'),
        (5, 'ประกันภัยความเสี่ยงภัยทุกชนิดของผู้รับเหมา (CAR)'),
        (6, 'ประกันภัยความรับผิดทางวิชาชีพ (PI)'),
        (7, 'ประกันสุขภาพ'),
        (8, 'ประกันชีวิตแบบสะสมทรัพย์'),
        (9, 'ประกันชีวิตแบบชั่วระยะเวลา (T Life)'),
        (10, 'ประกันโจรกรรม')
      `);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS non_motor_policies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        policy_no VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        non_motor_type_id INT,
        insured_name VARCHAR(255),
        sum_insured DECIMAL(15,2),
        net_premium DECIMAL(15,2),
        stamp_duty DECIMAL(10,2),
        vat DECIMAL(10,2),
        total_premium DECIMAL(15,2),
        commission_percent DECIMAL(5,2),
        commission_baht DECIMAL(15,2),
        start_date DATE,
        expiry_date DATE,
        status VARCHAR(50) DEFAULT 'รอดำเนินการ',
        note TEXT,
        additional_data JSON,
        created_by INT,
        sales_person_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (non_motor_type_id) REFERENCES non_motor_types(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (sales_person_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS non_motor_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        non_motor_policy_id INT NOT NULL,
        document_type_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        file_size INT,
        version INT DEFAULT 1,
        note TEXT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (non_motor_policy_id) REFERENCES non_motor_policies(id) ON DELETE CASCADE,
        FOREIGN KEY (document_type_id) REFERENCES document_types(id)
      )
    `);
    console.log('Non-Motor tables verified');

    // Create Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        policy_id INT NULL,
        non_motor_policy_id INT NULL,
        payment_method VARCHAR(100) NOT NULL,
        installments INT DEFAULT 1,
        pay_date DATE,
        status VARCHAR(50) DEFAULT 'รอดำเนินการ',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
        FOREIGN KEY (non_motor_policy_id) REFERENCES non_motor_policies(id) ON DELETE CASCADE
      )
    `);

    // Create Installments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS installments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payment_id INT NOT NULL,
        installment_no INT NOT NULL,
        due_date DATE,
        amount DECIMAL(15,2),
        paid_amount DECIMAL(15,2) DEFAULT 0,
        balance_amount DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'รอชำระ',
        payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      )
    `);
    console.log('Payments & Installments tables verified');

    // Auto-seed mock data if database is empty
    const [custCountRes] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (custCountRes[0].count === 0) {
      console.log('Database is empty. Seeding mock customers and policies...');
      const firstNames = ['สมชาย', 'สมหญิง', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'สมศักดิ์', 'พรทิพย์', 'ณรงค์'];
      const lastNames = ['ใจดี', 'รักไทย', 'มีทรัพย์', 'พาณิชย์', 'รุ่งเรือง', 'สุขใจ', 'มั่งคั่ง', 'มั่นคง', 'ร่ำรวย', 'ยอดเยี่ยม'];
      const provinces = ['กรุงเทพมหานคร', 'นนทบุรี', 'เชียงใหม่', 'ชลบุรี', 'ภูเก็ต'];
      
      const [adminRow] = await connection.query('SELECT id FROM users WHERE username="admin"');
      const adminId = adminRow[0] ? adminRow[0].id : 1;
      
      let salesId = 1;
      const [salesRow] = await connection.query('SELECT id FROM users WHERE username="sales1"');
      if (salesRow.length > 0) {
        salesId = salesRow[0].id;
      } else {
        const hash = await bcrypt.hash('123456', 10);
        const [salesInsert] = await connection.query(
          'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
          ['sales1', hash, 'Sales Person 1', 'Sales']
        );
        salesId = salesInsert.insertId;
      }

      for (let i = 1; i <= 10; i++) {
        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        const prov = provinces[Math.floor(Math.random() * provinces.length)];
        
        const isExpiringSoon = i <= 5;
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        if (isExpiringSoon) {
          startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 20));
        } else {
          startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));
        }
        const expiryDate = new Date(startDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        
        const daysLeft = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        let pStatus = 'สำเร็จ';
        if (daysLeft > 0 && daysLeft <= 30) pStatus = 'รอต่ออายุ';
        if (daysLeft < 0) pStatus = 'หมดอายุแล้ว';

        const custResult = await connection.query(`
          INSERT INTO customers (
            customer_code, prefix, first_name, last_name, phone, line_id, 
            age, id_card_no, address, province, zipcode, customer_status, lead_status, source, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `CUS-2026-${String(i).padStart(4, '0')}`, 'คุณ', fn, ln,
          `08${Math.floor(Math.random() * 90000000 + 10000000)}`,
          `line_id_${i}`, Math.floor(Math.random() * 40 + 20),
          `1${Math.floor(Math.random() * 900000000000 + 100000000000)}`,
          `123/45 ถนนทดสอบ`, prov, '10000', 'ลูกค้าปัจจุบัน', 'ปิดการขาย', 'Website', salesId
        ]);
        const customerId = custResult[0].insertId;

        const brands = ['Toyota', 'Honda', 'Isuzu', 'Nissan', 'Ford', 'Mazda'];
        const brand = brands[Math.floor(Math.random() * brands.length)];
        const vehResult = await connection.query(`
          INSERT INTO vehicles (
            customer_id, vehicle_type, brand, model, year, color, plate_no, plate_province, sum_insured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          customerId, 'รถเก๋ง', brand, 'Sedan', '202' + Math.floor(Math.random() * 5),
          'ขาว', `${Math.floor(Math.random() * 9) + 1}กข ${Math.floor(Math.random() * 9000 + 1000)}`, prov,
          Math.floor(Math.random() * 500000 + 300000)
        ]);
        const vehicleId = vehResult[0].insertId;

        const netPremium = Math.floor(Math.random() * 15000 + 5000);
        const stampDuty = netPremium * 0.004;
        const vat = (netPremium + stampDuty) * 0.07;
        const totalPremium = netPremium + stampDuty + vat;

        await connection.query(`
          INSERT INTO policies (
            customer_id, vehicle_id, policy_no, company, type, sum_insured,
            net_premium, stamp_duty, vat, total_premium, commission_percent, commission_baht,
            payment_method, start_date, expiry_date, status, sales_person_id, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          customerId, vehicleId, `POL-2026-${String(i).padStart(4, '0')}`,
          'วิริยะประกันภัย', 'ประกันภัยชั้น 1', Math.floor(Math.random() * 500000 + 300000),
          netPremium, stampDuty, vat, totalPremium, 18, netPremium * 0.18,
          'เงินสด', startDate.toISOString().split('T')[0], expiryDate.toISOString().split('T')[0],
          pStatus, salesId, adminId, startDate.toISOString().split('T')[0] + ' 10:00:00'
        ]);
      }
      console.log('Successfully auto-seeded mock data!');
    }

    // Auto-migrate company names (run once)
    await runMigrationOnce(connection, 'migrate_company_names_formal_v1', `
      UPDATE master_data SET value = 'บริษัท วิริยะประกันภัย จำกัด (มหาชน)' WHERE category = 'InsuranceCompany' AND value = 'วิริยะประกันภัย'
    `);

    // Auto-update VehicleType values (run once)
    await runMigrationOnce(connection, 'migrate_vehicle_types_formal_v1', `
      UPDATE master_data SET value = 'รถจักรยานยนต์' WHERE category = 'VehicleType' AND value = 'รถมอเตอร์ไซค์'
    `);
    
    connection.release();
    
    // Start background cron jobs
    startCronJobs(pool);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

// Pass pool to request object so routes can use it
app.use((req, res, next) => {
  req.db = pool;
  next();
});

if (require.main === module) {
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
  try {
    const connection = await pool.getConnection();
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
    connection.release();
    res.json({ message: 'Database fix executed!', details: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
app.use('/api/cron', require('./routes/cron'));

// Schedule Automated Backup every 1st day of the month at 01:00 AM (End of month backup)
if (require.main === module) {
  cron.schedule('0 1 1 * *', () => {
    console.log('Cron triggered: Running automated monthly backup...');
    if (runBackup) {
      runBackup();
    } else {
      console.log('Backup module is missing, skipping automated backup.');
    }
  });
}

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

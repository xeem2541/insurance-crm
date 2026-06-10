const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const helmet = require('helmet');
const { startCronJobs } = require('./cron');
const cron = require('node-cron');
let runBackup;
try {
  runBackup = require('./cron/backup');
} catch (e) {
  console.log('Backup module not found. Please upload cron/backup.js to enable automated backups.');
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginResourcePolicy: false, // allow cross-origin images/resources if needed
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection pool
const pool = mysql.createPool({
  uri: process.env.DB_URI ? process.env.DB_URI : undefined,
  host: process.env.DB_URI ? undefined : (process.env.DB_HOST || 'localhost'),
  user: process.env.DB_URI ? undefined : (process.env.DB_USER || 'app_user'),
  password: process.env.DB_URI ? undefined : (process.env.DB_PASSWORD || 'app_password'),
  database: process.env.DB_URI ? undefined : (process.env.DB_NAME || 'insurance_db'),
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

// Test connection and seed Admin
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    
    // Auto-drop removed columns to fix Duplicate Entry errors on id_card_no
    const dropColumns = ['id_card_no', 'email', 'occupation'];
    for (const col of dropColumns) {
      try {
        await connection.query(`ALTER TABLE customers DROP COLUMN ${col}`);
        console.log(`Dropped column ${col} from customers`);
      } catch (e) {
        // Column might not exist or already dropped, ignore safely
      }
    }
    
    // Seed Admin user if not exists
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await connection.query(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'System Administrator', 'Admin']
      );
      console.log('Seed Admin user created');
    }

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
        (2, 'ประกันภัยขนส่งสินค้า'),
        (3, 'ประกันภัยอัคคีภัย / ไฟไหม้'),
        (4, 'ประกันภัยความรับผิดต่อบุคคลภายนอก'),
        (5, 'ประกันภัยรับเหมาก่อสร้าง'),
        (6, 'ประกันภัยวิชาชีพ'),
        (7, 'ประกันภัยสุขภาพ'),
        (8, 'ประกันภัยเงินออม'),
        (9, 'ประกันภัย T Life')
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

    // Auto-migrate new columns for Single Page Form
    try {
      await connection.query('ALTER TABLE customers ADD COLUMN moo VARCHAR(50), ADD COLUMN soi VARCHAR(100), ADD COLUMN road VARCHAR(100), ADD COLUMN sub_district VARCHAR(100), ADD COLUMN district VARCHAR(100)');
    } catch(e) {}
    
    // Auto-migrate alt_phone
    try {
      await connection.query('ALTER TABLE customers ADD COLUMN alt_phone VARCHAR(20) DEFAULT NULL');
    } catch(e) {}

    try {
      await connection.query('ALTER TABLE policies ADD COLUMN prb_start_date DATE, ADD COLUMN prb_expiry_date DATE');
    } catch(e) {}

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
    console.log('Payments table verified');

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
    console.log('Installments table verified');

    // Auto-seed mock data if database is empty
    const [custCountRes] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (custCountRes[0].count === 0) {
      console.log('Database is empty. Seeding mock customers and policies...');
      const firstNames = ['สมชาย', 'สมหญิง', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'สมศักดิ์', 'พรทิพย์', 'ณรงค์'];
      const lastNames = ['ใจดี', 'รักไทย', 'มีทรัพย์', 'พาณิชย์', 'รุ่งเรือง', 'สุขใจ', 'มั่งคั่ง', 'มั่นคง', 'ร่ำรวย', 'ยอดเยี่ยม'];
      const provinces = ['กรุงเทพมหานคร', 'นนทบุรี', 'เชียงใหม่', 'ชลบุรี', 'ภูเก็ต'];
      
      const [adminRow] = await connection.query('SELECT id FROM users WHERE username="admin"');
      const adminId = adminRow[0] ? adminRow[0].id : 1;
      
      // Ensure sales user exists
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
        
        // Ensure policies have upcoming expiry dates for the calendar
        const isExpiringSoon = i <= 5; // First 5 customers have expiring policies
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        if (isExpiringSoon) {
          startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 20)); // Expires in 0-20 days
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
            customer_code, prefix, first_name, last_name, phone, email, line_id, 
            age, id_card_no, address, province, zipcode, customer_status, lead_status, source, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `CUS-2026-${String(i).padStart(4, '0')}`, 'คุณ', fn, ln,
          `08${Math.floor(Math.random() * 90000000 + 10000000)}`,
          `customer${i}@example.com`, `line_id_${i}`, Math.floor(Math.random() * 40 + 20),
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

initDb();

// Basic route
app.get('/api', (req, res) => {
  res.json({ message: 'Insurance API is running' });
});

// Placeholder for routes
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

// Schedule Automated Backup every 1st day of the month at 01:00 AM (End of month backup)
cron.schedule('0 1 1 * *', () => {
  console.log('Cron triggered: Running automated monthly backup...');
  if (runBackup) {
    runBackup();
  } else {
    console.log('Backup module is missing, skipping automated backup.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

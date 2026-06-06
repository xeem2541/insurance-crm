const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { startCronJobs } = require('./cron');

const app = express();
const PORT = process.env.PORT || 5000;

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
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

// Test connection and seed Admin
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    
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
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/master-data', require('./routes/masterData'));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const { pool } = require('./db');
const bcrypt = require('bcryptjs');
const runMigrations = require('./utils/runMigrations');

// Migration flag table — แต่ละ ALTER TABLE รันแค่ครั้งเดียว ไม่ซ้ำทุก cold start
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
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Database connected successfully');

    // Create migration tracker table first
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
    await runMigrationOnce(connection, 'add_customers_search_text',
      'ALTER TABLE customers ADD COLUMN search_text TEXT GENERATED ALWAYS AS (CONCAT_WS(\' \', IFNULL(prefix, \'\'), IFNULL(first_name, \'\'), IFNULL(last_name, \'\'), IFNULL(phone, \'\'), IFNULL(id_card_no, \'\'), IFNULL(customer_code, \'\'))) VIRTUAL');
    await runMigrationOnce(connection, 'add_policies_prb_dates',
      'ALTER TABLE policies ADD COLUMN prb_start_date DATE, ADD COLUMN prb_expiry_date DATE');
    await runMigrationOnce(connection, 'add_ai_correction_non_motor_id',
      'ALTER TABLE ai_correction_logs ADD COLUMN non_motor_policy_id INT NULL AFTER policy_id');

    // --- LINE Admin Migrations ---
    await runMigrationOnce(connection, 'create_line_users_table', `
      CREATE TABLE IF NOT EXISTS line_users (
        user_id VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        picture_url VARCHAR(500),
        is_bot_paused BOOLEAN DEFAULT FALSE,
        needs_attention BOOLEAN DEFAULT FALSE,
        last_interacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await runMigrationOnce(connection, 'add_admin_role_chat_history', `
      ALTER TABLE chat_history MODIFY COLUMN role VARCHAR(20) NOT NULL
    `);
    
    await runMigrationOnce(connection, 'create_line_chat_leads_table', `
      CREATE TABLE IF NOT EXISTS line_chat_leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        model VARCHAR(100),
        year VARCHAR(10),
        expire_date VARCHAR(50),
        raw_data JSON,
        status VARCHAR(50) DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES line_users(user_id) ON DELETE CASCADE
      )
    `);

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
    
    // Run SQL file migrations (I-05)
    await runMigrations();

  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { initDb };

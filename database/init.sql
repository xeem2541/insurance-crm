CREATE DATABASE IF NOT EXISTS insurance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE insurance_db;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('Admin', 'Manager', 'Staff', 'Sales', 'Viewer') DEFAULT 'Staff',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_code` VARCHAR(20) NOT NULL UNIQUE,
  `prefix` VARCHAR(20),
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `line_id` VARCHAR(100),
  `facebook` VARCHAR(100),
  `dob` DATE,
  `age` INT,
  `id_card_no` VARCHAR(20) UNIQUE,
  `address` TEXT,
  `province` VARCHAR(100),
  `zipcode` VARCHAR(10),
  `occupation` VARCHAR(100),
  `secondary_contact` VARCHAR(100),
  `customer_status` VARCHAR(100) DEFAULT 'ลูกค้าใหม่',
  `lead_status` VARCHAR(100) DEFAULT 'สนใจ',
  `source` VARCHAR(100),
  `note` TEXT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `vehicle_type` VARCHAR(100),
  `brand` VARCHAR(100),
  `model` VARCHAR(100),
  `year` VARCHAR(4),
  `color` VARCHAR(50),
  `plate_no` VARCHAR(20),
  `plate_province` VARCHAR(100),
  `vin` VARCHAR(100),
  `engine_no` VARCHAR(100),
  `sum_insured` DECIMAL(10,2),
  `tax_expiry` DATE,
  `act_expiry` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `policies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `vehicle_id` INT,
  `policy_no` VARCHAR(50) NOT NULL UNIQUE,
  `company` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `sum_insured` DECIMAL(10,2),
  `net_premium` DECIMAL(10,2),
  `stamp_duty` DECIMAL(10,2),
  `vat` DECIMAL(10,2),
  `total_premium` DECIMAL(10,2),
  `commission_percent` DECIMAL(5,2),
  `commission_baht` DECIMAL(10,2),
  `payment_method` VARCHAR(100),
  `start_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `status` VARCHAR(100) DEFAULT 'รอดำเนินการ',
  `sales_person_id` INT,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`sales_person_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `policy_id` INT,
  `vehicle_id` INT,
  `document_type_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50),
  `file_size` INT,
  `version` INT DEFAULT 1,
  `note` TEXT,
  `uploaded_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `action` VARCHAR(50) NOT NULL,
  `target_table` VARCHAR(50),
  `target_id` INT,
  `details` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `master_data` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Document Types
INSERT INTO `document_types` (`name`) VALUES 
('บัตรประชาชน'), ('ทะเบียนบ้าน'), ('เล่มทะเบียนรถ'), ('กรมธรรม์'), 
('ใบคำขอเอาประกัน'), ('ใบเสนอราคา'), ('เอกสารเคลม'), 
('รูปหน้ารถ'), ('รูปหลังรถ'), ('รูปด้านซ้าย'), ('รูปด้านขวา'), 
('รูปเลขไมล์'), ('รูปทะเบียนรถ'), ('PDF'), ('อื่นๆ');

-- Insert default Master Data
INSERT INTO `master_data` (`category`, `value`) VALUES
('PolicyType', 'พ.ร.บ.'), ('PolicyType', 'ประกันภัยชั้น 1'), ('PolicyType', 'ประกันภัยชั้น 2+'), ('PolicyType', 'ประกันภัยชั้น 3+'), ('PolicyType', 'ประกันภัยชั้น 3'), ('PolicyType', 'ประกันภัยอุบัติเหตุ PA'), ('PolicyType', 'ประกันภัยขนส่งสินค้า'), ('PolicyType', 'ประกันภัยอัคคีภัย/ไฟไหม้'), ('PolicyType', 'ประกันภัยรับผิดบุคคลภายนอก'), ('PolicyType', 'ประกันภัยรับเหมา'), ('PolicyType', 'ประกันภัยวิชาชีพ'), ('PolicyType', 'ประกันภัยสุขภาพ'), ('PolicyType', 'ประกันภัยเงินออม'), ('PolicyType', 'ประกันภัย T Life'),
('InsuranceCompany', 'วิริยะประกันภัย'), ('InsuranceCompany', 'กรุงเทพประกันภัย'), ('InsuranceCompany', 'ธนชาตประกันภัย'), ('InsuranceCompany', 'ทิพยประกันภัย'), ('InsuranceCompany', 'คุ้มภัยโตเกียวมารีน'), ('InsuranceCompany', 'ไทยวิวัฒน์ประกันภัย'), ('InsuranceCompany', 'เมืองไทยประกันภัย'), ('InsuranceCompany', 'แอกซ่าประกันภัย'), ('InsuranceCompany', 'MSIG ประกันภัย'), ('InsuranceCompany', 'แอลเอ็มจีประกันภัย'), ('InsuranceCompany', 'ซับบ์สามัคคีประกันภัย'), ('InsuranceCompany', 'นวกิจประกันภัย'), ('InsuranceCompany', 'เออร์โก้ประกันภัย'), ('InsuranceCompany', 'ไอโออิกรุงเทพประกันภัย'), ('InsuranceCompany', 'อลิอันซ์ประกันภัย'), ('InsuranceCompany', 'เทเวศประกันภัย'),
('VehicleType', 'รถมอเตอร์ไซค์'), ('VehicleType', 'รถกระบะ'), ('VehicleType', 'รถเก๋ง'), ('VehicleType', 'รถกระบะ 4 ประตู'), ('VehicleType', 'รถโดยสาร'), ('VehicleType', 'รถ 6 ล้อ'), ('VehicleType', 'รถ 10 ล้อ'), ('VehicleType', 'รถพ่วง'), ('VehicleType', 'รถเพื่อการเกษตร'),
('JobStatus', 'สำเร็จ'), ('JobStatus', 'รอดำเนินการ'), ('JobStatus', 'รอถ่ายรูปรถ'), ('JobStatus', 'รอผ่อนชำระ'), ('JobStatus', 'ชำระครบแล้ว'),
('PaymentMethod', 'เงินสด'), ('PaymentMethod', 'เงินผ่อน (ตัวแทน)'), ('PaymentMethod', 'เงินผ่อน (เงินติดล้อ)'), ('PaymentMethod', 'เงินผ่อน (ทีโบรคเกอร์)'), ('PaymentMethod', 'เงินผ่อน (ฟิน)'), ('PaymentMethod', 'บัตรเครดิต'),
('LeadSource', 'Facebook'), ('LeadSource', 'TikTok'), ('LeadSource', 'Website'), ('LeadSource', 'LINE'), ('LeadSource', 'ลูกค้าเก่าแนะนำ'), ('LeadSource', 'Walk-in');

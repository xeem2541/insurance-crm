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

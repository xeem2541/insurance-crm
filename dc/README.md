# Insurance CRM & Document Management System v2.0

ระบบบริหารจัดการนายหน้าประกันภัยระดับองค์กร (Enterprise Grade) พัฒนาด้วย React, Node.js, Express, และ MySQL

## คุณสมบัติเด่น (Features)
- **ระบบสมาชิกและสิทธิ์การใช้งาน (RBAC)**: รองรับสิทธิ์ Admin, Manager, Staff, Sales, Viewer
- **ข้อมูลลูกค้า (CRM)**: จัดเก็บข้อมูลส่วนตัว, ที่อยู่, การติดต่อ, สถานะลูกค้า และช่องทางการขาย (Lead Tracking)
- **ข้อมูลรถยนต์**: จัดการข้อมูลรถยนต์แยกต่างหาก ผูกกับลูกค้า 1-to-N
- **ระบบกรมธรรม์**: คำนวณเบี้ยประกัน สุทธิ, อากร, VAT และคำนวณคอมมิชชันอัตโนมัติ
- **ระบบเอกสาร**: อัปโหลดไฟล์ (PDF, JPG, PNG) ผูกกับลูกค้า กรมธรรม์ หรือรถยนต์ พร้อมระบบเปิดดูตัวอย่าง (Preview)
- **Dashboard อัจฉริยะ**: กราฟแท่งยอดขายรายเดือน, กราฟพายสัดส่วนบริษัท, และแจ้งเตือนประกันหมดอายุภายใน 90 วัน
- **รายงาน (Reports)**: ดึงรายงานยอดขายรายวัน/เดือน, ต่ออายุ, ค้างชำระ พร้อมระบบ Export เป็น Excel และ PDF
- **Theme**: รองรับการสลับโหมดสว่าง (Light Mode) และโหมดกลางคืน (Dark Mode)

## เทคโนโลยีที่ใช้
- **Frontend**: React (Vite), Bootstrap 5, Chart.js, react-select, xlsx, jsPDF
- **Backend**: Node.js, Express, JWT, bcrypt, Multer
- **Database**: MySQL 8.0
- **Infrastructure**: Docker Compose

## วิธีการติดตั้งและการรันระบบ

1. คัดลอกโปรเจกต์นี้
2. รันคำสั่ง Docker Compose เพื่อเปิดใช้งานระบบและสร้างฐานข้อมูล
   ```bash
   docker compose up -d
   ```
3. (สำหรับครั้งแรก) รันคำสั่ง Seed เพื่อนำเข้าข้อมูลจำลองและข้อมูลพื้นฐาน (Master Data)
   ```bash
   docker exec insurance_backend node /app/seed_v2.js
   ```

## ข้อมูลเข้าใช้งานระบบ (บัญชีผู้ใช้เริ่มต้น)
- **Admin**: `username: admin` | `password: 123456`
- **Manager**: `username: manager` | `password: 123456`
- **Staff**: `username: staff` | `password: 123456`
- **Sales**: `username: sales1` | `password: 123456`
- **Viewer**: `username: viewer` | `password: 123456`

## โครงสร้างระบบ
- `backend/` - API และ Database Seeder
- `frontend/` - React SPA (Single Page Application)
- `database/` - ไฟล์ `init.sql` สำหรับสร้างตารางทั้งหมด

## การจัดการฐานข้อมูลใหม่
หากต้องการล้างข้อมูลเก่าและเริ่มใหม่ทั้งหมด สามารถทำได้โดย:
```bash
docker compose down -v
docker compose up -d
docker exec insurance_backend node /app/seed_v2.js
```

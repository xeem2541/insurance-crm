import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  return `${day}/${month}/${year}`;
};

const Dashboard = () => {
  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(() => {
    const val = sessionStorage.getItem('dashboardMonth');
    if (val === 'all') return 'all';
    return val ? Number(val) : (currentDate.getMonth() + 1);
  });
  const [filterYear, setFilterYear] = useState(() => Number(sessionStorage.getItem('dashboardYear')) || currentDate.getFullYear());
  
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPolicies: 0,
    totalNonMotorPolicies: 0,
    totalDocuments: 0,
    newCustomersThisMonth: 0,
    salesThisMonth: 0,
    salesThisYear: 0,
    commThisMonth: 0,
    nmSalesThisMonth: 0,
    nmSalesThisYear: 0,
    nmCommThisMonth: 0,
    mSalesByJobType: [],
    nmSalesByJobType: [],
    expiringPolicies: [],
    topCompanies: [],
    topSales: [],
    monthlySales: [],
    cashSalesTotal: 0,
    installmentSalesTotal: 0,
    unpaidInstallmentTotal: 0,
    collectedThisMonth: 0,
    overdueCustomersCount: 0,
    upcomingInstallments: [],
    monthlyCustomers: [],
    aiStats: { total_scans: 0, successful_scans: 0, warning_scans: 0, avg_processing_time: 0 },
    aiDocTypes: []
  });

  useEffect(() => {
    sessionStorage.setItem('dashboardMonth', filterMonth);
    sessionStorage.setItem('dashboardYear', filterYear);
    fetchStats();
  }, [filterMonth, filterYear]);

  const fetchStats = async () => {
    try {
      const res = await api.get(`/dashboard/stats?month=${filterMonth}&year=${filterYear}`);
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const barChartData = {
    labels: (stats?.monthlySales || []).map(m => `เดือน ${m.month}`),
    datasets: [
      {
        label: 'ยอดขาย Motor (บาท)',
        data: (stats?.monthlySales || []).map(m => m.motor_sales),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: 'transparent',
        borderWidth: 0,
        maxBarThickness: 35,
        borderRadius: 12,
        borderSkipped: false,
      },
      {
        label: 'ยอดขาย Non-Motor (บาท)',
        data: (stats?.monthlySales || []).map(m => m.non_motor_sales),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderColor: 'transparent',
        borderWidth: 0,
        maxBarThickness: 35,
        borderRadius: 12,
        borderSkipped: false,
      }
    ],
  };

  const pieChartData = {
    labels: (stats?.topCompanies || []).map(c => c.company),
    datasets: [
      {
        data: (stats?.topCompanies || []).map(c => c.total_sales),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F15BB5'
        ],
      },
    ],
  };

  const months = [
    { value: 'all', label: 'ทุกเดือน' },
    { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' }
  ];

  const currentYr = new Date().getFullYear();
  const years = [currentYr - 2, currentYr - 1, currentYr, currentYr + 1, currentYr + 2];

  return (
    <div className="pb-5">
      {/* Modern Hero & Filter Header */}
      <div className="card border-0 mb-4 p-4 rounded-4 shadow-sm" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '-60px', right: '-40px', width: '220px', height: '220px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }}></div>

        <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
          <div className="col-lg-7 mb-3 mb-lg-0">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge px-3 py-1 rounded-pill" style={{ background: 'rgba(255,255,255,0.1)', color: '#cba153', border: '1px solid rgba(203,161,83,0.3)', fontSize: '0.8rem' }}>
                <i className="bi bi-shield-check me-1"></i> Apple Insurance Dashboard
              </span>
              <span className="text-white-50 small">
                {currentDate.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h2 className="fw-bold mb-2" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif", color: '#f8f9fa', letterSpacing: '-0.5px' }}>
              ภาพรวมระบบและการบริหารงาน
            </h2>
            <p className="text-white-50 mb-0 small" style={{ maxWidth: '560px' }}>
              ติดตามสถานะกรมธรรม์ ยอดขาย ค่าคอมมิชชัน และการใช้งาน AI OCR ได้แบบเรียลไทม์
            </p>
          </div>

          <div className="col-lg-5 d-flex flex-column flex-sm-row justify-content-lg-end gap-2">
            <div className="d-flex gap-2">
              <select 
                className="form-select fw-bold py-2 shadow-sm" 
                style={{ borderRadius: '12px', fontSize: '0.88rem', background: '#ffffff', color: '#1e293b' }}
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>เดือน {m.label}</option>
                ))}
              </select>
              <select 
                className="form-select fw-bold py-2 shadow-sm" 
                style={{ borderRadius: '12px', fontSize: '0.88rem', background: '#ffffff', color: '#1e293b' }}
                value={filterYear} 
                onChange={(e) => setFilterYear(e.target.value)}
              >
                {years.map(y => (
                  <option key={y} value={y}>ปี {y}</option>
                ))}
              </select>
            </div>
            <Link 
              to="/issue-policy-motor" 
              className="btn btn-success fw-bold px-3 py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 text-nowrap"
              style={{ background: 'linear-gradient(45deg, #00b09b, #96c93d)', border: 'none' }}
            >
              <i className="bi bi-car-front-fill"></i>
              <span>+ ออกกรมธรรม์ (Motor)</span>
            </Link>
            <Link 
              to="/issue-policy-non-motor" 
              className="btn btn-primary fw-bold px-3 py-2 rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 text-nowrap"
              style={{ background: 'linear-gradient(45deg, #3b82f6, #60a5fa)', border: 'none' }}
            >
              <i className="bi bi-shield-plus"></i>
              <span>+ ออกกรมธรรม์ (Non-Motor)</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Modern High-Impact Stat Cards Grid 1 */}
      <div className="row g-4 mb-4">
        {/* Yearly Total Sales */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern h-100 p-4" style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-white-50 small fw-semibold text-uppercase tracking-wider">ยอดรวมสิ้นปี (ปี {filterYear})</span>
                <h3 className="fw-bold mt-1 mb-0 text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney((parseFloat(stats.salesThisYear) || 0) + (parseFloat(stats.nmSalesThisYear) || 0))}
                </h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(255,255,255,0.15)', color: '#60a5fa' }}>
                <i className="bi bi-graph-up-arrow"></i>
              </div>
            </div>
            <div className="d-flex justify-content-between pt-2 border-top border-white-50 small text-white-50">
              <span>Motor: {formatMoney(stats.salesThisYear)}</span>
              <span>Non-Motor: {formatMoney(stats.nmSalesThisYear)}</span>
            </div>
          </div>
        </div>

        {/* Sales Selected Month */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern stat-emerald h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-muted small fw-semibold text-uppercase tracking-wider">ยอดขาย {filterMonth === 'all' ? '(ทั้งปี)' : '(เดือนที่เลือก)'}</span>
                <h3 className="fw-bold mt-1 mb-0 text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney((parseFloat(stats.salesThisMonth) || 0) + (parseFloat(stats.nmSalesThisMonth) || 0))}
                </h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <i className="bi bi-cash-stack"></i>
              </div>
            </div>
            <div className="d-flex justify-content-between pt-2 border-top small text-muted">
              <span>Motor: {formatMoney(stats.salesThisMonth)}</span>
              <span>Non-Motor: {formatMoney(stats.nmSalesThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* Commission Selected Month */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern stat-amber h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-muted small fw-semibold text-uppercase tracking-wider">คอมมิชชัน {filterMonth === 'all' ? '(ทั้งปี)' : '(เดือนที่เลือก)'}</span>
                <h3 className="fw-bold mt-1 mb-0 text-warning" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney((parseFloat(stats.commThisMonth) || 0) + (parseFloat(stats.nmCommThisMonth) || 0))}
                </h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <i className="bi bi-percent"></i>
              </div>
            </div>
            <div className="d-flex justify-content-between pt-2 border-top small text-muted">
              <span>Motor: {formatMoney(stats.commThisMonth)}</span>
              <span>Non-Motor: {formatMoney(stats.nmCommThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* New Customers This Month */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern stat-purple h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <span className="text-muted small fw-semibold text-uppercase tracking-wider">ลูกค้าใหม่ {filterMonth === 'all' ? '(ทั้งปี)' : '(เดือนที่เลือก)'}</span>
                <h3 className="fw-bold mt-1 mb-0 text-primary" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {stats.newCustomersThisMonth || 0} <span className="fs-6 fw-normal text-muted">ราย</span>
                </h3>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <i className="bi bi-people-fill"></i>
              </div>
            </div>
            <div className="pt-2 border-top small text-muted">
              ลูกค้าในระบบทั้งหมด: <span className="fw-bold text-dark">{stats.totalCustomers || 0}</span> ราย
            </div>
          </div>
        </div>
      </div>

      {/* Modern High-Impact Stat Cards Grid 2 */}
      <div className="row g-4 mb-4">
        {/* Cash Sales */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-semibold">ยอดเงินสด (รวม)</span>
                <h4 className="fw-bold mt-1 mb-0 text-secondary" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney(stats.cashSalesTotal || 0)}
                </h4>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                <i className="bi bi-wallet2"></i>
              </div>
            </div>
            <div className="small text-muted pt-2 border-top">รับชำระเงินสดเต็มจำนวน</div>
          </div>
        </div>
        
        {/* Installment Sales */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-semibold">ยอดเงินผ่อน (รวม)</span>
                <h4 className="fw-bold mt-1 mb-0 text-primary" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney(stats.installmentSalesTotal || 0)}
                </h4>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <i className="bi bi-credit-card-fill"></i>
              </div>
            </div>
            <div className="small text-muted pt-2 border-top">ยอดสัญญาเงินผ่อนทั้งหมด</div>
          </div>
        </div>
        
        {/* Unpaid / Overdue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern stat-rose h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-semibold">ยอดค้างชำระผ่อน</span>
                <h4 className="fw-bold mt-1 mb-0 text-danger" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney(stats.unpaidInstallmentTotal || 0)}
                </h4>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                <i className="bi bi-exclamation-octagon-fill"></i>
              </div>
            </div>
            <div className="small text-danger pt-2 border-top fw-semibold">
              ค้างชำระ: {stats.overdueCustomersCount || 0} ราย
            </div>
          </div>
        </div>
        
        {/* Collected this month */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card card-stat-modern stat-emerald h-100 p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span className="text-muted small fw-semibold">ยอดเก็บค่างวด {filterMonth === 'all' ? '(ทั้งปี)' : '(เดือนนี้)'}</span>
                <h4 className="fw-bold mt-1 mb-0 text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {formatMoney(stats.collectedThisMonth || 0)}
                </h4>
              </div>
              <div className="icon-capsule" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <i className="bi bi-check-circle-fill"></i>
              </div>
            </div>
            <div className="small text-success pt-2 border-top fw-semibold">รับชำระค่างวดสำเร็จ</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 rounded-4 h-100 p-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold mb-0" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                  <i className="bi bi-bar-chart-line-fill text-primary me-2"></i> ยอดขายรายเดือน (ปี {filterYear})
                </h5>
                <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill">กราฟแท่งเปรียบเทียบ</span>
              </div>
              <div style={{ height: '300px' }}>
                <Bar data={barChartData} options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { display: false }
                    },
                    y: {
                      grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false }
                    }
                  }
                }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 rounded-4 h-100 p-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title fw-bold mb-0" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                  <i className="bi bi-pie-chart-fill text-info me-2"></i> สัดส่วนบริษัท (ปี {filterYear})
                </h5>
              </div>
              <div style={{ height: '300px' }}>
                <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 h-100 overflow-hidden">
            <div className="card-header bg-danger-subtle border-bottom py-3">
              <h5 className="mb-0 fw-bold text-danger d-flex align-items-center gap-2" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                <i className="bi bi-bell-fill"></i>
                <span>แจ้งเตือนประกันใกล้หมดอายุ (ภายใน 90 วัน)</span>
              </h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {stats.expiringPolicies && stats.expiringPolicies.length > 0 ? stats.expiringPolicies.slice(0, 8).map(p => (
                  <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4" key={p.id}>
                    <div>
                      <div className="fw-bold text-dark">{p.first_name} {p.last_name}</div>
                      <div className="text-muted small">ทะเบียน: {p.plate_no || '-'} | กรมธรรม์: {p.policy_no}</div>
                    </div>
                    <span className="badge bg-danger rounded-pill px-3 py-2">เหลือ {p.days_left} วัน</span>
                  </li>
                )) : (
                  <li className="list-group-item text-center text-muted py-5">ไม่มีรายการแจ้งเตือน</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 rounded-4 h-100 overflow-hidden">
            <div className="card-header bg-warning-subtle border-bottom py-3">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                <i className="bi bi-trophy-fill text-warning"></i>
                <span>Top 10 พนักงานขาย (ปี {filterYear})</span>
              </h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {stats.topSales && stats.topSales.length > 0 ? stats.topSales.map((s, idx) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center py-3 px-4" key={idx}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge rounded-circle ${idx === 0 ? 'bg-warning text-dark' : idx === 1 ? 'bg-secondary text-white' : idx === 2 ? 'bg-bronze text-white' : 'bg-light text-dark border'}`} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {idx + 1}
                      </span>
                      <span className="fw-bold text-dark">{s.name}</span>
                    </div>
                    <span className="fw-bold text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatMoney(s.total_sales)}</span>
                  </li>
                )) : (
                  <li className="list-group-item text-center text-muted py-5">ไม่มีข้อมูลพนักงานขาย</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Stats Section */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden h-100">
            <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ffffff' }}>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                <i className="bi bi-cpu-fill text-info"></i> 
                <span>สถิติการใช้งาน AI OCR {filterMonth === 'all' ? `ประจำปี ${filterYear}` : `ประจำเดือน ${months.find(m => m.value == filterMonth)?.label} ปี ${filterYear}`}</span>
              </h5>
              <span className="badge rounded-pill px-3 py-1" style={{ background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.3)', fontSize: '0.75rem' }}>
                ● Gemini 3.5 Active
              </span>
            </div>
            <div className="card-body p-4">
              <div className="row text-center g-3">
                <div className="col-6 col-md-3 border-end">
                  <h6 className="text-muted mb-2 small fw-semibold">อัปโหลดทั้งหมด</h6>
                  <h3 className="fw-bold text-dark" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.aiStats?.total_scans || 0} <span className="fs-6 text-muted fw-normal">รูป</span></h3>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <h6 className="text-muted mb-2 small fw-semibold">ประมวลผลสำเร็จ</h6>
                  <h3 className="fw-bold text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.aiStats?.successful_scans || 0} <span className="fs-6 text-muted fw-normal">รูป</span></h3>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <h6 className="text-muted mb-2 small fw-semibold">พบข้อผิดพลาด/เตือน</h6>
                  <h3 className="fw-bold text-warning" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{stats.aiStats?.warning_scans || 0} <span className="fs-6 text-muted fw-normal">รายการ</span></h3>
                </div>
                <div className="col-6 col-md-3">
                  <h6 className="text-muted mb-2 small fw-semibold">เวลาเฉลี่ย/รูป</h6>
                  <h3 className="fw-bold text-primary" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{((stats.aiStats?.avg_processing_time || 0) / 1000).toFixed(2)} <span className="fs-6 text-muted fw-normal">วิ</span></h3>
                </div>
              </div>
              
              {stats.aiDocTypes && stats.aiDocTypes.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="fw-bold mb-3 small text-muted text-uppercase">สัดส่วนเอกสารที่ให้ AI อ่าน (สำเร็จ):</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {stats.aiDocTypes.map((doc, idx) => (
                      <span key={idx} className="badge bg-light text-dark border p-2 px-3 rounded-pill shadow-sm">
                        {doc.document_type === 'voluntary_policy' ? 'กรมธรรม์ (ชั้น 1,2,3)' :
                         doc.document_type === 'prb_policy' ? 'พ.ร.บ.' :
                         doc.document_type === 'vehicle_book' ? 'เล่มรถ' :
                         doc.document_type === 'payment_slip' ? 'สลิปโอนเงิน' :
                         doc.document_type === 'unknown' ? 'ไม่ทราบประเภท' : doc.document_type} 
                        <span className="ms-2 badge bg-primary rounded-pill">{doc.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI OCR Correction & Accuracy Details */}
              <div className="row mt-4 pt-3 border-top g-4">
                <div className="col-md-6 border-end">
                  <h6 className="fw-bold mb-3"><i className="bi bi-shield-check text-success me-1"></i> ดัชนีความแม่นยำรวมของ AI</h6>
                  {(() => {
                    const total = stats.aiStats?.total_scans || 0;
                    const corrected = stats.aiCorrectionStats?.correction_scans || 0;
                    const accuracy = total === 0 ? 100 : Math.max(0, ((total - corrected) / total) * 100);
                    
                    let progressColor = 'bg-success';
                    if (accuracy < 70) progressColor = 'bg-danger';
                    else if (accuracy < 90) progressColor = 'bg-warning';

                    return (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted small">สแกนถูกต้อง (ไม่ต้องแก้ไข): {total - corrected} / {total} รายการ</span>
                          <span className="fw-bold fs-5 text-dark" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '10px', borderRadius: '6px' }}>
                          <div 
                            className={`progress-bar progress-bar-striped progress-bar-animated ${progressColor}`}
                            role="progressbar" 
                            style={{ width: `${accuracy}%` }} 
                            aria-valuenow={accuracy} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="col-md-6">
                  <h6 className="fw-bold mb-3"><i className="bi bi-exclamation-triangle text-warning me-1"></i> ฟิลด์ที่ผู้ใช้แก้ไขบ่อยที่สุด (Top Corrected Fields)</h6>
                  {(() => {
                    const fieldTranslation = {
                      'customer.prefix': 'คำนำหน้าชื่อลูกค้า',
                      'customer.first_name': 'ชื่อลูกค้า',
                      'customer.last_name': 'นามสกุลลูกค้า',
                      'customer.phone': 'เบอร์โทรศัพท์ลูกค้า',
                      'customer.id_card_no': 'เลขบัตรประชาชนลูกค้า',
                      'customer.sub_district': 'ตำบล/แขวง',
                      'customer.district': 'อำเภอ/เขต',
                      'customer.province': 'จังหวัด',
                      'customer.zipcode': 'รหัสไปรษณีย์',
                      'vehicle.brand': 'ยี่ห้อรถ',
                      'vehicle.model': 'รุ่นรถ',
                      'vehicle.year': 'ปีรถ',
                      'vehicle.color': 'สีรถ',
                      'vehicle.plate_no': 'เลขทะเบียนรถ',
                      'vehicle.plate_province': 'จังหวัดของทะเบียนรถ',
                      'vehicle.vin': 'เลขตัวถังรถ',
                      'vehicle.engine_no': 'เลขเครื่องยนต์',
                      'vehicle.sum_insured': 'ทุนประกันภัยรถ',
                      'policy.company': 'บริษัทประกันภัย',
                      'policy.type': 'ประเภทประกันภัย',
                      'policy.policy_no': 'เลขที่กรมธรรม์',
                      'policy.sum_insured': 'ทุนประกันภัยกรมธรรม์',
                      'policy.net_premium': 'เบี้ยสุทธิก่อนภาษี',
                      'policy.total_premium': 'เบี้ยประกันภัยรวม'
                    };

                    const correctedFields = Object.entries(stats.aiCorrectionStats?.field_corrections || {})
                      .map(([key, count]) => ({
                        label: fieldTranslation[key] || key,
                        count
                      }))
                      .sort((a, b) => b.count - a.count);

                    if (correctedFields.length === 0) {
                      return <div className="text-center text-muted py-3 small">ยังไม่มีข้อมูลการแก้ไขฟิลด์ (ความแม่นยำสมบูรณ์ 100%)</div>;
                    }

                    return (
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        <ul className="list-group list-group-flush">
                          {correctedFields.slice(0, 5).map((f, idx) => (
                            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center bg-transparent py-2 border-0 ps-0">
                              <span className="small text-muted">{idx + 1}. {f.label}</span>
                              <span className="badge bg-warning text-dark rounded-pill">แก้ไข {f.count} ครั้ง</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table for selected month */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden h-100">
            <div className="card-header bg-primary text-white border-bottom py-3 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                <i className="bi bi-people-fill"></i> 
                <span>รายชื่อลูกค้า{filterMonth === 'all' ? `ประจำปี ${filterYear}` : `ประจำเดือน ${months.find(m => m.value == filterMonth)?.label} ปี ${filterYear}`}</span>
              </h5>
              <span className="badge bg-white text-primary rounded-pill px-3 py-1 fw-bold">{stats.monthlyCustomers?.length || 0} รายการ</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">#</th>
                      <th>ชื่อลูกค้า</th>
                      <th>เบอร์ติดต่อ</th>
                      <th>เลขกรมธรรม์</th>
                      <th>ประเภทประกัน</th>
                      <th>วันแจ้งงาน</th>
                      <th>วันเริ่มคุ้มครอง</th>
                      <th>วันสิ้นสุดคุ้มครอง</th>
                      <th className="text-end pe-4">เบี้ยประกัน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyCustomers && stats.monthlyCustomers.length > 0 ? stats.monthlyCustomers.map((cust, idx) => (
                      <tr key={idx}>
                        <td className="ps-4 text-muted small">{idx + 1}</td>
                        <td className="fw-bold text-dark">{cust.first_name} {cust.last_name}</td>
                        <td>{cust.phone || '-'}</td>
                        <td><code className="text-primary">{cust.policy_no || '-'}</code></td>
                        <td><span className={`badge rounded-pill ${cust.policy_type === 'Motor' ? 'bg-primary' : 'bg-info'}`}>{cust.policy_type}</span></td>
                        <td>{formatThaiDate(cust.created_at)}</td>
                        <td>{formatThaiDate(cust.start_date)}</td>
                        <td>{formatThaiDate(cust.expiry_date)}</td>
                        <td className="text-end pe-4 fw-bold text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatMoney(cust.total_premium)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="text-center text-muted py-5">ไม่มีข้อมูลการขายในเดือนที่เลือก</td></tr>
                    )}
                  </tbody>
                  {stats.monthlyCustomers && stats.monthlyCustomers.length > 0 && (
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="8" className="text-end ps-4">รวมยอดขายเดือนนี้:</td>
                        <td className="text-end pe-4 text-success" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1.1rem' }}>{formatMoney((parseFloat(stats.salesThisMonth) || 0) + (parseFloat(stats.nmSalesThisMonth) || 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;

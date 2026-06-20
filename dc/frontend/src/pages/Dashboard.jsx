import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState(() => Number(sessionStorage.getItem('dashboardMonth')) || (currentDate.getMonth() + 1));
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
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        maxBarThickness: 35,
        borderRadius: 4,
      },
      {
        label: 'ยอดขาย Non-Motor (บาท)',
        data: (stats?.monthlySales || []).map(m => m.non_motor_sales),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        maxBarThickness: 35,
        borderRadius: 4,
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
    { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' }, { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' }, { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' }, { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' }, { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' }
  ];

  const currentYr = new Date().getFullYear();
  const years = [currentYr - 2, currentYr - 1, currentYr, currentYr + 1, currentYr + 2];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-graph-up-arrow text-primary me-2"></i> ภาพรวมระบบ (Dashboard)</h2>
        {/* Filter Controls */}
        <div className="d-flex gap-2">
          <select 
            className="form-select fw-bold border-primary text-primary" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>เดือน {m.label}</option>
            ))}
          </select>
          <select 
            className="form-select fw-bold border-primary text-primary" 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
          >
            {years.map(y => (
              <option key={y} value={y}>ปี {y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="row g-4 mb-4">
        {/* Yearly Total Sales */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0 bg-primary text-white">
            <i className="bi bi-graph-up stat-icon text-white opacity-50"></i>
            <div className="stat-value text-white">{formatMoney((parseFloat(stats.salesThisYear) || 0) + (parseFloat(stats.nmSalesThisYear) || 0))}</div>
            <div className="stat-label mb-2 text-white">ยอดรวมสิ้นปี (ปี {filterYear})</div>
            <div className="d-flex justify-content-between small opacity-75">
              <span>M: {formatMoney(stats.salesThisYear)}</span>
              <span>NM: {formatMoney(stats.nmSalesThisYear)}</span>
            </div>
          </div>
        </div>

        {/* Sales Selected Month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-cash-stack stat-icon text-success"></i>
            <div className="stat-value text-success">{formatMoney((parseFloat(stats.salesThisMonth) || 0) + (parseFloat(stats.nmSalesThisMonth) || 0))}</div>
            <div className="stat-label mb-2">ยอดขาย (เดือนที่เลือก)</div>
            <div className="d-flex justify-content-between small text-muted">
              <span>M: {formatMoney(stats.salesThisMonth)}</span>
              <span>NM: {formatMoney(stats.nmSalesThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* Commission Selected Month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-percent stat-icon text-warning"></i>
            <div className="stat-value text-warning">{formatMoney((parseFloat(stats.commThisMonth) || 0) + (parseFloat(stats.nmCommThisMonth) || 0))}</div>
            <div className="stat-label mb-2">คอมมิชชัน (เดือนที่เลือก)</div>
            <div className="d-flex justify-content-between small text-muted">
              <span>M: {formatMoney(stats.commThisMonth)}</span>
              <span>NM: {formatMoney(stats.nmCommThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* New Customers This Month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-people-fill stat-icon text-info"></i>
            <div className="stat-value text-info">{stats.newCustomersThisMonth}</div>
            <div className="stat-label mb-2">ลูกค้าใหม่ (เดือนที่เลือก)</div>
            <div className="small text-muted">ลูกค้าในระบบทั้งหมด: {stats.totalCustomers} ราย</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Cash Sales */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-wallet2 stat-icon text-secondary"></i>
            <div className="stat-value text-secondary">{formatMoney(stats.cashSalesTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดเงินสด (รวม)</div>
          </div>
        </div>
        
        {/* Installment Sales */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-credit-card-fill stat-icon text-primary"></i>
            <div className="stat-value text-primary">{formatMoney(stats.installmentSalesTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดเงินผ่อน (รวม)</div>
          </div>
        </div>
        
        {/* Unpaid / Overdue */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-x-octagon-fill stat-icon text-danger"></i>
            <div className="stat-value text-danger">{formatMoney(stats.unpaidInstallmentTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดค้างชำระผ่อน</div>
            <div className="small text-muted">ลูกค้าค้างชำระ: {stats.overdueCustomersCount || 0} ราย</div>
          </div>
        </div>
        
        {/* Collected this month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-check-circle-fill stat-icon text-success"></i>
            <div className="stat-value text-success">{formatMoney(stats.collectedThisMonth || 0)}</div>
            <div className="stat-label mb-2">ยอดเก็บค่างวด (เดือนที่เลือก)</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">ยอดขายรายเดือน (ปี {filterYear})</h5>
              <div style={{height: '300px'}}>
                <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">สัดส่วนยอดขายรายบริษัท (ปี {filterYear})</h5>
              <div style={{height: '300px'}}>
                <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold text-danger"><i className="bi bi-bell-fill"></i> แจ้งเตือนประกันใกล้หมดอายุ (ภายใน 90 วัน)</h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {stats.expiringPolicies && stats.expiringPolicies.length > 0 ? stats.expiringPolicies.slice(0, 10).map(p => (
                  <li className="list-group-item d-flex justify-content-between align-items-center" key={p.id}>
                    <div>
                      <div className="fw-bold">{p.first_name} {p.last_name}</div>
                      <div className="text-muted small">ทะเบียน: {p.plate_no || '-'} | กรมธรรม์: {p.policy_no}</div>
                    </div>
                    <span className="badge bg-danger rounded-pill">เหลือ {p.days_left} วัน</span>
                  </li>
                )) : (
                  <li className="list-group-item text-center text-muted py-4">ไม่มีรายการแจ้งเตือน</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-trophy-fill text-warning"></i> Top 10 พนักงานขาย (ปี {filterYear})</h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {stats.topSales && stats.topSales.length > 0 ? stats.topSales.map((s, idx) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center" key={idx}>
                    <div>
                      <span className="fw-bold me-2">{idx + 1}.</span> {s.name}
                    </div>
                    <span className="fw-bold text-success">{formatMoney(s.total_sales)}</span>
                  </li>
                )) : (
                  <li className="list-group-item text-center text-muted py-4">ไม่มีข้อมูลพนักงานขาย</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Stats Section */}
      <div className="row g-4 mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-dark text-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-robot me-2 text-info"></i> 
                สถิติการใช้งาน AI OCR ประจำเดือน {months.find(m => m.value == filterMonth)?.label} ปี {filterYear}
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3 border-end">
                  <h6 className="text-muted mb-2">อัปโหลดทั้งหมด</h6>
                  <h2 className="fw-bold text-dark">{stats.aiStats?.total_scans || 0} <span className="fs-6 text-muted">รูป</span></h2>
                </div>
                <div className="col-md-3 border-end">
                  <h6 className="text-muted mb-2">ประมวลผลสำเร็จ</h6>
                  <h2 className="fw-bold text-success">{stats.aiStats?.successful_scans || 0} <span className="fs-6 text-muted">รูป</span></h2>
                </div>
                <div className="col-md-3 border-end">
                  <h6 className="text-muted mb-2">พบข้อผิดพลาด/เตือน</h6>
                  <h2 className="fw-bold text-warning">{stats.aiStats?.warning_scans || 0} <span className="fs-6 text-muted">รายการ</span></h2>
                </div>
                <div className="col-md-3">
                  <h6 className="text-muted mb-2">เวลาเฉลี่ย/รูป</h6>
                  <h2 className="fw-bold text-primary">{((stats.aiStats?.avg_processing_time || 0) / 1000).toFixed(2)} <span className="fs-6 text-muted">วิ</span></h2>
                </div>
              </div>
              
              {stats.aiDocTypes && stats.aiDocTypes.length > 0 && (
                <div className="mt-4 pt-3 border-top">
                  <h6 className="fw-bold mb-3">สัดส่วนเอกสารที่ให้ AI อ่าน (สำเร็จ):</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {stats.aiDocTypes.map((doc, idx) => (
                      <span key={idx} className="badge bg-light text-dark border p-2">
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
              <div className="row mt-4 pt-3 border-top">
                <div className="col-md-6 border-end">
                  <h6 className="fw-bold mb-3"><i className="bi bi-shield-check text-success me-1"></i> ดัชนีความแม่นยำรวมของ AI (Overall AI Accuracy Index)</h6>
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
                          <span className="fw-bold fs-5 text-dark">{accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
                          <div 
                            className={`progress-bar progress-bar-striped progress-bar-animated ${progressColor}`}
                            role="progressbar" 
                            style={{ width: `${accuracy}%` }} 
                            aria-valuenow={accuracy} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <div className="text-muted small mt-2">
                          *ดัชนีวัดจากสัดส่วนของรูปภาพสแกนที่ผู้ใช้งานไม่ต้องทำการแก้ไขหรือกรอกข้อมูลเพิ่มเติมหลังจากที่ AI อ่านข้อมูลเสร็จ
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
                      'customer.id_card_no': 'เลขบัประชาชนลูกค้า',
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
                      return <div className="text-center text-muted py-3">ยังไม่มีข้อมูลการแก้ไขฟิลด์ (ความแม่นยำสมบูรณ์ 100%)</div>;
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

      {/* New Section: Customers for selected month */}
      <div className="row g-4 mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-primary text-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-people-fill me-2"></i> 
                รายชื่อลูกค้าประจำเดือน {months.find(m => m.value == filterMonth)?.label} ปี {filterYear}
              </h5>
              <span className="badge bg-light text-primary">{stats.monthlyCustomers?.length || 0} รายการ</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>ชื่อลูกค้า</th>
                      <th>เบอร์ติดต่อ</th>
                      <th>เลขกรมธรรม์</th>
                      <th>ประเภทประกัน</th>
                      <th>วันแจ้งงาน (คีย์)</th>
                      <th>วันเริ่มคุ้มครอง</th>
                      <th>วันสิ้นสุดคุ้มครอง</th>
                      <th className="text-end">เบี้ยประกัน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyCustomers && stats.monthlyCustomers.length > 0 ? stats.monthlyCustomers.map((cust, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="fw-bold">{cust.first_name} {cust.last_name}</td>
                        <td>{cust.phone}</td>
                        <td>{cust.policy_no || '-'}</td>
                        <td><span className={`badge ${cust.policy_type === 'Motor' ? 'bg-primary' : 'bg-info'}`}>{cust.policy_type}</span></td>
                        <td>{new Date(cust.created_at).toLocaleDateString('th-TH')}</td>
                        <td>{new Date(cust.start_date).toLocaleDateString('th-TH')}</td>
                        <td>{new Date(cust.expiry_date).toLocaleDateString('th-TH')}</td>
                        <td className="text-end fw-bold text-success">{formatMoney(cust.total_premium)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="text-center text-muted py-5">ไม่มีข้อมูลการขายในเดือนที่เลือก</td></tr>
                    )}
                  </tbody>
                  {stats.monthlyCustomers && stats.monthlyCustomers.length > 0 && (
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="8" className="text-end">รวมยอดขายเดือนนี้:</td>
                        <td className="text-end text-success">{formatMoney((parseFloat(stats.salesThisMonth) || 0) + (parseFloat(stats.nmSalesThisMonth) || 0))}</td>
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

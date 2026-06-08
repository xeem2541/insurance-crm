import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
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
    upcomingInstallments: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const barChartData = {
    labels: stats.monthlySales.map(m => `เดือน ${m.month}`),
    datasets: [
      {
        label: 'ยอดขาย Motor (บาท)',
        data: stats.monthlySales.map(m => m.motor_sales),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        maxBarThickness: 35,
        borderRadius: 4,
      },
      {
        label: 'ยอดขาย Non-Motor (บาท)',
        data: stats.monthlySales.map(m => m.non_motor_sales),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        maxBarThickness: 35,
        borderRadius: 4,
      }
    ],
  };

  const pieChartData = {
    labels: stats.topCompanies.map(c => c.company),
    datasets: [
      {
        data: stats.topCompanies.map(c => c.total_sales),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F15BB5'
        ],
      },
    ],
  };

  return (
    <div>
      <h2 className="mb-4 fw-bold">Dashboard (ภาพรวมระบบ)</h2>
      
      <div className="row g-4 mb-4">
        {/* Total Policies */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-file-earmark-text-fill stat-icon"></i>
            <div className="stat-value">{stats.totalPolicies + stats.totalNonMotorPolicies}</div>
            <div className="stat-label mb-2">จำนวนกรมธรรม์รวม</div>
            <div className="d-flex justify-content-between small text-muted">
              <span>Motor: {stats.totalPolicies}</span>
              <span>Non-Motor: {stats.totalNonMotorPolicies}</span>
            </div>
          </div>
        </div>
        
        {/* Sales This Month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-cash-stack stat-icon text-success"></i>
            <div className="stat-value text-success">{formatMoney(stats.salesThisMonth + stats.nmSalesThisMonth)}</div>
            <div className="stat-label mb-2">ยอดขายเดือนนี้ (รวม)</div>
            <div className="d-flex justify-content-between small text-muted">
              <span>M: {formatMoney(stats.salesThisMonth)}</span>
              <span>NM: {formatMoney(stats.nmSalesThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* Commission This Month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-graph-up-arrow stat-icon text-warning"></i>
            <div className="stat-value text-warning">{formatMoney(stats.commThisMonth + stats.nmCommThisMonth)}</div>
            <div className="stat-label mb-2">คอมฯ เดือนนี้ (รวม)</div>
            <div className="d-flex justify-content-between small text-muted">
              <span>M: {formatMoney(stats.commThisMonth)}</span>
              <span>NM: {formatMoney(stats.nmCommThisMonth)}</span>
            </div>
          </div>
        </div>

        {/* Expiring */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-exclamation-triangle-fill stat-icon text-danger"></i>
            <div className="stat-value text-danger">{stats.expiringPolicies.length}</div>
            <div className="stat-label mb-2">ใกล้หมดอายุ</div>
            <div className="small text-muted">ฉบับ (ภายใน 90 วัน)</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Cash Sales */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-wallet2 stat-icon text-info"></i>
            <div className="stat-value text-info">{formatMoney(stats.cashSalesTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดเงินสด</div>
          </div>
        </div>
        
        {/* Installment Sales */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-credit-card-fill stat-icon text-primary"></i>
            <div className="stat-value text-primary">{formatMoney(stats.installmentSalesTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดเงินผ่อนรวม</div>
          </div>
        </div>
        
        {/* Unpaid / Overdue */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-x-octagon-fill stat-icon text-danger"></i>
            <div className="stat-value text-danger">{formatMoney(stats.unpaidInstallmentTotal || 0)}</div>
            <div className="stat-label mb-2">ยอดค้างชำระ</div>
            <div className="small text-muted">ลูกค้าค้างชำระ: {stats.overdueCustomersCount || 0} ราย</div>
          </div>
        </div>
        
        {/* Collected this month */}
        <div className="col-md-3">
          <div className="card stat-card shadow-sm h-100 border-0">
            <i className="bi bi-check-circle-fill stat-icon text-success"></i>
            <div className="stat-value text-success">{formatMoney(stats.collectedThisMonth || 0)}</div>
            <div className="stat-label mb-2">ยอดชำระผ่อน (ด.นี้)</div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">ยอดขายรายเดือน (ปีปัจจุบัน)</h5>
              <div style={{height: '300px'}}>
                <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">สัดส่วนยอดขายรายบริษัท (Top 10)</h5>
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
                {stats.expiringPolicies.length > 0 ? stats.expiringPolicies.slice(0, 10).map(p => (
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
              <h5 className="mb-0 fw-bold"><i className="bi bi-trophy-fill text-warning"></i> Top 10 พนักงานขาย (ยอดขาย)</h5>
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {stats.topSales.length > 0 ? stats.topSales.map((s, idx) => (
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

      <div className="row g-4 mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0 fw-bold text-warning"><i className="bi bi-clock-history"></i> ค่างวดผ่อนใกล้ครบกำหนด (ภายใน 7 วัน)</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ลูกค้า</th>
                      <th>เบอร์โทรศัพท์</th>
                      <th>กรมธรรม์</th>
                      <th>งวดที่</th>
                      <th>วันที่กำหนด</th>
                      <th className="text-end">ยอดชำระ</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcomingInstallments && stats.upcomingInstallments.length > 0 ? stats.upcomingInstallments.map((inst, idx) => (
                      <tr key={idx}>
                        <td>{inst.first_name} {inst.last_name}</td>
                        <td>{inst.phone}</td>
                        <td>{inst.policy_no || '-'}</td>
                        <td><span className="badge bg-secondary">งวด {inst.installment_no}</span></td>
                        <td className="text-danger fw-bold">{new Date(inst.due_date).toLocaleDateString('th-TH')}</td>
                        <td className="text-end fw-bold">{formatMoney(inst.amount)}</td>
                        <td><span className="badge bg-warning text-dark">{inst.status}</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="text-center text-muted py-4">ไม่มีค่างวดที่ใกล้ครบกำหนด</td></tr>
                    )}
                  </tbody>
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

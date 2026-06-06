import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPolicies: 0,
    totalDocuments: 0,
    newCustomersThisMonth: 0,
    salesThisMonth: 0,
    salesThisYear: 0,
    commThisMonth: 0,
    expiringPolicies: [],
    topCompanies: [],
    topSales: [],
    monthlySales: []
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
        label: 'ยอดขายรายเดือน (บาท)',
        data: stats.monthlySales.map(m => m.total_sales),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
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
        <div className="col-md-3">
          <div className="card text-white bg-primary shadow-sm h-100 border-0" style={{background: 'linear-gradient(45deg, #0d6efd, #00d2ff)'}}>
            <div className="card-body">
              <h5 className="card-title">ลูกค้าทั้งหมด</h5>
              <h2 className="display-5 fw-bold">{stats.totalCustomers}</h2>
              <p className="card-text">คน (ใหม่เดือนนี้ {stats.newCustomersThisMonth})</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-success shadow-sm h-100 border-0" style={{background: 'linear-gradient(45deg, #198754, #20c997)'}}>
            <div className="card-body">
              <h5 className="card-title">ยอดขายเดือนนี้</h5>
              <h2 className="display-6 fw-bold">{formatMoney(stats.salesThisMonth)}</h2>
              <p className="card-text">ยอดขายปีนี้: {formatMoney(stats.salesThisYear)}</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-warning shadow-sm h-100 border-0" style={{background: 'linear-gradient(45deg, #ffc107, #ff9800)'}}>
            <div className="card-body">
              <h5 className="card-title">คอมมิชชันเดือนนี้</h5>
              <h2 className="display-6 fw-bold text-dark">{formatMoney(stats.commThisMonth)}</h2>
              <p className="card-text text-dark">คอมมิชชันรวมโดยประมาณ</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white bg-danger shadow-sm h-100 border-0" style={{background: 'linear-gradient(45deg, #dc3545, #f8d7da)'}}>
            <div className="card-body">
              <h5 className="card-title">กรมธรรม์ใกล้หมดอายุ</h5>
              <h2 className="display-5 fw-bold">{stats.expiringPolicies.length}</h2>
              <p className="card-text">ฉบับ (ภายใน 90 วัน)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title fw-bold mb-4">ยอดขายรายเดือน (ปีปัจจุบัน)</h5>
              <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
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
      
    </div>
  );
};

export default Dashboard;

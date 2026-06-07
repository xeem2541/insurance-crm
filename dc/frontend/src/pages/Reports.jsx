import React, { useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [reportType, setReportType] = useState('sales_monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get(`/reports?type=${reportType}&start_date=${startDate}&end_date=${endDate}`);
      setReportData(res.data);
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการโหลดรายงาน');
    }
    setLoading(false);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${reportType}_${startDate}_to_${endDate}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Report: ${reportType}`, 14, 15);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 25);
    
    if (reportData.length > 0) {
      const keys = Object.keys(reportData[0]);
      const data = reportData.map(item => keys.map(k => String(item[k] || '')));
      doc.autoTable({
        startY: 35,
        head: [keys],
        body: data,
        styles: { font: 'helvetica' } // Thai might not render well without a custom font, but basic PDF works.
      });
    }
    
    doc.save(`Report_${reportType}.pdf`);
  };

  if (!['Admin', 'Manager', 'Sales'].includes(user?.role)) {
    return <div className="text-center mt-5 text-danger"><h3>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h3></div>;
  }

  const renderTableHeaders = () => {
    if (reportData.length === 0) return null;
    return (
      <tr>
        {Object.keys(reportData[0]).map(key => (
          <th key={key}>{key}</th>
        ))}
      </tr>
    );
  };

  const renderTableBody = () => {
    return reportData.map((row, index) => (
      <tr key={index}>
        {Object.keys(row).map(key => (
          <td key={key}>{String(row[key])}</td>
        ))}
      </tr>
    ));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">รายงาน (Reports)</h2>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form onSubmit={fetchReport} className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">ประเภทรายงาน</label>
              <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                <optgroup label="Motor Insurance">
                  <option value="sales_daily">ยอดขายรายวัน</option>
                  <option value="sales_monthly">ยอดขายรายเดือน</option>
                  <option value="renewal">ต่ออายุ (90 วัน)</option>
                  <option value="arrears">ค้างชำระ</option>
                </optgroup>
                <optgroup label="Non-Motor Insurance">
                  <option value="non_motor_sales_daily">ยอดขายรายวัน (Non-Motor)</option>
                  <option value="non_motor_sales_monthly">ยอดขายรายเดือน (Non-Motor)</option>
                  <option value="non_motor_renewal">ต่ออายุ (Non-Motor)</option>
                  <option value="non_motor_arrears">ค้างชำระ (Non-Motor)</option>
                </optgroup>
                <optgroup label="Advanced (Unified Data)">
                  <option value="sales_by_person">ยอดขายแยกตามพนักงาน</option>
                  <option value="sales_by_company">ยอดขายแยกตามบริษัท</option>
                  <option value="sales_by_type">ยอดขายแยกตามประเภทประกัน</option>
                </optgroup>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">ตั้งแต่วันที่</label>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">ถึงวันที่</label>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}>
                {loading ? 'กำลังโหลด...' : 'ค้นหารายงาน'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {reportData.length > 0 && (
        <>
          {/* Charts Section */}
          {['sales_daily', 'sales_monthly', 'non_motor_sales_daily', 'non_motor_sales_monthly'].includes(reportType) && (
            <div className="card shadow-sm border-0 mb-4 p-4">
              <h5 className="fw-bold mb-4 text-primary">แนวโน้มยอดขายรวม</h5>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <LineChart data={reportData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={reportType.includes('daily') ? 'date' : 'month'} />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('th-TH').format(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="total_sales" name="ยอดขายรวม (บาท)" stroke="#0d6efd" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {['sales_by_person', 'sales_by_company'].includes(reportType) && (
            <div className="card shadow-sm border-0 mb-4 p-4">
              <h5 className="fw-bold mb-4 text-success">เปรียบเทียบยอดขายรวม</h5>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={reportData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={reportType === 'sales_by_person' ? 'พนักงานขาย' : 'บริษัทประกันภัย'} />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('th-TH').format(value)} />
                    <Legend />
                    <Bar dataKey="ยอดขายรวม" name="ยอดขายรวม (บาท)" fill="#198754" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {reportType === 'sales_by_type' && (
            <div className="card shadow-sm border-0 mb-4 p-4">
              <h5 className="fw-bold mb-4 text-warning">สัดส่วนยอดขายตามประเภทประกันภัย</h5>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={reportData}
                      dataKey="ยอดขายรวม"
                      nameKey="ประเภทประกันภัย"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat('th-TH').format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">ตารางข้อมูล ({reportData.length} รายการ)</h5>
              <div>
                <button className="btn btn-outline-success me-2 fw-bold" onClick={exportExcel}>
                  <i className="bi bi-file-earmark-excel"></i> Export Excel
                </button>
                <button className="btn btn-outline-danger fw-bold" onClick={exportPDF}>
                  <i className="bi bi-file-earmark-pdf"></i> Export PDF
                </button>
              </div>
            </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                {renderTableHeaders()}
              </thead>
              <tbody>
                {renderTableBody()}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default Reports;

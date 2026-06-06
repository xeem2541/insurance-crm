import React, { useState, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
                <option value="sales_daily">ยอดขายรายวัน</option>
                <option value="sales_monthly">ยอดขายรายเดือน</option>
                <option value="renewal">ต่ออายุ (90 วัน)</option>
                <option value="arrears">ค้างชำระ</option>
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
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">ผลลัพธ์การค้นหา ({reportData.length} รายการ)</h5>
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
      )}
    </div>
  );
};

export default Reports;

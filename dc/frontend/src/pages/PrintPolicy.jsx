import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PrintPolicy = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, [id]);

  const fetchPolicy = async () => {
    try {
      const res = await api.get('/policies'); // Fetch all and filter, or we can fetch just one if API supports it
      const found = res.data.find(p => p.id === parseInt(id));
      if (found) {
        setPolicy(found);
        // Wait a tiny bit for the DOM to render, then open the print dialog
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching policy:', error);
    }
  };

  if (!policy) return <div className="p-5 text-center">กำลังโหลดข้อมูลเอกสาร...</div>;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Add styles to hide everything else when printing
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-section, #print-section * {
        visibility: visible;
      }
      #print-section {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      @page { margin: 0.5cm; }
    }
    .a4-container {
      width: 21cm;
      min-height: 29.7cm;
      padding: 2cm;
      margin: 1cm auto;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      font-family: 'Sarabun', 'Prompt', sans-serif;
    }
  `;

  return (
    <div className="bg-light" style={{ minHeight: '100vh', padding: '20px' }}>
      <style>{printStyles}</style>
      
      <div className="mb-3 text-center d-print-none">
        <button className="btn btn-secondary me-2" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i> กลับ
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <i className="bi bi-printer"></i> พิมพ์เอกสาร
        </button>
      </div>

      <div id="print-section" className="a4-container">
        {/* Header */}
        <div className="row mb-5 pb-3 border-bottom border-2 border-dark">
          <div className="col-8">
            <h1 className="fw-bold text-primary mb-1">สำนักงานเปิ้ลประกันภัย</h1>
            <p className="text-muted mb-0">ศูนย์รวมประกันภัย พรบ. และบริการต่อภาษี ครบวงจร</p>
            <p className="text-muted">123 ถ.สุขุมวิท กรุงเทพมหานคร 10110 | โทร: 02-123-4567</p>
          </div>
          <div className="col-4 text-end">
            <h2 className="fw-bold text-uppercase text-secondary">ใบแจ้งหนี้ / ใบเสนอราคา</h2>
            <p className="mb-0"><strong>เลขที่เอกสาร:</strong> INV-{new Date().getFullYear()}{policy.id.toString().padStart(4, '0')}</p>
            <p><strong>วันที่:</strong> {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="row mb-5">
          <div className="col-6">
            <h5 className="fw-bold bg-light p-2 border-start border-primary border-4">ข้อมูลลูกค้า</h5>
            <p className="mb-1"><strong>ชื่อ-นามสกุล:</strong> {policy.first_name} {policy.last_name}</p>
            <p className="mb-1"><strong>เบอร์โทรศัพท์:</strong> {policy.phone || '-'}</p>
            <p className="mb-1"><strong>อีเมล:</strong> {policy.email || '-'}</p>
          </div>
          <div className="col-6 text-end">
            <h5 className="fw-bold bg-light p-2 border-start border-primary border-4 text-start">ข้อมูลรถยนต์</h5>
            <p className="mb-1 text-start"><strong>เลขทะเบียน:</strong> <span className="fs-5 fw-bold">{policy.plate_no || '-'}</span></p>
            <p className="mb-1 text-start"><strong>ยี่ห้อรถ/รุ่น:</strong> {policy.brand || '-'} {policy.model || '-'}</p>
            <p className="mb-1 text-start"><strong>ปีจดทะเบียน:</strong> {policy.year || '-'}</p>
          </div>
        </div>

        {/* Policy Details */}
        <h5 className="fw-bold mb-3">รายการกรมธรรม์</h5>
        <table className="table table-bordered border-dark mb-5">
          <thead className="table-light border-dark">
            <tr className="text-center">
              <th width="10%">ลำดับ</th>
              <th width="45%">รายการ</th>
              <th width="20%">บริษัทประกัน</th>
              <th width="25%">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">1</td>
              <td>
                <strong>ประกันภัยชั้น {policy.type}</strong><br/>
                <small className="text-muted">
                  เลขที่กรมธรรม์: {policy.policy_no}<br/>
                  ระยะเวลาคุ้มครอง: {formatDate(policy.start_date)} ถึง {formatDate(policy.expiry_date)}
                </small>
              </td>
              <td className="text-center">{policy.company}</td>
              <td className="text-end fw-bold">{new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(policy.premium)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="text-end fw-bold">ยอดรวมสุทธิ</td>
              <td className="text-end fw-bold fs-5 text-primary">{formatMoney(policy.premium)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer & Signature */}
        <div className="row mt-5 pt-5">
          <div className="col-6 text-center">
            <p className="mb-5">ลงชื่อผู้รับเงิน ......................................................</p>
            <p>(......................................................)</p>
            <p>วันที่ ......../......../........</p>
          </div>
          <div className="col-6 text-center">
            <p className="mb-5">ลงชื่อผู้มีอำนาจลงนาม ........................................</p>
            <p><strong>สำนักงานเปิ้ลประกันภัย</strong></p>
            <p>วันที่ ......../......../........</p>
          </div>
        </div>
        
        <div className="text-center mt-5 pt-3 border-top text-muted" style={{ fontSize: '12px' }}>
          <p>ขอขอบพระคุณที่ไว้วางใจให้ สำนักงานเปิ้ลประกันภัย ดูแลคุณ</p>
          <p>หากมีข้อสงสัยเกี่ยวกับกรมธรรม์ กรุณาติดต่อ 02-123-4567 หรือ LINE: @apple-insurance</p>
        </div>
      </div>
    </div>
  );
};

export default PrintPolicy;

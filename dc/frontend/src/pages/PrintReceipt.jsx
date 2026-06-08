import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PrintReceipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        const res = await api.get(`/payments/installments/${id}`);
        setData(res.data);
        setTimeout(() => {
          window.print();
        }, 500);
      } catch (error) {
        alert('ไม่สามารถโหลดข้อมูลใบเสร็จได้');
        navigate('/payments');
      }
    };
    fetchReceiptData();
  }, [id, navigate]);

  if (!data) return <div className="text-center p-5">กำลังเตรียมใบเสร็จ...</div>;

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px' }} className="d-flex justify-content-center print-wrapper">
      <style>
        {`
          @media print {
            body { background: white !important; margin: 0; padding: 0; }
            .print-wrapper { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
            .receipt-box { border: none !important; box-shadow: none !important; max-width: 100% !important; }
            @page { size: A4; margin: 15mm; }
          }
        `}
      </style>
      <div className="receipt-box bg-white p-5 rounded" style={{ width: '800px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0 text-primary">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</h2>
            <p className="text-muted mb-0">Receipt / Tax Invoice (Abbreviated)</p>
          </div>
          <div className="text-end">
            <h1 className="fw-bold text-dark mb-0">Apple Insurance & Services</h1>
            <p className="text-muted mb-0">สำนักงานเปิ้ลประกันภัย (บริการครบ... จบที่เดียว)</p>
            <p className="text-muted mb-0">123 ถนนสุขุมวิท กรุงเทพมหานคร 10110</p>
          </div>
        </div>

        <hr className="mb-4" />

        <div className="row mb-4">
          <div className="col-8">
            <h5 className="fw-bold mb-2">ได้รับเงินจาก:</h5>
            <p className="mb-1"><strong>ชื่อ-นามสกุล:</strong> {data.first_name} {data.last_name}</p>
            <p className="mb-1"><strong>ที่อยู่:</strong> {data.address} {data.subdistrict} {data.district} {data.province} {data.zipcode}</p>
            <p className="mb-0"><strong>เบอร์โทรศัพท์:</strong> {data.phone}</p>
          </div>
          <div className="col-4">
            <p className="mb-1"><strong>เลขที่ใบเสร็จ:</strong> RC-{new Date().getFullYear()}-{String(data.id).padStart(4, '0')}</p>
            <p className="mb-1"><strong>วันที่ชำระเงิน:</strong> {new Date(data.payment_date || new Date()).toLocaleDateString('th-TH')}</p>
            <p className="mb-0"><strong>ผู้รับเงิน:</strong> {data.sales_person || 'System'}</p>
          </div>
        </div>

        <div className="table-responsive mb-4">
          <table className="table table-bordered">
            <thead className="table-light text-center">
              <tr>
                <th width="10%">ลำดับ</th>
                <th width="40%">รายการ (Description)</th>
                <th width="30%">เลขกรมธรรม์ / อ้างอิง</th>
                <th width="20%">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center">1</td>
                <td>
                  ชำระค่างวดที่ {data.installment_no} <br/>
                  <small className="text-muted">({data.company})</small>
                </td>
                <td className="text-center">{data.policy_no}</td>
                <td className="text-end">{(Number(data.paid_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" className="text-end fw-bold">ยอดรวมสุทธิ (Total Amount)</td>
                <td className="text-end fw-bold fs-5">฿{(Number(data.paid_amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="row mt-5 pt-4">
          <div className="col-6 text-center">
            <div style={{ borderBottom: '1px solid #000', width: '200px', margin: '0 auto 10px' }}></div>
            <p className="mb-0">({data.first_name} {data.last_name})</p>
            <p className="text-muted">ผู้ชำระเงิน</p>
          </div>
          <div className="col-6 text-center">
            <div style={{ borderBottom: '1px solid #000', width: '200px', margin: '0 auto 10px' }}></div>
            <p className="mb-0">({data.sales_person || '...................................'})</p>
            <p className="text-muted">ผู้รับเงิน / พนักงานบัญชี</p>
          </div>
        </div>

        <div className="text-center mt-5 no-print">
          <button className="btn btn-primary px-4 me-2" onClick={() => window.print()}>
            <i className="bi bi-printer me-2"></i>พิมพ์เอกสาร
          </button>
          <button className="btn btn-secondary px-4" onClick={() => navigate('/payments')}>
            <i className="bi bi-arrow-left me-2"></i>กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipt;

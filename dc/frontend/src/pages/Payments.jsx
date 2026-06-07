import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal, Button, Form, Badge, Row, Col } from 'react-bootstrap';
import * as XLSX from 'xlsx';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, เงินสด, เงินผ่อน
  const [searchTerm, setSearchTerm] = useState('');

  // Installment Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loadingInst, setLoadingInst] = useState(false);

  // Mark as Paid State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);
  const [payData, setPayData] = useState({ paid_amount: '', payment_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
      alert('ไม่สามารถดึงข้อมูลการชำระเงินได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallments = async (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
    setLoadingInst(true);
    try {
      const res = await api.get(`/payments/${payment.id}/installments`);
      setInstallments(res.data);
    } catch (error) {
      console.error(error);
      alert('ไม่สามารถดึงข้อมูลค่างวดได้');
    } finally {
      setLoadingInst(false);
    }
  };

  const handleOpenPayModal = (inst) => {
    setSelectedInst(inst);
    setPayData({ paid_amount: inst.amount, payment_date: new Date().toISOString().split('T')[0] });
    setShowPayModal(true);
  };

  const handlePayInstallment = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/payments/installments/${selectedInst.id}`, payData);
      alert('บันทึกรับชำระเงินสำเร็จ');
      setShowPayModal(false);
      // Refresh installments and main list
      fetchInstallments(selectedPayment);
      fetchPayments();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleMarkCashPaid = async (id) => {
    if (window.confirm('ยืนยันว่าลูกค้าชำระเงินสดครบถ้วนแล้ว?')) {
      try {
        await api.put(`/payments/${id}`, { status: 'ชำระครบแล้ว' });
        alert('บันทึกรับชำระเงินสำเร็จ');
        fetchPayments();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลการชำระเงินนี้หรือไม่?')) {
      try {
        await api.delete(`/payments/${id}`);
        fetchPayments();
      } catch (error) {
        alert(error.response?.data?.error || 'ไม่มีสิทธิ์ลบข้อมูล');
      }
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(payments);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, `Payments_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredData = payments.filter(p => {
    const matchFilter = filter === 'all' ? true : p.payment_method === filter;
    const searchString = `${p.first_name} ${p.last_name} ${p.policy_no} ${p.customer_code}`.toLowerCase();
    const matchSearch = searchString.includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const getStatusBadge = (status) => {
    if (status === 'ชำระครบแล้ว') return <Badge bg="success">ชำระครบแล้ว</Badge>;
    if (status === 'กำลังผ่อนชำระ') return <Badge bg="primary">กำลังผ่อนชำระ</Badge>;
    if (status === 'รอชำระ') return <Badge bg="warning" text="dark">รอชำระ</Badge>;
    if (status === 'เลยกำหนด') return <Badge bg="danger">เลยกำหนด</Badge>;
    return <Badge bg="secondary">{status}</Badge>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-wallet2 text-success me-2"></i> ระบบรับชำระเงิน</h2>
        <Button variant="outline-success" className="fw-bold" onClick={handleExport}>
          <i className="bi bi-file-earmark-excel-fill me-1"></i> ส่งออก Excel
        </Button>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Form.Control 
                type="text" 
                placeholder="ค้นหาชื่อลูกค้า, ทะเบียนกรมธรรม์..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <div className="btn-group w-100">
                <Button variant={filter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setFilter('all')}>ทั้งหมด</Button>
                <Button variant={filter === 'เงินสด' ? 'success' : 'outline-success'} onClick={() => setFilter('เงินสด')}>เงินสด</Button>
                <Button variant={filter === 'เงินผ่อน' ? 'info' : 'outline-info'} onClick={() => setFilter('เงินผ่อน')}>เงินผ่อน</Button>
              </div>
            </Col>
          </Row>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>วันที่สร้าง</th>
                  <th>เลขกรมธรรม์</th>
                  <th>ชื่อลูกค้า</th>
                  <th>ยอดรวม</th>
                  <th>รูปแบบ</th>
                  <th>สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">ไม่พบข้อมูลการชำระเงิน</td></tr>
                ) : (
                  filteredData.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString('th-TH')}</td>
                      <td className="fw-bold text-primary">{p.policy_no || '-'}</td>
                      <td>{p.first_name} {p.last_name}</td>
                      <td className="fw-bold">฿{(Number(p.total_premium)||0).toLocaleString()}</td>
                      <td>
                        {p.payment_method === 'เงินสด' ? (
                          <span className="text-success fw-bold"><i className="bi bi-cash me-1"></i>เงินสด</span>
                        ) : (
                          <span className="text-info fw-bold"><i className="bi bi-credit-card me-1"></i>เงินผ่อน ({p.installments} งวด)</span>
                        )}
                      </td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td className="text-center">
                        {p.payment_method === 'เงินผ่อน' ? (
                          <Button variant="outline-primary" size="sm" onClick={() => fetchInstallments(p)}>
                            <i className="bi bi-list-check me-1"></i> ตารางผ่อน
                          </Button>
                        ) : (
                          p.status !== 'ชำระครบแล้ว' && (
                            <Button variant="success" size="sm" onClick={() => handleMarkCashPaid(p.id)}>
                              <i className="bi bi-check-circle me-1"></i> รับชำระ
                            </Button>
                          )
                        )}
                        <Button variant="outline-danger" size="sm" className="ms-2" onClick={() => handleDelete(p.id)} title="ลบรายการ">
                          <i className="bi bi-trash3"></i>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Installment Schedule Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold text-primary">
            <i className="bi bi-calendar-week me-2"></i>ตารางผ่อนชำระ: {selectedPayment?.first_name} {selectedPayment?.last_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between mb-3 p-3 bg-light rounded">
            <div>
              <span className="text-muted d-block small">เลขกรมธรรม์</span>
              <strong className="fs-5">{selectedPayment?.policy_no || '-'}</strong>
            </div>
            <div className="text-end">
              <span className="text-muted d-block small">ยอดรวมทั้งหมด</span>
              <strong className="fs-5 text-success">฿{(Number(selectedPayment?.total_premium)||0).toLocaleString()}</strong>
            </div>
          </div>

          {loadingInst ? (
            <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered text-center align-middle">
                <thead className="table-light">
                  <tr>
                    <th>งวดที่</th>
                    <th>ดิวเดต</th>
                    <th>ยอดเรียกเก็บ</th>
                    <th>ยอดที่ชำระ</th>
                    <th>วันที่ชำระ</th>
                    <th>สถานะ</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map(inst => (
                    <tr key={inst.id} className={inst.status === 'ชำระแล้ว' ? 'table-success opacity-75' : ''}>
                      <td><Badge bg="secondary" className="fs-6 px-3">{inst.installment_no}</Badge></td>
                      <td className="text-danger fw-bold">{new Date(inst.due_date).toLocaleDateString('th-TH')}</td>
                      <td className="fw-bold">฿{Number(inst.amount).toLocaleString()}</td>
                      <td className="text-success fw-bold">{inst.paid_amount > 0 ? `฿${Number(inst.paid_amount).toLocaleString()}` : '-'}</td>
                      <td>{inst.payment_date ? new Date(inst.payment_date).toLocaleDateString('th-TH') : '-'}</td>
                      <td>{getStatusBadge(inst.status)}</td>
                      <td>
                        {inst.status !== 'ชำระแล้ว' ? (
                          <Button variant="success" size="sm" onClick={() => handleOpenPayModal(inst)}>
                            <i className="bi bi-cash-stack me-1"></i> รับชำระ
                          </Button>
                        ) : (
                          <Button variant="outline-secondary" size="sm" onClick={() => window.print()}>
                            <i className="bi bi-printer"></i> พิมพ์ใบเสร็จ
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Pay Installment Modal */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title><i className="bi bi-cash-coin me-2"></i> บันทึกรับชำระค่างวด</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePayInstallment}>
          <Modal.Body>
            <div className="text-center mb-4">
              <h5 className="text-muted">ยอดที่ต้องชำระงวดที่ {selectedInst?.installment_no}</h5>
              <h1 className="text-success display-4 fw-bold mb-0">฿{Number(selectedInst?.amount).toLocaleString()}</h1>
            </div>
            
            <Form.Group className="mb-3">
              <Form.Label>วันที่รับชำระ</Form.Label>
              <Form.Control 
                type="date" 
                required 
                value={payData.payment_date} 
                onChange={(e) => setPayData({...payData, payment_date: e.target.value})}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>จำนวนเงินที่รับจริง (บาท)</Form.Label>
              <Form.Control 
                type="number" 
                step="0.01" 
                required 
                value={payData.paid_amount} 
                onChange={(e) => setPayData({...payData, paid_amount: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowPayModal(false)}>ยกเลิก</Button>
            <Button variant="success" type="submit" className="fw-bold px-4">
              <i className="bi bi-check-circle me-2"></i> ยืนยันการรับเงิน
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Payments;

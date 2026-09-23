import { Modal, Button, Form, Badge } from 'react-bootstrap';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543;
  return `${day}/${month}/${year}`;
};

const getStatusBadge = (status) => {
  if (status === 'ชำระครบแล้ว' || status === 'ชำระแล้ว') return <Badge bg="success">{status}</Badge>;
  if (status === 'กำลังผ่อนชำระ') return <Badge bg="primary">กำลังผ่อนชำระ</Badge>;
  if (status === 'รอชำระ') return <Badge bg="warning" text="dark">รอชำระ</Badge>;
  if (status === 'เลยกำหนด') return <Badge bg="danger">เลยกำหนด</Badge>;
  return <Badge bg="secondary">{status}</Badge>;
};

export const InstallmentScheduleModal = ({
  show,
  onHide,
  selectedPayment,
  installments,
  loadingInst,
  handleOpenPayModal
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
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
                    <td className="text-danger fw-bold">{formatThaiDate(inst.due_date)}</td>
                    <td className="fw-bold">฿{Number(inst.amount).toLocaleString()}</td>
                    <td className="text-success fw-bold">{inst.paid_amount > 0 ? `฿${Number(inst.paid_amount).toLocaleString()}` : '-'}</td>
                    <td>{inst.payment_date ? formatThaiDate(inst.payment_date) : '-'}</td>
                    <td>{getStatusBadge(inst.status)}</td>
                    <td>
                      {inst.status !== 'ชำระแล้ว' ? (
                        <Button variant="success" size="sm" onClick={() => handleOpenPayModal(inst)}>
                          <i className="bi bi-cash-stack me-1"></i> รับชำระ
                        </Button>
                      ) : (
                        <Button variant="outline-secondary" size="sm" onClick={() => window.open(`/print-receipt/${inst.id}`, '_blank')}>
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
  );
};

export const PayInstallmentModal = ({
  show,
  onHide,
  selectedInst,
  payData,
  setPayData,
  handlePayInstallment
}) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
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
          <Button variant="secondary" onClick={onHide}>ยกเลิก</Button>
          <Button variant="success" type="submit" className="fw-bold px-4">
            <i className="bi bi-check-circle me-2"></i> ยืนยันการรับเงิน
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

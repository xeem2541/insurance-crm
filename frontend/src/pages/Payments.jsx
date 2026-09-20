import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button, Form, Badge, Row, Col } from 'react-bootstrap';
import { TableSkeleton, tableContainerVariants, tableRowVariants } from '../components/TableSkeleton';
import { exportToExcel } from '../utils/exportUtils';
import { motion } from 'framer-motion';
import { InstallmentScheduleModal, PayInstallmentModal } from '../components/PaymentModals';

const formatThaiDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() + 543; // convert to Buddhist Era
  return `${day}/${month}/${year}`;
};

const getStatusBadge = (status) => {
  if (status === 'ชำระครบแล้ว' || status === 'ชำระแล้ว') return <Badge bg="success">{status}</Badge>;
  if (status === 'กำลังผ่อนชำระ') return <Badge bg="primary">กำลังผ่อนชำระ</Badge>;
  if (status === 'รอชำระ') return <Badge bg="warning" text="dark">รอชำระ</Badge>;
  if (status === 'เลยกำหนด') return <Badge bg="danger">เลยกำหนด</Badge>;
  return <Badge bg="secondary">{status}</Badge>;
};

const Payments = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, เงินสด, เงินผ่อน
  const [searchTerm, setSearchTerm] = useState('');

  // Installment Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Mark as Paid State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);
  const [payData, setPayData] = useState({ paid_amount: '', payment_date: new Date().toISOString().split('T')[0] });

  const { data: payments = [], isLoading: loading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await api.get('/payments');
      return res.data;
    }
  });

  const { data: installments = [], isLoading: loadingInst } = useQuery({
    queryKey: ['installments', selectedPayment?.id],
    queryFn: async () => {
      if (!selectedPayment?.id) return [];
      const res = await api.get(`/payments/${selectedPayment.id}/installments`);
      return res.data;
    },
    enabled: !!selectedPayment?.id
  });

  const fetchInstallments = (payment) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  const markCashPaidMutation = useMutation({
    mutationFn: async (id) => {
      return await api.put(`/payments/${id}`, { status: 'ชำระครบแล้ว' });
    },
    onSuccess: () => {
      alert('บันทึกรับชำระเงินสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const handleMarkCashPaid = (id) => {
    if (window.confirm('ยืนยันว่าลูกค้าชำระเงินสดครบถ้วนแล้ว?')) {
      markCashPaidMutation.mutate(id);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'ไม่มีสิทธิ์ลบข้อมูล');
    }
  });

  const handleDelete = (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลการชำระเงินนี้หรือไม่?')) {
      deleteMutation.mutate(id);
    }
  };

  const payInstallmentMutation = useMutation({
    mutationFn: async (data) => {
      return await api.put(`/payments/installments/${selectedInst.id}`, data);
    },
    onSuccess: () => {
      alert('บันทึกรับชำระเงินสำเร็จ');
      setShowPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['installments', selectedPayment?.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  });

  const handleOpenPayModal = (inst) => {
    setSelectedInst(inst);
    const suggestAmount = inst.balance_amount !== undefined && inst.balance_amount !== null ? inst.balance_amount : inst.amount;
    setPayData({ paid_amount: suggestAmount, payment_date: new Date().toISOString().split('T')[0] });
    setShowPayModal(true);
  };

  const handlePayInstallment = (e) => {
    e.preventDefault();
    payInstallmentMutation.mutate(payData);
  };

  const handleExport = () => {
    exportToExcel(payments, 'Payments', `Payments_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredData = payments.filter(p => {
    const matchFilter = filter === 'all' ? true : p.payment_method === filter;
    const searchString = `${p.first_name} ${p.last_name} ${p.policy_no} ${p.customer_code}`.toLowerCase();
    const matchSearch = searchString.includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

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

          <div className="table-container-enterprise mt-3">
            <div className="table-responsive">
              <table className="table table-enterprise align-middle mb-0">
                <thead>
                  <tr>
                    <th>วันที่สร้าง</th>
                    <th>เลขกรมธรรม์</th>
                    <th>ชื่อลูกค้า</th>
                    <th>ยอดรวม</th>
                    <th>รูปแบบ</th>
                    <th>สถานะ</th>
                    <th className="text-end">จัดการ</th>
                  </tr>
                </thead>
                {loading ? (
                  <TableSkeleton rows={6} columns={7} />
                ) : (
                  <motion.tbody
                    variants={tableContainerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan="7">
                          <div className="table-empty-state">
                            <i className="bi bi-inbox empty-icon"></i>
                            <div className="empty-title">ไม่พบข้อมูลการชำระเงิน</div>
                            <div className="empty-desc">ลองเปลี่ยนตัวกรอง หรือค้นหาด้วยชื่อหรือเลขกรมธรรม์</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map(p => (
                        <motion.tr key={p.id} variants={tableRowVariants}>
                          <td>{formatThaiDate(p.created_at)}</td>
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
                          <td className="text-end">
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
                        </motion.tr>
                      ))
                    )}
                  </motion.tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      <InstallmentScheduleModal
        show={showModal}
        onHide={() => setShowModal(false)}
        selectedPayment={selectedPayment}
        installments={installments}
        loadingInst={loadingInst}
        handleOpenPayModal={handleOpenPayModal}
      />

      <PayInstallmentModal
        show={showPayModal}
        onHide={() => setShowPayModal(false)}
        selectedInst={selectedInst}
        payData={payData}
        setPayData={setPayData}
        handlePayInstallment={handlePayInstallment}
      />
    </div>
  );
};

export default Payments;

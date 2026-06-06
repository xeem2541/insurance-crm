import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

const categories = [
  { id: 'PolicyType', label: 'ประเภทประกันภัย (Policy Type)' },
  { id: 'InsuranceCompany', label: 'บริษัทประกันภัย (Insurance Company)' },
  { id: 'VehicleType', label: 'ประเภทรถ (Vehicle Type)' },
  { id: 'JobStatus', label: 'สถานะงาน (Job Status)' },
  { id: 'PaymentMethod', label: 'วิธีชำระเงิน (Payment Method)' },
];

const MasterData = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(categories[0].id);
  const [dataList, setDataList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, category: categories[0].id, value: '' });

  const fetchData = async () => {
    try {
      const res = await api.get(`/master-data?category=${activeTab}`);
      setDataList(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setFormData({ id: item.id, category: item.category, value: item.value });
    } else {
      setFormData({ id: null, category: activeTab, value: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await api.put(`/master-data/${formData.id}`, { value: formData.value });
      } else {
        await api.post('/master-data', { category: formData.category, value: formData.value });
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้หรือไม่?')) {
      try {
        await api.delete(`/master-data/${id}`);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
      }
    }
  };

  if (user?.role !== 'Admin') {
    return <div className="text-center mt-5 text-danger"><h3>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h3></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">จัดการข้อมูลระบบ (Master Data)</h2>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs px-3 pt-3 border-bottom-0">
            {categories.map(cat => (
              <li className="nav-item" key={cat.id}>
                <button
                  className={`nav-link fw-bold ${activeTab === cat.id ? 'active text-primary border-bottom-0' : 'text-muted'}`}
                  onClick={() => setActiveTab(cat.id)}
                  style={{ borderRadius: '10px 10px 0 0' }}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-4">
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
              + เพิ่มรายการ
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle border">
              <thead className="table-light">
                <tr>
                  <th width="80%">ค่าที่แสดงผล (Value)</th>
                  <th width="20%" className="text-end">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {dataList.length > 0 ? dataList.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.value}</strong></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(item)}>
                        <i className="bi bi-pencil"></i> แก้ไข
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)}>
                        <i className="bi bi-trash"></i> ลบ
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="2" className="text-center py-4">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>หมวดหมู่</Form.Label>
              <Form.Control type="text" value={categories.find(c => c.id === formData.category)?.label} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>ค่าที่แสดงผล (Value)</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.value} 
                onChange={(e) => setFormData({...formData, value: e.target.value})} 
                required 
                autoFocus
              />
            </Form.Group>
            <div className="text-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit">บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MasterData;

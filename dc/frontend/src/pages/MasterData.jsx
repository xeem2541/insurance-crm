import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

const categories = [
  { id: 'PolicyType', label: 'ประเภทประกันภัย' },
  { id: 'InsuranceCompany', label: 'บริษัทประกันภัย' },
  { id: 'VehicleType', label: 'ประเภทรถ' },
  { id: 'JobStatus', label: 'สถานะงาน' },
  { id: 'PaymentMethod', label: 'วิธีชำระเงิน' },
];

const MasterData = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(categories[0].id);
  const [dataList, setDataList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, category: categories[0].id, value: '' });

  // For password change
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  const fetchData = async () => {
    if (activeTab === 'system_clear' || activeTab === 'system_password') return;
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

  const handleClearData = async () => {
    if (window.confirm('⚠️ คำเตือน: การกระทำนี้จะลบข้อมูลลูกค้า, รถยนต์, และกรมธรรม์ทั้งหมดออกจากระบบอย่างถาวร (ยอดขายจะกลับเป็น 0)\n\nคุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูล?')) {
      try {
        const res = await api.post('/master-data/clear-mock');
        alert(res.data.message || 'ล้างข้อมูลสำเร็จ');
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการล้างข้อมูล');
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      return setPwdMsg({ type: 'danger', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
    }
    if (pwdData.newPassword.length < 6) {
      return setPwdMsg({ type: 'danger', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    }

    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword
      });
      setPwdMsg({ type: 'success', text: res.data.message || 'เปลี่ยนรหัสผ่านสำเร็จ!' });
      setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPwdMsg({ type: 'danger', text: error.response?.data?.error || 'เกิดข้อผิดพลาด' });
    }
  };

  if (user?.role !== 'Admin') {
    return <div className="text-center mt-5 text-danger"><h3>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h3></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold"><i className="bi bi-gear-fill text-primary me-2"></i> ตั้งค่าระบบ (System Settings)</h2>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs px-3 pt-3 border-bottom-0 d-flex flex-wrap">
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
            <li className="nav-item ms-auto">
              <button
                className={`nav-link fw-bold ${activeTab === 'system_password' ? 'active text-primary border-bottom-0' : 'text-muted'}`}
                onClick={() => setActiveTab('system_password')}
                style={{ borderRadius: '10px 10px 0 0' }}
              >
                <i className="bi bi-key-fill me-1"></i> เปลี่ยนรหัสผ่าน
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link fw-bold ${activeTab === 'system_clear' ? 'active text-danger border-bottom-0' : 'text-danger opacity-75'}`}
                onClick={() => setActiveTab('system_clear')}
                style={{ borderRadius: '10px 10px 0 0' }}
              >
                <i className="bi bi-trash3-fill me-1"></i> ล้างข้อมูลระบบ
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body p-4">
          
          {/* Master Data Tab Content */}
          {!['system_clear', 'system_password'].includes(activeTab) && (
            <>
              <div className="d-flex justify-content-end mb-3">
                <button className="btn btn-primary fw-bold" onClick={() => handleOpenModal()}>
                  <i className="bi bi-plus-lg me-1"></i> เพิ่มรายการ
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
                      <tr><td colSpan="2" className="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Change Password Tab Content */}
          {activeTab === 'system_password' && (
            <div className="row justify-content-center py-4">
              <div className="col-md-6">
                <h4 className="fw-bold mb-4">เปลี่ยนรหัสผ่านผู้ดูแลระบบ</h4>
                {pwdMsg.text && (
                  <div className={`alert alert-${pwdMsg.type} shadow-sm border-0`} role="alert">
                    {pwdMsg.type === 'success' ? <i className="bi bi-check-circle-fill me-2"></i> : <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                    {pwdMsg.text}
                  </div>
                )}
                <Form onSubmit={handleChangePassword}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">รหัสผ่านปัจจุบัน</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={pwdData.currentPassword}
                      onChange={(e) => setPwdData({...pwdData, currentPassword: e.target.value})}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={pwdData.newPassword}
                      onChange={(e) => setPwdData({...pwdData, newPassword: e.target.value})}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">ยืนยันรหัสผ่านใหม่</Form.Label>
                    <Form.Control 
                      type="password" 
                      value={pwdData.confirmPassword}
                      onChange={(e) => setPwdData({...pwdData, confirmPassword: e.target.value})}
                      required
                    />
                  </Form.Group>
                  <Button variant="primary" type="submit" className="w-100 fw-bold py-2">
                    บันทึกรหัสผ่านใหม่
                  </Button>
                </Form>
              </div>
            </div>
          )}

          {/* Clear Data Tab Content */}
          {activeTab === 'system_clear' && (
            <div className="text-center py-5">
              <i className="bi bi-exclamation-octagon-fill text-danger" style={{ fontSize: '4rem' }}></i>
              <h3 className="fw-bold text-danger mt-3 mb-3">ล้างข้อมูลทั้งหมดในระบบ (Clear Data)</h3>
              <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
                ฟังก์ชันนี้จะทำการ <strong className="text-dark">ลบรายชื่อลูกค้า, รถยนต์, กรมธรรม์ และตารางงานทั้งหมด</strong> ออกจากฐานข้อมูลอย่างถาวร 
                เหมาะสำหรับใช้ล้าง "ข้อมูลจำลอง" เพื่อเตรียมเริ่มต้นกรอกข้อมูลลูกค้าจริง
              </p>
              <div className="alert alert-warning d-inline-block text-start mb-4 shadow-sm border-0">
                <strong>⚠️ คำเตือน:</strong> ข้อมูลที่ถูกลบไปแล้วจะไม่สามารถกู้คืนได้ โปรดใช้งานด้วยความระมัดระวัง
              </div>
              <br/>
              <button className="btn btn-danger btn-lg fw-bold px-5 shadow-sm" onClick={handleClearData}>
                <i className="bi bi-trash3-fill me-2"></i> ยืนยันการล้างข้อมูลทั้งหมด
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Modal for Master Data */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">{formData.id ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted">หมวดหมู่</Form.Label>
              <Form.Control type="text" value={categories.find(c => c.id === formData.category)?.label} disabled className="bg-light" />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">ค่าที่แสดงผล (Value)</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.value} 
                onChange={(e) => setFormData({...formData, value: e.target.value})} 
                required 
                autoFocus
              />
            </Form.Group>
            <div className="text-end">
              <Button variant="light" className="me-2 fw-bold" onClick={() => setShowModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit" className="fw-bold px-4 shadow-sm">บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MasterData;

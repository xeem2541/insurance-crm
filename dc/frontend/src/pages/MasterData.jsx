import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
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

  // For User Management
  const [usersList, setUsersList] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({ id: null, username: '', password: '', name: '', role: 'Sales' });

  const fetchData = async () => {
    if (activeTab === 'system_clear' || activeTab === 'system_password' || activeTab === 'system_users') {
      if (activeTab === 'system_users') fetchUsers();
      return;
    }
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

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsersList(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenUserModal = (item = null) => {
    if (item) {
      setUserFormData({ id: item.id, username: item.username, password: '', name: item.name, role: item.role });
    } else {
      setUserFormData({ id: null, username: '', password: '', name: '', role: 'Sales' });
    }
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (userFormData.id) {
        const payload = { name: userFormData.name, role: userFormData.role };
        if (userFormData.password) payload.password = userFormData.password;
        await api.put(`/users/${userFormData.id}`, payload);
      } else {
        if (!userFormData.password) return alert('กรุณากรอกรหัสผ่าน');
        await api.post('/users', userFormData);
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการจัดการผู้ใช้งาน');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('คุณต้องการลบผู้ใช้งานท่านนี้ออกจากระบบหรือไม่?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาด');
      }
    }
  };

  const handleClearData = async () => {
    const selectedTables = formData.clearTables || [];
    if (selectedTables.length === 0) {
      return alert('กรุณาเลือกข้อมูลที่ต้องการลบอย่างน้อย 1 รายการ');
    }

    if (window.confirm('⚠️ คำเตือน: ข้อมูลที่เลือกจะถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้\n\nคุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?')) {
      try {
        const res = await api.post('/master-data/clear-mock', { tables: selectedTables });
        alert(res.data.message || 'ล้างข้อมูลสำเร็จ');
        // Reset selection after clear
        setFormData(prev => ({ ...prev, clearTables: [] }));
        // Uncheck all checkboxes visually
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      } catch (error) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการล้างข้อมูล');
      }
    }
  };

  const handleBackupExcel = async () => {
    try {
      const [custRes, vehRes, polRes] = await Promise.all([
        api.get('/customers'),
        api.get('/vehicles'),
        api.get('/policies')
      ]);

      const wb = XLSX.utils.book_new();

      if (custRes.data && custRes.data.length > 0) {
        const wsCust = XLSX.utils.json_to_sheet(custRes.data);
        XLSX.utils.book_append_sheet(wb, wsCust, "Customers");
      }
      if (vehRes.data && vehRes.data.length > 0) {
        const wsVeh = XLSX.utils.json_to_sheet(vehRes.data);
        XLSX.utils.book_append_sheet(wb, wsVeh, "Vehicles");
      }
      if (polRes.data && polRes.data.length > 0) {
        const wsPol = XLSX.utils.json_to_sheet(polRes.data);
        XLSX.utils.book_append_sheet(wb, wsPol, "Policies");
      }

      if (wb.SheetNames.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ "Message": "No Data" }]), "Empty");
      }

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Backup_CRM_${dateStr}.xlsx`);

    } catch (error) {
      alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการสำรองข้อมูล');
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
                className={`nav-link fw-bold ${activeTab === 'system_users' ? 'active text-primary border-bottom-0' : 'text-muted'}`}
                onClick={() => setActiveTab('system_users')}
                style={{ borderRadius: '10px 10px 0 0' }}
              >
                <i className="bi bi-people-fill me-1"></i> ผู้ใช้งานระบบ
              </button>
            </li>
            <li className="nav-item">
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
          {!['system_clear', 'system_password', 'system_users'].includes(activeTab) && (
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

          {/* Users Tab Content */}
          {activeTab === 'system_users' && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">รายชื่อผู้ใช้งาน (Users)</h5>
                <button className="btn btn-primary fw-bold" onClick={() => handleOpenUserModal()}>
                  <i className="bi bi-person-plus-fill me-1"></i> เพิ่มผู้ใช้งาน
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle border">
                  <thead className="table-light">
                    <tr>
                      <th>ชื่อบัญชี (Username)</th>
                      <th>ชื่อ-นามสกุล</th>
                      <th>สิทธิ์ (Role)</th>
                      <th className="text-end">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length > 0 ? usersList.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.name}</td>
                        <td>
                          <span className={`badge ${u.role === 'Admin' ? 'bg-primary' : u.role === 'Sales' ? 'bg-success' : 'bg-secondary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenUserModal(u)}>
                            <i className="bi bi-pencil"></i> แก้ไข
                          </button>
                          {u.id !== user?.id && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteUser(u.id)}>
                              <i className="bi bi-trash"></i> ลบ
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="text-center py-4 text-muted">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
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
              <h3 className="fw-bold text-danger mt-3 mb-3">ล้างข้อมูลระบบ (Clear Data)</h3>
              <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '600px' }}>
                เลือกประเภทข้อมูลที่คุณต้องการลบออกจากฐานข้อมูลอย่างถาวร 
                (เหมาะสำหรับใช้ล้าง "ข้อมูลจำลอง" เพื่อเตรียมเริ่มต้นกรอกข้อมูลลูกค้าจริง)
              </p>
              
              <div className="bg-light p-4 rounded-3 text-start mx-auto shadow-sm mb-4" style={{ maxWidth: '400px' }}>
                <h5 className="fw-bold mb-3"><i className="bi bi-list-check me-2"></i>เลือกข้อมูลที่ต้องการลบ</h5>
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="clearCustomers" value="customers" 
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label" htmlFor="clearCustomers">👤 ข้อมูลลูกค้า (Customers)</label>
                </div>
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="clearVehicles" value="vehicles"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label" htmlFor="clearVehicles">🚗 ข้อมูลรถยนต์ (Vehicles)</label>
                </div>
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="clearPolicies" value="policies"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label" htmlFor="clearPolicies">📄 ข้อมูลกรมธรรม์และตารางงาน (Policies)</label>
                </div>
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="clearDocuments" value="documents"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label" htmlFor="clearDocuments">📎 ไฟล์เอกสารที่อัปโหลด (Documents)</label>
                </div>
                <hr />
                <div className="form-check mb-2">
                  <input className="form-check-input" type="checkbox" id="clearMasterData" value="master_data"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label text-danger" htmlFor="clearMasterData">⚙️ ข้อมูลตั้งค่าระบบพื้นฐาน (Master Data)</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="clearUsers" value="users"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clearTables: e.target.checked 
                          ? [...(prev.clearTables || []), value]
                          : (prev.clearTables || []).filter(t => t !== value)
                      }));
                    }}
                  />
                  <label className="form-check-label text-danger" htmlFor="clearUsers">👥 ผู้ใช้งานระบบ (ยกเว้น Admin)</label>
                </div>
              </div>

              <div className="alert alert-warning d-inline-block text-start mb-4 shadow-sm border-0">
                <strong>⚠️ คำเตือน:</strong> ข้อมูลที่ถูกลบไปแล้วจะไม่สามารถกู้คืนได้ โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ
              </div>
              <br/>
              <div className="d-flex justify-content-center gap-3">
                <button className="btn btn-outline-success btn-lg fw-bold px-4 shadow-sm" onClick={handleBackupExcel}>
                  <i className="bi bi-file-earmark-excel me-2"></i> สำรองข้อมูล (Backup to Excel)
                </button>
                <button className="btn btn-danger btn-lg fw-bold px-4 shadow-sm" onClick={handleClearData}>
                  <i className="bi bi-trash3-fill me-2"></i> ยืนยันการลบข้อมูลที่เลือก
                </button>
              </div>
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

      {/* Modal for User Management */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">{userFormData.id ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUserSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">ชื่อบัญชี (Username)</Form.Label>
              <Form.Control 
                type="text" 
                value={userFormData.username} 
                onChange={(e) => setUserFormData({...userFormData, username: e.target.value})} 
                required 
                disabled={!!userFormData.id} // Cannot edit username after creation
              />
              {!userFormData.id && <Form.Text className="text-muted">ใช้สำหรับเข้าสู่ระบบ (ห้ามซ้ำ)</Form.Text>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">ชื่อ-นามสกุล (Name)</Form.Label>
              <Form.Control 
                type="text" 
                value={userFormData.name} 
                onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} 
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">รหัสผ่าน (Password)</Form.Label>
              <Form.Control 
                type="password" 
                value={userFormData.password} 
                onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
                required={!userFormData.id} 
              />
              {userFormData.id && <Form.Text className="text-muted">เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน</Form.Text>}
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold">สิทธิ์การใช้งาน (Role)</Form.Label>
              <Form.Select 
                value={userFormData.role} 
                onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
              >
                <option value="Admin">Admin (ดูแลระบบ)</option>
                <option value="Manager">Manager (ผู้จัดการ)</option>
                <option value="Sales">Sales (เซลส์)</option>
                <option value="Staff">Staff (พนักงานทั่วไป)</option>
                <option value="Viewer">Viewer (ดูได้อย่างเดียว)</option>
              </Form.Select>
            </Form.Group>
            <div className="text-end">
              <Button variant="light" className="me-2 fw-bold" onClick={() => setShowUserModal(false)}>ยกเลิก</Button>
              <Button variant="primary" type="submit" className="fw-bold px-4 shadow-sm">บันทึกข้อมูล</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MasterData;

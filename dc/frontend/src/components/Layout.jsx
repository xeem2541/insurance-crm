import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { Modal, Button, Form, Dropdown, Badge } from 'react-bootstrap';
import api from '../services/api';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [notifications, setNotifications] = useState({ total: 0, overdue: [], upcoming: [], expiring: [] });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000); // refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.log('Failed to fetch notifications');
    }
  };

  const handlePasswordSubmit = async (e) => {
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
      setTimeout(() => setShowPwdModal(false), 2000);
    } catch (error) {
      setPwdMsg({ type: 'danger', text: error.response?.data?.error || 'เกิดข้อผิดพลาด' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'ภาพรวมระบบ', icon: 'bi-grid-1x2-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/issue-policy', label: 'ออกกรมธรรม์ใหม่', icon: 'bi-file-earmark-plus-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/calendar', label: 'ปฏิทินงาน', icon: 'bi-calendar3', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/customers', label: 'ข้อมูลลูกค้า', icon: 'bi-people-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/policies', label: 'Motor Insurance (รถยนต์)', icon: 'bi-shield-fill-check', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/non-motor', label: 'Non-Motor (ประกันอื่น)', icon: 'bi-shield-plus', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/payments', label: 'ระบบรับชำระเงิน', icon: 'bi-wallet2', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/documents', label: 'ระบบเอกสาร', icon: 'bi-file-earmark-medical-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/reports', label: 'รายงาน', icon: 'bi-bar-chart-line-fill', roles: ['Admin', 'Manager', 'Sales'] },
    { path: '/master-data', label: 'ตั้งค่าระบบ', icon: 'bi-gear-fill', roles: ['Admin', 'Manager'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className={`d-flex ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`} style={{ minHeight: '100vh' }}>
      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop d-lg-none ${isSidebarOpen ? 'show' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <div className={`sidebar d-flex flex-column ${isSidebarOpen ? 'open' : ''} ${darkMode ? 'border-end border-secondary' : ''}`} style={{ width: '280px', backgroundColor: darkMode ? '#1e1e1e' : '' }}>
        <div className="d-flex align-items-center justify-content-between mb-4 px-4 mt-2 pt-3">
          <Link to="/" className="d-flex align-items-center text-white text-decoration-none">
            <div className="bg-white rounded p-1 me-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span className="brand-text" style={{ fontFamily: 'Kanit, sans-serif' }}>สำนักงานเปิ้ลประกัน</span>
          </Link>
          <button className="btn btn-link text-white d-lg-none p-0" onClick={() => setIsSidebarOpen(false)}>
            <i className="bi bi-x-lg fs-4"></i>
          </button>
        </div>
        
        <ul className="nav flex-column mb-auto px-2 mt-2">
          <li className="nav-item mb-3 px-3">
            <small className="text-muted fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>Menu</small>
          </li>
          {filteredMenuItems.map(item => (
            <li className="nav-item w-100" key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className={`bi ${item.icon}`}></i>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="px-4 mb-4 mt-auto">
          <hr className="border-secondary" />
          <div className="d-flex align-items-center text-white mb-3">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2 shadow-sm" style={{width: '35px', height: '35px'}}>
              <span className="fw-bold">{user?.name ? user.name.charAt(0) : 'U'}</span>
            </div>
            <div>
              <strong className="d-block lh-1 mb-1 text-truncate" style={{maxWidth: '120px'}}>{user?.name}</strong>
              <small className="text-white-50">{user?.role}</small>
            </div>
          </div>
          <button className="btn btn-sm btn-outline-light w-100 mb-2" onClick={() => setShowPwdModal(true)}>
            <i className="bi bi-key-fill me-2"></i>เปลี่ยนรหัสผ่าน
          </button>
          <button className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2"></i>ออกจากระบบ
          </button>
        </div>
      </div>
      
      <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}>
        <nav className={`navbar navbar-expand-lg border-bottom px-4 py-3 shadow-sm glass-nav fade-in ${darkMode ? 'navbar-dark bg-dark border-secondary' : 'navbar-light bg-white'}`}>
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button className={`btn btn-sm d-lg-none me-3 ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`} onClick={toggleSidebar}>
                <i className="bi bi-list fs-4"></i>
              </button>
              <span className={`navbar-brand mb-0 h5 fw-bold ${darkMode ? 'text-light' : 'text-dark'} d-none d-sm-block`}>Apple Insurance & Services</span>
              <span className={`navbar-brand mb-0 h6 fw-bold ${darkMode ? 'text-light' : 'text-dark'} d-sm-none`}>Apple Insurance</span>
            </div>
            <div className="d-flex align-items-center">
              <Dropdown align="end" className="me-3">
                <Dropdown.Toggle variant={darkMode ? 'outline-light' : 'outline-dark'} className="rounded-circle p-2 position-relative d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} id="dropdown-notifications">
                  <i className="bi bi-bell-fill"></i>
                  {notifications.total > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                      {notifications.total}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu className={`shadow-lg border-0 ${darkMode ? 'bg-dark' : 'bg-white'}`} style={{ width: '350px', maxHeight: '500px', overflowY: 'auto', borderRadius: '16px' }}>
                  <div className={`px-3 py-2 border-bottom fw-bold ${darkMode ? 'text-light' : 'text-dark'}`}>
                    การแจ้งเตือนทั้งหมด ({notifications.total})
                  </div>
                  
                  {notifications.total === 0 ? (
                    <Dropdown.Item className="text-center text-muted py-4">ไม่มีรายการแจ้งเตือน</Dropdown.Item>
                  ) : (
                    <>
                      {/* Overdue */}
                      {notifications.overdue.length > 0 && (
                        <>
                          <Dropdown.Header className="text-danger fw-bold"><i className="bi bi-exclamation-circle-fill me-1"></i> เลยกำหนดชำระ ({notifications.overdue.length})</Dropdown.Header>
                          {notifications.overdue.map(n => (
                            <Dropdown.Item key={`o-${n.id}`} as={Link} to="/payments" className="border-bottom pb-2">
                              <div className="d-flex justify-content-between">
                                <small className="fw-bold">{n.first_name}</small>
                                <Badge bg="danger">งวดที่ {n.installment_no}</Badge>
                              </div>
                              <small className="text-muted d-block mt-1">ค้าง ฿{(Number(n.amount)||0).toLocaleString()}</small>
                            </Dropdown.Item>
                          ))}
                        </>
                      )}

                      {/* Upcoming */}
                      {notifications.upcoming.length > 0 && (
                        <>
                          <Dropdown.Header className="text-warning fw-bold"><i className="bi bi-clock-fill me-1"></i> ใกล้ถึงดิวชำระ ({notifications.upcoming.length})</Dropdown.Header>
                          {notifications.upcoming.map(n => (
                            <Dropdown.Item key={`u-${n.id}`} as={Link} to="/payments" className="border-bottom pb-2">
                              <div className="d-flex justify-content-between">
                                <small className="fw-bold">{n.first_name}</small>
                                <Badge bg="warning" text="dark">งวดที่ {n.installment_no}</Badge>
                              </div>
                              <small className="text-muted d-block mt-1">ดิว: {new Date(n.due_date).toLocaleDateString('th-TH')}</small>
                            </Dropdown.Item>
                          ))}
                        </>
                      )}

                      {/* Expiring */}
                      {notifications.expiring.length > 0 && (
                        <>
                          <Dropdown.Header className="text-info fw-bold"><i className="bi bi-shield-exclamation me-1"></i> ใกล้หมดอายุ ({notifications.expiring.length})</Dropdown.Header>
                          {notifications.expiring.map(n => (
                            <Dropdown.Item key={`e-${n.id}`} as={Link} to={n.category === 'Motor' ? '/policies' : '/non-motor'} className="border-bottom pb-2">
                              <div className="d-flex justify-content-between">
                                <small className="fw-bold">{n.first_name}</small>
                                <Badge bg="info">{n.days_left} วัน</Badge>
                              </div>
                              <small className="text-muted d-block mt-1">{n.policy_no}</small>
                            </Dropdown.Item>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>

              <button className={`btn btn-outline-${darkMode ? 'light' : 'dark'} rounded-pill`} onClick={toggleTheme}>
                {darkMode ? <><i className="bi bi-sun-fill text-warning"></i> โหมดสว่าง</> : <><i className="bi bi-moon-fill"></i> โหมดมืด</>}
              </button>
            </div>
          </div>
        </nav>
        <div className="p-3 p-lg-4 fade-in flex-grow-1 overflow-auto">
          <Outlet />
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal show={showPwdModal} onHide={() => setShowPwdModal(false)} centered>
        <Modal.Header closeButton className={darkMode ? 'bg-dark text-light border-secondary' : ''}>
          <Modal.Title><i className="bi bi-key-fill text-warning me-2"></i>เปลี่ยนรหัสผ่าน</Modal.Title>
        </Modal.Header>
        <Modal.Body className={darkMode ? 'bg-dark text-light' : ''}>
          {pwdMsg.text && (
            <div className={`alert alert-${pwdMsg.type} py-2`}>{pwdMsg.text}</div>
          )}
          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>รหัสผ่านปัจจุบัน</Form.Label>
              <Form.Control 
                type="password" 
                required 
                value={pwdData.currentPassword}
                onChange={e => setPwdData({...pwdData, currentPassword: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</Form.Label>
              <Form.Control 
                type="password" 
                required 
                value={pwdData.newPassword}
                onChange={e => setPwdData({...pwdData, newPassword: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>ยืนยันรหัสผ่านใหม่</Form.Label>
              <Form.Control 
                type="password" 
                required 
                value={pwdData.confirmPassword}
                onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})}
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 fw-bold">
              บันทึกรหัสผ่านใหม่
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Layout;

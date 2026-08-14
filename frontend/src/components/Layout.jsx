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
    { path: '/', label: 'ภาพรวมระบบ', icon: 'bi-grid-1x2-fill', color: '#38bdf8', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/issue-policy', label: 'ออกกรมธรรม์ใหม่', icon: 'bi-file-earmark-plus-fill', color: '#34d399', badge: 'AI 100%', badgeBg: 'linear-gradient(45deg, #10b981, #059669)', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/calendar', label: 'ปฏิทินงาน', icon: 'bi-calendar3', color: '#fbbf24', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/customers', label: 'ข้อมูลลูกค้า', icon: 'bi-people-fill', color: '#a78bfa', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/policies', label: 'Motor Insurance (รถยนต์)', icon: 'bi-shield-fill-check', color: '#60a5fa', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/non-motor', label: 'Non-Motor (ประกันอื่น)', icon: 'bi-shield-plus', color: '#f472b6', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/payments', label: 'ระบบรับชำระเงิน', icon: 'bi-wallet2', color: '#4ade80', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/documents', label: 'ระบบเอกสาร', icon: 'bi-file-earmark-medical-fill', color: '#2dd4bf', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/reports', label: 'รายงาน', icon: 'bi-bar-chart-line-fill', color: '#fb923c', roles: ['Admin', 'Manager', 'Sales'] },
    { path: '/master-data', label: 'ตั้งค่าระบบ', icon: 'bi-gear-fill', color: '#94a3b8', roles: ['Admin', 'Manager'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className={`d-flex ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`} style={{ minHeight: '100vh' }}>
      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop d-lg-none ${isSidebarOpen ? 'show' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <div className={`sidebar d-flex flex-column ${isSidebarOpen ? 'open' : ''} ${darkMode ? 'border-end border-secondary' : ''}`} style={{ width: '280px' }}>
        <div className="d-flex align-items-center justify-content-between mb-3 px-4 pt-3">
          <Link to="/" className="d-flex align-items-center text-white text-decoration-none w-100">
            <div 
              className="rounded-circle me-3 flex-shrink-0 d-flex align-items-center justify-content-center shadow-lg position-relative" 
              style={{ 
                width: '46px', 
                height: '46px', 
                backgroundColor: '#ffffff',
                border: '2px solid rgba(212, 175, 55, 0.7)',
                boxShadow: '0 0 14px rgba(212, 175, 55, 0.3)',
                overflow: 'hidden',
                padding: '3px'
              }}
            >
              <img 
                src="/logo.png" 
                alt="Logo" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block'
                }} 
              />
            </div>
            <div className="d-flex flex-column justify-content-center">
              <div 
                style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: '500', 
                  color: '#94a3b8', 
                  letterSpacing: '1px', 
                  lineHeight: '1.1',
                  marginBottom: '1px'
                }}
              >
                สำนักงาน
              </div>
              <div 
                style={{ 
                  fontSize: '1.38rem', 
                  fontWeight: '800', 
                  lineHeight: '1.15',
                  background: 'linear-gradient(135deg, #fff7c2 0%, #d4af37 60%, #b45309 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 6px rgba(212, 175, 55, 0.35))',
                  letterSpacing: '0.3px'
                }}
              >
                เปิ้ลประกัน
              </div>
            </div>
          </Link>
          <button className="btn btn-link text-white d-lg-none p-0" onClick={() => setIsSidebarOpen(false)}>
            <i className="bi bi-x-lg fs-4"></i>
          </button>
        </div>

        {/* AI Engine Status Capsule */}
        <div className="mx-3 my-2 p-2 rounded-3 text-center" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="d-flex align-items-center justify-content-center gap-2">
            <span className="pulse-dot-online"></span>
            <span style={{ color: '#00ff88', fontSize: '0.76rem', fontWeight: '600', letterSpacing: '0.3px', fontFamily: "'Inter', sans-serif" }}>AI OCR Gemini 3.5 Ready</span>
          </div>
        </div>
        
        <ul className="nav flex-column mb-auto px-2 mt-2">
          <li className="nav-item mb-2 px-3">
            <small className="text-white-50 fw-bold text-uppercase" style={{ letterSpacing: '1.2px', fontSize: '0.7rem' }}>เมนูหลัก</small>
          </li>
          {filteredMenuItems.map(item => (
            <li className="nav-item w-100 mb-1" key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="menu-icon-box" style={{ color: item.color }}>
                  <i className={`bi ${item.icon}`}></i>
                </span>
                <span className="flex-grow-1 text-truncate">{item.label}</span>
                {item.badge && (
                  <span className="badge rounded-pill px-2 py-1 ms-auto shadow-sm" style={{ background: item.badgeBg || '#3b82f6', fontSize: '0.68rem', color: '#ffffff', fontWeight: '700', letterSpacing: '0.3px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="px-3 mb-4 mt-auto">
          <div className="p-3 rounded-4 mb-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="d-flex align-items-center text-white mb-2">
              <div className="rounded-circle d-flex align-items-center justify-content-center me-2 shadow-sm text-white fw-bold" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="overflow-hidden">
                <strong className="d-block lh-1 mb-1 text-truncate" style={{ maxWidth: '140px', fontSize: '0.9rem' }}>{user?.name || 'ผู้ใช้งาน'}</strong>
                <span className="badge bg-primary-subtle text-primary-emphasis px-2 py-0" style={{ fontSize: '0.7rem' }}>{user?.role}</span>
              </div>
            </div>
            <div className="d-flex gap-1 mt-2">
              <button className="btn btn-sm btn-outline-light flex-grow-1 py-1" style={{ fontSize: '0.78rem', borderRadius: '8px' }} onClick={() => setShowPwdModal(true)}>
                <i className="bi bi-key-fill me-1"></i>รหัสผ่าน
              </button>
              <button className="btn btn-sm btn-outline-danger py-1 px-2" style={{ fontSize: '0.78rem', borderRadius: '8px' }} onClick={handleLogout} title="ออกจากระบบ">
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}>
        <nav className={`navbar navbar-expand-lg border-bottom px-3 px-lg-4 py-2 py-lg-3 shadow-sm glass-nav fade-in ${darkMode ? 'navbar-dark bg-dark border-secondary' : 'navbar-light bg-white'}`}>
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <button className={`btn btn-sm d-lg-none me-3 ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`} onClick={toggleSidebar}>
                <i className="bi bi-list fs-4"></i>
              </button>
              <div className="d-flex align-items-center gap-2">
                <span className={`navbar-brand mb-0 h5 fw-bold ${darkMode ? 'text-light' : 'text-dark'} d-none d-sm-block`} style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                  Apple Insurance CRM
                </span>
                <span className={`navbar-brand mb-0 h6 fw-bold ${darkMode ? 'text-light' : 'text-dark'} d-sm-none`} style={{ fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
                  Apple Insurance
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Fast Action: Issue Policy Button */}
              <Link 
                to="/issue-policy" 
                className="btn btn-sm btn-success rounded-pill px-3 py-2 fw-bold shadow-sm d-none d-md-flex align-items-center gap-1"
                style={{ fontSize: '0.85rem' }}
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>ออกกรมธรรม์ใหม่</span>
              </Link>

              {/* Notification Dropdown */}
              <Dropdown align="end">
                <Dropdown.Toggle 
                  variant={darkMode ? 'outline-light' : 'outline-dark'} 
                  className="rounded-circle p-2 position-relative d-flex align-items-center justify-content-center" 
                  style={{ width: '40px', height: '40px', border: '1px solid rgba(0,0,0,0.1)' }} 
                  id="dropdown-notifications"
                >
                  <i className="bi bi-bell-fill"></i>
                  {notifications.total > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                      {notifications.total}
                    </span>
                  )}
                </Dropdown.Toggle>

                <Dropdown.Menu className={`shadow-lg border-0 ${darkMode ? 'bg-dark text-light' : 'bg-white'}`} style={{ width: '350px', maxHeight: '500px', overflowY: 'auto', borderRadius: '18px' }}>
                  <div className={`px-3 py-2 border-bottom fw-bold d-flex justify-content-between align-items-center ${darkMode ? 'text-light border-secondary' : 'text-dark'}`}>
                    <span><i className="bi bi-bell-fill text-warning me-1"></i> การแจ้งเตือน</span>
                    <span className="badge bg-primary rounded-pill">{notifications.total}</span>
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

              {/* Theme Toggle Pill */}
              <button 
                className={`btn btn-sm btn-outline-${darkMode ? 'light' : 'dark'} rounded-pill px-3 py-2 d-flex align-items-center gap-1 shadow-sm`} 
                onClick={toggleTheme}
                style={{ fontSize: '0.85rem' }}
              >
                {darkMode ? <><i className="bi bi-sun-fill text-warning"></i> <span className="d-none d-sm-inline">สว่าง</span></> : <><i className="bi bi-moon-stars-fill text-primary"></i> <span className="d-none d-sm-inline">มืด</span></>}
              </button>
            </div>
          </div>
        </nav>
        <div className="p-3 p-lg-4 fade-in flex-grow-1 overflow-auto mobile-content-pad">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation Bar (iOS & Android) */}
        <div className="mobile-bottom-nav d-lg-none d-flex align-items-center justify-content-around py-2 px-3 shadow-lg" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1040,
          background: darkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))'
        }}>
          {/* Home */}
          <Link 
            to="/" 
            className={`d-flex flex-column align-items-center text-decoration-none ${location.pathname === '/' ? (darkMode ? 'text-warning' : 'text-primary') : (darkMode ? 'text-white-50' : 'text-secondary')}`}
            style={{ fontSize: '0.72rem', fontWeight: location.pathname === '/' ? '700' : '500', transition: 'all 0.2s ease' }}
          >
            <i className={`bi ${location.pathname === '/' ? 'bi-house-door-fill fs-5' : 'bi-house-door fs-5'}`}></i>
            <span>หน้าแรก</span>
          </Link>

          {/* Customers */}
          <Link 
            to="/customers" 
            className={`d-flex flex-column align-items-center text-decoration-none ${location.pathname === '/customers' ? (darkMode ? 'text-warning' : 'text-primary') : (darkMode ? 'text-white-50' : 'text-secondary')}`}
            style={{ fontSize: '0.72rem', fontWeight: location.pathname === '/customers' ? '700' : '500', transition: 'all 0.2s ease' }}
          >
            <i className={`bi ${location.pathname === '/customers' ? 'bi-people-fill fs-5' : 'bi-people fs-5'}`}></i>
            <span>ลูกค้า</span>
          </Link>

          {/* Center High-Action Button: Issue Policy with AI */}
          <Link 
            to="/issue-policy" 
            className="d-flex flex-column align-items-center justify-content-center text-decoration-none shadow-lg text-white"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              marginTop: '-22px',
              border: '3px solid ' + (darkMode ? '#111827' : '#ffffff'),
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
            }}
            title="ออกกรมธรรม์ใหม่"
          >
            <i className="bi bi-camera-fill fs-4"></i>
          </Link>

          {/* Policies */}
          <Link 
            to="/policies" 
            className={`d-flex flex-column align-items-center text-decoration-none ${location.pathname === '/policies' ? (darkMode ? 'text-warning' : 'text-primary') : (darkMode ? 'text-white-50' : 'text-secondary')}`}
            style={{ fontSize: '0.72rem', fontWeight: location.pathname === '/policies' ? '700' : '500', transition: 'all 0.2s ease' }}
          >
            <i className={`bi ${location.pathname === '/policies' ? 'bi-shield-fill-check fs-5' : 'bi-shield-check fs-5'}`}></i>
            <span>ประกันรถ</span>
          </Link>

          {/* More Menu Drawer Trigger */}
          <button 
            onClick={toggleSidebar} 
            className={`btn btn-link p-0 d-flex flex-column align-items-center text-decoration-none ${darkMode ? 'text-white-50' : 'text-secondary'}`}
            style={{ fontSize: '0.72rem', fontWeight: '500' }}
          >
            <i className="bi bi-grid-fill fs-5"></i>
            <span>เมนู</span>
          </button>
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

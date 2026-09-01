import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { Modal, Button, Form, Dropdown } from 'react-bootstrap';
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
      console.warn('Failed to fetch notifications:', e?.message);
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
    { path: '/issue-policy-motor', label: 'ออกกรมธรรม์ (Motor)', icon: 'bi-car-front-fill', color: '#34d399', badge: 'AI 100%', badgeBg: 'linear-gradient(45deg, #10b981, #059669)', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/issue-policy-non-motor', label: 'ออกกรมธรรม์ (Non-Motor)', icon: 'bi-shield-plus', color: '#f472b6', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/calendar', label: 'ปฏิทินงาน', icon: 'bi-calendar3', color: '#fbbf24', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/customers', label: 'ข้อมูลลูกค้า', icon: 'bi-people-fill', color: '#a78bfa', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/policies', label: 'Motor Insurance (รถยนต์)', icon: 'bi-shield-fill-check', color: '#60a5fa', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/non-motor', label: 'Non-Motor (ประกันอื่น)', icon: 'bi-shield-plus', color: '#f472b6', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/payments', label: 'ระบบรับชำระเงิน', icon: 'bi-wallet2', color: '#4ade80', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/documents', label: 'ระบบเอกสาร', icon: 'bi-file-earmark-medical-fill', color: '#2dd4bf', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/reports', label: 'รายงาน', icon: 'bi-bar-chart-line-fill', color: '#fb923c', roles: ['Admin', 'Manager', 'Sales'] },
    { path: '/activity-logs', label: 'ประวัติการทำงาน (Logs)', icon: 'bi-clock-history', color: '#ec4899', roles: ['Admin', 'Manager'] },
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
              className="me-3 flex-shrink-0 d-flex align-items-center justify-content-center shadow-lg position-relative" 
              style={{ 
                width: '48px', 
                height: '48px', 
                backgroundColor: '#020617',
                border: '2px solid rgba(212, 175, 55, 0.75)',
                boxShadow: '0 0 14px rgba(212, 175, 55, 0.35)',
                borderRadius: '14px',
                overflow: 'hidden',
                padding: '2px'
              }}
            >
              <img 
                src="/logo.png" 
                alt="สำนักงานเปิ้ล ประกันภัยครบวงจร" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '10px',
                  display: 'block'
                }} 
              />
            </div>
            <div className="d-flex flex-column justify-content-center">
              <div 
                style={{ 
                  fontSize: '0.88rem', 
                  fontWeight: '600', 
                  color: '#cbd5e1', 
                  letterSpacing: '0.5px', 
                  lineHeight: '1.3',
                  marginBottom: '2px'
                }}
              >
                สำนักงาน
              </div>
              <div 
                style={{ 
                  fontSize: '1.45rem', 
                  fontWeight: '800', 
                  lineHeight: '1.35',
                  color: '#fbbf24',
                  textShadow: '0 0 16px rgba(251, 191, 36, 0.4), 0 2px 4px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  paddingTop: '2px'
                }}
              >
                เปิ้ลประกันภัย
              </div>
            </div>
          </Link>
          <button className="btn btn-link text-white d-lg-none p-0" onClick={() => setIsSidebarOpen(false)}>
            <i className="bi bi-x-lg fs-4"></i>
          </button>
        </div>

        {/* Status Capsule: AI & Database 24/7 Connected */}
        <div className="mx-3 my-2 p-2 rounded-3 text-center" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
            <span className="pulse-dot-online"></span>
            <span style={{ color: '#00ff88', fontSize: '0.76rem', fontWeight: '600', letterSpacing: '0.3px', fontFamily: "'Inter', sans-serif" }}>AI OCR Gemini Ready</span>
          </div>
          <div className="d-flex align-items-center justify-content-center gap-1" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '4px' }}>
            <i className="bi bi-database-check" style={{ color: '#38bdf8', fontSize: '0.75rem' }}></i>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: '500' }}>ฐานข้อมูล: เชื่อมต่อตลอดเวลา</span>
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
                to="/issue-policy-motor" 
                className="btn btn-sm btn-success rounded-pill px-3 py-2 fw-bold shadow-sm d-none d-md-flex align-items-center gap-1"
                style={{ fontSize: '0.85rem' }}
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>ออกกรมธรรม์ใหม่ (Motor)</span>
              </Link>

              {/* Notification Dropdown — 3D Edition */}
              <Dropdown align="end">
                {/* Wrapper ให้ badge มีพื้นที่ล้นออกมาโดยไม่ทับ element ข้าง ๆ */}
                <div style={{ position: 'relative', padding: '6px 6px 0 0', flexShrink: 0 }}>
                  <Dropdown.Toggle
                    as="div"
                    id="dropdown-notifications"
                    style={{
                      cursor: 'pointer',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      background: darkMode
                        ? 'linear-gradient(145deg, #1e293b, #0f172a)'
                        : 'linear-gradient(145deg, #ffffff, #e2e8f0)',
                      boxShadow: darkMode
                        ? '4px 4px 10px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.04), inset 0 1px 1px rgba(255,255,255,0.08)'
                        : '4px 4px 10px rgba(0,0,0,0.15), -2px -2px 6px rgba(255,255,255,0.9), inset 0 1px 1px rgba(255,255,255,0.8)',
                      border: notifications.total > 0
                        ? '1.5px solid rgba(239,68,68,0.4)'
                        : darkMode ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(0,0,0,0.08)',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                    }}
                  >
                    <i
                      className="bi bi-bell-fill"
                      style={{
                        fontSize: '1.1rem',
                        color: notifications.total > 0 ? '#f59e0b' : (darkMode ? '#94a3b8' : '#475569'),
                        filter: notifications.total > 0 ? 'drop-shadow(0 0 6px rgba(245,158,11,0.8))' : 'none',
                        animation: notifications.total > 0 ? 'bellShake 2s ease-in-out infinite' : 'none',
                      }}
                    />
                  </Dropdown.Toggle>

                  {/* Badge อยู่นอก Toggle แต่ในอ้อม wrapper — ไม่ทับ element อื่น */}
                  {notifications.total > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.65), 0 0 0 2px ' + (darkMode ? '#1e293b' : '#ffffff'),
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        lineHeight: 1,
                        letterSpacing: '-0.3px',
                        zIndex: 20,
                        pointerEvents: 'none',
                      }}
                    >
                      {notifications.total > 99 ? '99+' : notifications.total}
                    </span>
                  )}
                </div>

                <Dropdown.Menu
                  className="border-0"
                  style={{
                    width: '360px',
                    maxHeight: '520px',
                    overflowY: 'auto',
                    borderRadius: '20px',
                    padding: 0,
                    zIndex: 9999,
                    background: darkMode
                      ? 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)'
                      : 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)',
                    boxShadow: darkMode
                      ? '0 20px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)'
                      : '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
                    border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    marginTop: '8px',
                    transform: 'perspective(800px) rotateX(0deg)',
                    transformOrigin: 'top right',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: '16px 20px 14px',
                      borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                      background: darkMode
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.04) 100%)',
                      borderRadius: '20px 20px 0 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          boxShadow: '0 4px 12px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="bi bi-bell-fill" style={{ color: '#fff', fontSize: '0.9rem' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: darkMode ? '#f1f5f9' : '#1e293b', lineHeight: 1.2 }}>การแจ้งเตือน</div>
                        <div style={{ fontSize: '0.72rem', color: darkMode ? '#64748b' : '#94a3b8', fontWeight: '500' }}>อัปเดตทุก 5 นาที</div>
                      </div>
                    </div>
                    {notifications.total > 0 && (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          boxShadow: '0 2px 8px rgba(59,130,246,0.5)',
                          color: '#fff',
                          borderRadius: '20px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                        }}
                      >
                        {notifications.total} รายการ
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '8px 0 8px' }}>
                    {notifications.total === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '40px 20px',
                          color: darkMode ? '#475569' : '#94a3b8',
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px',
                            boxShadow: darkMode
                              ? 'inset 2px 2px 6px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(255,255,255,0.04)'
                              : 'inset 2px 2px 6px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.9)',
                          }}
                        >
                          <i className="bi bi-bell-slash" style={{ fontSize: '1.8rem', color: darkMode ? '#334155' : '#cbd5e1' }} />
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>ไม่มีรายการแจ้งเตือน</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>ระบบจะแจ้งเตือนเมื่อมีรายการสำคัญ</div>
                      </div>
                    ) : (
                      <>
                        {/* Overdue Section */}
                        {notifications.overdue.length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <div
                              style={{
                                padding: '8px 20px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                  boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <i className="bi bi-exclamation-circle-fill" style={{ color: '#fff', fontSize: '0.7rem' }} />
                              </span>
                              <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#ef4444', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                เลยกำหนดชำระ <span style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.72rem' }}>{notifications.overdue.length}</span>
                              </span>
                            </div>
                            {notifications.overdue.map(n => (
                              <Dropdown.Item
                                key={`o-${n.id}`}
                                as={Link}
                                to="/payments"
                                style={{ padding: '0 12px 4px' }}
                              >
                                <div
                                  style={{
                                    borderRadius: '14px',
                                    padding: '10px 14px',
                                    background: darkMode
                                      ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(185,28,28,0.06) 100%)'
                                      : 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(254,226,226,0.8) 100%)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: darkMode ? '#fca5a5' : '#991b1b' }}>{n.first_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>ค้าง ฿{(Number(n.amount)||0).toLocaleString()}</div>
                                  </div>
                                  <span
                                    style={{
                                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                      boxShadow: '0 2px 6px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                                      color: '#fff',
                                      borderRadius: '8px',
                                      padding: '3px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                    }}
                                  >
                                    งวดที่ {n.installment_no}
                                  </span>
                                </div>
                              </Dropdown.Item>
                            ))}
                          </div>
                        )}

                        {/* Upcoming Section */}
                        {notifications.upcoming.length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <div style={{ padding: '8px 20px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                  boxShadow: '0 2px 6px rgba(245,158,11,0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <i className="bi bi-clock-fill" style={{ color: '#fff', fontSize: '0.7rem' }} />
                              </span>
                              <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#f59e0b', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                ใกล้ถึงดิวชำระ <span style={{ background: 'rgba(245,158,11,0.15)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.72rem' }}>{notifications.upcoming.length}</span>
                              </span>
                            </div>
                            {notifications.upcoming.map(n => (
                              <Dropdown.Item
                                key={`u-${n.id}`}
                                as={Link}
                                to="/payments"
                                style={{ padding: '0 12px 4px' }}
                              >
                                <div
                                  style={{
                                    borderRadius: '14px',
                                    padding: '10px 14px',
                                    background: darkMode
                                      ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(180,83,9,0.06) 100%)'
                                      : 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(254,243,199,0.8) 100%)',
                                    border: '1px solid rgba(245,158,11,0.2)',
                                    boxShadow: '0 2px 8px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: darkMode ? '#fde68a' : '#92400e' }}>{n.first_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>ดิว: {new Date(n.due_date).toLocaleDateString('th-TH')}</div>
                                  </div>
                                  <span
                                    style={{
                                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                      boxShadow: '0 2px 6px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                                      color: '#fff',
                                      borderRadius: '8px',
                                      padding: '3px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                    }}
                                  >
                                    งวดที่ {n.installment_no}
                                  </span>
                                </div>
                              </Dropdown.Item>
                            ))}
                          </div>
                        )}

                        {/* Expiring Section */}
                        {notifications.expiring.length > 0 && (
                          <div>
                            <div style={{ padding: '8px 20px 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                  boxShadow: '0 2px 6px rgba(6,182,212,0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <i className="bi bi-shield-exclamation" style={{ color: '#fff', fontSize: '0.7rem' }} />
                              </span>
                              <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#06b6d4', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                ใกล้หมดอายุ <span style={{ background: 'rgba(6,182,212,0.15)', borderRadius: '6px', padding: '1px 6px', fontSize: '0.72rem' }}>{notifications.expiring.length}</span>
                              </span>
                            </div>
                            {notifications.expiring.map(n => (
                              <Dropdown.Item
                                key={`e-${n.id}`}
                                as={Link}
                                to={n.category === 'Motor' ? '/policies' : '/non-motor'}
                                style={{ padding: '0 12px 4px' }}
                              >
                                <div
                                  style={{
                                    borderRadius: '14px',
                                    padding: '10px 14px',
                                    background: darkMode
                                      ? 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(8,145,178,0.06) 100%)'
                                      : 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(207,250,254,0.8) 100%)',
                                    border: '1px solid rgba(6,182,212,0.2)',
                                    boxShadow: '0 2px 8px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: darkMode ? '#67e8f9' : '#164e63' }}>{n.first_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: darkMode ? '#94a3b8' : '#64748b', marginTop: '2px' }}>{n.policy_no}</div>
                                  </div>
                                  <span
                                    style={{
                                      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                      boxShadow: '0 2px 6px rgba(6,182,212,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                                      color: '#fff',
                                      borderRadius: '8px',
                                      padding: '3px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                    }}
                                  >
                                    {n.days_left} วัน
                                  </span>
                                </div>
                              </Dropdown.Item>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
            to="/issue-policy-motor" 
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
            title="ออกกรมธรรม์ใหม่ (Motor)"
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

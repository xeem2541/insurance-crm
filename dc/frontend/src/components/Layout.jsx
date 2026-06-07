import React, { useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'ภาพรวมระบบ', icon: 'bi-grid-1x2-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/calendar', label: 'ปฏิทินงาน', icon: 'bi-calendar3', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/customers', label: 'ข้อมูลลูกค้า', icon: 'bi-people-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/vehicles', label: 'ข้อมูลรถยนต์', icon: 'bi-car-front-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/policies', label: 'Motor Insurance (รถยนต์)', icon: 'bi-shield-fill-check', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/non-motor', label: 'Non-Motor (ประกันอื่น)', icon: 'bi-shield-plus', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/documents', label: 'ระบบเอกสาร', icon: 'bi-file-earmark-medical-fill', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Viewer'] },
    { path: '/reports', label: 'รายงาน', icon: 'bi-bar-chart-line-fill', roles: ['Admin', 'Manager', 'Sales'] },
    { path: '/master-data', label: 'ตั้งค่าระบบ', icon: 'bi-gear-fill', roles: ['Admin', 'Manager'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className={`d-flex ${darkMode ? 'bg-dark text-light' : 'bg-light text-dark'}`} style={{ minHeight: '100vh' }}>
      <div className={`sidebar d-flex flex-column ${darkMode ? 'border-end border-secondary' : ''}`} style={{ width: '280px', backgroundColor: darkMode ? '#1e1e1e' : '' }}>
        <a href="/" className="d-flex align-items-center mb-4 px-4 text-white text-decoration-none mt-2 pt-3">
          <i className="bi bi-shield-fill-check text-primary fs-3 me-2"></i>
          <span className="brand-text" style={{ fontFamily: 'Kanit, sans-serif' }}>สำนักงานเปิ้ลประกัน</span>
        </a>
        
        <ul className="nav flex-column mb-auto px-2 mt-2">
          <li className="nav-item mb-3 px-3">
            <small className="text-muted fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>Menu</small>
          </li>
          {filteredMenuItems.map(item => (
            <li className="nav-item w-100" key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
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
          <button className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2"></i>ออกจากระบบ
          </button>
        </div>
      </div>
      
      <div className="flex-grow-1 d-flex flex-column" style={{ overflowX: 'hidden' }}>
        <nav className={`navbar navbar-expand-lg border-bottom px-4 py-3 shadow-sm ${darkMode ? 'navbar-dark bg-dark border-secondary' : 'navbar-light bg-white'}`}>
          <div className="container-fluid d-flex justify-content-between">
            <span className={`navbar-brand mb-0 h5 fw-bold ${darkMode ? 'text-light' : 'text-dark'}`}>ระบบบริหารจัดการนายหน้าประกันภัย (CRM v2.0)</span>
            <div>
              <button className={`btn btn-outline-${darkMode ? 'light' : 'dark'} rounded-pill`} onClick={toggleTheme}>
                {darkMode ? <><i className="bi bi-sun-fill text-warning"></i> โหมดสว่าง</> : <><i className="bi bi-moon-fill"></i> โหมดมืด</>}
              </button>
            </div>
          </div>
        </nav>
        <div className="p-4 fade-in flex-grow-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;

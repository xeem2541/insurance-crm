import { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const { login } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-centered-layout ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Corporate/Security Background */}
      <div className="login-corporate-bg" aria-hidden="true">
        <div className="grid-overlay"></div>
        <div className="abstract-shape shape-1"></div>
        <div className="abstract-shape shape-2"></div>
      </div>

      {/* Top Right: Dark Mode Toggle Switch with text */}
      <div className="top-theme-switch-wrap">
        <button
          type="button"
          className="theme-switch-pill-btn"
          onClick={toggleTheme}
          aria-label={darkMode ? 'ปิดโหมดมืด' : 'เปิดโหมดมืด'}
          title={darkMode ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        >
          <span className={`switch-knob ${darkMode ? 'knob-on' : 'knob-off'}`}></span>
        </button>
        <span className="theme-switch-label" onClick={toggleTheme}>
          โหมดมืด
        </span>
      </div>

      {/* Premium Login Card */}
      <div className="login-premium-card">
        {/* Brand Logo & Header */}
        <div className="brand-header">
          {/* Official Ple Insurance Logo Badge */}
          <div className="brand-logo-wrap">
            <div className="logo-badge-container">
              <img
                src="/logo-new.jpg"
                alt="สำนักงานเปิ้ล ประกันภัยครบวงจร"
              />
            </div>
          </div>

          <h2 className="office-title">สำนักงานเปิ้ลประกันภัย</h2>
          <p className="office-subtitle">
            ศูนย์รวมประกัน & งานทะเบียน ครบ จบ ดูแลต่อเนื่อง
          </p>
          {/* Trust Signal */}
          <div className="trust-badge">
            <i className="bi bi-shield-check"></i>
            <span>ปลอดภัยและเชื่อถือได้</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert-box" role="alert">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form-content">
          {/* Username Input */}
          <div className="input-field-group">
            <label className="field-label" htmlFor="loginUsername">
              ชื่อผู้ใช้งาน (USERNAME)
            </label>
            <div className="field-input-wrapper">
              <span className="field-icon-left">
                <i className="bi bi-person"></i>
              </span>
              <input
                id="loginUsername"
                type="text"
                className="field-input"
                placeholder="Username / Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="input-field-group">
            <label className="field-label" htmlFor="loginPassword">
              รหัสผ่าน (PASSWORD)
            </label>
            <div className="field-input-wrapper">
              <span className="field-icon-left">
                <i className="bi bi-key"></i>
              </span>
              <input
                id="loginPassword"
                type={showPassword ? 'text' : 'password'}
                className="field-input has-right-btn"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="field-btn-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="btn-submit-login"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-inner-loading">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>กำลังเข้าสู่ระบบ...</span>
              </span>
            ) : (
              <span className="btn-inner-content">
                <i className="bi bi-box-arrow-in-right btn-login-icon"></i>
                <span>เข้าสู่ระบบ (Login)</span>
              </span>
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="forgot-password-container">
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setShowForgotModal(true)}
            >
              ลืมรหัสผ่าน? (Forgot Password?)
            </button>
          </div>

          {/* Employee Register Link */}
          <div className="text-center mt-3 pt-3 border-top border-white border-opacity-10">
            <span className="text-white-50 small me-1">ยังไม่มีบัญชีพนักงาน?</span>
            <Link 
              to="/register" 
              className="text-info fw-bold text-decoration-none small hover-underline"
            >
              สมัครสมาชิกพนักงาน <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowForgotModal(false)}>
          <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-badge-icon">
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <h4>รีเซ็ตรหัสผ่าน</h4>
            <p className="modal-desc">
              กรุณาติดต่อผู้ดูแลระบบ (System Administrator) เพื่อขอรับความช่วยเหลือในการรีเซ็ตรหัสผ่าน
            </p>
            <div className="modal-contact-details">
              <div className="contact-row">
                <i className="bi bi-envelope-fill me-2 text-primary"></i>
                <span>support@appleinsurance.co.th</span>
              </div>
              <div className="contact-row mt-2">
                <i className="bi bi-telephone-fill me-2 text-primary"></i>
                <span>02-xxx-xxxx (แผนกไอที)</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary w-100 py-2 rounded-3 fw-medium"
              onClick={() => setShowForgotModal(false)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

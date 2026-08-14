import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

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
      {/* Background Ambience: Warm glow on right, dark blue on left */}
      <div className="bg-glow-warm" aria-hidden="true"></div>
      <div className="bg-glow-cool" aria-hidden="true"></div>

      {/* Floating Glass Cubes */}
      <div className="floating-glass-cube cube-1" aria-hidden="true"></div>
      <div className="floating-glass-cube cube-2" aria-hidden="true"></div>
      <div className="floating-glass-cube cube-3" aria-hidden="true"></div>
      <div className="floating-glass-cube cube-4" aria-hidden="true"></div>
      <div className="floating-glass-cube cube-5" aria-hidden="true"></div>

      {/* Sparkle Bokeh Particles */}
      <div className="sparkle-particle sparkle-1" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-2" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-3" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-4" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-5" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-6" aria-hidden="true"></div>
      <div className="sparkle-particle sparkle-7" aria-hidden="true"></div>

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

      {/* Glassmorphic Login Card */}
      <div className="login-glass-card">
        {/* Brand Logo & Header */}
        <div className="brand-header">
          {/* High-definition Golden Apple Insurance Logo */}
          <div className="brand-logo-wrap">
            <svg
              className="apple-logo-svg"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="40%" stopColor="#d4af37" />
                  <stop offset="70%" stopColor="#aa771c" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
                <linearGradient id="goldGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fff1a8" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#8a5a00" />
                </linearGradient>
                <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="40%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
                <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#d4af37" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Apple Leaf */}
              <path
                d="M 64 12 C 68 18 64 26 56 28 C 54 22 58 14 64 12 Z"
                fill="url(#goldGrad1)"
                filter="url(#goldGlow)"
              />

              {/* Apple Left Half Contour */}
              <path
                d="M 52 28 C 42 28 32 36 28 48 C 24 64 30 84 42 98 C 48 104 54 105 60 102 C 54 96 46 86 46 72 C 46 54 56 36 66 30 C 62 28 57 28 52 28 Z"
                fill="url(#goldGrad1)"
                filter="url(#goldGlow)"
              />

              {/* Apple Right Half Contour */}
              <path
                d="M 68 28 C 76 28 84 34 88 44 C 94 58 92 78 82 92 C 78 98 72 102 66 102 C 74 96 80 82 80 68 C 80 50 72 36 64 30 C 65 29 66.5 28.5 68 28 Z"
                fill="url(#goldGrad2)"
                filter="url(#goldGlow)"
              />

              {/* Golden/Red Checkmark Inside Apple */}
              <path
                d="M 38 62 L 52 78 L 88 32 L 80 32 L 50 70 L 44 62 Z"
                fill="url(#redGrad)"
                stroke="url(#goldGrad1)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="brand-logo-text">
              <span className="logo-title-apple">APPLE</span>
              <span className="logo-subtitle-ins">Insurance</span>
            </div>
          </div>

          <h2 className="office-title">สำนักงานเปิ้ลประกัน</h2>
          <p className="office-subtitle">
            ศูนย์รวมประกัน & งานทะเบียน ครบ จบ ดูแลต่อเนื่อง
          </p>
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

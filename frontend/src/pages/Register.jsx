import React, { useState, useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Staff'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side Validations
    if (!formData.name.trim() || !formData.username.trim() || !formData.password) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (formData.password.length < 4) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        email: formData.email.trim(),
        phone: formData.phone.trim()
      };

      const res = await api.post('/auth/register', payload);
      setSuccessMsg(res.data?.message || 'ลงทะเบียนพนักงานสำเร็จเรียบร้อย! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...');

      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
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

      {/* Top Right: Dark Mode Toggle Switch */}
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

      {/* Glassmorphic Registration Card */}
      <div className="login-glass-card register-glass-card">
        {/* Brand Logo & Header */}
        <div className="brand-header mb-3">
          <div className="brand-logo-wrap mb-2">
            <div className="logo-badge-container" style={{ width: '100px', height: '100px', borderRadius: '20px' }}>
              <img
                src="/logo.png"
                alt="สำนักงานเปิ้ล ประกันภัยครบวงจร"
              />
            </div>
          </div>

          <h2 className="office-title fs-4">สมัครสมาชิกสำหรับพนักงาน</h2>
          <p className="office-subtitle">
            Employee Registration & Account Setup (สำนักงานเปิ้ลประกันภัย)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert-box" role="alert">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div 
            className="d-flex align-items-center mb-3 p-3 rounded-3 text-success shadow-sm"
            style={{ 
              background: 'rgba(34, 197, 94, 0.15)', 
              border: '1px solid rgba(34, 197, 94, 0.4)',
              backdropFilter: 'blur(8px)'
            }}
            role="alert"
          >
            <i className="bi bi-check-circle-fill fs-5 me-2 text-success"></i>
            <span className="small fw-semibold">{successMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="login-form-content">
          <div className="row g-3">
            
            {/* 1. Full Name */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regName">
                  ชื่อ-นามสกุล <span className="text-danger">*</span>
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-person-vcard"></i>
                  </span>
                  <input
                    id="regName"
                    name="name"
                    type="text"
                    className="field-input"
                    placeholder="เช่น สมชาย ใจดี"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 2. Username */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regUsername">
                  ชื่อผู้ใช้งาน (USERNAME) <span className="text-danger">*</span>
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    id="regUsername"
                    name="username"
                    type="text"
                    className="field-input font-monospace"
                    placeholder="เช่น somchai_sales"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 3. Email */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regEmail">
                  อีเมล (EMAIL)
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-envelope"></i>
                  </span>
                  <input
                    id="regEmail"
                    name="email"
                    type="email"
                    className="field-input"
                    placeholder="example@ple-insurance.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 4. Phone */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regPhone">
                  เบอร์โทรศัพท์ (PHONE)
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    id="regPhone"
                    name="phone"
                    type="tel"
                    className="field-input"
                    placeholder="08X-XXX-XXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* 5. Password */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regPassword">
                  รหัสผ่าน (PASSWORD) <span className="text-danger">*</span>
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-key"></i>
                  </span>
                  <input
                    id="regPassword"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="field-input has-right-btn font-monospace"
                    placeholder="กำหนดรหัสผ่าน (อย่างน้อย 4 ตัว)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="field-btn-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    <i className={`bi bi-${showPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Confirm Password */}
            <div className="col-12 col-md-6">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regConfirmPassword">
                  ยืนยันรหัสผ่าน <span className="text-danger">*</span>
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-shield-lock"></i>
                  </span>
                  <input
                    id="regConfirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="field-input has-right-btn font-monospace"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="field-btn-eye"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                    title={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    <i className={`bi bi-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Role Selection */}
            <div className="col-12">
              <div className="input-field-group mb-0">
                <label className="field-label" htmlFor="regRole">
                  ตำแหน่ง / สิทธิ์การใช้งาน (ROLE) <span className="text-danger">*</span>
                </label>
                <div className="field-input-wrapper">
                  <span className="field-icon-left">
                    <i className="bi bi-briefcase"></i>
                  </span>
                  <select
                    id="regRole"
                    name="role"
                    className="field-input form-select"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={isLoading}
                    style={{ cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="Staff">พนักงานทั่วไป (Staff) - คีย์ข้อมูลและดูรายงาน</option>
                    <option value="Sales">เจ้าหน้าที่ฝ่ายขาย / ตัวแทน (Sales) - แจ้งงานและติดตามลูกค้า</option>
                    <option value="Manager">ผู้จัดการ / หัวหน้างาน (Manager) - จัดการและดูภาพรวม</option>
                    <option value="Admin">ผู้ดูแลระบบ (Admin) - สิทธิ์ดูแลระบบทั้งหมด</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="mt-4 pt-1">
            <button
              type="submit"
              className="btn-submit-login shadow-lg"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>กำลังบันทึกข้อมูลพนักงาน...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-person-plus-fill fs-5"></i>
                  <span>ลงทะเบียนพนักงาน (Register)</span>
                </>
              )}
            </button>
          </div>

          {/* Return to Login Link */}
          <div className="text-center mt-3 pt-2 border-top border-white border-opacity-10">
            <span className="text-white-50 small me-1">มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <Link 
              to="/login" 
              className="text-info fw-bold text-decoration-none small hover-underline"
              style={{ letterSpacing: '0.2px' }}
            >
              เข้าสู่ระบบ (Sign In) <i className="bi bi-arrow-right ms-1"></i>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

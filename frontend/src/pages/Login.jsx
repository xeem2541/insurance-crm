import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card fade-in text-center mx-auto">
        <div className="mb-4">
          <img src="/logo.png" alt="Apple Insurance Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '24px', background: 'white', padding: '10px' }} className="shadow-lg" />
        </div>
        <h2 className="mb-1 fw-bold mt-2" style={{ fontFamily: 'Kanit, sans-serif', letterSpacing: '-0.5px' }}>สำนักงานเปิ้ลประกัน</h2>
        <p className="text-muted mb-4 pb-3" style={{ fontSize: '0.95rem' }}>ศูนย์รวมประกัน & งานทะเบียน ครบ จบ ดูแลต่อเนื่อง</p>
        
        {error && <div className="alert alert-danger py-2 rounded-3 fs-6 border-0 shadow-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="text-start">
          <div className="mb-3">
            <label className="form-label fw-semibold small text-uppercase" style={{ letterSpacing: '1px' }}>ชื่อผู้ใช้งาน (Username)</label>
            <div className="input-group">
              <span className="input-group-text border-end-0"><i className="bi bi-person"></i></span>
              <input 
                type="text" 
                className="form-control form-control-lg border-start-0 ps-0" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                placeholder="กรอกชื่อผู้ใช้งาน"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold small text-uppercase" style={{ letterSpacing: '1px' }}>รหัสผ่าน (Password)</label>
            <div className="input-group">
              <span className="input-group-text border-end-0"><i className="bi bi-key"></i></span>
              <input 
                type="password" 
                className="form-control form-control-lg border-start-0 ps-0" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100 mt-3 py-3 fw-bold" style={{ borderRadius: '16px' }}>
            <i className="bi bi-box-arrow-in-right me-2"></i> เข้าสู่ระบบ (Login)
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

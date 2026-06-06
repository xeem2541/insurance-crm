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
      <div className="login-card fade-in text-center">
        <i className="bi bi-shield-fill-check text-primary" style={{ fontSize: '3rem' }}></i>
        <h3 className="mb-1 fw-bold text-dark mt-2" style={{ fontFamily: 'Kanit, sans-serif' }}>สำนักงานเปิ้ลประกัน</h3>
        <p className="text-muted mb-4 pb-2" style={{ fontSize: '0.9rem' }}>ศูนย์รวมประกัน & งานทะเบียน ครบ จบ ดูแลต่อเนื่อง</p>
        
        {error && <div className="alert alert-danger py-2 rounded-3 fs-6">{error}</div>}
        
        <form onSubmit={handleSubmit} className="text-start">
          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold small">ชื่อผู้ใช้งาน (Username)</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0"><i className="bi bi-person text-muted"></i></span>
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
            <label className="form-label text-secondary fw-semibold small">รหัสผ่าน (Password)</label>
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0"><i className="bi bi-key text-muted"></i></span>
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
          <button type="submit" className="btn btn-primary btn-lg w-100 mt-2">
            <i className="bi bi-box-arrow-in-right me-2"></i> เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

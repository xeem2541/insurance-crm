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
    <div className="login-centered-layout">
      <div className="login-card">
        <div className="logo-circle">
          <img src="/logo.png" alt="Logo" />
        </div>
        
        <h3>LOG IN</h3>

        {error && <div className="alert alert-danger py-2 rounded-3 fs-6 shadow-sm text-center mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-person-fill"></i></span>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Username"
            />
          </div>
          
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-lock-fill"></i></span>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Password"
            />
          </div>

          <div className="form-check d-flex align-items-center mb-4">
            <input className="form-check-input mt-0 me-2" type="checkbox" id="rememberMe" style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
            <label className="form-check-label" htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
              Remember me
            </label>
          </div>

          <button type="submit" className="btn btn-login text-uppercase">
            Login
          </button>

          <a href="#" className="forgot-password">Forgot Password?</a>
        </form>
      </div>
    </div>
  );
};

export default Login;

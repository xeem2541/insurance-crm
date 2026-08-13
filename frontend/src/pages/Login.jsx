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
    <div className="login-split-layout">
      <div className="row g-0 h-100">
        {/* Left side: Image */}
        <div className="col-md-6 d-none d-md-flex login-image-side">
        </div>
        
        {/* Right side: Form */}
        <div className="col-md-6 d-flex align-items-center justify-content-center bg-white login-form-side">
          <div className="login-form-container p-4 p-md-5 w-100" style={{ maxWidth: '450px' }}>
            
            <div className="text-center mb-5">
              <h3 className="mb-2 fw-medium" style={{ color: '#333', letterSpacing: '-0.5px' }}>Login to continue</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>สำนักงานเปิ้ลประกัน</p>
            </div>

            {error && <div className="alert alert-danger py-2 rounded-3 fs-6 border-0 shadow-sm text-center">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input 
                  type="text" 
                  className="form-control form-control-lg login-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  placeholder="Username"
                />
              </div>
              
              <div className="mb-4">
                <input 
                  type="password" 
                  className="form-control form-control-lg login-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Password"
                />
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4 px-1">
                <div className="form-check m-0 d-flex align-items-center">
                  <input className="form-check-input mt-0 me-2" type="checkbox" id="rememberMe" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label className="form-check-label text-muted" htmlFor="rememberMe" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Remember me
                  </label>
                </div>
                <a href="#" className="text-muted text-decoration-none hover-dark" style={{ fontSize: '0.85rem' }}>Forgot Password?</a>
              </div>

              <button type="submit" className="btn btn-login w-100 py-3 fw-bold text-white mb-4">
                LOGIN
              </button>

              <div className="text-center">
                <p className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>or sign up using</p>
                <div className="d-flex justify-content-center gap-3">
                  <button type="button" className="btn btn-social rounded-circle p-0 shadow-sm" style={{ backgroundColor: '#3b5998', color: 'white', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-facebook" style={{ fontSize: '1rem' }}></i>
                  </button>
                  <button type="button" className="btn btn-social rounded-circle p-0 shadow-sm" style={{ backgroundColor: '#1da1f2', color: 'white', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-twitter" style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

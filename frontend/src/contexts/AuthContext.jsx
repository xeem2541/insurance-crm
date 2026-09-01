import React, { createContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showIdleModal, setShowIdleModal] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error(error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  // ✅ FIX: Heartbeat เฉพาะตอน Login แล้วเท่านั้น (ไม่ ping ตอน user = null)
  useEffect(() => {
    if (!user) return;

    api.get('/health').catch(() => {});

    const heartbeatInterval = setInterval(async () => {
      try {
        await api.get('/health');
      } catch (e) {
        // Silently ignore
      }
    }, 60 * 1000);

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  // ✅ FIX: Idle Timeout → ใช้ Modal แทน alert() ที่บล็อก UI
  useEffect(() => {
    if (!user) {
      clearTimeout(idleTimerRef.current);
      return;
    }

    const resetTimeout = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setShowIdleModal(true);
      }, 60 * 60 * 1000); // 60 นาที
    };

    let throttleTimer;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        resetTimeout();
        throttleTimer = null;
      }, 2000); // Throttle updates to max once every 2 seconds
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    resetTimeout();
    events.forEach(e => window.addEventListener(e, handleActivity));

    return () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(throttleTimer);
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [user]);

  const handleIdleLogout = () => {
    setShowIdleModal(false);
    logout();
    window.location.href = '/login';
  };

  const handleIdleStay = () => {
    setShowIdleModal(false);
    window.dispatchEvent(new Event('mousedown'));
  };

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {loading ? (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            border: '3px solid rgba(251,191,36,0.2)',
            borderTop: '3px solid #fbbf24',
            animation: 'spin 0.9s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h5 style={{ marginTop: '20px', color: '#fbbf24', fontWeight: '700' }}>กำลังเชื่อมต่อระบบ...</h5>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>อาจใช้เวลาสักครู่หากระบบพักหน้าจอ</p>
        </div>
      ) : (
        children
      )}

      {/* ✅ Idle Timeout Modal — ไม่บล็อก UI thread */}
      {showIdleModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: '24px',
            padding: '36px 32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏰</div>
            <h4 style={{ color: '#fbbf24', fontWeight: '800', marginBottom: '10px' }}>
              ไม่มีการใช้งานนานเกินไป
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
              ระบบตรวจพบว่าคุณไม่ได้ใช้งานเป็นเวลา{' '}
              <strong style={{ color: '#e2e8f0' }}>60 นาที</strong>
              <br />กรุณายืนยันว่ายังอยู่ในระบบ
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleIdleStay}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff', border: 'none',
                  padding: '11px 28px', borderRadius: '12px',
                  fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
                }}
              >
                ✅ ยังอยู่ในระบบ
              </button>
              <button
                onClick={handleIdleLogout}
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
                  padding: '11px 24px', borderRadius: '12px',
                  fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

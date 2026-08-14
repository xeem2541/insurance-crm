import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Frontend Keep-Alive Heartbeat: Send lightweight ping every 60 seconds to keep backend & DB awake 24/7
  useEffect(() => {
    // Ping immediately once on mount
    api.get('/health').catch(() => {});

    const heartbeatInterval = setInterval(async () => {
      try {
        await api.get('/health');
      } catch (e) {
        // Silently ignore ping errors
      }
    }, 60 * 1000);

    return () => clearInterval(heartbeatInterval);
  }, [user]);

  // Idle Timeout Mechanism (Reset on user interaction)
  useEffect(() => {
    let timeoutId;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      if (user) {
        // 60 minutes (3600000 ms) idle timeout
        timeoutId = setTimeout(() => {
          logout();
          alert('ระบบได้ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเป็นเวลานาน');
          window.location.href = '/login';
        }, 60 * 60 * 1000);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    if (user) {
      resetTimeout();
      events.forEach(e => window.addEventListener(e, resetTimeout));
    }

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimeout));
    };
  }, [user]);

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
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4 className="mt-3 text-secondary fw-bold">กำลังเชื่อมต่อฐานข้อมูล...</h4>
          <p className="text-muted">อาจใช้เวลาสักครู่ (10-30 วินาที) หากระบบพักหน้าจอ</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

import axios from 'axios';

// Smart API URL Detection (Works on Localhost, Vercel, Render, and Mobile devices)
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not local host, use the deployed backend URL as fallback
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://insurance-crm-backend-omega.vercel.app/api';
    }
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 35000, // 35 seconds to allow cloud backend cold start
});

// Request Interceptor: Attach Auth Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor: Auto-Retry on Cold Start (502, 503, 504, Network Error)
api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0;
    const maxRetries = 3;

    // Check if error is transient / server waking up
    const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
    const isServerWakingUp = error.response && [502, 503, 504].includes(error.response.status);
    const isTimeout = error.code === 'ECONNABORTED';

    if ((isNetworkError || isServerWakingUp || isTimeout) && config.__retryCount < maxRetries) {
      config.__retryCount += 1;
      const delayMs = config.__retryCount * 1200; // 1.2s, 2.4s, 3.6s
      console.warn(`[API Auto-Retry] เซิร์ฟเวอร์กำลังตอบสนอง ทำการลองใหม่รอบที่ ${config.__retryCount}/${maxRetries} ในอีก ${delayMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;

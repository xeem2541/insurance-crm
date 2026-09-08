import axios from 'axios';

// Smart API URL Detection — Priority: env var → production fallback → localhost
// ✅ ตั้งค่า VITE_API_URL ใน Vercel Dashboard > Settings > Environment Variables
// เช่น: VITE_API_URL=https://insurance-crm-backend-omega.vercel.app/api
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Production safety fallback (ควรตั้ง VITE_API_URL ใน Vercel แทน)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://insurance-crm-backend-omega.vercel.app/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 35000, // 35 seconds to allow cloud backend cold start
  withCredentials: true, // Required for sending HttpOnly cookies (refresh token)
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

// Prevent infinite loop if /auth/refresh fails
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Auto-Retry on Cold Start & Token Refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // --- Token Refresh Logic ---
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        try {
          const token = await new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${getBaseUrl()}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.token;
        localStorage.setItem('token', newToken);
        
        // Update user data if needed
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed (e.g., expired refresh token), log out user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // --- Cold Start Retry Logic ---
    originalRequest.__retryCount = originalRequest.__retryCount || 0;
    const maxRetries = 3;

    const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
    const isServerWakingUp = error.response && [502, 503, 504].includes(error.response.status);
    const isTimeout = error.code === 'ECONNABORTED';

    if ((isNetworkError || isServerWakingUp || isTimeout) && originalRequest.__retryCount < maxRetries) {
      originalRequest.__retryCount += 1;
      const delayMs = originalRequest.__retryCount * 1200;
      console.warn(`[API Auto-Retry] เซิร์ฟเวอร์กำลังตอบสนอง ทำการลองใหม่รอบที่ ${originalRequest.__retryCount}/${maxRetries} ในอีก ${delayMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;

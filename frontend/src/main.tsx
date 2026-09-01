import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.scss'

// หุ้ม Global Error Handler เพื่อดักจับ Error จาก Chrome Extension (เช่น Web Vitals / Performance monitor)
// ป้องกันไม่ให้ Error แดงขึ้นกวนใจใน Console แม้จะไม่ใช่บั๊กของระบบก็ตาม
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes("Cannot read properties of undefined (reading 'startTime')")) {
    e.preventDefault(); // Suppress the error
    e.stopPropagation();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.scss'

// ห้ามลบ: ป้องกัน Error จาก Chrome Extensions (เช่น React DevTools) ทำให้เกิดข้อความแดงใน Console
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    args[0].includes("Cannot read properties of undefined (reading 'startTime')")
  ) {
    return; // Ignore this specific extension error
  }
  if (args[0] instanceof Error && args[0].message.includes("reading 'startTime'")) {
    return;
  }
  originalConsoleError(...args);
};

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

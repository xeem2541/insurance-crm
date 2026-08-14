import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';

/**
 * AiAccuracyHero Component
 * แสดงส่วนหัวข้อสแกนเอกสารด้วย AI พร้อมตัวเลขเปอร์เซ็นต์ความแม่นยำแบบ Dynamic Count-up Animation
 * และเส้น Progress Line แสดงสถานะความแม่นยำเรืองแสง (Neon Glow)
 */
const AiAccuracyHero = ({
  accuracyRate = 98.5,
  ocrLoading = false,
  ocrSeconds = 0,
  onOpenSettings,
  onCameraClick,
  onFileClick,
  onHelpClick
}) => {
  const [animatedAccuracy, setAnimatedAccuracy] = useState(0);

  // Smooth Count-up Animation Effect
  useEffect(() => {
    let startTimestamp = null;
    const duration = 1800; // 1.8 seconds animation
    const targetValue = Math.min(100, Math.max(0, Number(accuracyRate) || 98.5));

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Ease-out Cubic easing curve for natural smooth slowdown
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = easeOutProgress * targetValue;
      
      setAnimatedAccuracy(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setAnimatedAccuracy(targetValue);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [accuracyRate]);

  return (
    <div 
      className="card border-0 mb-4 overflow-hidden position-relative shadow-lg" 
      style={{ 
        background: 'linear-gradient(135deg, #09151b 0%, #0f2b35 50%, #163e4d 100%)',
        boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
        borderRadius: '24px',
        border: '1px solid rgba(0, 255, 136, 0.15)'
      }}
    >
      {/* Decorative Cyber Ambient Glow Orbs */}
      <div 
        style={{
          position: 'absolute', 
          top: '-60px', 
          right: '-40px', 
          width: '260px', 
          height: '260px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.22) 0%, rgba(0, 255, 136, 0.05) 50%, rgba(0,0,0,0) 75%)',
          borderRadius: '50%', 
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div 
        style={{
          position: 'absolute', 
          bottom: '-50px', 
          left: '-30px', 
          width: '200px', 
          height: '200px',
          background: 'radial-gradient(circle, rgba(13, 202, 240, 0.18) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', 
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <div className="card-body text-center py-5 px-3 px-md-4 position-relative" style={{ zIndex: 1 }}>
        
        {/* 1. Main Header */}
        <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
          <div 
            className="d-inline-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: '42px',
              height: '42px',
              background: 'rgba(0, 255, 136, 0.15)',
              border: '1px solid rgba(0, 255, 136, 0.4)',
              boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)'
            }}
          >
            <i className="bi bi-stars fs-4" style={{ color: '#00ff88' }}></i>
          </div>
          <h2 
            className="fw-bold mb-0 text-white" 
            style={{ 
              letterSpacing: '0.6px',
              fontSize: 'calc(1.4rem + 0.6vw)',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            สแกนรูปด้วย <span style={{ color: '#00ff88', textShadow: '0 0 18px rgba(0,255,136,0.55)' }}>AI อัจฉริยะ</span>
          </h2>
        </div>

        {/* 2. Dynamic Accuracy Display Card & Count-up Animation */}
        <div 
          className="mx-auto my-3 p-3 p-md-4 rounded-4"
          style={{
            maxWidth: '560px',
            background: 'rgba(5, 18, 24, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 255, 136, 0.22)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.25)'
          }}
        >
          <div className="d-flex flex-column align-items-center">
            
            {/* Header Badge */}
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge rounded-pill bg-success-subtle text-success px-3 py-1 fw-semibold border border-success-subtle" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-activity me-1"></i> AI Live Performance
              </span>
            </div>

            {/* Big Neon Glow Percentage Number */}
            <div className="d-flex align-items-baseline justify-content-center my-1">
              <span 
                className="fw-bold" 
                style={{ 
                  fontSize: 'calc(2.6rem + 1.2vw)',
                  fontWeight: '800',
                  color: '#00ff88',
                  lineHeight: '1',
                  fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
                  letterSpacing: '-1px',
                  textShadow: '0 0 20px rgba(0, 255, 136, 0.75), 0 0 45px rgba(0, 255, 136, 0.35)'
                }}
              >
                {animatedAccuracy.toFixed(1)}
              </span>
              <span 
                className="fw-bold ms-1"
                style={{
                  fontSize: 'calc(1.5rem + 0.6vw)',
                  color: '#00ff88',
                  textShadow: '0 0 15px rgba(0, 255, 136, 0.6)'
                }}
              >
                %
              </span>
            </div>

            {/* Subtext */}
            <div className="text-white-50 small mt-1" style={{ fontSize: '0.86rem', letterSpacing: '0.2px' }}>
              <i className="bi bi-shield-check text-success me-1"></i> ความแม่นยำเฉลี่ยจากสถิติระบบล่าสุด (คำนวณและปรับอัตโนมัติ)
            </div>

            {/* 3. Sleek Glowing Progress Line Indicator */}
            <div className="w-100 mt-3 position-relative" style={{ maxWidth: '420px' }}>
              {/* Progress Track Background */}
              <div 
                className="w-100 rounded-pill overflow-hidden" 
                style={{ 
                  height: '7px', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
                }}
              >
                {/* Active Progress Bar */}
                <div 
                  className="h-100 rounded-pill position-relative"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, animatedAccuracy))}%`,
                    background: 'linear-gradient(90deg, #00b09b 0%, #00ff88 70%, #a8ff78 100%)',
                    boxShadow: '0 0 14px rgba(0, 255, 136, 0.9), 0 0 25px rgba(0, 255, 136, 0.45)',
                    transition: 'width 0.1s linear'
                  }}
                />
              </div>

              {/* Glowing Indicator Dot at the Tip */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `calc(${Math.min(100, Math.max(0, animatedAccuracy))}% - 6px)`,
                  transform: 'translateY(-50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 10px #00ff88, 0 0 20px #00ff88',
                  pointerEvents: 'none',
                  transition: 'left 0.1s linear'
                }}
              />
            </div>

          </div>
        </div>

        {/* 4. Gemini Badge & Settings Button */}
        <div className="mb-4 d-flex justify-content-center align-items-center gap-2 flex-wrap">
          <span 
            className="badge rounded-pill px-3 py-2 shadow-sm d-inline-flex align-items-center" 
            style={{ 
              background: 'linear-gradient(45deg, #FFD700, #FDB931)', 
              color: '#1a1a1a',
              fontWeight: '600',
              border: '1px solid rgba(255,215,0,0.5)',
              fontSize: '0.82rem'
            }}
          >
            <i className="bi bi-cpu-fill me-1"></i> ขับเคลื่อนโดย Gemini Vision AI
          </span>
          <button 
            type="button"
            className="btn btn-sm btn-outline-light rounded-pill px-3 shadow-sm" 
            style={{ 
              backdropFilter: 'blur(6px)', 
              borderColor: 'rgba(255,255,255,0.35)',
              fontSize: '0.82rem',
              fontWeight: '500'
            }}
            onClick={onOpenSettings}
          >
            <i className="bi bi-gear-fill me-1 text-info"></i> ตั้งค่า / ทดสอบ API Key
          </button>
        </div>

        {/* 5. Action Buttons / Loading Status */}
        {ocrLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center fw-bold mt-4" style={{ color: '#00ff88' }}>
            <div 
              className="spinner-border mb-3" 
              role="status" 
              style={{ width: '3.2rem', height: '3.2rem', borderWidth: '0.28em', color: '#00ff88' }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="fs-5 tracking-wide text-white" style={{ textShadow: '0 0 10px rgba(0,255,136,0.4)' }}>
              กำลังประมวลผลด้วย Gemini AI... ผ่านไปแล้ว <span style={{ color: '#00ff88' }}>{ocrSeconds}</span> วินาที
            </span>
            <span className="text-white-50 small mt-1">ระบบกำลังสกัดข้อมูลและตรวจสอบความถูกต้องอัตโนมัติ</span>
          </div>
        ) : (
          <div className="mt-4 d-flex flex-column align-items-center">
            <div className="d-flex flex-wrap justify-content-center gap-3">
              {/* Camera Button */}
              <Button 
                className="btn btn-lg fw-bold px-4 py-3 rounded-pill shadow-lg d-inline-flex align-items-center" 
                style={{ 
                  background: 'linear-gradient(45deg, #00b09b, #96c93d)', 
                  color: '#fff', 
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; 
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 176, 155, 0.45)'; 
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; 
                }}
                onClick={onCameraClick}
              >
                <i className="bi bi-camera-fill me-2 fs-4"></i> 
                <span>เปิดกล้องถ่ายรูปสแกน</span>
              </Button>

              {/* Pick File Button */}
              <Button 
                className="btn btn-lg fw-bold px-4 py-3 rounded-pill shadow-lg btn-outline-light d-inline-flex align-items-center" 
                style={{ 
                  border: '2px solid rgba(255,255,255,0.45)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '1.05rem',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; 
                  e.currentTarget.style.borderColor = '#ffffff';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; 
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                }}
                onClick={onFileClick}
              >
                <i className="bi bi-folder-fill me-2 fs-4 text-warning"></i> 
                <span>เลือกรูปภาพ/ไฟล์ในเครื่อง</span>
              </Button>
            </div>

            {/* Helper tips */}
            <div className="w-100 text-center mt-3 text-white-50 small">
              <i className="bi bi-info-circle me-1 text-info"></i> 
              คำแนะนำ: ถ่ายภาพด้วยกล้องหลัก 1x เพื่อความคมชัดสูงสุด{' '}
              <span 
                onClick={onHelpClick} 
                style={{ color: '#00ff88', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
              >
                [ดูคำแนะนำการถ่ายภาพ]
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAccuracyHero;

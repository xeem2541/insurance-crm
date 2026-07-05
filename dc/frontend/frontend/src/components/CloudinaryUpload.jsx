import React, { useEffect, useRef } from 'react';

const CloudinaryUpload = ({ onUploadSuccess, cloudName = 'dplaceholder', uploadPreset = 'unsigned_preset', buttonText = 'อัปโหลดไฟล์' }) => {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    if (window.cloudinary) {
      cloudinaryRef.current = window.cloudinary;
      widgetRef.current = cloudinaryRef.current.createUploadWidget(
        {
          cloudName: cloudName,
          uploadPreset: uploadPreset,
          sources: ['local', 'camera', 'google_drive'],
          multiple: false,
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
          maxFileSize: 10485760, // 10MB
          language: 'th',
          text: {
            th: {
              or: "หรือ",
              menu: {
                files: "ไฟล์ของฉัน",
                web: "เว็บ URL",
                camera: "กล้องถ่ายรูป",
                gsearch: "ค้นหารูป",
                gdrive: "Google Drive"
              },
              local: {
                browse: "เลือกไฟล์",
                dd_title_single: "ลากไฟล์มาวางที่นี่",
                drop_title_single: "ปล่อยไฟล์เพื่ออัปโหลด"
              }
            }
          }
        },
        (error, result) => {
          if (!error && result && result.event === 'success') {
            onUploadSuccess(result.info);
          }
        }
      );
    }
  }, [cloudName, uploadPreset, onUploadSuccess]);

  const handleOpenWidget = (e) => {
    e.preventDefault();
    if (widgetRef.current) {
      widgetRef.current.open();
    } else {
      alert("ไม่สามารถเปิดระบบอัปโหลดได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
    }
  };

  return (
    <button className="btn btn-outline-primary" onClick={handleOpenWidget}>
      <i className="bi bi-cloud-arrow-up me-2"></i> {buttonText}
    </button>
  );
};

export default CloudinaryUpload;

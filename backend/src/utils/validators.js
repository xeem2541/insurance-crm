// Helper function to validate Thai National ID (13 digits, Modulo 11 check digit)
function validateThaiIdCard(idStr) {
  if (!idStr) return { valid: false, message: '' };
  const cleanId = idStr.toString().replace(/\D/g, '');
  if (cleanId.length === 0) return { valid: false, message: '' };
  if (cleanId.length !== 13) {
    return { valid: false, message: `เลขบัตรประชาชนที่สแกนได้มี ${cleanId.length} หลัก (ต้องมี 13 หลัก)` };
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  const lastDigit = parseInt(cleanId.charAt(12), 10);
  if (checkDigit !== lastDigit) {
    return { valid: false, message: 'เลขบัตรประชาชนไม่ตรงตามสูตรคำนวณมาตรฐาน (Check Digit ตรวจสอบไม่ผ่าน)' };
  }
  return { valid: true, message: '' };
}

// Helper function to validate Vehicle Identification Number (VIN / Chassis No.)
function validateVin(vinStr) {
  if (!vinStr) return { valid: true, message: '' };
  const cleanVin = vinStr.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanVin.length === 0) return { valid: true, message: '' };
  if (cleanVin.length !== 17) {
    return { valid: false, message: `เลขตัวถัง (VIN) ที่สแกนได้มี ${cleanVin.length} หลัก (มาตรฐานต้องมี 17 หลัก)` };
  }
  if (/[IOQ]/.test(cleanVin)) {
    return { valid: false, message: 'เลขตัวถัง (VIN) มีตัวอักษรต้องห้ามตามมาตรฐาน ISO (I, O, Q) กรุณาตรวจสอบอีกครั้ง' };
  }
  return { valid: true, message: '' };
}

module.exports = {
  validateThaiIdCard,
  validateVin
};

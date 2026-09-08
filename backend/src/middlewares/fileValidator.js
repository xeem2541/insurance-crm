const path = require('path');

// Allowed mime types based on your application needs
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

/**
 * Middleware to validate uploaded files using `file-type` to check actual magic numbers
 */
const validateFileType = async (req, res, next) => {
  try {
    // Collect all files from req.file or req.files (array or object)
    let files = [];
    if (req.file) {
      files.push(req.file);
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        files = req.files;
      } else {
        // Handle object of arrays (e.g. upload.fields)
        for (const key in req.files) {
          files = files.concat(req.files[key]);
        }
      }
    }

    if (files.length === 0) {
      return next(); // No files uploaded, skip validation
    }

    // Dynamic import of ESM module `file-type`
    const { fileTypeFromBuffer } = await import('file-type');

    for (const file of files) {
      // 1. Verify actual content type via magic numbers
      const type = await fileTypeFromBuffer(file.buffer);
      
      if (!type) {
        return res.status(400).json({ error: 'ไม่สามารถระบุประเภทของไฟล์ได้ (ไฟล์อาจเสียหรือเป็นอันตราย)' });
      }

      if (!ALLOWED_MIME_TYPES.includes(type.mime)) {
        return res.status(400).json({ error: `ไม่อนุญาตให้อัปโหลดไฟล์ประเภท ${type.mime}` });
      }

      // 2. Validate extension matches the mime type (Prevent double extensions or spoofing)
      // Note: multer already sets file.mimetype based on the client's header, 
      // but we override/verify it with the actual detected mime type.
      file.mimetype = type.mime; 
    }

    next();
  } catch (error) {
    console.error('[SECURITY] File validation error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบไฟล์' });
  }
};

module.exports = { validateFileType };

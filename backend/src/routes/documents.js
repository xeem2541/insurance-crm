const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middlewares/auth');
const { validateFileType } = require('../middlewares/fileValidator');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { isS3Configured, uploadFileToS3, getPresignedUrl } = require('../utils/s3');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.log("Skipping mkdir on Vercel: ", err.message);
  }
}

// Multer config (Memory Storage for Vercel Serverless)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, and PNG files are allowed!'));
  }
});

// Serve file dynamically from Disk/DB (Protected)
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const [docs] = await req.db.query('SELECT file_data, file_type FROM documents WHERE id = ?', [req.params.id]);
    if (docs.length === 0) {
      return res.status(404).send('File not found');
    }
    const doc = docs[0];
    res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');

    const filePath = path.join(__dirname, '../../uploads/documents', `motor_${req.params.id}`);
    const s3Key = `documents/motor_${req.params.id}`;
    
    // Check disk first
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } 
    // Fallback to S3 if configured
    else if (isS3Configured) {
      try {
        const signedUrl = await getPresignedUrl(s3Key);
        if (signedUrl) return res.redirect(signedUrl);
      } catch (s3Err) {
        console.error('S3 Fetch Error:', s3Err);
      }
    }
    
    // Fallback to DB (for pre-migration or unsynced records)
    if (doc.file_data) {
      const buffer = Buffer.from(doc.file_data, 'base64');
      return res.send(buffer);
    } else {
      return res.status(404).send('File not found on disk, S3, or DB');
    }
  } catch (error) {
    console.error('Error fetching document file:', error);
    res.status(500).send('Server error');
  }
});

// Get document types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [types] = await req.db.query('SELECT * FROM document_types');
    res.json(types);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get documents (by customer or policy)
router.get('/', authenticateToken, async (req, res) => {
  const { customer_id, policy_id, search, status } = req.query;
  // Exclude file_data from normal list queries to save bandwidth
  let query = `
    SELECT d.id, d.customer_id, d.policy_id, d.document_type_id, d.name, d.file_path, d.file_type, d.file_size, d.version, d.note, d.uploaded_by, d.created_at, d.deleted_at, 
           dt.name as document_type_name, u.name as uploader_name 
    FROM documents d
    JOIN document_types dt ON d.document_type_id = dt.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE ${status === 'deleted' ? 'd.deleted_at IS NOT NULL' : 'd.deleted_at IS NULL'}
  `;
  let params = [];
  
  if (customer_id) {
    query += ' AND d.customer_id = ? ';
    params.push(customer_id);
  }
  if (policy_id) {
    query += ' AND d.policy_id = ? ';
    params.push(policy_id);
  }
  if (search) {
    query += ' AND (d.name LIKE ? OR dt.name LIKE ?) ';
    const s = `%${search}%`;
    params.push(s, s);
  }
  
  query += ' ORDER BY d.created_at DESC LIMIT 150';

  try {
    const [documents] = await req.db.query(query, params);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents list:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload document for motor policy
router.post('/upload', authenticateToken, uploadLimiter, upload.single('file'), validateFileType, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { customer_id, policy_id, document_type_id, name, note } = req.body;
  
  try {
    // 1. Insert into DB (file_data is NULL)
    const [result] = await req.db.query(
      `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, version, note, uploaded_by, file_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)`,
      [
        customer_id, 
        policy_id || null, 
        document_type_id, 
        name, 
        '', // We will update this with the ID next
        req.file.mimetype, 
        req.file.size, 
        note, 
        req.user.id
      ]
    );

    const newId = result.insertId;
    const dynamicFilePath = `/api/documents/file/${newId}`;
    const s3Key = `documents/motor_${newId}`;
    
    // 2. Save file to S3 OR local disk
    if (isS3Configured) {
      try {
        await uploadFileToS3(req.file.buffer, s3Key, req.file.mimetype);
      } catch (s3Err) {
        console.error('S3 upload error:', s3Err);
        throw s3Err;
      }
    } else {
      const localFilePath = path.join(__dirname, '../../uploads/documents', `motor_${newId}`);
      try {
        fs.writeFileSync(localFilePath, req.file.buffer);
      } catch (writeErr) {
        console.error('File write error:', writeErr);
        // Fallback to storing base64 in DB if disk fails
        const base64Data = req.file.buffer.toString('base64');
        await req.db.query('UPDATE documents SET file_data = ? WHERE id = ?', [base64Data, newId]);
      }
    }

    // 3. Update file_path in DB
    await req.db.query('UPDATE documents SET file_path = ? WHERE id = ?', [dynamicFilePath, newId]);

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPLOAD', 'documents', newId, `Uploaded document ${name}`]);

    res.status(201).json({ id: newId, message: 'Document uploaded successfully', file_path: dynamicFilePath });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft Delete document — with ownership/existence check (W-04 IDOR fix)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Verify document exists and is not already deleted
    const [docs] = await req.db.query(
      'SELECT id, uploaded_by FROM documents WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Allow Admin/Manager to delete any document; others can only delete their own uploads
    const isAdminOrManager = ['admin', 'manager'].includes((req.user.role || '').toLowerCase());
    if (!isAdminOrManager && docs[0].uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only delete documents you uploaded.' });
    }

    await req.db.query('UPDATE documents SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'documents', req.params.id, `Deleted document ID ${req.params.id}`]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore deleted document
router.put('/:id/restore', authenticateToken, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await req.db.query('UPDATE documents SET deleted_at = NULL WHERE id = ?', [req.params.id]);
    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'documents', req.params.id, `Restored document ID ${req.params.id}`]);
    res.json({ message: 'Document restored successfully' });
  } catch (error) {
    console.error('Error restoring document:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save document from remote URL (e.g., from LINE OA)
router.post('/save-url', authenticateToken, uploadLimiter, async (req, res) => {
  const { customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, note } = req.body;
  
  if (!file_path) return res.status(400).json({ error: 'No file_path provided' });

  try {
    const [result] = await req.db.query(
      `INSERT INTO documents (customer_id, policy_id, document_type_id, name, file_path, file_type, file_size, version, note, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        customer_id, 
        policy_id || null, 
        document_type_id, 
        name, 
        file_path, 
        file_type || 'image/jpeg', 
        file_size || 0, 
        note, 
        req.user.id
      ]
    );

    await req.db.query('INSERT INTO activity_logs (user_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPLOAD', 'documents', result.insertId, `Uploaded Cloudinary document ${name}`]);

    res.status(201).json({ id: result.insertId, message: 'Document saved successfully', file_path });
  } catch (error) {
    console.error('Error saving document URL:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

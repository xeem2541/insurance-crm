// @ts-check
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { validateFileType } = require('../middlewares/fileValidator');
const aiOcrController = require('../controllers/aiOcrController');

// Use memory storage for quick processing without saving to disk permanently
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB max

// Endpoint to test Gemini API Key connectivity and latency — requires login
router.post('/test-key', authenticateToken, aiOcrController.testApiKey);

// Endpoint to extract document data
router.post('/extract', authenticateToken, upload.array('images', 10), validateFileType, aiOcrController.extractDocument);

// Endpoint to get AI Usage Statistics & Recent Logs (Admin & Manager only)
router.get('/stats', authenticateToken, authorizeRole(['admin', 'manager']), aiOcrController.getStats);

module.exports = router;

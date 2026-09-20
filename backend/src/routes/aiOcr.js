const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { validateFileType } = require('../middlewares/fileValidator');
const { validateThaiIdCard, validateVin } = require('../utils/validators');
const { testGeminiKey, extractDocumentData } = require('../services/geminiService');

// Use memory storage for quick processing without saving to disk permanently
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB max

// Endpoint to test Gemini API Key connectivity and latency — requires login
router.post('/test-key', authenticateToken, async (req, res) => {
  const apiKey = (req.body?.apiKey || req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '').trim();
  
  if (!apiKey) {
    return res.status(400).json({ 
      success: false, 
      error: 'NO_KEY_PROVIDED', 
      message: 'กรุณาระบุ Gemini API Key สำหรับทดสอบ' 
    });
  }

  try {
    const result = await testGeminiKey(apiKey);
    return res.json(result);
  } catch (err) {
    console.warn("API Key test failed:", err.response?.message || err);
    return res.status(err.status || 500).json(err.response || { success: false, error: 'UNKNOWN_ERROR' });
  }
});

router.post('/extract', authenticateToken, upload.array('images', 10), validateFileType, async (req, res) => {
  let startTime = Date.now();
  let usedModelName = 'unknown';
  let lastErrorMsg = null;
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const apiKey = (req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'GEMINI_API_KEY_REQUIRED', 
        message: 'กรุณาระบุ Gemini API Key ในการสแกนเอกสาร' 
      });
    }

    const imageParts = req.files.map(file => ({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64')
      }
    }));

    const result = await extractDocumentData(apiKey, imageParts);
    let parsedData = result.parsedData;
    usedModelName = result.usedModelName;

    // 1. Verify Thai ID Card 13-digit Checksum
    if (parsedData?.customer?.id_card_no) {
      const idCheck = validateThaiIdCard(parsedData.customer.id_card_no);
      if (!idCheck.valid && idCheck.message) {
        parsedData.validation.warning_message = parsedData.validation.warning_message 
          ? `${parsedData.validation.warning_message} * ${idCheck.message}`
          : idCheck.message;
      }
    }

    // 2. Verify Vehicle VIN (Chassis Number) 17-digit ISO format
    if (parsedData?.vehicle?.vin) {
      const vinCheck = validateVin(parsedData.vehicle.vin);
      if (!vinCheck.valid && vinCheck.message) {
        parsedData.validation.warning_message = parsedData.validation.warning_message 
          ? `${parsedData.validation.warning_message} * ${vinCheck.message}`
          : vinCheck.message;
      }
    }

    // 3. Verify Premium Math Formula: net_premium + stamp_duty + vat = total_premium
    if (parsedData && parsedData.policy) {
      let net = parseFloat(parsedData.policy.net_premium || 0);
      let stamp = parseFloat(parsedData.policy.stamp_duty || 0);
      let vat = parseFloat(parsedData.policy.vat || 0);
      let total = parseFloat(parsedData.policy.total_premium || 0);

      if (net > 0 && total > 0) {
        const calculatedTotal = net + stamp + vat;
        const diff = Math.abs(calculatedTotal - total);

        if (diff > 0.001) {
          if (diff < 5.0) {
            // Mismatch is small (likely due to OCR decimal reading errors), auto-adjust VAT
            console.log(`Small premium math mismatch detected: Calculated ${calculatedTotal}, Real ${total}. Adjusting VAT...`);
            vat = total - net - stamp;
            parsedData.policy.vat = vat.toFixed(2);
            
            const adjustMsg = "ระบบตรวจสอบคำนวณปรับทศนิยมเบี้ยและภาษีมูลค่าเพิ่มให้ถูกต้องตรงกับยอดชำระแล้ว";
            parsedData.validation.warning_message = parsedData.validation.warning_message 
              ? `${parsedData.validation.warning_message} (${adjustMsg})`
              : adjustMsg;
          } else {
            // Significant mismatch, add a warning
            const mismatchMsg = `ยอดเบี้ยคำนวณสแกน (สุทธิ ${net} + อากร ${stamp} + VAT ${vat} = ${calculatedTotal.toFixed(2)}) ไม่ตรงกับเบี้ยรวมจริงในรูป (${total})`;
            parsedData.validation.warning_message = parsedData.validation.warning_message 
              ? `${parsedData.validation.warning_message} * ${mismatchMsg}`
              : mismatchMsg;
          }
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;
    let hasWarning = false;
    let warningMsg = '';
    let docType = parsedData?.document_type || 'unknown';
    
    if (parsedData?.validation?.warning_message) {
      hasWarning = true;
      warningMsg = parsedData.validation.warning_message;
    }

    if (req.db) {
      try {
        await req.db.query(
          'INSERT INTO ai_usage_logs (document_type, is_success, has_warning, warning_message, model_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
          [docType, true, hasWarning, warningMsg, usedModelName, processingTimeMs]
        );
      } catch (err) {
        console.error("Error logging AI usage:", err);
      }
    }

    res.json(parsedData);

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    let status = error.status || 500;
    let response = error.response || { error: 'UNKNOWN_ERROR' };
    
    // Check if the error object has lastError for fallback failure
    if (error.lastError) {
      lastErrorMsg = error.lastError.response?.data?.error?.message || error.lastError.message;
    } else {
      lastErrorMsg = response.message || response.error || 'AI OCR Failed';
    }

    if (req.db) {
      try {
        await req.db.query(
          'INSERT INTO ai_usage_logs (document_type, is_success, has_warning, warning_message, model_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?)',
          ['unknown', false, false, lastErrorMsg, null, processingTimeMs]
        );
      } catch (err) {
        console.error("Error logging failed AI usage:", err);
      }
    }

    res.status(status).json(response);
  }
});

// Endpoint to get AI Usage Statistics & Recent Logs (Admin & Manager only)
router.get('/stats', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    if (!req.db) {
      return res.status(500).json({ status: 'error', error: 'Database connection not available' });
    }

    // 1. Get aggregated stats
    const statsQuery = `
      SELECT 
        COUNT(*) as totalScans,
        SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END) as successfulScans,
        AVG(CASE WHEN is_success = 1 THEN processing_time_ms ELSE NULL END) as avgProcessingTime
      FROM ai_usage_logs
    `;
    const [statsResult] = await req.db.query(statsQuery);
    
    let totalScans = 0;
    let successfulScans = 0;
    let avgProcessingTime = 0;
    let successRate = 0;

    if (statsResult && statsResult.length > 0) {
      totalScans = parseInt(statsResult[0].totalScans || 0, 10);
      successfulScans = parseInt(statsResult[0].successfulScans || 0, 10);
      avgProcessingTime = parseFloat(statsResult[0].avgProcessingTime || 0).toFixed(2);
      if (totalScans > 0) {
        successRate = ((successfulScans / totalScans) * 100).toFixed(2);
      }
    }

    // 2. Get recent logs
    const historyQuery = `
      SELECT id, document_type, is_success, model_used, processing_time_ms, warning_message, created_at 
      FROM ai_usage_logs 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    const [historyResult] = await req.db.query(historyQuery);

    res.json({
      status: 'success',
      data: {
        stats: {
          totalScans,
          successfulScans,
          successRate: parseFloat(successRate),
          avgProcessingTime: parseFloat(avgProcessingTime)
        },
        history: historyResult || []
      }
    });

  } catch (error) {
    console.error("Error fetching AI stats:", error);
    res.status(500).json({ status: 'error', error: 'Failed to fetch AI usage stats' });
  }
});

module.exports = router;

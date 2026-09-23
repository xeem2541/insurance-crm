const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middlewares/auth');

// POST /api/ai/analyze
// Receives an image and a prompt, forwards it to Gemini API securely
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { modelName = 'gemini-1.5-flash', parts } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing on the server.' });
    }
    
    // Safety check: ensure it is a valid Gemini key format (roughly AIzaSy...)
    if (!apiKey.startsWith('AIzaSy')) {
       console.error('[AI Error] API Key in backend does not start with AIzaSy! It might be an OAuth token instead.');
       // We still attempt to send, but log a loud error.
    }

    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ error: 'Invalid payload: parts array is required.' });
    }

    // Clean axios instance to ensure no pollution from global defaults
    const cleanAxios = axios.create();
    if (cleanAxios.defaults.headers.common) {
        delete cleanAxios.defaults.headers.common['Authorization'];
    }

    const response = await cleanAxios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        contents: [
          { parts }
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
      },
      { 
        timeout: 60000,
        headers: {
            'Authorization': undefined // Ensure no Auth header is sent to Google
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Error in /api/ai/analyze:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const errorDetails = error.response?.data?.error || { message: error.message };
    res.status(statusCode).json({ error: 'AI Error', details: errorDetails });
  }
});

module.exports = router;

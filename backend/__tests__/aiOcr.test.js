const request = require('supertest');
const express = require('express');
const aiOcrRoutes = require('../src/routes/aiOcr');
const geminiService = require('../src/services/geminiService');

// Mock the Gemini service to prevent real API calls during tests
jest.mock('../src/services/geminiService');

// Mock auth middleware
jest.mock('../src/middlewares/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  authorizeRole: () => (req, res, next) => next()
}));

describe('AI OCR Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai-ocr', aiOcrRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    const { pool } = require('../src/db');
    if (pool && pool.end) {
      await pool.end();
    }
  });

  describe('POST /api/ai-ocr/test-key', () => {
    it('should return 400 if no API key is provided', async () => {
      const response = await request(app).post('/api/ai-ocr/test-key');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NO_KEY_PROVIDED');
    });

    it('should return success if API key is valid', async () => {
      // Mock successful response
      geminiService.testGeminiKey.mockResolvedValue({
        success: true,
        durationMs: 150,
        availableModelsCount: 5,
        availableModels: ['gemini-1.5-pro'],
        message: 'เชื่อมต่อสำเร็จ!'
      });

      const response = await request(app)
        .post('/api/ai-ocr/test-key')
        .send({ apiKey: 'fake-valid-key' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(geminiService.testGeminiKey).toHaveBeenCalledWith('fake-valid-key');
    });

    it('should return error if API key is invalid', async () => {
      // Mock failed response
      geminiService.testGeminiKey.mockRejectedValue({
        status: 401,
        response: {
          success: false,
          error: 'INVALID_API_KEY',
          message: 'API Key ไม่ถูกต้อง'
        }
      });

      const response = await request(app)
        .post('/api/ai-ocr/test-key')
        .send({ apiKey: 'fake-invalid-key' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_API_KEY');
    });
  });
});

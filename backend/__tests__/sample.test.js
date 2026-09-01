const request = require('supertest');
const app = require('../src/app');

// Mock db ping to prevent actual db connections during basic route tests
jest.mock('../src/db', () => ({
  pool: {
    getConnection: jest.fn(),
    query: jest.fn()
  },
  getDbStatus: jest.fn().mockReturnValue({ isConnected: true }),
  pingDatabase: jest.fn().mockResolvedValue({ isConnected: true })
}));

describe('GET /api', () => {
  it('should return 200 and a success message', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Insurance API is running');
    expect(response.body).toHaveProperty('database', 'connected (24/7 keepalive active)');
  });
});

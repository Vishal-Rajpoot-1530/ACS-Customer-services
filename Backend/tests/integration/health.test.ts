import request from 'supertest';
import { app } from '../../src/app';

describe('Health API Integration Tests', () => {
  it('GET /health should return 200 OK and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('healthy');
  });

  it('GET /non-existent-route should return 404', async () => {
    const res = await request(app).get('/api/v1/invalid-route-12345');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

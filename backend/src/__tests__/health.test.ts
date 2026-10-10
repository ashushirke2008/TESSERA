import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('TESSERA Backend API Foundation', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with UP status and valid metadata', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('UP');
      expect(typeof res.body.data.uptime).toBe('number');
      expect(res.body.data.version).toBe('1.0.0');
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /api/ready', () => {
    it('should report dependency readiness without claiming fake healthy state', async () => {
      const res = await request(app).get('/api/ready');

      // Since Fabric and MinIO are not connected in stage 0/1 foundation, status should be NOT_READY (503)
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('NOT_READY');
      expect(res.body.data.dependencies).toBeDefined();

      // Check Fabric dependency reporting
      const fabricDep = res.body.data.dependencies.fabric;
      expect(fabricDep).toBeDefined();
      expect(fabricDep.connected).toBe(false);
      expect(['unconfigured', 'disconnected']).toContain(fabricDep.status);

      // Check MinIO dependency reporting
      const minioDep = res.body.data.dependencies.minio;
      expect(minioDep).toBeDefined();
      expect(minioDep.connected).toBe(false);
      expect(['unconfigured', 'disconnected']).toContain(minioDep.status);
    });
  });

  describe('Error handling & placeholders', () => {
    it('should return 404 with structured JSON for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-endpoint-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 200 OK with asset list for /api/assets', async () => {
      const res = await request(app).get('/api/assets');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});

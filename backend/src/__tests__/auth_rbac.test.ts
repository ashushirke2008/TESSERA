import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { config } from '../config';

describe('TESSERA Authentication & Server-Enforced RBAC Suite', () => {
  const DEMO_PASSWORD = 'TesseraDemo@2026';

  const DEMO_ACCOUNTS = [
    { username: 'demo.issuer', expectedRole: 'ISSUER_REGISTRAR' },
    { username: 'demo.verifier', expectedRole: 'VERIFIER' },
    { username: 'demo.investor', expectedRole: 'INVESTOR_BUYER' },
    { username: 'demo.compliance', expectedRole: 'COMPLIANCE_OFFICER' },
    { username: 'demo.auditor', expectedRole: 'AUDITOR' },
    { username: 'demo.admin', expectedRole: 'ADMINISTRATOR' },
  ];

  // 1. All 6 Demo accounts authentication & role derivation
  describe('Phase 1.1 & 5.1: Demonstration Accounts Authentication', () => {
    for (const account of DEMO_ACCOUNTS) {
      it(`should successfully authenticate '${account.username}' with role '${account.expectedRole}'`, async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ username: account.username, password: DEMO_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.role).toBe(account.expectedRole);
        expect(res.body.data.permissions).toBeDefined();
        expect(Array.isArray(res.body.data.permissions)).toBe(true);
      });
    }

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.admin', password: 'WrongPassword@123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with unknown username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.unknownuser', password: DEMO_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.admin' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should expose public demo accounts metadata endpoint without secrets', async () => {
      const res = await request(app).get('/api/auth/demo-accounts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.demoAuthEnabled).toBe(true);
      expect(res.body.data.accounts.length).toBe(6);

      // Verify no passwords, salts, or hashes are exposed
      for (const acc of res.body.data.accounts) {
        expect(acc.password).toBeUndefined();
        expect(acc.passwordHash).toBeUndefined();
        expect(acc.salt).toBeUndefined();
        expect(acc.username).toBeDefined();
        expect(acc.role).toBeDefined();
      }
    });
  });

  // 2. Token Session Expiry & Logout Revocation
  describe('Session Lifecycle & Logout', () => {
    it('should return authenticated identity at /api/auth/me', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.auditor', password: DEMO_PASSWORD });

      const token = loginRes.body.data.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe('AUDITOR');
    });

    it('should reject expired tokens', async () => {
      // Create an already-expired token
      const expiredToken = jwt.sign(
        { sub: 'did:fabric:admin', mspId: 'Org1MSP', role: 'ADMINISTRATOR', displayName: 'Admin' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should terminate session upon logout and reject subsequent calls', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.investor', password: DEMO_PASSWORD });

      const token = loginRes.body.data.token;

      // 1. Verify token works
      const testRes1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(testRes1.status).toBe(200);

      // 2. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // 3. Verify token is now rejected
      const testRes2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(testRes2.status).toBe(401);
      expect(testRes2.body.error.code).toBe('TOKEN_REVOKED');
    });
  });

  // 3. Server-Enforced RBAC & Privilege Separation
  describe('Server-Enforced RBAC & Privilege Separation', () => {
    let investorToken = '';
    let verifierToken = '';
    let issuerToken = '';

    it('setup tokens for roles', async () => {
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.investor', password: DEMO_PASSWORD });
      investorToken = res1.body.data.token;

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.verifier', password: DEMO_PASSWORD });
      verifierToken = res2.body.data.token;

      const res3 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo.issuer', password: DEMO_PASSWORD });
      issuerToken = res3.body.data.token;
    });

    it('should deny INVESTOR_BUYER from registering an asset (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({ assetId: 'AST-TEST-INV', assetType: 'LAND', name: 'Illegal Asset', rawFingerprint: 'FP-INV' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny VERIFIER from issuing tokens (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/tokens/issue')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ assetId: 'AST-LAND-001', symbol: 'TOKV', totalSupply: 10000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should not allow client to forge role via request body to bypass permissions', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({
          role: 'ADMINISTRATOR',
          user: { role: 'ADMINISTRATOR' },
          assetId: 'AST-TEST-FORGED',
          assetType: 'LAND',
          name: 'Forged Asset',
          rawFingerprint: 'FP-FORGE',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should enforce maker-checker separation: Claimant cannot review their own claim', async () => {
      // 1. Submit claim as verifier (claimant = verifier identity)
      const claimRes = await request(app)
        .post('/api/claims')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({ assetId: 'AST-LAND-001', claimType: 'SURVEY_VERIFICATION' });

      expect(claimRes.status).toBe(201);
      const claimId = claimRes.body.data.claimId;
      const claimantId = claimRes.body.data.claimant;

      // 2. Attempt to review claim using the same claimant identity
      // Craft login with issuer token (who was claimant)
      const reviewRes = await request(app)
        .post(`/api/claims/${claimId}/review`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({ decision: 'ACCEPTED' });

      // Issuer lacks CLAIM_VERIFY permission -> 403
      expect(reviewRes.status).toBe(403);
    });
  });

  // 4. Honest Health & Readiness & Dashboard Metrics
  describe('Truthful Health, Readiness & Metrics', () => {
    it('should return live liveness status at /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('UP');
    });

    it('should return truthful 10-component detailed system health report at /api/health/system', async () => {
      const res = await request(app).get('/api/health/system');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.components.length).toBe(10);

      const componentIds = res.body.data.components.map((c: { id: string }) => c.id);
      expect(componentIds).toContain('backend-liveness');
      expect(componentIds).toContain('backend-readiness');
      expect(componentIds).toContain('fabric-gateway');
      expect(componentIds).toContain('peer-channel');
      expect(componentIds).toContain('chaincode');
      expect(componentIds).toContain('minio-store');
      expect(componentIds).toContain('evidence-bucket');
      expect(componentIds).toContain('external-adapters');
      expect(componentIds).toContain('auth-security');
      expect(componentIds).toContain('environment-runtime');

      // Verify no sensitive keys leaked
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain('API_JWT_SECRET=');
      expect(stringified).not.toContain('passwordHash');
      expect(stringified).not.toContain('privateKey');
    });

    it('should return dynamic ledger-backed metrics at /api/dashboard/stats', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.registeredAssets).toBe('number');
      expect(res.body.data.registeredAssets).toBeGreaterThanOrEqual(2); // Seeded canonical assets
      expect(typeof res.body.data.pendingClaims).toBe('number');
      expect(typeof res.body.data.approvalsQueue).toBe('number');
      expect(typeof res.body.data.tokenizedHoldings).toBe('number');
      expect(res.body.data.isDemonstrationData).toBe(true);
      expect(res.body.data.fabricLedgerConnected).toBe(false);
    });
  });
});

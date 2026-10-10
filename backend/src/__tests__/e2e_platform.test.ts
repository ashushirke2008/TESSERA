import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('TESSERA End-to-End Platform Integration Suite', () => {
  let adminToken = '';
  let registrarToken = '';
  let verifierToken = '';
  let complianceToken = '';
  let investorToken = '';

  // 1. Authentication & Role Mapping
  describe('Authentication & RBAC', () => {
    it('should authenticate admin and issue valid JWT token with full permissions', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@tessera.network' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMINISTRATOR');
      adminToken = res.body.data.token;
    });

    it('should authenticate registrar and issue valid JWT with registrar permissions', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'registrar@org1.example.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ISSUER_REGISTRAR');
      expect(res.body.data.permissions).toContain('ASSET_REGISTER');
      registrarToken = res.body.data.token;
    });

    it('should authenticate verifier and issue valid JWT with valuation permissions', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'verifier@inspection.service' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('VERIFIER');
      expect(res.body.data.permissions).toContain('VALUATION_RECORD');
      verifierToken = res.body.data.token;
    });

    it('should authenticate compliance officer and issue valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'compliance@governance.org' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('COMPLIANCE_OFFICER');
      complianceToken = res.body.data.token;
    });

    it('should authenticate investor buyer and issue valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'investor@capital.fund' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('INVESTOR_BUYER');
      investorToken = res.body.data.token;
    });

    it('should reject unauthenticated request to protected route', async () => {
      const res = await request(app).post('/api/assets').send({});
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should deny investor from registering an asset (role permission enforcement)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({ assetId: 'AST-TEST-001', assetType: 'LAND', name: 'Test', rawFingerprint: 'FP1' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // 2. Asset Lifecycle & Templates
  describe('Asset Registry & Validation', () => {
    it('should register a valid LAND asset', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${registrarToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100',
          assetType: 'LAND',
          templateVersion: 'v1.0',
          name: 'Solar Farm Alpha',
          declaredValue: 3500000,
          currency: 'USD',
          rawFingerprint: 'US-NV 88219-SOLAR',
          metadata: { cadastralId: 'CAD-NV-8821', jurisdiction: 'US-NV', areaSqMeters: '120000' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assetId).toBe('AST-LAND-TEST-100');
      expect(res.body.data.status).toBe('REGISTERED');
      expect(res.body.data.fingerprint).toBe('LAND:US-NV_88219-SOLAR');
    });

    it('should reject duplicate fingerprint registration', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${registrarToken}`)
        .send({
          assetId: 'AST-LAND-DUPE',
          assetType: 'LAND',
          name: 'Duplicate Solar Farm',
          declaredValue: 1000000,
          rawFingerprint: 'US-NV 88219-SOLAR', // Same fingerprint
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Duplicate asset violation');
    });

    it('should reject unpermitted metadata for asset template', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${registrarToken}`)
        .send({
          assetId: 'AST-VEH-BAD-META',
          assetType: 'VEHICLE',
          name: 'Truck with bad meta',
          rawFingerprint: 'VIN123456789012345',
          metadata: { unknownIllegalField: 'hack' },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Unpermitted metadata field');
    });
  });

  // 3. Evidence Upload & SHA-256 Hashing
  describe('Evidence Storage & SHA-256 Integrity', () => {
    it('should upload evidence file, compute real SHA-256 digest, and commit on-chain', async () => {
      const dummyFileContent = Buffer.from('Official Land Deed Certificate content 2026');
      const res = await request(app)
        .post('/api/evidence/upload')
        .set('Authorization', `Bearer ${registrarToken}`)
        .field('assetId', 'AST-LAND-TEST-100')
        .field('docType', 'TITLE_DEED')
        .attach('file', dummyFileContent, 'title_deed.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hashSha256).toHaveLength(64);
      expect(res.body.data.storageUri).toContain('minio://');

      // Verify the asset transitioned to PENDING_VERIFICATION
      const assetRes = await request(app).get('/api/assets/AST-LAND-TEST-100');
      expect(assetRes.body.data.status).toBe('PENDING_VERIFICATION');
    });
  });

  // 4. Maker-Checker & M-of-N Governance
  describe('Approvals & Separation of Duties', () => {
    it('should prevent asset owner from self-approving their own asset', async () => {
      // First, register an asset owned by compliance officer
      await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId: 'AST-SELF-CHECK',
          assetType: 'VEHICLE',
          name: 'Compliance Officer Vehicle',
          owner: 'did:fabric:compliance:officer01',
          rawFingerprint: '1HGCR2F83HA999888',
          metadata: { vin: '1HGCR2F83HA999888', make: 'Ford', model: 'F-150' },
        });

      // Now compliance officer tries to approve their own asset
      const res = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          assetId: 'AST-SELF-CHECK',
          action: 'REGISTRATION',
          decision: 'APPROVED',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Maker-Checker violation');
    });

    it('should allow independent compliance officer to approve asset owned by another entity', async () => {
      const res = await request(app)
        .post('/api/approvals')
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100', // owned by registrar01
          action: 'REGISTRATION',
          decision: 'APPROVED',
          comments: 'Title search verified and approved',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.decision).toBe('APPROVED');

      const assetRes = await request(app).get('/api/assets/AST-LAND-TEST-100');
      expect(assetRes.body.data.status).toBe('APPROVED');
    });
  });

  // 5. Valuation & Tokenization
  describe('Valuation & Token Issuance', () => {
    it('should record certified appraisal valuation using verifier credentials', async () => {
      const res = await request(app)
        .post('/api/valuation')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100',
          source: 'JLL_VALUATION_SERVICES',
          amount: 3600000,
          currency: 'USD',
          methodology: 'DISCOUNTED_CASH_FLOW',
          validityHours: 720,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(3600000);
      expect(res.body.data.isStale).toBe(false);
    });

    it('should issue fractional tokens for approved asset with valid valuation', async () => {
      const res = await request(app)
        .post('/api/tokens/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100',
          symbol: 'SOLR1',
          totalSupply: 1000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.symbol).toBe('SOLR1');
      expect(res.body.data.status).toBe('ACTIVE');

      const assetRes = await request(app).get('/api/assets/AST-LAND-TEST-100');
      expect(assetRes.body.data.status).toBe('TOKENIZED');
      expect(assetRes.body.data.tokenId).toBeDefined();
    });
  });

  // 6. Double-Pledge Defense & Transfer Simulation
  describe('Pledges & Transfer Protection', () => {
    let tokenId = '';

    it('should create an active pledge encumbrance', async () => {
      const assetRes = await request(app).get('/api/assets/AST-LAND-TEST-100');
      tokenId = assetRes.body.data.tokenId;

      const res = await request(app)
        .post('/api/pledges')
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100',
          lender: 'did:fabric:bank:senior_debt',
          borrower: 'did:fabric:org1:registrar01',
          amountPledged: 1500000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should reject a second active pledge on the same asset (double-pledge defense)', async () => {
      const res = await request(app)
        .post('/api/pledges')
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          assetId: 'AST-LAND-TEST-100',
          lender: 'did:fabric:bank:junior_lender',
          borrower: 'did:fabric:org1:registrar01',
          amountPledged: 500000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Double-pledge violation');
    });

    it('should block transfer simulation when asset is pledged', async () => {
      const res = await request(app)
        .post('/api/transfers/simulate')
        .send({
          tokenId,
          fromOwner: 'did:fabric:org1:registrar01',
          toOwner: 'did:fabric:investor:buyer01',
          amount: 50000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.allowed).toBe(false);
      expect(res.body.data.pledgeActive).toBe(true);
      expect(res.body.data.reasonCodes).toContain('ASSET_PLEDGED_ENCUMBERED');
    });

    it('should release pledge and permit transfer simulation', async () => {
      const pledgesRes = await request(app).get('/api/pledges?assetId=AST-LAND-TEST-100');
      const pledgeId = pledgesRes.body.data[0].pledgeId;

      const releaseRes = await request(app)
        .post(`/api/pledges/${pledgeId}/release`)
        .set('Authorization', `Bearer ${complianceToken}`);

      expect(releaseRes.status).toBe(200);

      // Now simulation should pass
      const simRes = await request(app)
        .post('/api/transfers/simulate')
        .send({
          tokenId,
          fromOwner: 'did:fabric:org1:registrar01',
          toOwner: 'did:fabric:investor:buyer01',
          amount: 50000,
        });

      expect(simRes.status).toBe(200);
      expect(simRes.body.data.allowed).toBe(true);
    });

    it('should execute atomic transfer on ledger and update holdings', async () => {
      const res = await request(app)
        .post('/api/transfers/execute')
        .set('Authorization', `Bearer ${investorToken}`)
        .send({
          tokenId,
          fromOwner: 'did:fabric:org1:registrar01',
          toOwner: 'did:fabric:investor:buyer01',
          amount: 50000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.confirmed).toBe(true);
      expect(res.body.data.token.holdings['did:fabric:investor:buyer01']).toBe(50000);
      expect(res.body.data.token.holdings['did:fabric:org1:registrar01']).toBe(950000);
    });
  });

  // 7. Public QR Asset Passport & Privacy
  describe('QR Asset Passport & Privacy', () => {
    it('should return public privacy-preserving passport without sensitive admin certs or private keys', async () => {
      const res = await request(app).get('/api/passport/AST-LAND-TEST-100');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.passportId).toBe('PSP-AST-LAND-TEST-100');
      expect(res.body.data.publicProofHash).toBeDefined();
      expect(res.body.data.status).toBe('TOKENIZED');

      // Verify no sensitive keys leaked
      expect(res.body.data.privateKey).toBeUndefined();
      expect(res.body.data.adminIdentity).toBeUndefined();
    });

    it('should generate valid QR code data URL for passport verification', async () => {
      const res = await request(app).get('/api/passport/AST-LAND-TEST-100/qr');

      expect(res.status).toBe(200);
      expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  // 8. Simulated External Adapters
  describe('External Verification Adapters', () => {
    it('should execute government registry check successfully', async () => {
      const res = await request(app)
        .post('/api/adapters/government-registry/verify')
        .send({ assetId: 'AST-LAND-TEST-100', scenario: 'SUCCESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.provenance.registryAuthority).toBe('STATE_CADASTRAL_AND_TITLE_OFFICE');
    });

    it('should handle deterministic NOT_FOUND scenario accurately', async () => {
      const res = await request(app)
        .post('/api/adapters/government-registry/verify')
        .send({ assetId: 'AST-LAND-TEST-100', scenario: 'NOT_FOUND' });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(false);
      expect(res.body.data.reasonCode).toBe('RECORD_NOT_FOUND');
    });
  });
});

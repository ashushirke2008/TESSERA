import crypto from 'crypto';
import { AuthUser, BusinessRole } from '../types';
import { config } from '../config';

export interface DemoUserRecord {
  username: string;
  emailAlias?: string;
  salt: string;
  passwordHash: string;
  role: BusinessRole;
  displayName: string;
  identityId: string;
  mspId: string;
}

const SHARED_DEMO_PASSWORD = 'TesseraDemo@2026';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const inputHash = hashPassword(password, salt);
    const inputBuf = Buffer.from(inputHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (inputBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, storedBuf);
  } catch {
    return false;
  }
}

class AuthService {
  private demoAccounts = new Map<string, DemoUserRecord>();
  private failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
  private revokedTokens = new Set<string>();

  constructor() {
    this.initDemoAccounts();
  }

  private initDemoAccounts(): void {
    const rawDemoDefinitions: Array<{
      username: string;
      emailAlias: string;
      role: BusinessRole;
      displayName: string;
      identityId: string;
      mspId: string;
    }> = [
      {
        username: 'demo.issuer',
        emailAlias: 'registrar@org1.example.com',
        role: 'ISSUER_REGISTRAR',
        displayName: 'Asset Registrar (Org1MSP)',
        identityId: 'did:fabric:org1:registrar01',
        mspId: 'Org1MSP',
      },
      {
        username: 'demo.verifier',
        emailAlias: 'verifier@inspection.service',
        role: 'VERIFIER',
        displayName: 'Accredited Verifier (Inspection & Survey)',
        identityId: 'did:fabric:verifier:accredited01',
        mspId: 'Org1MSP',
      },
      {
        username: 'demo.investor',
        emailAlias: 'investor@capital.fund',
        role: 'INVESTOR_BUYER',
        displayName: 'Qualified Institutional Investor',
        identityId: 'did:fabric:investor:buyer01',
        mspId: 'Org1MSP',
      },
      {
        username: 'demo.compliance',
        emailAlias: 'compliance@governance.org',
        role: 'COMPLIANCE_OFFICER',
        displayName: 'Chief Compliance Officer',
        identityId: 'did:fabric:compliance:officer01',
        mspId: 'Org1MSP',
      },
      {
        username: 'demo.auditor',
        emailAlias: 'auditor@regulatory.gov',
        role: 'AUDITOR',
        displayName: 'External Regulatory Auditor',
        identityId: 'did:fabric:auditor:reg01',
        mspId: 'Org1MSP',
      },
      {
        username: 'demo.admin',
        emailAlias: 'admin@tessera.network',
        role: 'ADMINISTRATOR',
        displayName: 'System Administrator (Org1MSP Admin)',
        identityId: 'did:fabric:admin',
        mspId: 'Org1MSP',
      },
    ];

    for (const def of rawDemoDefinitions) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(SHARED_DEMO_PASSWORD, salt);

      const record: DemoUserRecord = {
        username: def.username.toLowerCase(),
        emailAlias: def.emailAlias.toLowerCase(),
        salt,
        passwordHash,
        role: def.role,
        displayName: def.displayName,
        identityId: def.identityId,
        mspId: def.mspId,
      };

      // Index by username
      this.demoAccounts.set(record.username, record);
      // Index by email alias
      this.demoAccounts.set(record.emailAlias!, record);
    }
  }

  public authenticate(
    identifier: string,
    password?: string,
    clientIp: string = 'unknown'
  ): { user: AuthUser } {
    // 1. Check if demo authentication is permitted in current environment
    if (!config.demoAuthEnabled || config.env === 'production') {
      throw new Error('DEMO_AUTH_DISABLED: Demonstration authentication is disabled in this environment.');
    }

    // 2. Check rate limit / brute force lock
    const rateLimitKey = `${clientIp}:${identifier.toLowerCase()}`;
    const attempt = this.failedAttempts.get(rateLimitKey);
    const now = Date.now();
    if (attempt && attempt.lockedUntil > now) {
      const waitSeconds = Math.ceil((attempt.lockedUntil - now) / 1000);
      throw new Error(`RATE_LIMITED: Too many failed login attempts. Please try again in ${waitSeconds} seconds.`);
    }

    // 3. Find demo account by username or email
    const record = this.demoAccounts.get(identifier.trim().toLowerCase());
    if (!record) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error(`INVALID_CREDENTIALS: Unknown identity '${identifier}'.`);
    }

    // 4. Verify password if provided; if not provided, reject with INVALID_CREDENTIALS
    if (!password) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('INVALID_CREDENTIALS: Password is required.');
    }

    const isValidPassword = verifyPassword(password, record.passwordHash, record.salt);
    if (!isValidPassword) {
      this.recordFailedAttempt(rateLimitKey);
      throw new Error('INVALID_CREDENTIALS: Invalid credentials provided.');
    }

    // 5. Successful login: reset failed attempts
    this.failedAttempts.delete(rateLimitKey);

    return {
      user: {
        identityId: record.identityId,
        mspId: record.mspId,
        role: record.role,
        displayName: record.displayName,
      },
    };
  }

  private recordFailedAttempt(key: string): void {
    const now = Date.now();
    const entry = this.failedAttempts.get(key) || { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= 5) {
      entry.lockedUntil = now + 5 * 60 * 1000; // 5-minute lockout
    }
    this.failedAttempts.set(key, entry);
  }

  public revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  public isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }

  public getPublicDemoAccounts(): Array<{
    username: string;
    role: BusinessRole;
    displayName: string;
    emailAlias?: string;
  }> {
    if (!config.demoAuthEnabled || config.env === 'production') {
      return [];
    }

    const seenUsernames = new Set<string>();
    const result: Array<{
      username: string;
      role: BusinessRole;
      displayName: string;
      emailAlias?: string;
    }> = [];

    for (const record of this.demoAccounts.values()) {
      if (!seenUsernames.has(record.username)) {
        seenUsernames.add(record.username);
        result.push({
          username: record.username,
          role: record.role,
          displayName: record.displayName,
          emailAlias: record.emailAlias,
        });
      }
    }

    return result;
  }
}

export const authService = new AuthService();

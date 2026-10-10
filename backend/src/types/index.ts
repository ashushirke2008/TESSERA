export type BusinessRole =
  | 'ISSUER_REGISTRAR'
  | 'VERIFIER'
  | 'INVESTOR_BUYER'
  | 'COMPLIANCE_OFFICER'
  | 'AUDITOR'
  | 'ADMINISTRATOR';

export type Permission =
  | 'ASSET_REGISTER'
  | 'ASSET_MODIFY'
  | 'EVIDENCE_SUBMIT'
  | 'EVIDENCE_VIEW'
  | 'CLAIM_SUBMIT'
  | 'CLAIM_VERIFY'
  | 'APPROVAL_SUBMIT'
  | 'VALUATION_RECORD'
  | 'TOKEN_ISSUE'
  | 'TOKEN_RETIRE'
  | 'TRANSFER_EXECUTE'
  | 'PLEDGE_CREATE'
  | 'PLEDGE_RELEASE'
  | 'POLICY_MANAGE'
  | 'AUDIT_VIEW'
  | 'PASSPORT_VIEW';

export const ROLE_PERMISSIONS: Record<BusinessRole, Permission[]> = {
  ISSUER_REGISTRAR: ['ASSET_REGISTER', 'ASSET_MODIFY', 'EVIDENCE_SUBMIT', 'EVIDENCE_VIEW', 'CLAIM_SUBMIT', 'PASSPORT_VIEW', 'AUDIT_VIEW'],
  VERIFIER: ['EVIDENCE_VIEW', 'CLAIM_VERIFY', 'VALUATION_RECORD', 'PASSPORT_VIEW', 'AUDIT_VIEW'],
  INVESTOR_BUYER: ['EVIDENCE_VIEW', 'TRANSFER_EXECUTE', 'PASSPORT_VIEW', 'AUDIT_VIEW'],
  COMPLIANCE_OFFICER: ['APPROVAL_SUBMIT', 'CLAIM_VERIFY', 'PLEDGE_CREATE', 'PLEDGE_RELEASE', 'POLICY_MANAGE', 'EVIDENCE_VIEW', 'PASSPORT_VIEW', 'AUDIT_VIEW'],
  AUDITOR: ['EVIDENCE_VIEW', 'PASSPORT_VIEW', 'AUDIT_VIEW'],
  ADMINISTRATOR: [
    'ASSET_REGISTER', 'ASSET_MODIFY', 'EVIDENCE_SUBMIT', 'EVIDENCE_VIEW',
    'CLAIM_SUBMIT', 'CLAIM_VERIFY', 'APPROVAL_SUBMIT', 'VALUATION_RECORD',
    'TOKEN_ISSUE', 'TOKEN_RETIRE', 'TRANSFER_EXECUTE', 'PLEDGE_CREATE',
    'PLEDGE_RELEASE', 'POLICY_MANAGE', 'AUDIT_VIEW', 'PASSPORT_VIEW'
  ],
};

export type AssetType = 'LAND' | 'VEHICLE' | 'GRAIN';

export type AssetStatus =
  | 'DRAFT'
  | 'REGISTERED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'APPROVED'
  | 'TOKENIZED'
  | 'RETIRED'
  | 'REJECTED';

export interface EvidenceRecord {
  evidenceId: string;
  assetId: string;
  docType: string;
  hashSha256: string;
  storageUri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  submittedBy: string;
  timestamp: string;
}

export interface ValuationRecord {
  assetId: string;
  source: string;
  amount: number;
  currency: string;
  methodology: string;
  effectiveTimestamp: number;
  expiryTimestamp: number;
  isStale: boolean;
}

export interface ClaimRecord {
  claimId: string;
  assetId: string;
  claimType: string;
  claimant: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  evidenceIds: string[];
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface ApprovalRecord {
  approvalId: string;
  assetId: string;
  action: string;
  approverRole: BusinessRole;
  approverIdentity: string;
  decision: 'APPROVED' | 'REJECTED';
  comments: string;
  timestamp: number;
}

export interface TokenRecord {
  tokenId: string;
  assetId: string;
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  status: 'ACTIVE' | 'PAUSED' | 'RETIRED';
  holdings: Record<string, number>;
  isRestricted: boolean;
}

export interface PledgeRecord {
  pledgeId: string;
  assetId: string;
  tokenId?: string;
  lender: string;
  borrower: string;
  status: 'ACTIVE' | 'RELEASED';
  amountPledged: number;
  createdTimestamp: number;
  releasedTimestamp?: number;
}

export interface TransferPolicyRecord {
  policyId: string;
  version: string;
  assetType: AssetType;
  requireKyc: boolean;
  maxHoldingPerInvestor: number;
  minValuationFreshnessHours: number;
  isActive: boolean;
}

export interface TransferSimulationResult {
  allowed: boolean;
  reasonCodes: string[];
  assetStatus: string;
  valuationValid: boolean;
  pledgeActive: boolean;
  policyCompliant: boolean;
  timestamp: number;
}

export interface AssetPassport {
  passportId: string;
  assetId: string;
  assetType: AssetType;
  name: string;
  status: AssetStatus;
  fingerprintNormalized: string;
  evidenceCount: number;
  latestValuation: number;
  currency: string;
  issuedAt: number;
  publicProofHash: string;
}

export interface AssetRecord {
  assetId: string;
  assetType: AssetType;
  templateVersion: string;
  name: string;
  owner: string;
  custodian: string;
  status: AssetStatus;
  declaredValue: number;
  currency: string;
  fingerprint: string;
  metadata: Record<string, string>;
  evidenceHashes: EvidenceRecord[];
  activeValuation?: ValuationRecord;
  activePledgeId?: string;
  tokenId?: string;
  createdTimestamp: number;
  updatedTimestamp: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  assetId?: string;
  txId: string;
  details: Record<string, unknown>;
  verifiedOnChain: boolean;
}

export interface AuthUser {
  identityId: string;
  mspId: string;
  role: BusinessRole;
  displayName: string;
}

export interface HealthStatus {
  status: 'UP' | 'DOWN';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface DependencyStatus {
  status: 'healthy' | 'unconfigured' | 'disconnected' | 'degraded';
  configured: boolean;
  connected: boolean;
  endpoint?: string;
  message?: string;
}

export interface ReadinessReport {
  status: 'READY' | 'NOT_READY' | 'DEGRADED';
  timestamp: string;
  service: string;
  dependencies: {
    environment: {
      status: 'configured' | 'incomplete';
      missingRequiredKeys?: string[];
    };
    fabric: DependencyStatus;
    minio: DependencyStatus;
    adapters: {
      status: 'unconfigured' | 'partial' | 'ready';
      configuredCount: number;
      availableAdapters: string[];
    };
  };
}

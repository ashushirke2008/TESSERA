export type BusinessRole =
  | 'ADMINISTRATOR'
  | 'ISSUER_REGISTRAR'
  | 'VERIFIER'
  | 'INVESTOR_BUYER'
  | 'COMPLIANCE_OFFICER'
  | 'AUDITOR';

export type UserRole = BusinessRole;

export type NavPage =
  | 'dashboard'
  | 'registry'
  | 'registration'
  | 'verification'
  | 'approvals'
  | 'tokenization'
  | 'transfers'
  | 'audit'
  | 'settings';

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

export interface SystemHealthData {
  status: 'UP' | 'DOWN' | 'OFFLINE';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface SystemReadinessData {
  status: 'READY' | 'NOT_READY' | 'DEGRADED';
  timestamp: string;
  service: string;
  dependencies: {
    environment: {
      status: string;
      missingRequiredKeys?: string[];
    };
    fabric: {
      status: 'healthy' | 'unconfigured' | 'disconnected';
      connected: boolean;
      endpoint?: string;
      message?: string;
    };
    minio: {
      status: 'healthy' | 'unconfigured' | 'disconnected';
      connected: boolean;
      endpoint?: string;
      message?: string;
    };
    adapters: {
      status: string;
      configuredCount: number;
    };
  };
}

export interface AuthUser {
  identityId: string;
  mspId: string;
  role: BusinessRole;
  displayName: string;
}

export interface DemoAccount {
  username: string;
  role: BusinessRole;
  displayName: string;
  emailAlias?: string;
}

export interface DashboardStats {
  registeredAssets: number;
  pendingClaims: number;
  approvalsQueue: number;
  tokenizedHoldings: number;
  isDemonstrationData: boolean;
  fabricLedgerConnected: boolean;
  lastUpdated: string;
}

export interface SystemComponentHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'not_configured' | 'unknown';
  explanation: string;
  lastChecked: string;
  checkType: string;
  safeRemediationHint: string;
}

export interface SystemHealthReport {
  service: string;
  environment: string;
  timestamp: string;
  components: SystemComponentHealth[];
}

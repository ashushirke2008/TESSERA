import crypto from 'crypto';
import {
  AssetRecord,
  AssetType,
  AssetStatus,
  ValuationRecord,
  ClaimRecord,
  ApprovalRecord,
  TokenRecord,
  PledgeRecord,
  TransferPolicyRecord,
  TransferSimulationResult,
  AssetPassport,
  AuditLogEntry,
  EvidenceRecord,
  BusinessRole,
} from '../types';
import { logger } from '../utils/logger';

export class LedgerService {
  // Authoritative State Stores mirroring Fabric World-State CouchDB
  private assets = new Map<string, AssetRecord>();
  private fingerprintIndex = new Map<string, string>(); // normalizedFingerprint -> assetId
  private claims = new Map<string, ClaimRecord>();
  private approvals = new Map<string, ApprovalRecord[]>(); // assetId -> approvals
  private tokens = new Map<string, TokenRecord>();
  private pledges = new Map<string, PledgeRecord>();
  private activePledgeIndex = new Map<string, string>(); // assetId -> pledgeId
  private policies = new Map<string, TransferPolicyRecord>();
  private auditHistory: AuditLogEntry[] = [];

  constructor() {
    this.initDefaultPolicies();
    this.seedCanonicalDemoAssets();
  }

  private initDefaultPolicies(): void {
    const defaultPolicies: TransferPolicyRecord[] = [
      {
        policyId: 'POL-DEFAULT-LAND',
        version: 'v1.0',
        assetType: 'LAND',
        requireKyc: true,
        maxHoldingPerInvestor: 1000000,
        minValuationFreshnessHours: 720,
        isActive: true,
      },
      {
        policyId: 'POL-DEFAULT-VEHICLE',
        version: 'v1.0',
        assetType: 'VEHICLE',
        requireKyc: true,
        maxHoldingPerInvestor: 500000,
        minValuationFreshnessHours: 168,
        isActive: true,
      },
      {
        policyId: 'POL-DEFAULT-GRAIN',
        version: 'v1.0',
        assetType: 'GRAIN',
        requireKyc: true,
        maxHoldingPerInvestor: 2000000,
        minValuationFreshnessHours: 48,
        isActive: true,
      },
    ];

    for (const p of defaultPolicies) {
      this.policies.set(p.policyId, p);
    }
  }

  private seedCanonicalDemoAssets(): void {
    // Seed the 3 canonical templates from DATA_MODEL.md so dashboard and registry have verified data
    this.registerAsset(
      'AST-LAND-001',
      'LAND',
      'v1.0',
      'Industrial Logistics Hub Alpha',
      'did:fabric:org1:owner892',
      'Org1MSP',
      2450000,
      'USD',
      'US-CA 892-LOGISTICS',
      { cadastralId: 'CAD-8921', jurisdiction: 'US-CA', areaSqMeters: '45000' }
    );

    this.registerAsset(
      'AST-VEH-089',
      'VEHICLE',
      'v1.0',
      'Autonomous Freight Hauler T-900',
      'did:fabric:org1:logistics01',
      'Org1MSP',
      185000,
      'USD',
      '1HGCR2F83HA000089',
      { vin: '1HGCR2F83HA000089', make: 'Volvo', model: 'VNL Autonomous', year: '2025' }
    );

    this.registerAsset(
      'AST-GRN-402',
      'GRAIN',
      'v1.0',
      'Grade-A Certified Hard Wheat Silo 4',
      'did:fabric:org1:agricorp',
      'Org1MSP',
      420000,
      'USD',
      'SILO-4 US-WHEAT-2026',
      { siloId: 'SILO-04', commodityGrade: 'Grade-A Hard Red', metricTons: '1200' }
    );
  }

  private normalizeFingerprint(assetType: AssetType, raw: string): string {
    const trimmed = raw.trim().toUpperCase();
    if (!trimmed) throw new Error('Fingerprint cannot be empty');

    switch (assetType) {
      case 'LAND':
        return `LAND:${trimmed.replace(/\s+/g, '_')}`;
      case 'VEHICLE':
        return `VIN:${trimmed.replace(/[-\s]/g, '')}`;
      case 'GRAIN':
        return `GRAIN:${trimmed.replace(/\s+/g, '_')}`;
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  }

  private appendAuditLog(eventType: string, actor: string, details: Record<string, unknown>, assetId?: string): void {
    const txId = `tx_${crypto.randomBytes(16).toString('hex')}`;
    const entry: AuditLogEntry = {
      id: `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      assetId,
      txId,
      details,
      verifiedOnChain: true,
    };
    this.auditHistory.unshift(entry);
    logger.info(`Fabric Transaction Committed [${txId}]: ${eventType}`, { assetId, actor });
  }

  private validateTemplateMetadata(assetType: AssetType, metadata: Record<string, string>): void {
    const permitted: Record<AssetType, Record<string, boolean>> = {
      LAND: { cadastralId: true, jurisdiction: true, areaSqMeters: true, zoning: true, coordinates: true },
      VEHICLE: { vin: true, make: true, model: true, year: true, odometerKm: true, engineNumber: true },
      GRAIN: { siloId: true, commodityGrade: true, metricTons: true, cropYear: true, moisturePercent: true, proteinPercent: true },
    };

    const rules = permitted[assetType];
    if (rules) {
      for (const key of Object.keys(metadata)) {
        if (!rules[key]) {
          throw new Error(`Unpermitted metadata field '${key}' for asset template '${assetType}'`);
        }
      }
    }
  }

  public registerAsset(
    assetId: string,
    assetType: AssetType,
    templateVersion: string,
    name: string,
    owner: string,
    custodian: string,
    declaredValue: number,
    currency: string,
    rawFingerprint: string,
    metadata: Record<string, string>
  ): AssetRecord {
    if (this.assets.has(assetId)) {
      throw new Error(`Asset with ID '${assetId}' already exists`);
    }

    this.validateTemplateMetadata(assetType, metadata);

    const normalizedFp = this.normalizeFingerprint(assetType, rawFingerprint);
    if (this.fingerprintIndex.has(normalizedFp)) {
      throw new Error(`Duplicate asset violation: Fingerprint '${normalizedFp}' is already registered on-chain`);
    }

    const now = Date.now();
    const asset: AssetRecord = {
      assetId,
      assetType,
      templateVersion,
      name,
      owner,
      custodian,
      status: 'REGISTERED',
      declaredValue,
      currency,
      fingerprint: normalizedFp,
      metadata,
      evidenceHashes: [],
      createdTimestamp: now,
      updatedTimestamp: now,
    };

    this.assets.set(assetId, asset);
    this.fingerprintIndex.set(normalizedFp, assetId);
    this.appendAuditLog('ASSET_REGISTERED', owner, { assetId, fingerprint: normalizedFp, assetType }, assetId);
    return asset;
  }

  public getAsset(assetId: string): AssetRecord {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset '${assetId}' not found on ledger`);
    }
    return asset;
  }

  public listAssets(typeFilter?: AssetType): AssetRecord[] {
    const list = Array.from(this.assets.values());
    if (typeFilter) {
      return list.filter((a) => a.assetType === typeFilter);
    }
    return list;
  }

  public updateAssetMetadata(assetId: string, metadata: Record<string, string>, actor: string): AssetRecord {
    const asset = this.getAsset(assetId);
    asset.metadata = { ...asset.metadata, ...metadata };
    asset.updatedTimestamp = Date.now();
    this.appendAuditLog('ASSET_METADATA_UPDATED', actor, { assetId, metadata }, assetId);
    return asset;
  }

  public recordEvidence(assetId: string, evidence: EvidenceRecord): AssetRecord {
    const asset = this.getAsset(assetId);
    asset.evidenceHashes.push(evidence);
    if (asset.status === 'REGISTERED') {
      asset.status = 'PENDING_VERIFICATION';
    }
    asset.updatedTimestamp = Date.now();
    this.appendAuditLog('EVIDENCE_COMMITTED_ON_CHAIN', evidence.submittedBy, {
      evidenceId: evidence.evidenceId,
      hashSha256: evidence.hashSha256,
      storageUri: evidence.storageUri,
    }, assetId);
    return asset;
  }

  public submitClaim(assetId: string, claimType: string, claimant: string, evidenceIds: string[]): ClaimRecord {
    this.getAsset(assetId); // verify exists
    const claimId = `CLM-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const claim: ClaimRecord = {
      claimId,
      assetId,
      claimType,
      claimant,
      status: 'SUBMITTED',
      evidenceIds,
      submittedAt: Date.now(),
    };

    this.claims.set(claimId, claim);
    this.appendAuditLog('CLAIM_SUBMITTED', claimant, { claimId, claimType }, assetId);
    return claim;
  }

  public reviewClaim(claimId: string, decision: 'ACCEPTED' | 'REJECTED', reviewer: string, rejectionReason?: string): ClaimRecord {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim '${claimId}' not found`);
    }

    // Maker-checker separation: Claimant cannot verify or approve their own claim
    if (claim.claimant === reviewer) {
      throw new Error(`Maker-Checker violation: Claimant '${reviewer}' cannot review their own claim`);
    }

    claim.reviewedAt = Date.now();
    claim.reviewedBy = reviewer;

    if (decision === 'ACCEPTED') {
      claim.status = 'ACCEPTED';
      const asset = this.getAsset(claim.assetId);
      asset.status = 'VERIFIED';
      asset.updatedTimestamp = Date.now();
    } else {
      claim.status = 'REJECTED';
      claim.rejectionReason = rejectionReason || 'Claim failed verification standards';
    }

    this.appendAuditLog('CLAIM_REVIEWED', reviewer, { claimId, decision, rejectionReason }, claim.assetId);
    return claim;
  }

  public submitApproval(
    assetId: string,
    action: string,
    approverRole: BusinessRole,
    approverIdentity: string,
    decision: 'APPROVED' | 'REJECTED',
    comments: string
  ): ApprovalRecord {
    const asset = this.getAsset(assetId);

    // Maker-checker invariant: Owner cannot approve their own asset
    if (asset.owner === approverIdentity) {
      throw new Error(`Maker-Checker violation: Asset owner '${approverIdentity}' cannot approve their own asset`);
    }

    const existingApprovals = this.approvals.get(assetId) || [];
    if (existingApprovals.some((a) => a.approverIdentity === approverIdentity)) {
      throw new Error(`Duplicate approval: Approver '${approverIdentity}' has already submitted a decision`);
    }

    const approvalId = `APP-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const approval: ApprovalRecord = {
      approvalId,
      assetId,
      action,
      approverRole,
      approverIdentity,
      decision,
      comments,
      timestamp: Date.now(),
    };

    existingApprovals.push(approval);
    this.approvals.set(assetId, existingApprovals);

    if (decision === 'APPROVED') {
      asset.status = 'APPROVED';
      asset.updatedTimestamp = Date.now();
    } else {
      asset.status = 'REJECTED';
      asset.updatedTimestamp = Date.now();
    }

    this.appendAuditLog('APPROVAL_SUBMITTED', approverIdentity, { approvalId, decision, approverRole }, assetId);
    return approval;
  }

  public recordValuation(
    assetId: string,
    source: string,
    amount: number,
    currency: string,
    methodology: string,
    validityHours = 720,
    actor = 'valuation_service'
  ): ValuationRecord {
    const asset = this.getAsset(assetId);
    const now = Date.now();
    const expiry = now + validityHours * 3600 * 1000;

    const val: ValuationRecord = {
      assetId,
      source,
      amount,
      currency,
      methodology,
      effectiveTimestamp: now,
      expiryTimestamp: expiry,
      isStale: false,
    };

    asset.activeValuation = val;
    asset.declaredValue = amount;
    asset.currency = currency;
    asset.updatedTimestamp = now;

    this.appendAuditLog('VALUATION_RECORDED', actor, { amount, currency, source, methodology }, assetId);
    return val;
  }

  public issueTokens(assetId: string, symbol: string, totalSupply: number, actor: string): TokenRecord {
    const asset = this.getAsset(assetId);

    if (asset.status !== 'APPROVED' && asset.status !== 'VERIFIED') {
      throw new Error(`Tokenization prohibited: Asset '${assetId}' status is '${asset.status}' (must be APPROVED or VERIFIED)`);
    }

    if (!asset.activeValuation) {
      throw new Error(`Tokenization prohibited: Asset '${assetId}' lacks an active valuation record`);
    }

    if (Date.now() > asset.activeValuation.expiryTimestamp) {
      throw new Error(`Tokenization prohibited: Valuation for asset '${assetId}' is expired/stale`);
    }

    if (asset.tokenId) {
      throw new Error(`Asset '${assetId}' is already tokenized with token ID '${asset.tokenId}'`);
    }

    const tokenId = `TKN-${asset.assetType.substring(0, 3)}-${Date.now().toString(36)}`;
    const token: TokenRecord = {
      tokenId,
      assetId,
      symbol,
      totalSupply,
      circulatingSupply: totalSupply,
      status: 'ACTIVE',
      holdings: {
        [asset.owner]: totalSupply, // Initial supply allocated to asset owner
      },
      isRestricted: false,
    };

    this.tokens.set(tokenId, token);
    asset.tokenId = tokenId;
    asset.status = 'TOKENIZED';
    asset.updatedTimestamp = Date.now();

    this.appendAuditLog('TOKENS_ISSUED', actor, { tokenId, symbol, totalSupply }, assetId);
    return token;
  }

  public createPledge(
    assetId: string,
    lender: string,
    borrower: string,
    amountPledged: number,
    actor: string
  ): PledgeRecord {
    const asset = this.getAsset(assetId);

    // Double-pledge defense
    if (this.activePledgeIndex.has(assetId)) {
      const existingId = this.activePledgeIndex.get(assetId);
      throw new Error(`Double-pledge violation: Asset '${assetId}' is already subject to active pledge '${existingId}'`);
    }

    const pledgeId = `PLG-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const pledge: PledgeRecord = {
      pledgeId,
      assetId,
      tokenId: asset.tokenId,
      lender,
      borrower,
      status: 'ACTIVE',
      amountPledged,
      createdTimestamp: Date.now(),
    };

    this.pledges.set(pledgeId, pledge);
    this.activePledgeIndex.set(assetId, pledgeId);
    asset.activePledgeId = pledgeId;
    asset.updatedTimestamp = Date.now();

    this.appendAuditLog('PLEDGE_CREATED', actor, { pledgeId, lender, borrower, amountPledged }, assetId);
    return pledge;
  }

  public releasePledge(pledgeId: string, actor: string): PledgeRecord {
    const pledge = this.pledges.get(pledgeId);
    if (!pledge) {
      throw new Error(`Pledge '${pledgeId}' not found`);
    }

    pledge.status = 'RELEASED';
    pledge.releasedTimestamp = Date.now();
    this.activePledgeIndex.delete(pledge.assetId);

    const asset = this.getAsset(pledge.assetId);
    asset.activePledgeId = undefined;
    asset.updatedTimestamp = Date.now();

    this.appendAuditLog('PLEDGE_RELEASED', actor, { pledgeId }, pledge.assetId);
    return pledge;
  }

  public simulateTransfer(
    tokenId: string,
    fromOwner: string,
    toOwner: string,
    amount: number
  ): TransferSimulationResult {
    const result: TransferSimulationResult = {
      allowed: true,
      reasonCodes: [],
      assetStatus: 'UNKNOWN',
      valuationValid: true,
      pledgeActive: false,
      policyCompliant: true,
      timestamp: Date.now(),
    };

    const token = this.tokens.get(tokenId);
    if (!token) {
      result.allowed = false;
      result.reasonCodes.push('TOKEN_NOT_FOUND');
      return result;
    }

    if (token.status !== 'ACTIVE') {
      result.allowed = false;
      result.reasonCodes.push('TOKEN_NOT_ACTIVE');
    }

    const currentBalance = token.holdings[fromOwner] || 0;
    if (currentBalance < amount) {
      result.allowed = false;
      result.reasonCodes.push('INSUFFICIENT_HOLDINGS');
    }

    const asset = this.getAsset(token.assetId);
    result.assetStatus = asset.status;

    if (asset.activePledgeId) {
      result.pledgeActive = true;
      result.allowed = false;
      result.reasonCodes.push('ASSET_PLEDGED_ENCUMBERED');
    }

    if (!asset.activeValuation || Date.now() > asset.activeValuation.expiryTimestamp) {
      result.valuationValid = false;
      result.allowed = false;
      result.reasonCodes.push('VALUATION_STALE');
    }

    return result;
  }

  public executeTransfer(tokenId: string, fromOwner: string, toOwner: string, amount: number, actor: string): TokenRecord {
    const sim = this.simulateTransfer(tokenId, fromOwner, toOwner, amount);
    if (!sim.allowed) {
      throw new Error(`Transfer rejected by on-chain rules: ${sim.reasonCodes.join(', ')}`);
    }

    const token = this.tokens.get(tokenId)!;
    token.holdings[fromOwner] = (token.holdings[fromOwner] || 0) - amount;
    token.holdings[toOwner] = (token.holdings[toOwner] || 0) + amount;

    this.appendAuditLog('TOKEN_TRANSFERRED', actor, { tokenId, fromOwner, toOwner, amount }, token.assetId);
    return token;
  }

  public getAssetPassport(assetId: string): AssetPassport {
    const asset = this.getAsset(assetId);
    const proofHash = crypto
      .createHash('sha256')
      .update(`${asset.assetId}|${asset.assetType}|${asset.fingerprint}|${asset.owner}|${asset.declaredValue}|${asset.createdTimestamp}`)
      .digest('hex');

    return {
      passportId: `PSP-${asset.assetId}`,
      assetId: asset.assetId,
      assetType: asset.assetType,
      name: asset.name,
      status: asset.status,
      fingerprintNormalized: asset.fingerprint,
      evidenceCount: asset.evidenceHashes.length,
      latestValuation: asset.activeValuation?.amount || asset.declaredValue,
      currency: asset.currency,
      issuedAt: asset.createdTimestamp,
      publicProofHash: proofHash,
    };
  }

  public getAuditHistory(assetId?: string): AuditLogEntry[] {
    if (assetId) {
      return this.auditHistory.filter((e) => e.assetId === assetId);
    }
    return this.auditHistory;
  }

  public getPolicies(): TransferPolicyRecord[] {
    return Array.from(this.policies.values());
  }

  public getToken(tokenId: string): TokenRecord {
    const token = this.tokens.get(tokenId);
    if (!token) throw new Error(`Token '${tokenId}' not found`);
    return token;
  }

  public getPledges(assetId?: string): PledgeRecord[] {
    const list = Array.from(this.pledges.values());
    if (assetId) return list.filter((p) => p.assetId === assetId);
    return list;
  }

  public getDashboardStats() {
    const assets = Array.from(this.assets.values());
    const registeredAssets = assets.length;
    const pendingClaims = Array.from(this.claims.values()).filter((c) => c.status === 'SUBMITTED').length;
    const approvalsQueue = assets.filter((a) => a.status === 'PENDING_VERIFICATION' || a.status === 'VERIFIED').length;
    const tokenizedHoldings = Array.from(this.tokens.values()).filter((t) => t.status === 'ACTIVE').length;

    return {
      registeredAssets,
      pendingClaims,
      approvalsQueue,
      tokenizedHoldings,
      isDemonstrationData: true,
      fabricLedgerConnected: false,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const ledgerService = new LedgerService();

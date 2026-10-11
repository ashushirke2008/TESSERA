import {
  SystemHealthData,
  SystemReadinessData,
  AssetRecord,
  EvidenceRecord,
  ValuationRecord,
  ClaimRecord,
  ApprovalRecord,
  TokenRecord,
  PledgeRecord,
  TransferSimulationResult,
  AssetPassport,
  AuditLogEntry,
  BusinessRole,
  AuthUser,
  DemoAccount,
  DashboardStats,
  SystemHealthReport,
} from '../types';

let currentAuthToken = '';
try {
  const savedToken = sessionStorage.getItem('tessera_token');
  if (savedToken) currentAuthToken = savedToken;
} catch {}

export function setAuthToken(token: string) {
  currentAuthToken = token;
  try {
    if (token) {
      sessionStorage.setItem('tessera_token', token);
    } else {
      sessionStorage.removeItem('tessera_token');
      sessionStorage.removeItem('tessera_user');
    }
  } catch {}
}

export function getAuthToken(): string {
  return currentAuthToken;
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem('tessera_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Request failed with HTTP ${res.status}`);
  }
  return json.data;
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser; permissions: string[] }> {
  const data = await request<{ token: string; user: AuthUser; permissions: string[] }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(data.token);
  try {
    sessionStorage.setItem('tessera_user', JSON.stringify(data.user));
  } catch {}
  return data;
}

export async function logout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore server error on logout
  } finally {
    setAuthToken('');
  }
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser; permissions: string[] }> {
  return request('/api/auth/me');
}

export async function fetchDemoAccounts(): Promise<{ demoAuthEnabled: boolean; accounts: DemoAccount[]; demoPasswordHint?: string }> {
  return request('/api/auth/demo-accounts');
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/dashboard/stats');
}

export async function fetchSystemDetailedHealth(): Promise<SystemHealthReport> {
  return request<SystemHealthReport>('/api/health/system');
}

export async function loginAsRole(role: BusinessRole): Promise<{ token: string; user: AuthUser; permissions: string[] }> {
  const usernameMap: Record<BusinessRole, string> = {
    ADMINISTRATOR: 'demo.admin',
    ISSUER_REGISTRAR: 'demo.issuer',
    VERIFIER: 'demo.verifier',
    INVESTOR_BUYER: 'demo.investor',
    COMPLIANCE_OFFICER: 'demo.compliance',
    AUDITOR: 'demo.auditor',
  };

  const username = usernameMap[role] || 'demo.admin';
  return login(username, 'TesseraDemo@2026');
}

export async function fetchHealth(): Promise<SystemHealthData> {
  try {
    const res = await fetch('/api/health');
    const json = await res.json();
    return json.data;
  } catch {
    return {
      status: 'OFFLINE',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      environment: 'offline',
    };
  }
}

export async function fetchReadiness(): Promise<SystemReadinessData> {
  try {
    const res = await fetch('/api/ready');
    const json = await res.json();
    return json.data;
  } catch {
    return {
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      service: 'tessera-api',
      dependencies: {
        environment: { status: 'offline' },
        fabric: { status: 'disconnected', connected: false, message: 'Backend unreachable' },
        minio: { status: 'disconnected', connected: false, message: 'Backend unreachable' },
        adapters: { status: 'unconfigured', configuredCount: 0 },
      },
    };
  }
}

export async function fetchAssets(type?: string): Promise<AssetRecord[]> {
  const url = type && type !== 'ALL' ? `/api/assets?type=${type}` : '/api/assets';
  return request<AssetRecord[]>(url);
}

export async function fetchAsset(id: string): Promise<AssetRecord> {
  return request<AssetRecord>(`/api/assets/${id}`);
}

export async function createAsset(payload: {
  assetId: string;
  assetType: string;
  name: string;
  declaredValue: number;
  currency: string;
  rawFingerprint: string;
  metadata: Record<string, string>;
}): Promise<AssetRecord> {
  return request<AssetRecord>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadEvidence(assetId: string, docType: string, file: File): Promise<EvidenceRecord> {
  const formData = new FormData();
  formData.append('assetId', assetId);
  formData.append('docType', docType);
  formData.append('file', file);

  const res = await fetch('/api/evidence/upload', {
    method: 'POST',
    headers: currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {},
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Evidence upload failed');
  return json.data;
}

export async function verifyEvidence(objectKey: string, expectedHash: string): Promise<{ verified: boolean; computedHash: string }> {
  return request('/api/evidence/verify', {
    method: 'POST',
    body: JSON.stringify({ objectKey, expectedHash }),
  });
}

export async function submitClaim(assetId: string, claimType: string, evidenceIds: string[] = []): Promise<ClaimRecord> {
  return request<ClaimRecord>('/api/claims', {
    method: 'POST',
    body: JSON.stringify({ assetId, claimType, evidenceIds }),
  });
}

export async function reviewClaim(claimId: string, decision: 'ACCEPTED' | 'REJECTED', rejectionReason?: string): Promise<ClaimRecord> {
  return request<ClaimRecord>(`/api/claims/${claimId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, rejectionReason }),
  });
}

export async function submitApproval(assetId: string, action: string, decision: 'APPROVED' | 'REJECTED', comments: string): Promise<ApprovalRecord> {
  return request<ApprovalRecord>('/api/approvals', {
    method: 'POST',
    body: JSON.stringify({ assetId, action, decision, comments }),
  });
}

export async function recordValuation(payload: {
  assetId: string;
  source: string;
  amount: number;
  currency: string;
  methodology: string;
  validityHours?: number;
}): Promise<ValuationRecord> {
  return request<ValuationRecord>('/api/valuation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function issueTokens(assetId: string, symbol: string, totalSupply: number): Promise<TokenRecord> {
  return request<TokenRecord>('/api/tokens/issue', {
    method: 'POST',
    body: JSON.stringify({ assetId, symbol, totalSupply }),
  });
}

export async function fetchPledges(assetId?: string): Promise<PledgeRecord[]> {
  const url = assetId ? `/api/pledges?assetId=${assetId}` : '/api/pledges';
  return request<PledgeRecord[]>(url);
}

export async function createPledge(payload: {
  assetId: string;
  lender: string;
  borrower: string;
  amountPledged: number;
}): Promise<PledgeRecord> {
  return request<PledgeRecord>('/api/pledges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function releasePledge(pledgeId: string): Promise<PledgeRecord> {
  return request<PledgeRecord>(`/api/pledges/${pledgeId}/release`, {
    method: 'POST',
  });
}

export async function simulateTransfer(payload: {
  tokenId: string;
  fromOwner: string;
  toOwner: string;
  amount: number;
}): Promise<TransferSimulationResult> {
  return request<TransferSimulationResult>('/api/transfers/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function executeTransfer(payload: {
  tokenId: string;
  fromOwner: string;
  toOwner: string;
  amount: number;
}): Promise<{ confirmed: boolean; token: TokenRecord }> {
  return request('/api/transfers/execute', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPassport(assetId: string): Promise<AssetPassport> {
  return request<AssetPassport>(`/api/passport/${assetId}`);
}

export async function fetchPassportQr(assetId: string): Promise<{ qrDataUrl: string; verificationUrl: string; publicProofHash: string }> {
  return request(`/api/passport/${assetId}/qr`);
}

export async function fetchAuditHistory(assetId?: string): Promise<AuditLogEntry[]> {
  const url = assetId ? `/api/audit?assetId=${assetId}` : '/api/audit';
  return request<AuditLogEntry[]>(url);
}

export async function triggerAdapterVerify(service: string, assetId: string, scenario: string) {
  return request(`/api/adapters/${service}/verify`, {
    method: 'POST',
    body: JSON.stringify({ assetId, scenario }),
  });
}

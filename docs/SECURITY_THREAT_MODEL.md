# TESSERA — Security Threat Model

> **Status:** Phase 2 — Architecture Validation. Expanded with new threats.  
> Updated: 2026-10-10.  
> Threats and controls will be refined as implementation progresses.

---

## 1. Scope

This threat model covers:
- Identity and authentication (Fabric CA, X.509, MSP)
- API authorization
- Evidence protection (upload, storage, integrity)
- Secret management
- On-chain transaction integrity and privacy
- Private Data Collection access control
- External adapter security

---

## 2. Trust Boundaries

```
[Browser / User]
  ↓ HTTPS
[Node.js API]  ← only trusted boundary for external clients
  ↓ gRPC (mTLS)
[Fabric Peer / Orderer]
  ↓ (internal)
[CouchDB]       ← never directly accessible externally

[Node.js API]  ← MinIO client (internal network only)
  ↓ S3 API
[MinIO]

[Node.js API]  ← adapter calls over HTTPS with API key
  ↓ HTTPS
[External Services]
```

---

## 3. Identity and Authentication Threats

### T-ID-1: Spoofed Identity
- **Threat:** An attacker presents a forged or stolen X.509 certificate
  to the Fabric network and the API.
- **Controls:**
  - Certificates issued only by Fabric CA; revocation via CRL.
  - Chaincode verifies identity via `ctx.GetClientIdentity()`.
  - API validates enrollee credential before allowing operations.

### T-ID-2: Compromised Wallet / Private Key
- **Threat:** Backend wallet files containing private keys are stolen.
- **Controls:**
  - Wallet directory is excluded from Git via `.gitignore`.
  - Wallet files have minimal filesystem permissions.
  - Private keys are never logged or transmitted.

### T-ID-3: Unauthorized Identity Registration
- **Threat:** Non-admin user registers new Fabric identities.
- **Controls:**
  - Only the Fabric CA Admin identity can register new users.
  - Registration API endpoint restricted to `ADMIN` role.

---

## 4. API Authorization Threats

### T-AUTH-1: Privilege Escalation
- **Threat:** A lower-privilege user accesses admin operations.
- **Controls:**
  - Role-based middleware on every API route.
  - Chaincode enforces MSP-level authorization redundantly.
  - Attribute-based access control (ABAC) via X.509 certificate attributes.

### T-AUTH-2: Insecure Direct Object Reference (IDOR)
- **Threat:** A user accesses another user's assets or claims by
  guessing IDs.
- **Controls:**
  - Chaincode enforces ownership checks before returning private data.
  - API validates that the requester's identity is authorized for the
    requested resource.

### T-AUTH-3: Unauthenticated Access
- **Threat:** Unauthenticated requests reach protected endpoints.
- **Controls:**
  - All protected routes require a valid Bearer token.
  - Token validation middleware rejects missing or invalid tokens before
    any business logic executes.

---

## 5. Evidence Protection Threats

### T-EV-1: Evidence Tampering
- **Threat:** An attacker modifies an evidence file in MinIO after upload.
- **Controls:**
  - SHA-256 hash computed before upload and stored on-chain.
  - Integrity verification re-computes hash and compares against
    on-chain record; any mismatch is reported as a failure.
  - MinIO access restricted to the backend API only (no public bucket
    access).

### T-EV-2: Unauthorized Evidence Download
- **Threat:** Unauthorized party downloads evidence files from MinIO.
- **Controls:**
  - MinIO not publicly accessible; internal network only.
  - Presigned URLs are time-limited and generated only after
    authorization check.
  - Access keys stored in environment variables only.

### T-EV-3: Evidence Replay / Substitution
- **Threat:** A previously valid evidence record is reused for a
  different asset.
- **Controls:**
  - Evidence metadata on-chain links hash to a specific `assetId`.
  - Chaincode validates that the evidence record belongs to the
    referenced asset before accepting it.

---

## 6. Secret Management Threats

### T-SEC-1: Secrets Committed to Git
- **Threat:** API keys, passwords, private keys, or certificates are
  accidentally committed to the repository.
- **Controls:**
  - `.gitignore` excludes `.env`, `*.pem`, `*.key`, wallet directories.
  - `.env.example` contains only placeholder values.
  - `AGENTS.md` prohibits hardcoding secrets.
  - Pre-commit hook (to be added in Stage 1) scans for common secret
    patterns.

### T-SEC-2: Environment Variable Leakage
- **Threat:** Secret values are logged, returned in API responses, or
  exposed in error messages.
- **Controls:**
  - Logging middleware must redact sensitive fields.
  - Error responses never include secret values.
  - Environment variable access restricted to the process that needs it.

### T-SEC-3: Misconfigured MinIO Credentials
- **Threat:** MinIO access keys are weak or default credentials remain.
- **Controls:**
  - Default credentials explicitly replaced before any deployment.
  - `.env.example` uses `PLACEHOLDER_*` values as a reminder.

---

## 7. On-Chain Transaction Integrity Threats

### T-TX-1: Premature Success Response
- **Threat:** API reports a transaction as committed before Fabric
  has validated and committed it, leading to data inconsistency.
- **Controls:**
  - Backend always awaits commit confirmation from Fabric Gateway
    before returning `201 Created`.
  - Commit status and validation code are checked explicitly.

### T-TX-2: MVCC Read Conflict
- **Threat:** Concurrent transactions on the same key cause one to fail
  with an MVCC conflict.
- **Controls:**
  - Backend handles MVCC conflict errors (code `FABRIC_MVCC_CONFLICT`)
    and returns `409 Conflict` to the client.
  - Client is advised to retry with appropriate backoff.

### T-TX-3: Input Manipulation / Injection
- **Threat:** Malformed or malicious input is written to the ledger
  via chaincode.
- **Controls:**
  - API layer validates and sanitizes all input before submission.
  - Chaincode performs additional validation of all parameters before
    writing state.

### T-TX-4: Phantom Read
- **Threat:** A chaincode query returns stale results, leading to
  incorrect decision logic.
- **Controls:**
  - Use key-range queries with phantom-read protection where required.
  - Document scenarios where stale reads are acceptable vs. those
    requiring strict read sets.

---

## 8. Private Data Collection Threats

### T-PDC-1: Unauthorized Private Data Access
- **Threat:** An organization not authorized by the PDC policy accesses
  sensitive data (valuation, private claim notes).
- **Controls:**
  - PDC policy explicitly lists authorized MSPs.
  - Chaincode enforces MSP membership check before reading private state.
  - Private data is never included in public chaincode events or logs.

### T-PDC-2: Private Data Hash Mismatch
- **Threat:** An authorized peer tampers with private data; the
  on-ledger hash no longer matches.
- **Controls:**
  - Fabric automatically stores a hash of private data on the public
    ledger. Any mismatch causes endorsement failure.

---

## 9. External Adapter Threats

### T-EXT-1: Malicious External API Response
- **Threat:** An external service returns malicious or unexpected data
  that corrupts on-chain state.
- **Controls:**
  - Adapter responses are validated and sanitized before being passed
    to chaincode.
  - Chaincode performs its own validation of external result payloads.

### T-EXT-2: API Key Exposure
- **Threat:** External service API keys are leaked.
- **Controls:**
  - Keys stored in environment variables only.
  - Keys never logged or returned in API responses.
  - Separate keys per adapter/service.

### T-EXT-3: Adapter Timeout / Unavailability
- **Threat:** External service is unavailable, causing API request to
  hang or fail ungracefully.
- **Controls:**
  - All adapter calls have explicit timeouts.
  - Failures return structured error responses.
  - On-chain state is not written until a valid response is received.

---

## 10. Infrastructure Threats

### T-INFRA-1: Exposed Docker Ports
- **Threat:** CouchDB, MinIO admin ports, or Fabric peer ports are
  accessible beyond the Docker internal network.
- **Controls:**
  - Only necessary ports exposed on `localhost` for development.
  - Production deployment uses internal Docker networks only.

### T-INFRA-2: Outdated Docker Images
- **Threat:** Fabric, CouchDB, or MinIO images contain known
  vulnerabilities.
- **Controls:**
  - Pin image versions explicitly in Docker Compose.
  - Review release notes and update regularly.

---

## 11. Double-Pledge and Concurrent Restriction Threats

### T-PLEDGE-1: Double-Pledge via Concurrent Requests
- **Threat:** Two simultaneous pledge requests each verify sufficient unrestricted balance independently, both succeed, and together exceed the holder's total balance.
- **Controls:**
  - Chaincode uses a dedicated `activePledgeCounter` composite key (not a rich query) to track restricted amounts within the same MVCC transaction scope.
  - CouchDB rich queries cannot provide phantom-read protection; composite key reads are used instead.
  - MVCC conflict on the counter key ensures at most one pledge succeeds concurrently.

### T-PLEDGE-2: Restriction Expiry Race
- **Threat:** An expiry is processed and a concurrent transfer is initiated simultaneously; transfer might use expired restriction balance.
- **Controls:**
  - `ExpireRestrictions` and `ExecuteTransfer` both read the restriction's `expiresAt` field and current timestamp from `ctx.GetTxTimestamp()` within their transaction; MVCC protects consistency.

---

## 12. Transfer Safety Threats

### T-XFER-1: Transfer Without Execution-Time Revalidation
- **Threat:** A client simulates a transfer (passes policy check), then policy changes, then executes — and the execution uses the cached (stale) simulation result.
- **Controls:**
  - `ExecuteTransfer` chaincode function always re-evaluates policy and restrictions at execution time within the transaction.
  - Backend never skips the revalidation step when calling `ExecuteTransfer`.
  - This is enforced by ADR-005 and verified by `TestExecuteTransfer_RevalidatesPolicy`.

### T-XFER-2: Double-Spend via Concurrent Transfers
- **Threat:** Two concurrent transfers from the same sender each read sufficient balance and both succeed, spending more than the holder owns.
- **Controls:**
  - `ExecuteTransfer` reads and writes the sender holding key in the same transaction. MVCC conflict ensures exactly one of two concurrent transfers on the same key succeeds.
  - Backend returns `409 FABRIC_MVCC_CONFLICT` with retry guidance.

---

## 13. Valuation Threats

### T-VAL-1: Stale Valuation Used for Tokenization
- **Threat:** An asset with an expired valuation is tokenized, misrepresenting its current market value.
- **Controls:**
  - `TokenizeAsset` chaincode function calls `CheckValuationFreshness` within the same transaction.
  - Stale valuation (current date past `expiryDate`) causes tokenization to fail with `VALUATION_STALE`.
  - Freshness threshold is configured via policy and enforced on-chain.

### T-VAL-2: Valuation Amount Leakage
- **Threat:** Private valuation amount is exposed via logs, error messages, or API responses to unauthorized parties.
- **Controls:**
  - Valuation amounts stored only in `assetPrivateDetails` PDC; never on public ledger.
  - API returns private amount only to `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMINISTRATOR` roles.
  - Logging middleware redacts all PDC-sourced fields.

---

## 14. Evidence and MinIO Threats

### T-EV-4: Malicious File Upload
- **Threat:** An attacker uploads a file with a dangerous MIME type or executable content.
- **Controls:**
  - Backend enforces MIME type allowlist (PDF, PNG, JPEG, CSV, XML) before upload.
  - File size limit enforced (max 100 MB configurable).
  - Virus/malware scan hook (pluggable stub; to be wired to ClamAV or equivalent in Stage 6).
  - Files are stored as opaque objects in MinIO; never executed.

### T-EV-5: MinIO Orphan Object
- **Threat:** Backend uploads evidence to MinIO, then the `RecordEvidence` chaincode transaction fails. The MinIO object exists but has no on-chain record.
- **Controls:**
  - Backend tracks MinIO upload `etag` and chaincode transaction status.
  - If chaincode transaction fails after MinIO upload, backend attempts to delete the orphan MinIO object in a compensating action.
  - Orphan cleanup is idempotent and logged for audit.

---

## 15. Policy Threats

### T-POL-1: Invalid Policy Version Applied
- **Threat:** A DRAFT or SUPERSEDED policy version is applied to a transfer instead of the ACTIVE version.
- **Controls:**
  - `EnforceTransferPolicy` chaincode reads `policy.currentVersionId` and then retrieves that version. Uses key-based lookup; MVCC-safe.
  - Policy version activation (`SetActiveVersion`) requires `ADMINISTRATOR` role.
  - Old versions are immutable; only `currentVersionId` pointer changes.

### T-POL-2: Policy Version Downgrade
- **Threat:** Attacker downgrades active policy to an older, less restrictive version to bypass transfer controls.
- **Controls:**
  - `SetActiveVersion` restricted to `ADMINISTRATOR` role only.
  - All policy version changes are recorded on the immutable ledger (via the Fabric transaction history).
  - Audit trail: `AUDITOR` can query historical policy version activations.

---

## 16. Administrative Action Threats

### T-ADMIN-1: Unauthorized User Registration
- **Threat:** A non-administrator registers new Fabric identities, potentially creating privileged users.
- **Controls:**
  - Fabric CA identity registration requires Admin certificate.
  - API `/admin/users/register` endpoint restricted to `ADMINISTRATOR` role only.
  - Registered identities are logged and auditable.

### T-ADMIN-2: Role Attribute Tampering
- **Threat:** A user's X.509 certificate `role` attribute is forged or modified to escalate privileges.
- **Controls:**
  - Certificate attributes are signed by Fabric CA; cannot be modified without re-enrollment.
  - Chaincode reads attributes from the verified certificate context (`ctx.GetClientIdentity()`).
  - Certificate revocation (CRL) available for immediate identity revocation.

---

## 17. Cross-Org Private Data Leakage Threats

### T-PDC-3: Cross-Org Claim Data Leakage
- **Threat:** An organization outside the `claimPrivateData` authorized set obtains private claim notes by exploiting chaincode or network misconfiguration.
- **Controls:**
  - PDC `memberOnlyRead: true` in collection config; unauthorized organizations cannot issue GetPrivateData.
  - Chaincode verifies requesting identity's MSP before returning private data.
  - Private data transmitted peer-to-peer only among authorized orgs; not via orderer.
  - PDC config reviewed and tested in integration tests (unauthorized org access → error).

---

## Threat Summary Table

| ID | Area | Severity | Control Status |
|---|---|---|---|
| T-ID-1 | Identity spoofing | High | Planned |
| T-ID-2 | Wallet compromise | Critical | Planned |
| T-ID-3 | Unauthorized registration | High | Planned |
| T-AUTH-1 | Privilege escalation | High | Planned |
| T-AUTH-2 | IDOR | Medium | Planned |
| T-AUTH-3 | Unauthenticated access | High | Planned |
| T-EV-1 | Evidence tampering | High | Planned |
| T-EV-2 | Unauthorized download | Medium | Planned |
| T-EV-3 | Evidence substitution | Medium | Planned |
| T-EV-4 | Malicious file upload | High | Planned |
| T-EV-5 | MinIO orphan object | Medium | Planned |
| T-SEC-1 | Secrets in Git | Critical | Mitigated (gitignore) |
| T-SEC-2 | Secret leakage in logs | High | Planned |
| T-SEC-3 | Default credentials | High | Planned |
| T-TX-1 | Premature success | High | Rule documented |
| T-TX-2 | MVCC conflict | Medium | Planned |
| T-TX-3 | Input injection | High | Planned |
| T-TX-4 | Phantom read | **High** | **Planned (composite key mitigation)** |
| T-PDC-1 | Private data leak | High | Planned |
| T-PDC-2 | Hash mismatch | Medium | Fabric built-in |
| T-PDC-3 | Cross-org claim data leakage | High | Planned |
| T-EXT-1 | Malicious adapter data | Medium | Planned |
| T-EXT-2 | API key exposure | High | Planned |
| T-EXT-3 | Adapter timeout | Low | Planned |
| T-INFRA-1 | Exposed ports | Medium | Planned |
| T-INFRA-2 | Outdated images | Medium | Planned |
| T-PLEDGE-1 | Double-pledge concurrent | **Critical** | **Planned (composite key counter)** |
| T-PLEDGE-2 | Restriction expiry race | Medium | Planned |
| T-XFER-1 | Stale simulation result | High | Planned (execution-time revalidation) |
| T-XFER-2 | Double-spend concurrent | **Critical** | **Planned (MVCC on holding key)** |
| T-VAL-1 | Stale valuation tokenization | High | Planned |
| T-VAL-2 | Valuation amount leakage | High | Planned |
| T-POL-1 | Invalid policy version | High | Planned |
| T-POL-2 | Policy version downgrade | High | Planned |
| T-ADMIN-1 | Unauthorized user registration | High | Planned |
| T-ADMIN-2 | Role attribute tampering | Critical | Planned (CA-signed cert) |

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*


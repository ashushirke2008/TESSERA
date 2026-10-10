# TESSERA — Implementation Plan

> **Status:** Phase 2 — Architecture Validation Complete. Ready for Milestone 1 implementation.  
> Updated: 2026-10-10 by Architecture Validation Phase.  
> All application code below Milestone 0 is planned; no chaincode, backend, or frontend code exists yet.

---

## Reading Guide

This plan supersedes the Stage 0 skeleton. It uses **Milestone** numbering (M0–M7) aligned to the phase gate model in AGENTS.md (Stages 0–6). Each milestone must be accepted before the next begins. The **smallest useful vertical slice** is M1 (Fabric network + CreateAsset + ReadAsset through the API).

---

## Overview

TESSERA is built incrementally across eight milestones (M0–M7), mapped to the seven project stages (0–6). Each milestone has explicit prerequisites, affected files, deliverables, tests, acceptance criteria, risks, and a Definition of Done. **No milestone begins until its predecessor's Definition of Done is satisfied.**

### Dependency Graph (Summary)

```
M0 (Workspace + Git + Env)
  └─► M1 (Fabric Network + Basic Asset Chaincode + API Scaffold)
        └─► M2 (Asset Templates + Registration + Duplicate Prevention)
              └─► M3 (MinIO Evidence + SHA-256 Workflow)
                    └─► M4 (Claims + Attestations + Approvals + Valuation)
                          └─► M5 (Tokenization + Holdings + Pledges + Policies + Transfers)
                                └─► M6 (External Adapters + QR Asset Passport)
                                      └─► M7 (Frontend Completion + Audit + Integration Testing + Hardening)
```

**Smallest Useful Vertical Slice:** M1 — end-to-end asset creation and retrieval through Fabric Gateway.

---

## Milestone 0 — Workspace, Documentation, Git and Environment

### Maps to: Stage 0

### Prerequisites
- Access to the project workspace at `C:\Users\admin\Downloads\TESSERA`.
- Git installed (confirmed: 2.54.0).
- Docker Desktop installed (confirmed: 29.8.2) — **daemon currently NOT running; must be started before M1**.
- Node.js v24.13.1 and npm 11.8.0 installed.
- Go 1.27.2 installed.
- WSL 2 with Ubuntu confirmed (Default Distribution: Ubuntu, Default Version: 2).

### Files and Modules Affected
- All files in `docs/`
- `AGENTS.md`, `README.md`, `.gitignore`, `.env.example`
- `infrastructure/fabric/` (placeholder structure only)

### Implementation Tasks
- [x] Directory structure established.
- [x] All documentation scaffold files created.
- [x] `.env.example` populated with all required variable groups.
- [x] `.gitignore` covering secrets, wallets, crypto-config, build artifacts.
- [x] `AGENTS.md` binding rules established.
- [ ] `git init` run; initial commit made.
- [ ] `.env` created locally from `.env.example` (never committed).
- [ ] `infrastructure/fabric/` directory structure placeholders created.
- [ ] npm PowerShell execution policy resolved (use `cmd /c npm` or set `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`).
- [ ] Docker Desktop daemon started and verified (`docker info` returns successfully).
- [ ] Pre-commit hook stub added for secret scanning (`scripts/pre-commit-check.sh`).

### Deliverables
- Git repository with initial commit.
- All planning documents reviewed and complete.
- Local `.env` file (not committed).
- Verification checklist in `docs/DEVELOPMENT_SETUP.md` fully satisfied.

### Unit Tests
- N/A (no application code).

### Integration Tests
- Verify `docker info` returns without error.
- Verify `wsl --list --verbose` shows Ubuntu at version 2.
- Verify `go version` ≥ 1.21, `node --version` ≥ v20, `git --version` ≥ 2.40.

### Acceptance Criteria
- All docs present and contain substantive content (no blank placeholders).
- `git log` shows at least one commit.
- No `.env`, `*.pem`, or `wallet/` files in the commit.
- Docker Desktop running and `docker compose version` succeeds.
- Every item in the DEVELOPMENT_SETUP.md verification checklist marked complete.

### Risks and Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Docker Desktop daemon not started | Confirmed | Must be started manually before M1 |
| npm blocked by PS execution policy | Confirmed | Use `cmd /c npm` or set execution policy |
| Fabric binaries not yet pulled | Expected | Pull in M1 as first task |

### Definition of Done
All acceptance criteria satisfied. Human reviewer has confirmed no secrets committed. Docker daemon running. Git repo initialized.

---

## Milestone 1 — Fabric Network, Identity, Chaincode Foundation and Basic Connectivity

### Maps to: Stage 1

### Prerequisites
- M0 Definition of Done satisfied.
- Docker Desktop daemon running.
- Fabric Docker images pulled (`hyperledger/fabric-peer:2.5`, `hyperledger/fabric-orderer:2.5`, `hyperledger/fabric-ca:1.5`, `couchdb:3.3`).
- Fabric CLI binaries available in WSL (`peer`, `configtxgen`, `configtxlator`).

### Scope (Smallest Useful Vertical Slice)
One organization, one peer, one orderer, one CA, CouchDB world state. Chaincode deploys with `CreateAsset` and `ReadAsset`. Backend Express app enrolls an admin identity and submits a transaction. API exposes `POST /api/v1/assets` and `GET /api/v1/assets/:id`.

### Files and Modules Affected
- `infrastructure/docker/docker-compose.yaml`
- `infrastructure/fabric/configtx.yaml`, `crypto-config.yaml`, `collections_config.json`
- `blockchain/chaincode/asset-contract/main.go`, `asset_contract.go`, `models/asset.go`, `go.mod`, `go.sum`
- `backend/src/app.ts`, `backend/src/fabric/gateway.ts`, `backend/src/routes/assets.ts`
- `backend/src/middleware/auth.ts` (stub)
- `scripts/enroll-admin.sh`, `scripts/network-up.sh`, `scripts/network-down.sh`

### Implementation Tasks

#### 1a. Fabric Network Setup
- Create `infrastructure/fabric/configtx.yaml` (1 org, 1 orderer, application capabilities V2_0).
- Create `infrastructure/fabric/crypto-config.yaml` (Org1, peer0, users: Admin, User1).
- Create `infrastructure/docker/docker-compose.yaml` with services: `ca.org1`, `peer0.org1`, `orderer`, `couchdb`, `cli`.
- Create `scripts/network-up.sh`: generate crypto, channel artifacts, start compose, join channel, install/approve/commit chaincode.
- Create `scripts/network-down.sh`: teardown and volume cleanup.
- Expose only `localhost` ports; no external network exposure.

#### 1b. Chaincode Foundation (Go)
- Initialize Go module: `go mod init github.com/tessera/asset-contract`.
- Implement `Asset` struct (all public fields from DATA_MODEL.md §1, excluding private fields).
- Implement `AssetContract` embedding `contractapi.Contract`.
- Implement functions: `CreateAsset`, `ReadAsset`, `UpdateAsset`, `DeleteAsset`, `AssetExists`, `QueryAssetsByOwner` (CouchDB Mango selector).
- **Duplicate prevention:** `CreateAsset` calls `AssetExists`; returns error if key already present (Fabric MVCC-safe check-then-write within same transaction).
- **Input validation:** All fields validated before any `PutState`.
- **Authorization:** `ctx.GetClientIdentity().GetMSPID()` checked; only `Org1MSP` may create assets in M1.
- Create `collections_config.json` (define `assetPrivateDetails` and `claimPrivateData` PDCs — configure authorized MSPs, block-to-live, required peer count).
- Chaincode unit tests: `asset_contract_test.go` using `shimtest.NewMockStub`.

#### 1c. Backend API Scaffold (Node.js/Express/TypeScript)
- Initialize `backend/` with `tsconfig.json`, `package.json` (Express, `@hyperledger/fabric-gateway`, `@grpc/grpc-js`, Zod, Winston).
- Implement `src/fabric/gateway.ts`: connect to peer via gRPC/mTLS, get network, get contract. Load identity from wallet.
- Implement `scripts/enroll-admin.sh`: enroll Org1 admin identity into local wallet using Fabric CA.
- Implement `src/routes/assets.ts`: `POST /assets`, `GET /assets/:assetId`.
- Implement commit-wait pattern: always await `submitTransaction` result including commit status check before responding `201`.
- Implement MVCC conflict detection: catch Fabric MVCC errors, return `409` with `FABRIC_MVCC_CONFLICT` code.
- Health endpoint: `GET /health` returns Fabric peer connectivity status.

### Deliverables
- Running local Fabric network (1 org, 1 peer, 1 orderer, 1 CA, CouchDB).
- Deployed `asset-contract` chaincode.
- Backend API with asset CRUD endpoints.
- Identity enrollment script.
- Chaincode unit tests passing.
- Backend integration tests passing against live network.

### Unit Tests (Chaincode — Go)
- `TestCreateAsset_Success`: valid input → state written, no error.
- `TestCreateAsset_DuplicateKey`: second call with same ID → error returned.
- `TestCreateAsset_MissingFields`: incomplete input → validation error.
- `TestReadAsset_Exists`: existing key → correct struct returned.
- `TestReadAsset_NotFound`: missing key → error returned.
- `TestAssetExists_True` / `_False`.
- `TestUpdateAsset_UnauthorizedMSP`: wrong MSP → rejected.
- `TestQueryAssetsByOwner`: mocked rich query returns expected results.

### Integration Tests
- `POST /assets` → `201`, `transactionId` present, ledger state verified via `GET`.
- `GET /assets/:id` → `200`, fields match submitted data.
- `POST /assets` duplicate → `409 ASSET_ALREADY_EXISTS`.
- `GET /assets/nonexistent` → `404`.
- `GET /health` → `200` with Fabric connected.
- Commit confirmed: test that success is not returned before commit (use Fabric event listener in test).

### Acceptance Criteria
- `docker compose up` starts all services without errors.
- Chaincode passes all unit tests (`go test ./...`).
- Backend integration tests pass against live network.
- `POST /assets` returns `201` only after Fabric commit confirmation.
- No hardcoded credentials in any committed file.
- `GET /assets/:id` returns the asset created by `POST /assets`.

### Risks and Mitigation
| Risk | Mitigation |
|---|---|
| Fabric image version incompatibility | Pin to fabric-peer:2.5.9, ca:1.5.12; verify release notes |
| gRPC TLS setup complexity on Windows | Use WSL for network scripts; backend connects via `localhost` port forwards |
| MVCC conflict handling missed | Enforce via ADR-005; review in code review |
| CouchDB not indexing queries | Create explicit indexes in `META-INF/statedb/couchdb/indexes/` |

### Definition of Done
Fabric network running. Chaincode unit tests ≥ 80% coverage. Integration tests all pass. Human reviewer approves. No secrets committed.

---

## Milestone 2 — Asset Templates, Registration, Retrieval and Duplicate Protection

### Maps to: Stage 1 (continued)

### Prerequisites
- M1 Definition of Done satisfied.

### Scope
Configurable asset templates (LAND, VEHICLE, GRAIN). Template-driven asset attribute validation. Full duplicate-prevention guarantee via Fabric MVCC. Template CRUD chaincode functions. Backend API endpoints for templates.

### Files and Modules Affected
- `blockchain/chaincode/asset-contract/models/asset_template.go`
- `blockchain/chaincode/asset-contract/asset_template_functions.go`
- `blockchain/chaincode/asset-contract/asset_contract.go` (extend CreateAsset with template validation)
- `backend/src/routes/asset-templates.ts`
- `backend/src/services/asset-template.service.ts`

### Implementation Tasks
- Implement `AssetTemplate` struct per DATA_MODEL.md §2 (templateId, name, version, attributeSchema, createdAt, createdBy).
- Implement `AttributeDefinition` (key, type enum: STRING/NUMBER/DATE/BOOLEAN, required, description).
- Implement chaincode functions: `CreateTemplate`, `ReadTemplate`, `ListTemplates`, `UpdateTemplate`.
- Seed three built-in templates: `LAND`, `VEHICLE`, `GRAIN` with required attributes documented.
- Extend `CreateAsset`: fetch template by `templateId`, validate all required attributes present and of correct type.
- **Duplicate prevention invariant:** `CreateAsset` uses `AssetExists` check within the same Fabric transaction. Because Fabric's MVCC tracks the read set, any concurrent `CreateAsset` for the same key will cause one to fail at commit — this is the **only** safe guarantee. Document this explicitly.
- Create CouchDB indexes: `by_owner`, `by_type`, `by_status`, `by_template`.

### Deliverables
- `AssetTemplate` chaincode functions.
- Three seeded templates (LAND, VEHICLE, GRAIN).
- Extended `CreateAsset` with template validation.
- CouchDB index definitions.
- Backend template API endpoints.

### Unit Tests
- `TestCreateTemplate_Success` / `_DuplicateId` / `_MissingFields`.
- `TestCreateAsset_ValidTemplate`: all required attributes present → success.
- `TestCreateAsset_MissingRequiredAttribute`: missing required field → validation error.
- `TestCreateAsset_WrongAttributeType`: type mismatch → error.
- `TestConcurrentCreateAsset_MVCCConflict`: two goroutines submit same ID → one MVCC error.

### Integration Tests
- Create LAND template, create LAND asset with valid attributes → success.
- Create LAND asset with missing required attribute → `400`.
- Concurrent POST to same asset ID → one `201`, one `409`.

### Acceptance Criteria
- All three built-in templates queryable via API.
- Template-invalid asset creation returns `400` with specific field error.
- Concurrent duplicate asset registrations: exactly one succeeds, one fails with `409`.

### Definition of Done
All tests passing. Templates seeded. Duplicate protection proven by concurrency test.

---

## Milestone 3 — MinIO Evidence Workflow, SHA-256 Verification and Metadata

### Maps to: Stage 2 (partial)

### Prerequisites
- M2 Definition of Done satisfied.
- MinIO service added to Docker Compose (stage gate: requires human approval to update compose file).

### Files and Modules Affected
- `infrastructure/docker/docker-compose.yaml` (add `minio` service)
- `blockchain/chaincode/asset-contract/models/evidence.go`
- `blockchain/chaincode/asset-contract/evidence_functions.go`
- `backend/src/services/evidence.service.ts`
- `backend/src/routes/evidence.ts`
- `backend/src/clients/minio.client.ts`

### Implementation Tasks
- Add MinIO container to Docker Compose: internal network only; credentials from env.
- Implement `EvidenceMetadata` struct per DATA_MODEL.md §3.
- Implement chaincode: `RecordEvidence` (writes hash + ref on-chain), `GetEvidenceMetadata`, `ListEvidenceByAsset`.
- Validate in chaincode: `assetId` must exist before evidence can be recorded.
- Backend evidence service:
  - Receive multipart upload.
  - Compute SHA-256 before upload (Node.js `crypto.createHash('sha256')`).
  - Upload to MinIO bucket `tessera-evidence` under key `{assetId}/{evidenceId}`.
  - Submit `RecordEvidence` chaincode transaction with hash and object key.
  - Only return success after Fabric commit and MinIO upload both confirmed.
- Implement `GET /evidence/:evidenceId/verify`: retrieve MinIO object, recompute SHA-256, compare to on-chain hash.
- Implement `GET /evidence/:evidenceId/download`: generate time-limited presigned URL (require authorization check first).
- Malicious upload protection: MIME type validation, file size limit, virus scan hook (stub for now).

### Deliverables
- MinIO integrated in Docker Compose.
- Evidence upload-verify-download workflow end-to-end.
- On-chain evidence metadata.
- SHA-256 integrity verification endpoint.

### Unit Tests
- `TestRecordEvidence_Success` / `_AssetNotFound` / `_InvalidHash`.
- Backend: SHA-256 of known file content matches expected hash.
- Backend: modified file produces different SHA-256.
- Backend: missing MinIO object → integrity failure error.

### Integration Tests
- Upload file → SHA-256 on-chain matches recomputed hash.
- Artificially modify object in MinIO → verify endpoint returns `422 EVIDENCE_INTEGRITY_FAILED`.
- Unauthorized identity cannot access evidence → `403`.

### Acceptance Criteria
- Uploaded file hash matches on-chain record.
- Modified evidence detected by verification endpoint.
- No direct client access to MinIO (presigned URL is time-limited, backend-authorized).

### Definition of Done
Evidence upload, storage, on-chain recording, and integrity verification all pass. Tests passing.

---

## Milestone 4 — Claims, Attestations, Approvals, Valuation and Authorization

### Maps to: Stage 2 (continued)

### Prerequisites
- M3 Definition of Done satisfied.

### Files and Modules Affected
- `blockchain/chaincode/asset-contract/models/claim.go`, `approval.go`, `valuation.go`
- `blockchain/chaincode/asset-contract/claim_functions.go`, `approval_functions.go`, `valuation_functions.go`
- `blockchain/chaincode/asset-contract/collections_config.json` (finalize PDC policies)
- `backend/src/routes/claims.ts`, `backend/src/routes/approvals.ts`, `backend/src/routes/valuations.ts`
- `backend/src/middleware/roles.ts` (full RBAC implementation)

### Implementation Tasks

#### 4a. RBAC Implementation (Full 6-Role Model)
Implement all six roles in API middleware and chaincode ABAC:
- `ISSUER_REGISTRAR`: create/update assets, upload evidence.
- `VERIFIER`: approve/reject claims, trigger external verification.
- `INVESTOR_BUYER`: submit claims, view public assets.
- `COMPLIANCE_OFFICER`: create policies, freeze tokens, view private data.
- `AUDITOR`: read-only access to all public and private (auditor-authorized) data.
- `ADMINISTRATOR`: register users, create templates, all operations.
Roles stored as X.509 certificate attributes (`hf.EnrollmentID` + custom `role` attribute via Fabric CA). Chaincode reads role via `ctx.GetClientIdentity().GetAttributeValue("role")`.

#### 4b. Claims Workflow
- Implement `Claim` struct (public + private fields per DATA_MODEL.md §4).
- Implement chaincode: `SubmitClaim`, `ReviewClaim`, `ApproveClaim`, `RejectClaim`, `WithdrawClaim`.
- **Self-approval prevention:** Chaincode checks that `approverId != claimantId` (compare certificate CNs).
- **Maker-checker:** An approval is only valid if the approver is a different identity than the submitter.
- M-of-N approval foundations: `Claim` struct includes `requiredApprovals int`, `approvals []ApprovalRef`. `ApproveClaim` checks count before marking APPROVED.
- Private claim fields stored in `claimPrivateData` PDC (only submitter org + approver org).
- Reason codes: all approvals/rejections require a `reason` field; chaincode validates non-empty.

#### 4c. Approval Records
- Implement `Approval` struct per DATA_MODEL.md §5.
- Each `ApproveClaim` / `RejectClaim` writes an immutable `Approval` record.
- Approvals are linked to claims; claim status updated atomically in same transaction.

#### 4d. Valuation
- Implement `Valuation` struct per DATA_MODEL.md §6.
- Private valuation amounts stored in `assetPrivateDetails` PDC.
- Implement `RecordValuation` chaincode function.
- **Freshness validation:** Chaincode validates `valuationDate` is within a configurable maximum age (policy-controlled). Stale valuations block token issuance in M5.

### Deliverables
- Full RBAC in middleware and chaincode.
- Claims state machine on-chain.
- Self-approval prevention proven by test.
- M-of-N approval foundation.
- Valuation on-chain with freshness check.
- Private data in PDC for claims and valuations.

### Unit Tests
- `TestSubmitClaim_Success` / `_AssetNotFound` / `_UnauthorizedRole`.
- `TestApproveClaim_SelfApproval` → error returned.
- `TestApproveClaim_MofN`: claim requires 2 approvals; first approval doesn't change status to APPROVED.
- `TestRejectClaim_EmptyReason` → validation error.
- `TestRecordValuation_Stale` → error when date exceeds freshness window.
- PDC: `TestPrivateClaimData_UnauthorizedOrg` → access denied.

### Integration Tests
- Submit claim as INVESTOR_BUYER → `201`.
- Approve own claim as same identity → `403 SELF_APPROVAL_DENIED`.
- Approve claim as VERIFIER → `200`.
- AUDITOR reads claim → `200`. INVESTOR_BUYER reads another's private claim data → `403`.

### Acceptance Criteria
- Self-approval rejected at chaincode level (not just API level).
- M-of-N: claim with `requiredApprovals=2` only moves to APPROVED after 2 distinct approvers.
- Stale valuation (>configurable threshold) blocks token issuance.
- Private claim notes readable only by submitter org and approver org.

### Definition of Done
All 6 roles implemented. Self-approval test passing. M-of-N foundation verified. PDC access tests passing.

---

## Milestone 5 — Token Issuance, Holdings, Pledges, Policies and Transfers

### Maps to: Stage 3

### Prerequisites
- M4 Definition of Done satisfied.
- Asset must be ACTIVE and have fresh valuation to be tokenized.

### Files and Modules Affected
- `blockchain/chaincode/asset-contract/models/token.go`, `holding.go`, `restriction.go`, `policy.go`, `transfer_decision.go`
- `blockchain/chaincode/asset-contract/token_functions.go`, `transfer_functions.go`, `policy_functions.go`
- `backend/src/routes/tokens.ts`, `backend/src/routes/transfers.ts`, `backend/src/routes/restrictions.ts`, `backend/src/routes/policies.ts`

### Implementation Tasks

#### 5a. Tokenization
- `TokenizeAsset`: asset must be ACTIVE, not already tokenized, valuation fresh. Sets `asset.tokenized = true`. Creates `Token` record. Creates initial `TokenHolding` for the asset owner.
- `RetireToken`: only COMPLIANCE_OFFICER or ADMINISTRATOR. Sets token to BURNED.
- **Invariant:** `sum(all holdings for tokenId) == token.totalSupply` at all times.

#### 5b. Holdings
- `TokenHolding` composite key: `tokenId + holderIdentity`.
- `GetHoldingsByToken`: CouchDB rich query by tokenId.
- `GetHoldingsByHolder`: CouchDB rich query by holderIdentity.

#### 5c. Pledges and Restrictions
- `PledgeToken`: COMPLIANCE_OFFICER or ISSUER_REGISTRAR. Creates `Restriction` record with `status=ACTIVE`.
- **Double-pledge prevention:** Before creating a restriction, chaincode sums all ACTIVE restrictions for `(tokenId, holderIdentity)`. If `sum(activeRestrictedAmount) + newAmount > holding.amount` → error `INSUFFICIENT_UNRESTRICTED_BALANCE`.
- This check must occur within the same chaincode transaction as the write. Application-level locking alone is NOT sufficient.
- `ReleaseRestriction`: sets `restriction.status = RELEASED`.
- `ExpireRestrictions`: callable by any authorized identity; sets EXPIRED where `expiresAt` is past.

#### 5d. Policy-as-Code and Versioning
- `Policy` and `PolicyVersion` structs per DATA_MODEL.md §10.
- `CreatePolicy`, `CreatePolicyVersion`, `SetActiveVersion`.
- `PolicyRule` struct: `{ field: string, operator: enum, value: interface{} }` — evaluated during transfer enforcement.
- Policy rules examples: `holderKYC == true`, `amount <= maxTransferAmount`, `toIdentity != restrictedList`.
- `EnforceTransferPolicy`: given tokenId, fromIdentity, toIdentity, amount → evaluates active policy version rules. Returns decision with reason code.
- Policy versioning: `currentVersion` pointer on Policy; old versions immutable.

#### 5e. Transfer Workflow
- `SimulateTransfer` (evaluate only, no state change): chaincode function that evaluates policies and restrictions without writing. Backend calls `evaluateTransaction` (read-only Fabric query).
- `ExecuteTransfer`: full write path. At execution time, re-evaluates policy and restrictions within the chaincode transaction (execution-time revalidation). Deducts from sender holding, adds to receiver holding. Creates `TransferDecision` record.
- **Atomic update:** Sender holding deduction and receiver holding increment occur in the same Fabric transaction. Cannot be split across two transactions.
- **Concurrent transfer protection:** MVCC handles concurrent transfers on the same holding key. Design: holding key = composite of `tokenId + holderIdentity`. Two concurrent transfers from same sender will cause one MVCC conflict.
- `TransferDecision` record created regardless of outcome (including rejections).

### Deliverables
- Full token lifecycle: issue → hold → pledge → transfer → retire.
- Double-pledge prevention proven by test.
- Policy-as-code with versioning.
- Transfer simulation and execution endpoints.
- All audit records (TransferDecision) on-chain.

### Unit Tests
- `TestTokenizeAsset_Success` / `_AlreadyTokenized` / `_StaleValuation`.
- `TestTransferToken_Atomic`: sender deducted, receiver credited in same block.
- `TestTransferToken_InsufficientBalance` → error.
- `TestPledgeToken_DoublePledgePrevention`: second pledge exceeding unrestricted balance → error.
- `TestSimulateTransfer_PolicyDenied`: policy rule violation → decision REJECTED, no state change.
- `TestExecuteTransfer_RevalidatesPolicy`: policy changed between simulate and execute → executes with new policy.
- `TestExecuteTransfer_MVCCConflict`: concurrent transfers from same sender → one MVCC error.
- `TestHoldingInvariant`: sum of all holdings equals totalSupply after multiple operations.

### Integration Tests
- Tokenize asset → `201` with tokenId.
- Transfer token → sender holding decremented, receiver incremented, TransferDecision on-chain.
- Double-pledge: two simultaneous pledge requests → one error.
- Simulate transfer → no ledger state change (verify via subsequent read).
- Execute transfer with stale simulate result → re-evaluated at execution time.

### Acceptance Criteria
- `sum(holdings) == totalSupply` invariant holds after all operations.
- Double pledge rejected at chaincode level.
- Transfer simulation does not modify state.
- Execution-time revalidation proven by test.
- All decisions (approved and rejected) recorded in TransferDecision.

### Definition of Done
All token/transfer/pledge tests passing. Invariants proven. Policy versioning functional.

---

## Milestone 6 — External Verification Adapters and QR Asset Passport

### Maps to: Stage 4

### Prerequisites
- M5 Definition of Done satisfied.

### Files and Modules Affected
- `external-adapters/government-registry/index.ts`
- `external-adapters/valuation-service/index.ts`
- `external-adapters/insurance-service/index.ts`
- `external-adapters/inspection-service/index.ts`
- `blockchain/chaincode/asset-contract/models/verification.go`
- `blockchain/chaincode/asset-contract/verification_functions.go`
- `backend/src/routes/verify.ts`
- `backend/src/services/passport.service.ts`
- `backend/src/routes/passport.ts`

### Implementation Tasks

#### 6a. External Adapter Layer
- Each adapter: typed HTTP client with configurable base URL + API key from env.
- Mandatory: explicit timeout (default 10s), retry with exponential backoff (max 3 attempts), structured error response.
- Adapter responses validated and sanitized before passing to chaincode.
- `RecordExternalVerification` chaincode function: writes `ExternalVerificationResult` per DATA_MODEL.md §12. Validates result payload in chaincode.
- **On-chain state not written until valid response confirmed from external service.**
- Simulated adapters return mock data in development mode (controlled by env var `ADAPTER_MODE=simulate`).

#### 6b. QR Asset Passport
- `GET /api/v1/assets/:assetId/passport`: aggregates on-chain data: asset, evidence list (hashes only), latest valuation, active restrictions, token info, external verification results.
- Returns a structured JSON passport object.
- Backend generates a QR code encoding the passport URL (e.g., `https://<host>/passport/:assetId`).
- QR code returned as base64 PNG in passport response.
- **Hash alone does not prove real-world ownership** — passport explicitly states this in its `disclaimer` field.

### Deliverables
- Four external adapters (simulate mode by default).
- `RecordExternalVerification` chaincode function.
- Passport API endpoint.
- QR code generation.

### Unit Tests
- Adapter: valid response → correctly shaped `ExternalVerificationResult`.
- Adapter: HTTP timeout → structured error, no chaincode call attempted.
- Adapter: malformed response → sanitization rejects, returns error.
- `TestRecordExternalVerification_InvalidPayload` → chaincode rejects.
- Passport service: aggregates all data sources correctly.

### Integration Tests
- Trigger each adapter in simulate mode → result recorded on-chain.
- Adapter timeout → `502` returned, no on-chain state change.
- Passport endpoint → returns complete passport JSON with QR code.

### Acceptance Criteria
- All four adapters work in simulate mode.
- Failed adapter call does not corrupt on-chain state.
- Passport disclaimer present and accurate.
- QR code decodes to valid passport URL.

### Definition of Done
All adapter tests passing. Passport endpoint functional. Disclaimer present.

---

## Milestone 7 — Frontend Completion, Audit Views, Integration Testing and Hardening

### Maps to: Stage 5 + Stage 6

### Prerequisites
- M6 Definition of Done satisfied.
- Backend API fully documented and stable.

### Files and Modules Affected
- `frontend/` (entire React/Vite/TypeScript application)
- `tests/e2e/` (Playwright tests)
- `tests/integration/` (additional integration tests)
- `docs/` (final documentation updates)

### Implementation Tasks

#### 7a. Frontend Application
- Initialize React + Vite + TypeScript in `frontend/` (`npm create vite@latest frontend -- --template react-ts`).
- Authentication flow: login via identity enrollment, JWT storage.
- Pages: Dashboard, Asset Registry, Asset Detail, Evidence Upload, Claims, Approvals, Tokenization, Holdings, Transfers (simulate + execute), Pledges, Policies, External Verification, QR Asset Passport, Audit History, Admin Panel.
- Role-based UI: menu items and actions shown/hidden per role.
- QR Passport: display and scan QR codes.
- Audit Timeline: display Fabric transaction history per asset.

#### 7b. Security Hardening
- Pre-commit hook activated for secret scanning.
- CORS configured to production origins.
- All API input validated with Zod schemas.
- Rate limiting on auth endpoints.
- Presigned URL expiry ≤ 15 minutes.
- TLS enforced for all external communications.
- All high/critical findings from security review resolved.

#### 7c. Test Completion
- E2E: 7 critical user flows in Playwright (per TEST_STRATEGY.md §10).
- Concurrency tests: MVCC conflict, double-pledge, concurrent transfer.
- Privacy tests: PDC access control per org.
- Authorization: all 6 roles tested against all protected endpoints.
- Coverage: chaincode ≥ 80%, backend ≥ 75%, frontend ≥ 70%.

### Deliverables
- Complete React frontend.
- Full test suite (unit + integration + E2E).
- Security hardening documented.
- Final system demonstration script.
- All documentation updated.

### Acceptance Criteria
- All E2E critical user flows pass in Playwright.
- Coverage thresholds met.
- No high/critical unresolved security findings.
- System demonstrated end-to-end on local Docker environment.

### Definition of Done
All tests passing. Coverage thresholds met. Security review complete. Human reviewer approves. Documentation final.

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*

---

## Stage 0 — Project Foundation and Environment Setup

### Objectives
- Establish the canonical project directory structure.
- Define and document mandatory technology stack and architecture.
- Set up development environment prerequisites.
- Create binding agent rules and architectural decisions.

### Prerequisites
- Access to the project workspace.
- Git installed.

### Deliverables
- [x] `AGENTS.md` — binding contributor rules
- [x] `README.md` — project overview
- [x] `docs/` — full documentation scaffold
- [x] `.env.example` — environment variable template
- [x] `.gitignore` — repository exclusions
- [ ] Git repository initialized (`git init`)
- [ ] `.env` created locally from `.env.example`
- [ ] Developer tools confirmed installed (see `DEVELOPMENT_SETUP.md`)

### Testing Requirements
- Verify directory structure matches specification.
- Confirm no secrets are committed.

### Acceptance Criteria
- All documentation files present and reviewed.
- Git repository initialized with initial commit.
- No application code, no Docker Compose, no chaincode present.
- Development environment prerequisites confirmed on target machine.

---

## Stage 1 — Hyperledger Fabric Infrastructure and Asset Registry

### Objectives
- Stand up a local Hyperledger Fabric network using Docker Compose.
- Deploy Fabric CA for identity management.
- Implement the core `AssetContract` chaincode in Go.
- Implement asset CRUD operations on-chain (Create, Read, Update, Delete).
- Connect the Node.js backend to Fabric via the Fabric Gateway SDK.
- Expose initial REST endpoints for asset operations.

### Prerequisites
- Stage 0 accepted.
- Docker Desktop running with WSL 2 backend.
- Go toolchain installed and verified.
- Node.js (LTS) and npm/yarn installed and verified.
- Hyperledger Fabric binaries and Docker images pulled.

### Deliverables
- [ ] Docker Compose file for Fabric network (`infrastructure/docker/`)
- [ ] Fabric network configuration (`infrastructure/fabric/`)
- [ ] `AssetContract` chaincode skeleton (`blockchain/chaincode/asset-contract/`)
  - CreateAsset
  - ReadAsset
  - UpdateAsset
  - DeleteAsset
  - AssetExists
  - QueryAssetsByOwner (CouchDB rich query)
- [ ] Backend Express app scaffold (`backend/`)
- [ ] Fabric Gateway SDK integration in backend
- [ ] REST endpoints: `POST /assets`, `GET /assets/:id`
- [ ] Identity enrollment script for local development (`scripts/`)

### Testing Requirements
- Chaincode unit tests (Go testing package).
- Backend integration tests against local Fabric network.
- Verify CouchDB world state updates after transactions.
- Confirm transaction commit status is checked before success response.

### Acceptance Criteria
- Fabric network starts cleanly via `docker compose up`.
- Chaincode deploys and passes all unit tests.
- API can create and retrieve an asset via the Fabric Gateway.
- No hardcoded credentials in any committed file.

---

## Stage 2 — Evidence Verification, Claims and Approval Workflows

### Objectives
- Implement evidence upload and integrity verification (SHA-256, MinIO).
- Implement Claims workflow on-chain (submit, review, approve/reject).
- Implement Approval records on-chain.
- Extend the backend API to handle evidence and workflow endpoints.

### Prerequisites
- Stage 1 accepted.
- MinIO running (via Docker Compose extension).

### Deliverables
- [ ] MinIO service added to Docker Compose.
- [ ] Evidence upload service in backend (SHA-256 hash, MinIO store).
- [ ] Evidence metadata recorded on-chain (hash, bucket, key, timestamp).
- [ ] Chaincode: `SubmitClaim`, `ApproveClaim`, `RejectClaim`.
- [ ] Chaincode: `RecordEvidence`, `GetEvidenceMetadata`.
- [ ] Private Data Collections configured for sensitive claim data.
- [ ] REST endpoints: `/evidence`, `/claims`, `/approvals`.

### Testing Requirements
- Evidence upload produces consistent SHA-256 hashes.
- Tampered evidence fails integrity check.
- Claim state machine transitions verified (unit tests).
- Private data access control verified (only authorized MSPs can read).

### Acceptance Criteria
- Uploaded evidence hash matches on-chain record.
- Claim lifecycle (submit → approve/reject) completes on-chain.
- Sensitive claim fields are only visible to authorized organizations.

---

## Stage 3 — Tokenization, Holdings, Restrictions and Transfers

### Objectives
- Implement asset tokenization on-chain.
- Implement token holdings (ownership records).
- Implement pledge and restriction mechanisms.
- Implement transfer workflow with policy enforcement.

### Prerequisites
- Stage 2 accepted.

### Deliverables
- [ ] Chaincode: `TokenizeAsset`, `GetTokenHoldings`.
- [ ] Chaincode: `TransferToken`, `PledgeToken`, `ReleaseToken`.
- [ ] Chaincode: `CreatePolicy`, `EnforcePolicy`.
- [ ] Transfer Decision records on-chain.
- [ ] REST endpoints: `/tokens`, `/holdings`, `/transfers`.

### Testing Requirements
- Double-spend prevention verified.
- Policy enforcement blocks unauthorized transfers.
- Restriction (pledge) prevents transfer while active.

### Acceptance Criteria
- Tokens can be created, held, transferred, and restricted.
- All transfer decisions are recorded on-chain with full audit trail.
- Policy violations result in rejected transactions.

---

## Stage 4 — External Verification Adapters

### Objectives
- Implement adapter layer for external verification services.
- Record external verification results on-chain.

### Prerequisites
- Stage 3 accepted.

### Deliverables
- [ ] Government Registry adapter (`external-adapters/government-registry/`).
- [ ] Valuation Service adapter (`external-adapters/valuation-service/`).
- [ ] Insurance Service adapter (`external-adapters/insurance-service/`).
- [ ] Inspection Service adapter (`external-adapters/inspection-service/`).
- [ ] Chaincode: `RecordExternalVerification`.
- [ ] REST endpoints: `/verify/government`, `/verify/valuation`, etc.

### Testing Requirements
- Adapters handle API errors and timeouts gracefully.
- Verification results recorded on-chain correctly.
- Mock external services used in integration tests.

### Acceptance Criteria
- All four adapters can fetch and record verification results.
- Failed external calls do not corrupt on-chain state.

---

## Stage 5 — React Dashboards, QR Asset Passport and Audit Views

### Objectives
- Build the React / Vite / TypeScript frontend.
- Implement dashboards for assets, claims, tokens, and transfers.
- Implement QR-code-based Asset Passport view.
- Implement audit history view.

### Prerequisites
- Stage 4 accepted.
- Backend API fully functional and documented.

### Deliverables
- [ ] React app scaffold (`frontend/`).
- [ ] Asset dashboard: list, detail, create.
- [ ] Claims and approvals dashboard.
- [ ] Token holdings and transfer views.
- [ ] QR Asset Passport (generates and reads QR codes for assets).
- [ ] Audit / transaction history view.
- [ ] Authentication integration (Fabric CA / identity).

### Testing Requirements
- Component unit tests (Vitest / React Testing Library).
- End-to-end tests (Playwright or Cypress) for critical user flows.

### Acceptance Criteria
- All dashboards render correctly with real backend data.
- QR Asset Passport displays verifiable asset information.
- Audit view shows complete transaction history.

---

## Stage 6 — Testing, Security Hardening and Final Demonstration

### Objectives
- Comprehensive test coverage across all layers.
- Security audit and hardening.
- Final system demonstration.

### Prerequisites
- Stage 5 accepted.

### Deliverables
- [ ] Full test suite: unit, integration, e2e.
- [ ] Security review findings documented and remediated.
- [ ] Performance and concurrency tests.
- [ ] Final demonstration script.
- [ ] Updated documentation.

### Testing Requirements
- All tests pass in CI.
- No high/critical security findings unresolved.

### Acceptance Criteria
- Test coverage meets defined thresholds.
- Security hardening items resolved or accepted with documented risk.
- Platform demonstrated end-to-end successfully.

---

*Last updated: Stage 0 — Project Initialization*

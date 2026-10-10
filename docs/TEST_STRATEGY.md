# TESSERA — Test Strategy

> **Status:** Phase 2 — Architecture Validation. Expanded with missing test categories.  
> Updated: 2026-10-10.  
> No tests exist yet. This document defines the testing approach for all
> future implementation milestones.

---

## 1. Testing Philosophy

- **Test early, test often.** Each stage has defined testing requirements
  that must be met before the next stage begins.
- **Tests are first-class citizens.** Test code lives alongside source
  code and is reviewed with the same rigor.
- **No test, no merge.** New features require corresponding tests.
- **Real Fabric for integration.** Integration tests run against a real
  local Fabric network, not mocks.

---

## 2. Test Pyramid

```
             ┌─────────────┐
             │   E2E Tests  │  (few, slow, high confidence)
             └──────┬───────┘
          ┌─────────┴──────────┐
          │  Integration Tests  │  (moderate, per-stage)
          └─────────┬──────────┘
       ┌────────────┴──────────────┐
       │       Unit Tests           │  (many, fast, per component)
       └───────────────────────────┘
```

---

## 3. Chaincode Unit Tests (Go)

**Framework:** Go standard `testing` package +
[`github.com/hyperledger/fabric-chaincode-go/shim/shimtest`](https://pkg.go.dev/github.com/hyperledger/fabric-chaincode-go/shim/shimtest)
or [`mockery`](https://github.com/vektra/mockery) for stub generation.

**What to test:**
- Each chaincode function in isolation using a mock `ChaincodeStubInterface`.
- Happy path: valid input produces correct state changes.
- Validation: invalid input produces expected errors.
- Authorization: operations by unauthorized identities are rejected.
- State machine transitions: Claims, Tokens, Restrictions follow
  correct lifecycle.
- Edge cases: duplicate creation, non-existent asset operations.
- Private data: correct collection names used; unauthorized reads blocked.

**Conventions:**
- Test file: `_test.go` adjacent to the function under test.
- Test naming: `TestFunctionName_Scenario`.
- All chaincode functions must have at least one positive and one
  negative test.

**Location:** `blockchain/chaincode/asset-contract/`

---

## 4. Backend Unit Tests (Node.js / TypeScript)

**Framework:** [Jest](https://jestjs.io/) or [Vitest](https://vitest.dev/).

**What to test:**
- Request validation middleware (valid and invalid inputs).
- Business logic services (evidence hash computation, adapter
  orchestration).
- Error handling and response formatting.
- Authorization middleware (role checks).

**Mocking:**
- Fabric Gateway SDK mocked; no real Fabric required.
- MinIO client mocked.
- External adapter HTTP calls mocked (e.g., `nock` or `msw`).

**Location:** `backend/` (adjacent to source files, `*.test.ts`)

---

## 5. Frontend Unit Tests (React / TypeScript)

**Framework:** [Vitest](https://vitest.dev/) +
[React Testing Library](https://testing-library.com/react).

**What to test:**
- Individual component rendering (correct props → correct output).
- Form validation behaviour.
- State management logic.
- Custom hooks.

**Location:** `frontend/` (adjacent to source files, `*.test.tsx`)

---

## 6. Integration Tests

Integration tests verify interaction between real system components.

### 6.1 Chaincode ↔ Fabric Network

**Framework:** Go or Node.js test runner against a live local Fabric
network.

**What to test:**
- Full asset lifecycle: create → read → update → delete.
- Evidence metadata recording end-to-end.
- Claim workflow: submit → approve/reject.
- Token lifecycle: issue → transfer → restrict → release.
- CouchDB rich query results match expected state.
- Private Data Collection access: authorized vs. unauthorized.

### 6.2 Backend API ↔ Fabric Network

**Framework:** Jest / Vitest + Supertest.

**What to test:**
- `POST /assets` → ledger record created and returned.
- `GET /assets/:id` → ledger record retrieved correctly.
- Evidence upload → SHA-256 hash matches on-chain record.
- Claims workflow via API → chaincode state transitions verified.
- Authorization: correct role can access endpoint, wrong role is rejected.
- Commit confirmation: success only returned after Fabric commit.

### 6.3 Backend API ↔ MinIO

**What to test:**
- Evidence file uploaded to MinIO.
- Object retrievable by key.
- Hash computed before upload matches re-computed hash after retrieval.
- Integrity failure detected when object is artificially modified.

**Location:** `tests/integration/`

---

## 7. Authorization Tests

Dedicated authorization tests verify that role and MSP enforcement
works correctly at **both** the API and chaincode layers.

**Scenarios:**
- VIEWER cannot write assets (API returns 403, chaincode rejects).
- CLAIMANT cannot approve own claim.
- Cross-organization asset access blocked by chaincode MSP check.
- Private data not readable by non-member organization.
- Admin-only operations blocked for non-admins.

**Location:** `tests/integration/` or dedicated `tests/authorization/`

---

## 8. Concurrency and MVCC Tests

**What to test:**
- Concurrent asset updates from two clients → one succeeds, one gets
  MVCC conflict (409).
- Concurrent token transfers do not cause double-spend.
- API handles MVCC conflict gracefully (returns 409, instructs retry).

**Approach:** Parallel requests or concurrent Go goroutines in
integration test setup.

---

## 9. Evidence Integrity Tests

**What to test:**
- Uploaded file produces consistent SHA-256 across multiple calls.
- Modified file produces different SHA-256 (tamper detection).
- Missing MinIO object detected as integrity failure.
- On-chain hash mismatch produces a clear error response.

---

## 10. End-to-End (E2E) Tests

E2E tests simulate a real user interacting with the full system
(browser → API → Fabric → CouchDB / MinIO).

**Framework:** [Playwright](https://playwright.dev/) or
[Cypress](https://www.cypress.io/).

**Key user flows to test:**
1. Register and enroll a new user.
2. Create an asset, view it on the dashboard.
3. Upload evidence, verify integrity on-chain.
4. Submit a claim, have it approved, view result.
5. Tokenize an asset, transfer a holding.
6. View QR Asset Passport.
7. View audit history.

**Location:** `tests/e2e/`

---

## 11. Test Environments

| Environment | Purpose | Fabric | MinIO |
|---|---|---|---|
| `local-dev` | Developer machine | Local Docker Compose | Local Docker Compose |
| `ci` | Automated CI pipeline | Docker-in-Docker Fabric | Mocked or local |
| `staging` | Pre-production validation | Multi-org Fabric | Dedicated MinIO |

> CI configuration will be added in Stage 6.

---

## 12. Coverage Targets (Indicative)

| Layer | Target |
|---|---|
| Chaincode (Go) | ≥ 80% statement coverage |
| Backend (TypeScript) | ≥ 75% statement coverage |
| Frontend (TypeScript) | ≥ 70% component coverage |

---

## 13. Test Data Management

- Test assets, claims, and tokens use clearly identified test prefixes
  (e.g., `TEST-ASSET-001`).
- Test ledger state is reset between integration test runs.
- No production data is used in tests.

---

## 14. Negative Test Case Catalog

The following negative tests MUST pass before each milestone's Definition of Done is accepted.

### Authorization Negative Tests (All roles, all protected endpoints)

| Test | Input | Expected Result | Pass Criteria |
|---|---|---|---|
| AUDITOR attempts `POST /assets` | Valid asset body | `403 UNAUTHORIZED` | Chaincode also rejects (not just API) |
| INVESTOR_BUYER approves own claim | Self-approval request | `403 CLAIM_SELF_APPROVAL_DENIED` | Chaincode returns error before state write |
| INVESTOR_BUYER approves another user's claim | Approval for claim not own | `403 UNAUTHORIZED` | Only `VERIFIER` can approve |
| Any non-ADMIN registers a user | POST `/admin/users/register` | `403 UNAUTHORIZED` | Identity registration not created |
| COMPLIANCE_OFFICER creates a template | POST `/asset-templates` | `403 UNAUTHORIZED` | Only `ADMINISTRATOR` can create templates |
| AUDITOR downloads evidence file | GET `/evidence/:id/download` | `403 UNAUTHORIZED` | No presigned URL generated |
| INVESTOR_BUYER reads another's private claim data | GET `/claims/:id/private` | `403 UNAUTHORIZED` | PDC access denied at chaincode level |

### Business Invariant Negative Tests

| Test | Input | Expected Result | Pass Criteria |
|---|---|---|---|
| Tokenize already-tokenized asset | `POST /assets/:id/tokenize` (2nd time) | `409 TOKEN_ALREADY_ISSUED` | `asset.tokenized` remains true, no 2nd token |
| Transfer with insufficient balance | Transfer amount > holding | `409 INSUFFICIENT_BALANCE` | Holding unchanged, TransferDecision.decision=REJECTED |
| Pledge exceeding unrestricted balance | Pledge > unrestricted amount | `409 INSUFFICIENT_UNRESTRICTED_BALANCE` | No restriction written, counter unchanged |
| Double-pledge concurrent | 2 concurrent pledges totaling > balance | Exactly 1 succeeds, 1 returns `409` | `activePledgeCounter` consistent with restrictions |
| Upload evidence to DECOMMISSIONED asset | POST evidence to decommissioned asset | `409 ASSET_DECOMMISSIONED` | No evidence written, no MinIO upload |
| Submit claim on FROZEN asset | POST `/claims` with frozen assetId | `409 ASSET_FROZEN` | No claim written |
| Decommission tokenized asset | DELETE `/assets/:id` with active token | `409 RESTRICTION_ACTIVE` | Asset status unchanged |
| Create asset with missing required template attribute | POST `/assets` missing required attr | `400 TEMPLATE_ATTRIBUTE_MISSING` | No asset written on-chain |
| Record stale valuation for tokenization | `TokenizeAsset` with expired valuation | `409 VALUATION_STALE` | No token written |

### Concurrency Tests (Pass Criteria)

| Test | Concurrency Setup | Pass Criteria |
|---|---|---|
| Concurrent `CreateAsset` same ID | 2 parallel POST requests, same `assetId` | Exactly 1 returns `201`, 1 returns `409 ASSET_ALREADY_EXISTS`. 1 asset in ledger. |
| Concurrent `ExecuteTransfer` same sender | 2 parallel transfers from same holder | At most 1 succeeds (if balance allows one). If insufficient for both, exactly 1 `201` and 1 `409`. Holding balance never negative. |
| Concurrent `PledgeToken` same holder | 2 pledges that together exceed balance | Exactly 1 succeeds, 1 returns `409 INSUFFICIENT_UNRESTRICTED_BALANCE`. `activePledgeCounter` accurate. |
| Concurrent `ApproveClaim` same claim | 2 approvers, claim requires 1 approval | Both may succeed but only one changes status to APPROVED first. Second approval attempt on already-APPROVED claim returns `409 CLAIM_INVALID_TRANSITION`. |

### Evidence Integrity Tests (Pass Criteria)

| Test | Setup | Pass Criteria |
|---|---|---|
| Tampered MinIO object | Upload file, modify bytes in MinIO, call verify | Verify returns `422 EVIDENCE_INTEGRITY_FAILED`. SHA-256 mismatch detected. |
| Hash collision (theoretical) | Upload two different files with same SHA-256 (not feasible in practice) | Test documents: SHA-256 collision resistance is relied upon |
| Missing MinIO object | Delete MinIO object, call verify | Returns structured error indicating MinIO object missing |
| Re-upload to same key | Overwrite MinIO object with different content | On-chain hash detects mismatch on next verify |

### Security-Specific Tests

| Test | Setup | Pass Criteria |
|---|---|---|
| Secret scan | Run pre-commit hook on committed code | Zero matches for patterns: `password=`, `secret=`, `key=`, PEM headers, JWT secrets |
| MIME type rejection | Upload .exe file disguised as PDF | Backend rejects with `400 VALIDATION_FAILED` before MinIO upload |
| File size limit | Upload 200 MB file | Backend rejects with `400 VALIDATION_FAILED` |
| Expired presigned URL | Use presigned URL after expiry (15 min) | MinIO returns 403; backend returns `403` to client |
| JWT tamper | Modify JWT role claim, re-sign with wrong key | Backend rejects token; no chaincode call made |
| CouchDB not directly accessible | Attempt HTTP request to port 5984 from outside Docker network | Connection refused or no route |

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*


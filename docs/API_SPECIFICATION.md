# TESSERA — API Specification

> **Status:** Phase 2 — Architecture Validation. Refined and extended.  
> Updated: 2026-10-10.  
> No endpoints have been implemented yet.  
> Endpoint paths, request schemas, and response formats are authoritative proposals
> that will be implemented milestone-by-milestone.

---

## General Conventions

### Base URL
```
http://localhost:3000/api/v1
```

### Content Type
All requests and responses use `application/json` unless uploading
binary evidence files (`multipart/form-data`).

### Authentication
All endpoints (except health check) require a valid authentication
token. The token mechanism (e.g., JWT signed by the backend after
Fabric CA enrollment verification) will be defined in Stage 1.

```
Authorization: Bearer <token>
```

### Request Validation
- All incoming request bodies are validated against a schema before
  processing.
- Invalid requests return `400 Bad Request` with a structured error.
- Missing or unauthorized identity returns `401` or `403`.

### Response Envelope (Success)
```json
{
  "success": true,
  "data": { ... },
  "transactionId": "abc123...",
  "blockNumber": 42
}
```

> `transactionId` and `blockNumber` are included only for write
> operations after Fabric commit confirmation.

### Response Envelope (Error)
```json
{
  "success": false,
  "error": {
    "code": "ASSET_NOT_FOUND",
    "message": "Asset with id 'xyz' does not exist."
  }
}
```

### Standard HTTP Status Codes
| Code | Meaning |
|---|---|
| `200` | Success (read) |
| `201` | Created (write committed to Fabric) |
| `400` | Bad request / validation failure |
| `401` | Unauthenticated |
| `403` | Unauthorized (policy, MSP, or role check failed) |
| `404` | Resource not found |
| `409` | Conflict (e.g., asset already exists, MVCC conflict — retry) |
| `422` | Unprocessable entity (e.g., SHA-256 integrity failure) |
| `429` | Rate limit exceeded (auth endpoints) |
| `500` | Internal server error |
| `502` | External adapter error |
| `503` | Fabric network unavailable |

### Idempotency Note
Write operations are NOT idempotent by default. Clients that retry on network errors must handle `409 ASSET_ALREADY_EXISTS` or similar as a signal that the first attempt succeeded.


---

## Endpoint Groups

### Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | API and Fabric connectivity health check |

---

### Identity / Authentication
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/enroll` | Enroll a user identity with Fabric CA |
| `POST` | `/auth/register` | Register a new user (admin only) |
| `GET` | `/auth/me` | Return caller's identity information |

---

### Assets
| Method | Path | Description |
|---|---|---|
| `POST` | `/assets` | Create a new asset (on-chain) |
| `GET` | `/assets` | List/query assets (CouchDB rich query) |
| `GET` | `/assets/:assetId` | Get a single asset by ID |
| `PUT` | `/assets/:assetId` | Update asset attributes |
| `DELETE` | `/assets/:assetId` | Decommission an asset |
| `GET` | `/assets/:assetId/history` | Get ledger history for an asset |

#### Create Asset — Request Body (indicative)
```json
{
  "templateId": "string",
  "description": "string",
  "attributes": {
    "key": "value"
  }
}
```

---

### Asset Templates
| Method | Path | Description |
|---|---|---|
| `POST` | `/asset-templates` | Create a new asset template |
| `GET` | `/asset-templates` | List all templates |
| `GET` | `/asset-templates/:templateId` | Get a single template |

---

### Evidence
| Method | Path | Description |
|---|---|---|
| `POST` | `/assets/:assetId/evidence` | Upload evidence file (multipart), compute SHA-256, store in MinIO, record hash on-chain |
| `GET` | `/assets/:assetId/evidence` | List evidence metadata for an asset |
| `GET` | `/evidence/:evidenceId` | Get evidence metadata by ID |
| `GET` | `/evidence/:evidenceId/verify` | Re-verify evidence integrity (re-hash and compare) |
| `GET` | `/evidence/:evidenceId/download` | Presigned download URL (time-limited) |

---

### Claims
| Method | Path | Description |
|---|---|---|
| `POST` | `/claims` | Submit a new claim |
| `GET` | `/claims` | List claims (filtered by asset, status, claimant) |
| `GET` | `/claims/:claimId` | Get a single claim |
| `POST` | `/claims/:claimId/approve` | Approve a claim |
| `POST` | `/claims/:claimId/reject` | Reject a claim |
| `POST` | `/claims/:claimId/withdraw` | Withdraw a claim (claimant only) |

---

### Tokens
| Method | Path | Description |
|---|---|---|
| `POST` | `/assets/:assetId/tokenize` | Tokenize an asset (issue token) |
| `GET` | `/tokens/:tokenId` | Get token details |
| `GET` | `/tokens/:tokenId/holdings` | List all holdings for a token |
| `GET` | `/holdings/:holdingId` | Get a specific holding |

---

### Transfers
| Method | Path | Description |
|---|---|---|
| `POST` | `/transfers` | Initiate a token transfer |
| `GET` | `/transfers` | List transfer decisions |
| `GET` | `/transfers/:decisionId` | Get a specific transfer decision |

---

### Restrictions
| Method | Path | Description |
|---|---|---|
| `POST` | `/restrictions` | Create a pledge or restriction |
| `GET` | `/restrictions/:restrictionId` | Get a restriction |
| `POST` | `/restrictions/:restrictionId/release` | Release a restriction |

---

### External Verification
| Method | Path | Description |
|---|---|---|
| `POST` | `/verify/government/:assetId` | Trigger government registry verification |
| `POST` | `/verify/valuation/:assetId` | Trigger valuation service check |
| `POST` | `/verify/insurance/:assetId` | Trigger insurance status check |
| `POST` | `/verify/inspection/:assetId` | Trigger inspection verification |
| `GET` | `/verify/:verificationId` | Get a verification result |

---

### Audit
| Method | Path | Description |
|---|---|---|
| `GET` | `/audit/assets/:assetId` | Full ledger history for an asset |
| `GET` | `/audit/transactions/:txId` | Look up a specific Fabric transaction |

---

## Authorization Model

Based on the six TESSERA roles, enforced at both API middleware and chaincode ABAC levels:

| Role | Key Permissions |
|---|---|
| `ADMINISTRATOR` | Full access: register users, create templates, all operations |
| `ISSUER_REGISTRAR` | Create/update assets, upload evidence, initiate tokenization |
| `VERIFIER` | Approve/reject claims, trigger external verification, record valuations |
| `INVESTOR_BUYER` | Submit and withdraw own claims, simulate transfers, execute own transfers |
| `COMPLIANCE_OFFICER` | Create policies, freeze/pledge tokens, view private valuation data |
| `AUDITOR` | Read-only access to all public data and authorized private data; cannot write |

> Roles are stored as X.509 certificate attributes set at Fabric CA enrollment time.
> Authorization is enforced at **both** the API layer (JWT + role middleware) and the chaincode layer (ABAC via `ctx.GetClientIdentity()`).
> API-layer role checks are a defense-in-depth layer; chaincode is the authoritative enforcement point.

### Endpoint-to-Role Matrix (Key Endpoints)

| Endpoint | ADMIN | ISSUER_REG | VERIFIER | INVESTOR | COMPLIANCE | AUDITOR |
|---|---|---|---|---|---|---|
| `POST /assets` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `GET /assets/:id` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST /assets/:id/evidence` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `POST /claims` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| `POST /claims/:id/approve` | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `POST /assets/:id/tokenize` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `POST /transfers` | ✓ | ✗ | ✗ | ✓* | ✓ | ✗ |
| `POST /restrictions` | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| `POST /policies` | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `GET /audit/*` | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `POST /auth/register` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

*INVESTOR_BUYER can only transfer their own holdings.

---

## Additional Endpoint Groups

### Valuations
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/valuations` | `VERIFIER`, `ADMIN` | Record a new asset valuation |
| `GET` | `/valuations/:valuationId` | All roles | Get valuation summary |
| `GET` | `/assets/:assetId/valuation/current` | All roles | Get current valuation for asset |
| `GET` | `/assets/:assetId/valuation/private` | `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMIN` | Get private valuation amount |

### Policies
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/policies` | `COMPLIANCE_OFFICER`, `ADMIN` | Create a new policy |
| `GET` | `/policies` | All roles | List all policies |
| `GET` | `/policies/:policyId` | All roles | Get policy details |
| `POST` | `/policies/:policyId/versions` | `COMPLIANCE_OFFICER`, `ADMIN` | Create a new policy version |
| `PUT` | `/policies/:policyId/versions/:vId/activate` | `ADMIN` | Set active policy version |

### Asset Passport
| Method | Path | Required Role | Description |
|---|---|---|---|
| `GET` | `/assets/:assetId/passport` | All roles | Get complete Asset Passport (JSON + QR code) |

### Transfers (Extended)
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/transfers/simulate` | `INVESTOR_BUYER`, `COMPLIANCE_OFFICER`, `ADMIN` | Read-only transfer simulation (no state change) |
| `POST` | `/transfers/execute` | `INVESTOR_BUYER` (own), `COMPLIANCE_OFFICER`, `ADMIN` | Execute transfer with execution-time revalidation |
| `GET` | `/transfers` | All roles | List transfer decisions |
| `GET` | `/transfers/:decisionId` | All roles | Get transfer decision |

### Administration
| Method | Path | Required Role | Description |
|---|---|---|---|
| `POST` | `/admin/users/register` | `ADMIN` | Register new Fabric identity |
| `GET` | `/admin/users` | `ADMIN` | List registered users |
| `POST` | `/admin/users/:id/revoke` | `ADMIN` | Revoke a user identity |
| `POST` | `/asset-templates` | `ADMIN` | Create asset template |
| `PUT` | `/asset-templates/:templateId` | `ADMIN` | Update template |


---

## Error Code Reference

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Request schema validation error |
| `ASSET_NOT_FOUND` | 404 | Asset ID does not exist |
| `ASSET_ALREADY_EXISTS` | 409 | Duplicate asset creation attempt |
| `ASSET_FROZEN` | 409 | Operation rejected; asset is frozen |
| `ASSET_DECOMMISSIONED` | 409 | Operation rejected; asset is decommissioned |
| `TEMPLATE_NOT_FOUND` | 404 | Template ID does not exist |
| `TEMPLATE_ATTRIBUTE_MISSING` | 400 | Required template attribute absent |
| `TEMPLATE_ATTRIBUTE_TYPE_MISMATCH` | 400 | Attribute value is wrong type |
| `EVIDENCE_INTEGRITY_FAILED` | 422 | SHA-256 mismatch on verification |
| `CLAIM_NOT_FOUND` | 404 | Claim ID does not exist |
| `CLAIM_SELF_APPROVAL_DENIED` | 403 | Approver is the same as claimant |
| `CLAIM_INVALID_TRANSITION` | 409 | Invalid claim status transition |
| `TOKEN_NOT_FOUND` | 404 | Token ID does not exist |
| `TOKEN_ALREADY_ISSUED` | 409 | Asset already has an active token |
| `INSUFFICIENT_BALANCE` | 409 | Transfer amount exceeds holding balance |
| `INSUFFICIENT_UNRESTRICTED_BALANCE` | 409 | Transfer or pledge blocked by active restriction |
| `TRANSFER_POLICY_DENIED` | 403 | Transfer blocked by policy rule |
| `RESTRICTION_ACTIVE` | 409 | Transfer blocked by active restriction |
| `VALUATION_STALE` | 409 | Valuation has expired; cannot tokenize |
| `FABRIC_COMMIT_FAILED` | 500 | Transaction endorsed but commit failed |
| `FABRIC_MVCC_CONFLICT` | 409 | MVCC read conflict — client should retry |
| `EXTERNAL_ADAPTER_ERROR` | 502 | External service call failed |
| `EXTERNAL_ADAPTER_TIMEOUT` | 502 | External service call timed out |
| `UNAUTHORIZED` | 403 | Identity lacks required role or permission |
| `UNAUTHENTICATED` | 401 | Missing or invalid auth token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests on auth endpoint |

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*


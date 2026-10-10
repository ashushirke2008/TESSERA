# TESSERA — Data Model

> **Status:** Phase 2 — Architecture Validation. Refined and extended.  
> Updated: 2026-10-10.  
> No chaincode or application code has been implemented yet.

---

## Overview

TESSERA data is partitioned across three storage layers:

| Layer | Store | Contents |
|---|---|---|
| **On-chain (public)** | Fabric ledger / CouchDB world state | Asset state, evidence metadata hashes, token holdings, transfer decisions, verification results |
| **On-chain (private)** | Fabric Private Data Collections | Sensitive asset valuation, private claim details |
| **Off-chain** | MinIO object store | Evidence files (documents, images, reports) |

---

## 1. Asset

**Storage:** On-chain (public ledger — Fabric world state via CouchDB)  
**Composite Key:** `"asset" + assetId`  
**Privacy:** Public (sensitive valuation in PDC)

| Field | Type | Description |
|---|---|---|
| `assetId` | string | UUID v4; unique per channel |
| `assetType` | string | Derived from template |
| `owner` | string | Current owner MSP + identity DN |
| `status` | enum | `DRAFT`, `ACTIVE`, `FROZEN`, `DECOMMISSIONED` |
| `description` | string | Human-readable asset description (max 1000 chars) |
| `attributes` | map[string]string | Dynamic key-value attributes per template |
| `createdAt` | string (RFC3339) | Block timestamp of creation (set by chaincode from `ctx.GetTxTimestamp()`) |
| `updatedAt` | string (RFC3339) | Block timestamp of last update |
| `createdBy` | string | Enrolling identity (certificate DN) |
| `templateId` | string | Reference to Asset Template (required) |
| `tokenized` | bool | Whether a token has been issued for this asset |

**Lifecycle States:**
```
DRAFT → ACTIVE → FROZEN → ACTIVE (unfreeze)
                         → DECOMMISSIONED (terminal)
ACTIVE → DECOMMISSIONED (terminal)
```

**Validation Rules:**
- `assetId`: UUID v4 format, 1–128 chars, unique (enforced via MVCC check-then-write).
- `templateId`: must reference existing template on-chain.
- All template-required `attributes` must be present and pass type validation.
- `status` transitions: only valid transitions above are permitted.
- `createdAt` / `updatedAt`: set by chaincode from `ctx.GetTxTimestamp()`; never accepted from client input.

**Authorization Rules:**
- `CreateAsset`: `ISSUER_REGISTRAR` or `ADMINISTRATOR` only.
- `UpdateAsset`: owner org or `ADMINISTRATOR`. Cannot update `assetId`, `createdAt`, `createdBy`.
- `FreezeAsset` / `UnfreezeAsset`: `COMPLIANCE_OFFICER` or `ADMINISTRATOR`.
- `DecommissionAsset`: `ADMINISTRATOR` only. Asset must not have active token.
- `ReadAsset`: all authenticated roles.

**Invariants:**
- Once `tokenized = true`, asset cannot be decommissioned until token is BURNED.
- A FROZEN asset cannot have new evidence uploaded or new claims submitted.
- `assetId` is immutable after creation.

**Required Chaincode Operations:**
`CreateAsset`, `ReadAsset`, `UpdateAsset`, `FreezeAsset`, `UnfreezeAsset`, `DecommissionAsset`, `AssetExists`, `QueryAssetsByOwner`, `QueryAssetsByStatus`, `QueryAssetsByTemplate`, `GetAssetHistory`

**Fabric Transaction Model Impacts:**
- `CreateAsset` performs a read (`GetState`) to check existence, then writes (`PutState`). Both the read-key and write-key are in the MVCC read set. Concurrent creates for the same key will result in exactly one MVCC conflict at commit time.
- Rich queries (`QueryAssetsByOwner`) use CouchDB Mango queries and do NOT produce MVCC phantom-read protection. Do not rely on rich query results for enforcing business invariants within the same transaction.
- `GetAssetHistory` uses `GetHistoryForKey` — read-only, no state locks.

**Private fields** (Private Data Collection `assetPrivateDetails`; authorized: owning org + `AUDITOR` org):

| Field | Type | Description |
|---|---|---|
| `valuationAmount` | string (decimal) | Confidential valuation (stored as string to avoid float precision issues) |
| `valuationCurrency` | string | ISO 4217 currency code |
| `valuationDate` | string (RFC3339) | Date of valuation |
| `valuationExpiry` | string (RFC3339) | Date after which valuation is considered stale |


---

## 2. Asset Template

**Storage:** On-chain (public ledger)  
**Composite Key:** `"template" + templateId`  
**Privacy:** Public

Defines the schema for a category of assets. Three built-in templates: `LAND`, `VEHICLE`, `GRAIN`.

| Field | Type | Description |
|---|---|---|
| `templateId` | string | Unique identifier (e.g., `LAND`, `VEHICLE`, `GRAIN` or UUID) |
| `name` | string | Human-readable template name |
| `version` | string | Semantic version (e.g., `1.0.0`) |
| `attributeSchema` | []AttributeDefinition | Required and optional attribute definitions |
| `createdAt` | string (RFC3339) | Creation timestamp |
| `createdBy` | string | Administrator identity |
| `status` | enum | `ACTIVE`, `DEPRECATED` |

**AttributeDefinition:**

| Field | Type | Description |
|---|---|---|
| `key` | string | Attribute key name (alphanumeric + underscore only) |
| `type` | enum | `STRING`, `NUMBER`, `DATE`, `BOOLEAN` |
| `required` | bool | Whether mandatory for asset creation |
| `description` | string | Human-readable description |
| `maxLength` | int | Max length for STRING type (optional) |
| `minValue` | string | Min value for NUMBER type (optional) |
| `maxValue` | string | Max value for NUMBER type (optional) |

**Validation Rules:**
- `templateId` must be unique; case-insensitive uniqueness enforced.
- At least one `AttributeDefinition` required.
- Attribute `key` names must be unique within a template.
- Built-in templates (LAND, VEHICLE, GRAIN) may not be deleted; may be deprecated.

**Authorization Rules:**
- `CreateTemplate`: `ADMINISTRATOR` only.
- `UpdateTemplate`: `ADMINISTRATOR` only. Cannot change `templateId`.
- `DeprecateTemplate`: `ADMINISTRATOR` only. Assets on deprecated template remain valid.
- `ReadTemplate` / `ListTemplates`: all authenticated roles.

**Required Chaincode Operations:**
`CreateTemplate`, `ReadTemplate`, `UpdateTemplate`, `DeprecateTemplate`, `ListTemplates`

**Built-in LAND Template Required Attributes:**
`parcel_id` (STRING), `location` (STRING), `area_sqm` (NUMBER), `land_use` (STRING), `registry_reference` (STRING)

**Built-in VEHICLE Template Required Attributes:**
`vin` (STRING), `make` (STRING), `model` (STRING), `year` (NUMBER), `registration_number` (STRING)

**Built-in GRAIN Template Required Attributes:**
`commodity_type` (STRING), `quantity_tonnes` (NUMBER), `warehouse_id` (STRING), `harvest_date` (DATE), `grade` (STRING)


---

## 3. Evidence Metadata

**Storage:** On-chain (public ledger) — hash and reference only.  
**Composite Key:** `"evidence" + evidenceId`  
**Actual file:** Off-chain in MinIO (bucket: `tessera-evidence`, key: `{assetId}/{evidenceId}`)  
**Privacy:** Public metadata; file access restricted to authorized roles.

| Field | Type | Description |
|---|---|---|
| `evidenceId` | string | UUID v4; unique per channel |
| `assetId` | string | Associated asset (must exist, must not be DECOMMISSIONED) |
| `evidenceType` | enum | `DOCUMENT`, `IMAGE`, `INSPECTION_REPORT`, `VALUATION_REPORT`, `CERTIFICATE`, `OTHER` |
| `sha256Hash` | string | SHA-256 hex-encoded hash of the evidence file |
| `minioObjectKey` | string | MinIO object key (`{assetId}/{evidenceId}`) |
| `uploadedBy` | string | Uploader identity (certificate DN) |
| `uploadedAt` | string (RFC3339) | Upload timestamp (from `ctx.GetTxTimestamp()`) |
| `description` | string | Brief description (max 500 chars) |
| `mimeType` | string | MIME type of the original file |
| `fileSizeBytes` | int64 | File size in bytes |
| `status` | enum | `ACTIVE`, `REVOKED` |

**Validation Rules:**
- `assetId`: must exist on-chain and be in ACTIVE or FROZEN status.
- `sha256Hash`: must be 64-char hex string.
- `mimeType`: allowlist of permitted types (PDF, PNG, JPEG, CSV, XML).
- `fileSizeBytes`: max 100 MB (configurable via policy).
- Evidence cannot be uploaded to a DECOMMISSIONED asset.

**Authorization Rules:**
- `RecordEvidence`: `ISSUER_REGISTRAR` or `ADMINISTRATOR`.
- `RevokeEvidence`: `ADMINISTRATOR` only.
- `GetEvidenceMetadata`: all authenticated roles.
- Evidence file download (MinIO presigned URL): `ISSUER_REGISTRAR`, `VERIFIER`, `AUDITOR`, `ADMINISTRATOR`.

**Invariants:**
- `sha256Hash` is immutable after recording.
- Evidence records are append-only; revocation changes `status` but does not delete.

> The evidence file itself is stored in MinIO. The on-chain record
> contains only the hash and reference. To verify integrity, re-compute
> the SHA-256 hash of the retrieved file and compare against on-chain.
> A matching hash confirms the file has not been modified since upload.
> It does **not** prove real-world authenticity of the document contents.

**Required Chaincode Operations:**
`RecordEvidence`, `GetEvidenceMetadata`, `ListEvidenceByAsset`, `RevokeEvidence`

**Fabric Transaction Model Impact:**
- `RecordEvidence` checks `AssetExists` (read) then writes evidence metadata. Both in same transaction's MVCC read/write set.
- Backend must complete MinIO upload and receive `etag` confirmation **before** submitting `RecordEvidence` chaincode transaction. If chaincode fails, MinIO object may be orphaned — backend must implement compensating cleanup.


---

## 4. Claim

**Storage:** On-chain (public + private)  
**Composite Key:** `"claim" + claimId`  
**Privacy:** Public fields + private PDC fields.

| Field | Type | Description |
|---|---|---|
| `claimId` | string | UUID v4 |
| `assetId` | string | Asset under claim (must exist) |
| `claimType` | enum | `OWNERSHIP`, `LIEN`, `DISPUTE`, `INSURANCE`, `OTHER` |
| `claimantId` | string | Identity DN of the claimant |
| `status` | enum | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `requiredApprovals` | int | Number of distinct approvers required (M-of-N, default 1) |
| `approvalCount` | int | Current count of recorded approvals |
| `approvals` | []ApprovalRef | List of {approvalId, approverId} |
| `submittedAt` | string (RFC3339) | Submission timestamp |
| `resolvedAt` | string (RFC3339) | Resolution timestamp (null until resolved) |
| `evidenceIds` | []string | References to Evidence Metadata records |
| `reasonCode` | string | Reason code for final decision |

**Lifecycle States:**
```
PENDING → UNDER_REVIEW → APPROVED (terminal)
                        → REJECTED (terminal)
PENDING → WITHDRAWN (terminal, claimant only)
UNDER_REVIEW → WITHDRAWN (terminal, claimant only, if no approvals yet)
```

**Validation Rules:**
- `assetId`: must exist and be ACTIVE.
- `claimantId`: derived from `ctx.GetClientIdentity()`, not from client input.
- `requiredApprovals`: ≥ 1.
- `reasonCode`: required when status moves to APPROVED or REJECTED.
- Self-approval: `approverId` must not equal `claimantId`.

**Authorization Rules:**
- `SubmitClaim`: `INVESTOR_BUYER` or `ISSUER_REGISTRAR` or `ADMINISTRATOR`.
- `ReviewClaim` (move to UNDER_REVIEW): `VERIFIER` or `ADMINISTRATOR`.
- `ApproveClaim` / `RejectClaim`: `VERIFIER` or `ADMINISTRATOR`. Must not be same identity as claimant.
- `WithdrawClaim`: claimant identity only, and only if no approvals recorded yet.
- `ReadClaim` (public fields): all authenticated roles.

**Invariants:**
- A claim cannot be approved or rejected by the same identity that submitted it.
- `approvalCount` must equal `len(approvals)` at all times.
- Status transitions are irreversible once terminal (APPROVED, REJECTED, WITHDRAWN).

**Required Chaincode Operations:**
`SubmitClaim`, `ReviewClaim`, `ApproveClaim`, `RejectClaim`, `WithdrawClaim`, `GetClaim`, `ListClaimsByAsset`, `ListClaimsByStatus`

**Fabric Transaction Model Impact:**
- `ApproveClaim` reads current claim state, verifies self-approval rule, increments `approvalCount`, writes updated claim and new `Approval` record. All in one transaction — MVCC-safe.
- Concurrent approvals by two reviewers on the same claim: one will succeed, one will get MVCC conflict. Backend must handle `409` and the reviewer can retry (their approval will be the second one).

**Private fields** (Collection `claimPrivateData`; authorized: submitter org + approver org + `AUDITOR` org):

| Field | Type | Description |
|---|---|---|
| `privateNotes` | string | Confidential notes from reviewer (max 2000 chars) |
| `internalDocumentKey` | string | MinIO key of confidential supporting document |
| `internalDocumentHash` | string | SHA-256 of the confidential document |


---

## 5. Approval

**Storage:** On-chain (public ledger)  
**Composite Key:** `"approval" + approvalId`  
**Privacy:** Public

Records each approval or rejection action in a workflow. **Immutable after creation.**

| Field | Type | Description |
|---|---|---|
| `approvalId` | string | UUID v4 |
| `claimId` | string | Associated claim |
| `approverId` | string | Identity DN of approver (from `ctx.GetClientIdentity()`) |
| `approverMSP` | string | MSP ID of approver |
| `decision` | enum | `APPROVED`, `REJECTED`, `DEFERRED` |
| `reason` | string | Stated reason (required, min 10 chars) |
| `reasonCode` | string | Structured reason code from approved list |
| `timestamp` | string (RFC3339) | Decision timestamp (from `ctx.GetTxTimestamp()`) |
| `transactionId` | string | Fabric transaction ID |

**Validation Rules:**
- `reason`: non-empty, minimum 10 characters.
- `reasonCode`: must be from the approved reason code list.
- `approverId` / `approverMSP`: derived from chaincode context, not client-supplied.

**Authorization Rules:**
- Written only by `ApproveClaim` / `RejectClaim` chaincode functions.
- Readable by: claim submitter, any approver, `AUDITOR`, `ADMINISTRATOR`.

**Invariants:**
- Approval records are immutable; no update or delete operations exist.
- `approverId` must differ from the claim's `claimantId`.

**Required Chaincode Operations:**
`GetApproval`, `ListApprovalsByClaim` (read-only; written as side effect of claim operations)


---

## 6. Valuation

**Storage:** On-chain (public ledger) — summary only; detailed figures in PDC.  
**Composite Key:** `"valuation" + valuationId`  
**Privacy:** Public summary; amounts in `assetPrivateDetails` PDC.

| Field | Type | Description |
|---|---|---|
| `valuationId` | string | UUID v4 |
| `assetId` | string | Valued asset (must exist) |
| `valuerId` | string | Identity DN of valuator |
| `valuationDate` | string (RFC3339) | Date of valuation |
| `expiryDate` | string (RFC3339) | Date valuation becomes stale |
| `currency` | string | ISO 4217 code |
| `sourceAdapter` | string | External adapter used |
| `externalReferenceId` | string | ID in external system |
| `evidenceId` | string | Reference to supporting evidence |
| `status` | enum | `CURRENT`, `SUPERSEDED`, `EXPIRED` |

**Validation Rules:**
- `assetId`: must exist.
- `valuationDate`: must not be in the future.
- `expiryDate`: must be after `valuationDate`.
- `currency`: must be valid ISO 4217 code.
- Private valuation amount: stored as decimal string, validated for non-negative value.

**Authorization Rules:**
- `RecordValuation`: `VERIFIER` or `ADMINISTRATOR`.
- `GetValuation` (public summary): all authenticated roles.
- `GetValuationAmount` (private amount from PDC): `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMINISTRATOR`.

**Invariants:**
- When a new valuation is recorded for an asset, the previous valuation status is set to `SUPERSEDED`.
- Only one `CURRENT` valuation per asset at any time.

**Required Chaincode Operations:**
`RecordValuation`, `GetValuation`, `GetCurrentValuationByAsset`, `CheckValuationFreshness`

**Fabric Transaction Model Impact:**
- `RecordValuation` must atomically write the new valuation and update the previous valuation's status to SUPERSEDED in the same transaction.


---

## 7. Token

**Storage:** On-chain (public ledger)  
**Composite Key:** `"token" + tokenId`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `tokenId` | string | UUID v4 |
| `assetId` | string | Underlying physical/digital asset (1:1 relationship) |
| `totalSupply` | int64 | Total number of token units issued (immutable after issuance) |
| `decimals` | int | Decimal precision (0 = whole units only) |
| `symbol` | string | Token symbol (max 10 chars, alphanumeric) |
| `issuedAt` | string (RFC3339) | Issuance timestamp |
| `issuedBy` | string | Issuing authority identity DN |
| `status` | enum | `ACTIVE`, `SUSPENDED`, `BURNED` |

**Lifecycle States:**
```
ACTIVE → SUSPENDED → ACTIVE (unsuspend)
         → BURNED (terminal)
```

**Validation Rules:**
- `assetId`: must reference an ACTIVE asset with a current (non-stale) valuation.
- `asset.tokenized`: must be false before issuance; set to true atomically on issuance.
- `totalSupply`: must be ≥ 1.
- `decimals`: 0–6.
- `symbol`: unique per channel.

**Authorization Rules:**
- `TokenizeAsset`: `ISSUER_REGISTRAR` or `ADMINISTRATOR`.
- `SuspendToken`: `COMPLIANCE_OFFICER` or `ADMINISTRATOR`.
- `RetireToken` (burn): `COMPLIANCE_OFFICER` or `ADMINISTRATOR`. Requires all holdings to be consolidated to issuer.

**Invariants:**
- Exactly one token per asset (enforced by `asset.tokenized` flag).
- `totalSupply` is immutable after issuance.
- `sum(all active holdings) == totalSupply` at all times.

**Required Chaincode Operations:**
`TokenizeAsset`, `GetToken`, `GetTokenByAsset`, `SuspendToken`, `RetireToken`


---

## 8. Token Holding

**Storage:** On-chain (public ledger)  
**Composite Key:** `"holding" + tokenId + holderIdentity`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `holdingId` | string | Composite key string (derived, not UUID) |
| `tokenId` | string | Associated token |
| `holderIdentity` | string | Holder certificate DN |
| `holderMSP` | string | Holder MSP ID |
| `amount` | int64 | Total units held (must be ≥ 0) |
| `unrestrictedAmount` | int64 | Units not subject to any active restriction |
| `acquiredAt` | string (RFC3339) | First acquisition timestamp |
| `lastUpdatedAt` | string (RFC3339) | Last balance change timestamp |

**Validation Rules:**
- `amount` must always be ≥ 0. A holding at 0 is retained (not deleted) for audit purposes.
- `unrestrictedAmount` = `amount` - sum(activeRestrictedAmounts). Calculated lazily and verified in transfer.

**Authorization Rules:**
- Holdings are created/updated only by `TokenizeAsset`, `ExecuteTransfer`, `PledgeToken`, `ReleaseRestriction` chaincode functions.
- `GetHolding` / `GetHoldingsByToken` / `GetHoldingsByHolder`: all authenticated roles.

**Invariants:**
- `sum(all holdings for tokenId) == token.totalSupply` at all times.
- `amount` for any holding is never negative.
- `unrestrictedAmount ≥ 0` at all times.

**Required Chaincode Operations:**
`GetHolding`, `GetHoldingsByToken`, `GetHoldingsByHolder`  
(Holdings are written by: `TokenizeAsset`, `ExecuteTransfer`)

**Fabric Transaction Model Impact:**
- `ExecuteTransfer` reads two holding keys (sender, receiver) and writes both in the same transaction. MVCC ensures atomicity. Two concurrent transfers involving the same sender will conflict on the sender holding key.


---

## 9. Pledge / Restriction

**Storage:** On-chain (public ledger)  
**Composite Key:** `"restriction" + restrictionId`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `restrictionId` | string | UUID v4 |
| `tokenId` | string | Affected token |
| `holderIdentity` | string | Identity whose tokens are restricted |
| `restrictionType` | enum | `PLEDGE`, `LIEN`, `FREEZE`, `LOCK` |
| `amount` | int64 | Restricted unit count |
| `reason` | string | Reason for restriction (required) |
| `reasonCode` | string | Structured reason code |
| `imposedBy` | string | Identity DN of restricting authority |
| `imposedByMSP` | string | MSP ID of restricting authority |
| `imposedAt` | string (RFC3339) | Start timestamp |
| `expiresAt` | string (RFC3339) | Expiry timestamp (null = no expiry) |
| `status` | enum | `ACTIVE`, `RELEASED`, `EXPIRED` |
| `releasedBy` | string | Identity DN that released it (null if not released) |
| `releasedAt` | string (RFC3339) | Release timestamp |

**Lifecycle States:**
```
ACTIVE → RELEASED (by authorized identity)
         → EXPIRED (automatic, when expiresAt is past)
```

**Validation Rules:**
- `amount`: must be ≥ 1.
- `holderIdentity` must have a holding for `tokenId`.
- `amount` must not exceed `holding.unrestrictedAmount`.
- **Double-pledge check (in-chaincode):** Before writing, sum all ACTIVE restrictions for `(tokenId, holderIdentity)`. If `sum + newAmount > holding.amount` → reject with `INSUFFICIENT_UNRESTRICTED_BALANCE`.

**Authorization Rules:**
- `PledgeToken` / `CreateRestriction`: `COMPLIANCE_OFFICER`, `ISSUER_REGISTRAR`, or `ADMINISTRATOR`.
- `ReleaseRestriction`: `COMPLIANCE_OFFICER` or `ADMINISTRATOR`.
- `GetRestriction` / `ListActiveRestrictions`: all authenticated roles.

**Invariants:**
- A holding's effective transferable balance = `amount - sum(ACTIVE restriction amounts)`.
- Double-pledge prevention: no combination of ACTIVE restrictions may exceed the holder's total amount.
- Restriction records are never deleted; only status-transitioned.

**Required Chaincode Operations:**
`PledgeToken`, `CreateRestriction`, `ReleaseRestriction`, `ExpireRestrictions`, `GetRestriction`, `ListActiveRestrictionsByHolder`

**Fabric Transaction Model Impact:**
- Double-pledge prevention requires reading all current ACTIVE restrictions for a holder within the same transaction as the write. CouchDB rich query results are NOT in the MVCC read set — this is a phantom read risk. Use **composite keys** or a separate `activePledgeCounter` key per `(tokenId, holderIdentity)` to make this check MVCC-safe.


---

## 10. Policy / Policy Version

**Storage:** On-chain (public ledger)  
**Composite Keys:** `"policy" + policyId`, `"policyversion" + versionId`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `policyId` | string | UUID v4 |
| `policyType` | enum | `TRANSFER`, `ISSUANCE`, `RESTRICTION` |
| `currentVersionId` | string | Active version reference |
| `name` | string | Human-readable policy name |
| `description` | string | Purpose of this policy |
| `createdBy` | string | Administrator identity DN |
| `createdAt` | string (RFC3339) | Creation timestamp |
| `status` | enum | `ACTIVE`, `ARCHIVED` |

**Policy Version:**

| Field | Type | Description |
|---|---|---|
| `versionId` | string | UUID v4 |
| `policyId` | string | Parent policy |
| `versionNumber` | string | Semantic version (e.g., `1.0.0`) |
| `rules` | []PolicyRule | Encoded policy rules |
| `effectiveFrom` | string (RFC3339) | When this version takes effect |
| `createdAt` | string (RFC3339) | Version creation timestamp |
| `createdBy` | string | Identity DN that created this version |
| `status` | enum | `DRAFT`, `ACTIVE`, `SUPERSEDED` |

**PolicyRule:**

| Field | Type | Description |
|---|---|---|
| `ruleId` | string | Short identifier |
| `field` | string | Field to evaluate (e.g., `amount`, `toIdentityMSP`) |
| `operator` | enum | `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `IN`, `NOT_IN` |
| `value` | string | Comparison value (JSON-serialized) |
| `action` | enum | `ALLOW`, `DENY` |
| `reasonCode` | string | Reason code returned when this rule triggers |

**Validation Rules:**
- Policy versions are immutable once ACTIVE.
- Only one ACTIVE version per policy.
- `effectiveFrom` cannot be in the past when creating a new version.

**Authorization Rules:**
- `CreatePolicy` / `CreatePolicyVersion`: `COMPLIANCE_OFFICER` or `ADMINISTRATOR`.
- `SetActiveVersion`: `ADMINISTRATOR` only.
- `GetPolicy` / `ListPolicies`: all authenticated roles.

**Invariants:**
- Old policy versions are never deleted; they transition to SUPERSEDED.
- Transfer enforcement always uses the version that was ACTIVE at the time of transaction submission.

**Required Chaincode Operations:**
`CreatePolicy`, `GetPolicy`, `ListPolicies`, `CreatePolicyVersion`, `SetActiveVersion`, `GetPolicyVersion`, `EnforceTransferPolicy`


---

## 11. Transfer Decision

**Storage:** On-chain (public ledger)  
**Composite Key:** `"transfer" + decisionId`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `decisionId` | string | UUID v4 |
| `tokenId` | string | Token being transferred |
| `fromIdentity` | string | Sender identity DN |
| `fromMSP` | string | Sender MSP ID |
| `toIdentity` | string | Recipient identity DN |
| `toMSP` | string | Recipient MSP ID |
| `amount` | int64 | Units transferred |
| `decision` | enum | `APPROVED`, `REJECTED`, `SIMULATED` |
| `policyVersionId` | string | Policy version evaluated |
| `restrictionIds` | []string | Active restrictions considered |
| `reasonCodes` | []string | Reason codes from policy evaluation |
| `isSimulation` | bool | True if this is a simulation (no state change) |
| `decidedAt` | string (RFC3339) | Decision timestamp |
| `transactionId` | string | Fabric transaction ID (null for simulations) |

**Validation Rules:**
- `fromIdentity` must have sufficient `unrestrictedAmount` in their holding.
- `amount` must be ≥ 1.
- Active policy version is evaluated before any state change.
- Simulation: `isSimulation=true`, no holding changes, `transactionId` is null.

**Authorization Rules:**
- `SimulateTransfer` (`evaluateTransaction`): `INVESTOR_BUYER`, `ISSUER_REGISTRAR`, `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMINISTRATOR`.
- `ExecuteTransfer` (`submitTransaction`): `INVESTOR_BUYER` (own holdings), `COMPLIANCE_OFFICER`, `ADMINISTRATOR`.

**Invariants:**
- Every `ExecuteTransfer` (approved or rejected) creates a `TransferDecision` record.
- Simulation records exist only as responses (not written on-chain). Transfer decisions are on-chain write records only.
- Execution-time revalidation: policy and restrictions are re-evaluated inside the chaincode transaction at execution time, regardless of prior simulation result.

**Required Chaincode Operations:**
`SimulateTransfer` (evaluate-only), `ExecuteTransfer`, `GetTransferDecision`, `ListTransfersByToken`, `ListTransfersByHolder`

**Fabric Transaction Model Impact:**
- `ExecuteTransfer` is an operation that cannot safely be implemented as a backend read followed by a write. The policy check, restriction check, balance deduction, and balance credit must all occur atomically within the same chaincode transaction.
- Backend-level application locks do NOT guarantee Fabric transaction safety.


---

## 12. External Verification Result

**Storage:** On-chain (public ledger)  
**Composite Key:** `"verification" + verificationId`  
**Privacy:** Public

| Field | Type | Description |
|---|---|---|
| `verificationId` | string | UUID v4 |
| `assetId` | string | Verified asset |
| `adapterType` | enum | `GOVERNMENT_REGISTRY`, `VALUATION`, `INSURANCE`, `INSPECTION` |
| `externalReferenceId` | string | ID in external system |
| `status` | enum | `VERIFIED`, `UNVERIFIED`, `PENDING`, `FAILED` |
| `verifiedAt` | string (RFC3339) | Verification timestamp |
| `expiresAt` | string (RFC3339) | Expiry of verification (null = no expiry) |
| `resultSummary` | string | Human-readable summary (sanitized from external response) |
| `evidenceId` | string | Associated evidence record (if any) |
| `requestedBy` | string | Identity DN that triggered verification |

**Validation Rules:**
- `resultSummary`: sanitized from adapter response; max 2000 chars; no HTML.
- `externalReferenceId`: non-empty.
- Adapter response must be validated before this record is written.

**Authorization Rules:**
- `RecordExternalVerification`: `VERIFIER` or `ADMINISTRATOR` (backend only; result comes from adapter).
- `GetVerificationResult` / `ListVerificationsByAsset`: all authenticated roles.

**Invariants:**
- On-chain state not written until a valid adapter response is confirmed.
- If adapter call fails, no record is written.

**Required Chaincode Operations:**
`RecordExternalVerification`, `GetVerificationResult`, `ListVerificationsByAsset`

---

## 13. Entity-Storage Summary

| Entity | Storage | Chaincode Key Prefix | Privacy | Written By |
|---|---|---|---|---|
| Asset | Fabric ledger (CouchDB) | `asset` | Public | `CreateAsset`, `UpdateAsset` |
| Asset (private) | PDC `assetPrivateDetails` | — | Owning org + Auditor | `RecordValuation` |
| AssetTemplate | Fabric ledger | `template` | Public | `CreateTemplate` |
| EvidenceMetadata | Fabric ledger | `evidence` | Public | `RecordEvidence` |
| Claim (public) | Fabric ledger | `claim` | Public | `SubmitClaim`, `ApproveClaim` |
| Claim (private) | PDC `claimPrivateData` | — | Submitter + Approver orgs + Auditor | `SubmitClaim` |
| Approval | Fabric ledger | `approval` | Public | `ApproveClaim`, `RejectClaim` |
| Valuation (public) | Fabric ledger | `valuation` | Public | `RecordValuation` |
| Token | Fabric ledger | `token` | Public | `TokenizeAsset` |
| TokenHolding | Fabric ledger | `holding` | Public | `TokenizeAsset`, `ExecuteTransfer` |
| Restriction | Fabric ledger | `restriction` | Public | `PledgeToken` |
| Policy | Fabric ledger | `policy` | Public | `CreatePolicy` |
| PolicyVersion | Fabric ledger | `policyversion` | Public | `CreatePolicyVersion` |
| TransferDecision | Fabric ledger | `transfer` | Public | `ExecuteTransfer` |
| ExternalVerification | Fabric ledger | `verification` | Public | `RecordExternalVerification` |
| Evidence files | MinIO | — | Backend-only presigned | Backend upload |

### Operations That Cannot Safely Be Backend-Read-Then-Write

The following operations MUST perform their check AND write within the same chaincode transaction:

| Operation | Why |
|---|---|
| `CreateAsset` (duplicate check) | MVCC needed to prevent concurrent same-key creation |
| `ExecuteTransfer` (balance + policy check) | Balance may change between a backend read and a subsequent submit |
| `PledgeToken` (double-pledge check) | Active restriction sum may change concurrently |
| `ApproveClaim` (self-approval + M-of-N check) | Approval count may change concurrently |
| `TokenizeAsset` (check `asset.tokenized`) | Concurrent tokenization of same asset must be prevented |
| `RecordValuation` (supersede previous) | Previous valuation status update must be atomic with new record |


---

## Data Boundary Summary

```
┌────────────────────────────────────────────────────────────────────┐
│  ON-CHAIN (Public Ledger / CouchDB World State)                    │
│                                                                    │
│  Asset · Asset Template · Evidence Metadata (hash + ref only)     │
│  Claim (public fields) · Approval · Valuation (summary)           │
│  Token · Token Holding · Pledge/Restriction                        │
│  Policy · Policy Version · Transfer Decision                       │
│  External Verification Result                                      │
├────────────────────────────────────────────────────────────────────┤
│  ON-CHAIN (Private Data Collections)                               │
│                                                                    │
│  assetPrivateDetails: valuationAmount, valuationCurrency, date     │
│  claimPrivateData: privateNotes, internalDocumentKey               │
├────────────────────────────────────────────────────────────────────┤
│  OFF-CHAIN (MinIO Object Store)                                    │
│                                                                    │
│  Evidence files: documents, images, reports, certificates          │
│  Referenced by evidenceId and minioObjectKey stored on-chain       │
└────────────────────────────────────────────────────────────────────┘
```

---

*Last updated: Stage 0 — Project Initialization*

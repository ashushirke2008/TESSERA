# TESSERA — Architecture Decisions

> This document records significant, binding architectural and technology
> decisions made for the TESSERA project.  
> Each entry includes context, the decision, rationale, and consequences.

---

## ADR-001: Mandatory Technology Stack

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Context
TESSERA requires a defined, consistent technology stack that all agents
and contributors must follow. Ad-hoc technology choices would fragment
the codebase and introduce incompatibilities.

### Decision
The following technology stack is mandatory and may not be altered
without an explicit ADR superseding this one:

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend API | Node.js, Express, TypeScript |
| Blockchain | Hyperledger Fabric, Go chaincode |
| Identity | Fabric CA, MSP, X.509 certificates |
| World State | CouchDB (Fabric-managed) |
| Confidential Data | Fabric Private Data Collections |
| Evidence Storage | MinIO (off-chain, SHA-256 verified) |
| Infrastructure | Docker, Docker Compose |

### Rationale
- **React + Vite + TypeScript:** Modern, well-supported frontend stack
  with strong type safety and fast builds.
- **Node.js + Express + TypeScript:** Aligns with the Fabric Gateway SDK
  (Node.js), provides familiar REST API development, and TypeScript adds
  safety.
- **Hyperledger Fabric:** Permissioned blockchain suitable for enterprise
  asset registries with identity, MSP-based access, and Private Data
  Collections.
- **Go chaincode:** Officially supported, performant, and idiomatic for
  Fabric chaincode.
- **CouchDB:** Native Fabric world-state option with rich JSON queries
  via Mango.
- **MinIO:** S3-compatible, self-hosted object storage for evidence files.
  Avoids cloud lock-in; SHA-256 verification ensures integrity.

### Consequences
- All contributors must use the specified stack.
- Deviations require a new ADR and explicit approval.

---

## ADR-002: Database Restriction — No General-Purpose Application Database

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Context
A conventional application database (PostgreSQL, MySQL, MongoDB, etc.)
could be introduced to store application state outside the blockchain.
However, this would undermine the integrity guarantees and auditability
that Hyperledger Fabric provides.

### Decision
**No conventional application database may be introduced.**

Prohibited databases:
- PostgreSQL, MySQL, MariaDB, SQLite
- MongoDB, DynamoDB, Cassandra
- Firebase, Firestore, Supabase
- Redis (as a primary data store)
- Any other relational, document, or key-value database serving as an
  application state store.

CouchDB is used exclusively as Fabric's world-state database, managed
by Fabric, and accessed only via chaincode.

MinIO is the sole off-chain storage layer and is used exclusively for
binary evidence files.

### Rationale
- All authoritative state lives on the Fabric ledger, ensuring full
  auditability and tamper-evidence.
- Introducing a separate application database would create a split-brain
  risk where ledger state and application state diverge.
- Fabric's CouchDB already provides rich querying through chaincode.
- Off-chain binary storage (MinIO) is appropriate for large files; their
  integrity is anchored to the ledger via SHA-256 hashes.

### Consequences
- No ORM, no SQL queries, no MongoDB collections in application code.
- If caching is ever needed, it must not be used as a source of truth
  for on-chain state; a separate ADR is required.

---

## ADR-003: Canonical Chaincode Location

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Decision
The canonical, production chaincode implementation must reside at:

```
blockchain/chaincode/asset-contract/
```

No competing chaincode implementation may be created in any other
directory.

### Rationale
- A single canonical location prevents fragmentation.
- CI/CD, deployment scripts, and documentation all reference one path.
- Agents and contributors have a clear, unambiguous location to work in.

### Consequences
- Any experimental chaincode must be clearly marked as non-production
  and must not be deployed to any shared environment without explicit
  approval.

---

## ADR-004: Separation of On-Chain State and Off-Chain Evidence

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Decision
Evidence files (documents, images, reports) are stored **off-chain in
MinIO**. Only evidence metadata (SHA-256 hash, MinIO object key,
upload timestamp, uploader identity, asset reference) is stored
**on-chain** in the Fabric ledger.

Integrity is verified by:
1. Storing the SHA-256 hash of the evidence file on-chain at upload time.
2. Re-computing the SHA-256 hash from the MinIO-retrieved file on
   verification.
3. Comparing the two hashes; any mismatch indicates tampering or
   corruption.

### Rationale
- Storing large binary files on-chain would inflate the ledger and
  degrade Fabric performance.
- The SHA-256 hash on-chain provides cryptographic proof of integrity
  without requiring the file itself to be on-chain.
- MinIO provides scalable, cost-effective object storage with access
  control.

### Consequences
- Evidence verification requires both on-chain metadata retrieval and
  MinIO object retrieval.
- MinIO must be available for evidence operations; its unavailability
  does not invalidate on-chain records, but evidence cannot be
  verified or accessed.

---

## ADR-005: Transaction Commit Confirmation Required Before Success Response

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Decision
The backend API must never return a success response (e.g., `201 Created`)
for a write operation until the Fabric Gateway confirms that the
transaction has been **committed and validated** by the peer.

A transaction that is endorsed but not yet committed must not be
reported as successful.

### Rationale
- Endorsed transactions can still fail at the ordering or validation
  stage (e.g., MVCC conflict, policy violation, ordering timeout).
- Reporting success before commit creates a false impression of
  consistency and can cause client-side data integrity issues.

### Consequences
- All write endpoints have higher latency (waiting for commit).
- MVCC conflicts must be handled gracefully (409 response with
  retry guidance).
- Orderer timeouts must be handled with an appropriate error response.

---

## ADR-006: Secrets Management via Environment Variables

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Decision
All secrets (API keys, MinIO credentials, JWT secrets, Fabric wallet
paths, TLS certificate paths) must be supplied via environment variables.
`.env.example` contains only documented placeholder values.

Private keys, certificates, and `.env` files are excluded from Git via
`.gitignore`.

### Rationale
- Prevents accidental secret commits to the repository.
- Provides a consistent, language-agnostic way to configure secrets.
- Compatible with Docker, Docker Compose, and future CI/CD pipelines.

### Consequences
- Every deployment requires a populated `.env` file (or equivalent
  secrets injection mechanism).
- Agents and contributors must never hardcode credentials.

---

## ADR-007: Staged Incremental Development

**Date:** Stage 0 — Project Initialization  
**Status:** Accepted

### Decision
TESSERA is implemented incrementally through seven defined stages (0–6).
Each stage must be tested and accepted before the next begins.
Features from later stages must not be implemented prematurely.

### Rationale
- Reduces the risk of building on unstable foundations.
- Ensures each component is tested in isolation before integration.
- Makes progress visible and reviewable at each stage boundary.

### Consequences
- Tasks that span multiple stages must be decomposed.
- No "big-bang" implementation is acceptable.

---

## ADR-008: Composite Key Strategy for MVCC-Safe Invariant Enforcement

**Date:** Phase 2 — Architecture Validation  
**Status:** Accepted

### Context
CouchDB Mango (rich) queries executed inside chaincode do NOT add query results to the MVCC read set. This means a chaincode function that queries "how many ACTIVE restrictions exist for holder X?" and then writes based on the result is vulnerable to a phantom read: a concurrent transaction could add a restriction between the query and the write, without causing an MVCC conflict.

This is a critical safety concern for double-pledge prevention and balance checks.

### Decision
For all invariant enforcement in chaincode, use **deterministic composite key reads** (`GetState` on a known composite key) rather than rich queries. Rich queries are permitted for user-facing queries (listing, pagination) but never for constraint enforcement that guards a write.

Specifically:
- Double-pledge prevention: maintain an `activePledgeCounter` key of format `"pledgecounter" + tokenId + holderIdentity`. This key stores the current total of all ACTIVE restricted amounts for that holder. `PledgeToken` reads this key (adding it to the MVCC read set), checks the invariant, and updates it in the same transaction.
- All other constraint reads (asset existence, token existence, claim ownership) use `GetState` on known keys.

### Consequences
- Double-pledge prevention is MVCC-safe even under concurrent requests.
- `activePledgeCounter` must be updated atomically with restriction records.
- Rich query indexes are still required for user-facing API queries.

---

## ADR-009: Execution-Time Transfer Revalidation

**Date:** Phase 2 — Architecture Validation  
**Status:** Accepted

### Decision
`ExecuteTransfer` always re-evaluates all policy rules and active restrictions within the chaincode transaction at execution time, even if a prior `SimulateTransfer` call returned APPROVED.

### Rationale
- Policy versions may change between simulation and execution.
- Active restrictions may be added or modified between simulation and execution.
- A simulation result is advisory only and has no binding force.
- The Fabric transaction model provides the only safe guarantee: everything evaluated within the chaincode transaction has MVCC protection.

### Consequences
- Clients should expect that an `ExecuteTransfer` may fail even after a successful `SimulateTransfer`.
- API documentation must clearly state this to prevent incorrect client assumptions.

---

## ADR-010: MinIO Orphan Object Compensating Pattern

**Date:** Phase 2 — Architecture Validation  
**Status:** Accepted

### Context
The evidence upload workflow requires uploading a file to MinIO (an external system) and then recording metadata on the Fabric ledger (a blockchain transaction). These two operations cannot be wrapped in an atomic distributed transaction.

### Decision
The backend implements a compensating action pattern:
1. Compute SHA-256 hash.
2. Upload to MinIO; receive etag confirmation.
3. Submit `RecordEvidence` chaincode transaction.
4. If step 3 fails: immediately attempt to delete the MinIO object at the same key.
5. If the delete also fails: log the orphan key with full context for manual cleanup.

The compensating delete is idempotent and does not affect on-chain state.

### Consequences
- Orphan objects may persist if the compensating delete fails (e.g., MinIO also unavailable).
- A background reconciliation task (admin-only) can scan for orphaned MinIO objects with no corresponding on-chain record.
- This pattern must be tested: integration test verifies orphan cleanup on chaincode failure.

---

## ADR-011: Six-Role ABAC Identity Design

**Date:** Phase 2 — Architecture Validation  
**Status:** Accepted

### Decision
TESSERA uses six named roles (`ISSUER_REGISTRAR`, `VERIFIER`, `INVESTOR_BUYER`, `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMINISTRATOR`) stored as a custom `role` X.509 certificate attribute set at Fabric CA enrollment time.

Authorization is enforced at two layers:
1. **API middleware**: reads the `role` from the JWT (which the backend issues after verifying the Fabric identity and reading the certificate attribute). Provides fast defense-in-depth.
2. **Chaincode ABAC**: reads `ctx.GetClientIdentity().GetAttributeValue("role")` directly from the X.509 certificate. This is the authoritative enforcement point.

### Rationale
- Chaincode enforcement cannot be bypassed by a compromised API server.
- Two-layer enforcement follows defense-in-depth principle.
- Role is bound to the cryptographic identity (X.509), not to a database record.

### Consequences
- Role changes require re-enrollment (certificate re-issuance). There is no runtime role-change mechanism.
- The `ADMINISTRATOR` role must be assigned with extreme care; it grants full chaincode access.
- All six roles must be documented in Fabric CA enrollment scripts.

---

## ADR-012: activePledgeCounter Pattern for Double-Pledge Prevention

**Date:** Phase 2 — Architecture Validation  
**Status:** Accepted

### Decision
To prevent double-pledging without relying on CouchDB rich queries (which lack phantom-read protection), the chaincode maintains a counter key:

```
Key: "pledgecounter" + "\x00" + tokenId + "\x00" + holderIdentity
Value: JSON { "restrictedAmount": int64 }
```

`PledgeToken` reads this key (placing it in the MVCC read set), checks `restrictedAmount + newAmount <= holding.amount`, and if valid, writes both the new `Restriction` record and the updated `activePledgeCounter` key in the same transaction.

`ReleaseRestriction` decrements the counter. `ExpireRestrictions` decrements the counter for each expired restriction it processes.

### Consequences
- Double-pledge MVCC safety is guaranteed: concurrent pledges that would exceed the balance will cause one MVCC conflict.
- The counter key must be kept consistent with restriction records. This consistency must be verified in integration tests.
- Counter must be initialized to 0 when a token holding is first created.

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*


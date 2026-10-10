# TESSERA — System Architecture

> **Status:** Phase 2 — Architecture Validation. Refined and extended.  
> Updated: 2026-10-10.  
> No components have been implemented yet.

---

## 1. High-Level Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              React Frontend  (Vite · TypeScript)                │
│  Dashboards │ Asset Passport │ Claims │ Tokens │ Audit          │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Node.js / Express API  (TypeScript)                    │
│  Request validation │ Authorization │ Business orchestration    │
│  SHA-256 evidence hashing │ MinIO client │ Adapter calls        │
└─────────────────────────────────────────────────────────────────┘
          │                                   │
          │ Fabric Gateway SDK (gRPC)          │ S3-Compatible API
          ▼                                   ▼
┌──────────────────────┐         ┌───────────────────────────────┐
│  Fabric Gateway Peer │         │  MinIO  (Off-Chain Evidence)  │
│  (Endorsement)       │         │  Object store · SHA-256 verify│
└──────────────────────┘         └───────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Hyperledger Fabric Network                         │
│                                                                 │
│  ┌───────────────┐   ┌───────────────┐   ┌──────────────────┐  │
│  │  Peer Node(s) │   │  Orderer Node │   │   Fabric CA      │  │
│  │  (chaincode)  │   │  (consensus)  │   │   (identity)     │  │
│  └──────┬────────┘   └───────────────┘   └──────────────────┘  │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CouchDB  (World State)                     │   │
│  │  Rich queries │ Composite keys │ Private data implicit  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Descriptions

### 2.1 React Frontend
- **Technology:** React 18+, Vite, TypeScript.
- **Responsibilities:** Rendering dashboards, asset forms, QR Asset
  Passport, claims/approvals UI, token and transfer views, audit history.
- **Communication:** Calls the Node.js API over HTTP/REST. Does not
  communicate directly with Fabric or CouchDB.

### 2.2 Node.js / Express API
- **Technology:** Node.js (LTS), Express, TypeScript.
- **Responsibilities:**
  - Request validation and input sanitization.
  - Authorization (verifying caller identity via Fabric CA enrollment).
  - Submitting and evaluating Fabric transactions via the Fabric Gateway SDK.
  - Computing SHA-256 hashes of uploaded evidence files.
  - Storing evidence objects in MinIO.
  - Orchestrating calls to external verification adapters.
- **Does NOT:** Maintain its own application database.

### 2.3 Fabric Gateway SDK
- **Technology:** `@hyperledger/fabric-gateway` (Node.js SDK).
- **Role:** Manages gRPC connection to a Fabric peer, handles transaction
  proposals, endorsement collection, and commit confirmation.
- **Important:** The backend must always wait for commit confirmation
  before returning a success response to the client.

### 2.4 Hyperledger Fabric Network
- **Peers:** Execute chaincode (smart contracts), maintain the ledger,
  maintain world state in CouchDB.
- **Orderer:** Provides consensus and block ordering.
- **Fabric CA:** Issues X.509 certificates for MSP identities.
- **MSP:** Membership Service Provider — defines which organizations
  and identities can participate.

### 2.5 Go Chaincode (`asset-contract`)
- **Location:** `blockchain/chaincode/asset-contract/` (canonical, only
  production chaincode).
- **Responsibilities:** All on-chain state transitions — asset CRUD,
  evidence metadata, claims, approvals, tokenization, holdings,
  restrictions, transfers, policies, external verification records.
- **Private Data Collections:** Used for sensitive fields (e.g., private
  claim details, valuation data) visible only to authorized MSPs.

### 2.6 CouchDB (World State)
- **Role:** Fabric's world-state database only.
- **Access:** Exclusively through Fabric chaincode (rich JSON queries).
- **NOT** used as a general-purpose application database.

### 2.7 MinIO (Off-Chain Evidence Storage)
- **Role:** S3-compatible object store for evidence files (documents,
  images, reports).
- **Integrity:** SHA-256 hash computed before upload; hash stored
  on-chain. Verification re-computes hash and compares.
- **Access:** Backend API only — no direct client access.

---

## 3. Identity and Access Management

```
Fabric CA
  └── Issues X.509 certificates
        ├── Organization MSPs (Org1MSP, Org2MSP ...)
        │     ├── Admin identities
        │     ├── Peer identities
        │     └── User identities (API callers) — with custom `role` attribute
        └── TLS certificates (peer-to-peer and client-to-peer)
```

- All Fabric transactions are signed with the caller's X.509 certificate.
- Chaincode enforces authorization by inspecting `ctx.GetClientIdentity()`.
- **Role Attribute:** Each enrolled user identity carries a custom `role` certificate attribute set by Fabric CA at registration time. Chaincode reads this via `ctx.GetClientIdentity().GetAttributeValue("role")`.
- **Six defined roles:** `ISSUER_REGISTRAR`, `VERIFIER`, `INVESTOR_BUYER`, `COMPLIANCE_OFFICER`, `AUDITOR`, `ADMINISTRATOR`.
- Wallets on the backend store enrolled identities (encrypted, never committed to Git).
- **Identity Lifecycle:** Registration (admin only) → Enrollment (user obtains cert) → Usage → Revocation (CRL update).

### 3.1 Organization and MSP Structure (Milestone 1)

Initial deployment uses a single organization for simplicity:

```
Org1
  MSP: Org1MSP
  CA:  ca.org1.example.com (Fabric CA 1.5.x)
  Peers: peer0.org1.example.com (port 7051)
  Users:
    - Admin (pre-enrolled)
    - ISSUER_REGISTRAR user
    - VERIFIER user
    - INVESTOR_BUYER user
    - COMPLIANCE_OFFICER user
    - AUDITOR user

Orderer Org
  MSP: OrdererMSP
  Orderer: orderer.example.com (port 7050, Raft single-node)
```

> **Multi-org expansion:** A second organization (Org2MSP) can be added in a later milestone to demonstrate cross-org PDC access and endorsement policies. This requires a channel configuration update and is deferred to post-M1.

### 3.2 Endorsement Policy Design

| Chaincode Function Category | Policy | Rationale |
|---|---|---|
| Asset CRUD, Evidence, Claims | `OR('Org1MSP.peer')` | Single-org initial setup |
| Token issuance, Transfers | `OR('Org1MSP.peer')` | Single-org initial setup |
| Private Data Collection reads | PDC policy (see §4) | Per-collection |

> When Org2 is added: transfer endorsement policy will move to `AND('Org1MSP.peer', 'Org2MSP.peer')` for cross-org validation.

### 3.3 Chaincode Lifecycle (Fabric 2.x)

1. Package chaincode (`peer lifecycle chaincode package`)
2. Install on peer (`peer lifecycle chaincode install`)
3. Approve for org (`peer lifecycle chaincode approveformyorg`)
4. Check commit readiness (`peer lifecycle chaincode checkcommitreadiness`)
5. Commit to channel (`peer lifecycle chaincode commit`)
6. Verify instantiation (`peer lifecycle chaincode querycommitted`)

> This lifecycle is automated by `scripts/network-up.sh`. It must be re-run whenever chaincode is upgraded (version bump required).


---

## 4. Private Data Collections

Sensitive data not intended for all channel participants is stored in
Hyperledger Fabric Private Data Collections (PDC):

| Collection | Purpose | Authorized Organizations | block-to-live |
|---|---|---|---|
| `assetPrivateDetails` | Sensitive asset valuation data (amount, currency, expiry) | Owning org + `AUDITOR` org | 0 (keep forever) |
| `claimPrivateData` | Claim evidence and internal notes | Submitter org + Approver org + `AUDITOR` org | 0 |

Private data hashes are stored on the public ledger; raw data is
shared peer-to-peer only among authorized organizations.

**PDC Technical Requirements:**
- `requiredPeerCount`: 1 (at least 1 authorized peer must receive private data before endorsement)
- `maxPeerCount`: 3
- `memberOnlyRead`: true (only authorized MSPs can issue chaincode reads)
- `memberOnlyWrite`: true (only authorized MSPs can write)
- Collection config in `blockchain/chaincode/asset-contract/collections_config.json`

**Critical:** Private data queries (`GetPrivateData`) use a separate MVCC namespace. Phantom reads in private data collections have the same risks as public state queries. Design chaincode to use deterministic key lookups (not range queries) for private data in transaction-critical paths.


---

## 5. External Verification Adapters

```
Node.js API
  ├── government-registry adapter   → Government property registry API
  ├── valuation-service adapter     → Third-party valuation API
  ├── insurance-service adapter     → Insurance status API
  └── inspection-service adapter    → Physical inspection API
```

- Adapters are thin HTTP clients with retry, timeout, and error handling.
- Verification results are recorded on-chain via chaincode.
- API keys are loaded from environment variables only.

---

## 6. Deployment Topology (Target — Local Development)

All services run in Docker containers orchestrated by Docker Compose:

| Container | Image | Purpose | Ports (localhost only) |
|---|---|---|---|
| `peer0.org1` | `hyperledger/fabric-peer:2.5.9` | Fabric peer | 7051 |
| `orderer` | `hyperledger/fabric-orderer:2.5.9` | Orderer (Raft 1-node) | 7050 |
| `ca.org1` | `hyperledger/fabric-ca:1.5.12` | Fabric CA | 7054 |
| `couchdb` | `couchdb:3.3` | World state DB | 5984 (internal only) |
| `minio` | `minio/minio` | Evidence object store | 9000, 9001 (console) |
| `api` | Custom Node.js image | Backend API | 3000 |
| `frontend` | Custom Node.js/Nginx image | React frontend | 5173 (dev) |

> Docker Compose files will be created in Milestone 1.

### 6.1 Windows-Specific Deployment Notes

- **Docker Desktop**: Must use WSL 2 backend. Linux containers required (Fabric images are Linux-only).
- **Network Scripts**: `scripts/network-up.sh` must run inside WSL (Ubuntu) or Git Bash. Do not run in Windows Command Prompt or standard PowerShell.
- **Volume Mounts**: Docker volume paths use Linux-style paths inside WSL. When referencing from Windows host, use `\\wsl$\Ubuntu\...` or Docker Desktop volume management.
- **Port Forwarding**: Docker Desktop on WSL 2 automatically forwards container ports to `localhost` on Windows. The backend can connect to `localhost:7051` for the Fabric peer.
- **npm Scripts**: Due to the PowerShell execution policy being `Undefined` on this machine, use `cmd /c npm ...` or configure `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` before running npm scripts from PowerShell.
- **Go Chaincode Compilation**: Go 1.27.2 is installed on Windows and can compile chaincode for the Docker build context. The Docker build for chaincode uses a Go builder image inside Linux containers.
- **Line Endings**: Set `git config core.autocrlf input` to prevent CRLF issues in shell scripts that execute inside Docker/WSL.

### 6.2 CouchDB Index Requirements

All CouchDB indexes must be defined in `META-INF/statedb/couchdb/indexes/` within the chaincode directory. Indexes are deployed automatically with chaincode.

| Index Name | Fields | Used By |
|---|---|---|
| `by_owner` | `["owner"]` | `QueryAssetsByOwner` |
| `by_status` | `["status"]` | `QueryAssetsByStatus` |
| `by_template` | `["templateId"]` | `QueryAssetsByTemplate` |
| `by_token_holder` | `["tokenId", "holderIdentity"]` | `GetHoldingsByToken` |
| `by_asset_claim` | `["assetId", "status"]` | `ListClaimsByAsset` |
| `by_asset_evidence` | `["assetId"]` | `ListEvidenceByAsset` |
| `by_asset_verification` | `["assetId", "adapterType"]` | `ListVerificationsByAsset` |

**Critical:** CouchDB Mango queries that are not backed by an index will perform full collection scans and will produce warnings in peer logs. Always verify index usage with `EXPLAIN` during development.

**Phantom Read Limitation:** Rich queries (CouchDB Mango selectors) do NOT add to the MVCC read set. This means that if a chaincode function performs a rich query to check a constraint (e.g., "does any ACTIVE restriction exist for this holder?") and then writes based on that result, a concurrent transaction could invalidate the query result without causing an MVCC conflict. Mitigation: use **deterministic composite key reads** for all invariant enforcement, not rich queries.


---

## 7. Data Boundaries

| Data Type | Location | Access |
|---|---|---|
| Asset state | Fabric ledger (CouchDB) | Via chaincode only |
| Private asset/claim data | Fabric PDC | Authorized orgs only |
| Evidence files | MinIO buckets | Backend API only |
| Evidence integrity hash | Fabric ledger | Public on-chain |
| Identities / wallets | Backend wallet store | Backend process only |
| Secrets / API keys | Environment variables | Runtime only |

---

*Last updated: Stage 0 — Project Initialization*

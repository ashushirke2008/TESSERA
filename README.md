# TESSERA

> **Blockchain-Based Asset Registry, Evidence Management, Tokenization
> and Transfer Platform**

---

## Purpose

TESSERA is an enterprise asset management platform built on
**Hyperledger Fabric**. It provides a tamper-evident, auditable ledger
for registering physical and digital assets, attaching cryptographically
verified evidence, tokenizing ownership, enforcing transfer restrictions,
and managing claims and approvals — all without a conventional
application database.

---

## Mandatory Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React · Vite · TypeScript |
| **Backend API** | Node.js · Express · TypeScript |
| **Blockchain** | Hyperledger Fabric · Go chaincode |
| **Identity** | Fabric CA · MSP · X.509 certificates |
| **World State** | CouchDB (Fabric-managed) |
| **Confidential Data** | Fabric Private Data Collections |
| **Evidence Storage** | MinIO (off-chain, SHA-256 verified) |
| **Infrastructure** | Docker · Docker Compose |

> **Database restriction:** No PostgreSQL, MySQL, MongoDB, Firebase,
> Firestore, Supabase, SQLite, Redis, or any other conventional
> application database may be introduced.

---

## Project Directory Structure

```
TESSERA/
├── AGENTS.md                        ← Mandatory agent / contributor rules
├── README.md                        ← This file
├── .gitignore
├── .env.example
│
├── docs/                            ← All project documentation
│   ├── IMPLEMENTATION_PLAN.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_SPECIFICATION.md
│   ├── SECURITY_THREAT_MODEL.md
│   ├── TEST_STRATEGY.md
│   ├── DEVELOPMENT_SETUP.md
│   └── ARCHITECTURE_DECISIONS.md
│
├── frontend/                        ← React / Vite / TypeScript SPA
├── backend/                         ← Node.js / Express / TypeScript API
│
├── blockchain/
│   └── chaincode/
│       └── asset-contract/          ← Canonical Go chaincode (production)
│
├── infrastructure/
│   ├── docker/                      ← Docker Compose configurations
│   └── fabric/                      ← Fabric network configurations
│
├── external-adapters/               ← Integration adapters
│   ├── government-registry/
│   ├── valuation-service/
│   ├── insurance-service/
│   └── inspection-service/
│
├── scripts/                         ← Utility and automation scripts
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Staged Implementation Approach

TESSERA is built incrementally across six stages. No stage may begin
until its predecessor is tested and accepted.

| Stage | Title | Summary |
|---|---|---|
| **0** | Foundation | Environment setup, tooling, documentation |
| **1** | Fabric Infrastructure | Network, chaincode, asset registry |
| **2** | Evidence & Workflows | Verification, claims, approvals |
| **3** | Tokenization | Holdings, restrictions, transfers |
| **4** | External Adapters | Government, valuation, insurance, inspection |
| **5** | Frontend | Dashboards, QR Asset Passport, audit views |
| **6** | Hardening | Testing, security review, final demonstration |

Full details: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)

---

## Quick-Start (Setup Reference)

See [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) for the
complete Windows-first environment setup guide.

Prerequisites (versions to confirm — do not install here):
- Docker Desktop with WSL 2 backend
- Node.js (LTS)
- Go
- Git

---

## Key Documents

| Document | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Binding rules for agents and contributors |
| [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Architecture and data flow |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | On-chain and off-chain data structures |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | API endpoint outline |
| [docs/SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md) | Security threats and controls |
| [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md) | Recorded design decisions |

---

## License

*To be determined.*

---

*Stage 0 — Project Initialization*

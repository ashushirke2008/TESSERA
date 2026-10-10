# TESSERA — Agent Rules & Mandatory Constraints

This file defines the binding rules for every AI agent, contributor, and
automated process working on the TESSERA project.  
**All rules are mandatory. Do not deviate without explicit written approval.**

---

## 1. Project Identity

- **Project name:** TESSERA
- **Purpose:** A blockchain-based asset registry, evidence management,
  tokenization, and transfer platform built on Hyperledger Fabric.

---

## 2. Mandatory Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| Backend API | Node.js, Express, TypeScript |
| Blockchain | Hyperledger Fabric, Go chaincode |
| Identity | Fabric CA, MSP, X.509 certificates |
| World State DB | CouchDB (Fabric-managed only) |
| Confidential Data | Hyperledger Fabric Private Data Collections |
| Evidence Storage | MinIO (off-chain object store) |
| Evidence Integrity | SHA-256 hashing |
| Infrastructure | Docker and Docker Compose |

---

## 3. Architecture Rules

- Follow the approved layered architecture documented in
  `docs/SYSTEM_ARCHITECTURE.md`.
- The canonical production chaincode location is:
  ```
  blockchain/chaincode/asset-contract/
  ```
- Do **not** create a competing production chaincode implementation
  outside this directory.
- CouchDB **must** remain Fabric's world-state database only.
- MinIO **must** remain the sole off-chain object store.

---

## 4. Database Restriction

**Do NOT introduce any of the following databases into the project:**

- PostgreSQL
- MySQL
- MongoDB
- Firebase / Firestore
- Supabase
- SQLite
- Redis
- Any other conventional application database

CouchDB is managed exclusively by Hyperledger Fabric as the world-state
store. It is **not** available as a general-purpose application database.  
MinIO is the sole off-chain storage layer.

---

## 5. Security Rules

- **Never** hardcode passwords, tokens, certificates, or private keys in
  source files, scripts, or configuration files.
- All secrets must be managed via environment variables or a dedicated
  secrets management mechanism. Use `.env.example` as the sole template.
- Do **not** commit `.env` files, private keys, or certificates
  containing secrets to version control.
- Follow the threat model documented in `docs/SECURITY_THREAT_MODEL.md`.

---

## 6. Blockchain Transaction Rules

- **Do not** claim that a Hyperledger Fabric transaction has succeeded
  before its commit status and validation code have been explicitly
  confirmed by the Fabric Gateway response.
- Properly handle MVCC conflicts, phantom reads, and endorsement failures.
- All chaincode functions must validate input data before writing to the
  ledger.

---

## 7. Incremental Development Rules

- **Do not** implement the entire TESSERA platform in a single task or
  prompt.
- Work incrementally through the stages defined in
  `docs/IMPLEMENTATION_PLAN.md`.
- Test all changes before proceeding to the next stage.
- Document significant architectural or implementation decisions in
  `docs/ARCHITECTURE_DECISIONS.md`.
- **Do not** overwrite existing user files without explicit permission.
- Inspect every file before modifying it.

---

## 8. Scope Boundaries per Stage

| Stage | Scope |
|---|---|
| 0 | Project foundation and environment setup |
| 1 | Hyperledger Fabric infrastructure and asset registry |
| 2 | Evidence verification, claims and approval workflows |
| 3 | Tokenization, holdings, restrictions and transfers |
| 4 | External verification adapters |
| 5 | React dashboards, QR Asset Passport and audit views |
| 6 | Testing, security hardening and final demonstration |

Do not implement features from a later stage while an earlier stage is
incomplete or untested.

---

## 9. File and Directory Conventions

- All source files must reside within the project workspace.
- Do **not** create files outside the project workspace.
- Do **not** initialize duplicate Git repositories inside sub-directories.
- Respect the directory structure defined in `README.md`.

---

## 10. Prohibited Actions

- Installing system software or modifying OS, Docker, or WSL settings.
- Generating Docker Compose configurations before Stage 1.
- Creating Fabric network configurations before Stage 1.
- Generating frontend components before Stage 5.
- Generating backend application logic before Stage 2.
- Implementing chaincode before Stage 1.
- Searching outside the project workspace.

---

*Last updated: Stage 0 — Project Initialization*

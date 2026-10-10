# TESSERA — Development Environment Setup

> **Platform:** Windows (primary development target)  
> **Status:** Phase 2 — Architecture Validation. Prerequisites verified.  
> Updated: 2026-10-10.

---

## Prerequisites Overview — Verified 2026-10-10

| Tool | Purpose | Required Version | Actual Version | Status |
|---|---|---|---|---|
| Windows 10/11 | Host OS | 22H2+ | Not verified | ⚠️ VERIFY |
| WSL 2 + Ubuntu | Linux subsystem for Docker | WSL 2, Ubuntu | WSL 2, Ubuntu (confirmed) | ✅ Confirmed |
| Docker Desktop | Fabric network, MinIO, containers | 4.x+ | 29.8.2 (client) | ⚠️ **Daemon NOT running** |
| Docker Compose | Container orchestration | V2 | v5.5.1 | ✅ Confirmed |
| Git | Version control | 2.40+ | 2.54.0 | ✅ Confirmed |
| Node.js | Backend and frontend tooling | 20.x LTS | v24.13.1 | ✅ Confirmed (exceeds min) |
| npm | Package management | 10+ | 11.8.0 | ⚠️ **PS execution policy blocks** |
| Go | Chaincode development | 1.21+ | 1.27.2 | ✅ Confirmed |
| Hyperledger Fabric binaries | `peer`, `configtxgen`, etc. | 2.5.x | Not installed | ❌ **Required for M1** |
| Fabric Docker images | Peer, orderer, CA images | 2.5.x | Not pulled | ❌ **Required for M1** |
| VS Code (recommended) | IDE | Latest stable | Optional | Optional |

### ⚠️ Immediate Actions Required Before Milestone 1

1. **Start Docker Desktop daemon.** Current status: client installed but daemon not running (`docker info` fails).
   ```powershell
   # Start Docker Desktop from Start Menu
   # Then verify:
   docker info
   ```

2. **Resolve npm PowerShell execution policy.** Current policy: `Undefined` at all scopes. npm.ps1 is blocked.
   ```powershell
   # Option A: Set execution policy (recommended for development)
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   # Option B: Use cmd for npm commands
   cmd /c npm --version
   ```

3. **Initialize Git repository.**
   ```bash
   git init
   git add .
   git commit -m "Stage 0: Project initialization — Phase 2 planning complete"
   ```

4. **Create local .env file.**
   ```bash
   cp .env.example .env
   # Edit .env and fill in real local values
   ```

5. **Install Hyperledger Fabric binaries** (do this inside WSL Ubuntu — Stage 1 prerequisite):
   ```bash
   # Inside WSL Ubuntu — do NOT run yet until M1 is approved
   curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
   chmod +x install-fabric.sh
   ./install-fabric.sh --fabric-version 2.5.9 binary
   export PATH=$PATH:$(pwd)/bin
   peer version
   ```

6. **Pull Fabric Docker images** (Stage 1 prerequisite — only after Docker daemon is running):
   ```bash
   docker pull hyperledger/fabric-peer:2.5.9
   docker pull hyperledger/fabric-orderer:2.5.9
   docker pull hyperledger/fabric-ca:1.5.12
   docker pull couchdb:3.3
   docker pull minio/minio
   ```


---

## 1. Windows Subsystem for Linux (WSL 2)

Hyperledger Fabric's tooling and Docker images are Linux-based.
WSL 2 provides the required Linux environment on Windows.

### Verify WSL 2 is installed
```powershell
wsl --status
wsl --list --verbose
```
Expected: WSL version 2, with a Linux distribution (e.g., Ubuntu 22.04).

### Install WSL 2 (if not present)
```powershell
# Run as Administrator
wsl --install
```
Restart the machine after installation.

⚠️ **VERIFY:** Confirm WSL 2 (not WSL 1) is the default version.

---

## 2. Docker Desktop

Docker Desktop runs Fabric peers, orderers, CA, CouchDB, MinIO, and
all other services.

### Verify Docker is running
```powershell
docker --version
docker compose version
docker info
```

⚠️ **VERIFY:**
- Docker Desktop is running.
- WSL 2 backend is enabled in Docker Desktop settings.
- Resource limits (RAM ≥ 4 GB allocated) are sufficient for Fabric.

### Fabric Image Pull (Stage 1 prerequisite)
```bash
# Run inside WSL or Git Bash — do NOT pull yet; wait for Stage 1
docker pull hyperledger/fabric-peer:2.5
docker pull hyperledger/fabric-orderer:2.5
docker pull hyperledger/fabric-ca:1.5
docker pull couchdb:3.3
docker pull minio/minio
```
> Versions above are indicative. Confirm latest stable Fabric 2.5.x
> release before pulling.

---

## 3. Git

```powershell
git --version
```

⚠️ **VERIFY:** Git is installed and `git` is on `PATH`.

Configure user identity:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 4. Node.js

TESSERA uses Node.js for the backend (Express) and frontend build
tooling (Vite).

### Verify
```powershell
node --version   # expect v20.x LTS
npm --version    # expect 10.x+
```

### Install (if needed)
- Use [nvm-windows](https://github.com/coreybutler/nvm-windows) for
  version management (recommended).
- Or download from [nodejs.org](https://nodejs.org) (LTS release).

⚠️ **VERIFY:** Version compatibility with `@hyperledger/fabric-gateway`
  and Vite before Stage 1.

---

## 5. Go

Hyperledger Fabric chaincode is written in Go.

### Verify
```powershell
go version   # expect go1.21.x or later
```

### Install (if needed)
- Download from [go.dev/dl](https://go.dev/dl/).
- Ensure `GOPATH` and `GOROOT` environment variables are set.
- Add Go binaries to `PATH`.

⚠️ **VERIFY:** Version compatibility with Fabric chaincode-go library.

---

## 6. Hyperledger Fabric Binaries

The Fabric binary distribution includes `peer`, `orderer`,
`configtxgen`, `configtxlator`, and other tools needed for network
management.

### Install (Stage 1 prerequisite — do NOT run yet)
```bash
# Run inside WSL Ubuntu
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.9 binary
```
> Confirm the latest 2.5.x patch version at:
> https://github.com/hyperledger/fabric/releases

⚠️ **VERIFY:** Exact version and SHA before running install script.

---

## 7. VS Code Extensions (Recommended)

| Extension | Purpose |
|---|---|
| `golang.go` | Go language support |
| `ms-azuretools.vscode-docker` | Docker Compose and container management |
| `dbaeumer.vscode-eslint` | ESLint for TypeScript |
| `esbenp.prettier-vscode` | Code formatting |
| `ms-vscode.vscode-typescript-next` | TypeScript support |

---

## 8. Repository Setup

After confirming prerequisites:

```bash
# 1. Navigate to the project workspace
cd "C:\Users\admin\Downloads\TESSERA"

# 2. Initialize Git repository (if not already done)
git init
git add .
git commit -m "Stage 0: Project initialization"

# 3. Copy environment template
cp .env.example .env
# Then edit .env and fill in your local values — never commit .env
```

---

## 9. Environment Configuration & Variable Classification

Edit `.env` (copied from `.env.example`). Below is the formal operational classification of all configuration keys per Phase 4 specifications:

### Classification Categories:
- **A. Required for application startup**
- **B. Required only for a specific enabled service**
- **C. Optional for simulated integrations**
- **D. Required only for a future real external integration**
- **E. No longer needed**

| Variable Name | Default / Example Value | Classification | Operational Rationale |
|---|---|---|---|
| `NODE_ENV` | `development` | **A** | Controls error reporting and development fallbacks. |
| `API_PORT` | `3000` | **A** | Port on which the Express REST API listens. |
| `API_JWT_SECRET` | `[64-hex-char-secret]` | **A** | Required to sign and verify role authentication tokens. In dev/test mode, defaults to local dev string; production requires explicit secret. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | **A** | Protects API from unauthorized cross-origin browser requests. |
| `MINIO_ENDPOINT` | `localhost` | **B** | Required when connecting to off-chain object store daemon. |
| `MINIO_PORT` | `9000` | **B** | MinIO API port. |
| `MINIO_USE_SSL` | `false` | **B** | TLS toggle for MinIO connection. |
| `MINIO_ACCESS_KEY` | `minioadmin` | **B** | Restricted application credentials for evidence storage. |
| `MINIO_SECRET_KEY` | `minioadmin` | **B** | Secret key for MinIO object access. |
| `MINIO_BUCKET_EVIDENCE` | `tessera-evidence` | **B** | Target bucket for SHA-256 evidence digests. |
| `FABRIC_CHANNEL_NAME` | `mychannel` | **B** | Required for live Fabric Gateway consensus channel. |
| `FABRIC_CHAINCODE_NAME`| `asset-contract` | **B** | Canonical production chaincode identifier. |
| `FABRIC_MSP_ID` | `Org1MSP` | **B** | Membership Service Provider identifier. |
| `FABRIC_PEER_ENDPOINT` | `localhost:7051` | **B** | Peer gRPC endpoint for transaction proposals. |
| `FABRIC_PEER_TLS_CERT_PATH` | `/path/to/tls/cert.pem` | **B** | TLS certificate for Fabric peer transport encryption. |
| `FABRIC_GATEWAY_PEER_HOST_ALIAS` | `peer0.org1.example.com` | **B** | SNI override for TLS peer certificate validation. |
| `FABRIC_ADMIN_IDENTITY_PATH` | `/path/to/admin/identity` | **B** | Certificate and private key path for signing Fabric proposals. |
| `LOG_LEVEL` | `info` | **C** | Winston logging level (`debug`, `info`, `warn`, `error`). |
| `API_JWT_EXPIRES_IN` | `1h` | **C** | Token expiration window. |
| `GOVERNMENT_REGISTRY_API_URL` | `https://placeholder.gov/api` | **C** | Simulated adapter provides deterministic vectors without external connectivity. |
| `VALUATION_SERVICE_API_URL` | `https://placeholder-val.example.com` | **C** | Simulated adapter calculates dynamic valuations & tests stale rejections. |
| `INSURANCE_SERVICE_API_URL` | `https://placeholder-ins.example.com` | **C** | Simulated adapter assesses insurance coverage vectors. |
| `INSPECTION_SERVICE_API_URL`| `https://placeholder-insp.example.com` | **C** | Simulated adapter validates physical asset inspection condition. |
| `GOVERNMENT_REGISTRY_API_KEY` | `[API_KEY]` | **D** | Real third-party API key required only for live registry integration. |
| `VALUATION_SERVICE_API_KEY` | `[API_KEY]` | **D** | Real third-party API key required only for production automated appraisal. |
| `INSURANCE_SERVICE_API_KEY` | `[API_KEY]` | **D** | Real third-party API key required only for live underwriter API integration. |
| `INSPECTION_SERVICE_API_KEY`| `[API_KEY]` | **D** | Real third-party API key required only for live physical audit feeds. |
| `FABRIC_CA_URL` | `https://localhost:7054` | **D** | Required when dynamically enrolling new MSP certificates via Fabric CA. |
| `FABRIC_CA_TLS_CERT_PATH` | `/path/to/ca/tls-cert.pem` | **D** | CA TLS certificate for secure registration/enrollment. |
| `FABRIC_WALLET_PATH` | `/path/to/wallet` | **E** | Deprecated in modern Fabric Gateway v2.5+ in favor of file-based/in-memory Identities. |

⚠️ **SECURITY DIRECTIVE:** Never hardcode secrets in source files or frontend code. The `/api/ready` endpoint monitors and reports missing or unconfigured dependencies accurately without compromising credentials.


---

## 10. Verification Checklist

Before beginning Stage 1, confirm all of the following:

- [ ] WSL 2 installed and set as default
- [ ] Docker Desktop running with WSL 2 backend
- [ ] `docker compose version` returns a valid version
- [ ] `node --version` returns v20.x LTS
- [ ] `go version` returns 1.21+
- [ ] `git --version` returns 2.40+
- [ ] `.env` created and populated locally
- [ ] Git repository initialized with initial commit
- [ ] `.env` not committed to Git

---

## Notes on Windows-Specific Considerations

- **Line endings:** Configure Git to use LF line endings for shell scripts
  that run inside Docker/WSL.
  ```bash
  git config --global core.autocrlf input
  ```
- **File paths:** Use forward slashes or WSL paths when referencing files
  inside Docker volumes or WSL.
- **Fabric scripts:** Run Fabric shell scripts inside WSL or Git Bash,
  not Windows Command Prompt or PowerShell.
- **Port conflicts:** Ensure ports 7051 (peer), 7054 (CA), 7050 (orderer),
  5984 (CouchDB, internal only), 9000 (MinIO), 3000 (API) are not in use.
- **npm via PowerShell:** Due to the execution policy issue confirmed on this machine,
  use `cmd /c npm install` or resolve with `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- **Docker Desktop RAM:** Allocate at least 6 GB RAM in Docker Desktop settings for
  Fabric + CouchDB + MinIO + API containers running simultaneously.
- **WSL2 filesystem performance:** Keep project files on the Windows filesystem (`C:\...`)
  but run Docker Compose from WSL. Bind mounts from Windows drive are slower than WSL
  native paths; for chaincode builds, copy source into WSL if build times are unacceptable.

---

## Verification Checklist (Pre-Milestone 1)

- [ ] WSL 2 installed and set as default (Ubuntu distribution)
- [ ] Docker Desktop running and `docker info` succeeds
- [ ] `docker compose version` returns v5.x+
- [ ] `node --version` returns v24.x (or at least v20.x LTS)
- [ ] `cmd /c npm --version` returns 11.x
- [ ] `go version` returns go1.27.2+
- [ ] `git --version` returns 2.54.x
- [ ] Git repository initialized with initial commit
- [ ] `.env` created from `.env.example` and populated (never committed)
- [ ] Fabric binaries installed in WSL (`peer version` works)
- [ ] Fabric Docker images pulled (all 5 images)
- [ ] PowerShell execution policy resolved
- [ ] `git config core.autocrlf input` configured

---

*Last updated: Phase 2 — Architecture Validation, 2026-10-10*


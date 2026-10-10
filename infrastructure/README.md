# Infrastructure

> **Status:** Not yet implemented — Stage 1.

This directory contains all infrastructure-as-code for the TESSERA
platform.

## Structure

```
infrastructure/
├── docker/     ← Docker Compose configurations (Stage 1)
└── fabric/     ← Hyperledger Fabric network configurations (Stage 1)
```

## Planned Contents

### `docker/`
- `docker-compose.yml` — Core services (Fabric peer, orderer, CA,
  CouchDB, MinIO, backend API, frontend)
- `docker-compose.override.yml` — Local development overrides

### `fabric/`
- `configtx.yaml` — Channel and orderer genesis configuration
- `crypto-config.yaml` — Organization and identity configuration
- `organizations/` — Generated crypto material (gitignored)
- `channel-artifacts/` — Generated channel artifacts (gitignored)

## Technology

- **Orchestration:** Docker Compose
- **Network:** Hyperledger Fabric 2.5.x
- **World State:** CouchDB 3.x
- **Evidence Storage:** MinIO

---

*Do not create Docker Compose or Fabric network configurations before
Stage 1.*  
*Generated `crypto-config/`, `channel-artifacts/`, and `organizations/`
directories are excluded from Git.*  
*See [AGENTS.md](../AGENTS.md) and [docs/IMPLEMENTATION_PLAN.md](../docs/IMPLEMENTATION_PLAN.md).*

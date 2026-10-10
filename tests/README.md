# Tests

> **Status:** Stage 0 — placeholder.  
> Tests will be implemented alongside each stage.

This directory contains integration and end-to-end tests for the
TESSERA platform.

## Structure

```
tests/
├── unit/           ← Unit tests (also co-located with source)
├── integration/    ← Integration tests (API ↔ Fabric ↔ MinIO)
└── e2e/            ← End-to-end browser tests (Playwright/Cypress)
```

## Test Layers

| Layer | Location | Framework | Stage |
|---|---|---|---|
| Chaincode unit | `blockchain/chaincode/asset-contract/` | Go testing | 1 |
| Backend unit | `backend/src/` | Jest / Vitest | 1+ |
| Frontend unit | `frontend/src/` | Vitest + RTL | 5 |
| Integration | `tests/integration/` | Jest / Vitest + Supertest | 1+ |
| Authorization | `tests/integration/` | Jest / Vitest | 1+ |
| E2E | `tests/e2e/` | Playwright or Cypress | 5-6 |

## Guidelines

- No test uses production credentials or production data.
- Integration tests run against the local Docker Compose Fabric network.
- Test data uses clearly identified prefixes (e.g., `TEST-ASSET-`).
- Ledger state is reset between integration test runs.
- All tests must pass before a stage is accepted.

---

*See [docs/TEST_STRATEGY.md](../docs/TEST_STRATEGY.md) for the full
testing strategy.*

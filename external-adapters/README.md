# External Adapters

> **Status:** Not yet implemented — Stage 4.

This directory contains adapter services that integrate TESSERA with
external verification and data systems.

## Structure

```
external-adapters/
├── government-registry/    ← Government property registry adapter
├── valuation-service/      ← Third-party valuation service adapter
├── insurance-service/      ← Insurance status verification adapter
└── inspection-service/     ← Physical inspection verification adapter
```

## Adapter Responsibilities

Each adapter is a thin, standalone module that:
1. Makes an authenticated HTTP call to an external service.
2. Validates and sanitizes the response.
3. Returns a structured result to the backend API.
4. The backend then records the result on-chain via chaincode.

## Design Principles

- Adapters have explicit timeouts on all external calls.
- API keys are loaded from environment variables only.
- Adapters never write to the ledger directly — they return data to
  the backend, which submits the chaincode transaction.
- Failed or unavailable external services return structured errors;
  on-chain state is not written on failure.

## Technology

Each adapter will be implemented as a Node.js / TypeScript module,
co-located with the backend, or as a separate service — to be decided
in Stage 4.

---

*Do not implement adapters before Stage 4.*  
*See [AGENTS.md](../AGENTS.md) and [docs/IMPLEMENTATION_PLAN.md](../docs/IMPLEMENTATION_PLAN.md).*

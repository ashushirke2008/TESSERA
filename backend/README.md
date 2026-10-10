# Backend

> **Status:** Not yet implemented — Stage 1 (scaffold) / Stage 2+ (logic).

This directory will contain the TESSERA Node.js / Express / TypeScript
REST API server.

## Planned Contents

```
backend/
├── src/
│   ├── routes/          ← Express route definitions
│   ├── controllers/     ← Request handlers
│   ├── services/        ← Business logic (Fabric, MinIO, adapters)
│   ├── middleware/      ← Auth, validation, error handling
│   ├── fabric/          ← Fabric Gateway SDK integration
│   ├── minio/           ← MinIO client integration
│   ├── adapters/        ← External verification adapter clients
│   ├── types/           ← TypeScript type definitions
│   └── utils/           ← Helper utilities
├── tsconfig.json
├── package.json
└── .env                 ← (local only, never committed)
```

## Technology

- **Runtime:** Node.js (LTS)
- **Framework:** Express
- **Language:** TypeScript
- **Blockchain SDK:** `@hyperledger/fabric-gateway`
- **Object Storage:** MinIO Node.js SDK
- **Testing:** Jest or Vitest + Supertest

## Key Responsibilities

- Request validation and sanitization
- Authorization (role + MSP checks)
- Fabric Gateway transaction submission and evaluation
- SHA-256 evidence hashing before MinIO upload
- MinIO object lifecycle management
- External adapter orchestration

---

*Do not implement backend application logic before Stage 1 (scaffold)
and Stage 2 (business logic).*  
*See [AGENTS.md](../AGENTS.md) and [docs/IMPLEMENTATION_PLAN.md](../docs/IMPLEMENTATION_PLAN.md).*

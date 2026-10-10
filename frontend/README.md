# Frontend

> **Status:** Not yet implemented — Stage 5.

This directory will contain the TESSERA React / Vite / TypeScript
single-page application.

## Planned Contents

```
frontend/
├── src/
│   ├── components/      ← Reusable UI components
│   ├── pages/           ← Route-level page components
│   ├── hooks/           ← Custom React hooks
│   ├── services/        ← API client functions
│   ├── store/           ← State management
│   ├── types/           ← TypeScript type definitions
│   └── utils/           ← Helper utilities
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Planned Features (Stage 5)

- Asset registration and management dashboard
- Evidence upload and integrity verification
- Claims and approvals workflow UI
- Token holdings and transfer interface
- QR Asset Passport (generate and scan)
- Audit history and transaction explorer
- Identity/authentication integration

## Technology

- **Framework:** React 18+
- **Build Tool:** Vite
- **Language:** TypeScript
- **Testing:** Vitest + React Testing Library
- **E2E:** Playwright or Cypress

---

*Do not implement frontend components before Stage 5.*  
*See [AGENTS.md](../AGENTS.md) and [docs/IMPLEMENTATION_PLAN.md](../docs/IMPLEMENTATION_PLAN.md).*

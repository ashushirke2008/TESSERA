# Blockchain

> **Status:** Not yet implemented — Stage 1.

This directory contains all Hyperledger Fabric blockchain assets.

## Structure

```
blockchain/
└── chaincode/
    └── asset-contract/    ← Canonical production chaincode (Go)
```

## Technology

- **Platform:** Hyperledger Fabric 2.5.x
- **Chaincode Language:** Go
- **Identity:** Fabric CA, MSP, X.509 certificates
- **World State:** CouchDB
- **Confidential Data:** Private Data Collections

## Canonical Chaincode Location

```
blockchain/chaincode/asset-contract/
```

This is the **only** location for production chaincode.  
Do not create competing implementations elsewhere.

---

*See [AGENTS.md](../AGENTS.md), [docs/SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md),
and [docs/ARCHITECTURE_DECISIONS.md](../docs/ARCHITECTURE_DECISIONS.md).*

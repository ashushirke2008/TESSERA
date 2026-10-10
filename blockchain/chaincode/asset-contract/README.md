# asset-contract

> **Status:** Not yet implemented — Stage 1.

This is the canonical production chaincode for the TESSERA platform,
written in Go and deployed on Hyperledger Fabric.

## Planned Chaincode Functions

| Function | Stage | Description |
|---|---|---|
| `CreateAsset` | 1 | Register a new asset on-chain |
| `ReadAsset` | 1 | Retrieve an asset by ID |
| `UpdateAsset` | 1 | Update asset attributes |
| `DeleteAsset` | 1 | Decommission an asset |
| `AssetExists` | 1 | Check existence of an asset |
| `QueryAssetsByOwner` | 1 | CouchDB rich query by owner |
| `RecordEvidence` | 2 | Record evidence metadata (hash + ref) |
| `GetEvidenceMetadata` | 2 | Retrieve evidence metadata |
| `SubmitClaim` | 2 | Submit a new claim against an asset |
| `ApproveClaim` | 2 | Approve a pending claim |
| `RejectClaim` | 2 | Reject a pending claim |
| `TokenizeAsset` | 3 | Issue a token for an asset |
| `TransferToken` | 3 | Transfer token holdings |
| `PledgeToken` | 3 | Impose a pledge/restriction |
| `ReleaseToken` | 3 | Release a restriction |
| `CreatePolicy` | 3 | Create a transfer policy |
| `EnforcePolicy` | 3 | Validate a transfer against policy |
| `RecordExternalVerification` | 4 | Record external adapter result |

## Planned Structure

```
asset-contract/
├── main.go
├── asset_contract.go
├── asset_contract_test.go
├── models/
│   ├── asset.go
│   ├── evidence.go
│   ├── claim.go
│   ├── token.go
│   └── ...
├── collections_config.json   ← Private Data Collections config
├── go.mod
└── go.sum
```

---

*Do not implement chaincode before Stage 1.*  
*See [AGENTS.md](../../../AGENTS.md) and [docs/ARCHITECTURE_DECISIONS.md](../../../docs/ARCHITECTURE_DECISIONS.md).*

# Scripts

> **Status:** Stage 0 — placeholder.

This directory contains utility and automation scripts for the TESSERA
project.

## Planned Scripts

| Script | Stage | Purpose |
|---|---|---|
| `enroll-admin.sh` | 1 | Enroll the Fabric CA admin identity |
| `register-user.sh` | 1 | Register and enroll a user identity |
| `network-up.sh` | 1 | Start the local Fabric network |
| `network-down.sh` | 1 | Stop and clean the Fabric network |
| `deploy-chaincode.sh` | 1 | Package, install, approve, and commit chaincode |
| `create-channel.sh` | 1 | Create and join Fabric channel |
| `reset-ledger.sh` | Dev | Reset local Fabric ledger (dev only) |

## Guidelines

- Shell scripts must be POSIX-compatible and run inside WSL or Git Bash.
- Scripts must not hardcode credentials; read all secrets from
  environment variables.
- Each script must print a usage message when called with `--help` or
  incorrect arguments.
- Scripts are for development and CI use; they are not production
  deployment automation.

---

*See [AGENTS.md](../AGENTS.md) and [docs/DEVELOPMENT_SETUP.md](../docs/DEVELOPMENT_SETUP.md).*

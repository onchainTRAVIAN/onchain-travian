# Security policy

## Reporting a vulnerability

**Please do not open public issues for security problems.**

Report privately through GitHub: **Security → Report a vulnerability** on this repository ([private advisory form](https://github.com/onchainTRAVIAN/onchain-travian/security/advisories/new)).

Include what you found, how to reproduce it, and the impact you expect. We aim to reply within 72 hours and will keep you updated until it is fixed.

## Scope

- The game server and web app (`src/`), including login, sessions, CSRF, Gold ledger and market logic.
- Wallet sign-in, holder tiers and the deposit indexer (`src/crypto/`).
- The smart contracts (`contracts/src/`).
- The live world at https://ancient-realms.up.railway.app - test only with your own accounts, no denial-of-service, no access to other players' data.

Out of scope: game-balance opinions, missing best-practice headers without a real impact, and issues in third-party services.

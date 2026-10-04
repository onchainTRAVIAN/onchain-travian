# Ancient Realms — classic Travian-style strategy game with a token economy

A browser strategy game built on the classic Travian 3.6 rules (2010–2015 era): Romans, Teutons and Gauls, exact unit and building numbers, and a classic layout (resource-field oval, village centre, round top menu). Original artwork; works on PC and phones. On top of it there is a credits shop, a paid news ticker, and a crypto layer: wallet sign-in, perks for token holders, and ETH/token top-ups.

## Run it

```bash
npm install
cp .env.example .env        # world speed, map size, prices, crypto settings
npm run seed                # optional demo data: log in as "demo" / "demo12345"
npm run dev                 # http://localhost:3000
```

The first account that registers becomes the admin (`/admin`). For production: `npm run build && npm start` with `NODE_ENV=production` and a real `SESSION_SECRET`.

### Crypto on a local chain

```bash
anvil --block-time 2                          # terminal 1 (Foundry)
(cd contracts && forge build)                 # compile the contracts once
npm run chain:deploy                          # deploys token + GamePayments, prints .env lines
# paste the printed lines into .env, then: npm run dev
```

Crypto features switch off cleanly when `RPC_URL` / `PAYMENTS_ADDRESS` / `TOKEN_ADDRESS` are empty. To deploy to a testnet, see `contracts/README.md`.

## What's in the game

- **Core:** 18 resource fields, 38 classic buildings (incl. Blacksmith/Armoury, Town Hall, bonus buildings, tribe buildings), Romans/Teutons/Gauls with 10 units each (exact T3.6 stats), training queues, a map that wraps at the edges, raids, attacks, scouting, reinforcements, battle reports, messages, rankings, beginner protection, starvation.
- **Depth:** Academy research, Smithy upgrades, a hero (XP, skills, revive), oases with wild animals that you capture with the hero, culture points, settlers who found villages, chiefs who conquer them, a marketplace (send resources, trade offers), alliances (roles, invites, treaties, alliance chat).
- **Social:** world chat with live refresh, plus a **paid news ticker**. Players book hourly slots and their message scrolls at the top for everyone.
- **Premium:** an append-only credits ledger, boosts (production, build queue, training, attack, defence), instant finish, an NPC merchant.
- **Crypto:**
  - Sign-In with Ethereum, for linking a wallet and for logging in.
  - Token-holder tiers (Bronze to Diamond, by share of supply or top rank). A tier uses the *lowest* of your last N balance checks, so a short buy doesn't qualify.
  - ETH and token top-ups through the `GamePayments` contract. Tokens give +20% credits.
  - An indexer credits each deposit exactly once, after confirmations, and sends the player an in-game message.
- **Admin:** stats, announcements, ban/mute, grant credits, ticker moderation (removing a message refunds the player), deleting chat messages.

## How it works

- **Stack:** TypeScript (strict), Express 5, server-rendered HTML, SQLite (better-sqlite3 + Drizzle), Zod, Argon2id, helmet with a strict CSP, viem, and Foundry for the contracts.
- **Lazy simulation:** resources, training, loyalty, hero health and culture points are calculated from timestamps whenever they are read (`src/game/engine/state.ts`).
- **Ordered events:** construction, research, troop arrivals and hero revivals run strictly in time order (`processDue` in `src/game/engine/events.ts`). A 1-second worker runs them, and every request runs them first.
- **Pure rules:** the game rules in `src/game/rules/` are pure functions with unit tests.
- **One bonus pipeline:** every bonus is a row in `perks`. Shop boosts and holder tiers write rows there, and the game reads them through `getModifiers()` (`src/game/modifiers.ts`), with caps.
- **Crypto code:** the indexer is `src/crypto/indexer.ts`, holder tiers are `src/crypto/holders.ts` and `src/crypto/tiers.ts`, and wallet sign-in is `src/crypto/wallet.ts`. The background workers are in `src/crypto/worker.ts`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with reload |
| `npm test` | Unit, game-flow, HTTP and on-chain tests (anvil tests run when Foundry is installed) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run seed` | Demo data |
| `npm run chain:deploy` | Deploy the contracts to a local anvil node |
| `cd contracts && forge test` | Contract tests |

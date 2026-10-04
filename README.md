# Ancient Realms — WAP-style strategy game

A Travian-like browser strategy game in the old WAP style: text and links, phone-first, playable with no JavaScript.

## Run it

```bash
npm install
cp .env.example .env        # adjust world speed, map size, etc.
npm run seed                # optional: demo account "demo" / "demo12345" + neighbours
npm run dev                 # http://localhost:3000
```

Production: `npm run build && npm start` (set `NODE_ENV=production` and a real `SESSION_SECRET`).

The first registered account becomes admin.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with reload |
| `npm test` | Unit + game-flow + HTTP tests (in-memory DB, time-warp clock) |
| `npm run typecheck` | TypeScript strict check |
| `npm run db:generate` | New migration after editing `src/db/schema.ts` |
| `npm run seed` | Demo data |

## How it works

- **Stack:** TypeScript, Express 5, server-rendered HTML, SQLite (better-sqlite3 + Drizzle), Zod, Argon2id, helmet.
- **Lazy economy:** villages store resources plus a timestamp; amounts are computed on read (`src/game/engine/state.ts`).
- **Event processing:** construction and troop arrivals are processed strictly in time order (`processDue` in `src/game/engine/events.ts`), by a 1-second worker and before every request.
- **Rules are pure functions** in `src/game/rules/` (buildings, units, battle, map) and fully unit-tested.
- **Modifiers** (`src/game/modifiers.ts`): every bonus (premium, token-holder tiers, events) is a row in `perks`. Formulas read the folded `Modifiers`, so new bonus sources need no game-logic changes.

## Roadmap

1. ✅ Core game: fields, buildings, training, map, raids/attacks/scouting/reinforcements, reports, messages, rankings, protection.
2. Full game: tribe research and smithy upgrades, heroes, oases, settlers and conquering, marketplace, alliances, admin panel.
3. Credits shop (off-chain): instant finish, production boosts, extra build slot.
4. Crypto layer: wallet login (SIWE), token-holder perk tiers, ETH/token top-ups with on-chain indexer.

# Project: crypto wapgame (Ancient Realms)

Classic Travian 3.6 clone (exact rules/numbers, original art). TS strict, Express 5 server-rendered HTML (no client framework), SQLite via Drizzle.

- All game time goes through `clock.now()` (`src/clock.ts`); never call `Date.now()` in game logic.
- Every bonus goes through `perks` table → `getModifiers()` (`src/game/modifiers.ts`). Token-holder perks and premium plug in there.
- State changes: inside `db.transaction`, call `catchUp(tx, villageId, now)` first. Training completes lazily in `catchUp`.
- Player-facing rule violations: throw `GameError`; `formAction` turns them into flash messages.
- Views use the escape-by-default `html``` tag (`src/web/html.ts`). No inline styles/scripts (CSP is `'self'`).
- Schema change → edit `src/db/schema.ts` then `npm run db:generate`.
- Verify with `npm run typecheck && npm test`.
- Crypto: `src/crypto/` (SIWE wallet, holder tiers, deposit indexer, workers). Contract in `contracts/` (Foundry, `~/.foundry/bin`). ABIs copied to `src/crypto/*.ts` — re-copy after contract changes.
- Correlated subqueries: reference the outer table as raw `"users"."id"` — drizzle drops table qualifiers on single-table selects.
- Local chain E2E: `anvil --block-time 2`, `npm run chain:deploy`, paste env lines.
- Deploy: Railway project `ancient-realms`, service `game`, live at https://ancient-realms.up.railway.app (domain → port 8080). Redeploy: `npx @railway/cli up --service game --ci`. Config (`railway.json`, deprecated after 2026-12-01 → migrate to `.railway/railway.ts`): build `npm run build`, start `npm start`, health `/healthz`). Needs volume mounted at `/data` + `DATABASE_PATH=/data/game.db`, `NODE_ENV=production`, `SESSION_SECRET`. Single instance only (SQLite). Vercel unsuitable (no disk, no always-on workers).
- Target chain: Robinhood Chain (Arbitrum Orbit L2, chain 4663, testnet 46630); game token to be launched via Pons (1B fixed supply).
- Rules data: `src/game/rules/{units,buildings,production}.ts` follow T3.6 formulas; `tests/classic.test.ts` pins reference values. Art: `src/web/public/img/` (SVG); dorf1/dorf2 spot positions come from `scripts/gen-positions.py` (pasted at the end of `style.css`).

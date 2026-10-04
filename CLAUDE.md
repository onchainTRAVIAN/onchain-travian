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
- Look: matches classic T3 layout measured from the real CSS (980px page, 130px menu, 552px content, Verdana 13px, #71D000 links, grey-grid tables, dorf1 300×264 + rf markers, dorf2 540×448 + d1..d20 spots, 75×100 buildings, 74×74 diamond map). Art is ORIGINAL SVG in T3 style (never copy Travian images); generators live in the session scratchpad.
- Village centre clicks: `app.js` picks the building whose drawn pixels are under the cursor using `public/masks.json` (regenerate with `python3 scripts/gen-masks.py` after changing any building/wall SVG). Fallback/keyboard: SVG Voronoi layer in `src/web/views/spots.ts` (positions duplicated from `scripts/gen-positions.py` — change both).
- Map is an inline SVG built in `src/web/views/map.ts` (positions as SVG attributes, so no CSS position classes); flat tiles in `img/map/flat/`.
- Avatars: `src/game/actions/avatar.ts` stores WebP next to the DB (`<dir of DATABASE_PATH>/avatars`); multipart forms pass `_csrf` in the query string.
- Gold economy: all Gold lives in `credits_ledger` (sum per user); transfers/market write paired rows with unique idem keys. Gold market: `src/game/actions/goldmarket.ts` (escrow on listing, `delivery` movement handled like `return`).
- World speed scales production, build/train/research/travel times, culture points, loyalty and hero regen — NOT crop consumption (`cropUpkeep`).
- Live ops: change world speed with Railway vars `WORLD_SPEED`/`TROOP_SPEED`; one-off DB fixes via SSH (script in /app, `node script.mjs`, uses `DATABASE_PATH`).
- Combat follows Kirilloid's T3 model (`src/game/rules/battle.ts`: moraleMalus, demolishPoints/demolish, wallDuringBattle, catapultTargetAllowed); reference values pinned in `tests/rules.test.ts`, scenarios in `tests/combat.test.ts`. Rule decisions: memory `project-classic-rules`.
- Endgame: `src/game/actions/endgame.ts` (Natars, release, capture, Wonder rules, winner in meta `winner`); artifact effects in `src/game/engine/artifacts.ts` (`artifactValue(q, villageId, kind, now)`, used by combat/movement/training/upkeep/cranny). New building SVGs → rerun `scripts/gen-masks.py`.
- Rules data: `src/game/rules/{units,buildings,production}.ts` follow T3.6 formulas; `tests/classic.test.ts` pins reference values. Art: `src/web/public/img/` (SVG); dorf1/dorf2/map positions come from `scripts/gen-positions.py` (pasted at the end of `style.css`).

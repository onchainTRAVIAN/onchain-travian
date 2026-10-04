# Project: crypto wapgame (Ancient Realms)

WAP-style Travian-like game. TS strict, Express 5 server-rendered HTML (no client framework), SQLite via Drizzle.

- All game time goes through `clock.now()` (`src/clock.ts`); never call `Date.now()` in game logic.
- Every bonus goes through `perks` table → `getModifiers()` (`src/game/modifiers.ts`). Token-holder perks and premium plug in there.
- State changes: inside `db.transaction`, call `catchUp(tx, villageId, now)` first. Training completes lazily in `catchUp`.
- Player-facing rule violations: throw `GameError`; `formAction` turns them into flash messages.
- Views use the escape-by-default `html``` tag (`src/web/html.ts`). No inline styles/scripts (CSP is `'self'`).
- Schema change → edit `src/db/schema.ts` then `npm run db:generate`.
- Verify with `npm run typecheck && npm test`.

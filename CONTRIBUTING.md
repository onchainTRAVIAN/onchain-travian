# Contributing

onchainTRAVIAN is a proprietary project (see [LICENSE](LICENSE)). Bug reports and ideas are very welcome as issues. **Please open an issue before writing code** - outside pull requests are only merged with prior agreement, and anything you submit falls under section 3 of the licence.

## Development

```bash
npm install
cp .env.example .env
npm run dev                     # http://localhost:3000
npm run typecheck && npm test   # must pass before every PR
```

## Conventions

- TypeScript strict, no `any`. Validate all input server-side with Zod.
- Game time only through `clock.now()` (`src/clock.ts`), never `Date.now()` in game logic.
- State changes run inside `db.transaction` and call `catchUp(tx, villageId, now)` first.
- Every bonus goes through the `perks` table and `getModifiers()`.
- Player-facing rule violations throw `GameError`.
- Views use the escape-by-default `html` tag. No inline styles or scripts (strict CSP). Every `<img>` has `width`/`height`.
- New stats or features get a `help()` tip in `src/web/views/tips.ts`.
- Player-facing text uses a plain hyphen "-", never the long dash.
- Schema change: edit `src/db/schema.ts`, then `npm run db:generate`.
- Rule changes keep the reference tests in `tests/classic.test.ts` / `tests/rules.test.ts` green and update the game guide (`src/game/rules/faqdata.ts`).

## Commits

Short imperative subject naming the area (`Footer: ...`, `Combat: ...`), body for the why. Update `CHANGELOG.md` for player-visible changes.

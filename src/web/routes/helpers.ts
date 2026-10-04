import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { GameError } from '../../game/errors.js';
import { catchUp, economyOf, type VillageState } from '../../game/engine/state.js';
import { unreadCounts, userVillages } from '../../game/queries.js';
import { activeTicker, creditBalance } from '../../game/actions/credits.js';
import { ensureHero } from '../../game/engine/hero.js';
import { winner } from '../../game/actions/endgame.js';
import { heroPoints } from '../../game/rules/hero.js';
import { pointsUsed } from '../../game/actions/hero.js';
import { catchUpCulture } from '../../game/engine/state.js';
import { getMeta } from '../../game/engine/world.js';
import { authed, setFlash } from '../session.js';
import { layout, type Chrome, type NavKey } from '../views/layout.js';
import type { SafeHtml } from '../html.js';

export interface GamePage {
  chrome: Chrome;
  state: VillageState;
}

/** Load the active village (caught up to now) plus header data for a logged-in page. */
export function loadGamePage(req: Request): GamePage {
  const ctx = authed(req);
  const { state, hero } = db.transaction((tx) => {
    catchUpCulture(tx, ctx.user.id, ctx.now);
    return { state: catchUp(tx, ctx.villageId, ctx.now), hero: ensureHero(tx, ctx.user.id, ctx.now) };
  });
  if (!state) throw new GameError('Village not found');
  const user = db.select().from(users).where(eq(users.id, ctx.user.id)).get() ?? ctx.user;
  const heroAlert = !!hero && (hero.status === 'dead' || heroPoints(hero.level) - pointsUsed(hero) > 0);
  const chrome: Chrome = {
    user,
    village: state.village,
    villages: userVillages(db, ctx.user.id),
    eco: economyOf(db, state, ctx.now),
    unread: unreadCounts(db, ctx.user.id),
    credits: creditBalance(db, ctx.user.id),
    heroAlert,
  };
  return { chrome, state };
}

export function sendPage(req: Request, res: Response, title: string, body: SafeHtml, opts: { nav?: NavKey; chrome?: Chrome | null; status?: number } = {}): void {
  res
    .status(opts.status ?? 200)
    .type('html')
    .send(
      layout({
        title,
        body,
        now: req.ctx.now,
        csrf: req.ctx.csrf,
        flash: req.ctx.flash,
        chrome: opts.chrome ?? null,
        nav: opts.nav,
        ticker: activeTicker(db, req.ctx.now),
        announcement: winnerBanner() ?? getMeta(db, 'announcement') ?? null,
      }).value,
    );
}

/** Redirect target for "go back" after a form: same-origin Referer or a fallback. */
/** Once a World Wonder reaches level 100 everybody sees who won. */
function winnerBanner(): string | null {
  const w = winner(db);
  return w ? `🏆 ${w.alliance ?? w.user} completed the World Wonder in ${w.village} and won this world!` : null;
}

export function backUrl(req: Request, fallback: string): string {
  const ref = req.get('referer');
  if (!ref) return fallback;
  try {
    const u = new URL(ref);
    if (u.host !== req.get('host')) return fallback;
    // "//evil.example" or "/\\evil" would be followed to another site.
    if (u.pathname.startsWith('//') || u.pathname.startsWith('/\\')) return fallback;
    return u.pathname + u.search;
  } catch {
    return fallback;
  }
}

/**
 * Wrap a POST handler: parse the body with Zod, run the action, and turn rule violations
 * into a friendly flash message instead of an error page.
 */
export function formAction<S extends z.ZodType>(
  schema: S,
  handler: (req: Request, res: Response, data: z.infer<S>) => void | Promise<void>,
  fallback = '/village',
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setFlash(res, 'error', first?.message && first.message.length < 120 ? first.message : 'Please check the form and try again.');
      res.redirect(303, backUrl(req, fallback));
      return;
    }
    try {
      await handler(req, res, parsed.data);
    } catch (err) {
      if (err instanceof GameError) {
        setFlash(res, 'error', err.message);
        res.redirect(303, backUrl(req, fallback));
        return;
      }
      next(err);
    }
  };
}

export function intParam(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function pageParam(v: unknown): number {
  return Math.max(1, Math.min(1000, intParam(v, 1)));
}

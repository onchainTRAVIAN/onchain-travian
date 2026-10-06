import { finishedAutoTrains } from '../../game/actions/autotrain.js';
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { taskStatus } from '../../game/actions/tasks.js';
import { PRODUCTS, activeBoosts } from '../../game/actions/credits.js';
import { villageMovements } from '../../game/queries.js';
import { html } from '../html.js';
import { timer } from '../views/layout.js';
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
    notices: (() => {
      const out: NonNullable<Chrome['notices']> = [];
      if (user.protectedUntil > ctx.now) out.push({ kind: 'good', text: html`Beginner protection: ${timer(user.protectedUntil, ctx.now, false)} left`, href: '/help/beginner-protection' });
      const incoming = userVillages(db, ctx.user.id).reduce(
        (s, v) => s + villageMovements(db, v.id).filter((m) => m.direction === 'in' && (m.kind === 'attack' || m.kind === 'raid')).length,
        0,
      );
      if (incoming > 0) out.push({ kind: 'bad', text: `${incoming} incoming attack${incoming === 1 ? '' : 's'}!`, href: '/troops?tab=in#movements' });
      if (hero && hero.status === 'dead') out.push({ kind: 'warn', text: 'Your hero has fallen — revive it', href: '/hero' });
      else if (hero && heroPoints(hero.level) - pointsUsed(hero) > 0) out.push({ kind: 'info', text: `Your hero has ${heroPoints(hero.level) - pointsUsed(hero)} free skill points`, href: '/hero' });
      for (const b of activeBoosts(db, ctx.user.id, ctx.now)) {
        if ((b.expiresAt ?? 0) - ctx.now < 24 * 3_600_000) {
          const p = PRODUCTS.find((x) => `shop:${x.id}` === b.source);
          out.push({ kind: 'warn', text: html`${p?.name ?? 'A boost'} ends in ${timer(b.expiresAt ?? ctx.now, ctx.now, false)}`, href: '/shop?tab=adv' });
        }
      }
      for (const f of finishedAutoTrains(db, ctx.user.id)) {
        out.push({ kind: 'warn', text: `Auto training finished in ${f.name} — set it again`, href: `/troops/auto/${f.villageId}` });
      }
      const unread = unreadCounts(db, ctx.user.id);
      if (unread.reports > 0) out.push({ kind: 'info', text: `${unread.reports} new report${unread.reports === 1 ? '' : 's'}`, href: '/reports' });
      return out;
    })(),
    tasks: (() => {
      const t = taskStatus(db, ctx.user.id);
      return t.hidden ? null : { current: t.current, claimable: t.claimable, total: t.list.length, done: t.list.filter((x) => x.claimed).length };
    })(),
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

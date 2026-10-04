import { Router, type NextFunction, type Request, type Response } from 'express';
import { desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { creditsLedger, deposits, sessions, users, villages } from '../../db/schema.js';
import { deleteChatMessage } from '../../game/actions/chat.js';
import { grantCredits, removeTicker, upcomingTicker } from '../../game/actions/credits.js';
import { getMeta, setMeta } from '../../game/engine/world.js';
import { onlineCount, playerCount } from '../../game/queries.js';
import { assertGame } from '../../game/errors.js';
import { authed, requireAuth, setFlash } from '../session.js';
import { adminView } from '../views/admin.js';
import { backUrl, formAction, loadGamePage, sendPage } from './helpers.js';

export const adminRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.ctx.user?.role !== 'admin') {
    res.status(404).redirect(303, '/');
    return;
  }
  next();
}

adminRouter.use('/admin', requireAuth, requireAdmin);

adminRouter.get('/admin', (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 20) : '';
  const players = db
    .select({
      id: users.id, username: users.username, role: users.role, banned: users.banned, mutedUntil: users.mutedUntil, lastSeenAt: users.lastSeenAt,
      credits: sql<number>`coalesce((select sum(amount) from credits_ledger c where c.user_id = ${users.id}), 0)`,
      villages: sql<number>`(select count(*) from ${villages} where ${villages.userId} = ${users.id})`,
    })
    .from(users)
    .where(q ? like(users.usernameLower, `%${q.toLowerCase().replace(/[%_]/g, '')}%`) : undefined)
    .orderBy(desc(users.lastSeenAt))
    .limit(30)
    .all();
  sendPage(
    req,
    res,
    'Admin',
    adminView({
      stats: {
        players: playerCount(db),
        online: onlineCount(db, ctx.now),
        villages: db.select({ n: sql<number>`count(*)` }).from(villages).get()?.n ?? 0,
        creditsIssued: db.select({ n: sql<number>`coalesce(sum(${creditsLedger.amount}), 0)` }).from(creditsLedger).where(sql`${creditsLedger.amount} > 0`).get()?.n ?? 0,
        deposits: db.select({ n: sql<number>`count(*)` }).from(deposits).get()?.n ?? 0,
        indexerBlock: getMeta(db, 'indexer_block') ?? '—',
      },
      announcement: getMeta(db, 'announcement') ?? '',
      players,
      query: q,
      ticker: upcomingTicker(db, ctx.now),
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { chrome: page.chrome },
  );
});

adminRouter.post(
  '/admin/announcement',
  formAction(z.object({ text: z.string().max(200) }), (req, res, d) => {
    setMeta(db, 'announcement', d.text.trim());
    setFlash(res, 'ok', d.text.trim() ? 'Announcement published.' : 'Announcement cleared.');
    res.redirect(303, '/admin');
  }, '/admin'),
);

const target = z.object({ userId: z.coerce.number().int().positive() });

adminRouter.post(
  '/admin/ban',
  formAction(target.extend({ ban: z.enum(['0', '1']) }), (req, res, d) => {
    assertGame(d.userId !== authed(req).user.id, 'You cannot ban yourself');
    db.update(users).set({ banned: d.ban === '1' }).where(eq(users.id, d.userId)).run();
    if (d.ban === '1') db.delete(sessions).where(eq(sessions.userId, d.userId)).run();
    setFlash(res, 'ok', d.ban === '1' ? 'Player banned.' : 'Player unbanned.');
    res.redirect(303, backUrl(req, '/admin'));
  }, '/admin'),
);

adminRouter.post(
  '/admin/mute',
  formAction(target.extend({ hours: z.coerce.number().min(0).max(24 * 365) }), (req, res, d) => {
    const ctx = authed(req);
    db.update(users).set({ mutedUntil: d.hours > 0 ? ctx.now + d.hours * 3_600_000 : 0 }).where(eq(users.id, d.userId)).run();
    setFlash(res, 'ok', d.hours > 0 ? `Muted for ${d.hours} h.` : 'Unmuted.');
    res.redirect(303, backUrl(req, '/admin'));
  }, '/admin'),
);

adminRouter.post(
  '/admin/credits',
  formAction(target.extend({ amount: z.coerce.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, 'Enter an amount'), reason: z.string().trim().max(80).optional() }), (req, res, d) => {
    const ctx = authed(req);
    grantCredits(db, d.userId, d.amount, d.reason || 'Admin adjustment', `admin:${ctx.user.id}:${ctx.now}:${d.userId}`, ctx.now);
    setFlash(res, 'ok', `${d.amount > 0 ? 'Granted' : 'Removed'} ${Math.abs(d.amount)} credits.`);
    res.redirect(303, backUrl(req, '/admin'));
  }, '/admin'),
);

adminRouter.post(
  '/admin/ticker/remove',
  formAction(z.object({ id: z.coerce.number().int().positive() }), (req, res, d) => {
    removeTicker(db, d.id, authed(req).now);
    setFlash(res, 'ok', 'Ticker message removed and refunded.');
    res.redirect(303, '/admin');
  }, '/admin'),
);

adminRouter.post(
  '/admin/chat/delete',
  formAction(z.object({ id: z.coerce.number().int().positive() }), (req, res, d) => {
    deleteChatMessage(db, d.id);
    res.redirect(303, backUrl(req, '/chat'));
  }, '/chat'),
);

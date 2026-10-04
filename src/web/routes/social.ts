import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { reports } from '../../db/schema.js';
import { renameVillage } from '../../game/actions/account.js';
import { deleteMessage, inbox, outbox, readMessage, sendMessage } from '../../game/actions/messages.js';
import { parseReport } from '../../game/engine/reports.js';
import { playerProfile, playerRank, rankings, reportList, REPORT_FILTERS, type RankKind, type ReportFilter } from '../../game/queries.js';
import { authed, setFlash } from '../session.js';
import { reportListView, reportView } from '../views/reports.js';
import { accountView, helpView, inboxView, messageView, playerView, rankingView, writeView } from '../views/social.js';
import { formAction, intParam, loadGamePage, pageParam, sendPage } from './helpers.js';
import { requireAuth } from '../session.js';

export const socialRouter = Router();
const PAGE = 20;

/* ---------- Reports ---------- */

socialRouter.get('/reports', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const f = typeof req.query.f === 'string' && req.query.f in REPORT_FILTERS ? (req.query.f as ReportFilter) : 'all';
  const p = pageParam(req.query.page);
  const rows = reportList(db, ctx.user.id, f, PAGE + 1, (p - 1) * PAGE);
  sendPage(req, res, 'Reports', reportListView({ rows: rows.slice(0, PAGE), filter: f, page: p, hasMore: rows.length > PAGE, now: ctx.now, csrf: ctx.csrf }), {
    nav: 'reports',
    chrome: page.chrome,
  });
});

socialRouter.get('/reports/:id', requireAuth, (req, res) => {
  const ctx = authed(req);
  const id = intParam(req.params.id, 0);
  const row = db.select().from(reports).where(and(eq(reports.id, id), eq(reports.userId, ctx.user.id))).get();
  if (!row) {
    setFlash(res, 'error', 'Report not found.');
    res.redirect(303, '/reports');
    return;
  }
  if (!row.isRead) db.update(reports).set({ isRead: true }).where(eq(reports.id, id)).run();
  const page = loadGamePage(req);
  sendPage(
    req,
    res,
    row.title,
    reportView({ id: row.id, title: row.title, createdAt: row.createdAt, data: parseReport(row.data), viewerId: ctx.user.id, csrf: ctx.csrf }),
    { nav: 'reports', chrome: page.chrome },
  );
});

socialRouter.post(
  '/reports/:id/delete',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    const ctx = authed(req);
    db.delete(reports).where(and(eq(reports.id, intParam(req.params.id, 0)), eq(reports.userId, ctx.user.id))).run();
    setFlash(res, 'ok', 'Report deleted.');
    res.redirect(303, '/reports');
  }, '/reports'),
);

socialRouter.post(
  '/reports/read-all',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    const ctx = authed(req);
    db.update(reports).set({ isRead: true }).where(eq(reports.userId, ctx.user.id)).run();
    res.redirect(303, '/reports');
  }, '/reports'),
);

/* ---------- Messages ---------- */

socialRouter.get('/messages', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const box = req.query.box === 'out' ? 'out' : 'in';
  const p = pageParam(req.query.page);
  const rows =
    box === 'in'
      ? inbox(db, ctx.user.id, PAGE + 1, (p - 1) * PAGE).map((r) => ({ id: r.m.id, subject: r.m.subject, other: r.from ?? 'System', isRead: r.m.isRead, createdAt: r.m.createdAt }))
      : outbox(db, ctx.user.id, PAGE + 1, (p - 1) * PAGE).map((r) => ({ id: r.m.id, subject: r.m.subject, other: r.to ?? '?', isRead: true, createdAt: r.m.createdAt }));
  sendPage(req, res, 'Messages', inboxView({ box, rows: rows.slice(0, PAGE), page: p, hasMore: rows.length > PAGE, now: ctx.now }), {
    nav: 'messages',
    chrome: page.chrome,
  });
});

socialRouter.get('/messages/new', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  sendPage(req, res, 'New message', writeView({ to: str(req.query.to, 20), subject: str(req.query.subject, 80), body: '', csrf: ctx.csrf }), {
    nav: 'messages',
    chrome: page.chrome,
  });
});

const MessageSchema = z.object({
  to: z.string().trim().min(1, 'Enter a player name').max(20),
  subject: z.string().trim().min(1, 'Enter a subject').max(80),
  body: z.string().trim().min(1, 'Write a message').max(5000, 'Message is too long (5000 characters max)'),
});

socialRouter.post(
  '/messages',
  requireAuth,
  formAction(MessageSchema, (req, res, data) => {
    const ctx = authed(req);
    sendMessage(db, ctx.user.id, data.to, data.subject, data.body, ctx.now);
    setFlash(res, 'ok', `Message sent to ${data.to}.`);
    res.redirect(303, '/messages?box=out');
  }, '/messages/new'),
);

socialRouter.get('/messages/:id', requireAuth, (req, res) => {
  const ctx = authed(req);
  let m;
  try {
    m = readMessage(db, ctx.user.id, intParam(req.params.id, 0));
  } catch {
    setFlash(res, 'error', 'Message not found.');
    res.redirect(303, '/messages');
    return;
  }
  const page = loadGamePage(req);
  sendPage(
    req,
    res,
    m.subject,
    messageView({
      id: m.id,
      subject: m.subject,
      body: m.body,
      fromName: m.fromName,
      fromId: m.fromUserId,
      toName: m.toName,
      createdAt: m.createdAt,
      canReply: m.toUserId === ctx.user.id && m.fromUserId !== null,
      csrf: ctx.csrf,
    }),
    { nav: 'messages', chrome: page.chrome },
  );
});

socialRouter.post(
  '/messages/:id/delete',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    const ctx = authed(req);
    deleteMessage(db, ctx.user.id, intParam(req.params.id, 0));
    setFlash(res, 'ok', 'Message deleted.');
    res.redirect(303, '/messages');
  }, '/messages'),
);

/* ---------- Rankings & players (public) ---------- */

const RANK_KINDS: RankKind[] = ['population', 'attack', 'defense', 'raid'];

socialRouter.get('/stats', (req, res) => {
  const kind = RANK_KINDS.find((k) => k === req.query.k) ?? 'population';
  const p = pageParam(req.query.page);
  const rows = rankings(db, kind, PAGE + 1, (p - 1) * PAGE);
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(
    req,
    res,
    'Rankings',
    rankingView({ kind, rows: rows.slice(0, PAGE), offset: (p - 1) * PAGE, page: p, hasMore: rows.length > PAGE, myId: req.ctx.user?.id ?? null }),
    { nav: 'stats', chrome },
  );
});

socialRouter.get('/player/:id', (req, res) => {
  const profile = playerProfile(db, intParam(req.params.id, 0));
  if (!profile) {
    setFlash(res, 'error', 'Player not found.');
    res.redirect(303, '/stats');
    return;
  }
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(
    req,
    res,
    profile.user.username,
    playerView({
      user: profile.user,
      villages: profile.villages,
      rank: playerRank(db, profile.user.id),
      isMe: req.ctx.user?.id === profile.user.id,
      now: req.ctx.now,
    }),
    { nav: 'stats', chrome },
  );
});

/* ---------- Account & help ---------- */

socialRouter.get('/account', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  sendPage(
    req,
    res,
    'Profile',
    accountView({
      username: page.chrome.user.username,
      tribe: page.chrome.user.tribe,
      village: { id: page.state.village.id, name: page.state.village.name },
      protectedUntil: page.chrome.user.protectedUntil,
      isAdmin: page.chrome.user.role === 'admin',
      userId: ctx.user.id,
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'account', chrome: page.chrome },
  );
});

socialRouter.post(
  '/account/rename',
  requireAuth,
  formAction(z.object({ name: z.string().trim().min(2, 'Village name must be at least 2 characters').max(30, 'Village name is too long') }), (req, res, data) => {
    const ctx = authed(req);
    renameVillage(db, ctx.user.id, ctx.villageId, data.name);
    setFlash(res, 'ok', 'Village renamed.');
    res.redirect(303, '/account');
  }, '/account'),
);

socialRouter.get('/help', (req, res) => {
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(req, res, 'Game guide', helpView(), { chrome });
});

import { Router, type Request } from 'express';
import multer from 'multer';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { heroes, reports, users } from '../../db/schema.js';
import { membership } from '../../game/actions/alliance.js';

function allianceTagFull(userId: number): { id: number; tag: string; name: string } | null {
  const m = membership(db, userId);
  return m ? { id: m.a.id, tag: m.a.tag, name: m.a.name } : null;
}
import { NAME_CHANGE_PRICE, renamePlayer, renameVillage } from '../../game/actions/account.js';
import { AVATAR_MAX_UPLOAD, avatarUrl, avatarPath, hasAvatar, removeAvatar, saveAvatar, setBio } from '../../game/actions/avatar.js';
import { GameError } from '../../game/errors.js';
import { TRIBES } from '../../game/rules/units.js';
import { unitInfoView, unitsIndexView } from '../views/units.js';
import { endgameOverview } from '../../game/actions/endgame.js';
import { endgameView } from '../views/endgame.js';
import { WEEKLY_CATEGORIES, lastWinners, medalsOf, weekStart, weeklyStandings } from '../../game/actions/weekly.js';
import { deleteMessage, deleteMessages, inbox, markMessagesRead, outbox, readMessage, sendMessage } from '../../game/actions/messages.js';
import { battleOutcome, parseReport } from '../../game/engine/reports.js';
import { heroRankings, playerProfile, playerRank, rankOf, rankings, reportList, villageRankings, REPORT_FILTERS, type RankKind, type ReportFilter } from '../../game/queries.js';
import { authed, setFlash } from '../session.js';
import { reportListView, reportView } from '../views/reports.js';
import { FAQ, FAQ_CATEGORIES, faqTopic, searchFaq } from '../../game/rules/faq.js';
import { helpHome, helpTopic } from '../views/help.js';
import { accountView, heroRankingView, inboxView, messageView, playerView, rankingView, villageRankingView, weeklyView, writeView } from '../views/social.js';
import { backUrl, formAction, intParam, loadGamePage, pageParam, sendPage } from './helpers.js';
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
  const listed = rows.slice(0, PAGE).map(({ data, ...r }) => ({ ...r, outcome: battleOutcome(data, ctx.user.id) }));
  sendPage(req, res, 'Reports', reportListView({ rows: listed, filter: f, page: p, hasMore: rows.length > PAGE, now: ctx.now, csrf: ctx.csrf }), {
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

/** Checked ids from a list form ("ids" may come once or many times). */
const idList = z.preprocess(
  (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.coerce.number().int().positive()).max(200),
);

socialRouter.post(
  '/reports/bulk',
  requireAuth,
  formAction(
    z.object({ act: z.enum(['delete', 'read', 'readall', 'deleteall']), ids: idList, f: z.string().optional() }),
    (req, res, d) => {
      const ctx = authed(req);
      const f = d.f && d.f in REPORT_FILTERS ? (d.f as ReportFilter) : 'all';
      const back = `/reports?f=${f}`;
      const mine = eq(reports.userId, ctx.user.id);
      const kinds = REPORT_FILTERS[f];
      const inTab = kinds.length ? and(mine, inArray(reports.kind, [...kinds])) : mine;
      if ((d.act === 'delete' || d.act === 'read') && d.ids.length === 0) throw new GameError('Tick the reports first (or use the box at the top to select all).');
      if (d.act === 'delete') {
        const n = db.delete(reports).where(and(mine, inArray(reports.id, d.ids))).run().changes;
        setFlash(res, 'ok', `${n} report${n === 1 ? '' : 's'} deleted.`);
      } else if (d.act === 'read') {
        db.update(reports).set({ isRead: true }).where(and(mine, inArray(reports.id, d.ids))).run();
      } else if (d.act === 'readall') {
        db.update(reports).set({ isRead: true }).where(mine).run();
        setFlash(res, 'ok', 'All reports marked as read.');
      } else {
        const n = db.delete(reports).where(inTab).run().changes;
        setFlash(res, 'ok', `${n} report${n === 1 ? '' : 's'} deleted.`);
      }
      res.redirect(303, back);
    },
    '/reports',
  ),
);

/* ---------- Messages ---------- */

socialRouter.post(
  '/messages/bulk',
  requireAuth,
  formAction(
    z.object({ act: z.enum(['delete', 'read', 'readall']), ids: idList, box: z.enum(['in', 'out']).default('in') }),
    (req, res, d) => {
      const ctx = authed(req);
      const back = d.box === 'out' ? '/messages?box=out' : '/messages';
      if (d.act !== 'readall' && d.ids.length === 0) throw new GameError('Tick the messages first (or use the box at the top to select all).');
      if (d.act === 'delete') {
        const n = deleteMessages(db, ctx.user.id, d.ids);
        setFlash(res, 'ok', `${n} message${n === 1 ? '' : 's'} deleted.`);
      } else if (d.act === 'read') markMessagesRead(db, ctx.user.id, d.ids);
      else {
        markMessagesRead(db, ctx.user.id, 'all');
        setFlash(res, 'ok', 'All messages marked as read.');
      }
      res.redirect(303, back);
    },
    '/messages',
  ),
);

socialRouter.get('/messages', requireAuth, (req, res) => {
  const ctx = authed(req);
  const page = loadGamePage(req);
  const box = req.query.box === 'out' ? 'out' : 'in';
  const p = pageParam(req.query.page);
  const rows =
    box === 'in'
      ? inbox(db, ctx.user.id, PAGE + 1, (p - 1) * PAGE).map((r) => ({ id: r.m.id, subject: r.m.subject, other: r.from ?? 'System', isRead: r.m.isRead, createdAt: r.m.createdAt }))
      : outbox(db, ctx.user.id, PAGE + 1, (p - 1) * PAGE).map((r) => ({ id: r.m.id, subject: r.m.subject, other: r.to ?? '?', isRead: true, createdAt: r.m.createdAt }));
  sendPage(req, res, 'Messages', inboxView({ box, rows: rows.slice(0, PAGE), page: p, hasMore: rows.length > PAGE, now: ctx.now, csrf: ctx.csrf }), {
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
  const me = req.ctx.user?.id ?? null;
  // Like the original: open at your own position; "Rank" / "Name" jump to that player.
  let findId: number | null = null;
  let p = pageParam(req.query.page);
  const rankQ = intParam(req.query.rank, 0);
  const nameQ = typeof req.query.name === 'string' ? req.query.name.trim().toLowerCase() : '';
  if (nameQ) {
    const u = db.select({ id: users.id }).from(users).where(eq(users.usernameLower, nameQ)).get();
    if (u) {
      findId = u.id;
      p = Math.ceil(rankOf(db, kind, u.id).rank / PAGE);
    } else setFlash(res, 'error', `No player called "${String(req.query.name)}".`);
  } else if (rankQ > 0) {
    p = Math.ceil(rankQ / PAGE);
    findId = rankings(db, kind, 1, rankQ - 1)[0]?.id ?? null;
  } else if (req.query.page === undefined && me !== null) {
    p = Math.ceil(rankOf(db, kind, me).rank / PAGE);
  }
  const rows = rankings(db, kind, PAGE + 1, (p - 1) * PAGE);
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(
    req,
    res,
    'Statistics',
    rankingView({
      kind,
      rows: rows.slice(0, PAGE),
      offset: (p - 1) * PAGE,
      page: p,
      hasMore: rows.length > PAGE,
      myId: me,
      findId,
      leaders: rankings(db, kind, 3, 0),
      me: (() => {
        if (me === null || !req.ctx.user) return null;
        const r = rankOf(db, kind, me);
        const u = db.select({ username: users.username, tribe: users.tribe, avatarAt: users.avatarAt }).from(users).where(eq(users.id, me)).get();
        return { ...r, page: Math.ceil(r.rank / PAGE), username: u?.username ?? '', avatar: avatarUrl({ id: me, tribe: u?.tribe ?? 'romans', avatarAt: u?.avatarAt ?? 0 }) };
      })(),
    }),
    { nav: 'stats', chrome },
  );
});

socialRouter.get('/stats/villages', (req, res) => {
  const p = pageParam(req.query.page);
  const rows = villageRankings(db, PAGE + 1, (p - 1) * PAGE);
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(req, res, 'Statistics', villageRankingView({ rows: rows.slice(0, PAGE), offset: (p - 1) * PAGE, page: p, hasMore: rows.length > PAGE, myId: req.ctx.user?.id ?? null }), { nav: 'stats', chrome });
});

socialRouter.get('/stats/heroes', (req, res) => {
  const p = pageParam(req.query.page);
  const rows = heroRankings(db, PAGE + 1, (p - 1) * PAGE);
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(req, res, 'Statistics', heroRankingView({ rows: rows.slice(0, PAGE), offset: (p - 1) * PAGE, page: p, hasMore: rows.length > PAGE, myId: req.ctx.user?.id ?? null }), { nav: 'stats', chrome });
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
      alliance: allianceTagFull(profile.user.id),
      heroLevel: db.select({ l: heroes.level }).from(heroes).where(eq(heroes.userId, profile.user.id)).get()?.l ?? null,
      medals: medalsOf(db, profile.user.id),
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
      avatarAt: page.chrome.user.avatarAt,
      bio: page.chrome.user.bio,
      csrf: ctx.csrf,
      now: ctx.now,
    }),
    { nav: 'account', chrome: page.chrome },
  );
});

socialRouter.post(
  '/account/name',
  requireAuth,
  formAction(z.object({ name: z.string().max(40) }), (req, res, data) => {
    const ctx = authed(req);
    renamePlayer(db, ctx.user.id, data.name, ctx.now);
    setFlash(res, 'ok', `Your name is now ${data.name.trim()} (${NAME_CHANGE_PRICE} Gold).`);
    res.redirect(303, '/account');
  }, '/account'),
);

socialRouter.post(
  '/account/rename',
  requireAuth,
  formAction(z.object({ name: z.string().trim().min(2, 'Village name must be at least 2 characters').max(30, 'Village name is too long') }), (req, res, data) => {
    const ctx = authed(req);
    renameVillage(db, ctx.user.id, ctx.villageId, data.name);
    setFlash(res, 'ok', 'Village renamed.');
    res.redirect(303, backUrl(req, '/account'));
  }, '/account'),
);

/* ---------- Avatars & about text ---------- */

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: AVATAR_MAX_UPLOAD, files: 1 } }).single('avatar');

socialRouter.post('/account/avatar', requireAuth, (req, res, next) => {
  upload(req, res, (err: unknown) => {
    const ctx = authed(req);
    if (err) {
      setFlash(res, 'error', err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 'Pictures can be at most 5 MB' : 'Upload failed, please try again');
      res.redirect(303, '/account');
      return;
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      setFlash(res, 'error', 'Choose a picture to upload');
      res.redirect(303, '/account');
      return;
    }
    saveAvatar(db, ctx.user.id, file.buffer, ctx.now)
      .then((bytes) => {
        setFlash(res, 'ok', `Profile picture saved (${Math.ceil(bytes / 1024)} KB).`);
        res.redirect(303, '/account');
      })
      .catch((e: unknown) => {
        if (e instanceof GameError) {
          setFlash(res, 'error', e.message);
          res.redirect(303, '/account');
          return;
        }
        next(e);
      });
  });
});

socialRouter.post(
  '/account/avatar/remove',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    removeAvatar(db, authed(req).user.id);
    setFlash(res, 'ok', 'Your tribe picture is back.');
    res.redirect(303, '/account');
  }, '/account'),
);

socialRouter.post(
  '/account/bio',
  requireAuth,
  formAction(z.object({ bio: z.string().max(2000) }), (req, res, d) => {
    setBio(db, authed(req).user.id, d.bio);
    setFlash(res, 'ok', 'Profile saved.');
    res.redirect(303, '/account');
  }, '/account'),
);

socialRouter.get('/avatar/:id', (req, res) => {
  const id = intParam(req.params.id, 0);
  if (id > 0 && hasAvatar(id)) {
    res.set('Cache-Control', 'public, max-age=86400').type('image/webp').sendFile(avatarPath(id));
    return;
  }
  const u = db.select({ tribe: users.tribe }).from(users).where(eq(users.id, id)).get();
  res.redirect(302, `/static/img/avatars/${u?.tribe ?? 'romans'}.svg`);
});

socialRouter.get('/stats/week', (req, res) => {
  const ws = weekStart(req.ctx.now);
  sendPage(
    req,
    res,
    'Top 10',
    weeklyView({
      standings: WEEKLY_CATEGORIES.map((c) => ({ category: c, rows: weeklyStandings(db, c, ws, 10) })),
      weekStart: ws,
      now: req.ctx.now,
      myId: req.ctx.user?.id ?? null,
      winners: lastWinners(db),
    }),
    { nav: 'stats', chrome: req.ctx.user ? loadGamePage(req).chrome : null },
  );
});

const UNIT_TRIBES = ['romans', 'teutons', 'gauls', 'nature', 'natars'] as const;

socialRouter.get('/unit/:tribe/:n', (req, res) => {
  const tribe = UNIT_TRIBES.find((t) => t === req.params.tribe);
  const n = intParam(req.params.n, 0);
  if (!tribe || n < 1 || n > 10) {
    res.redirect(303, '/units');
    return;
  }
  sendPage(req, res, TRIBES[tribe].units[n - 1]?.name ?? 'Troop', unitInfoView({ tribe, slot: n - 1 }), {
    chrome: req.ctx.user ? loadGamePage(req).chrome : null,
  });
});

socialRouter.get('/endgame', (req, res) => {
  sendPage(req, res, 'Artifacts & World Wonders', endgameView({ ...endgameOverview(db), now: req.ctx.now }), {
    nav: 'stats',
    chrome: req.ctx.user ? loadGamePage(req).chrome : null,
  });
});

socialRouter.get('/units', (req, res) => {
  const tribe = UNIT_TRIBES.find((t) => t === req.query.t) ?? null;
  sendPage(req, res, 'Troops', unitsIndexView({ tribe }), { chrome: req.ctx.user ? loadGamePage(req).chrome : null });
});

socialRouter.get('/help', (req, res) => {
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 80).trim() : '';
  const c = FAQ_CATEGORIES.find((x) => x.id === req.query.c)?.id ?? null;
  sendPage(req, res, 'Game guide', helpHome({ q, results: q ? searchFaq(q) : null, category: c }), { chrome });
});

/** Small search index for the live search box. */
socialRouter.get('/help/index.json', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(FAQ.map((t) => ({ id: t.id, t: t.title, k: t.keywords.join(' '), s: t.summary })));
});

socialRouter.get('/help/:id', (req, res) => {
  const topic = faqTopic(String(req.params.id));
  if (!topic) {
    res.redirect(303, `/help?q=${encodeURIComponent(String(req.params.id).replace(/-/g, ' '))}`);
    return;
  }
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(req, res, topic.title, helpTopic(topic), { chrome });
});

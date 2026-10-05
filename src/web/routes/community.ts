import { Router, type Request, type Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { slots, villages } from '../../db/schema.js';
import {
  acceptInvite,
  allianceById,
  allianceCapacity,
  allianceMembersList,
  allianceRankings,
  allianceTagOf,
  answerDiplomacy,
  createAlliance,
  declineInvite,
  diplomacyOf,
  invitePlayer,
  invitesFor,
  kickMember,
  leaveAlliance,
  membership,
  proposeDiplomacy,
  setRole,
  updateDescription,
  type AllianceRankKind,
} from '../../game/actions/alliance.js';
import { allianceRankingView } from '../views/social.js';
import { channelFor, chatHistory, postChat } from '../../game/actions/chat.js';
import { authed, requireAuth, setFlash } from '../session.js';
import { allianceView, chatLines, chatView, noAllianceView } from '../views/community.js';
import { formAction, intParam, loadGamePage, pageParam, sendPage } from './helpers.js';

export const communityRouter = Router();

/* ---------- Alliance ---------- */

communityRouter.get('/alliance', requireAuth, (req, res) => {
  const ctx = authed(req);
  const m = membership(db, ctx.user.id);
  if (m) {
    res.redirect(303, `/alliance/${m.a.id}`);
    return;
  }
  const page = loadGamePage(req);
  const embassy =
    db.select({ l: sql<number>`coalesce(max(${slots.level}), 0)` })
      .from(slots)
      .innerJoin(villages, eq(villages.id, slots.villageId))
      .where(and(eq(villages.userId, ctx.user.id), eq(slots.building, 'embassy')))
      .get()?.l ?? 0;
  sendPage(
    req,
    res,
    'Alliance',
    noAllianceView({ invites: invitesFor(db, ctx.user.id), canFound: embassy >= 3, top: allianceRankings(db, 10, 0), csrf: ctx.csrf, now: ctx.now }),
    { nav: 'alliance', chrome: page.chrome },
  );
});

communityRouter.get('/alliances', (req, res) => {
  const kinds: AllianceRankKind[] = ['population', 'attack', 'defense'];
  const kind = kinds.find((k) => k === req.query.k) ?? 'population';
  const PER = 20;
  // Like the player ranking: open at your own alliance unless a page is asked for.
  const all = allianceRankings(db, 100_000, 0, kind);
  const mineId = req.ctx.user ? allianceTagOf(db, req.ctx.user.id)?.id ?? null : null;
  const myIndex = mineId !== null ? all.findIndex((a) => a.id === mineId) : -1;
  const p = req.query.page === undefined && myIndex >= 0 ? Math.floor(myIndex / PER) + 1 : pageParam(req.query.page);
  const value = (a: (typeof all)[number]) => (kind === 'attack' ? a.off : kind === 'defense' ? a.def : a.pop);
  const mine = myIndex >= 0 ? all[myIndex] : undefined;
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(
    req,
    res,
    'Alliances',
    allianceRankingView({
      kind,
      rows: all.slice((p - 1) * PER, p * PER),
      leaders: all.slice(0, 3),
      offset: (p - 1) * PER,
      page: p,
      hasMore: all.length > p * PER,
      mine: mine ? { id: mine.id, rank: myIndex + 1, total: all.length, tag: mine.tag, value: value(mine) } : null,
      perPage: PER,
    }),
    { nav: 'stats', chrome },
  );
});

communityRouter.get('/alliance/:id', (req, res) => {
  const a = allianceById(db, intParam(req.params.id, 0));
  if (!a) {
    setFlash(res, 'error', 'Alliance not found.');
    res.redirect(303, '/alliances');
    return;
  }
  const userId = req.ctx.user?.id;
  const m = userId !== undefined ? membership(db, userId) : undefined;
  const myRole = m && m.a.id === a.id ? m.m.role : null;
  const chrome = req.ctx.user ? loadGamePage(req).chrome : null;
  sendPage(
    req,
    res,
    `[${a.tag}] ${a.name}`,
    allianceView({
      alliance: a,
      members: allianceMembersList(db, a.id),
      myRole,
      capacity: allianceCapacity(db, a.id),
      diplomacy: diplomacyOf(db, a.id),
      csrf: req.ctx.csrf,
      now: req.ctx.now,
    }),
    { nav: 'alliance', chrome },
  );
});

const back = '/alliance';
function done(res: Response, msg: string): void {
  setFlash(res, 'ok', msg);
  res.redirect(303, '/alliance');
}

communityRouter.post(
  '/alliance/create',
  requireAuth,
  formAction(
    z.object({
      name: z.string().trim().min(3, 'Name must be at least 3 characters').max(40),
      tag: z.string().trim().min(2, 'Tag must be 2-8 characters').max(8, 'Tag must be 2-8 characters').regex(/^[A-Za-z0-9_-]+$/, 'Tag can only use letters, numbers, - and _'),
    }),
    (req, res, d) => {
      const ctx = authed(req);
      createAlliance(db, ctx.user.id, d.name, d.tag, ctx.now);
      done(res, `Alliance [${d.tag}] founded!`);
    },
    back,
  ),
);

communityRouter.post(
  '/alliance/invite',
  requireAuth,
  formAction(z.object({ username: z.string().trim().min(1).max(20) }), (req, res, d) => {
    const ctx = authed(req);
    invitePlayer(db, ctx.user.id, d.username, ctx.now);
    done(res, `${d.username} has been invited.`);
  }, back),
);

const allianceIdSchema = z.object({ allianceId: z.coerce.number().int().positive() });

communityRouter.post(
  '/alliance/accept',
  requireAuth,
  formAction(allianceIdSchema, (req, res, d) => {
    const ctx = authed(req);
    acceptInvite(db, ctx.user.id, d.allianceId, ctx.now);
    done(res, 'Welcome to your new alliance!');
  }, back),
);

communityRouter.post(
  '/alliance/decline',
  requireAuth,
  formAction(allianceIdSchema, (req, res, d) => {
    declineInvite(db, authed(req).user.id, d.allianceId);
    done(res, 'Invitation declined.');
  }, back),
);

communityRouter.post(
  '/alliance/leave',
  requireAuth,
  formAction(z.object({}), (req, res) => {
    leaveAlliance(db, authed(req).user.id);
    done(res, 'You left the alliance.');
  }, back),
);

const userIdSchema = z.object({ userId: z.coerce.number().int().positive() });

communityRouter.post(
  '/alliance/kick',
  requireAuth,
  formAction(userIdSchema, (req, res, d) => {
    kickMember(db, authed(req).user.id, d.userId);
    done(res, 'Member removed.');
  }, back),
);

communityRouter.post(
  '/alliance/role',
  requireAuth,
  formAction(userIdSchema.extend({ role: z.enum(['leader', 'officer', 'member']) }), (req, res, d) => {
    setRole(db, authed(req).user.id, d.userId, d.role);
    done(res, 'Role updated.');
  }, back),
);

communityRouter.post(
  '/alliance/description',
  requireAuth,
  formAction(z.object({ description: z.string().max(2000, 'Description is too long') }), (req, res, d) => {
    updateDescription(db, authed(req).user.id, d.description.trim());
    done(res, 'Description saved.');
  }, back),
);

communityRouter.post(
  '/alliance/diplomacy',
  requireAuth,
  formAction(z.object({ tag: z.string().trim().min(1).max(8), kind: z.enum(['confed', 'nap', 'war']) }), (req, res, d) => {
    const ctx = authed(req);
    proposeDiplomacy(db, ctx.user.id, d.tag, d.kind, ctx.now);
    done(res, d.kind === 'war' ? `War declared on [${d.tag}]!` : `Treaty proposed to [${d.tag}].`);
  }, back),
);

communityRouter.post(
  '/alliance/diplomacy/answer',
  requireAuth,
  formAction(z.object({ id: z.coerce.number().int().positive(), accept: z.enum(['0', '1']) }), (req, res, d) => {
    answerDiplomacy(db, authed(req).user.id, d.id, d.accept === '1');
    done(res, d.accept === '1' ? 'Treaty accepted.' : 'Treaty ended.');
  }, back),
);

/* ---------- Chat ---------- */

function chatData(req: Request) {
  const ctx = authed(req);
  const requested = typeof req.query.c === 'string' ? req.query.c : undefined;
  let channel;
  try {
    channel = channelFor(db, ctx.user.id, requested);
  } catch {
    channel = channelFor(db, ctx.user.id, 'global');
  }
  const lines = chatHistory(db, channel, 60);
  return { ctx, channel, lines };
}

communityRouter.get('/chat', requireAuth, (req, res) => {
  const page = loadGamePage(req);
  const { ctx, channel, lines } = chatData(req);
  const m = membership(db, ctx.user.id);
  sendPage(
    req,
    res,
    'Chat',
    chatView({
      channel: channel.kind,
      allianceTag: m?.a.tag ?? null,
      lines,
      isAdmin: ctx.user.role === 'admin',
      csrf: ctx.csrf,
      now: ctx.now,
      muted: page.chrome.user.mutedUntil > ctx.now,
    }),
    { nav: 'chat', chrome: page.chrome },
  );
});

/** HTML fragment for live refresh (used by app.js). */
communityRouter.get('/chat/feed', requireAuth, (req, res) => {
  const { ctx, lines } = chatData(req);
  res.type('html').set('Cache-Control', 'no-store').send(chatLines(lines, ctx.now, ctx.user.role === 'admin', ctx.csrf).value);
});

communityRouter.post(
  '/chat',
  requireAuth,
  formAction(z.object({ c: z.enum(['global', 'alliance']).default('global'), body: z.string().max(1000) }), (req, res, d) => {
    const ctx = authed(req);
    const channel = channelFor(db, ctx.user.id, d.c);
    postChat(db, ctx.user.id, channel, d.body, ctx.now);
    res.redirect(303, d.c === 'alliance' ? '/chat?c=alliance' : '/chat');
  }, '/chat'),
);


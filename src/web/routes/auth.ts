import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { villages } from '../../db/schema.js';
import { config } from '../../config.js';
import { authenticate, registerPlayer } from '../../game/actions/account.js';
import { onlineCount, playerCount } from '../../game/queries.js';
import { TRIBE_IDS } from '../../game/rules/units.js';
import { GameError } from '../../game/errors.js';
import { createSession, destroySession, setFlash } from '../session.js';
import { landingView, loginView, registerView } from '../views/auth.js';
import { sendPage } from './helpers.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.NODE_ENV === 'test' ? 10_000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    setFlash(res, 'error', 'Too many attempts. Please wait a few minutes.');
    res.redirect(303, '/login');
  },
});

const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[A-Za-z0-9_ .-]+$/, 'Name can only use letters, numbers, spaces, dots, dashes and underscores')
    .refine((s) => !/\s{2,}/.test(s), 'Name cannot contain double spaces'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  tribe: z.enum(TRIBE_IDS, { message: 'Choose a tribe' }),
});

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(200),
});

authRouter.get('/', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  const stats = {
    players: playerCount(db),
    online: onlineCount(db, req.ctx.now),
    villages: db.select({ n: sql<number>`count(*)` }).from(villages).get()?.n ?? 0,
  };
  sendPage(req, res, 'Welcome', landingView(stats, req.ctx.csrf));
});

authRouter.get('/login', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  sendPage(req, res, 'Log in', loginView(req.ctx.csrf));
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    setFlash(res, 'error', 'Enter your player name and password.');
    res.redirect(303, '/login');
    return;
  }
  try {
    const user = await authenticate(db, parsed.data.username, parsed.data.password);
    if (!user) {
      res.status(401);
      req.ctx.flash = { type: 'error', text: 'Wrong player name or password.' };
      sendPage(req, res, 'Log in', loginView(req.ctx.csrf, parsed.data.username), { status: 401 });
      return;
    }
    createSession(res, user.id, null);
    res.redirect(303, '/fields');
  } catch (err) {
    if (err instanceof GameError) {
      setFlash(res, 'error', err.message);
      res.redirect(303, '/login');
      return;
    }
    throw err;
  }
});

authRouter.get('/register', (req, res) => {
  if (req.ctx.user) {
    res.redirect(303, '/fields');
    return;
  }
  sendPage(req, res, 'Join', registerView(req.ctx.csrf));
});

authRouter.post('/register', authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const values = {
    username: typeof body.username === 'string' ? body.username.slice(0, 20) : '',
    tribe: typeof body.tribe === 'string' ? body.tribe : '',
  };
  if (!parsed.success) {
    req.ctx.flash = { type: 'error', text: parsed.error.issues[0]?.message ?? 'Please check the form.' };
    sendPage(req, res, 'Join', registerView(req.ctx.csrf, values), { status: 422 });
    return;
  }
  try {
    const { userId, villageId } = await registerPlayer(db, parsed.data, req.ctx.now);
    createSession(res, userId, villageId);
    setFlash(res, 'ok', `Welcome, ${parsed.data.username}! Your village has been founded. Start by upgrading your resource fields.`);
    res.redirect(303, '/fields');
  } catch (err) {
    if (err instanceof GameError) {
      req.ctx.flash = { type: 'error', text: err.message };
      sendPage(req, res, 'Join', registerView(req.ctx.csrf, values), { status: 409 });
      return;
    }
    throw err;
  }
});

authRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.redirect(303, '/');
});

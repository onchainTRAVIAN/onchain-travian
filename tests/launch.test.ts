import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { config } from '../src/config.js';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { createApp } from '../src/app.js';
import { csrfFrom } from './walletAuth.js';

// A public world: one canonical address and a listed admin wallet (set before the app is built).
const HOST = 'play.example';
const boss = privateKeyToAccount(generatePrivateKey());
const later = privateKeyToAccount(generatePrivateKey());
config.PUBLIC_URL = `https://${HOST}`;
config.ADMIN_WALLETS = [boss.address.toLowerCase()];
const app = createApp();

/** Wallet sign-in on the canonical host; `chainId` = the chain the wallet says it is on. */
async function signIn(agent: ReturnType<typeof request.agent>, account: PrivateKeyAccount, chainId?: number) {
  const _csrf = csrfFrom((await agent.get('/login').set('Host', HOST)).text);
  const c = await agent.post('/wallet/challenge').set('Host', HOST).send({ _csrf, address: account.address, purpose: 'login', ...(chainId ? { chainId } : {}) });
  expect(c.body.ok, c.body.error).toBe(true);
  const message = c.body.message as string;
  const v = await agent.post('/wallet/verify').set('Host', HOST).send({ _csrf, message, signature: await account.signMessage({ message }), purpose: 'login' });
  return { message, v };
}

async function join(account: PrivateKeyAccount, name: string) {
  const agent = request.agent(app);
  const { v } = await signIn(agent, account);
  expect(v.body.redirect).toBe('/register');
  const page = await agent.get('/register').set('Host', HOST);
  const res = await agent.post('/register').set('Host', HOST).type('form').send({ _csrf: csrfFrom(page.text), username: name, tribe: 'romans' });
  expect(res.headers.location).toBe('/fields');
  return db.select().from(users).where(eq(users.username, name)).get();
}

beforeAll(() => {
  ensureWorld(db);
});

describe('public launch settings', () => {
  it('redirects other hosts to PUBLIC_URL, but health checks answer anywhere', async () => {
    const res = await request(app).get('/help?x=1').set('Host', 'ancient-realms.up.railway.app');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe(`https://${HOST}/help?x=1`);
    const post = await request(app).post('/logout').set('Host', 'www.play.example');
    expect(post.status).toBe(308);
    const health = await request(app).get('/healthz').set('Host', 'healthcheck.railway.app');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });
  });

  it('binds wallet sign-in to the public domain and the chain the wallet is on', async () => {
    const { message, v } = await signIn(request.agent(app), privateKeyToAccount(generatePrivateKey()), 1);
    expect(message.startsWith(`${HOST} wants you to sign in`)).toBe(true);
    expect(message).toContain(`URI: https://${HOST}`);
    expect(message).toContain('Chain ID: 1\n');
    expect(v.body).toMatchObject({ ok: true, redirect: '/register' });
  });

  it('only ADMIN_WALLETS become admins (not simply the first account)', async () => {
    const first = await join(later, 'FirstOne');
    expect(first?.role).toBe('player');
    const admin = await join(boss, 'TheBoss');
    expect(admin?.role).toBe('admin');
  });

  it('promotes an existing account when its wallet is added to ADMIN_WALLETS', async () => {
    config.ADMIN_WALLETS = [boss.address.toLowerCase(), later.address.toLowerCase()];
    const { v } = await signIn(request.agent(app), later);
    expect(v.body.redirect).toBe('/fields');
    expect(db.select().from(users).where(eq(users.username, 'FirstOne')).get()?.role).toBe('admin');
  });

  it('serves link previews, robots.txt and a sitemap with absolute URLs', async () => {
    const home = await request(app).get('/').set('Host', HOST);
    expect(home.text).toContain('<meta name="description"');
    expect(home.text).toMatch(new RegExp(`<meta property="og:image" content="https://${HOST}/static/img/brand/og\\.jpg\\?v=`));
    expect(home.text).toContain('summary_large_image');
    const robots = await request(app).get('/robots.txt').set('Host', HOST);
    expect(robots.text).toContain('Disallow: /admin');
    expect(robots.text).toContain(`Sitemap: https://${HOST}/sitemap.txt`);
    const map = await request(app).get('/sitemap.txt').set('Host', HOST);
    expect(map.text.split('\n')).toContain(`https://${HOST}/help`);
  });
});

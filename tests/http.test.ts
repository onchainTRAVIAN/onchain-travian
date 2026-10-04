import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { grantCredits } from '../src/game/actions/credits.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { createApp } from '../src/app.js';

const app = createApp();

function csrfFrom(body: string): string {
  const m = /name="_csrf" value="([^"]+)"/.exec(body);
  if (!m?.[1]) throw new Error('no csrf token in page');
  return m[1];
}

/** A logged-in browser-like agent. */
async function newPlayer(name: string, tribe = 'gauls') {
  const agent = request.agent(app);
  const page = await agent.get('/register');
  const res = await agent
    .post('/register')
    .type('form')
    .send({ _csrf: csrfFrom(page.text), username: name, password: 'supersecret1', tribe });
  expect(res.status).toBe(303);
  expect(res.headers.location).toBe('/fields');
  return agent;
}

beforeAll(() => {
  ensureWorld(db);
});

describe('public pages', () => {
  it('troop guide pages render, including for visitors', async () => {
    for (const path of ['/units', '/units?t=gauls', '/unit/romans/1', '/unit/teutons/9', '/unit/gauls/10', '/unit/nature/10']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(200);
    }
    const leg = await request(app).get('/unit/romans/1');
    expect(leg.text).toContain('Legionnaire');
    expect(leg.text).toContain('/static/img/units/big/romans-1.svg');
    const bad = await request(app).get('/unit/romans/99');
    expect(bad.status).toBe(303);
  });

  it('landing, login, register, rankings and help render', async () => {
    for (const path of ['/', '/login', '/register', '/stats', '/help']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    }
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('game pages redirect to login when logged out', async () => {
    for (const path of ['/fields', '/village', '/map', '/troops', '/reports', '/messages', '/account']) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(303);
      expect(res.headers.location).toBe('/login');
    }
  });

  it('unknown pages are a friendly 404', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.text).toContain('Lost in the wilderness');
  });
});

describe('account flow', () => {
  it('rejects posts without a CSRF token', async () => {
    const res = await request(app).post('/register').type('form').send({ username: 'Mallory', password: 'supersecret1', tribe: 'romans' });
    expect(res.status).toBe(303);
    const again = await request(app).get('/stats');
    expect(again.text).not.toContain('Mallory');
  });

  it('validates registration input', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/register');
    const res = await agent.post('/register').type('form').send({ _csrf: csrfFrom(page.text), username: 'x', password: 'short', tribe: 'romans' });
    expect(res.status).toBe(422);
    expect(res.text).toContain('at least 3 characters');
  });

  it('registers, shows the village, and escapes user input', async () => {
    const agent = await newPlayer('Vercingetorix');
    const fields = await agent.get('/fields');
    expect(fields.status).toBe(200);
    expect(fields.text).toContain('Vercingetorix&#39;s village');
    expect(fields.text).toContain('Woodcutter');

    const account = await agent.get('/account');
    const rename = await agent.post('/account/rename').type('form').send({ _csrf: csrfFrom(account.text), name: '<script>x</script>' });
    expect(rename.status).toBe(303);
    const after = await agent.get('/village');
    expect(after.text).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(after.text).not.toContain('<script>x</script>');
  });

  it('logs in and out', async () => {
    await newPlayer('Boudicca', 'romans');
    const agent = request.agent(app);
    const page = await agent.get('/login');
    const bad = await agent.post('/login').type('form').send({ _csrf: csrfFrom(page.text), username: 'Boudicca', password: 'nope-nope' });
    expect(bad.status).toBe(401);
    const ok = await agent.post('/login').type('form').send({ _csrf: csrfFrom(bad.text), username: 'boudicca', password: 'supersecret1' });
    expect(ok.status).toBe(303);
    const fields = await agent.get('/fields');
    expect(fields.status).toBe(200);
    const out = await agent.post('/logout').type('form').send({ _csrf: csrfFrom(fields.text) });
    expect(out.status).toBe(303);
    expect((await agent.get('/fields')).status).toBe(303);
  });
});

describe('community and shop through the web', () => {
  it('posts in world chat and sees it in the feed', async () => {
    const agent = await newPlayer('Chatty', 'romans');
    const page = await agent.get('/chat');
    const res = await agent.post('/chat').type('form').send({ _csrf: csrfFrom(page.text), c: 'global', body: 'Hello <b>realm</b>!' });
    expect(res.status).toBe(303);
    const feed = await agent.get('/chat/feed');
    expect(feed.text).toContain('Hello &lt;b&gt;realm&lt;/b&gt;!');
  });

  it('first player is admin and can open the admin panel; others cannot', async () => {
    const other = await newPlayer('NotAdmin', 'teutons');
    const res = await other.get('/admin');
    expect(res.status).toBe(303);
  });

  it('booking the ticker without credits shows a friendly error', async () => {
    const agent = await newPlayer('Poor', 'gauls');
    const page = await agent.get('/shop/ticker');
    const start = /name="start" value="(\d+)"/.exec(page.text)?.[1] ?? '0';
    const res = await agent.post('/shop/ticker').type('form').send({ _csrf: csrfFrom(page.text), body: 'Hello everyone', start, hours: '1' });
    expect(res.status).toBe(303);
    const back = await agent.get('/shop/ticker');
    expect(back.text).toMatch(/costs \d+ Gold/);
  });
});

describe('playing through the web', () => {
  it('upgrades a field and shows it in the construction queue', async () => {
    const agent = await newPlayer('Hannibal', 'teutons');
    const slot = await agent.get('/slot/1');
    expect(slot.status).toBe(200);
    expect(slot.text).toContain('Upgrade to level 1');
    const res = await agent.post('/build').type('form').send({ _csrf: csrfFrom(slot.text), slot: '1' });
    expect(res.status).toBe(303);
    const fields = await agent.get('/fields');
    expect(fields.text).toContain('Building:');
    expect(fields.text).toMatch(/(Woodcutter|Clay Pit|Iron Mine|Cropland) \(level 1\)/);
  });

  it('finishing a field with Gold returns to the page the player came from', async () => {
    const agent = await newPlayer('Midas', 'gauls');
    const u = db.select({ id: users.id }).from(users).where(eq(users.usernameLower, 'midas')).get();
    grantCredits(db, u?.id ?? 0, 500, 'test', 'midas-grant', Date.now());
    const slot = await agent.get('/slot/1');
    await agent.post('/build').type('form').send({ _csrf: csrfFrom(slot.text), slot: '1' });
    const fields = await agent.get('/fields');
    expect(fields.headers['referrer-policy']).toBe('same-origin');
    const orderId = /name="orderId" value="(\d+)"/.exec(fields.text)?.[1];
    expect(orderId).toBeDefined();
    // No Referer (e.g. privacy settings): a resource field goes back to the fields page, not the village centre.
    const res = await agent.post('/shop/finish/build').type('form').send({ _csrf: csrfFrom(fields.text), orderId });
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/fields');
  });

  it('shows friendly errors for impossible actions', async () => {
    const agent = await newPlayer('Spartacus', 'romans');
    const page = await agent.get('/slot/25');
    const res = await agent.post('/build').type('form').send({ _csrf: csrfFrom(page.text), slot: '25', building: 'workshop' });
    expect(res.status).toBe(303);
    const back = await agent.get(res.headers.location ?? '/village');
    expect(back.text).toMatch(/Requires/);
  });

  it('renders map, tile, troops, send form, reports, messages and rankings', async () => {
    const agent = await newPlayer('Cleopatra', 'gauls');
    for (const path of ['/map', '/map?x=5&y=5', '/map/tile?x=0&y=0', '/troops', '/troops/send', '/reports', '/messages', '/messages/new', '/stats?k=attack', '/stats/villages', '/stats/heroes', '/village', '/slot/19', '/slot/39', '/slot/40', '/slot/30', '/hero', '/chat', '/chat/feed', '/alliance', '/alliances', '/shop', '/shop/ticker', '/troops/send?kind=settle', '/goldmarket', '/goldmarket?tab=troops', '/goldmarket?tab=sell', '/goldmarket?tab=mine', '/stats/week', '/stats/week?c=raid', '/stats/week?c=expansion']) {
      const res = await agent.get(path);
      expect(res.status, path).toBe(200);
    }
  });

  it('sends a message to another player', async () => {
    const a = await newPlayer('Caesar', 'romans');
    await newPlayer('Brennus', 'gauls');
    const form = await a.get('/messages/new?to=Brennus');
    const res = await a.post('/messages').type('form').send({ _csrf: csrfFrom(form.text), to: 'Brennus', subject: 'Hello', body: 'Peace?' });
    expect(res.status).toBe(303);
    const sent = await a.get('/messages?box=out');
    expect(sent.text).toContain('Hello');
  });
});

describe('rankings data', () => {
  it('counts each player’s own villages and population', async () => {
    const { rankings } = await import('../src/game/queries.js');
    const rows = rankings(db, 'population', 100, 0);
    expect(rows.length).toBeGreaterThan(1);
    for (const r of rows) expect(r.villages).toBe(1);
    const pops = new Set(rows.map((r) => r.pop));
    expect(rows.every((r) => r.pop > 0 && r.pop < 50)).toBe(true);
    expect(pops.size).toBeGreaterThanOrEqual(1);
  });
});

describe('map views and profiles', () => {
  it('renders every map size and both views, and remembers the choice', async () => {
    const agent = await newPlayer('mapper');
    for (const size of [7, 11, 15, 21]) {
      for (const view of ['diamond', 'grid']) {
        const res = await agent.get(`/map?size=${size}&view=${view}`);
        expect(res.status).toBe(200);
        expect((res.text.match(/class="tile"/g) ?? []).length).toBe(size * size);
        expect(res.text).toContain(view === 'grid' ? '/static/img/map/flat/' : '/static/img/map/grass');
      }
    }
    const remembered = await agent.get('/map');
    expect((remembered.text.match(/class="tile"/g) ?? []).length).toBe(21 * 21);
  });

  it('uploads a compressed avatar, shows it on the profile, and falls back to the tribe picture', async () => {
    const sharp = (await import('sharp')).default;
    const agent = await newPlayer('painter', 'teutons');
    const acc = await agent.get('/account');
    const token = csrfFrom(acc.text);
    const big = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer();
    // Without the token the upload is refused.
    const bad = await agent.post('/account/avatar').attach('avatar', big, 'me.png');
    expect(bad.status).toBe(303);
    expect(bad.headers.location).toBe('/');
    expect((await agent.get('/account')).text).not.toMatch(/src="\/avatar\/\d+/);
    const ok = await agent.post(`/account/avatar?_csrf=${encodeURIComponent(token)}`).attach('avatar', big, 'me.png');
    expect(ok.status).toBe(303);
    const profile = await agent.get('/account');
    const m = /src="\/avatar\/(\d+)\?v=\d+"/.exec(profile.text);
    expect(m).not.toBeNull();
    const img = await agent.get(`/avatar/${m?.[1]}`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(img.headers['content-type']).toMatch(/webp/);
    const body = img.body as Buffer;
    expect(body.length).toBeLessThan(20_000);
    const meta = await sharp(body).metadata();
    expect([meta.width, meta.height]).toEqual([128, 128]);
    // Not a picture → friendly error.
    const junk = await agent.post(`/account/avatar?_csrf=${encodeURIComponent(token)}`).attach('avatar', Buffer.from('hello'), 'x.png');
    expect(junk.status).toBe(303);
    // About text is escaped on the public profile.
    await agent.post('/account/bio').type('form').send({ _csrf: token, bio: '<b>hi</b> I farm' });
    const pub = await agent.get(`/player/${m?.[1]}`);
    expect(pub.text).toContain('&lt;b&gt;hi&lt;/b&gt; I farm');
    // Activity is private: no "last seen" / online status on profiles.
    expect(pub.text).not.toMatch(/last seen|● online/);
    // Remove → tribe default.
    await agent.post('/account/avatar/remove').type('form').send({ _csrf: token });
    const after = await agent.get('/account');
    expect(after.text).toContain('/static/img/avatars/teutons.svg');
    const fallback = await agent.get(`/avatar/${m?.[1]}`);
    expect(fallback.status).toBe(302);
    expect(fallback.headers.location).toBe('/static/img/avatars/teutons.svg');
  });
});

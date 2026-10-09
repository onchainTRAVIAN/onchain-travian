import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { db } from '../src/db/index.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { createApp } from '../src/app.js';
import { TIPS, help } from '../src/web/views/tips.js';

const app = createApp();

function csrfFrom(body: string): string {
  const m = /name="_csrf" value="([^"]+)"/.exec(body);
  if (!m?.[1]) throw new Error('no csrf token in page');
  return m[1];
}

beforeAll(() => {
  ensureWorld(db);
});

describe('help bubbles', () => {
  it('every tip is short plain text without the long dash', () => {
    for (const [key, text] of Object.entries(TIPS)) {
      expect(text.length, key).toBeGreaterThan(10);
      expect(text.length, key).toBeLessThan(260);
      expect(text, key).not.toContain('—');
      expect(text, key).not.toContain('undefined');
      expect(text, key).not.toContain('NaN');
    }
  });

  it('renders an accessible, escaped "?"', () => {
    const out = String(help('cranny'));
    expect(out).toContain('class="qh"');
    expect(out).toContain('tabindex="0"');
    expect(out).toContain('aria-label="Help: ');
    expect(out).not.toMatch(/data-help="[^"]*</);
  });

  it('game pages show bubbles', async () => {
    const agent = request.agent(app);
    const page = await agent.get('/register');
    await agent.post('/register').type('form').send({ _csrf: csrfFrom(page.text), username: 'Helpful', password: 'supersecret1', tribe: 'romans' });
    for (const path of ['/fields', '/production', '/hero', '/shop']) {
      const res = await agent.get(path);
      expect(res.status, path).toBe(200);
      expect(res.text, path).toContain('class="qh"');
    }
  });
});

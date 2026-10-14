import request from 'supertest';
import type { Express } from 'express';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

export function csrfFrom(body: string): string {
  const m = /name="_csrf" value="([^"]+)"|data-csrf="([^"]+)"/.exec(body);
  const t = m?.[1] ?? m?.[2];
  if (!t) throw new Error('no csrf token in page');
  return t;
}

/** Sign in with a wallet the way wallet.js does: challenge, personal_sign, verify. Returns the verify response. */
export async function walletSignIn(agent: ReturnType<typeof request.agent>, account: PrivateKeyAccount) {
  const page = await agent.get('/login');
  const _csrf = csrfFrom(page.text);
  // supertest listens on a new port per request; the SIWE domain must stay the same
  const c = await agent.post('/wallet/challenge').set('Host', 'game.test').send({ _csrf, address: account.address, purpose: 'login' });
  if (!c.body.ok) throw new Error(`challenge failed: ${c.body.error}`);
  const signature = await account.signMessage({ message: c.body.message as string });
  return agent.post('/wallet/verify').set('Host', 'game.test').send({ _csrf, message: c.body.message, signature, purpose: 'login' });
}

/** A new player who joined with a fresh wallet; a logged-in browser-like agent. */
export async function walletPlayer(app: Express, name: string, tribe = 'gauls', account = privateKeyToAccount(generatePrivateKey())) {
  const agent = request.agent(app);
  const v = await walletSignIn(agent, account);
  if (v.body.redirect !== '/register') throw new Error(`expected signup, got ${JSON.stringify(v.body)}`);
  const page = await agent.get('/register');
  const res = await agent.post('/register').type('form').send({ _csrf: csrfFrom(page.text), username: name, tribe });
  if (res.status !== 303 || res.headers.location !== '/fields') throw new Error(`register failed: ${res.status} ${/class="flash[^>]*>([^<]*)/.exec(res.text)?.[1] ?? res.text.slice(0, 300)}`);
  return { agent, account };
}

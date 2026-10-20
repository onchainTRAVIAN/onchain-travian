import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createPublicClient, createTestClient, createWalletClient, http, parseEther, type Address, type Hex, type PublicClient } from 'viem';
import { generatePrivateKey, mnemonicToAccount, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { db } from '../src/db/index.js';
import { entryPayments, meta, users } from '../src/db/schema.js';
import { config } from '../src/config.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { createApp } from '../src/app.js';
import { setEthUsd } from '../src/crypto/pricing.js';
import { setPublicClient } from '../src/crypto/chain.js';
import { entryStatus, indexEntries, recordEntries } from '../src/crypto/entry.js';
import { gameEntryAbi } from '../src/crypto/gameEntry.js';
import { csrfFrom, walletSignIn } from './walletAuth.js';

const saved = { ...config };
const app = createApp();
let n = 0;
const pay = (player: string, usd: number) => recordEntries(db, [{ id: `0x${(++n).toString(16).padStart(64, '0')}:0`, player, amount: parseEther(String(usd / 2000)), blockNumber: 1n }], clock.now());
const fresh = () => privateKeyToAccount(generatePrivateKey());

/** A wallet that signed in and now stands on /register. */
async function atJoin(account: PrivateKeyAccount) {
  const agent = request.agent(app);
  const v = await walletSignIn(agent, account);
  expect(v.body.redirect).toBe('/register');
  return { agent, page: await agent.get('/register') };
}

const attr = (html: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(html)?.[1] ?? '';

beforeAll(() => {
  ensureWorld(db);
  // $1 entry fee; ETH at $2000 (so $1 = 0.0005 ETH). RPC/contract only need to be set for the fee to be on.
  Object.assign(config, { ENTRY_FEE_USD: 1, ENTRY_ADDRESS: '0x00000000000000000000000000000000000000e1', RPC_URL: 'http://127.0.0.1:9', ADMIN_WALLETS: [] });
  setEthUsd(2000, clock.now());
});

afterAll(() => {
  Object.assign(config, saved);
});

describe('entry fee rules', () => {
  it('counts a wallet as paid at the fee (5% leeway for the ETH price), adds up top-ups and ignores dust', () => {
    const a = fresh().address;
    expect(entryStatus(db, a)).toEqual({ paid: false, paidCents: 0, dueUsd: 1 });
    expect(pay(a, 0.005)).toBe(0); // dust is not even stored
    pay(a, 0.6);
    expect(entryStatus(db, a)).toEqual({ paid: false, paidCents: 60, dueUsd: 0.4 });
    pay(a, 0.4);
    expect(entryStatus(db, a).paid).toBe(true);
    const b = fresh().address;
    pay(b, 0.96); // the price moved a little while paying
    expect(entryStatus(db, b).paid).toBe(true);
  });

  it('records each payment once', () => {
    const a = fresh().address;
    const log = { id: `0x${'ab'.repeat(32)}:3`, player: a, amount: parseEther('0.0005'), blockNumber: 7n };
    expect(recordEntries(db, [log], clock.now())).toBe(1);
    expect(recordEntries(db, [log], clock.now())).toBe(0);
    expect(entryStatus(db, a).paidCents).toBe(100);
  });

  it('the background reader asks for smaller block ranges when the RPC refuses big ones', async () => {
    const asked: bigint[] = [];
    const rpc = {
      getBlockNumber: async () => 5000n,
      getLogs: async ({ fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint }) => {
        asked.push(toBlock - fromBlock + 1n);
        if (toBlock - fromBlock + 1n > 100n) throw new Error('block range too large');
        return [];
      },
    } as unknown as PublicClient;
    const r = await indexEntries(db, rpc, clock.now());
    expect(r?.to).toBe(5000n - BigInt(config.CONFIRMATIONS));
    expect(asked.slice(0, 4)).toEqual([2000n, 400n, 80n, 80n]);
    db.delete(meta).where(eq(meta.key, 'entry_indexer_block')).run();
  });
});

describe('joining a world with an entry fee', () => {
  it('asks a new wallet to pay first and quotes the ETH for $1', async () => {
    const { agent, page } = await atJoin(fresh());
    expect(page.text).toContain('Step 1 of 2: entry fee');
    expect(page.text).not.toContain('name="username"');
    expect(attr(page.text, 'data-entry-wei')).toBe(parseEther('0.0005').toString());
    expect(attr(page.text, 'data-entry-to').toLowerCase()).toBe('0x00000000000000000000000000000000000000e1');
    // Skipping the step does not work.
    const res = await agent.post('/register').type('form').send({ _csrf: csrfFrom(page.text), username: 'Freeloader', tribe: 'gauls' });
    expect(res.status).toBe(409);
    expect(res.text).toContain('Pay the $1 entry fee first.');
    expect(db.select().from(users).where(eq(users.username, 'Freeloader')).get()).toBeUndefined();
  });

  it('opens name + tribe once paid, and the payment then belongs to the new account', async () => {
    const acc = fresh();
    const { agent } = await atJoin(acc);
    pay(acc.address, 1);
    const page = await agent.get('/register');
    expect(page.text).toContain('entry fee paid');
    const res = await agent.post('/register').type('form').send({ _csrf: csrfFrom(page.text), username: 'Payer', tribe: 'romans' });
    expect(res.headers.location).toBe('/fields');
    const user = db.select().from(users).where(eq(users.username, 'Payer')).get();
    const rows = db.select().from(entryPayments).where(eq(entryPayments.payer, acc.address.toLowerCase())).all();
    expect(rows.map((r) => r.userId)).toEqual([user?.id]);
  });

  it('shows what is left after a short payment', async () => {
    const acc = fresh();
    pay(acc.address, 0.5);
    const { page } = await atJoin(acc);
    expect(page.text).toContain('This wallet has paid $0.50 so far');
    expect(page.text).toContain('Pay $0.50 and continue');
    expect(attr(page.text, 'data-entry-wei')).toBe(parseEther('0.00025').toString());
  });

  it('admin wallets never pay', async () => {
    const boss = fresh();
    config.ADMIN_WALLETS = [boss.address.toLowerCase()];
    try {
      const { page } = await atJoin(boss);
      expect(page.text).toContain('name="username"');
    } finally {
      config.ADMIN_WALLETS = [];
    }
  });

  it('tells visitors about the fee and guards the payment check', async () => {
    const home = await request(app).get('/');
    expect(home.text).toContain('A new account costs a one-time $1 entry fee in ETH.');
    const page = await request(app).get('/login');
    const anon = await request(app).post('/register/paid').send({ _csrf: csrfFrom(page.text), txHash: `0x${'1'.repeat(64)}` });
    expect(anon.status).toBe(403); // no session cookie: the CSRF check stops it first
    const { agent, page: join } = await atJoin(fresh());
    const bad = await agent.post('/register/paid').send({ _csrf: csrfFrom(join.text), txHash: '0x123' });
    expect(bad.status).toBe(400);
  });
});

/* ------------------------------------------------------------------ */
/* The real thing against a local anvil node (skipped if missing).    */
/* ------------------------------------------------------------------ */

const ANVIL = join(homedir(), '.foundry/bin/anvil');
const OUT = join(import.meta.dirname, '../contracts/out');
const hasChain = existsSync(ANVIL) && existsSync(join(OUT, 'GameEntry.sol/GameEntry.json'));
const PORT = 19545 + Math.floor(Math.random() * 1000);
// Anvil's well-known development mnemonic (funded accounts on a local node only).
const MNEMONIC = 'test test test test test test test test test test test junk';
const DEPLOYER = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
const TREASURY: Address = mnemonicToAccount(MNEMONIC, { addressIndex: 1 }).address;

describe.skipIf(!hasChain)('entry fee on chain (anvil)', () => {
  let anvil: ChildProcess;
  let client: PublicClient;
  let entry: Address;
  const transport = http(`http://127.0.0.1:${PORT}`);
  const test = createTestClient({ mode: 'anvil', chain: foundry, transport });

  /** A funded player wallet that sends exactly what the join page asks for. */
  async function payFromPage(account: PrivateKeyAccount, html: string): Promise<Hex> {
    const w = createWalletClient({ account, chain: foundry, transport });
    return w.sendTransaction({ to: attr(html, 'data-entry-to') as Address, value: BigInt(attr(html, 'data-entry-wei')), data: attr(html, 'data-entry-data') as Hex });
  }

  async function funded() {
    const acc = fresh();
    await test.setBalance({ address: acc.address, value: parseEther('1') });
    return acc;
  }

  beforeAll(async () => {
    anvil = spawn(ANVIL, ['--port', String(PORT), '--silent'], { stdio: 'ignore' });
    client = createPublicClient({ chain: foundry, transport }) as PublicClient;
    for (let i = 0; i < 50; i++) {
      try {
        await client.getBlockNumber();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const bytecode = (JSON.parse(readFileSync(join(OUT, 'GameEntry.sol/GameEntry.json'), 'utf8')) as { bytecode: { object: Hex } }).bytecode.object;
    const deployer = createWalletClient({ account: DEPLOYER, chain: foundry, transport });
    entry = (await client.waitForTransactionReceipt({ hash: await deployer.deployContract({ abi: gameEntryAbi, bytecode, args: [TREASURY] }) })).contractAddress as Address;
    Object.assign(config, { ENTRY_ADDRESS: entry, RPC_URL: `http://127.0.0.1:${PORT}`, CONFIRMATIONS: 2 });
    setPublicClient(client);
  }, 30_000);

  afterAll(() => {
    setPublicClient(undefined);
    anvil?.kill();
  });

  it('a player pays from the join page, waits for confirmations and founds a village', async () => {
    const acc = await funded();
    const { agent, page } = await atJoin(acc);
    const before = await client.getBalance({ address: TREASURY });
    const hash = await payFromPage(acc, page.text);
    const _csrf = csrfFrom(page.text);
    const first = await agent.post('/register/paid').send({ _csrf, txHash: hash });
    expect(first.body).toMatchObject({ ok: true, state: 'pending' });
    await test.mine({ blocks: 2 });
    const done = await agent.post('/register/paid').send({ _csrf, txHash: hash });
    expect(done.body).toMatchObject({ ok: true, state: 'paid', paidUsd: 1 });
    expect((await client.getBalance({ address: TREASURY })) - before).toBe(parseEther('0.0005'));
    const form = await agent.get('/register');
    const res = await agent.post('/register').type('form').send({ _csrf: csrfFrom(form.text), username: 'ChainJoiner', tribe: 'teutons' });
    expect(res.headers.location).toBe('/fields');
  });

  it("someone else's payment does not count for this wallet", async () => {
    const payer = await funded();
    const { page } = await atJoin(payer);
    const hash = await payFromPage(payer, page.text);
    await test.mine({ blocks: 2 });
    const other = await atJoin(fresh());
    const r = await other.agent.post('/register/paid').send({ _csrf: csrfFrom(other.page.text), txHash: hash });
    expect(r.body.state).toBe('missing');
  });

  it('the background reader finds payments of players who closed the page', async () => {
    const acc = await funded();
    const { agent, page } = await atJoin(acc);
    await payFromPage(acc, page.text);
    await test.mine({ blocks: 2 });
    const r = await indexEntries(db, client, clock.now());
    expect(r?.found).toBeGreaterThanOrEqual(1);
    expect((await agent.get('/register')).text).toContain('name="username"');
    // Reading the same blocks again (e.g. after a crash) stores nothing twice.
    db.delete(meta).where(eq(meta.key, 'entry_indexer_block')).run();
    expect((await indexEntries(db, client, clock.now()))?.found).toBe(0);
  });

  it('a short payment asks for the rest', async () => {
    const acc = await funded();
    const { agent, page } = await atJoin(acc);
    const w = createWalletClient({ account: acc, chain: foundry, transport });
    const hash = await w.sendTransaction({ to: entry, value: parseEther('0.0002'), data: attr(page.text, 'data-entry-data') as Hex });
    await test.mine({ blocks: 2 });
    const r = await agent.post('/register/paid').send({ _csrf: csrfFrom(page.text), txHash: hash });
    expect(r.body).toMatchObject({ state: 'short', paidUsd: 0.4, dueUsd: 0.6 });
  });
});

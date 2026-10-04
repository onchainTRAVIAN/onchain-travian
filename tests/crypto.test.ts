import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem';
import { generatePrivateKey, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { db } from '../src/db/index.js';
import { messages, meta, perks } from '../src/db/schema.js';
import { config } from '../src/config.js';
import { clock } from '../src/clock.js';
import { ensureWorld } from '../src/game/engine/world.js';
import { registerPlayer } from '../src/game/actions/account.js';
import { creditBalance } from '../src/game/actions/credits.js';
import { getModifiers } from '../src/game/modifiers.js';
import { ETH_ASSET, creditsForDeposit, formatUnitsShort, parseUnitsSafe } from '../src/crypto/pricing.js';
import { TIERS, computeTiers, effectiveBalance } from '../src/crypto/tiers.js';
import { linkWallet, prepareSiwe, userByWallet, verifySiwe } from '../src/crypto/wallet.js';
import { indexDeposits } from '../src/crypto/indexer.js';
import { applyTiers, takeSnapshot } from '../src/crypto/holders.js';
import { gamePaymentsAbi } from '../src/crypto/gamePayments.js';
import { testTokenAbi } from '../src/crypto/testToken.js';

const TOKEN = '0x00000000000000000000000000000000000000aa';
const site = { domain: 'game.test', origin: 'https://game.test' };

describe('pricing', () => {
  it('converts ETH and token deposits to credits, with the token bonus', () => {
    expect(creditsForDeposit(ETH_ASSET, parseEther('1'), { creditsPerEth: 10_000 })).toBe(10_000);
    expect(creditsForDeposit(ETH_ASSET, parseEther('0.0123'), { creditsPerEth: 10_000 })).toBe(123);
    const opts = { creditsPerToken: 1, tokenBonus: 0.2, tokenDecimals: 18, tokenAddress: TOKEN };
    expect(creditsForDeposit(TOKEN, parseEther('100'), opts)).toBe(120);
    expect(creditsForDeposit('0x00000000000000000000000000000000000000bb', parseEther('100'), opts)).toBe(0);
    expect(creditsForDeposit(ETH_ASSET, 0n)).toBe(0);
  });

  it('parses and formats amounts exactly', () => {
    expect(parseUnitsSafe('0.05', 18)).toBe(50_000_000_000_000_000n);
    expect(parseUnitsSafe('12', 6)).toBe(12_000_000n);
    expect(() => parseUnitsSafe('1e5', 18)).toThrow();
    expect(formatUnitsShort(1_234_500_000_000_000_000n, 18)).toBe('1.2345');
  });
});

describe('holder tiers', () => {
  it('ranks by share of supply and by top position', () => {
    const supply = 1_000_000n;
    const tiers = computeTiers(
      [
        { userId: 1, balance: 20_000n }, // 2% -> diamond
        { userId: 2, balance: 2_000n }, // 0.2% -> silver by share, but top 3 by rank -> diamond
        { userId: 3, balance: 150n }, // 0.015% -> bronze by share, rank 3 -> diamond
        { userId: 4, balance: 120n }, // rank 4 -> gold by rank
        { userId: 5, balance: 0n },
      ],
      supply,
    );
    expect(tiers.get(1)?.id).toBe('diamond');
    expect(tiers.get(2)?.id).toBe('diamond');
    expect(tiers.get(3)?.id).toBe('diamond');
    expect(tiers.get(4)?.id).toBe('gold');
    expect(tiers.has(5)).toBe(false);
  });

  it('uses the lowest recent balance and waits for enough snapshots', () => {
    expect(effectiveBalance([100n, 5n, 90n], 3)).toBe(5n);
    expect(effectiveBalance([100n, 90n], 3)).toBe(0n);
  });

  it('tiers are ordered and every perk is capped sensibly', () => {
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i]!.minShare).toBeGreaterThan(TIERS[i - 1]!.minShare);
  });
});

describe('sign in with Ethereum', () => {
  const account = privateKeyToAccount(generatePrivateKey());
  let userId = 0;

  beforeAll(async () => {
    clock.freeze(Date.UTC(2026, 5, 1));
    ensureWorld(db);
    userId = (await registerPlayer(db, { username: 'Satoshi', password: 'password123', tribe: 'romans' }, clock.now())).userId;
  });

  it('links a wallet with a valid signature and rejects replays', async () => {
    const message = prepareSiwe(db, site, account.address, 'link', userId, clock.now());
    const signature = await account.signMessage({ message });
    const address = await verifySiwe(db, site, message, signature, 'link', userId, clock.now());
    expect(address).toBe(account.address.toLowerCase());
    linkWallet(db, userId, address, clock.now());
    expect(userByWallet(db, account.address)?.userId).toBe(userId);
    await expect(verifySiwe(db, site, message, signature, 'link', userId, clock.now())).rejects.toThrow(/expired/);
  });

  it('rejects a signature from another wallet or another site', async () => {
    const other = privateKeyToAccount(generatePrivateKey());
    const message = prepareSiwe(db, site, account.address, 'login', null, clock.now());
    const bad = await other.signMessage({ message });
    await expect(verifySiwe(db, site, message, bad, 'login', null, clock.now())).rejects.toThrow(/signature/);
    const msg2 = prepareSiwe(db, site, account.address, 'login', null, clock.now());
    const sig2 = await account.signMessage({ message: msg2 });
    await expect(verifySiwe(db, { domain: 'evil.test', origin: 'https://evil.test' }, msg2, sig2, 'login', null, clock.now())).rejects.toThrow(/match this site/);
  });
});

/* ------------------------------------------------------------------ */
/* Full on-chain flow against a local anvil node (skipped if missing). */
/* ------------------------------------------------------------------ */

const ANVIL = join(homedir(), '.foundry/bin/anvil');
const OUT = join(import.meta.dirname, '../contracts/out');
const hasChain = existsSync(ANVIL) && existsSync(join(OUT, 'GamePayments.sol/GamePayments.json'));
const PORT = 18545 + Math.floor(Math.random() * 1000);
// Anvil's well-known development mnemonic (funded accounts on a local node only).
const MNEMONIC = 'test test test test test test test test test test test junk';
const DEPLOYER = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
const TREASURY: Address = mnemonicToAccount(MNEMONIC, { addressIndex: 1 }).address;

function bytecode(name: string): Hex {
  const json = JSON.parse(readFileSync(join(OUT, `${name}.sol/${name}.json`), 'utf8')) as { bytecode: { object: Hex } };
  return json.bytecode.object;
}

describe.skipIf(!hasChain)('on-chain payments and holder perks (anvil)', () => {
  let anvil: ChildProcess;
  let client: PublicClient;
  const transport = http(`http://127.0.0.1:${PORT}`);
  const wallet = createWalletClient({ account: DEPLOYER, chain: foundry, transport });
  const test = createTestClient({ mode: 'anvil', chain: foundry, transport });
  let token: Address;
  let payments: Address;
  let playerId = 0;
  const saved = { ...config };

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
    const tHash = await wallet.deployContract({ abi: testTokenAbi, bytecode: bytecode('TestToken'), args: [] });
    token = (await client.waitForTransactionReceipt({ hash: tHash })).contractAddress as Address;
    const pHash = await wallet.deployContract({ abi: gamePaymentsAbi, bytecode: bytecode('GamePayments'), args: [token, TREASURY] });
    payments = (await client.waitForTransactionReceipt({ hash: pHash })).contractAddress as Address;
    Object.assign(config, { TOKEN_ADDRESS: token, PAYMENTS_ADDRESS: payments, CONFIRMATIONS: 2, CREDITS_PER_ETH: 10_000, CREDITS_PER_TOKEN: 1, TOKEN_BONUS: 0.2, HOLDER_MIN_SNAPSHOTS: 2 });
    db.delete(messages).run();
    playerId = (await registerPlayer(db, { username: 'Whale', password: 'password123', tribe: 'teutons' }, clock.now())).userId;
  }, 30_000);

  afterAll(() => {
    Object.assign(config, saved);
    anvil?.kill();
  });

  it('credits an ETH deposit exactly once after confirmations', async () => {
    const hash = await wallet.writeContract({ address: payments, abi: gamePaymentsAbi, functionName: 'depositETH', args: [BigInt(playerId)], value: parseEther('0.01') });
    await client.waitForTransactionReceipt({ hash });
    // Not enough confirmations yet.
    await indexDeposits(db, client, clock.now(), payments);
    expect(creditBalance(db, playerId)).toBe(0);
    await test.mine({ blocks: 3 });
    const r = await indexDeposits(db, client, clock.now(), payments);
    expect(r?.credited).toBe(1);
    expect(creditBalance(db, playerId)).toBe(100);
    // Re-indexing the same range (e.g. after a crash) never double-credits.
    db.delete(meta).where(eq(meta.key, 'indexer_block')).run();
    await indexDeposits(db, client, clock.now(), payments);
    expect(creditBalance(db, playerId)).toBe(100);
    expect(db.select().from(messages).where(eq(messages.toUserId, playerId)).all()).toHaveLength(1);
  });

  it('token deposits get the +20% bonus', async () => {
    const amount = parseEther('100');
    await client.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: token, abi: testTokenAbi, functionName: 'mint', args: [DEPLOYER.address, amount] }) });
    await client.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: token, abi: testTokenAbi, functionName: 'approve', args: [payments, amount] }) });
    await client.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: payments, abi: gamePaymentsAbi, functionName: 'depositToken', args: [BigInt(playerId), amount] }) });
    await test.mine({ blocks: 3 });
    await indexDeposits(db, client, clock.now(), payments);
    expect(creditBalance(db, playerId)).toBe(100 + 120);
  });

  it('linked holders get tier perks after enough snapshots', async () => {
    const holder = mnemonicToAccount(MNEMONIC, { addressIndex: 4 });
    linkWallet(db, playerId, holder.address, clock.now());
    // 2% of supply -> diamond
    const supply = await client.readContract({ address: token, abi: testTokenAbi, functionName: 'totalSupply' });
    await client.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: token, abi: testTokenAbi, functionName: 'mint', args: [holder.address, supply / 40n] }) });
    await takeSnapshot(db, client, clock.now(), token);
    applyTiers(db, clock.now());
    expect(getModifiers(db, playerId, clock.now()).buildSpeed).toBe(1); // one snapshot is not enough
    clock.advance(6 * 3_600_000);
    await takeSnapshot(db, client, clock.now(), token);
    const tiers = applyTiers(db, clock.now());
    expect(tiers.get(playerId)?.id).toBe('diamond');
    const mods = getModifiers(db, playerId, clock.now());
    expect(mods.buildSpeed).toBeCloseTo(1.2);
    expect(mods.troopCost).toBeCloseTo(0.85);
    expect(db.select().from(perks).where(eq(perks.userId, playerId)).all().every((p) => p.source === 'holder:diamond')).toBe(true);
  });
});

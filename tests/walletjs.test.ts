import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// The browser wallet script (src/web/public/wallet.js) run in a small fake page, against fake wallets.
const SOURCE = readFileSync(new URL('../src/web/public/wallet.js', import.meta.url), 'utf8');

const ACCOUNT = '0x00000000000000000000000000000000000000a1';
const BITCOIN = 'bip122:000000000019d6689c085ae165831e93';

type Req = { method: string; params?: unknown[] };
type Provider = { request(req: Req): Promise<unknown>; isMetaMask?: boolean };
type Caveat = { type: string; value: string[] };
type Perms = Record<string, { caveats?: Caveat[] } | undefined>;

class WalletError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

type FakeOptions = {
  chainId?: string;
  /** The wallet's Bitcoin part is not running (the player's MetaMask on 2026-11-06). */
  bitcoinBroken?: boolean;
  /** Even a grant that names its chains fails the same way. */
  alwaysBroken?: boolean;
  /** The wallet calls itself MetaMask but does not know `endowment:permitted-chains`. */
  noPermittedChains?: boolean;
  refuse?: boolean;
  connected?: boolean;
};

/**
 * MetaMask as of Nov 2026: a connect request that names no chain is granted EVERY network the wallet knows
 * (ui/helpers/utils/connect-default-chains.ts), and a scope the wallet cannot serve fails the grant's validation
 * (@metamask/chain-agnostic-permission caip25Permission.js) with the error the player saw.
 */
function fakeWallet(opts: FakeOptions = {}) {
  const known = ['eip155:1', 'eip155:4663', BITCOIN];
  const calls: Req[] = [];
  let accounts: string[] = opts.connected ? [ACCOUNT] : [];
  const grant = (chains: string[]) => {
    if (opts.refuse) throw new WalletError('User rejected the request.', 4001);
    const scopes = opts.alwaysBroken ? [BITCOIN] : chains.length ? chains.filter((c) => known.includes(c)) : known;
    const unsupported = scopes.filter((s) => s === BITCOIN && (opts.bitcoinBroken || opts.alwaysBroken));
    if (unsupported.length) {
      throw new WalletError(
        `Invalid approved permissions request: endowment:caip25 error: Received scopeString value(s): ${unsupported.join(', ')} for caveat of type "authorizedScopes" that are not supported by the wallet.`,
        -32603,
      );
    }
    accounts = [ACCOUNT];
  };
  const provider: Provider = {
    isMetaMask: true,
    async request({ method, params }) {
      calls.push({ method, params });
      switch (method) {
        case 'eth_chainId':
          return opts.chainId ?? '0x1';
        case 'eth_accounts':
          return accounts;
        case 'eth_requestAccounts':
          if (!accounts.length) grant([]);
          return accounts;
        case 'wallet_requestPermissions': {
          if (opts.noPermittedChains) throw new WalletError('Invalid method parameter(s).', -32602);
          const perms = (params?.[0] ?? {}) as Perms;
          const chains = perms['endowment:permitted-chains']?.caveats?.find((c) => c.type === 'restrictNetworkSwitching')?.value ?? [];
          grant(chains.map((hex) => `eip155:${parseInt(hex, 16)}`));
          return [{ parentCapability: 'eth_accounts' }];
        }
        case 'personal_sign':
          return '0x' + '11'.repeat(65);
        default:
          throw new WalletError(`Unsupported method ${method}`, 4200);
      }
    },
  };
  return { provider, calls, methods: () => calls.map((c) => c.method) };
}

type Listener = (e: FakeEvent) => void;
class FakeEvent {
  readonly detail: unknown;
  constructor(
    readonly type: string,
    init?: { detail?: unknown },
  ) {
    this.detail = init?.detail;
  }
}

/**
 * Loads wallet.js on a front page with one Connect wallet button and presses it. `rdns` = the wallet announces
 * itself through EIP-6963 under that id; null = only window.ethereum. Resolves once the page redirects or shows an error.
 */
async function pressConnect(provider: Provider, rdns: string | null) {
  const listeners = new Map<string, Listener[]>();
  const on = (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  const dispatch = (e: FakeEvent) => {
    for (const fn of listeners.get(e.type) ?? []) fn(e);
    return true;
  };
  const status = { textContent: '', className: '' };
  const attrs: Record<string, string> = { 'data-csrf': 'csrf', 'data-chain': '4663', 'data-chain-name': 'Robinhood Chain' };
  let onClick: ((e: unknown) => void) | undefined;
  const root = {
    getAttribute: (name: string) => attrs[name] ?? null,
    querySelector: (sel: string) => (sel === '[data-status]' ? status : null),
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (type === 'click') onClick = fn;
    },
    contains: () => true,
  };
  const location = { href: '', origin: 'https://travian.forum', pathname: '/', search: '' };
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const fetch = async (url: string, init: { body: string }) => {
    posts.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
    const json = url === '/wallet/challenge' ? { ok: true, message: 'travian.forum wants you to sign in' } : { ok: true, redirect: '/fields' };
    return { status: 200, json: async () => json };
  };
  const page: Record<string, unknown> = {
    document: { querySelector: (sel: string) => (sel === '[data-wallet]' ? root : null) },
    navigator: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/142.0' },
    localStorage: { getItem: () => null, setItem: () => undefined },
    location,
    fetch,
    TextEncoder,
    setTimeout,
    Event: FakeEvent,
    CustomEvent: FakeEvent,
    addEventListener: on,
    dispatchEvent: dispatch,
  };
  page.window = page;
  if (rdns) {
    // The extension answers the page's EIP-6963 request.
    on('eip6963:requestProvider', () =>
      dispatch(new FakeEvent('eip6963:announceProvider', { detail: { info: { uuid: 'w1', name: 'Wallet', icon: '', rdns }, provider } })),
    );
  } else {
    page.ethereum = provider;
  }
  new Script(SOURCE).runInContext(createContext(page));
  if (!onClick) throw new Error('wallet.js did not bind its click handler');
  const button = { disabled: false, getAttribute: (n: string) => (n === 'data-action' ? 'login' : null), hasAttribute: () => false, closest: () => button };
  onClick({ target: button, preventDefault: () => undefined });
  for (let i = 0; i < 500 && !location.href && !status.className.includes('bad'); i++) await new Promise((r) => setImmediate(r));
  return { location, status, posts };
}

function permittedChains(req: Req | undefined) {
  const perms = (req?.params?.[0] ?? {}) as Perms;
  return perms['endowment:permitted-chains']?.caveats?.find((c) => c.type === 'restrictNetworkSwitching')?.value;
}

describe('wallet.js connect (MetaMask that pre-selects every network)', () => {
  it('the fake wallet reproduces the error the player saw with a plain eth_requestAccounts', async () => {
    const { provider } = fakeWallet({ bitcoinBroken: true });
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(
      `endowment:caip25 error: Received scopeString value(s): ${BITCOIN} for caveat of type "authorizedScopes" that are not supported by the wallet.`,
    );
  });

  it('names the wallet’s current network, so MetaMask grants only that and the sign-in completes', async () => {
    const w = fakeWallet({ bitcoinBroken: true, chainId: '0x1237' });
    const page = await pressConnect(w.provider, 'io.metamask');
    expect(page.status.textContent).not.toMatch(/caip25|Bitcoin/);
    expect(page.location.href).toBe('/fields');
    expect(w.methods()).not.toContain('eth_requestAccounts');
    expect(permittedChains(w.calls.find((c) => c.method === 'wallet_requestPermissions'))).toEqual(['0x1237']);
    expect(page.posts[0]).toMatchObject({ url: '/wallet/challenge', body: { address: ACCOUNT, purpose: 'login', chainId: 4663 } });
    expect(page.posts[1]?.url).toBe('/wallet/verify');
  });

  it('works the same through window.ethereum when the wallet does not announce itself', async () => {
    const w = fakeWallet({ bitcoinBroken: true });
    const page = await pressConnect(w.provider, null);
    expect(page.location.href).toBe('/fields');
    expect(permittedChains(w.calls.find((c) => c.method === 'wallet_requestPermissions'))).toEqual(['0x1']);
  });

  it('asks nothing when the site is already connected', async () => {
    const w = fakeWallet({ bitcoinBroken: true, connected: true });
    const page = await pressConnect(w.provider, 'io.metamask');
    expect(page.location.href).toBe('/fields');
    expect(w.methods()).not.toContain('wallet_requestPermissions');
    expect(w.methods()).not.toContain('eth_requestAccounts');
  });

  it('other wallets keep the plain request', async () => {
    const w = fakeWallet();
    const page = await pressConnect(w.provider, 'io.rabby');
    expect(page.location.href).toBe('/fields');
    expect(w.methods()).toContain('eth_requestAccounts');
    expect(w.methods()).not.toContain('wallet_requestPermissions');
  });

  it('falls back to the plain request when the wallet does not know the network permission', async () => {
    const w = fakeWallet({ noPermittedChains: true });
    const page = await pressConnect(w.provider, 'io.metamask');
    expect(page.location.href).toBe('/fields');
    expect(w.methods().filter((m) => m === 'wallet_requestPermissions' || m === 'eth_requestAccounts')).toEqual([
      'wallet_requestPermissions',
      'eth_requestAccounts',
    ]);
  });

  it('a refusal is not asked again', async () => {
    const w = fakeWallet({ refuse: true });
    const page = await pressConnect(w.provider, 'io.metamask');
    expect(page.location.href).toBe('');
    expect(page.status.textContent).toBe('You cancelled the request in your wallet.');
    expect(w.methods()).not.toContain('eth_requestAccounts');
  });

  it('if MetaMask still fails that way, the player gets plain advice instead of the raw error, asked once', async () => {
    const w = fakeWallet({ alwaysBroken: true });
    const page = await pressConnect(w.provider, 'io.metamask');
    expect(page.location.href).toBe('');
    expect(page.status.textContent).toBe(
      'MetaMask could not finish the connection (a MetaMask problem with its Bitcoin accounts). Update MetaMask, restart your browser and try again.',
    );
    expect(w.methods().filter((m) => m === 'wallet_requestPermissions' || m === 'eth_requestAccounts')).toEqual(['wallet_requestPermissions']);
  });
});

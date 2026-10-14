import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gte, lt } from 'drizzle-orm';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import type { DB, Tx } from '../db/index.js';
import { signupTickets, walletNonces, wallets } from '../db/schema.js';
import { config } from '../config.js';
import { assertGame, GameError } from '../game/errors.js';

const NONCE_TTL_MS = 10 * 60_000;
export const SIGNUP_TTL_MS = 15 * 60_000;

export interface SiweRequest {
  domain: string;
  origin: string;
}

/** Create the exact message the wallet will sign. */
export function prepareSiwe(db: DB, req: SiweRequest, address: string, purpose: 'link' | 'login', userId: number | null, now: number): string {
  assertGame(isAddress(address), 'Invalid wallet address');
  db.delete(walletNonces).where(lt(walletNonces.expiresAt, now)).run();
  const nonce = generateSiweNonce();
  db.insert(walletNonces).values({ nonce, userId, purpose, expiresAt: now + NONCE_TTL_MS }).run();
  return createSiweMessage({
    domain: req.domain,
    address: getAddress(address),
    statement: purpose === 'link' ? `Link this wallet to my ${config.WORLD_NAME} account.` : `Log in to ${config.WORLD_NAME}.`,
    uri: req.origin,
    version: '1',
    chainId: config.CHAIN_ID,
    nonce,
    issuedAt: new Date(now),
    expirationTime: new Date(now + NONCE_TTL_MS),
  });
}

/** Verify a signed SIWE message; returns the lower-case address. Consumes the nonce. */
export async function verifySiwe(db: DB, req: SiweRequest, message: string, signature: string, purpose: 'link' | 'login', userId: number | null, now: number): Promise<string> {
  const fields = parseSiweMessage(message);
  assertGame(fields.address && fields.nonce, 'Malformed sign-in message');
  const nonceRow = db.select().from(walletNonces).where(eq(walletNonces.nonce, fields.nonce)).get();
  assertGame(nonceRow && nonceRow.purpose === purpose && nonceRow.expiresAt >= now, 'This sign-in request expired, please try again');
  assertGame(purpose === 'login' || nonceRow.userId === userId, 'This sign-in request belongs to another session');
  const valid = validateSiweMessage({ message: fields, domain: req.domain, nonce: nonceRow.nonce, time: new Date(now) });
  assertGame(valid && fields.chainId === config.CHAIN_ID, 'The sign-in message does not match this site');
  assertGame(/^0x[0-9a-fA-F]+$/.test(signature), 'Invalid signature');
  // Consume the nonce now, before awaiting: a second request with the same message must fail.
  const consumed = db.delete(walletNonces).where(eq(walletNonces.nonce, nonceRow.nonce)).run();
  assertGame(consumed.changes === 1, 'This sign-in request was already used');
  let ok = false;
  try {
    ok = await verifyMessage({ address: fields.address, message, signature: signature as `0x${string}` });
  } catch {
    ok = false;
  }
  if (!ok) throw new GameError('The signature does not match the wallet');
  return fields.address.toLowerCase();
}

export function linkWallet(db: DB, userId: number, address: string, now: number): void {
  const addr = address.toLowerCase();
  db.transaction((tx) => {
    const owner = tx.select().from(wallets).where(eq(wallets.address, addr)).get();
    assertGame(!owner || owner.userId === userId, 'This wallet is already linked to another account');
    tx.delete(wallets).where(eq(wallets.userId, userId)).run();
    tx.insert(wallets).values({ userId, address: addr, linkedAt: now }).run();
  });
}

export function walletOf(db: DB, userId: number) {
  return db.select().from(wallets).where(eq(wallets.userId, userId)).get();
}

export function userByWallet(db: DB, address: string) {
  return db.select().from(wallets).where(and(eq(wallets.address, address.toLowerCase()))).get();
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

/** A wallet that signed in but has no account yet: returns the token for the signup cookie. */
export function createSignupTicket(db: DB, address: string, now: number): string {
  db.delete(signupTickets).where(lt(signupTickets.expiresAt, now)).run();
  const token = randomBytes(32).toString('base64url');
  db.insert(signupTickets).values({ tokenHash: tokenHash(token), address: address.toLowerCase(), expiresAt: now + SIGNUP_TTL_MS }).run();
  return token;
}

/** The address behind a still-valid signup token (not consumed). */
export function peekSignupTicket(db: DB, token: string, now: number): string | null {
  const row = db.select().from(signupTickets).where(and(eq(signupTickets.tokenHash, tokenHash(token)), gte(signupTickets.expiresAt, now))).get();
  return row?.address ?? null;
}

/** Use up a signup token (inside the account-creating transaction); throws if it is gone or expired. */
export function consumeSignupTicket(db: DB | Tx, token: string, now: number): void {
  const res = db.delete(signupTickets).where(and(eq(signupTickets.tokenHash, tokenHash(token)), gte(signupTickets.expiresAt, now))).run();
  assertGame(res.changes === 1, 'Your wallet sign-in expired. Connect your wallet again.');
}

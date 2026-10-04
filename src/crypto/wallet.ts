import { and, eq, lt } from 'drizzle-orm';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import type { DB } from '../db/index.js';
import { walletNonces, wallets } from '../db/schema.js';
import { config } from '../config.js';
import { assertGame, GameError } from '../game/errors.js';

const NONCE_TTL_MS = 10 * 60_000;

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
  let ok = false;
  try {
    ok = await verifyMessage({ address: fields.address, message, signature: signature as `0x${string}` });
  } catch {
    ok = false;
  }
  if (!ok) throw new GameError('The signature does not match the wallet');
  db.delete(walletNonces).where(eq(walletNonces.nonce, nonceRow.nonce)).run();
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

export function unlinkWallet(db: DB, userId: number): void {
  db.delete(wallets).where(eq(wallets.userId, userId)).run();
}

export function walletOf(db: DB, userId: number) {
  return db.select().from(wallets).where(eq(wallets.userId, userId)).get();
}

export function userByWallet(db: DB, address: string) {
  return db.select().from(wallets).where(and(eq(wallets.address, address.toLowerCase()))).get();
}

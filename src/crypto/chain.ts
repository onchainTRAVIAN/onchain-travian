import { createPublicClient, defineChain, http, type PublicClient } from 'viem';
import { config } from '../config.js';

let client: PublicClient | undefined;

export function chain() {
  return defineChain({
    id: config.CHAIN_ID,
    name: config.CHAIN_NAME,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [config.RPC_URL ?? 'http://127.0.0.1:8545'] } },
  });
}

export function publicClient(): PublicClient {
  client ??= createPublicClient({ chain: chain(), transport: http(config.RPC_URL) }) as PublicClient;
  return client;
}

/** Test hook. */
export function setPublicClient(c: PublicClient | undefined): void {
  client = c;
}

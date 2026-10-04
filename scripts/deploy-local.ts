/**
 * Local blockchain helper: deploys the test token and GamePayments to a running anvil node
 * and prints the .env lines to use. Usage: `anvil --block-time 2` in one terminal, then `npm run chain:deploy`.
 * Needs `forge build` in contracts/ first (for the bytecode).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPublicClient, createWalletClient, http, parseEther, type Address, type Hex } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { gamePaymentsAbi } from '../src/crypto/gamePayments.js';
import { testTokenAbi } from '../src/crypto/testToken.js';

const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
// Anvil's public development mnemonic: never use it on a real network.
const MNEMONIC = 'test test test test test test test test test test test junk';
const deployer = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
const treasury = mnemonicToAccount(MNEMONIC, { addressIndex: 1 }).address;
const out = join(import.meta.dirname, '../contracts/out');

function bytecode(name: string): Hex {
  return (JSON.parse(readFileSync(join(out, `${name}.sol/${name}.json`), 'utf8')) as { bytecode: { object: Hex } }).bytecode.object;
}

const transport = http(RPC);
const pub = createPublicClient({ chain: foundry, transport });
const wallet = createWalletClient({ account: deployer, chain: foundry, transport });

const token = (await pub.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi: testTokenAbi, bytecode: bytecode('TestToken'), args: [] }) }))
  .contractAddress as Address;
const payments = (
  await pub.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi: gamePaymentsAbi, bytecode: bytecode('GamePayments'), args: [token, treasury] }) })
).contractAddress as Address;

// Give the first five dev accounts some tokens to play with.
for (let i = 0; i < 5; i++) {
  const to = mnemonicToAccount(MNEMONIC, { addressIndex: i }).address;
  await pub.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: token, abi: testTokenAbi, functionName: 'mint', args: [to, parseEther(String(10_000 * (i + 1)))] }) });
}

console.log(`# Local chain deployed. Add these to .env:
CHAIN_ID=31337
CHAIN_NAME=Local Anvil
RPC_URL=${RPC}
PAYMENTS_ADDRESS=${payments}
TOKEN_ADDRESS=${token}
CONFIRMATIONS=1   # with anvil --block-time 2 this confirms in ~2s
INDEXER_INTERVAL_SECONDS=3`);

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The anvil binary: ~/.foundry/bin (foundryup) or on PATH (CI's foundry-toolchain); null when it is not installed. */
export function anvilPath(): string | null {
  const home = join(homedir(), '.foundry/bin/anvil');
  if (existsSync(home)) return home;
  return spawnSync('anvil', ['--version'], { stdio: 'ignore' }).status === 0 ? 'anvil' : null;
}

/**
 * Whether the on-chain tests can run (anvil + the compiled contract). Locally they are skipped without them;
 * on CI a missing piece fails the run instead, so the real contract is always exercised there.
 */
export function chainReady(artifact: string): boolean {
  const ok = anvilPath() !== null && existsSync(artifact);
  if (!ok && process.env.CI) throw new Error(`CI must run the on-chain tests: anvil and ${artifact} are needed (forge build first)`);
  return ok;
}

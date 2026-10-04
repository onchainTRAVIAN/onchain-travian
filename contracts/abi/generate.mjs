// Regenerates abi/*.ts from Foundry artifacts. Run after `forge build`:  node abi/generate.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  { artifact: "out/GamePayments.sol/GamePayments.json", file: "abi/gamePayments.ts", name: "gamePaymentsAbi" },
  { artifact: "out/TestToken.sol/TestToken.json", file: "abi/testToken.ts", name: "testTokenAbi" },
];

for (const t of targets) {
  const { abi } = JSON.parse(readFileSync(join(root, t.artifact), "utf8"));
  const src =
    `// AUTO-GENERATED from contracts/${t.artifact} by contracts/abi/generate.mjs — do not edit by hand.\n` +
    `export const ${t.name} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  writeFileSync(join(root, t.file), src);
  console.log(`wrote ${t.file} (${abi.length} entries)`);
}

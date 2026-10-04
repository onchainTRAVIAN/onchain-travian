# contracts — GamePayments

Stateless payment router for the game. Players deposit **ETH** or the game **ERC20** against an
off-chain `accountId`; funds go straight to `treasury` in the same tx and a `Deposit` event is
emitted for the server indexer. No owner, no admin, no upgrades, never holds funds.

No external dependencies (no forge-std, no OpenZeppelin) — builds offline once solc 0.8.24 is cached.

## Layout

| Path | What |
|---|---|
| `src/GamePayments.sol` | Main contract (interface is consumed by the indexer — do not rename) |
| `src/SafeTransferLib.sol` | Minimal SafeERC20-style `safeTransferFrom` (handles no-return tokens) |
| `src/TestToken.sol` | **Local/test only** mintable ERC20 "Realm Token" (REALM, 18 dec), public `mint` |
| `test/GamePayments.t.sol` | Unit + fuzz tests |
| `test/utils/` | Tiny cheatcode / Test / console shims (replaces forge-std) |
| `script/Deploy.s.sol` | Deploy GamePayments with `TOKEN_ADDRESS` + `TREASURY_ADDRESS` |
| `script/DeployLocal.s.sol` | Deploy TestToken + GamePayments, mint 1,000,000 REALM to deployer |
| `abi/*.ts` | Generated `as const` ABIs (`gamePaymentsAbi`, `testTokenAbi`) |

## Interface (indexer contract)

```solidity
event Deposit(uint256 indexed accountId, address indexed payer, address indexed asset, uint256 amount); // asset = address(0) for ETH
function token() external view returns (address);
function treasury() external view returns (address);
function depositETH(uint256 accountId) external payable;
function depositToken(uint256 accountId, uint256 amount) external; // approve GamePayments first
```

| Item | Value |
|---|---|
| `Deposit` topic0 | `0x2c0f148b435140de488c1b34647f1511c646f7077e87007bacf22ef9977a16d8` |
| `depositETH(uint256)` | `0x5358fbda` |
| `depositToken(uint256,uint256)` | `0x9d2d04d1` |
| `token()` | `0xfc0c546a` |
| `treasury()` | `0x61d027b3` |

Reverts (custom errors): `ZeroAddress`, `ZeroAmount`, `ZeroAccountId`, `EthTransferFailed`,
`DirectEthNotAccepted` (plain ETH sends / unknown calls), `TransferFromFailed(token)`, `TokenHasNoCode(token)`.

## Setup

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts
cp .env.example .env   # fill in for Sepolia; never commit .env
```

## Build, test, ABIs

```bash
forge build
forge test -vv
node abi/generate.mjs          # regenerate abi/gamePayments.ts + abi/testToken.ts from out/
```

## Local (anvil)

```bash
anvil                                   # terminal 1, prints 10 funded dev keys
# terminal 2 — anvil account #0 (public dev key, never use on a real network)
PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --private-key $PK --broadcast
# optional: TREASURY_ADDRESS=0x... (defaults to the deployer)
```

On a fresh anvil this yields deterministic addresses:
TestToken `0x5FbDB2315678afecb367f032d93F642f64180aa3`, GamePayments `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`.

Try it:

```bash
GP=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512; TK=0x5FbDB2315678afecb367f032d93F642f64180aa3; R=http://127.0.0.1:8545
cast send $GP "depositETH(uint256)" 1 --value 0.01ether --private-key $PK --rpc-url $R
cast send $TK "approve(address,uint256)" $GP 5ether --private-key $PK --rpc-url $R
cast send $GP "depositToken(uint256,uint256)" 2 5ether --private-key $PK --rpc-url $R
cast logs --from-block 0 --address $GP "Deposit(uint256 indexed,address indexed,address indexed,uint256)" --rpc-url $R
```

## Sepolia

```bash
source .env   # SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, TOKEN_ADDRESS, TREASURY_ADDRESS

# Option A: real token already deployed
forge script script/Deploy.s.sol:Deploy --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

# Option B: testnet with the throwaway TestToken (anyone can mint it!)
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY \
  --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

Prefer `--account <keystore-name>` (`cast wallet import`) or `--ledger` over a raw `--private-key` for anything
holding real value. Use a multisig as `TREASURY_ADDRESS` in production — it is immutable.

Deployment records land in `broadcast/` (git-ignored).

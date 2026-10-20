// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "../test/utils/Test.sol";
import {console} from "../test/utils/Console.sol";
import {GameEntry} from "../src/GameEntry.sol";

/// @notice Deploys GameEntry (the new-account entry fee). Needs no token.
/// Env: TREASURY_ADDRESS (required). Signer comes from CLI flags (--private-key / --account / --ledger).
/// Then set on the server: ENTRY_ADDRESS = the printed address, ENTRY_START_BLOCK = the deploy block.
contract DeployEntry is Script {
    function run() external returns (GameEntry ge) {
        address treasuryAddr = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();
        ge = new GameEntry(treasuryAddr);
        vm.stopBroadcast();

        console.log("GameEntry:", address(ge));
        console.log("treasury:", treasuryAddr);
        console.log("block (use as ENTRY_START_BLOCK):", block.number);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "../test/utils/Test.sol";
import {console} from "../test/utils/Console.sol";
import {GamePayments} from "../src/GamePayments.sol";

/// @notice Deploys GamePayments for an existing token + treasury.
/// Env: TOKEN_ADDRESS, TREASURY_ADDRESS (required). Signer comes from CLI flags (--private-key / --account / --ledger).
contract Deploy is Script {
    function run() external returns (GamePayments gp) {
        address tokenAddr = vm.envAddress("TOKEN_ADDRESS");
        address treasuryAddr = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();
        gp = new GamePayments(tokenAddr, treasuryAddr);
        vm.stopBroadcast();

        console.log("GamePayments:", address(gp));
        console.log("token:", tokenAddr);
        console.log("treasury:", treasuryAddr);
    }
}

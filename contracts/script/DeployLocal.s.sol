// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "../test/utils/Test.sol";
import {console} from "../test/utils/Console.sol";
import {GamePayments} from "../src/GamePayments.sol";
import {TestToken} from "../src/TestToken.sol";

/// @notice LOCAL / TESTNET ONLY: deploys TestToken (REALM) + GamePayments and mints
///         1,000,000 REALM to the deployer. Treasury = env TREASURY_ADDRESS, or the deployer if unset.
contract DeployLocal is Script {
    function run() external returns (TestToken token, GamePayments gp) {
        vm.startBroadcast();
        // Inside a broadcast, msg.sender is the broadcasting account.
        address deployer = msg.sender;
        address treasuryAddr = vm.envOr("TREASURY_ADDRESS", deployer);

        token = new TestToken();
        gp = new GamePayments(address(token), treasuryAddr);
        token.mint(deployer, 1_000_000e18);
        vm.stopBroadcast();

        console.log("deployer:", deployer);
        console.log("TestToken:", address(token));
        console.log("GamePayments:", address(gp));
        console.log("treasury:", treasuryAddr);
        console.log("deployer REALM balance (wei):", token.balanceOf(deployer));
    }
}

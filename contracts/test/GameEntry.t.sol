// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "./utils/Test.sol";
import {Vm} from "./utils/Vm.sol";
import {GameEntry} from "../src/GameEntry.sol";

/// @dev Treasury that rejects all ETH.
contract RejectingEntryTreasury {
    receive() external payable {
        revert("no ETH");
    }
}

/// @dev Treasury that pays an entry again when it receives ETH.
contract ReentrantEntryTreasury {
    GameEntry public ge;
    bool public reentered;

    function setTarget(GameEntry ge_) external {
        ge = ge_;
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            ge.payEntry{value: msg.value}();
        }
    }
}

contract GameEntryTest is Test {
    event EntryPaid(address indexed player, uint256 amount);

    GameEntry internal ge;
    address internal treasury = address(0x7EA5);
    address internal alice = address(0xA11CE);

    function setUp() public {
        ge = new GameEntry(treasury);
        vm.deal(alice, 100 ether);
    }

    function test_constructor_setsTreasury() public view {
        assertEq(ge.treasury(), treasury);
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.expectRevert(GameEntry.ZeroAddress.selector);
        new GameEntry(address(0));
    }

    function test_payEntry_forwardsAndEmits() public {
        vm.expectEmit(true, true, true, true, address(ge));
        emit EntryPaid(alice, 0.0004 ether);

        vm.prank(alice);
        ge.payEntry{value: 0.0004 ether}();

        assertEq(treasury.balance, 0.0004 ether);
        assertEq(address(ge).balance, 0);
        assertEq(alice.balance, 100 ether - 0.0004 ether);
    }

    function test_payEntry_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(GameEntry.ZeroAmount.selector);
        ge.payEntry{value: 0}();
    }

    function test_payEntry_revertsWhenTreasuryRejects() public {
        GameEntry ge2 = new GameEntry(address(new RejectingEntryTreasury()));

        vm.prank(alice);
        vm.expectRevert(GameEntry.EthTransferFailed.selector);
        ge2.payEntry{value: 1 ether}();

        assertEq(alice.balance, 100 ether);
        assertEq(address(ge2).balance, 0);
    }

    function test_payEntry_reentrantTreasuryLeavesNoBalance() public {
        ReentrantEntryTreasury rt = new ReentrantEntryTreasury();
        GameEntry ge2 = new GameEntry(address(rt));
        rt.setTarget(ge2);

        vm.recordLogs();
        vm.prank(alice);
        ge2.payEntry{value: 1 ether}();

        assertTrue(rt.reentered(), "did not re-enter");
        assertEq(address(ge2).balance, 0);
        assertEq(address(rt).balance, 1 ether);
        // inner event names the treasury, the outer one alice: only alice's wallet gets an entry
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        assertEq(address(uint160(uint256(logs[0].topics[1]))), address(rt));
        assertEq(address(uint160(uint256(logs[1].topics[1]))), alice);
    }

    function test_directETHSend_reverts() public {
        vm.prank(alice);
        (bool ok, bytes memory ret) = address(ge).call{value: 1 ether}("");
        assertTrue(!ok, "receive accepted ETH");
        assertEq(keccak256(ret), keccak256(abi.encodeWithSelector(GameEntry.DirectEthNotAccepted.selector)));
        assertEq(address(ge).balance, 0);
    }

    function test_fallbackWithData_reverts() public {
        vm.prank(alice);
        (bool ok, bytes memory ret) = address(ge).call{value: 1 ether}(hex"deadbeef");
        assertTrue(!ok, "fallback accepted ETH");
        assertEq(keccak256(ret), keccak256(abi.encodeWithSelector(GameEntry.DirectEthNotAccepted.selector)));
    }

    function testFuzz_payEntry_alwaysForwardsEverything(uint256 amount) public {
        amount = bound(amount, 1, 100 ether);
        vm.prank(alice);
        ge.payEntry{value: amount}();
        assertEq(treasury.balance, amount);
        assertEq(address(ge).balance, 0);
    }
}

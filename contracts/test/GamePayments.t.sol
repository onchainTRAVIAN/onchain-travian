// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "./utils/Test.sol";
import {Vm} from "./utils/Vm.sol";
import {GamePayments} from "../src/GamePayments.sol";
import {SafeTransferLib} from "../src/SafeTransferLib.sol";
import {TestToken} from "../src/TestToken.sol";

/// @dev Treasury that rejects all ETH.
contract RejectingTreasury {
    receive() external payable {
        revert("no ETH");
    }
}

/// @dev Treasury that tries to re-enter depositETH when receiving ETH.
contract ReentrantTreasury {
    GamePayments public gp;
    bool public reentered;

    function setTarget(GamePayments gp_) external {
        gp = gp_;
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            gp.depositETH{value: msg.value}(42); // sends funds back through; must not create stuck balance
        }
    }
}

/// @dev USDT-style token: transferFrom returns nothing.
contract NoReturnToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
    }

    function approve(address s, uint256 amt) external {
        allowance[msg.sender][s] = amt;
    }

    function transferFrom(address from, address to, uint256 amt) external {
        require(allowance[from][msg.sender] >= amt && balanceOf[from] >= amt, "fail");
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
    }
}

/// @dev Token whose transferFrom returns false instead of reverting.
contract FalseReturnToken {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

contract GamePaymentsTest is Test {
    event Deposit(uint256 indexed accountId, address indexed payer, address indexed asset, uint256 amount);

    TestToken internal token;
    GamePayments internal gp;
    address internal treasury = address(0x7EA5);
    address internal alice = address(0xA11CE);

    function setUp() public {
        token = new TestToken();
        gp = new GamePayments(address(token), treasury);
        vm.deal(alice, 100 ether);
        token.mint(alice, 1_000_000e18);
    }

    // ---------------------------------------------------------------- constructor

    function test_constructor_setsImmutables() public view {
        assertEq(gp.token(), address(token));
        assertEq(gp.treasury(), treasury);
    }

    function test_constructor_revertsOnZeroToken() public {
        vm.expectRevert(GamePayments.ZeroAddress.selector);
        new GamePayments(address(0), treasury);
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.expectRevert(GamePayments.ZeroAddress.selector);
        new GamePayments(address(token), address(0));
    }

    // ---------------------------------------------------------------- ETH

    function test_depositETH_forwardsAndEmits() public {
        vm.expectEmit(true, true, true, true, address(gp));
        emit Deposit(7, alice, address(0), 1 ether);

        vm.prank(alice);
        gp.depositETH{value: 1 ether}(7);

        assertEq(treasury.balance, 1 ether);
        assertEq(address(gp).balance, 0);
        assertEq(alice.balance, 99 ether);
    }

    function test_depositETH_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(GamePayments.ZeroAmount.selector);
        gp.depositETH{value: 0}(7);
    }

    function test_depositETH_revertsOnZeroAccountId() public {
        vm.prank(alice);
        vm.expectRevert(GamePayments.ZeroAccountId.selector);
        gp.depositETH{value: 1 ether}(0);
    }

    function test_depositETH_revertsWhenTreasuryRejects() public {
        RejectingTreasury bad = new RejectingTreasury();
        GamePayments gp2 = new GamePayments(address(token), address(bad));

        vm.prank(alice);
        vm.expectRevert(GamePayments.EthTransferFailed.selector);
        gp2.depositETH{value: 1 ether}(7);

        assertEq(alice.balance, 100 ether);
        assertEq(address(gp2).balance, 0);
    }

    function test_depositETH_reentrantTreasuryLeavesNoBalance() public {
        ReentrantTreasury rt = new ReentrantTreasury();
        GamePayments gp2 = new GamePayments(address(token), address(rt));
        rt.setTarget(gp2);

        vm.recordLogs();
        vm.prank(alice);
        gp2.depositETH{value: 1 ether}(7);

        assertTrue(rt.reentered(), "did not re-enter");
        assertEq(address(gp2).balance, 0);
        assertEq(address(rt).balance, 1 ether);
        // two Deposit events (inner first, then outer), each emitted only after its transfer succeeded
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        assertEq(uint256(logs[0].topics[1]), 42);
        assertEq(uint256(logs[1].topics[1]), 7);
    }

    function test_directETHSend_reverts() public {
        vm.prank(alice);
        (bool ok, bytes memory ret) = address(gp).call{value: 1 ether}("");
        assertTrue(!ok, "receive accepted ETH");
        assertEq(keccak256(ret), keccak256(abi.encodeWithSelector(GamePayments.DirectEthNotAccepted.selector)));
        assertEq(address(gp).balance, 0);
    }

    function test_fallbackWithData_reverts() public {
        vm.prank(alice);
        (bool ok, bytes memory ret) = address(gp).call{value: 1 ether}(hex"deadbeef");
        assertTrue(!ok, "fallback accepted ETH");
        assertEq(keccak256(ret), keccak256(abi.encodeWithSelector(GamePayments.DirectEthNotAccepted.selector)));
    }

    // ---------------------------------------------------------------- token

    function test_depositToken_movesTokensAndEmits() public {
        vm.prank(alice);
        token.approve(address(gp), 500e18);

        vm.expectEmit(true, true, true, true, address(gp));
        emit Deposit(9, alice, address(token), 500e18);

        vm.prank(alice);
        gp.depositToken(9, 500e18);

        assertEq(token.balanceOf(treasury), 500e18);
        assertEq(token.balanceOf(alice), 1_000_000e18 - 500e18);
        assertEq(token.balanceOf(address(gp)), 0);
        assertEq(token.allowance(alice, address(gp)), 0);
    }

    function test_depositToken_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(GamePayments.ZeroAmount.selector);
        gp.depositToken(9, 0);
    }

    function test_depositToken_revertsOnZeroAccountId() public {
        vm.prank(alice);
        vm.expectRevert(GamePayments.ZeroAccountId.selector);
        gp.depositToken(0, 1e18);
    }

    function test_depositToken_revertsWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeTransferLib.TransferFromFailed.selector, address(token)));
        gp.depositToken(9, 1e18);
        assertEq(token.balanceOf(treasury), 0);
    }

    function test_depositToken_revertsOnInsufficientApproval() public {
        vm.startPrank(alice);
        token.approve(address(gp), 1e18);
        vm.expectRevert(abi.encodeWithSelector(SafeTransferLib.TransferFromFailed.selector, address(token)));
        gp.depositToken(9, 2e18);
        vm.stopPrank();
    }

    function test_depositToken_supportsNoReturnToken() public {
        NoReturnToken nrt = new NoReturnToken();
        GamePayments gp2 = new GamePayments(address(nrt), treasury);
        nrt.mint(alice, 10e18);

        vm.startPrank(alice);
        nrt.approve(address(gp2), 10e18);
        vm.expectEmit(true, true, true, true, address(gp2));
        emit Deposit(3, alice, address(nrt), 4e18);
        gp2.depositToken(3, 4e18);
        vm.stopPrank();

        assertEq(nrt.balanceOf(treasury), 4e18);
    }

    function test_depositToken_noReturnTokenFailureReverts() public {
        NoReturnToken nrt = new NoReturnToken();
        GamePayments gp2 = new GamePayments(address(nrt), treasury);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeTransferLib.TransferFromFailed.selector, address(nrt)));
        gp2.depositToken(3, 1e18);
    }

    function test_depositToken_revertsOnFalseReturn() public {
        FalseReturnToken frt = new FalseReturnToken();
        GamePayments gp2 = new GamePayments(address(frt), treasury);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeTransferLib.TransferFromFailed.selector, address(frt)));
        gp2.depositToken(3, 1e18);
    }

    function test_depositToken_revertsWhenTokenHasNoCode() public {
        address eoaToken = address(0xBEEF);
        GamePayments gp2 = new GamePayments(eoaToken, treasury);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SafeTransferLib.TokenHasNoCode.selector, eoaToken));
        gp2.depositToken(3, 1e18);
    }

    // ---------------------------------------------------------------- fuzz

    function testFuzz_depositETH(uint256 accountId, uint256 amount) public {
        accountId = bound(accountId, 1, type(uint256).max);
        amount = bound(amount, 1, 100 ether);

        vm.expectEmit(true, true, true, true, address(gp));
        emit Deposit(accountId, alice, address(0), amount);
        vm.prank(alice);
        gp.depositETH{value: amount}(accountId);

        assertEq(treasury.balance, amount);
        assertEq(address(gp).balance, 0);
    }

    function testFuzz_depositToken(uint256 accountId, uint256 amount) public {
        accountId = bound(accountId, 1, type(uint256).max);
        amount = bound(amount, 1, 1_000_000e18);

        vm.startPrank(alice);
        token.approve(address(gp), amount);
        vm.expectEmit(true, true, true, true, address(gp));
        emit Deposit(accountId, alice, address(token), amount);
        gp.depositToken(accountId, amount);
        vm.stopPrank();

        assertEq(token.balanceOf(treasury), amount);
        assertEq(token.balanceOf(alice), 1_000_000e18 - amount);
        assertEq(token.balanceOf(address(gp)), 0);
    }
}

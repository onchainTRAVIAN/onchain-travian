// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Vm, VM_ADDRESS} from "./Vm.sol";

/// @notice Tiny dependency-free stand-in for forge-std's Test / Script base contracts.
abstract contract CommonBase {
    Vm internal constant vm = Vm(VM_ADDRESS);
}

abstract contract Test is CommonBase {
    bool public IS_TEST = true;

    error AssertionFailed(string message);

    function assertEq(uint256 a, uint256 b, string memory err) internal pure {
        if (a != b) revert AssertionFailed(err);
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        assertEq(a, b, "uint256 values not equal");
    }

    function assertEq(address a, address b) internal pure {
        if (a != b) revert AssertionFailed("addresses not equal");
    }

    function assertEq(bytes32 a, bytes32 b) internal pure {
        if (a != b) revert AssertionFailed("bytes32 values not equal");
    }

    function assertTrue(bool c, string memory err) internal pure {
        if (!c) revert AssertionFailed(err);
    }

    function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
        require(min <= max, "bound: min > max");
        if (x >= min && x <= max) return x;
        uint256 size = max - min + 1;
        return min + (x % size);
    }
}

abstract contract Script is CommonBase {
    bool public IS_SCRIPT = true;
}

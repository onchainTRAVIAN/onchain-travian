// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal console.log shim (address of Foundry's console precompile).
library console {
    address private constant CONSOLE = 0x000000000000000000636F6e736F6c652e6c6f67;

    function _send(bytes memory payload) private view {
        // staticcall keeps the functions `view`; return value intentionally ignored.
        (bool ok,) = CONSOLE.staticcall(payload);
        ok;
    }

    function log(string memory p0, address p1) internal view {
        _send(abi.encodeWithSignature("log(string,address)", p0, p1));
    }

    function log(string memory p0, uint256 p1) internal view {
        _send(abi.encodeWithSignature("log(string,uint256)", p0, p1));
    }
}

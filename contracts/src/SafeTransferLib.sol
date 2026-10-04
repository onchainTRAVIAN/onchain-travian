// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SafeTransferLib
/// @notice Minimal SafeERC20-style helper. Supports tokens that return `true`,
///         tokens that return nothing (e.g. USDT), and rejects tokens that
///         return `false` or revert. No external dependencies.
library SafeTransferLib {
    error TokenHasNoCode(address token);
    error TransferFromFailed(address token);

    /// @dev Calls `token.transferFrom(from, to, amount)` and reverts unless the
    ///      call succeeded AND (returned no data OR returned an ABI-encoded `true`).
    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        // A call to an address without code "succeeds" with empty returndata,
        // so explicitly reject EOAs / undeployed addresses.
        if (token.code.length == 0) revert TokenHasNoCode(token);

        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount)); // transferFrom(address,address,uint256)

        if (!ok) revert TransferFromFailed(token);
        if (data.length != 0) {
            if (data.length < 32 || !abi.decode(data, (bool))) revert TransferFromFailed(token);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title GameEntry
/// @notice One-time entry fee for new game accounts (keeps bots and multi-accounts out).
///         A player pays native ETH from the wallet they will play with; the ETH is forwarded
///         to `treasury` in the same transaction and an `EntryPaid` event is emitted. The game
///         server checks the amount against the dollar price before it creates the account.
///         The contract never holds funds and has no owner, admin, or upgrade path. It does
///         not depend on any token, so it can go live before (or without) one.
/// @dev The event and function signatures are read by the server - do not change them.
contract GameEntry {
    /// @notice Emitted after the ETH reached the treasury.
    /// @param player msg.sender: the wallet the new account will belong to.
    /// @param amount Wei paid.
    event EntryPaid(address indexed player, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error EthTransferFailed();
    error DirectEthNotAccepted();

    /// @notice Recipient of every entry fee.
    address public immutable treasury;

    constructor(address treasury_) {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
    }

    /// @notice Pay the entry fee for msg.sender. msg.value is forwarded to the treasury immediately.
    function payEntry() external payable {
        // Checks
        if (msg.value == 0) revert ZeroAmount();

        // Interactions (no state to update)
        (bool ok,) = treasury.call{value: msg.value}("");
        if (!ok) revert EthTransferFailed();

        emit EntryPaid(msg.sender, msg.value);
    }

    /// @dev A plain transfer (e.g. an exchange withdrawal) comes from a wallet that is not the player's, so it is rejected.
    receive() external payable {
        revert DirectEthNotAccepted();
    }

    /// @dev Unknown calls (with or without ETH) are rejected.
    fallback() external payable {
        revert DirectEthNotAccepted();
    }
}

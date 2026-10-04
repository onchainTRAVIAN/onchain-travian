// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeTransferLib} from "./SafeTransferLib.sol";

/// @title GamePayments
/// @notice Stateless payment router for the game. Players deposit ETH or the
///         game ERC20 against an off-chain `accountId`; funds are forwarded to
///         `treasury` in the same transaction and a `Deposit` event is emitted
///         for the server-side indexer. The contract never holds funds and has
///         no owner, admin, or upgrade path.
/// @dev The event and function signatures are consumed by the indexer — do not change them.
contract GamePayments {
    using SafeTransferLib for address;

    /// @notice Emitted after funds have been successfully delivered to the treasury.
    /// @param accountId Off-chain game account credited by the indexer.
    /// @param payer     msg.sender of the deposit.
    /// @param asset     ERC20 address, or address(0) for native ETH.
    /// @param amount    Amount in the asset's smallest unit.
    event Deposit(uint256 indexed accountId, address indexed payer, address indexed asset, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error ZeroAccountId();
    error EthTransferFailed();
    error DirectEthNotAccepted();

    /// @notice The accepted ERC20 game token.
    address public immutable token;
    /// @notice Recipient of every deposit.
    address public immutable treasury;

    constructor(address token_, address treasury_) {
        if (token_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        token = token_;
        treasury = treasury_;
    }

    /// @notice Deposit native ETH for `accountId`. msg.value is forwarded to the treasury immediately.
    function depositETH(uint256 accountId) external payable {
        // Checks
        if (accountId == 0) revert ZeroAccountId();
        if (msg.value == 0) revert ZeroAmount();

        // Interactions (no state to update)
        (bool ok,) = treasury.call{value: msg.value}("");
        if (!ok) revert EthTransferFailed();

        emit Deposit(accountId, msg.sender, address(0), msg.value);
    }

    /// @notice Deposit `amount` of the game token for `accountId`.
    ///         Tokens move directly from msg.sender to the treasury; caller must approve this contract first.
    function depositToken(uint256 accountId, uint256 amount) external {
        // Checks
        if (accountId == 0) revert ZeroAccountId();
        if (amount == 0) revert ZeroAmount();

        // Interactions (no state to update)
        token.safeTransferFrom(msg.sender, treasury, amount);

        emit Deposit(accountId, msg.sender, token, amount);
    }

    /// @dev Plain ETH transfers carry no account id, so they are rejected.
    receive() external payable {
        revert DirectEthNotAccepted();
    }

    /// @dev Unknown calls (with or without ETH) are rejected.
    fallback() external payable {
        revert DirectEthNotAccepted();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Errors
/// @notice Custom errors for Savanna Finance protocol — gas-efficient revert reasons
library Errors {
    // ============ Vault Errors ============

    /// @notice Caller is not the authorized controller
    error Savanna__OnlyController();
    /// @notice User already has an active strategy request
    error Savanna__ActiveRequestExists();
    /// @notice User has no active strategy request
    error Savanna__NoActiveRequest();
    /// @notice User has no active position
    error Savanna__NoActivePosition();
    /// @notice Deposit amount is below minimum threshold
    error Savanna__InsufficientDeposit(uint256 provided, uint256 minimum);
    /// @notice Time horizon is outside allowed range
    error Savanna__InvalidTimeHorizon(uint256 provided, uint256 min, uint256 max);
    /// @notice Controller address has not been set
    error Savanna__ControllerNotSet();
    /// @notice Zero address provided where not allowed
    error Savanna__ZeroAddress();
    /// @notice Strategy request has not timed out yet
    error Savanna__RequestNotTimedOut(uint256 remaining);
    /// @notice Withdrawal amount exceeds available balance
    error Savanna__InsufficientBalance(uint256 requested, uint256 available);
    /// @notice Vault is paused
    error Savanna__VaultPaused();

    // ============ Controller Errors ============

    /// @notice Caller is not the authorized Chainlink forwarder
    error Savanna__OnlyForwarder();
    /// @notice Caller is not the authorized vault
    error Savanna__OnlyVault();
    /// @notice Invalid report data received from oracle
    error Savanna__InvalidReport();
    /// @notice Strategy not registered for the given protocol
    error Savanna__StrategyNotRegistered();
    /// @notice Allocation basis points out of range (must be 1-10000)
    error Savanna__InvalidAllocation(uint256 provided);
    /// @notice Report decoding failed
    error Savanna__ReportDecodeFailed();

    // ============ Strategy Errors ============

    /// @notice Deposit to underlying protocol failed
    error Savanna__StrategyDepositFailed(bytes reason);
    /// @notice Withdrawal from underlying protocol failed
    error Savanna__StrategyWithdrawFailed(bytes reason);
    /// @notice Insufficient funds in strategy for withdrawal
    error Savanna__StrategyInsufficientFunds(uint256 requested, uint256 available);
    /// @notice Unsupported asset for this strategy
    error Savanna__UnsupportedAsset(address asset);

    // ============ Oracle / Feed Errors ============

    /// @notice Chainlink price feed round is incomplete
    error Savanna__StalePrice(address feed, uint256 timestamp);
    /// @notice Price feed returned zero or negative price
    error Savanna__InvalidPrice(address feed);
    /// @notice Price feed not set for the given asset
    error Savanna__FeedNotSet(address asset);
    /// @notice Heartbeat exceeded — price is too old
    error Savanna__HeartbeatExceeded(address feed, uint256 age, uint256 maxAge);
    /// @notice Oracle response validation failed
    error Savanna__OracleValidationFailed(string reason);

    // ============ Cross-Chain Errors ============

    /// @notice Cross-chain deposit caller is not the authorized bridge receiver
    error Savanna__OnlyBridgeReceiver();
    /// @notice Cross-chain deposit source chain not allowed
    error Savanna__SourceChainNotAllowed(uint256 chainId);
    /// @notice Cross-chain deposit bridge token not supported
    error Savanna__BridgeTokenNotSupported(address token);
    /// @notice Cross-chain deposit amount below minimum
    error Savanna__CrossChainDepositBelowMin(uint256 amount, uint256 minimum);
    /// @notice Swap to vault asset failed
    error Savanna__SwapFailed(bytes reason);

    // ============ Admin Errors ============

    /// @notice Caller is not the owner
    error Savanna__Unauthorized();
    /// @notice Invalid parameter provided
    error Savanna__InvalidParameter(string param);
    /// @notice Operation not allowed in current state
    error Savanna__InvalidState(string state);
}
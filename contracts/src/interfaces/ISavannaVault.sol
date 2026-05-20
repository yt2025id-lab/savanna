// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DataTypes} from "../libraries/DataTypes.sol";

/// @title ISavannaVault
/// @notice Interface for SavannaVault — ERC-4626 yield vault on Celo
interface ISavannaVault {
    // ============ Events ============

    /// @notice Emitted when a user deposits assets into the vault
    event Deposited(address indexed user, uint256 amount, uint256 shares);

    /// @notice Emitted when a user requests AI yield optimization
    event StrategyRequested(
        address indexed user,
        uint256 depositAmount,
        uint256 timeHorizon,
        uint256 timestamp
    );

    /// @notice Emitted when a strategy is executed by the controller
    event StrategyExecuted(address indexed user, address strategy, uint256 amount);

    /// @notice Emitted when a strategy completes and funds return to vault
    event StrategyCompleted(address indexed user, uint256 returnedAmount);

    /// @notice Emitted when a user withdraws from the vault
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);

    /// @notice Emitted when a timed-out request is cancelled
    event RequestCancelled(address indexed user, uint256 timestamp);

    // ============ User Actions ============

    /// @notice Request AI-powered yield optimization for deposited funds
    /// @param timeHorizon Target investment duration in seconds
    function requestStrategy(uint256 timeHorizon) external;

    /// @notice Cancel a timed-out strategy request
    function cancelTimedOutRequest() external;

    // ============ Controller Actions ============

    /// @notice Execute a strategy recommended by AI via Chainlink oracle
    /// @param user The user whose funds to deploy
    /// @param strategy The strategy adapter contract address
    /// @param amount The amount of underlying asset to deploy
    function executeStrategy(address user, address strategy, uint256 amount) external;

    /// @notice Called when strategy is completed (withdrawal from protocol)
    /// @param user The user whose strategy completed
    /// @param returnedAmount The amount returned from the strategy
    function completeStrategy(address user, uint256 returnedAmount) external;

    // ============ View Functions ============

    /// @notice Get user position details
    function getUserPosition(address user) external view returns (DataTypes.UserPosition memory);

    /// @notice Check if user has an active strategy request
    function hasActiveRequest(address user) external view returns (bool);

    /// @notice Total deployed across all strategies
    function totalDeployed() external view returns (uint256);
}
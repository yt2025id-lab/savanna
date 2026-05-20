// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DataTypes} from "../libraries/DataTypes.sol";

/// @title ISavannaController
/// @notice Interface for SavannaController — Chainlink oracle report handler
interface ISavannaController {
    // ============ Events ============

    /// @notice Emitted when AI recommendation is received from Chainlink
    event RecommendationReceived(
        address indexed user,
        DataTypes.Protocol protocol,
        uint256 allocationBps,
        uint256 expectedAPY,
        string reasoning
    );

    /// @notice Emitted when a strategy is executed based on AI recommendation
    event StrategyExecuted(address indexed user, address strategy, uint256 amount);

    /// @notice Emitted when user withdraws from a strategy
    event UserWithdrawn(address indexed user, uint256 amount);

    /// @notice Emitted when a strategy is registered or updated
    event StrategyUpdated(DataTypes.Protocol protocol, address strategy);

    /// @notice Emitted when the forwarder address is updated
    event ForwarderUpdated(address oldForwarder, address newForwarder);

    // ============ Admin ============

    /// @notice Register or update a strategy adapter for a protocol
    function setStrategy(DataTypes.Protocol protocol, address strategy) external;

    /// @notice Update the Chainlink forwarder address
    function setForwarder(address forwarder) external;

    // ============ Oracle Receiver ============

    /// @notice Receive AI recommendation from Chainlink oracle
    /// @param metadata Chainlink metadata (workflow ID, DON ID, etc.)
    /// @param report ABI-encoded recommendation data
    function onReport(bytes calldata metadata, bytes calldata report) external;

    // ============ User Actions ============

    /// @notice Withdraw user funds from their active strategy
    /// @param user The user to withdraw for
    function withdrawFromStrategy(address user) external;

    // ============ View ============

    /// @notice Get the strategy address for a protocol
    function getStrategy(DataTypes.Protocol protocol) external view returns (address);
}
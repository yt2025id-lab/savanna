// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DataTypes
/// @notice Shared data structures for Savanna Finance protocol
library DataTypes {
    // ============ Enums ============

    /// @notice Supported yield protocols on Celo
    enum Protocol {
        AaveV3,          // 0 - Aave V3 on Celo (lending)
        Moola,           // 1 - Moola (native Celo lending)
        MentoSavings,    // 2 - Mento Savings (ERC-4626 savings vault)
        Reserve          // 3 - Idle reserve strategy (fallback)
    }

    // ============ Structs ============

    /// @notice User position in the vault
    struct UserPosition {
        uint256 depositAmount;      // Amount of stablecoin deposited
        uint256 timeHorizon;        // Investment duration in seconds
        uint256 depositTimestamp;   // Block timestamp of deposit
        address activeStrategy;     // Address of active strategy (address(0) if none)
        uint256 allocatedAmount;    // Amount deployed to strategy
        bool isActive;              // Whether position has an active strategy
    }

    /// @notice AI recommendation from Chainlink oracle
    struct AiRecommendation {
        address user;               // User address
        Protocol protocol;          // Recommended protocol
        uint256 allocationBps;      // Allocation in basis points (10000 = 100%)
        uint256 expectedApy;        // Expected APY in basis points
        uint8 confidence;           // AI confidence score (0-100)
        uint8 riskScore;            // Risk score (0-100, higher = safer)
        string reasoning;           // AI reasoning for recommendation
    }

    /// @notice Protocol data for AI analysis
    struct ProtocolData {
        Protocol protocol;          // Protocol identifier
        uint256 apy;                // Current APY in basis points
        uint256 tvl;                // Total value locked
        uint8 safetyScore;          // Safety score (0-100)
        uint8 stabilityScore;       // Rate stability score (0-100)
        string name;                // Human-readable protocol name
    }

    /// @notice Price feed data from Chainlink
    struct FeedData {
        address feed;               // Chainlink price feed address
        uint256 price;              // Latest price (8 decimals)
        uint256 timestamp;          // Price update timestamp
        uint8 decimals;             // Feed decimals
        bool stale;                 // Whether the price is stale
    }

    // ============ Cross-Chain ============

    /// @notice Cross-chain deposit record for tracking bridged deposits
    struct CrossChainDeposit {
        address depositor;          // Original depositor on source chain
        uint256 sourceChainId;      // Source chain ID
        uint256 amount;             // Amount deposited after bridge
        uint256 timestamp;          // Deposit timestamp
        address bridgeToken;        // Token received from bridge (before swap)
        bool processed;             // Whether deposit has been processed
    }
}
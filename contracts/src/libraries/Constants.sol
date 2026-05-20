// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Constants
/// @notice Protocol-wide constants for Savanna Finance on Celo
library Constants {
    // ============ Network ============

    /// @notice Celo Mainnet Chain ID
    uint256 public constant CELO_MAINNET = 42220;
    /// @notice Celo Sepolia Testnet Chain ID (replaces deprecated Alfajores)
    uint256 public constant CELO_SEPOLIA = 11142220;

    // ============ Vault ============

    /// @notice Minimum deposit amount: 10 units (6 decimals for USDC, 18 decimals for USDm — handled via _decimalsOffset)
    uint256 public constant MIN_DEPOSIT = 10e6;
    /// @notice Maximum time horizon: 365 days
    uint256 public constant MAX_TIME_HORIZON = 365 days;
    /// @notice Minimum time horizon: 1 day
    uint256 public constant MIN_TIME_HORIZON = 1 days;
    /// @notice Strategy request timeout: 24 hours
    uint256 public constant REQUEST_TIMEOUT = 24 hours;
    /// @notice Maximum allocation: 100% in basis points
    uint256 public constant MAX_ALLOCATION_BPS = 10000;
    /// @notice Precision for basis point calculations
    uint256 public constant BPS_PRECISION = 10000;

    // ============ Oracle ============

    /// @notice Default Chainlink heartbeat tolerance: 1 hour
    uint256 public constant DEFAULT_HEARTBEAT = 3600;
    /// @notice Maximum age for a price before considered stale
    uint256 public constant MAX_PRICE_AGE = 7200; // 2 hours
    /// @notice Chainlink price feed decimals
    uint8 public constant CHAINLINK_DECIMALS = 8;

    // ============ Strategy ============

    /// @notice Minimum APY threshold in basis points (0.5%)
    uint256 public constant MIN_APY_THRESHOLD = 50;
    /// @notice Maximum number of strategies supported
    uint256 public constant MAX_STRATEGIES = 10;
    /// @notice Fee for emergency withdrawal in basis points
    uint256 public constant EMERGENCY_WITHDRAWAL_FEE = 50; // 0.5%

    // ============ Protocol ============

    /// @notice Total protocols supported (Aave, Moola, Compound, Reserve)
    uint8 public constant PROTOCOL_COUNT = 4;

    // ============ Role IDs (for future access control upgrade) ============

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
}
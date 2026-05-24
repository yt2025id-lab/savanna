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

    // ============ Cross-Chain ============

    /// @notice Minimum cross-chain deposit amount (in vault asset units)
    uint256 public constant MIN_CROSS_CHAIN_DEPOSIT = 5e6; // 5 USDC
    /// @notice Maximum number of allowed source chains
    uint256 public constant MAX_SOURCE_CHAINS = 30;
    /// @notice Bridge fee buffer in basis points (0.5%)
    uint256 public constant BRIDGE_FEE_BUFFER_BPS = 50;

    // ============ MiniPay ============

    /// @notice MiniPay reduced deposit multiplier (1/5 of standard minimum)
    uint256 public constant MINIPAY_DEPOSIT_DIVISOR = 5;
    /// @notice MiniPay supported stablecoins on Celo (USDm/cUSD)
    address public constant MINIPAY_USDM = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    /// @notice MiniPay USDC on Celo
    address public constant MINIPAY_USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    /// @notice MiniPay USDT on Celo
    address public constant MINIPAY_USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
    /// @notice USDC fee currency adapter (for fee abstraction)
    address public constant USDC_FEE_ADAPTER = 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B;
    /// @notice USDT fee currency adapter (for fee abstraction)
    address public constant USDT_FEE_ADAPTER = 0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72;

    // ============ x402 ============

    /// @notice Default x402 price per AI strategy request (0.10 USDC in 6 decimals)
    uint256 public constant X402_DEFAULT_PRICE = 100000;

    // ============ Role IDs (for future access control upgrade) ============

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
}
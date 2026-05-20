// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {SavannaFeedConsumer} from "../src/feeds/SavannaFeedConsumer.sol";
import {AaveV3Strategy} from "../src/strategies/AaveV3Strategy.sol";
import {MoolaStrategy} from "../src/strategies/MoolaStrategy.sol";
import {CompoundV3Strategy} from "../src/strategies/CompoundV3Strategy.sol";
import {ReserveStrategy} from "../src/strategies/ReserveStrategy.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";

/// @title Deploy
/// @notice Deploy script for Savanna Finance on Celo Sepolia (testnet) and Mainnet
/// @dev Addresses sourced from celopedia-skills (https://github.com/celo-org/agent-skills)
contract Deploy is Script {
    // ============ Celo Sepolia Testnet Addresses ============
    // Note: Aave V3 not deployed on Sepolia yet — use mock for testing
    address constant SEPOLIA_AAVE_POOL = 0x0000000000000000000000000000000000000001;

    // ============ Celo Mainnet Addresses (from celopedia-skills) ============

    /// @notice Aave V3 Pool — Source: @bgd-labs/aave-address-book AaveV3Celo.sol
    address constant MAINNET_AAVE_POOL = 0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402;
    /// @notice USDC on Celo Mainnet (6 decimals) — Circle
    address constant MAINNET_USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    /// @notice USDm on Celo Mainnet (18 decimals) — Mento
    address constant MAINNET_USDM = 0x765DE816845861e75A25fCA122bb6898B8B1282a;

    // ============ Chain IDs ============

    uint256 constant CELO_MAINNET_CHAIN_ID = 42220;
    uint256 constant CELO_SEPOLIA_CHAIN_ID = 11142220;

    struct Deployed {
        address asset; // USDC (mainnet) or MockUSDC (testnet)
        address vault;
        address controller;
        address feedConsumer;
        address aaveStrategy;
        address moolaStrategy;
        address compoundStrategy;
        address reserveStrategy;
    }

    function run() external returns (Deployed memory deployed) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        bool isMainnet = block.chainid == CELO_MAINNET_CHAIN_ID;

        console2.log("=== Savanna Finance Deployment ===");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("Network:", isMainnet ? "Celo Mainnet" : "Celo Sepolia");
        console2.log("");

        vm.startBroadcast(deployerKey);

        // ============ 1. Asset Setup ============

        address asset;
        if (isMainnet) {
            // Use real USDC on Celo Mainnet
            asset = MAINNET_USDC;
            console2.log("1. Asset: USDC (mainnet)", asset);
        } else {
            // Deploy Mock USDC for testnet
            MockERC20 usdc = new MockERC20(
                "Mock USDC",
                "USDC",
                6,
                1_000_000_000 * 1e6, // 1 billion USDC
                deployer
            );
            asset = address(usdc);
            console2.log("1. MockUSDC deployed:", asset);
        }

        // ============ 2. Deploy Vault ============

        SavannaVault vault = new SavannaVault(IERC20(asset), deployer);
        deployed.vault = address(vault);
        console2.log("2. SavannaVault:", deployed.vault);

        // ============ 3. Deploy Feed Consumer ============

        SavannaFeedConsumer feedConsumer = new SavannaFeedConsumer(deployer);
        deployed.feedConsumer = address(feedConsumer);
        console2.log("3. SavannaFeedConsumer:", deployed.feedConsumer);

        // ============ 4. Deploy Strategies ============

        address aavePool = isMainnet ? MAINNET_AAVE_POOL : SEPOLIA_AAVE_POOL;

        AaveV3Strategy aaveStrategy =
            new AaveV3Strategy(asset, deployed.vault, deployer, aavePool);
        deployed.aaveStrategy = address(aaveStrategy);
        console2.log("4. AaveV3Strategy:", deployed.aaveStrategy);

        // Moola, Compound not available on Celo per celopedia-skills review
        // Using ReserveStrategy as fallback alongside Aave
        ReserveStrategy reserveStrategy = new ReserveStrategy(asset, deployed.vault, deployer);
        deployed.reserveStrategy = address(reserveStrategy);
        console2.log("5. ReserveStrategy:", deployed.reserveStrategy);

        // ============ 5. Deploy Controller ============

        // On mainnet, replace with real Chainlink Functions forwarder
        address forwarder = deployer; // TODO: set real Chainlink forwarder before mainnet
        SavannaController controller =
            new SavannaController(deployed.vault, forwarder, deployer);
        deployed.controller = address(controller);
        console2.log("6. SavannaController:", deployed.controller);

        // ============ 6. Wire Up ============

        // Set controller on vault
        vault.setController(deployed.controller);
        console2.log("=> Vault controller set");

        // Register strategies on controller (only Aave + Reserve available on Celo)
        controller.setStrategy(DataTypes.Protocol.AaveV3, deployed.aaveStrategy);
        controller.setStrategy(DataTypes.Protocol.Reserve, deployed.reserveStrategy);
        console2.log("=> Strategies registered (AaveV3, Reserve)");

        // Set controller on strategies
        aaveStrategy.setController(deployed.controller);
        reserveStrategy.setController(deployed.controller);
        console2.log("=> Controller set on strategies");

        // Register price feed
        MockPriceFeed mockFeed = new MockPriceFeed(int256(1e8), 8); // $1.00 USDC
        feedConsumer.registerFeed(asset, address(mockFeed), 3600);
        controller.setPriceFeed(asset, address(mockFeed));
        console2.log("=> Price feeds registered");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("Network:", isMainnet ? "Celo Mainnet" : "Celo Sepolia");
        console2.log("Asset:", asset);
        console2.log("Vault:", deployed.vault);
        console2.log("Controller:", deployed.controller);
        console2.log("FeedConsumer:", deployed.feedConsumer);
        console2.log("AaveV3:", deployed.aaveStrategy);
        console2.log("Reserve:", deployed.reserveStrategy);

        deployed.asset = asset;
    }
}
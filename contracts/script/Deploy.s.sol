// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";
import {SavannaOracle} from "../src/SavannaOracle.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {SavannaFeedConsumer} from "../src/feeds/SavannaFeedConsumer.sol";
import {SavannaCrossChainReceiver} from "../src/crosschain/SavannaCrossChainReceiver.sol";
import {AaveV3Strategy} from "../src/strategies/AaveV3Strategy.sol";
import {MoolaStrategy} from "../src/strategies/MoolaStrategy.sol";
import {ReserveStrategy} from "../src/strategies/ReserveStrategy.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";
import {SavannaAgentIdentity} from "../src/agent/SavannaAgentIdentity.sol";
import {SavannaFaucet} from "../src/faucet/SavannaFaucet.sol";

/// @title Deploy
/// @notice Deploy script for Savanna Finance on Celo Sepolia (testnet) and Mainnet
/// @dev Addresses sourced from celopedia-skills (https://github.com/celo-org/agent-skills)
contract Deploy is Script {
    // ============ Celo Sepolia Testnet Addresses ============
    // Note: Aave V3 not deployed on Sepolia yet — use mock for testing
    address constant SEPOLIA_AAVE_POOL = 0x0000000000000000000000000000000000000001;
    address constant SEPOLIA_AAVE_ATOKEN = 0x0000000000000000000000000000000000000002;

    // ============ Celo Mainnet Addresses (from celopedia-skills) ============

    /// @notice Aave V3 Pool — Source: @bgd-labs/aave-address-book AaveV3Celo.sol
    address constant MAINNET_AAVE_POOL = 0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402;
    /// @notice Aave V3 aUSDC Token — Source: @bgd-labs/aave-address-book AaveV3Celo.sol
    address constant MAINNET_AAVE_AUSDC = 0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785;
    /// @notice USDC on Celo Mainnet (6 decimals) — Circle
    address constant MAINNET_USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    /// @notice cUSD on Celo Mainnet (18 decimals) — Mento Dollar
    address constant MAINNET_USDM = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    /// @notice Moola LendingPool (Aave V2 fork) on Celo Mainnet
    address constant MAINNET_MOOLA_POOL = 0x970b12522CA9b4054807a2c5B736149a5BE6f670;
    /// @notice Moola mcUSD (aToken for USDm) on Celo Mainnet
    address constant MAINNET_MOOLA_MCUSD = 0x918146359264C492BD6934071c6Bd31C854EDBc3;
    /// @notice Wrapped CELO on Celo Mainnet
    address constant MAINNET_WRAPPED_CELO = 0x471EcE3750Da237f93B8E339c536989b8978a438;
    /// @notice ERC-8004 Identity Registry on Celo Mainnet
    address constant MAINNET_ERC8004_IDENTITY = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    /// @notice ERC-8004 Reputation Registry on Celo Mainnet
    address constant MAINNET_ERC8004_REPUTATION = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;

    // ============ Chain IDs ============

    uint256 constant CELO_MAINNET_CHAIN_ID = 42220;
    uint256 constant CELO_SEPOLIA_CHAIN_ID = 11142220;

    struct Deployed {
        address asset; // USDC (mainnet) or MockUSDC (testnet)
        address vault;
        address oracle;
        address controller;
        address feedConsumer;
        address crossChainReceiver;
        address aaveStrategy;
        address moolaStrategy;
        address mentoSavingsStrategy;
        address reserveStrategy;
        address agentIdentity;
        address faucet;
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
            // Use USDm (Mento Dollar) on Celo Mainnet
            asset = MAINNET_USDM;
            console2.log("1. Asset: USDm (mainnet)", asset);
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

        // ============ 2. Deploy Oracle ============

        SavannaOracle oracleContract = new SavannaOracle(deployer);
        deployed.oracle = address(oracleContract);
        console2.log("2. SavannaOracle:", deployed.oracle);

        // Register asset feed in oracle
        if (isMainnet) {
            // TODO: use Chainlink USDm/USD feed if available; deploy mock for now
            MockPriceFeed mockOracleFeed = new MockPriceFeed(int256(1e8), 8);
            oracleContract.setAssetFeed(asset, address(mockOracleFeed));
        } else {
            // Deploy mock price feed for testnet ($1.00)
            MockPriceFeed mockOracleFeed = new MockPriceFeed(int256(1e8), 8);
            oracleContract.setAssetFeed(asset, address(mockOracleFeed));
        }
        console2.log("=> Oracle asset feed registered for:", asset);

        // ============ 3. Deploy Vault ============

        SavannaVault vault = new SavannaVault(IERC20(asset), deployer, address(oracleContract));
        deployed.vault = address(vault);
        console2.log("3. SavannaVault:", deployed.vault);

        // ============ 4. Deploy Feed Consumer ============

        SavannaFeedConsumer feedConsumer = new SavannaFeedConsumer(deployer);
        deployed.feedConsumer = address(feedConsumer);
        console2.log("4. SavannaFeedConsumer:", deployed.feedConsumer);

        // ============ 5. Deploy Strategies ============

        if (isMainnet) {
            // Mainnet: deploy Moola (USDm) + Reserve
            // Skip AaveV3 (uses USDC, not USDm) and MentoSavings (deprecated)

            MoolaStrategy moolaStrategy = new MoolaStrategy(
                asset, deployed.vault, deployer, MAINNET_MOOLA_POOL, MAINNET_MOOLA_MCUSD
            );
            deployed.aaveStrategy = address(0); // not used
            deployed.mentoSavingsStrategy = address(0); // not used
            deployed.moolaStrategy = address(moolaStrategy);
            console2.log("5. MoolaStrategy:", deployed.moolaStrategy);
        } else {
            // Testnet: deploy AaveV3 (mock) + MentoSavings (placeholder) + Reserve
            address aavePool = SEPOLIA_AAVE_POOL;
            address aaveAToken = SEPOLIA_AAVE_ATOKEN;

            AaveV3Strategy aaveStrategy =
                new AaveV3Strategy(asset, deployed.vault, deployer, aavePool, aaveAToken);
            deployed.aaveStrategy = address(aaveStrategy);
            console2.log("5. AaveV3Strategy:", deployed.aaveStrategy);

            deployed.moolaStrategy = address(0);
            deployed.mentoSavingsStrategy = address(0);
            console2.log("6. MoolaStrategy: skipped (not on testnet)");
        }

        // ReserveStrategy as fallback (works on both networks)
        ReserveStrategy reserveStrategy = new ReserveStrategy(asset, deployed.vault, deployer);
        deployed.reserveStrategy = address(reserveStrategy);
        console2.log("7. ReserveStrategy:", deployed.reserveStrategy);

        // ============ 6. Deploy Controller ============

        // Forwarder: deployer acts as forwarder (manual onReport via x402 server).
        // Replace with real Chainlink Automation forwarder for production.
        address forwarder = deployer;
        SavannaController controller =
            new SavannaController(deployed.vault, forwarder, deployer);
        deployed.controller = address(controller);
        console2.log("7. SavannaController:", deployed.controller);

        // ============ 7. Wire Up ============

        // Set controller on vault
        vault.setController(deployed.controller);
        console2.log("=> Vault controller set");

        // Register strategies on controller
        if (isMainnet) {
            controller.setStrategy(DataTypes.Protocol.Moola, deployed.moolaStrategy);
        } else {
            controller.setStrategy(DataTypes.Protocol.AaveV3, deployed.aaveStrategy);
        }
        controller.setStrategy(DataTypes.Protocol.Reserve, deployed.reserveStrategy);
        console2.log("=> Strategies registered (Moola/AaveV3 + Reserve)");

        // Set controller on strategies
        if (isMainnet) {
            MoolaStrategy(deployed.moolaStrategy).setController(deployed.controller);
        } else {
            AaveV3Strategy(deployed.aaveStrategy).setController(deployed.controller);
        }
        reserveStrategy.setController(deployed.controller);
        console2.log("=> Controller set on strategies");

        // Register price feed
        MockPriceFeed mockFeed = new MockPriceFeed(int256(1e8), 8); // $1.00 USDC
        feedConsumer.registerFeed(asset, address(mockFeed), 3600);
        controller.setPriceFeed(asset, address(mockFeed));
        console2.log("=> Price feeds registered");

        // ============ 8. Deploy Cross-Chain Receiver ============

        address swapRouter = address(0); // TODO: set Ubeswap or Mento Router before use
        address wrappedCelo = isMainnet ? MAINNET_WRAPPED_CELO : address(0);

        SavannaCrossChainReceiver crossChainReceiver =
            new SavannaCrossChainReceiver(deployed.vault, deployer, swapRouter, wrappedCelo);
        deployed.crossChainReceiver = address(crossChainReceiver);
        console2.log("9. SavannaCrossChainReceiver:", deployed.crossChainReceiver);

        // ============ 9. Wire Cross-Chain ============

        // Set cross-chain receiver on vault
        vault.setCrossChainReceiver(deployed.crossChainReceiver);
        console2.log("=> Cross-chain receiver set on vault");

        // Allow major chains as source for cross-chain deposits
        uint256[] memory allowedChains = new uint256[](isMainnet ? 7 : 8);
        allowedChains[0] = 1; // Ethereum Mainnet
        allowedChains[1] = 42161; // Arbitrum One
        allowedChains[2] = 10; // Optimism
        allowedChains[3] = 137; // Polygon
        allowedChains[4] = 8453; // Base
        allowedChains[5] = 56; // BSC
        allowedChains[6] = 43114; // Avalanche
        if (!isMainnet) {
            allowedChains[7] = 11142220; // Celo Sepolia (only on testnet)
        }
        crossChainReceiver.setSourceChains(allowedChains, true);
        console2.log("=> Source chains allowed (ETH, ARB, OP, MATIC, BASE, BSC, AVAX", isMainnet ? "" : ", CELO_SEPOLIA", ")");

        // ============ 10. Deploy ERC-8004 Agent Identity ============

        SavannaAgentIdentity agentIdentity;
        if (isMainnet) {
            agentIdentity = new SavannaAgentIdentity(
                MAINNET_ERC8004_IDENTITY,
                MAINNET_ERC8004_REPUTATION,
                deployer
            );
            deployed.agentIdentity = address(agentIdentity);
            console2.log("10. SavannaAgentIdentity:", deployed.agentIdentity);
        } else {
            deployed.agentIdentity = address(0);
            console2.log("10. SavannaAgentIdentity: skipped (ERC-8004 not on testnet)");
        }

        // ============ 11. Deploy Faucet ============

        SavannaFaucet faucet = new SavannaFaucet(deployer);
        deployed.faucet = address(faucet);
        console2.log("11. SavannaFaucet:", deployed.faucet);

        // Add mock tokens to faucet (testnet)
        if (!isMainnet) {
            MockERC20(asset).mint(deployed.faucet, 1_000_000 * 1e6); // 1M USDC for faucet
            faucet.addToken(asset, 100 * 1e6, 24 hours); // 100 USDC per claim, 24h cooldown
            console2.log("=> Faucet funded with 1M USDC, 100 USDC/claim");
        }

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("Network:", isMainnet ? "Celo Mainnet" : "Celo Sepolia");
        console2.log("Asset:", asset);
        console2.log("Oracle:", deployed.oracle);
        console2.log("Vault:", deployed.vault);
        console2.log("Controller:", deployed.controller);
        console2.log("FeedConsumer:", deployed.feedConsumer);
        console2.log("CrossChainReceiver:", deployed.crossChainReceiver);
        console2.log("AaveV3:", deployed.aaveStrategy);
        console2.log("MentoSavings:", deployed.mentoSavingsStrategy);
        console2.log("Reserve:", deployed.reserveStrategy);
        console2.log("AgentIdentity:", deployed.agentIdentity);

        deployed.asset = asset;
    }
}
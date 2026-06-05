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
import {MentoSavingsStrategy} from "../src/strategies/MentoSavingsStrategy.sol";
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
    /// @notice USDm on Celo Mainnet (18 decimals) — Mento
    address constant MAINNET_USDM = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    /// @notice Mento Savings cUSD (sCU) on Celo Mainnet
    address constant MAINNET_MENTO_SAVINGS_CU = 0x2a4D787EB7e7306Ef8Bb5143C6295C5731d1B4F4;
    /// @notice cUSD on Celo Mainnet (18 decimals) — Mento stablecoin
    address constant MAINNET_CUSD = 0x765DE816845861e75a25fCA1227689Ab8A8B1f84;
    /// @notice Ubeswap Router on Celo Mainnet (Uniswap V2 compatible)
    address constant MAINNET_UBESWAP_ROUTER = 0x7ADe87e11cDD3904E7D55271C2aDA2E7A3D6fB3e;
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

        // ============ 2. Deploy Oracle ============

        SavannaOracle oracleContract = new SavannaOracle(deployer);
        deployed.oracle = address(oracleContract);
        console2.log("2. SavannaOracle:", deployed.oracle);

        // Register USDC asset feed in oracle (mainnet uses real Chainlink feed)
        if (isMainnet) {
            oracleContract.setAssetFeed(asset, oracleContract.USDC_USD_FEED());
        } else {
            // Deploy mock price feed for testnet ($1.00 USDC)
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

        address aavePool = isMainnet ? MAINNET_AAVE_POOL : SEPOLIA_AAVE_POOL;
        address aaveAToken = isMainnet ? MAINNET_AAVE_AUSDC : SEPOLIA_AAVE_ATOKEN;

        AaveV3Strategy aaveStrategy =
            new AaveV3Strategy(asset, deployed.vault, deployer, aavePool, aaveAToken);
        deployed.aaveStrategy = address(aaveStrategy);
        console2.log("5. AaveV3Strategy:", deployed.aaveStrategy);

        // Moola, Compound not available on Celo per celopedia-skills review
        // Deploy MentoSavingsStrategy for cUSD savings yield
        address mentoSavingsToken = isMainnet
            ? MAINNET_MENTO_SAVINGS_CU
            : address(0); // No Mento Savings on Sepolia yet

        MentoSavingsStrategy mentoSavingsStrategy;
        if (isMainnet) {
            mentoSavingsStrategy = new MentoSavingsStrategy(
                MAINNET_CUSD, // cUSD as asset
                deployed.vault,
                deployer,
                mentoSavingsToken
            );
            deployed.mentoSavingsStrategy = address(mentoSavingsStrategy);
            console2.log("6. MentoSavingsStrategy:", deployed.mentoSavingsStrategy);
        } else {
            deployed.mentoSavingsStrategy = address(0);
            console2.log("6. MentoSavingsStrategy: skipped (not on testnet)");
        }

        // Using ReserveStrategy as fallback alongside Aave
        ReserveStrategy reserveStrategy = new ReserveStrategy(asset, deployed.vault, deployer);
        deployed.reserveStrategy = address(reserveStrategy);
        console2.log("7. ReserveStrategy:", deployed.reserveStrategy);

        // ============ 6. Deploy Controller ============

        // On mainnet, replace with real Chainlink Functions forwarder
        address forwarder = deployer; // TODO: set real Chainlink forwarder before mainnet
        SavannaController controller =
            new SavannaController(deployed.vault, forwarder, deployer);
        deployed.controller = address(controller);
        console2.log("7. SavannaController:", deployed.controller);

        // ============ 7. Wire Up ============

        // Set controller on vault
        vault.setController(deployed.controller);
        console2.log("=> Vault controller set");

        // Register strategies on controller (AaveV3 + MentoSavings + Reserve on Celo)
        controller.setStrategy(DataTypes.Protocol.AaveV3, deployed.aaveStrategy);
        if (deployed.mentoSavingsStrategy != address(0)) {
            controller.setStrategy(DataTypes.Protocol.MentoSavings, deployed.mentoSavingsStrategy);
        }
        controller.setStrategy(DataTypes.Protocol.Reserve, deployed.reserveStrategy);
        console2.log("=> Strategies registered (AaveV3, MentoSavings, Reserve)");

        // Set controller on strategies
        aaveStrategy.setController(deployed.controller);
        if (deployed.mentoSavingsStrategy != address(0)) {
            mentoSavingsStrategy.setController(deployed.controller);
        }
        reserveStrategy.setController(deployed.controller);
        console2.log("=> Controller set on strategies");

        // Register price feed
        MockPriceFeed mockFeed = new MockPriceFeed(int256(1e8), 8); // $1.00 USDC
        feedConsumer.registerFeed(asset, address(mockFeed), 3600);
        controller.setPriceFeed(asset, address(mockFeed));
        console2.log("=> Price feeds registered");

        // ============ 8. Deploy Cross-Chain Receiver ============

        address swapRouter = isMainnet ? MAINNET_UBESWAP_ROUTER : address(0);
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
        uint256[] memory allowedChains = new uint256[](8);
        allowedChains[0] = 1; // Ethereum Mainnet
        allowedChains[1] = 42161; // Arbitrum One
        allowedChains[2] = 10; // Optimism
        allowedChains[3] = 137; // Polygon
        allowedChains[4] = 8453; // Base
        allowedChains[5] = 56; // BSC
        allowedChains[6] = 43114; // Avalanche
        allowedChains[7] = 11142220; // Celo Sepolia
        crossChainReceiver.setSourceChains(allowedChains, true);
        console2.log("=> Source chains allowed (ETH, ARB, OP, MATIC, BASE, BSC, AVAX, CELO_SEPOLIA)");

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
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {SavannaFunctionsConsumer} from "../src/functions/SavannaFunctionsConsumer.sol";

/// @title DeployFunctions
/// @notice Deploy SavannaFunctionsConsumer and wire it to Controller
///
/// Setup steps (run in order):
///
///   1. Create subscription at https://functions.chain.link
///   2. Fund subscription with LINK
///   3. Run this script:
///        forge script script/DeployFunctions.s.sol --rpc-url celo_sepolia --broadcast
///   4. Register consumer in Chainlink dashboard
///   5. Set source code via setSourceCode()
///   6. Set consumer as forwarder on controller: controller.setForwarder(consumerAddress)
///
/// Environment variables:
///   CHAINLINK_SUBSCRIPTION_ID   — Your Chainlink Functions subscription ID
///   CHAINLINK_ROUTER_CELO       — Router address for target network
///   CHAINLINK_DON_ID            — DON ID (e.g. fun-celo-alfajores-1)
///   CONTROLLER_ADDRESS          — Deployed SavannaController address
///   VAULT_ADDRESS               — Deployed SavannaVault address
contract DeployFunctions is Script {
    // ============ Chainlink Addresses ============

    // Celo Alfajores (Testnet)
    address constant ROUTER_ALFAJORES = 0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0;
    bytes32 constant DON_ID_ALFAJORES = "fun-celo-alfajores-1";

    // Celo Mainnet
    address constant ROUTER_MAINNET = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 constant DON_ID_MAINNET = "fun-celo-mainnet-1";

    function run() external {
        // Read config from env
        uint64 subId = uint64(vm.envUint("CHAINLINK_SUBSCRIPTION_ID"));
        address router = vm.envOr("CHAINLINK_ROUTER_CELO", ROUTER_ALFAJORES);
        bytes32 donId = vm.envOr("CHAINLINK_DON_ID", DON_ID_ALFAJORES);
        address controller = vm.envAddress("CONTROLLER_ADDRESS");
        address vault = vm.envAddress("VAULT_ADDRESS");
        address deployer = vm.envOr("DEPLOYER_ADDRESS", msg.sender);

        console2.log("=== Deploy SavannaFunctionsConsumer ===");
        console2.log("Router:", router);
        console2.log("Controller:", controller);
        console2.log("Vault:", vault);
        console2.log("Subscription ID:", subId);
        console2.log("DON ID:");
        console2.logBytes32(donId);
        console2.log("Deployer:", deployer);

        vm.startBroadcast();

        // Deploy consumer
        SavannaFunctionsConsumer consumer = new SavannaFunctionsConsumer(
            router,
            controller,
            vault,
            subId,
            donId,
            deployer
        );

        console2.log("=== Deployed ===");
        console2.log("Consumer:", address(consumer));

        vm.stopBroadcast();

        // Print post-deployment instructions
        console2.log("");
        console2.log("=== POST-DEPLOYMENT STEPS ===");
        console2.log("1. Register consumer in Chainlink dashboard:");
        console2.log("   https://functions.chain.link/");
        console2.log("   Add consumer:", address(consumer));
        console2.log("");
        console2.log("2. Set consumer as forwarder on controller:");
        console2.log("   controller.setForwarder(%s)", address(consumer));
        console2.log("");
        console2.log("3. Set source code on consumer:");
        console2.log("   consumer.setSourceCode(<contents of functions/source.js>)");
        console2.log("");
        console2.log("4. Set vault to call consumer for AI requests:");
        console2.log("   (or use off-chain monitor to detect StrategyRequested events)");
    }
}

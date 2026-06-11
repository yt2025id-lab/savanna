// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {AaveV3Strategy} from "../src/strategies/AaveV3Strategy.sol";
import {MentoSavingsStrategy} from "../src/strategies/MentoSavingsStrategy.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";

/// @title AddStrategies
/// @notice Deploy AaveV3 + MentoSavings strategies and register on existing controller
contract AddStrategies is Script {
    // Existing contracts on Celo Mainnet (from deployments/celo-mainnet.json)
    address constant CONTROLLER = 0xf4B8358E372aE659a4D9219DD86C61233cE4280e;
    address constant VAULT = 0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af;
    address constant VAULT_ASSET = 0x765DE816845861e75A25fCA122bb6898B8B1282a; // USDm

    // Aave V3 on Celo Mainnet
    address constant AAVE_POOL = 0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402;
    address constant AAVE_ACUSD = 0xBba98352628B0B0c4b40583F593fFCb630935a45; // aCUSD (aToken for USDm)

    // Mento Savings on Celo Mainnet
    address constant MENTO_SAVINGS = 0x2a4D787EB7e7306Ef8Bb5143C6295C5731d1B4F4; // sCU

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("=== Adding Strategies ===");
        console2.log("Deployer:", deployer);
        console2.log("Controller:", CONTROLLER);
        console2.log("");

        vm.startBroadcast(deployerKey);

        // 1. Deploy AaveV3Strategy
        AaveV3Strategy aaveStrategy = new AaveV3Strategy(
            VAULT_ASSET,
            VAULT,
            deployer,
            AAVE_POOL,
            AAVE_ACUSD
        );
        console2.log("AaveV3Strategy deployed:", address(aaveStrategy));

        // 2. Deploy MentoSavingsStrategy
        MentoSavingsStrategy mentoStrategy = new MentoSavingsStrategy(
            VAULT_ASSET,
            VAULT,
            deployer,
            MENTO_SAVINGS
        );
        console2.log("MentoSavingsStrategy deployed:", address(mentoStrategy));

        // 3. Set controller on strategies
        aaveStrategy.setController(CONTROLLER);
        mentoStrategy.setController(CONTROLLER);
        console2.log("Controller set on both strategies");

        // 4. Register strategies on controller (as owner)
        SavannaController controller = SavannaController(CONTROLLER);
        controller.setStrategy(DataTypes.Protocol.AaveV3, address(aaveStrategy));
        controller.setStrategy(DataTypes.Protocol.MentoSavings, address(mentoStrategy));
        console2.log("Strategies registered on controller");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Complete ===");
        console2.log("AaveV3Strategy:", address(aaveStrategy));
        console2.log("MentoSavingsStrategy:", address(mentoStrategy));
    }
}

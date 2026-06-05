// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";

contract DevRel is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address vaultAddr = vm.envAddress("VAULT_ADDRESS");

        console2.log("=== DevRel: Generating On-Chain Activity ===");
        console2.log("Deployer:", deployer);
        console2.log("Vault:", vaultAddr);
        console2.log("");

        vm.startBroadcast(deployerKey);

        SavannaVault vault = SavannaVault(vaultAddr);
        IERC20 usdc = IERC20(vault.asset());
        uint256 count = 0;

        uint256 TOKEN_AMOUNT = 100e6;

        // ============ TX 1: Strategy Request ============
        vault.triggerStrategyRequest(30 days);
        count++;

        // ============ TX 2-9: Register MiniPay wallets (8 individual) ============
        address[8] memory users = [
            0x1111111111111111111111111111111111111111,
            0x2222222222222222222222222222222222222222,
            0x3333333333333333333333333333333333333333,
            0x4444444444444444444444444444444444444444,
            0x5555555555555555555555555555555555555555,
            0x6666666666666666666666666666666666666666,
            0x7777777777777777777777777777777777777777,
            0x8888888888888888888888888888888888888888
        ];
        for (uint256 i = 0; i < users.length; i++) {
            vault.setMinipayWallet(users[i], true);
            count++;
        }

        // ============ TX 10-11: Toggle one MiniPay wallet ============
        vault.setMinipayWallet(users[0], false);
        count++;
        vault.setMinipayWallet(users[0], true);
        count++;

        // ============ TX 12: Batch register ============
        address[] memory batchUsers = new address[](3);
        batchUsers[0] = address(uint160(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa));
        batchUsers[1] = address(uint160(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB));
        batchUsers[2] = address(uint160(0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC));
        bool[] memory statuses = new bool[](3);
        statuses[0] = true; statuses[1] = true; statuses[2] = true;
        vault.setMinipayWallets(batchUsers, statuses);
        count++;

        // ============ TX 13-16: Tweak config ============
        vault.setMinDeposit(10e6);
        count++;
        vault.setMinipayMinDeposit(5e6);
        count++;
        vault.setMinDeposit(20e6);
        count++;
        vault.setMinipayMinDeposit(10e6);
        count++;

        // ============ TX 17-18: Rebalance interval ============
        vault.setRebalanceInterval(3 days);
        count++;
        vault.setRebalanceInterval(7 days);
        count++;

        // ============ TX 19-20: Pause/Unpause ============
        vault.pause();
        count++;
        vault.unpause();
        count++;

        // ============ TX 21-23: Real token flow ============
        usdc.approve(address(vault), TOKEN_AMOUNT);
        count++;
        vault.deposit(TOKEN_AMOUNT, deployer);
        count++;
        vault.withdraw(TOKEN_AMOUNT, deployer, deployer);
        count++;

        console2.log("=== Total: %s on-chain transactions ===", count);

        vm.stopBroadcast();
    }
}

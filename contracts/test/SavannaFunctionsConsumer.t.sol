// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SavannaFunctionsConsumer} from "../src/functions/SavannaFunctionsConsumer.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";
import {SavannaOracle} from "../src/SavannaOracle.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {MockStrategy} from "./mocks/MockStrategy.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";
import {Errors} from "../src/libraries/Errors.sol";

contract SavannaFunctionsConsumerTest is Test {
    MockERC20 public usdc;
    SavannaOracle public oracle;
    MockPriceFeed public priceFeed;
    SavannaVault public vault;
    SavannaController public controller;
    SavannaFunctionsConsumer public consumer;
    MockStrategy public aaveStrategy;
    MockStrategy public reserveStrategy;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint64 constant SUBSCRIPTION_ID = 1234;
    bytes32 constant DON_ID = "fun-celo-alfajores-1";

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock USDC (6 decimals)
        usdc = new MockERC20("Mock USDC", "USDC", 6, 1_000_000_000e6, owner);

        // Deploy oracle
        oracle = new SavannaOracle(owner);

        // Deploy mock price feed ($1.00 USDC, 8 decimals)
        priceFeed = new MockPriceFeed(1e8, 8);

        // Register USDC in oracle
        oracle.setAssetFeed(address(usdc), address(priceFeed));

        // Deploy vault
        vault = new SavannaVault(IERC20(address(usdc)), owner, address(oracle));

        // Deploy controller (owner is initial forwarder)
        controller = new SavannaController(address(vault), owner, owner);

        // Wire vault ↔ controller
        vault.setController(address(controller));

        // Deploy strategies
        aaveStrategy = new MockStrategy(IERC20(address(usdc)), address(vault), owner);
        reserveStrategy = new MockStrategy(IERC20(address(usdc)), address(vault), owner);

        controller.setStrategy(DataTypes.Protocol.AaveV3, address(aaveStrategy));
        controller.setStrategy(DataTypes.Protocol.Reserve, address(reserveStrategy));

        // Set controller on strategies so they accept withdraw calls
        aaveStrategy.setController(address(controller));
        reserveStrategy.setController(address(controller));

        // Deploy Functions Consumer
        consumer = new SavannaFunctionsConsumer(
            address(0), // Router — not used in unit tests
            address(controller),
            address(vault),
            SUBSCRIPTION_ID,
            DON_ID,
            owner
        );

        // Set consumer as forwarder on controller
        controller.setForwarder(address(consumer));

        // Set source code
        consumer.setSourceCode("// AI source code placeholder for testing");

        // Fund users
        usdc.mint(alice, 100_000e6);
        usdc.mint(bob, 100_000e6);

        vm.stopPrank();

        // Approve vault for users
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ============ Deployment ============

    function test_deployment_state() public view {
        assertEq(address(consumer.controller()), address(controller));
        assertEq(address(consumer.vault()), address(vault));
        assertEq(consumer.subscriptionId(), SUBSCRIPTION_ID);
        assertEq(consumer.donId(), DON_ID);
        assertEq(consumer.owner(), owner);
        assertEq(consumer.callbackGasLimit(), 300_000);
        assertEq(consumer.totalRequestsSent(), 0);
        assertEq(consumer.totalResponsesReceived(), 0);
    }

    // ============ Admin Functions ============

    function test_setSourceCode() public {
        vm.prank(owner);
        consumer.setSourceCode("const x = 1; return Functions.encodeUint256(x);");
        assertEq(consumer.sourceCode(), "const x = 1; return Functions.encodeUint256(x);");
    }

    function test_setSourceCode_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        consumer.setSourceCode("new code");
    }

    function test_setSubscriptionId() public {
        vm.prank(owner);
        consumer.setSubscriptionId(5678);
        assertEq(consumer.subscriptionId(), 5678);
    }

    function test_setDonId() public {
        bytes32 newDonId = "fun-celo-mainnet-1";
        vm.prank(owner);
        consumer.setDonId(newDonId);
        assertEq(consumer.donId(), newDonId);
    }

    function test_setController() public {
        address newController = makeAddr("newController");
        vm.prank(owner);
        consumer.setController(newController);
        assertEq(address(consumer.controller()), newController);
    }

    function test_setController_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert();
        consumer.setController(address(0));
    }

    function test_setCallbackGasLimit() public {
        vm.prank(owner);
        consumer.setCallbackGasLimit(500_000);
        assertEq(consumer.callbackGasLimit(), 500_000);
    }

    // ============ Request ============

    function test_requestAIStrategy_revertUnauthorized() public {
        vm.prank(alice);
        vm.expectRevert(Errors.Savanna__Unauthorized.selector);
        consumer.requestAIStrategy(alice, 30 days);
    }

    function test_requestAIStrategy_revertNoActiveRequest() public {
        // Alice hasn't deposited or requested strategy
        vm.prank(owner);
        vm.expectRevert(Errors.Savanna__NoActiveRequest.selector);
        consumer.requestAIStrategy(alice, 30 days);
    }

    function test_fullFlow_depositRequestAIExecute() public {
        // 1. Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6, alice);
        vm.stopPrank();

        // 2. Alice requests strategy
        vm.prank(alice);
        vault.requestStrategy(30 days);

        // Verify alice has active request
        assertTrue(vault.hasActiveRequest(alice));

        // 3. Simulate AI recommending Aave V3 via onReport
        // (consumer._fulfillRequest decodes DON response → calls controller.onReport)
        bytes memory report = abi.encode(
            alice,
            uint8(0),       // AaveV3
            uint256(10000), // 100%
            uint256(500),   // 5% APY
            "AI recommendation"
        );

        vm.prank(address(consumer)); // Consumer is the forwarder
        controller.onReport("", report);

        // Verify position is active
        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertTrue(pos.isActive);
        assertEq(pos.activeStrategy, address(aaveStrategy));
        assertEq(pos.allocatedAmount, 1000e6);
    }

    function test_fullFlow_reserveStrategy() public {
        // 1. Bob deposits
        vm.startPrank(bob);
        usdc.approve(address(vault), 500e6);
        vault.deposit(500e6, bob);
        vm.stopPrank();

        // 2. Bob requests strategy
        vm.prank(bob);
        vault.requestStrategy(3 days); // Short horizon → should prefer Reserve

        // 3. Simulate AI recommending Reserve
        bytes memory report = abi.encode(
            bob,
            uint8(3),       // Reserve
            uint256(10000), // 100%
            uint256(100),   // 1% APY
            "Safe short-term allocation"
        );

        vm.prank(address(consumer));
        controller.onReport("", report);

        // Verify
        DataTypes.UserPosition memory pos = vault.getUserPosition(bob);
        assertTrue(pos.isActive);
        assertEq(pos.activeStrategy, address(reserveStrategy));
        assertEq(pos.allocatedAmount, 500e6);
    }

    function test_fullFlow_partialAllocation() public {
        // Alice deposits
        vm.startPrank(alice);
        usdc.approve(address(vault), 2000e6);
        vault.deposit(2000e6, alice);
        vm.stopPrank();

        vm.prank(alice);
        vault.requestStrategy(60 days);

        // AI recommends 80% allocation to Aave
        bytes memory report = abi.encode(
            alice,
            uint8(0),       // AaveV3
            uint256(8000),  // 80%
            uint256(450),   // 4.5% APY
            "Partial allocation for risk management"
        );

        vm.prank(address(consumer));
        controller.onReport("", report);

        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertTrue(pos.isActive);
        assertEq(pos.allocatedAmount, 1600e6); // 80% of 2000
    }

    // ============ Withdraw Flow ============

    function test_withdrawAfterAIStrategy() public {
        // Setup: deposit, request, execute
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6, alice);
        vm.stopPrank();

        vm.prank(alice);
        vault.requestStrategy(30 days);

        bytes memory report = abi.encode(alice, uint8(0), uint256(10000), uint256(500), "test");
        vm.prank(address(consumer));
        controller.onReport("", report);

        // Verify position is active
        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertTrue(pos.isActive);
        assertEq(pos.allocatedAmount, 1000e6);

        // Withdraw from strategy (funds return to vault, not directly to user)
        vm.prank(alice);
        controller.withdrawFromStrategy(alice);

        // Position should be inactive
        pos = vault.getUserPosition(alice);
        assertFalse(pos.isActive);

        // Funds are back in vault — Alice can now redeem her shares
        uint256 aliceShares = vault.balanceOf(alice);
        assertGt(aliceShares, 0);

        // Alice redeems shares to get USDC back
        uint256 usdcBalBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.redeem(aliceShares, alice, alice);
        uint256 usdcBalAfter = usdc.balanceOf(alice);

        assertGt(usdcBalAfter, usdcBalBefore);
        assertEq(usdcBalAfter - usdcBalBefore, 1000e6);
    }

    // ============ Multiple Users ============

    function test_multipleUsers_differentStrategies() public {
        // Alice → Aave, Bob → Reserve
        vm.startPrank(alice);
        usdc.approve(address(vault), 1000e6);
        vault.deposit(1000e6, alice);
        vault.requestStrategy(90 days);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(vault), 500e6);
        vault.deposit(500e6, bob);
        vault.requestStrategy(7 days);
        vm.stopPrank();

        // Alice gets Aave
        vm.prank(address(consumer));
        controller.onReport("", abi.encode(alice, uint8(0), uint256(10000), uint256(500), "long-term"));

        // Bob gets Reserve
        vm.prank(address(consumer));
        controller.onReport("", abi.encode(bob, uint8(3), uint256(10000), uint256(100), "short-term"));

        // Verify
        DataTypes.UserPosition memory alicePos = vault.getUserPosition(alice);
        DataTypes.UserPosition memory bobPos = vault.getUserPosition(bob);

        assertTrue(alicePos.isActive);
        assertTrue(bobPos.isActive);
        assertEq(alicePos.activeStrategy, address(aaveStrategy));
        assertEq(bobPos.activeStrategy, address(reserveStrategy));
    }
}

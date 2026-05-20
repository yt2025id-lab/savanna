// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {SavannaFeedConsumer} from "../src/feeds/SavannaFeedConsumer.sol";
import {ReserveStrategy} from "../src/strategies/ReserveStrategy.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";
import {Errors} from "../src/libraries/Errors.sol";
import {Constants} from "../src/libraries/Constants.sol";

/// @title SavannaVaultTest
/// @notice Unit tests for SavannaVault on Celo
contract SavannaVaultTest is Test {
    // ============ Contracts ============
    MockERC20 public usdc;
    SavannaVault public vault;
    SavannaController public controller;
    SavannaFeedConsumer public feedConsumer;
    MockPriceFeed public priceFeed;
    ReserveStrategy public reserveStrategy;

    // ============ Actors ============
    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    // ============ Setup ============

    function setUp() public virtual {
        vm.startPrank(owner);

        // Deploy mock USDC (6 decimals like real USDC)
        usdc = new MockERC20("Mock USDC", "USDC", 6, 1_000_000_000e6, owner);

        // Deploy vault
        vault = new SavannaVault(IERC20(address(usdc)), owner);

        // Deploy mock price feed ($1.00 USDC)
        priceFeed = new MockPriceFeed(1e8, 8);

        // Deploy feed consumer
        feedConsumer = new SavannaFeedConsumer(owner);
        feedConsumer.registerFeed(address(usdc), address(priceFeed), 3600);

        // Deploy reserve strategy
        reserveStrategy = new ReserveStrategy(address(usdc), address(vault), owner);

        // Deploy controller (owner acts as forwarder for testing)
        controller = new SavannaController(address(vault), owner, owner);

        // Wire up
        vault.setController(address(controller));
        controller.setStrategy(DataTypes.Protocol.Reserve, address(reserveStrategy));
        controller.setPriceFeed(address(usdc), address(priceFeed));
        reserveStrategy.setController(address(controller));

        // Fund users
        usdc.mint(alice, 100_000e6); // 100K USDC
        usdc.mint(bob, 100_000e6);   // 100K USDC

        vm.stopPrank();

        // Approve vault for users
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ============ Helper ============

    /// @dev Simulate Chainlink oracle delivering a recommendation
    function _simulateOracleReport(
        address user,
        uint8 protocolId,
        uint256 allocationBps,
        uint256 expectedAPY,
        string memory reasoning
    ) internal {
        bytes memory report = abi.encode(user, protocolId, allocationBps, expectedAPY, reasoning);
        vm.prank(owner); // owner acts as forwarder
        controller.onReport("", report);
    }

    // ============ Deposit Tests ============

    function test_deposit_success() public {
        uint256 depositAmount = 1000e6; // 1K USDC

        vm.prank(alice);
        uint256 shares = vault.deposit(depositAmount, alice);

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(alice), shares, "Alice should have shares");
        assertEq(usdc.balanceOf(address(vault)), depositAmount, "Vault should hold USDC");
    }

    function test_deposit_revertBelowMinimum() public {
        uint256 lowAmount = 5e6; // 5 USDC, below MIN_DEPOSIT

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__InsufficientDeposit.selector, lowAmount, Constants.MIN_DEPOSIT)
        );
        vault.deposit(lowAmount, alice);
    }

    function test_deposit_revertWhenPaused() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.deposit(1000e6, alice);
    }

    // ============ Strategy Request Tests ============

    function test_requestStrategy_success() public {
        uint256 depositAmount = 10000e6;
        uint256 timeHorizon = 30 days;

        vm.startPrank(alice);
        vault.deposit(depositAmount, alice);
        vault.requestStrategy(timeHorizon);
        vm.stopPrank();

        assertTrue(vault.hasActiveRequest(alice), "Should have active request");

        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertEq(pos.depositAmount, depositAmount, "Deposit amount mismatch");
        assertEq(pos.timeHorizon, timeHorizon, "Time horizon mismatch");
        assertFalse(pos.isActive, "Position should not be active yet");
    }

    function test_requestStrategy_revertNoDeposit() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__InsufficientDeposit.selector, 0, Constants.MIN_DEPOSIT)
        );
        vault.requestStrategy(30 days);
    }

    function test_requestStrategy_revertInvalidTimeHorizon() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);

        // Too short
        vm.expectRevert(
            abi.encodeWithSelector(
                Errors.Savanna__InvalidTimeHorizon.selector,
                12 hours,
                Constants.MIN_TIME_HORIZON,
                Constants.MAX_TIME_HORIZON
            )
        );
        vault.requestStrategy(12 hours);
    }

    function test_requestStrategy_revertDuplicateRequest() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);

        vm.expectRevert(Errors.Savanna__ActiveRequestExists.selector);
        vault.requestStrategy(60 days);
        vm.stopPrank();
    }

    function test_requestStrategy_revertControllerNotSet() public {
        // Deploy a new vault without controller
        vm.prank(owner);
        SavannaVault newVault = new SavannaVault(IERC20(address(usdc)), owner);

        vm.prank(alice);
        usdc.approve(address(newVault), type(uint256).max);

        vm.startPrank(alice);
        newVault.deposit(10000e6, alice);
        vm.expectRevert(Errors.Savanna__ControllerNotSet.selector);
        newVault.requestStrategy(30 days);
        vm.stopPrank();
    }

    // ============ Cancel Request Tests ============

    function test_cancelTimedOutRequest_success() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        // Fast forward past timeout
        vm.warp(block.timestamp + Constants.REQUEST_TIMEOUT + 1);

        vm.prank(alice);
        vault.cancelTimedOutRequest();

        assertFalse(vault.hasActiveRequest(alice), "Request should be cancelled");
    }

    function test_cancelTimedOutRequest_revertNotTimedOut() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);

        uint256 remaining = Constants.REQUEST_TIMEOUT;
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__RequestNotTimedOut.selector, remaining)
        );
        vault.cancelTimedOutRequest();
        vm.stopPrank();
    }

    // ============ Oracle Report Tests ============

    function test_onReport_executeStrategy() public {
        uint256 depositAmount = 10000e6;

        vm.startPrank(alice);
        vault.deposit(depositAmount, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        // Simulate oracle recommendation: 100% allocation to Reserve protocol
        _simulateOracleReport(alice, 3, 10000, 500, "Reserve is safest in test");

        // Verify position is now active
        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertTrue(pos.isActive, "Position should be active");
        assertEq(pos.activeStrategy, address(reserveStrategy), "Strategy should be reserve");
        assertEq(pos.allocatedAmount, depositAmount, "Full amount allocated");
        assertEq(vault.totalDeployed(), depositAmount, "Total deployed should match");

        assertFalse(vault.hasActiveRequest(alice), "Request should be cleared");
    }

    function test_onReport_revertInvalidAllocation() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        // Allocation > 10000 bps (100%)
        bytes memory report = abi.encode(alice, uint8(3), uint256(15000), uint256(500), "bad");
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__InvalidAllocation.selector, 15000)
        );
        controller.onReport("", report);
    }

    function test_onReport_revertNotForwarder() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        bytes memory report = abi.encode(alice, uint8(3), uint256(10000), uint256(500), "test");
        vm.prank(alice); // Alice is not the forwarder
        vm.expectRevert(Errors.Savanna__OnlyForwarder.selector);
        controller.onReport("", report);
    }

    function test_onReport_revertStrategyNotRegistered() public {
        vm.startPrank(alice);
        vault.deposit(10000e6, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        // Protocol 0 (AaveV3) has no registered strategy in this test
        bytes memory report = abi.encode(alice, uint8(0), uint256(10000), uint256(500), "test");
        vm.prank(owner);
        vm.expectRevert(Errors.Savanna__StrategyNotRegistered.selector);
        controller.onReport("", report);
    }

    function test_onReport_revertInvalidReport() public {
        bytes memory report = abi.encode(address(0), uint8(3), uint256(10000), uint256(500), "test");
        vm.prank(owner);
        vm.expectRevert(Errors.Savanna__InvalidReport.selector);
        controller.onReport("", report);
    }

    // ============ Withdrawal Tests ============

    function test_withdrawFromStrategy_success() public {
        uint256 depositAmount = 10000e6;

        // Setup: deposit and execute strategy
        vm.startPrank(alice);
        vault.deposit(depositAmount, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        _simulateOracleReport(alice, 3, 10000, 500, "test");

        // Verify deployed
        assertEq(vault.totalDeployed(), depositAmount);

        // Withdraw from strategy via controller
        vm.prank(alice);
        controller.withdrawFromStrategy(alice);

        // Verify withdrawn
        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertFalse(pos.isActive, "Position should be inactive");
        assertEq(vault.totalDeployed(), 0, "Nothing deployed");

        // Verify vault now holds the assets back
        assertEq(usdc.balanceOf(address(vault)), depositAmount, "Vault should have assets back");

        // Alice can now withdraw from vault
        uint256 aliceBalBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(depositAmount, alice, alice);

        // Verify alice got her USDC back
        assertEq(usdc.balanceOf(alice) - aliceBalBefore, depositAmount, "Alice should get her deposit back");
        assertEq(vault.balanceOf(alice), 0, "Alice should have no shares left");
    }

    // ============ View Function Tests ============

    function test_totalAssets_includesDeployed() public {
        uint256 depositAmount = 10000e6;

        vm.prank(alice);
        vault.deposit(depositAmount, alice);

        assertEq(vault.totalAssets(), depositAmount, "Total assets should equal deposit");

        vm.prank(alice);
        vault.requestStrategy(30 days);

        _simulateOracleReport(alice, 3, 10000, 500, "test");

        // After deploying to strategy, vault balance is 0 but totalAssets includes deployed
        assertEq(vault.totalAssets(), depositAmount, "Total assets should include deployed");
    }

    function test_emergencyCompleteStrategy() public {
        uint256 depositAmount = 10000e6;

        vm.startPrank(alice);
        vault.deposit(depositAmount, alice);
        vault.requestStrategy(30 days);
        vm.stopPrank();

        _simulateOracleReport(alice, 3, 10000, 500, "test");

        // Owner can emergency complete
        vm.prank(owner);
        vault.emergencyCompleteStrategy(alice);

        DataTypes.UserPosition memory pos = vault.getUserPosition(alice);
        assertFalse(pos.isActive, "Position should be inactive");
        assertEq(vault.totalDeployed(), 0, "Nothing deployed");
    }

    // ============ Pause Tests ============

    function test_pause_blocksDeposits() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        vault.deposit(1000e6, alice);
    }

    function test_unpause_allowsDeposits() public {
        vm.startPrank(owner);
        vault.pause();
        vault.unpause();
        vm.stopPrank();

        vm.prank(alice);
        uint256 shares = vault.deposit(1000e6, alice);
        assertGt(shares, 0);
    }

    // ============ Edge Case Tests ============

    function test_multipleUsers_depositAndStrategy() public {
        uint256 aliceDeposit = 10000e6;
        uint256 bobDeposit = 20000e6;

        // Alice deposits
        vm.prank(alice);
        vault.deposit(aliceDeposit, alice);

        // Bob deposits
        vm.prank(bob);
        vault.deposit(bobDeposit, bob);

        // Alice requests strategy
        vm.prank(alice);
        vault.requestStrategy(30 days);
        _simulateOracleReport(alice, 3, 10000, 500, "Alice strategy");

        // Bob requests strategy
        vm.prank(bob);
        vault.requestStrategy(60 days);
        _simulateOracleReport(bob, 3, 10000, 500, "Bob strategy");

        // Verify both active
        assertEq(vault.totalDeployed(), aliceDeposit + bobDeposit);
        assertEq(vault.totalPositions(), 2);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {SavannaOracle} from "../src/SavannaOracle.sol";
import {Errors} from "../src/libraries/Errors.sol";

/// @title SavannaOracleTest
/// @notice Unit tests for SavannaOracle — Chainlink Data Feed integration
contract SavannaOracleTest is Test {
    SavannaOracle public oracle;
    MockPriceFeed public usdcFeed;
    MockPriceFeed public celoFeed;
    MockERC20 public usdc;

    address public owner = makeAddr("owner");

    function setUp() public {
        vm.startPrank(owner);

        // Deploy oracle
        oracle = new SavannaOracle(owner);

        // Deploy mock price feeds
        usdcFeed = new MockPriceFeed(1e8, 8);       // $1.00 USDC (8 decimals)
        celoFeed = new MockPriceFeed(50e8, 8);      // $50.00 CELO (8 decimals)

        // Deploy mock USDC
        usdc = new MockERC20("Mock USDC", "USDC", 6, 1_000_000e6, owner);

        // Register feeds in oracle
        oracle.setAssetFeed(address(usdc), address(usdcFeed));
        oracle.setAssetFeed(address(0), address(celoFeed)); // CELO

        vm.stopPrank();
    }

    // ============ Price Retrieval Tests ============

    function test_getAssetPrice_USDC() public view {
        uint256 price = oracle.getAssetPrice(address(usdc));
        // 1e8 (8 decimals) normalized to 18 decimals = 1e18
        assertEq(price, 1e18, "USDC price should be $1.00");
    }

    function test_getAssetPrice_CELO() public view {
        uint256 price = oracle.getAssetPrice(address(0));
        // 50e8 (8 decimals) normalized to 18 decimals = 50e18
        assertEq(price, 50e18, "CELO price should be $50.00");
    }

    function test_getAssetValueUsd() public view {
        // 1000 USDC (6 decimals) at $1.00 = 1000e6 * 1e18 / 1e18 = 1000e6
        uint256 value = oracle.getAssetValueUsd(address(usdc), 1000e6);
        assertEq(value, 1000e6, "1000 USDC should be worth $1000 (in 18-decimal USD)");

        // 10 CELO (18 decimals) at $50.00 = 10e18 * 50e18 / 1e18 = 500e18
        uint256 celoValue = oracle.getAssetValueUsd(address(0), 10e18);
        assertEq(celoValue, 500e18, "10 CELO should be worth $500");
    }

    function test_getAssetPrice_differentDecimals() public {
        // Test with 6-decimal feed
        MockPriceFeed feed6 = new MockPriceFeed(2_500_000, 6); // $2.50
        vm.prank(owner);
        oracle.setAssetFeed(address(0x123), address(feed6));

        uint256 price = oracle.getAssetPrice(address(0x123));
        // 2_500_000 * 1e18 / 1e6 = 2.5e18
        assertEq(price, 2.5e18, "Price should be $2.50 in 18 decimals");
    }

    // ============ Staleness Tests ============

    function test_revertStalePrice() public {
        // Warp to a reasonable time so subtraction doesn't underflow
        vm.warp(1_000_000);

        // Set feed timestamp to 2 hours ago (> 1 hour threshold)
        uint256 staleTime = block.timestamp - 7200;
        celoFeed.setTimestamp(staleTime);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__StalePrice.selector, address(celoFeed), staleTime)
        );
        oracle.getAssetPrice(address(0));
    }

    function test_acceptFreshPrice() public view {
        // Feed is fresh (just created), should work
        uint256 price = oracle.getAssetPrice(address(usdc));
        assertEq(price, 1e18);
    }

    function test_acceptPriceJustBeforeThreshold() public {
        // Warp to a reasonable time
        vm.warp(1_000_000);

        // Set timestamp just within threshold (3599 seconds ago)
        celoFeed.setTimestamp(block.timestamp - 3599);
        // Should not revert
        uint256 price = oracle.getAssetPrice(address(0));
        assertEq(price, 50e18);
    }

    function test_revertPriceExactlyAtThreshold() public {
        // Warp to a reasonable time
        vm.warp(1_000_000);

        // Set timestamp exactly at threshold + 1 second past it (3601 seconds ago)
        // The oracle uses `>` so exactly 3600 is still valid, 3601 is stale
        uint256 staleTime = block.timestamp - (3600 + 1);
        celoFeed.setTimestamp(staleTime);
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__StalePrice.selector, address(celoFeed), staleTime)
        );
        oracle.getAssetPrice(address(0));
    }

    // ============ Invalid Price Tests ============

    function test_revertZeroPrice() public {
        celoFeed.setPrice(0);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__InvalidPrice.selector, address(celoFeed))
        );
        oracle.getAssetPrice(address(0));
    }

    function test_revertNegativePrice() public {
        celoFeed.setPrice(-1e8);

        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__InvalidPrice.selector, address(celoFeed))
        );
        oracle.getAssetPrice(address(0));
    }

    // ============ Unsupported Asset Tests ============

    function test_revertUnsupportedAsset() public {
        address unsupported = makeAddr("unsupported");

        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__FeedNotSet.selector, unsupported)
        );
        oracle.getAssetPrice(unsupported);
    }

    // ============ Validated Round Data Tests ============

    function test_getValidatedRoundData() public view {
        (uint80 roundId, int256 answer, uint256 updatedAt) = oracle.getValidatedRoundData(address(usdcFeed));

        assertEq(roundId, 1, "Round ID should be 1");
        assertEq(answer, 1e8, "Answer should be $1.00");
        assertGt(updatedAt, 0, "Updated at should be > 0");
    }

    function test_getValidatedRoundData_tracksRoundUpdates() public {
        // Update price
        usdcFeed.setPrice(1.05e8); // $1.05

        (uint80 roundId, int256 answer,) = oracle.getValidatedRoundData(address(usdcFeed));
        assertEq(roundId, 2, "Round ID should increment to 2");
        assertEq(answer, 1.05e8, "Answer should be $1.05");
    }

    // ============ Admin Tests ============

    function test_setAssetFeed() public {
        address newAsset = makeAddr("newToken");
        MockPriceFeed newFeed = new MockPriceFeed(3e8, 8); // $3.00

        vm.prank(owner);
        oracle.setAssetFeed(newAsset, address(newFeed));

        assertTrue(oracle.isSupportedAsset(newAsset), "Asset should be supported");
        assertEq(oracle.assetFeeds(newAsset), address(newFeed), "Feed should be set");
    }

    function test_setAssetFeed_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Errors.Savanna__ZeroAddress.selector);
        oracle.setAssetFeed(address(usdc), address(0));
    }

    function test_setAssetSupport() public {
        vm.prank(owner);
        oracle.setAssetSupport(address(usdc), false);
        assertFalse(oracle.isSupportedAsset(address(usdc)), "USDC should be unsupported");

        vm.prank(owner);
        oracle.setAssetSupport(address(usdc), true);
        assertTrue(oracle.isSupportedAsset(address(usdc)), "USDC should be supported again");
    }

    // ============ Price Update Tests ============

    function test_priceReflectsUpdate() public {
        // Update USDC price to $1.05
        usdcFeed.setPrice(1.05e8);

        uint256 price = oracle.getAssetPrice(address(usdc));
        // 1.05e8 normalized to 18 decimals = 1.05e18
        assertEq(price, 1.05e18, "Price should update to $1.05");
    }

    function test_multiplePriceUpdates() public {
        // Update CELO price multiple times
        celoFeed.setPrice(55e8);
        assertEq(oracle.getAssetPrice(address(0)), 55e18);

        celoFeed.setPrice(45e8);
        assertEq(oracle.getAssetPrice(address(0)), 45e18);

        celoFeed.setPrice(60e8);
        assertEq(oracle.getAssetPrice(address(0)), 60e18);
    }
}

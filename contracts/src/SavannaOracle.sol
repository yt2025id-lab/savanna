// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "./interfaces/IChainlinkFeed.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Errors} from "./libraries/Errors.sol";

/// @title SavannaOracle
/// @notice Price oracle for Savanna Finance using Chainlink Data Feeds on Celo
/// @dev Provides validated, stale-checked prices normalized to 18 decimals.
///      Only owner can register/update feeds to prevent price manipulation.
contract SavannaOracle is Ownable {
    // ============ State ============

    /// @notice Chainlink CELO/USD price feed (Celo mainnet)
    address public constant CELO_USD_FEED = 0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e;
    /// @notice Chainlink USDC/USD price feed (Celo mainnet)
    address public constant USDC_USD_FEED = 0xc7A353BaE210aed958a1A2928b654938EC59DaB2;

    /// @notice Maximum age for a price before considered stale (1 hour)
    uint256 public constant STALENESS_THRESHOLD = 3600;

    /// @notice Asset address => Chainlink feed address (configurable for testnet)
    mapping(address => address) public assetFeeds;

    /// @notice Asset address => whether it uses the oracle for valuation
    mapping(address => bool) public isSupportedAsset;

    // ============ Events ============

    event AssetFeedUpdated(address indexed asset, address indexed feed);
    event AssetSupportUpdated(address indexed asset, bool supported);

    // ============ Constructor ============

    /// @dev No feeds are registered in the constructor. Use setAssetFeed() after deployment
    ///      to configure for mainnet or testnet. This avoids calling non-existent mainnet
    ///      feed addresses in local Foundry tests.
    constructor(address owner_) Ownable(owner_) {}

    // ============ Admin ============

    /// @notice Register or update a Chainlink feed for an asset
    /// @param asset The ERC-20 token address (or address(0) for native CELO)
    /// @param feed The Chainlink AggregatorV3 address
    function setAssetFeed(address asset, address feed) external onlyOwner {
        if (feed == address(0)) revert Errors.Savanna__ZeroAddress();
        assetFeeds[asset] = feed;
        isSupportedAsset[asset] = true;
        emit AssetFeedUpdated(asset, feed);
    }

    /// @notice Mark an asset as supported/unsupported
    function setAssetSupport(address asset, bool supported) external onlyOwner {
        isSupportedAsset[asset] = supported;
        emit AssetSupportUpdated(asset, supported);
    }

    // ============ Price Functions ============

    /// @notice Get the price for any registered asset
    /// @param asset The asset address (address(0) for CELO)
    /// @return price Asset price in USD (18 decimals)
    function getAssetPrice(address asset) public view returns (uint256) {
        if (!isSupportedAsset[asset]) revert Errors.Savanna__FeedNotSet(asset);
        address feed = assetFeeds[asset];
        if (feed == address(0)) revert Errors.Savanna__FeedNotSet(asset);
        return _getPrice(feed);
    }

    /// @notice Calculate the USD value of an asset amount
    /// @param asset The asset address (address(0) for CELO)
    /// @param amount The amount of the asset (in native decimals)
    /// @return value USD value normalized to 18 decimals
    function getAssetValueUsd(address asset, uint256 amount) external view returns (uint256) {
        uint256 price = getAssetPrice(asset);
        return (amount * price) / 1e18;
    }

    /// @notice Get the latest round data with staleness validation
    /// @param feed The Chainlink feed address
    /// @return roundId Round ID
    /// @return answer Price answer (feed decimals)
    /// @return updatedAt Timestamp of update
    function getValidatedRoundData(address feed)
        public
        view
        returns (uint80 roundId, int256 answer, uint256 updatedAt)
    {
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);

        (roundId, answer,, updatedAt,) = aggregator.latestRoundData();

        // Validate price is positive
        if (answer <= 0) revert Errors.Savanna__InvalidPrice(feed);

        // Validate freshness (protect against updatedAt > block.timestamp)
        if (updatedAt > block.timestamp || block.timestamp - updatedAt > STALENESS_THRESHOLD) {
            revert Errors.Savanna__StalePrice(feed, updatedAt);
        }

        return (roundId, answer, updatedAt);
    }

    // ============ Internal ============

    /// @dev Fetch and normalize price from a Chainlink feed to 18 decimals
    function _getPrice(address feedAddress) internal view returns (uint256) {
        (, int256 answer,) = getValidatedRoundData(feedAddress);

        // Normalize to 18 decimals: Chainlink feeds typically use 8 decimals
        uint8 decimals = AggregatorV3Interface(feedAddress).decimals();
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(answer) * 1e18 / (10 ** uint256(decimals));
    }
}

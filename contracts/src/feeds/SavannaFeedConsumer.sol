// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AggregatorV3Interface} from "@chainlink/contracts/shared/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title SavannaFeedConsumer
/// @notice Consumes Chainlink Data Feeds for price validation on Celo
/// @dev Supports CELO/USD, ETH/USD, cUSD/USD and other feeds available on Celo
contract SavannaFeedConsumer is Ownable {
    // ============ State ============

    /// @notice Asset address => Chainlink price feed address
    mapping(address => address) public feeds;

    /// @notice Asset address => maximum acceptable heartbeat (seconds)
    mapping(address => uint256) public heartbeats;

    /// @notice Asset address => decimal precision
    mapping(address => uint8) public feedDecimals;

    // ============ Events ============

    /// @notice Emitted when a new price feed is registered
    event FeedRegistered(address indexed asset, address indexed feed, uint8 decimals, uint256 heartbeat);

    /// @notice Emitted when a price is fetched successfully
    event PriceFetched(address indexed asset, uint256 price, uint256 timestamp);

    /// @notice Emitted when a stale price is detected
    event StalePriceDetected(address indexed asset, uint256 age, uint256 maxAge);

    // ============ Constructor ============

    constructor(address owner_) Ownable(owner_) {}

    // ============ Admin ============

    /// @notice Register a Chainlink price feed for an asset
    /// @param asset The ERC-20 token address (or address(0) for CELO native)
    /// @param feed The Chainlink AggregatorV3Interface address
    /// @param heartbeat Maximum acceptable time between price updates
    function registerFeed(
        address asset,
        address feed,
        uint256 heartbeat
    ) external onlyOwner {
        if (feed == address(0)) revert Errors.Savanna__ZeroAddress();
        if (heartbeat == 0) revert Errors.Savanna__InvalidParameter("heartbeat");

        feeds[asset] = feed;
        heartbeats[asset] = heartbeat;

        uint8 decimals = AggregatorV3Interface(feed).decimals();
        feedDecimals[asset] = decimals;

        emit FeedRegistered(asset, feed, decimals, heartbeat);
    }

    // ============ View ============

    /// @notice Get the latest price for an asset with staleness check
    /// @param asset The asset address
    /// @return data FeedData struct with price, timestamp, and staleness info
    function getLatestPrice(address asset) external returns (DataTypes.FeedData memory data) {
        address feedAddr = feeds[asset];
        if (feedAddr == address(0)) revert Errors.Savanna__FeedNotSet(asset);

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddr);

        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        // Validate price
        if (price <= 0) revert Errors.Savanna__InvalidPrice(feedAddr);

        // Validate round completeness
        if (answeredInRound < roundId) {
            revert Errors.Savanna__StalePrice(feedAddr, updatedAt);
        }

        // Check heartbeat
        uint256 age = block.timestamp - updatedAt;
        uint256 maxAge = heartbeats[asset];
        bool stale = age > maxAge;

        if (stale) {
            emit StalePriceDetected(asset, age, maxAge);
            revert Errors.Savanna__HeartbeatExceeded(feedAddr, age, maxAge);
        }

        data = DataTypes.FeedData({
            feed: feedAddr,
            // forge-lint: disable-next-line(unsafe-typecast)
            price: uint256(price),
            timestamp: updatedAt,
            decimals: feedDecimals[asset],
            stale: false
        });

        emit PriceFetched(asset, data.price, data.timestamp);
    }

    /// @notice Get the latest price (view-only, no staleness revert)
    /// @param asset The asset address
    /// @return price Latest price from feed
    /// @return decimals Feed decimals
    /// @return updatedAt Timestamp of last update
    function peekLatestPrice(address asset)
        external
        view
        returns (uint256 price, uint8 decimals, uint256 updatedAt)
    {
        address feedAddr = feeds[asset];
        if (feedAddr == address(0)) revert Errors.Savanna__FeedNotSet(asset);

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddr);

        (, int256 _price, , uint256 _updatedAt,) = feed.latestRoundData();
        if (_price <= 0) revert Errors.Savanna__InvalidPrice(feedAddr);

        // forge-lint: disable-next-line(unsafe-typecast)
        return (uint256(_price), feedDecimals[asset], _updatedAt);
    }

    /// @notice Check if a feed is registered for an asset
    /// @param asset The asset address
    /// @return Whether a feed is registered
    function hasFeed(address asset) external view returns (bool) {
        return feeds[asset] != address(0);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {AggregatorV3Interface} from "@chainlink/contracts/shared/interfaces/AggregatorV3Interface.sol";

import {ISavannaController} from "../interfaces/ISavannaController.sol";
import {ISavannaVault} from "../interfaces/ISavannaVault.sol";
import {IStrategy} from "../strategies/IStrategy.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Constants} from "../libraries/Constants.sol";

/// @title SavannaController
/// @notice Receives AI recommendations from Chainlink oracle and executes yield strategies on Celo
/// @dev Implements oracle receiver pattern — only the authorized Chainlink Forwarder can deliver reports
contract SavannaController is ISavannaController, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State ============

    /// @notice Vault contract address
    address public vault;
    /// @notice Chainlink oracle forwarder address
    address public forwarder;
    /// @notice Protocol ID => Strategy adapter address
    mapping(DataTypes.Protocol => address) public strategies;
    /// @notice Asset address => Chainlink price feed address (for validation)
    mapping(address => address) public priceFeeds;
    /// @notice Track total recommendations processed
    uint256 public totalRecommendations;

    // ============ Constructor ============

    constructor(address vault_, address forwarder_, address owner_) Ownable(owner_) {
        if (vault_ == address(0) || forwarder_ == address(0)) revert Errors.Savanna__ZeroAddress();
        vault = vault_;
        forwarder = forwarder_;
    }

    // ============ Admin ============

    /// @notice Register or update a strategy adapter for a protocol
    function setStrategy(DataTypes.Protocol protocol, address strategy) external onlyOwner {
        if (strategy == address(0)) revert Errors.Savanna__ZeroAddress();
        strategies[protocol] = strategy;
        emit StrategyUpdated(protocol, strategy);
    }

    /// @notice Update the Chainlink forwarder address
    function setForwarder(address forwarder_) external onlyOwner {
        if (forwarder_ == address(0)) revert Errors.Savanna__ZeroAddress();
        address oldForwarder = forwarder;
        forwarder = forwarder_;
        emit ForwarderUpdated(oldForwarder, forwarder_);
    }

    /// @notice Register a Chainlink price feed for an asset
    function setPriceFeed(address asset, address feed) external onlyOwner {
        if (feed == address(0)) revert Errors.Savanna__ZeroAddress();
        priceFeeds[asset] = feed;
    }

    // ============ Chainlink Oracle Receiver ============

    /// @notice Called by Chainlink Forwarder to deliver AI recommendation
    /// @param report ABI-encoded recommendation data:
    ///         (address user, uint8 protocolId, uint256 allocationBps, uint256 expectedApy, string reasoning)
    function onReport(bytes calldata, bytes calldata report) external onlyForwarder whenNotPaused {
        (
            address user,
            uint8 protocolId,
            uint256 allocationBps,
            uint256 expectedApy,
            string memory reasoning
        ) = abi.decode(report, (address, uint8, uint256, uint256, string));

        // ============ Validation ============

        if (user == address(0)) revert Errors.Savanna__InvalidReport();
        if (allocationBps == 0 || allocationBps > Constants.MAX_ALLOCATION_BPS) {
            revert Errors.Savanna__InvalidAllocation(allocationBps);
        }
        if (protocolId > uint8(type(DataTypes.Protocol).max)) {
            revert Errors.Savanna__InvalidReport();
        }

        DataTypes.Protocol protocol = DataTypes.Protocol(protocolId);
        address strategy = strategies[protocol];
        if (strategy == address(0)) revert Errors.Savanna__StrategyNotRegistered();

        // ============ Execute ============

        emit RecommendationReceived(user, protocol, allocationBps, expectedApy, reasoning);

        // Calculate allocation amount
        DataTypes.UserPosition memory pos = ISavannaVault(vault).getUserPosition(user);
        uint256 allocateAmount =
            Math.mulDiv(pos.depositAmount, allocationBps, Constants.BPS_PRECISION, Math.Rounding.Floor);

        // Execute strategy via vault
        ISavannaVault(vault).executeStrategy(user, strategy, allocateAmount);

        totalRecommendations++;

        emit StrategyExecuted(user, strategy, allocateAmount);
    }

    // ============ User Actions ============

    /// @notice Withdraw user funds from their active strategy
    /// @param user The user to withdraw for (can be called by user or owner)
    function withdrawFromStrategy(address user) external nonReentrant {
        if (msg.sender != user && msg.sender != owner()) revert Errors.Savanna__Unauthorized();

        DataTypes.UserPosition memory pos = ISavannaVault(vault).getUserPosition(user);
        if (!pos.isActive) revert Errors.Savanna__NoActivePosition();

        address underlyingAsset = IERC4626(vault).asset();

        // Withdraw from protocol back to vault
        uint256 withdrawn =
            IStrategy(pos.activeStrategy).withdraw(underlyingAsset, pos.allocatedAmount, vault);

        // Notify vault that strategy is complete
        ISavannaVault(vault).completeStrategy(user, withdrawn);

        emit UserWithdrawn(user, withdrawn);
    }

    // ============ Rebalance ============

    /// @notice Called by vault during Chainlink Automation rebalance cycle
    /// @dev In production, the AI agent (Chainlink Functions) evaluates all active positions
    ///      and determines if any should be reallocated to a better-yielding protocol.
    ///      This is a placeholder that the AI agent workflow will call.
    function rebalance() external view {
        if (msg.sender != vault) revert Errors.Savanna__OnlyVault();
        // Rebalance logic is handled by AI agent via Chainlink Functions
        // The vault calls this to signal a rebalance cycle is due
        // In production: iterate positions, compare APYs, trigger re-allocation
    }

    // ============ View Functions ============

    /// @notice Get the strategy address for a protocol
    function getStrategy(DataTypes.Protocol protocol) external view override returns (address) {
        return strategies[protocol];
    }

    /// @notice Get the latest price from a Chainlink feed (for external queries)
    /// @param asset The asset address
    /// @return price Latest price
    function getLatestPrice(address asset) external view returns (int256 price) {
        address feed = priceFeeds[asset];
        if (feed == address(0)) revert Errors.Savanna__FeedNotSet(asset);

        (, int256 _price,,,) = AggregatorV3Interface(feed).latestRoundData();
        if (_price <= 0) revert Errors.Savanna__InvalidPrice(feed);

        return _price;
    }

    // ============ Modifiers ============

    modifier onlyForwarder() {
        _onlyForwarder();
        _;
    }

    function _onlyForwarder() internal view {
        if (msg.sender != forwarder) revert Errors.Savanna__OnlyForwarder();
    }
}
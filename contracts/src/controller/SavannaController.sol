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
    /// @notice Per-user nonce for replay protection (incremented each onReport execution)
    mapping(address => uint256) public userNonce;
    /// @notice Timestamp of last report per user (front-running + replay protection)
    mapping(address => uint256) public lastReportTs;
    /// @notice Minimum cooldown between onReport calls per user (prevents rapid re-execution)
    uint256 public reportCooldown = 0; // 0 = disabled, set to e.g. 5 minutes in production

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

    /// @notice Set minimum cooldown between onReport calls per user
    function setReportCooldown(uint256 cooldown) external onlyOwner {
        reportCooldown = cooldown;
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

        // Replay protection: enforce cooldown between reports per user
        if (block.timestamp < lastReportTs[user] + reportCooldown) {
            revert Errors.Savanna__InvalidState("report cooldown active");
        }
        userNonce[user]++;

        // ============ Execute ============

        lastReportTs[user] = block.timestamp;

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
    /// @dev Scans all registered strategies to find the highest APY, then
    ///      signals the vault to notify the AI agent for reallocation.
    ///      Returns the protocol with the highest current APY.
    function rebalance() external view returns (DataTypes.Protocol bestProtocol, uint256 bestApy) {
        if (msg.sender != vault) revert Errors.Savanna__OnlyVault();

        uint8 protocolCount = Constants.PROTOCOL_COUNT;
        for (uint8 i = 0; i < protocolCount; i++) {
            DataTypes.Protocol protocol = DataTypes.Protocol(i);
            address strategy = strategies[protocol];
            if (strategy == address(0)) continue;

            // Query current APY from strategy (silent fail if reverted)
            try IStrategy(strategy).getApy() returns (uint256 apy) {
                if (apy > bestApy) {
                    bestApy = apy;
                    bestProtocol = protocol;
                }
            } catch {
                continue;
            }
        }
    }

    /// @notice Get all protocol APYs at once for off-chain/AI consumption
    function getAllProtocolApys()
        external
        view
        returns (DataTypes.Protocol[] memory protocols, uint256[] memory apys)
    {
        uint8 protocolCount = Constants.PROTOCOL_COUNT;
        protocols = new DataTypes.Protocol[](protocolCount);
        apys = new uint256[](protocolCount);

        uint8 written = 0;
        for (uint8 i = 0; i < protocolCount; i++) {
            DataTypes.Protocol protocol = DataTypes.Protocol(i);
            address strategy = strategies[protocol];
            if (strategy == address(0)) continue;

            try IStrategy(strategy).getApy() returns (uint256 apy) {
                protocols[written] = protocol;
                apys[written] = apy;
                written++;
            } catch {
                continue;
            }
        }

        // Resize arrays to actual count
        assembly {
            mstore(protocols, written)
            mstore(apys, written)
        }
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
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ISavannaVault} from "../interfaces/ISavannaVault.sol";
import {IStrategy} from "../strategies/IStrategy.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Constants} from "../libraries/Constants.sol";

/// @title SavannaVault
/// @notice ERC-4626 vault for user deposits with AI-powered yield optimization on Celo
/// @dev Users deposit stablecoins (cUSD/USDC), request a strategy with time horizon,
///      and the Chainlink oracle analyzes protocols and executes the optimal strategy
contract SavannaVault is ERC4626, Ownable, ISavannaVault, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State ============

    /// @notice Controller contract address
    address public controller;
    /// @notice Cross-chain receiver contract address (LI.FI bridge receiver)
    address public crossChainReceiver;
    /// @notice User address => active strategy request flag
    mapping(address => bool) private _activeRequests;
    /// @notice User address => position data
    mapping(address => DataTypes.UserPosition) private _positions;
    /// @notice Cross-chain deposit records
    mapping(uint256 => DataTypes.CrossChainDeposit) private _crossChainDeposits;
    /// @notice Total cross-chain deposits count
    uint256 public totalCrossChainDeposits;
    /// @notice Total amount currently deployed across all strategies
    uint256 public override totalDeployed;
    /// @notice Total number of active positions
    uint256 public totalPositions;

    // ============ Constructor ============

    constructor(IERC20 asset_, address owner_)
        ERC4626(asset_)
        ERC20("Savanna Yield Token", "svYLD")
        Ownable(owner_)
    {}

    // ============ Admin ============

    /// @notice Set the controller address
    /// @param controller_ Address of the SavannaController contract
    function setController(address controller_) external onlyOwner {
        if (controller_ == address(0)) revert Errors.Savanna__ZeroAddress();
        controller = controller_;
    }

    /// @notice Set the cross-chain receiver address (LI.FI bridge receiver)
    /// @param receiver_ Address of the SavannaCrossChainReceiver contract
    function setCrossChainReceiver(address receiver_) external onlyOwner {
        if (receiver_ == address(0)) revert Errors.Savanna__ZeroAddress();
        crossChainReceiver = receiver_;
    }

    /// @notice Pause deposits and strategy requests
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause vault operations
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ ERC-4626 Overrides ============

    /// @notice Offset for inflation attack prevention (cUSD has 18 decimals, USDC has 6)
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /// @notice Override deposit to include pause check and events
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (assets < Constants.MIN_DEPOSIT) {
            revert Errors.Savanna__InsufficientDeposit(assets, Constants.MIN_DEPOSIT);
        }

        shares = super.deposit(assets, receiver);
        emit Deposited(receiver, assets, shares);
    }

    /// @notice Deposit from cross-chain bridge receiver (LI.FI)
    /// @dev Called by the authorized CrossChainReceiver after bridging
    /// @param assets Amount of vault asset to deposit
    /// @param receiver Address to receive shares (original depositor on source chain)
    /// @param sourceChainId The source chain ID
    /// @param bridgeToken The original token that was bridged
    /// @return shares Number of svYLD shares minted
    function crossChainDeposit(
        uint256 assets,
        address receiver,
        uint256 sourceChainId,
        address bridgeToken
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (crossChainReceiver == address(0)) revert Errors.Savanna__OnlyBridgeReceiver();
        if (msg.sender != crossChainReceiver) revert Errors.Savanna__OnlyBridgeReceiver();
        if (assets < Constants.MIN_DEPOSIT) {
            revert Errors.Savanna__InsufficientDeposit(assets, Constants.MIN_DEPOSIT);
        }

        shares = super.deposit(assets, receiver);
        emit Deposited(receiver, assets, shares);
        emit CrossChainDepositReceived(receiver, sourceChainId, assets, bridgeToken, shares);

        // Record cross-chain deposit
        _crossChainDeposits[totalCrossChainDeposits] = DataTypes.CrossChainDeposit({
            depositor: receiver,
            sourceChainId: sourceChainId,
            amount: assets,
            timestamp: block.timestamp,
            bridgeToken: bridgeToken,
            processed: true
        });
        totalCrossChainDeposits++;
    }

    /// @notice Override withdraw to handle active positions
    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        returns (uint256 shares)
    {
        // Check if user has active position
        DataTypes.UserPosition memory pos = _positions[owner];
        if (pos.isActive) {
            revert Errors.Savanna__NoActivePosition();
        }

        shares = super.withdraw(assets, receiver, owner);
        emit Withdrawn(receiver, assets, shares);
    }

    /// @notice Override redeem with pause check
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        DataTypes.UserPosition memory pos = _positions[owner];
        if (pos.isActive) {
            revert Errors.Savanna__NoActivePosition();
        }

        assets = super.redeem(shares, receiver, owner);
        emit Withdrawn(receiver, assets, shares);
    }

    // ============ User Actions ============

    /// @notice Request AI-powered yield optimization for deposited funds
    /// @param timeHorizon The target investment duration in seconds
    function requestStrategy(uint256 timeHorizon) external nonReentrant whenNotPaused {
        if (controller == address(0)) revert Errors.Savanna__ControllerNotSet();
        if (_activeRequests[msg.sender]) revert Errors.Savanna__ActiveRequestExists();
        if (timeHorizon < Constants.MIN_TIME_HORIZON || timeHorizon > Constants.MAX_TIME_HORIZON) {
            revert Errors.Savanna__InvalidTimeHorizon(
                timeHorizon, Constants.MIN_TIME_HORIZON, Constants.MAX_TIME_HORIZON
            );
        }

        uint256 userBalance = convertToAssets(balanceOf(msg.sender));
        if (userBalance < Constants.MIN_DEPOSIT) {
            revert Errors.Savanna__InsufficientDeposit(userBalance, Constants.MIN_DEPOSIT);
        }

        _activeRequests[msg.sender] = true;
        _positions[msg.sender] = DataTypes.UserPosition({
            depositAmount: userBalance,
            timeHorizon: timeHorizon,
            depositTimestamp: block.timestamp,
            activeStrategy: address(0),
            allocatedAmount: 0,
            isActive: false
        });

        emit StrategyRequested(msg.sender, userBalance, timeHorizon, block.timestamp);
    }

    /// @notice Cancel a timed-out strategy request
    function cancelTimedOutRequest() external {
        if (!_activeRequests[msg.sender]) revert Errors.Savanna__NoActiveRequest();

        DataTypes.UserPosition storage pos = _positions[msg.sender];
        uint256 elapsed = block.timestamp - pos.depositTimestamp;

        if (elapsed < Constants.REQUEST_TIMEOUT) {
            uint256 remaining = Constants.REQUEST_TIMEOUT - elapsed;
            revert Errors.Savanna__RequestNotTimedOut(remaining);
        }

        _activeRequests[msg.sender] = false;
        emit RequestCancelled(msg.sender, block.timestamp);
    }

    // ============ Controller Actions ============

    /// @notice Execute a strategy recommended by the AI via Chainlink oracle
    /// @param user The user whose funds to deploy
    /// @param strategy The strategy adapter contract address
    /// @param amount The amount of underlying asset to deploy
    function executeStrategy(address user, address strategy, uint256 amount)
        external
        onlyController
    {
        if (paused()) revert Errors.Savanna__VaultPaused();
        if (!_activeRequests[user]) revert Errors.Savanna__NoActiveRequest();

        DataTypes.UserPosition storage pos = _positions[user];
        pos.activeStrategy = strategy;
        pos.allocatedAmount = amount;
        pos.isActive = true;
        _activeRequests[user] = false;
        totalPositions++;

        // Transfer underlying asset to strategy for deployment
        IERC20(asset()).safeTransfer(strategy, amount);
        IStrategy(strategy).deposit(asset(), amount);

        totalDeployed += amount;

        emit StrategyExecuted(user, strategy, amount);
    }

    /// @notice Called when strategy is completed (withdrawal from protocol)
    /// @param user The user whose strategy completed
    /// @param returnedAmount The amount returned from the strategy
    function completeStrategy(address user, uint256 returnedAmount) external onlyController nonReentrant {
        DataTypes.UserPosition storage pos = _positions[user];
        if (!pos.isActive) revert Errors.Savanna__NoActivePosition();

        totalDeployed -= pos.allocatedAmount;
        pos.isActive = false;
        pos.activeStrategy = address(0);
        pos.allocatedAmount = 0;
        totalPositions--;

        emit StrategyCompleted(user, returnedAmount);
    }

    // ============ Emergency ============

    /// @notice Emergency withdraw from a strategy (owner only)
    /// @param user The user whose strategy to complete
    function emergencyCompleteStrategy(address user) external onlyOwner {
        DataTypes.UserPosition storage pos = _positions[user];
        if (!pos.isActive) revert Errors.Savanna__NoActivePosition();
        if (pos.activeStrategy == address(0)) revert Errors.Savanna__NoActivePosition();

        // Withdraw from strategy
        address underlyingAsset = asset();
        uint256 withdrawn =
            IStrategy(pos.activeStrategy).withdraw(underlyingAsset, pos.allocatedAmount, address(this));

        totalDeployed -= pos.allocatedAmount;
        pos.isActive = false;
        pos.activeStrategy = address(0);
        pos.allocatedAmount = 0;
        totalPositions--;

        emit StrategyCompleted(user, withdrawn);
    }

    // ============ View Functions ============

    /// @notice Get user position details
    function getUserPosition(address user) external view override returns (DataTypes.UserPosition memory) {
        return _positions[user];
    }

    /// @notice Check if user has an active strategy request
    function hasActiveRequest(address user) external view override returns (bool) {
        return _activeRequests[user];
    }

    /// @notice Total assets includes both idle vault balance and deployed strategy funds
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalDeployed;
    }

    /// @notice Get cross-chain deposit record by index
    function getCrossChainDeposit(uint256 index) external view returns (DataTypes.CrossChainDeposit memory) {
        return _crossChainDeposits[index];
    }

    /// @notice Get max deposit (respects pause state)
    function maxDeposit(address) public view override returns (uint256) {
        if (paused()) return 0;
        return type(uint256).max;
    }

    /// @notice Get max mint (respects pause state)
    function maxMint(address) public view override returns (uint256) {
        if (paused()) return 0;
        return type(uint256).max;
    }

    // ============ Modifiers ============

    modifier onlyController() {
        if (msg.sender != controller) revert Errors.Savanna__OnlyController();
        _;
    }
}
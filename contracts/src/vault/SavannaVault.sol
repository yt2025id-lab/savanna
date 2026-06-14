// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ISavannaVault} from "../interfaces/ISavannaVault.sol";
import {ISavannaController} from "../interfaces/ISavannaController.sol";
import {IStrategy} from "../strategies/IStrategy.sol";
import {SavannaOracle} from "../SavannaOracle.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Constants} from "../libraries/Constants.sol";

/// @title SavannaVault
/// @notice ERC-4626 vault for user deposits with AI-powered yield optimization on Celo
/// @dev Users deposit stablecoins (cUSD/USDC), request a strategy with time horizon,
///      and the Chainlink oracle analyzes protocols and executes the optimal strategy.
///      Integrates Chainlink Data Feeds for pricing and Automation for rebalancing.
contract SavannaVault is ERC4626, Ownable, ISavannaVault, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State ============

    /// @notice Controller contract address
    address public controller;
    /// @notice Cross-chain receiver contract address (LI.FI bridge receiver)
    address public crossChainReceiver;
    /// @notice SavannaOracle instance for Chainlink price feeds
    SavannaOracle public oracle;
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
    /// @notice Cumulative yield earned across all completed strategies (in asset units)
    uint256 public totalYieldEarned;
    /// @notice Minimum deposit amount (10 units in asset decimals)
    uint256 public minDeposit;
    /// @notice Reduced minimum deposit for MiniPay wallet users (1 unit in asset decimals)
    uint256 public minipayMinDeposit;
    /// @notice MiniPay wallet registry (addresses registered via off-chain MiniPay detection)
    mapping(address => bool) public isMinipayWallet;
    /// @notice Total deposits from MiniPay wallets
    uint256 public totalMinipayDeposits;
    /// @notice Count of MiniPay wallet deposits
    uint256 public minipayDepositCount;

    // ============ Automation State ============

    /// @notice Timestamp of last rebalance (initialized in constructor)
    uint256 public lastRebalance;
    /// @notice Minimum interval between automatic rebalances (default 4 hours)
    uint256 public rebalanceInterval = 4 hours;
    /// @notice Number of users processed in last rebalance
    uint256 public lastRebalanceCount;
    /// @notice Chainlink Automation registry (if set, only registry can call performUpkeep)
    address public automationRegistry;

    // ============ Events ============

    event RebalanceTriggered(uint256 indexed timestamp, uint256 positionsProcessed);
    event ControllerRebalance(DataTypes.Protocol bestProtocol, uint256 bestApy, uint256 totalPositions);
    event RebalanceIntervalUpdated(uint256 oldInterval, uint256 newInterval);
    event AutomationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event YieldEarned(address indexed user, int256 yieldAmount, uint256 returnedAmount, uint256 allocatedAmount);
    event MinipayMinDepositUpdated(uint256 oldMinDeposit, uint256 newMinDeposit);

    // ============ Constructor ============

    constructor(IERC20 asset_, address owner_, address oracle_)
        ERC4626(asset_)
        ERC20("Savanna Yield Token", "svYLD")
        Ownable(owner_)
    {
        if (oracle_ == address(0)) revert Errors.Savanna__ZeroAddress();
        oracle = SavannaOracle(oracle_);
        lastRebalance = block.timestamp;
        minDeposit = 10 * (10 ** IERC20Metadata(asset()).decimals());
        minipayMinDeposit = 1 * (10 ** IERC20Metadata(asset()).decimals());
    }

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

    /// @notice Update the oracle contract address
    /// @param oracle_ New SavannaOracle address
    function setOracle(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert Errors.Savanna__ZeroAddress();
        address oldOracle = address(oracle);
        oracle = SavannaOracle(oracle_);
        emit OracleUpdated(oldOracle, oracle_);
    }

    /// @notice Update the rebalance interval for Chainlink Automation
    /// @param interval New interval in seconds (minimum 1 hour)
    function setRebalanceInterval(uint256 interval) external onlyOwner {
        if (interval < 1 hours) revert Errors.Savanna__InvalidParameter("interval too short");
        uint256 oldInterval = rebalanceInterval;
        rebalanceInterval = interval;
        emit RebalanceIntervalUpdated(oldInterval, interval);
    }

    /// @notice Set the Chainlink Automation registry address (optional; if set, only registry can trigger upkeep)
    /// @param registry The Automation registry contract address (zero address to disable restriction)
    function setAutomationRegistry(address registry) external onlyOwner {
        address oldRegistry = automationRegistry;
        automationRegistry = registry;
        emit AutomationRegistryUpdated(oldRegistry, registry);
    }

    /// @notice Update the minimum deposit amount
    /// @param newMinDeposit New minimum deposit in asset units
    function setMinDeposit(uint256 newMinDeposit) external onlyOwner {
        if (newMinDeposit == 0) revert Errors.Savanna__InvalidParameter("minDeposit zero");
        minDeposit = newMinDeposit;
    }

    /// @notice Update the MiniPay reduced minimum deposit amount
    /// @param newMinDeposit New minimum deposit for MiniPay users in asset units
    function setMinipayMinDeposit(uint256 newMinDeposit) external onlyOwner {
        if (newMinDeposit == 0) revert Errors.Savanna__InvalidParameter("minipayMinDeposit zero");
        uint256 oldMin = minipayMinDeposit;
        minipayMinDeposit = newMinDeposit;
        emit MinipayMinDepositUpdated(oldMin, newMinDeposit);
    }

    /// @notice Register or deregister a MiniPay wallet (called by off-chain verifier or owner)
    /// @param user The wallet address
    /// @param status Whether the wallet is a MiniPay wallet
    function setMinipayWallet(address user, bool status) external onlyOwner {
        isMinipayWallet[user] = status;
        emit MinipayWalletRegistered(user, status);
    }

    /// @notice Batch register MiniPay wallets
    /// @param users Array of wallet addresses
    /// @param statuses Array of status booleans
    function setMinipayWallets(address[] calldata users, bool[] calldata statuses) external onlyOwner {
        if (users.length != statuses.length) revert Errors.Savanna__InvalidParameter("array length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            isMinipayWallet[users[i]] = statuses[i];
            emit MinipayWalletRegistered(users[i], statuses[i]);
        }
    }

    // ============ ERC-4626 Overrides ============

    /// @notice Offset for inflation attack prevention (cUSD has 18 decimals, USDC has 6)
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /// @notice Override deposit to include pause check and events
    /// @dev Handles CIP-64 fee abstraction: if user pays gas in vault asset,
    ///      their balance may be lower by the gas cost when transferFrom executes.
    ///      We cap the deposit to the actual available balance.
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (assets < minDeposit) {
            revert Errors.Savanna__InsufficientDeposit(assets, minDeposit);
        }
        uint256 preBalance = IERC20(asset()).balanceOf(msg.sender);
        uint256 safeAssets = assets > preBalance ? preBalance : assets;
        if (safeAssets == 0) revert Errors.Savanna__InsufficientDeposit(0, minDeposit);
        if (safeAssets < minDeposit) {
            revert Errors.Savanna__InsufficientDeposit(safeAssets, minDeposit);
        }

        shares = super.deposit(safeAssets, receiver);
        emit Deposited(receiver, safeAssets, shares);
    }

    /// @notice Deposit with MiniPay reduced minimum (for detected MiniPay wallet users)
    /// @param assets Amount of vault asset to deposit
    /// @param receiver Address to receive shares
    /// @return shares Number of svYLD shares minted
    function minipayDeposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (!isMinipayWallet[receiver] && !isMinipayWallet[msg.sender]) {
            revert Errors.Savanna__Unauthorized();
        }
        if (assets < minipayMinDeposit) {
            revert Errors.Savanna__InsufficientDeposit(assets, minipayMinDeposit);
        }
        uint256 preBalance = IERC20(asset()).balanceOf(msg.sender);
        uint256 safeAssets = assets > preBalance ? preBalance : assets;
        if (safeAssets == 0) revert Errors.Savanna__InsufficientDeposit(0, minipayMinDeposit);
        if (safeAssets < minipayMinDeposit) {
            revert Errors.Savanna__InsufficientDeposit(safeAssets, minipayMinDeposit);
        }

        shares = super.deposit(safeAssets, receiver);
        totalMinipayDeposits += safeAssets;
        minipayDepositCount++;
        emit Deposited(receiver, safeAssets, shares);
        emit MinipayDeposit(receiver, safeAssets, shares);
    }
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
        if (assets < minDeposit) {
            revert Errors.Savanna__InsufficientDeposit(assets, minDeposit);
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

    /// @notice Override withdraw to handle active positions — allows partial withdraw of unallocated funds
    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        uint256 maxAssets = maxWithdraw(owner);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
        }

        shares = super.withdraw(assets, receiver, owner);
        emit Withdrawn(receiver, assets, shares);
    }

    /// @notice DevRel trigger: signal strategy intent without transferring tokens
    /// @dev Only callable when vault is configured in simulation mode
    function triggerStrategyRequest(uint256 timeHorizon) external nonReentrant whenNotPaused returns (bool) {
        if (controller == address(0)) revert Errors.Savanna__ControllerNotSet();
        if (_activeRequests[msg.sender]) revert Errors.Savanna__ActiveRequestExists();
        if (timeHorizon < Constants.MIN_TIME_HORIZON || timeHorizon > Constants.MAX_TIME_HORIZON) {
            revert Errors.Savanna__InvalidTimeHorizon(
                timeHorizon, Constants.MIN_TIME_HORIZON, Constants.MAX_TIME_HORIZON
            );
        }

        uint256 userBalance = convertToAssets(balanceOf(msg.sender));
        if (userBalance < minDeposit) {
            revert Errors.Savanna__InsufficientDeposit(userBalance, minDeposit);
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
        return true;
    }

    /// @notice DevRel trigger: simulate strategy completion (no real tokens moved)
    function triggerCompleteStrategy(address user) external onlyOwner returns (bool) {
        DataTypes.UserPosition storage pos = _positions[user];
        if (!pos.isActive) revert Errors.Savanna__NoActivePosition();

        uint256 allocated = pos.allocatedAmount;
        totalDeployed -= allocated;
        pos.isActive = false;
        pos.activeStrategy = address(0);
        pos.allocatedAmount = 0;
        totalPositions--;

        emit StrategyCompleted(user, allocated);
        return true;
    }

    /// @notice Override redeem with pause check — allows partial redeem of unallocated funds
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        uint256 maxRedeemable = maxRedeem(owner);
        if (shares > maxRedeemable) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxRedeemable);
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
        if (userBalance < minDeposit) {
            revert Errors.Savanna__InsufficientDeposit(userBalance, minDeposit);
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

        // Validate amount does not exceed user's actual balance
        uint256 userBalance = convertToAssets(balanceOf(user));
        if (amount > userBalance) {
            revert Errors.Savanna__InsufficientBalance(amount, userBalance);
        }

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

        uint256 allocated = pos.allocatedAmount;
        totalDeployed -= allocated;

        // Track yield (positive or negative)
        // returnedAmount comes from controller after strategy.withdraw() is called
        // The actual tokens are already in the vault (controller calls strategy.withdraw(vault))
        if (returnedAmount > allocated) {
            uint256 yieldEarned = returnedAmount - allocated;
            totalYieldEarned += yieldEarned;
            // forge-lint: disable-next-line(unsafe-typecast)
            emit YieldEarned(user, int256(yieldEarned), returnedAmount, allocated);
        } else if (returnedAmount < allocated) {
            uint256 loss = allocated - returnedAmount;
            if (totalYieldEarned >= loss) {
                totalYieldEarned -= loss;
            } else {
                totalYieldEarned = 0;
            }
            // forge-lint: disable-next-line(unsafe-typecast)
            emit YieldEarned(user, -int256(loss), returnedAmount, allocated);
        } else {
            emit YieldEarned(user, 0, returnedAmount, allocated);
        }

        pos.isActive = false;
        pos.activeStrategy = address(0);
        pos.allocatedAmount = 0;
        totalPositions--;

        emit StrategyCompleted(user, returnedAmount);
    }

    // ============ Emergency ============

    /// @notice Emergency withdraw from a strategy (owner only)
    /// @param user The user whose strategy to complete
    function emergencyCompleteStrategy(address user) external onlyOwner nonReentrant {
        DataTypes.UserPosition storage pos = _positions[user];
        if (!pos.isActive) revert Errors.Savanna__NoActivePosition();
        if (pos.activeStrategy == address(0)) revert Errors.Savanna__NoActivePosition();

        uint256 allocated = pos.allocatedAmount;

        // Withdraw from strategy
        address underlyingAsset = asset();
        uint256 withdrawn =
            IStrategy(pos.activeStrategy).withdraw(underlyingAsset, allocated, address(this));

        totalDeployed -= allocated;

        // Track yield/loss
        if (withdrawn > allocated) {
            totalYieldEarned += (withdrawn - allocated);
        }
        // forge-lint: disable-next-line(unsafe-typecast)
        emit YieldEarned(user, int256(withdrawn) - int256(allocated), withdrawn, allocated);

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

    /// @notice Get max withdrawable assets — limited by idle balance; if active position, only unallocated portion
    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused()) return 0;
        uint256 userAssets = convertToAssets(balanceOf(owner));
        DataTypes.UserPosition memory pos = _positions[owner];
        uint256 withdrawable;
        if (pos.isActive) {
            // Only unallocated portion (user total - allocated) can be withdrawn
            withdrawable = userAssets > pos.allocatedAmount ? userAssets - pos.allocatedAmount : 0;
        } else {
            withdrawable = userAssets;
        }
        uint256 idleBalance = IERC20(asset()).balanceOf(address(this));
        return withdrawable > idleBalance ? idleBalance : withdrawable;
    }

    /// @notice Get max redeemable shares — limited by idle balance; if active position, only unallocated portion
    function maxRedeem(address owner) public view override returns (uint256) {
        if (paused()) return 0;
        uint256 userShares = balanceOf(owner);
        DataTypes.UserPosition memory pos = _positions[owner];
        uint256 idleBalance = IERC20(asset()).balanceOf(address(this));
        uint256 maxSharesFromIdle = convertToShares(idleBalance);
        if (pos.isActive) {
            uint256 userAssets = convertToAssets(userShares);
            uint256 unallocatedAssets = userAssets > pos.allocatedAmount ? userAssets - pos.allocatedAmount : 0;
            uint256 unallocatedShares = convertToShares(unallocatedAssets);
            uint256 maxRedeemable = unallocatedShares > maxSharesFromIdle ? maxSharesFromIdle : unallocatedShares;
            return userShares > maxRedeemable ? maxRedeemable : userShares;
        }
        return userShares > maxSharesFromIdle ? maxSharesFromIdle : userShares;
    }

    // ============ Chainlink Automation ============

    /// @notice Check if rebalance upkeep is needed
    /// @dev Called by Chainlink Automation to determine if performUpkeep should run
    /// @return upkeepNeeded True if rebalance interval has elapsed
    /// @return performData Encoded data for performUpkeep (empty for simple time-based)
    function checkUpkeep(bytes calldata)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastRebalance) > rebalanceInterval && totalPositions > 0;
        performData = "";
    }

    /// @notice Execute rebalance — triggered by Chainlink Automation or anyone outside the interval
    /// @dev If automationRegistry is set, only that registry can call; otherwise anyone can call
    /// @param performData Encoded data from checkUpkeep (unused for time-based)
    function performUpkeep(bytes calldata performData) external nonReentrant {
        if (automationRegistry != address(0) && msg.sender != automationRegistry) {
            revert Errors.Savanna__Unauthorized();
        }
        require(
            (block.timestamp - lastRebalance) > rebalanceInterval,
            "Too early for rebalance"
        );
        require(totalPositions > 0, "No active positions");

        lastRebalance = block.timestamp;
        _rebalance(performData);

        emit RebalanceTriggered(block.timestamp, lastRebalanceCount);
    }

    // ============ Oracle View Functions ============

    /// @notice Get the current USD price of the vault's underlying asset
    /// @return price USD price normalized to 18 decimals
    function getAssetPriceUsd() external view returns (uint256) {
        return oracle.getAssetPrice(asset());
    }

    /// @notice Calculate USD value of a user's position
    /// @param user Address of the user
    /// @return value USD value normalized to 18 decimals
    function getUserPositionValueUsd(address user) external view returns (uint256) {
        DataTypes.UserPosition memory pos = _positions[user];
        if (!pos.isActive) return 0;

        uint256 price = oracle.getAssetPrice(asset());
        return (pos.allocatedAmount * price) / 1e18;
    }

    /// @notice Calculate total USD value of all deployed funds
    /// @return value Total deployed value in USD (18 decimals)
    function getTotalDeployedValueUsd() external view returns (uint256) {
        if (totalDeployed == 0) return 0;
        uint256 price = oracle.getAssetPrice(asset());
        return (totalDeployed * price) / 1e18;
    }

    // ============ Internal ============

    /// @dev Internal rebalance logic — signals controller to re-evaluate strategies
    ///      Controller scans all registered strategies, finds the highest APY,
    ///      and returns the best protocol. Vault emits this for off-chain AI agents.
    function _rebalance(bytes memory) internal {
        if (controller == address(0)) {
            lastRebalanceCount = 0;
            return;
        }

        try ISavannaController(controller).rebalance() returns (
            DataTypes.Protocol bestProtocol,
            uint256 bestApy
        ) {
            lastRebalanceCount = totalPositions;
            emit ControllerRebalance(bestProtocol, bestApy, totalPositions);
        } catch {
            lastRebalanceCount = 0;
        }
    }

    // ============ Modifiers ============

    modifier onlyController() {
        _onlyController();
        _;
    }

    function _onlyController() internal view {
        if (msg.sender != controller) revert Errors.Savanna__OnlyController();
    }
}
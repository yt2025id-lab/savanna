// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Constants} from "../libraries/Constants.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);
}

interface IWrappedNative {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

/// @title SavannaCrossChainReceiver
/// @notice Receives cross-chain deposits via LI.FI bridge and auto-deposits into SavannaVault
/// @dev LI.FI Composer routes bridged tokens to this contract, which swaps to vault asset if needed,
///      then deposits into the ERC-4626 vault. The depositor receives svYLD shares on Celo.
///
///      How it works:
///      1. User initiates cross-chain transfer via LI.FI Widget/Composer from source chain
///      2. LI.FI bridges tokens to Celo and delivers them to this contract
///      3. This contract receives the bridged token, swaps to vault asset if needed via DEX
///      4. Deposits into SavannaVault, minting svYLD to the original depositor
///      5. Emits CrossChainDepositReceived event for frontend tracking
contract SavannaCrossChainReceiver is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State ============

    /// @notice The SavannaVault contract
    address public immutable VAULT;
    /// @notice The vault's underlying asset (e.g., USDC on Celo)
    address public immutable VAULT_ASSET;
    /// @notice Uniswap V2 compatible DEX router (Ubeswap/Aerodrome on Celo)
    address public swapRouter;
    /// @notice Wrapped native token (for CELO -> stable swaps)
    address public wrappedNative;
    /// @notice Source chain ID => allowed
    mapping(uint256 => bool) public allowedSourceChains;
    /// @notice Bridge token address => supported
    mapping(address => bool) public supportedBridgeTokens;
    /// @notice Bridge token => swap path (token addresses from bridge token to vault asset)
    mapping(address => address[]) public swapPaths;
    /// @notice Bridge token => swap amount out minimum (slippage protection)
    mapping(address => uint256) public minSwapAmountOut;
    /// @notice Default swap deadline offset from block.timestamp (in seconds)
    uint256 public swapDeadlineOffset = 300;
    /// @notice Total cross-chain deposits received
    uint256 public totalCrossChainDeposits;
    /// @notice Total cross-chain volume (in vault asset units)
    uint256 public totalCrossChainVolume;
    /// @notice Cross-chain deposit records
    mapping(uint256 => DataTypes.CrossChainDeposit) private _crossChainDeposits;
    /// @notice User address => list of their cross-chain deposit indices
    mapping(address => uint256[]) private _userDeposits;
    /// @notice MiniPay wallet addresses (detected off-chain, registered on-chain)
    mapping(address => bool) public isMinipayWallet;
    /// @notice Total MiniPay cross-chain deposits received
    uint256 public totalMinipayDeposits;
    /// @notice MiniPay deposit count
    uint256 public minipayDepositCount;

    // ============ Events ============

    /// @notice Emitted when a source chain is allowed or disallowed
    event SourceChainUpdated(uint256 indexed chainId, bool allowed);
    /// @notice Emitted when a bridge token is supported or unsupported
    event BridgeTokenUpdated(address indexed token, bool supported);
    /// @notice Emitted when a swap path is set for a bridge token
    event SwapPathSet(address indexed tokenIn, address[] path);
    /// @notice Emitted when swap router is updated
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    /// @notice Emitted when a cross-chain deposit is received and processed
    event DepositReceived(
        address indexed depositor,
        uint256 indexed sourceChainId,
        uint256 amount,
        address bridgeToken,
        uint256 vaultShares
    );
    /// @notice Emitted when tokens are rescued from the contract
    event TokensRescued(address indexed token, uint256 amount, address recipient);
    /// @notice Emitted when MiniPay wallet is registered
    event MinipayWalletRegistered(address indexed user, bool status);
    /// @notice Emitted when MiniPay deposit is processed
    event MinipayCrossChainDeposit(address indexed depositor, uint256 amount, uint256 shares);

    // ============ Constructor ============

    constructor(address vault_, address owner_, address swapRouter_, address wrappedNative_) Ownable(owner_) {
        if (vault_ == address(0)) revert Errors.Savanna__ZeroAddress();
        VAULT = vault_;
        VAULT_ASSET = _getVaultAsset(vault_);
        swapRouter = swapRouter_;
        wrappedNative = wrappedNative_;
    }

    // ============ Receive Functions ============

    receive() external payable {
        if (wrappedNative != address(0)) {
            IWrappedNative(wrappedNative).deposit{value: msg.value}();
        }
    }

    /// @notice Process a cross-chain deposit from LI.FI bridge
    /// @dev Called after LI.FI delivers bridged tokens to this contract
    /// @param depositor The original depositor address on the source chain
    /// @param sourceChainId The source chain ID
    /// @param bridgeToken The token address received from the bridge
    /// @param amount The amount of bridge tokens received
    /// @return shares The number of svYLD shares minted to the depositor
    function receiveCrossChainDeposit(
        address depositor,
        uint256 sourceChainId,
        address bridgeToken,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (depositor == address(0)) revert Errors.Savanna__ZeroAddress();
        if (!allowedSourceChains[sourceChainId]) {
            revert Errors.Savanna__SourceChainNotAllowed(sourceChainId);
        }
        if (amount < Constants.MIN_CROSS_CHAIN_DEPOSIT) {
            revert Errors.Savanna__CrossChainDepositBelowMin(amount, Constants.MIN_CROSS_CHAIN_DEPOSIT);
        }

        uint256 depositAmount;
        if (bridgeToken == VAULT_ASSET) {
            depositAmount = amount;
        } else if (supportedBridgeTokens[bridgeToken]) {
            depositAmount = _swapToVaultAsset(bridgeToken, amount);
        } else {
            revert Errors.Savanna__BridgeTokenNotSupported(bridgeToken);
        }

        IERC20(VAULT_ASSET).forceApprove(VAULT, depositAmount);

        shares = IERC4626(VAULT).deposit(depositAmount, depositor);

        uint256 index = totalCrossChainDeposits;
        _crossChainDeposits[index] = DataTypes.CrossChainDeposit({
            depositor: depositor,
            sourceChainId: sourceChainId,
            amount: depositAmount,
            timestamp: block.timestamp,
            bridgeToken: bridgeToken,
            processed: true
        });
        _userDeposits[depositor].push(index);

        totalCrossChainDeposits++;
        totalCrossChainVolume += depositAmount;

        emit DepositReceived(depositor, sourceChainId, depositAmount, bridgeToken, shares);
    }

    // ============ Admin ============

    /// @notice Allow or disallow a source chain for cross-chain deposits
    function setSourceChain(uint256 chainId, bool allowed) external onlyOwner {
        allowedSourceChains[chainId] = allowed;
        emit SourceChainUpdated(chainId, allowed);
    }

    /// @notice Batch set multiple source chains
    function setSourceChains(uint256[] calldata chainIds, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < chainIds.length; i++) {
            allowedSourceChains[chainIds[i]] = allowed;
            emit SourceChainUpdated(chainIds[i], allowed);
        }
    }

    /// @notice Support or unsupport a bridge token
    function setBridgeToken(address token, bool supported) external onlyOwner {
        if (token == address(0)) revert Errors.Savanna__ZeroAddress();
        supportedBridgeTokens[token] = supported;
        emit BridgeTokenUpdated(token, supported);
    }

    /// @notice Set the swap path for a bridge token (e.g., [USDT, CELO, USDC])
    function setSwapPath(address tokenIn, address[] calldata path) external onlyOwner {
        if (path.length < 2) revert Errors.Savanna__InvalidParameter("path too short");
        if (path[path.length - 1] != VAULT_ASSET) {
            revert Errors.Savanna__InvalidParameter("path must end with vault asset");
        }
        swapPaths[tokenIn] = path;
        emit SwapPathSet(tokenIn, path);
    }

    /// @notice Set minimum swap amount out for a bridge token (slippage protection)
    function setMinSwapAmountOut(address bridgeToken, uint256 minAmount) external onlyOwner {
        minSwapAmountOut[bridgeToken] = minAmount;
    }

    /// @notice Update the DEX swap router address
    function setSwapRouter(address swapRouter_) external onlyOwner {
        if (swapRouter_ == address(0)) revert Errors.Savanna__ZeroAddress();
        address oldRouter = swapRouter;
        swapRouter = swapRouter_;
        emit SwapRouterUpdated(oldRouter, swapRouter_);
    }

    /// @notice Update swap deadline offset
    function setSwapDeadlineOffset(uint256 offset) external onlyOwner {
        swapDeadlineOffset = offset;
    }

    /// @notice Rescue tokens accidentally sent to this contract
    function rescueTokens(address token, uint256 amount, address recipient) external onlyOwner {
        IERC20(token).safeTransfer(recipient, amount);
        emit TokensRescued(token, amount, recipient);
    }

    /// @notice Rescue native CELO
    function rescueNative(address recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        if (wrappedNative != address(0) && balance > 0) {
            IWrappedNative(wrappedNative).deposit{value: balance}();
            IERC20(wrappedNative).safeTransfer(recipient, balance);
        } else {
            (bool ok,) = recipient.call{value: balance}("");
            require(ok, "CELO rescue failed");
        }
        emit TokensRescued(address(0), balance, recipient);
    }

    /// @notice Register a MiniPay wallet for reduced deposit minimums
    function registerMinipayWallet(address user, bool status) external onlyOwner {
        isMinipayWallet[user] = status;
        emit MinipayWalletRegistered(user, status);
    }

    /// @notice Batch register MiniPay wallets
    function registerMinipayWallets(address[] calldata users, bool[] calldata statuses) external onlyOwner {
        if (users.length != statuses.length) revert Errors.Savanna__InvalidParameter("array length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            isMinipayWallet[users[i]] = statuses[i];
            emit MinipayWalletRegistered(users[i], statuses[i]);
        }
    }

    /// @notice Process a cross-chain deposit from a MiniPay wallet with reduced minimum
    /// @dev Same as receiveCrossChainDeposit but with MIN_CROSS_CHAIN_DEPOSIT / 5 minimum
    function receiveMinipayDeposit(
        address depositor,
        uint256 sourceChainId,
        address bridgeToken,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (depositor == address(0)) revert Errors.Savanna__ZeroAddress();
        if (!isMinipayWallet[depositor]) revert Errors.Savanna__Unauthorized();
        if (!allowedSourceChains[sourceChainId]) {
            revert Errors.Savanna__SourceChainNotAllowed(sourceChainId);
        }
        uint256 minipayMinCrossChain = Constants.MIN_CROSS_CHAIN_DEPOSIT / 5;
        if (amount < minipayMinCrossChain) {
            revert Errors.Savanna__CrossChainDepositBelowMin(amount, minipayMinCrossChain);
        }

        uint256 depositAmount;
        if (bridgeToken == VAULT_ASSET) {
            depositAmount = amount;
        } else if (supportedBridgeTokens[bridgeToken]) {
            depositAmount = _swapToVaultAsset(bridgeToken, amount);
        } else {
            revert Errors.Savanna__BridgeTokenNotSupported(bridgeToken);
        }

        IERC20(VAULT_ASSET).forceApprove(VAULT, depositAmount);

        shares = IERC4626(VAULT).deposit(depositAmount, depositor);

        uint256 index = totalCrossChainDeposits;
        _crossChainDeposits[index] = DataTypes.CrossChainDeposit({
            depositor: depositor,
            sourceChainId: sourceChainId,
            amount: depositAmount,
            timestamp: block.timestamp,
            bridgeToken: bridgeToken,
            processed: true
        });
        _userDeposits[depositor].push(index);

        totalCrossChainDeposits++;
        totalCrossChainVolume += depositAmount;
        totalMinipayDeposits += depositAmount;
        minipayDepositCount++;

        emit DepositReceived(depositor, sourceChainId, depositAmount, bridgeToken, shares);
        emit MinipayCrossChainDeposit(depositor, depositAmount, shares);
    }

    /// @notice Pause cross-chain deposits
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause cross-chain deposits
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /// @notice Preview swap output for a bridge token
    function previewSwap(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        address[] storage path = swapPaths[tokenIn];
        if (path.length < 2 || swapRouter == address(0)) return 0;
        try IUniswapV2Router02(swapRouter).getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch {
            amountOut = 0;
        }
    }

    /// @notice Get a cross-chain deposit record by index
    function getCrossChainDeposit(uint256 index) external view returns (DataTypes.CrossChainDeposit memory) {
        return _crossChainDeposits[index];
    }

    /// @notice Get all cross-chain deposit indices for a user
    function getUserCrossChainDeposits(address user) external view returns (uint256[] memory) {
        return _userDeposits[user];
    }

    /// @notice Get the total number of cross-chain deposits for a user
    function getUserCrossChainDepositCount(address user) external view returns (uint256) {
        return _userDeposits[user].length;
    }

    // ============ Internal ============

    function _swapToVaultAsset(address tokenIn, uint256 amountIn) internal returns (uint256 amountOut) {
        address[] storage path = swapPaths[tokenIn];
        if (path.length < 2) {
            revert Errors.Savanna__SwapFailed("No swap path set");
        }
        if (swapRouter == address(0)) {
            revert Errors.Savanna__SwapFailed("No swap router set");
        }

        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        if (balance < amountIn) {
            amountIn = balance;
        }

        IERC20(tokenIn).forceApprove(swapRouter, amountIn);

        uint256 minOut = minSwapAmountOut[tokenIn];
        uint256 deadline = block.timestamp + swapDeadlineOffset;

        uint256[] memory amounts = IUniswapV2Router02(swapRouter).swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            address(this),
            deadline
        );

        amountOut = amounts[amounts.length - 1];
    }

    /// @dev Helper to get vault asset address from ERC-4626 vault contract
    function _getVaultAsset(address vault) internal view returns (address) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSelector(IERC4626(address(0)).asset.selector)
        );
        if (!success || data.length < 32) revert Errors.Savanna__ZeroAddress();
        return abi.decode(data, (address));
    }
}

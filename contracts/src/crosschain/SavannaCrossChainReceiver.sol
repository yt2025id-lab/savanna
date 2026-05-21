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
    /// @notice Source chain ID => allowed
    mapping(uint256 => bool) public allowedSourceChains;
    /// @notice Bridge token address => swap router path approved
    mapping(address => bool) public supportedBridgeTokens;
    /// @notice Bridge token => swap amount out minimum (slippage protection)
    mapping(address => uint256) public minSwapAmountOut;
    /// @notice Total cross-chain deposits received
    uint256 public totalCrossChainDeposits;
    /// @notice Total cross-chain volume (in vault asset units)
    uint256 public totalCrossChainVolume;
    /// @notice Cross-chain deposit records
    mapping(uint256 => DataTypes.CrossChainDeposit) private _crossChainDeposits;
    /// @notice User address => list of their cross-chain deposit indices
    mapping(address => uint256[]) private _userDeposits;

    // ============ Events ============

    /// @notice Emitted when a source chain is allowed or disallowed
    event SourceChainUpdated(uint256 indexed chainId, bool allowed);
    /// @notice Emitted when a bridge token is supported or unsupported
    event BridgeTokenUpdated(address indexed token, bool supported);
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

    // ============ Constructor ============

    constructor(address vault_, address owner_) Ownable(owner_) {
        if (vault_ == address(0)) revert Errors.Savanna__ZeroAddress();
        VAULT = vault_;
        VAULT_ASSET = _getVaultAsset(vault_);
    }

    // ============ Receive Functions ============

    /// @notice Receive native token (CELO) — for gas or potential CELO bridge
    receive() external payable {}

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

        // If bridge token is the vault asset, deposit directly
        uint256 depositAmount;
        if (bridgeToken == VAULT_ASSET) {
            depositAmount = amount;
        } else if (supportedBridgeTokens[bridgeToken]) {
            // Swap bridge token to vault asset via on-chain DEX
            depositAmount = _swapToVaultAsset(bridgeToken, amount);
        } else {
            revert Errors.Savanna__BridgeTokenNotSupported(bridgeToken);
        }

        // Approve vault to spend our vault asset tokens
        IERC20(VAULT_ASSET).forceApprove(VAULT, depositAmount);

        // Deposit into vault — shares go to the original depositor
        shares = IERC4626(VAULT).deposit(depositAmount, depositor);

        // Record the cross-chain deposit
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

    /// @notice Set minimum swap amount out for a bridge token (slippage protection)
    function setMinSwapAmountOut(address bridgeToken, uint256 minAmount) external onlyOwner {
        minSwapAmountOut[bridgeToken] = minAmount;
    }

    /// @notice Rescue tokens accidentally sent to this contract
    function rescueTokens(address token, uint256 amount, address recipient) external onlyOwner {
        IERC20(token).safeTransfer(recipient, amount);
        emit TokensRescued(token, amount, recipient);
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

    /// @notice Swap a bridge token to the vault's underlying asset
    /// @dev Override or use a DEX aggregator. Default implementation uses a simple
    ///     UniswapV2-style router. For production, integrate with 1inch or Aerodrome on Celo.
    /// @param tokenIn The bridge token to swap
    /// @param amountIn The amount to swap
    /// @return amountOut The amount of vault asset received
    function _swapToVaultAsset(address tokenIn, uint256 amountIn) internal virtual returns (uint256 amountOut) {
        // Default: assume 1:1 swap for supported stablecoins (USDT, DAI, etc.)
        // In production, integrate with:
        // - Ubeswap/Aerodrome on Celo for DEX swap
        // - 1inch aggregator for best price
        // For now, this is a placeholder that returns the input amount for same-value stablecoins

        // Check that we received the tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        if (balance < amountIn) {
            amountIn = balance;
        }

        // For supported stablecoins on Celo (USDT, DAI, etc.), assume 1:1
        // Production: call DEX router here
        amountOut = amountIn;

        // Ensure minimum output (slippage check)
        uint256 minOut = minSwapAmountOut[tokenIn];
        if (minOut > 0 && amountOut < minOut) {
            revert Errors.Savanna__SwapFailed("Slippage: amountOut < minimum");
        }
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IStrategy} from "./IStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title BaseStrategy
/// @notice Abstract base contract for lending protocol strategy adapters on Celo
/// @dev Inherit from this and implement _depositToProtocol, _withdrawFromProtocol, _getProtocolBalance
abstract contract BaseStrategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The vault address (vault can deposit, vault/controller can withdraw)
    address public vault;
    /// @notice The controller address (can also call withdraw)
    address public controller;
    /// @notice The underlying asset this strategy manages
    address public immutable ASSET;
    /// @notice Whether the strategy is active
    bool public active;

    // ============ Constructor ============

    constructor(address asset_, address vault_, address owner_) Ownable(owner_) {
        if (asset_ == address(0) || vault_ == address(0)) revert Errors.Savanna__ZeroAddress();
        ASSET = asset_;
        vault = vault_;
        active = true;
    }

    // ============ Modifiers ============

    modifier onlyVault() {
        if (msg.sender != vault) revert Errors.Savanna__OnlyVault();
        _;
    }

    modifier onlyVaultOrController() {
        if (msg.sender != vault && msg.sender != controller) revert Errors.Savanna__OnlyVault();
        _;
    }

    modifier onlyActive() {
        require(active, "Strategy inactive");
        _;
    }

    // ============ IStrategy Implementation ============

    /// @notice Deposit assets into the underlying lending protocol
    /// @dev Vault already transfers tokens to this contract via safeTransfer before calling this
    function deposit(address asset, uint256 amount) external onlyVault onlyActive {
        if (asset != ASSET) revert Errors.Savanna__UnsupportedAsset(asset);
        if (amount == 0) revert Errors.Savanna__InvalidParameter("amount");

        // Approve underlying protocol to spend tokens already held by this contract
        _approveProtocol(asset, amount);

        // Execute protocol-specific deposit
        _depositToProtocol(asset, amount);

        emit Deposited(asset, amount);
    }

    /// @notice Withdraw assets from the underlying lending protocol
    function withdraw(address asset, uint256 amount, address recipient)
        external
        onlyVaultOrController
        returns (uint256 withdrawn)
    {
        if (asset != ASSET) revert Errors.Savanna__UnsupportedAsset(asset);
        if (amount == 0) revert Errors.Savanna__InvalidParameter("amount");

        // Execute protocol-specific withdrawal
        withdrawn = _withdrawFromProtocol(asset, amount);

        // Transfer to recipient
        IERC20(asset).safeTransfer(recipient, withdrawn);

        emit Withdrawn(asset, withdrawn, recipient);
    }

    /// @notice Get the current balance in the underlying protocol
    function getBalance(address asset) external view returns (uint256 balance) {
        if (asset != ASSET) revert Errors.Savanna__UnsupportedAsset(asset);
        return _getProtocolBalance(asset);
    }

    // ============ Admin ============

    /// @notice Update the vault address
    function setVault(address vault_) external onlyOwner {
        if (vault_ == address(0)) revert Errors.Savanna__ZeroAddress();
        vault = vault_;
    }

    /// @notice Set the controller address (allowed to call withdraw)
    function setController(address controller_) external onlyOwner {
        controller = controller_;
    }

    /// @notice Activate or deactivate strategy
    function setActive(bool active_) external onlyOwner {
        active = active_;
    }

    /// @notice Emergency withdraw — recover tokens stuck in strategy
    /// @param asset Token address to recover
    /// @param amount Amount to recover
    /// @param recipient Address to send recovered tokens
    function emergencyWithdraw(address asset, uint256 amount, address recipient) external onlyOwner {
        IERC20(asset).safeTransfer(recipient, amount);
    }

    // ============ Abstract Functions ============

    /// @dev Protocol-specific deposit implementation
    function _depositToProtocol(address asset, uint256 amount) internal virtual;

    /// @dev Protocol-specific withdrawal implementation
    function _withdrawFromProtocol(address asset, uint256 amount) internal virtual returns (uint256);

    /// @dev Protocol-specific balance query
    function _getProtocolBalance(address asset) internal view virtual returns (uint256);

    /// @dev Protocol-specific approval
    function _approveProtocol(address asset, uint256 amount) internal virtual;
}
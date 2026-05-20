// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title ReserveStrategy
/// @notice Idle reserve strategy — holds funds in the contract, no external protocol interaction
/// @dev Fallback strategy when no lending protocol is optimal or for testing
contract ReserveStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_
    ) BaseStrategy(asset_, vault_, owner_) {}

    // ============ Strategy Info ============

    /// @notice Get protocol name
    function protocolName() external pure override returns (string memory) {
        return "Reserve";
    }

    /// @notice Idle reserve earns no yield — returns 0 APY
    function getAPY() external pure override returns (uint256) {
        return 0;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address, uint256) internal override {
        // No approval needed — funds stay in this contract
    }

    function _depositToProtocol(address, uint256) internal override {
        // No-op: funds already transferred to this contract by BaseStrategy.deposit()
    }

    function _withdrawFromProtocol(address asset, uint256 amount) internal override returns (uint256) {
        uint256 balance = IERC20(asset).balanceOf(address(this));
        if (balance < amount) revert Errors.Savanna__StrategyInsufficientFunds(amount, balance);
        return amount;
    }

    function _getProtocolBalance(address asset) internal view override returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }
}
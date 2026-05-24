// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "../../src/strategies/BaseStrategy.sol";
import {Errors} from "../../src/libraries/Errors.sol";

/// @title MockStrategy
/// @notice Test double for strategy adapters — holds funds like ReserveStrategy but with configurable APY
contract MockStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    uint256 public apy;

    constructor(
        IERC20 asset_,
        address vault_,
        address owner_
    ) BaseStrategy(address(asset_), vault_, owner_) {
        apy = 500; // Default 5% APY in bps
    }

    function protocolName() external pure override returns (string memory) {
        return "MockStrategy";
    }

    function setApy(uint256 apy_) external onlyOwner {
        apy = apy_;
    }

    function getApy() external view override returns (uint256) {
        return apy;
    }

    function _approveProtocol(address, uint256) internal override {
        // No approval needed
    }

    function _depositToProtocol(address, uint256) internal override {
        // No-op — funds held in this contract
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

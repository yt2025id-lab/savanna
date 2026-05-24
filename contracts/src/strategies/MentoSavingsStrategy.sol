// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title IMentoSavingsToken
/// @notice Interface for Mento Savings Token (ERC-4626 vault for cUSD/cEUR)
/// @dev Mento's sCU (Savings cUSD) and sCE (Savings cEUR) are ERC-4626 compliant
interface IMentoSavingsToken {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function balanceOf(address account) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function asset() external view returns (address);

    /// @notice Mento-specific: savings rate per second in 1e18 precision
    /// @dev This is the annualized savings rate divided by seconds per year
    function savingsRate() external view returns (uint256);

    /// @notice Exchange rate between savings token and underlying (1e18 precision)
    function exchangeRate() external view returns (uint256);
}

/// @title MentoSavingsStrategy
/// @notice Strategy adapter for Mento Savings Tokens on Celo
/// @dev Deposits cUSD into Mento's sCU (Savings cUSD) ERC-4626 vault for governance-determined yield.
///      Mento Savings provides the safest yield on Celo — backed by the Mento Reserve.
///      Unlike lending protocols (Aave/Moola), Mento Savings has no liquidation risk.
contract MentoSavingsStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Mento Savings Token address (e.g., sCU for cUSD, sCE for cEUR)
    address public immutable MENTO_SAVINGS_TOKEN;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_,
        address mentoSavingsToken_
    ) BaseStrategy(asset_, vault_, owner_) {
        if (mentoSavingsToken_ == address(0)) revert Errors.Savanna__ZeroAddress();
        MENTO_SAVINGS_TOKEN = mentoSavingsToken_;
    }

    // ============ Strategy Info ============

    /// @notice Get protocol name
    function protocolName() external pure override returns (string memory) {
        return "Mento Savings";
    }

    /// @notice Get the current APY from Mento Savings rate
    /// @dev Mento provides a savings rate in 1e18 (per-second rate)
    ///      APY = (1 + rate/1e18)^(365*24*3600) - 1
    ///      For small rates: APY ≈ rate * seconds_per_year / 1e18
    ///      Convert to basis points (multiply by 10000)
    function getApy() external view override returns (uint256) {
        uint256 ratePerSecond = IMentoSavingsToken(MENTO_SAVINGS_TOKEN).savingsRate();
        // Approximate APY for small rates: rate * seconds_per_year / 1e18 * 10000
        // Exact compound: (1 + r)^n - 1, but for <20% APY the linear approx is accurate enough
        uint256 apyBps = (ratePerSecond * 365 days * 10000) / 1e18;
        return apyBps;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address asset, uint256 amount) internal override {
        IERC20(asset).forceApprove(MENTO_SAVINGS_TOKEN, amount);
    }

    function _depositToProtocol(address asset, uint256 amount) internal override {
        try IMentoSavingsToken(MENTO_SAVINGS_TOKEN).deposit(amount, address(this)) returns (uint256 shares) {
            require(shares > 0, "MentoSavings: deposit returned 0 shares");
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyDepositFailed(reason);
        }
    }

    function _withdrawFromProtocol(address asset, uint256 amount) internal override returns (uint256 withdrawn) {
        // Mento Savings uses ERC-4626 withdraw: withdraw(assets, receiver, owner)
        try IMentoSavingsToken(MENTO_SAVINGS_TOKEN).withdraw(amount, address(this), address(this)) returns (uint256) {
            withdrawn = amount; // ERC-4626 guarantees exact asset withdrawal if sufficient
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyWithdrawFailed(reason);
        }
    }

    function _getProtocolBalance(address) internal view override returns (uint256) {
        // Convert savings token shares to underlying asset value
        uint256 shares = IMentoSavingsToken(MENTO_SAVINGS_TOKEN).balanceOf(address(this));
        return IMentoSavingsToken(MENTO_SAVINGS_TOKEN).convertToAssets(shares);
    }
}

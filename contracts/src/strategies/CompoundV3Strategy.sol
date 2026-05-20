// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title IComet
/// @notice Minimal interface for Compound V3 (Comet) on Celo
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function supplyRate() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function baseToken() external view returns (address);
    function allow(address manager, bool isAllowed) external;
}

/// @title CompoundV3Strategy
/// @notice Strategy adapter for Compound V3 lending protocol on Celo
/// @dev Deposits stablecoins into Compound V3 Comet market for yield
contract CompoundV3Strategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Compound V3 Comet market address on Celo
    address public immutable COMET_MARKET;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_,
        address cometMarket_
    ) BaseStrategy(asset_, vault_, owner_) {
        COMET_MARKET = cometMarket_;
    }

    // ============ Strategy Info ============

    /// @notice Get protocol name
    function protocolName() external pure override returns (string memory) {
        return "Compound V3";
    }

    /// @notice Get the current APY from Compound V3 supply rate
    function getAPY() external view override returns (uint256) {
        uint256 supplyRate = IComet(COMET_MARKET).supplyRate();
        // supplyRate is per-second rate in 1e15 precision (absorb factor)
        // APY = (1 + rate/1e18)^(365*24*3600) - 1 ≈ rate * 365 * 24 * 3600 / 1e18
        // Convert to basis points
        uint256 apyBps = (supplyRate * 365 days * 10000) / 1e18;
        return apyBps;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address asset, uint256 amount) internal override {
        IERC20(asset).forceApprove(COMET_MARKET, amount);
    }

    function _depositToProtocol(address asset, uint256 amount) internal override {
        try IComet(COMET_MARKET).supply(asset, amount) {
            // Success
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyDepositFailed(reason);
        }
    }

    function _withdrawFromProtocol(address asset, uint256 amount) internal override returns (uint256 withdrawn) {
        try IComet(COMET_MARKET).withdraw(asset, amount) {
            withdrawn = amount; // Compound V3 withdraws exact amount if available
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyWithdrawFailed(reason);
        }
    }

    function _getProtocolBalance(address) internal view override returns (uint256) {
        return IComet(COMET_MARKET).balanceOf(address(this));
    }
}
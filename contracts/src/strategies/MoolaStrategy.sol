// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title IMoolaLendingPool
/// @notice Minimal interface for Moola LendingPool (Aave V2 fork on Celo)
interface IMoolaLendingPool {
    function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset)
        external
        view
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 variableBorrowIndex,
            uint128 currentLiquidityRate,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint8 id
        );
}

/// @title IMoolaAToken
/// @notice Minimal interface for Moola aToken (mcUSD)
interface IMoolaAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address user) external view returns (uint256);
    function POOL() external view returns (address);
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}

/// @title MoolaStrategy
/// @notice Strategy adapter for Moola lending protocol on Celo
/// @dev Deposits USDm into Moola Market for yield via the LendingPool
contract MoolaStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Moola LendingPool address
    address public immutable MOOLA_POOL;
    /// @notice Moola aToken (mcUSD) address
    address public immutable MOOLA_ATOKEN;

    uint256 private constant RAY = 1e27;
    uint256 private constant BPS_DIVISOR = 10000;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_,
        address moolaPool_,
        address moolaAToken_
    ) BaseStrategy(asset_, vault_, owner_) {
        MOOLA_POOL = moolaPool_;
        MOOLA_ATOKEN = moolaAToken_;
    }

    // ============ Strategy Info ============

    function protocolName() external pure override returns (string memory) {
        return "Moola";
    }

    /// @notice Get the current APY from Moola liquidity rate
    /// @dev currentLiquidityRate is per-second rate in RAY (1e27); convert to annual basis points
    function getApy() external view override returns (uint256) {
        (, , , uint128 currentLiquidityRate, , , , , , , , ) =
            IMoolaLendingPool(MOOLA_POOL).getReserveData(ASSET);

        if (currentLiquidityRate == 0) return 0;

        // currentLiquidityRate is per-second rate in RAY (1e27)
        // APY = rate * seconds_per_year / RAY * BPS_DIVISOR
        uint256 apyBps = (uint256(currentLiquidityRate) * 365 days * BPS_DIVISOR) / RAY;
        return apyBps;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address asset_, uint256 amount) internal override {
        IERC20(asset_).forceApprove(MOOLA_POOL, amount);
    }

    function _depositToProtocol(address, uint256 amount) internal override {
        try IMoolaLendingPool(MOOLA_POOL).deposit(ASSET, amount, address(this), 0) {
            // deposit succeeded
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyDepositFailed(reason);
        }
    }

    function _withdrawFromProtocol(address, uint256 amount) internal override returns (uint256 withdrawn) {
        try IMoolaLendingPool(MOOLA_POOL).withdraw(ASSET, amount, address(this)) returns (uint256 actualAmount) {
            withdrawn = actualAmount;
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyWithdrawFailed(reason);
        }
    }

    function _getProtocolBalance(address) internal view override returns (uint256) {
        return IMoolaAToken(MOOLA_ATOKEN).balanceOf(address(this));
    }
}
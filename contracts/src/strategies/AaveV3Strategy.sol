// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title IAaveV3Pool
/// @notice Minimal interface for Aave V3 Pool on Celo
interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getSupplyRate(address asset) external view returns (uint256);
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

/// @title IAaveV3Token
/// @notice Interface for Aave V3 aToken (interest-bearing)
interface IAaveV3Token is IERC20 {
    function scaledBalanceOf(address user) external view returns (uint256);
}

/// @title AaveV3Strategy
/// @notice Strategy adapter for Aave V3 lending protocol on Celo
/// @dev Deposits cUSD/USDC into Aave V3 Celo market for yield
contract AaveV3Strategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Aave V3 Pool address on Celo
    address public immutable AAVE_POOL;
    /// @notice Aave referral code (0 = no referral)
    uint16 public constant REFERRAL_CODE = 0;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_,
        address aavePool_
    ) BaseStrategy(asset_, vault_, owner_) {
        AAVE_POOL = aavePool_;
    }

    // ============ Strategy Info ============

    /// @notice Get protocol name
    function protocolName() external pure override returns (string memory) {
        return "Aave V3";
    }

    /// @notice Get the current APY from Aave V3 supply rate
    function getAPY() external view override returns (uint256) {
        uint256 supplyRate = IAaveV3Pool(AAVE_POOL).getSupplyRate(ASSET);
        // supplyRate is in ray (1e27), convert to basis points (APY)
        // APY = (1 + rate/1e27)^(365*24*3600) - 1 ≈ rate * 365 * 24 * 3600 / 1e27 (for small rates)
        // Return in basis points: multiply by 10000
        uint256 apyBps = (supplyRate * 365 days * 10000) / 1e27;
        return apyBps;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address asset, uint256 amount) internal override {
        IERC20(asset).forceApprove(AAVE_POOL, amount);
    }

    function _depositToProtocol(address asset, uint256 amount) internal override {
        try IAaveV3Pool(AAVE_POOL).supply(asset, amount, address(this), REFERRAL_CODE) {
            // Success
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyDepositFailed(reason);
        }
    }

    function _withdrawFromProtocol(address asset, uint256 amount) internal override returns (uint256 withdrawn) {
        try IAaveV3Pool(AAVE_POOL).withdraw(asset, amount, address(this)) returns (uint256 actualAmount) {
            withdrawn = actualAmount;
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyWithdrawFailed(reason);
        }
    }

    function _getProtocolBalance(address asset) internal view override returns (uint256) {
        // Get aToken address and balance
        // For Celo: aToken address can be looked up from Aave Pool
        return IERC20(asset).balanceOf(address(this));
    }
}
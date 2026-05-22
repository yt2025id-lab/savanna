// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BaseStrategy} from "./BaseStrategy.sol";
import {Errors} from "../libraries/Errors.sol";

/// @title IMoolaPool
/// @notice Minimal interface for Moola lending protocol on Celo
interface IMoolaPool {
    function mint(uint256 mintAmount) external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function supplyRatePerBlock() external view returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
}

/// @title MoolaStrategy
/// @notice Strategy adapter for Moola lending protocol on Celo
/// @dev Deposits cUSD into Moola Market for yield (native Celo lending protocol)
contract MoolaStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    /// @notice Moola cToken (mToken) address
    address public immutable MOOLA_CTOKEN;

    // ============ Constructor ============

    constructor(
        address asset_,
        address vault_,
        address owner_,
        address moolaCToken_
    ) BaseStrategy(asset_, vault_, owner_) {
        MOOLA_CTOKEN = moolaCToken_;
    }

    // ============ Strategy Info ============

    /// @notice Get protocol name
    function protocolName() external pure override returns (string memory) {
        return "Moola";
    }

    /// @notice Get the current APY from Moola supply rate
    /// @dev Moola uses per-block rates, Celo has ~5s block time
    function getApy() external view override returns (uint256) {
        uint256 ratePerBlock = IMoolaPool(MOOLA_CTOKEN).supplyRatePerBlock();
        // Celo block time ~5 seconds, blocks per year = 365 * 24 * 3600 / 5
        uint256 blocksPerYear = 365 days / 5;
        // APY ≈ ratePerBlock * blocksPerYear / 1e18 (mToken uses 18 decimals)
        // Convert to basis points
        uint256 apyBps = (ratePerBlock * blocksPerYear * 10000) / 1e18;
        return apyBps;
    }

    // ============ Internal Implementations ============

    function _approveProtocol(address asset, uint256 amount) internal override {
        IERC20(asset).forceApprove(MOOLA_CTOKEN, amount);
    }

    function _depositToProtocol(address, uint256 amount) internal override {
        try IMoolaPool(MOOLA_CTOKEN).mint(amount) returns (uint256 minted) {
            require(minted > 0, "Moola: mint returned 0");
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyDepositFailed(reason);
        }
    }

    function _withdrawFromProtocol(address, uint256 amount) internal override returns (uint256 withdrawn) {
        try IMoolaPool(MOOLA_CTOKEN).redeemUnderlying(amount) returns (uint256 actualAmount) {
            withdrawn = actualAmount;
        } catch (bytes memory reason) {
            revert Errors.Savanna__StrategyWithdrawFailed(reason);
        }
    }

    function _getProtocolBalance(address) internal view override returns (uint256) {
        uint256 cTokenBalance = IMoolaPool(MOOLA_CTOKEN).balanceOf(address(this));
        uint256 exchangeRate = IMoolaPool(MOOLA_CTOKEN).exchangeRateStored();
        // underlying = cTokenBalance * exchangeRate / 1e18
        return (cTokenBalance * exchangeRate) / 1e18;
    }
}
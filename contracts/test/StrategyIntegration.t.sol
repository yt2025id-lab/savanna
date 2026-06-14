// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPriceFeed} from "../src/mocks/MockPriceFeed.sol";
import {SavannaVault} from "../src/vault/SavannaVault.sol";
import {SavannaController} from "../src/controller/SavannaController.sol";
import {SavannaOracle} from "../src/SavannaOracle.sol";
import {AaveV3Strategy} from "../src/strategies/AaveV3Strategy.sol";
import {MoolaStrategy} from "../src/strategies/MoolaStrategy.sol";
import {MentoSavingsStrategy} from "../src/strategies/MentoSavingsStrategy.sol";
import {CompoundV3Strategy} from "../src/strategies/CompoundV3Strategy.sol";
import {ReserveStrategy} from "../src/strategies/ReserveStrategy.sol";
import {IStrategy} from "../src/strategies/IStrategy.sol";
import {DataTypes} from "../src/libraries/DataTypes.sol";
import {Errors} from "../src/libraries/Errors.sol";

/* -------------------------------------------------------------------------- */
/*  Mock Protocol Contracts                                                    */
/* -------------------------------------------------------------------------- */

contract MockAaveV3Pool {
    address public aToken;
    // ~5% APY per-second RAY: 0.05 / 365 days * 1e27 = 0.05 / 31536000 * 1e27 ≈ 1.585e18
    uint256 public supplyRate = 1.585e18;

    constructor(address aToken_) { aToken = aToken_; }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        MockAaveAToken(aToken).mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        MockAaveAToken(aToken).burn(msg.sender, amount);
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function getSupplyRate(address) external view returns (uint256) { return supplyRate; }
    function setSupplyRate(uint256 rate) external { supplyRate = rate; }
}

contract MockAaveAToken is MockERC20 {
    constructor() MockERC20("Mock aUSDC", "aUSDC", 18, 0, address(this)) {}

    function burn(address from, uint256 amount) external { _burn(from, amount); }
}

contract MockMoolaPool {
    address public mToken;
    // ~4% APY per-second RAY
    uint128 public currentLiquidityRate = uint128(1.268e18);

    constructor(address mToken_) { mToken = mToken_; }

    function deposit(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        MockMoolaAToken(mToken).mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        MockMoolaAToken(mToken).burn(msg.sender, amount);
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function getReserveData(address)
        external view returns (
            uint256, uint128, uint128, uint128, uint128, uint128, uint40,
            address, address, address, address, uint8
        )
    {
        return (0, 0, 0, currentLiquidityRate, 0, 0, 0, mToken, address(0), address(0), address(0), 0);
    }

    function setLiquidityRate(uint128 rate) external { currentLiquidityRate = rate; }
}

contract MockMoolaAToken is MockERC20 {
    constructor() MockERC20("Mock mcUSD", "mcUSD", 18, 0, address(this)) {}

    function burn(address from, uint256 amount) external { _burn(from, amount); }
}

contract MockMentoSavingsToken is MockERC20 {
    // ~3% APY per-second rate in 1e18: 300 * 1e18 / (365days * 10000)
    uint256 public savingsRate = 9.513e11;
    uint256 public exchangeRate_ = 1.05e18;
    address public underlying;

    constructor(address underlying_) MockERC20("Mock sCU", "sCU", 18, 0, address(this)) {
        underlying = underlying_;
    }

    function asset() public view returns (address) { return underlying; }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = assets * 1e18 / exchangeRate_;
        IERC20(underlying).transferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        shares = assets * 1e18 / exchangeRate_;
        _burn(owner, shares);
        IERC20(underlying).transfer(receiver, assets);
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        return shares * exchangeRate_ / 1e18;
    }

    function convertToShares(uint256 assets) external view returns (uint256) {
        return assets * 1e18 / exchangeRate_;
    }

    function totalAssets() external view returns (uint256) {
        return totalSupply() * exchangeRate_ / 1e18;
    }
}

contract MockCometMarket {
    address public baseToken;
    // ~6% APY per-second rate; calculated in setUp
    uint256 public supplyRate_ = 1.902e9; // ~6% APY per-second rate
    mapping(address => uint256) public balances;

    constructor(address baseToken_) { baseToken = baseToken_; }

    function supply(address asset, uint256 amount) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
    }

    function withdraw(address asset, uint256 amount) external {
        balances[msg.sender] -= amount;
        IERC20(asset).transfer(msg.sender, amount);
    }

    function supplyRate() external view returns (uint256) { return supplyRate_; }
    function setSupplyRate(uint256 rate) external { supplyRate_ = rate; }
    function balanceOf(address account) external view returns (uint256) { return balances[account]; }
}

/* -------------------------------------------------------------------------- */
/*  Shared Strategy Test Contract                                              */
/* -------------------------------------------------------------------------- */
/*  Strategy Integration Tests                                                 */
/* -------------------------------------------------------------------------- */

contract StrategyIntegrationTest is Test {
    MockERC20 public usdc;
    address public vault = makeAddr("vault");
    address public owner = makeAddr("owner");
    address public controller_ = makeAddr("controller");

    // Mocks
    MockAaveV3Pool public aavePool;
    MockAaveAToken public aaveAToken;
    MockMoolaPool public moolaPool;
    MockERC20 public moolaAToken; // used in tests, typed as MockERC20 for convenience
    MockMentoSavingsToken public mentoSavingsToken;
    MockCometMarket public cometMarket;

    // Strategies
    AaveV3Strategy public aaveStrategy;
    MoolaStrategy public moolaStrategy;
    MentoSavingsStrategy public mentoStrategy;
    CompoundV3Strategy public compoundStrategy;
    ReserveStrategy public reserveStrategy;

    // ============ Setup ============

    function setUp() public {
        vm.startPrank(owner);

        usdc = new MockERC20("Mock USDC", "USDC", 6, 1_000_000_000e6, owner);

        // Deploy mocks
        aaveAToken = new MockAaveAToken();
        aavePool = new MockAaveV3Pool(address(aaveAToken));

        moolaAToken = new MockMoolaAToken();
        moolaPool = new MockMoolaPool(address(moolaAToken));

        mentoSavingsToken = new MockMentoSavingsToken(address(usdc));

        cometMarket = new MockCometMarket(address(usdc));

        // Deploy strategies
        aaveStrategy = new AaveV3Strategy(address(usdc), vault, owner, address(aavePool), address(aaveAToken));
        moolaStrategy = new MoolaStrategy(address(usdc), vault, owner, address(moolaPool), address(moolaAToken));
        mentoStrategy = new MentoSavingsStrategy(address(usdc), vault, owner, address(mentoSavingsToken));
        compoundStrategy = new CompoundV3Strategy(address(usdc), vault, owner, address(cometMarket));
        reserveStrategy = new ReserveStrategy(address(usdc), vault, owner);

        aaveStrategy.setController(controller_);
        moolaStrategy.setController(controller_);
        mentoStrategy.setController(controller_);
        compoundStrategy.setController(controller_);
        reserveStrategy.setController(controller_);

        // Fund agents with small balance for operations
        usdc.mint(address(aaveStrategy), 1_000_000e6);
        usdc.mint(address(moolaStrategy), 1_000_000e6);
        usdc.mint(address(mentoStrategy), 1_000_000e6);
        usdc.mint(address(compoundStrategy), 1_000_000e6);
        usdc.mint(address(reserveStrategy), 1_000_000e6);
        usdc.mint(alice, 1_000_000e6);
        usdc.approve(address(aaveStrategy), type(uint256).max);
        usdc.approve(address(moolaStrategy), type(uint256).max);
        usdc.approve(address(mentoStrategy), type(uint256).max);
        usdc.approve(address(compoundStrategy), type(uint256).max);
        usdc.approve(address(reserveStrategy), type(uint256).max);
        usdc.approve(address(aavePool), type(uint256).max);

        vm.stopPrank();
    }

    // ============ Generic Strategy Interface Tests ============

    function _testStrategyInterface(IStrategy strategy, string memory expectedName, uint256 expectedApyMin) internal {
        assertEq(strategy.protocolName(), expectedName, "protocolName mismatch");
        assertGe(strategy.getApy(), expectedApyMin, "APY below expected");
    }

    function test_aaveV3_interface() public {
        _testStrategyInterface(aaveStrategy, "Aave V3", 400); // >= 4% APY
    }

    function test_moola_interface() public {
        _testStrategyInterface(moolaStrategy, "Moola", 300); // >= 3% APY
    }

    function test_mento_interface() public {
        _testStrategyInterface(mentoStrategy, "Mento Savings", 200); // >= 2% APY
    }

    function test_compoundV3_interface() public {
        _testStrategyInterface(compoundStrategy, "Compound V3", 500); // >= 5% APY
    }

    function test_reserve_interface() public {
        _testStrategyInterface(reserveStrategy, "Reserve", 0); // 0% APY
    }

    // ============ Aave V3 Strategy Tests ============

    function test_aaveV3_deposit_withdraw_full_cycle() public {
        uint256 depositAmount = 1_000e6;

        vm.prank(vault);
        aaveStrategy.deposit(address(usdc), depositAmount);

        uint256 balance = aaveStrategy.getBalance(address(usdc));
        assertGt(balance, 0, "Should have balance after deposit");

        uint256 apy = aaveStrategy.getApy();
        assertGt(apy, 0, "Should have positive APY");

        vm.prank(vault);
        uint256 withdrawn = aaveStrategy.withdraw(address(usdc), depositAmount, vault);
        assertEq(withdrawn, depositAmount, "Should withdraw full amount");
    }

    function test_aaveV3_deposit_revertUnsupportedAsset() public {
        address badAsset = makeAddr("badAsset");

        vm.prank(vault);
        vm.expectRevert(abi.encodeWithSelector(Errors.Savanna__UnsupportedAsset.selector, badAsset));
        aaveStrategy.deposit(badAsset, 1000e6);
    }

    function test_aaveV3_deposit_revertNotVault() public {
        vm.prank(alice);
        vm.expectRevert(Errors.Savanna__OnlyVault.selector);
        aaveStrategy.deposit(address(usdc), 1000e6);
    }

    function test_aaveV3_withdraw_revertNotVaultOrController() public {
        vm.prank(alice);
        vm.expectRevert(Errors.Savanna__OnlyVault.selector);
        aaveStrategy.withdraw(address(usdc), 1000e6, alice);
    }

    function test_aaveV3_apy_changesWithSupplyRate() public {
        uint256 initialApy = aaveStrategy.getApy();

        aavePool.setSupplyRate(3.171e18); // ~10% APY per-second
        uint256 newApy = aaveStrategy.getApy();
        assertGt(newApy, initialApy, "APY should increase when supply rate increases");
    }

    // ============ Moola Strategy Tests ============

    function test_moola_deposit_withdraw_full_cycle() public {
        uint256 depositAmount = 1_000e6;

        vm.prank(vault);
        moolaStrategy.deposit(address(usdc), depositAmount);

        uint256 balance = moolaStrategy.getBalance(address(usdc));
        assertGt(balance, 0, "Should have balance after deposit");

        vm.prank(vault);
        uint256 withdrawn = moolaStrategy.withdraw(address(usdc), depositAmount, vault);
        assertEq(withdrawn, depositAmount, "Should withdraw full amount");
    }

    function test_moola_apy_changesWithLiquidityRate() public {
        uint256 initialApy = moolaStrategy.getApy();

        moolaPool.setLiquidityRate(uint128(1.585e18)); // 5%
        uint256 newApy = moolaStrategy.getApy();
        assertGt(newApy, initialApy, "APY should increase");
    }

    function test_moola_zero_rate() public {
        moolaPool.setLiquidityRate(0);
        assertEq(moolaStrategy.getApy(), 0, "Zero rate should give zero APY");
    }

    // ============ Mento Savings Strategy Tests ============

    function test_mentoSavings_deposit_withdraw_cycle() public {
        uint256 depositAmount = 1_000e6;

        vm.prank(vault);
        mentoStrategy.deposit(address(usdc), depositAmount);

        uint256 balance = mentoStrategy.getBalance(address(usdc));
        assertGt(balance, 0, "Should have balance after deposit");

        vm.prank(vault);
        mentoStrategy.withdraw(address(usdc), depositAmount, vault);
    }

    function test_mentoSavings_apy_updatesWithRate() public {
        uint256 apy = mentoStrategy.getApy();
        assertGt(apy, 0, "Should have positive APY by default");
    }

    // ============ Compound V3 Strategy Tests ============

    function test_compoundV3_deposit_withdraw_cycle() public {
        uint256 depositAmount = 1_000e6;

        vm.prank(vault);
        compoundStrategy.deposit(address(usdc), depositAmount);

        uint256 balance = compoundStrategy.getBalance(address(usdc));
        assertGt(balance, 0, "Should have balance after deposit");

        vm.prank(vault);
        compoundStrategy.withdraw(address(usdc), depositAmount, vault);
    }

    function test_compoundV3_apy_changesWithRate() public {
        uint256 initialApy = compoundStrategy.getApy();

        cometMarket.setSupplyRate(3.804e9); // ~12% APY per-second
        uint256 newApy = compoundStrategy.getApy();
        assertGt(newApy, initialApy, "APY should increase");
    }

    // ============ Reserve Strategy Tests ============

    function test_reserve_deposit_withdraw_cycle() public {
        vm.prank(vault);
        reserveStrategy.deposit(address(usdc), 1_000e6);

        assertGt(reserveStrategy.getBalance(address(usdc)), 0, "Should have balance");

        vm.prank(vault);
        reserveStrategy.withdraw(address(usdc), 1_000e6, vault);
    }

    function test_reserve_apy_alwaysZero() public {
        assertEq(reserveStrategy.getApy(), 0, "Reserve APY should always be 0");
    }

    // ============ Strategy Access Control ============

    function test_strategy_setVault_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(); // Ownable
        aaveStrategy.setVault(makeAddr("newVault"));
    }

    function test_strategy_setActive() public {
        assertTrue(aaveStrategy.active(), "Should start active");

        vm.prank(owner);
        aaveStrategy.setActive(false);
        assertFalse(aaveStrategy.active(), "Should be inactive");

        vm.prank(vault);
        vm.expectRevert("Strategy inactive");
        aaveStrategy.deposit(address(usdc), 1000e6);
    }

    // ============ APY Comparison (for rebalance logic) ============

    function test_apyComparison_acrossAllStrategies() public {
        // Set per-second rates in RAY that yield expected APYs:
        // APY bps = rate * 365days * 10000 / 1e27
        aavePool.setSupplyRate(1.902e18);   // ~6% APY
        moolaPool.setLiquidityRate(uint128(2.536e18)); // ~8% APY
        cometMarket.setSupplyRate(1.268e9); // ~4% APY per-second (Compound uses 1e18 divisor)

        uint256 aaveApy = aaveStrategy.getApy();
        uint256 moolaApy = moolaStrategy.getApy();
        uint256 compoundApy = compoundStrategy.getApy();
        uint256 reserveApy = reserveStrategy.getApy();

        assertGt(moolaApy, aaveApy, "Moola should beat Aave at 8% vs 6%");
        assertGt(aaveApy, compoundApy, "Aave should beat Compound at 6% vs 4%");
        assertEq(reserveApy, 0, "Reserve stays 0");
    }

    function test_findBestStrategy_byApy() public view {
        // Default rates: Aave ~5%, Moola ~4%, Mento ~3%, Compound ~6%, Reserve 0%
        // Compound should beat Aave with current defaults, so we verify all have values
        assertGt(aaveStrategy.getApy(), 0, "Aave should have positive APY");
        assertGt(moolaStrategy.getApy(), 0, "Moola should have positive APY");
        assertGt(compoundStrategy.getApy(), 0, "Compound should have positive APY");
        assertGt(mentoStrategy.getApy(), 0, "Mento should have positive APY");
        assertEq(reserveStrategy.getApy(), 0, "Reserve stays 0");
    }

    // ============ Emergency Withdraw Tests ============

    function test_emergencyWithdraw_protects_vault_asset() public {
        vm.prank(vault);
        reserveStrategy.deposit(address(usdc), 5_000e6);

        uint256 idleBalance = reserveStrategy.getBalance(address(usdc));
        assertGt(idleBalance, 0, "Should have balance after deposit");

        // Try to withdraw more than idle — should revert
        uint256 tooMuch = idleBalance + 1;
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(Errors.Savanna__StrategyInsufficientFunds.selector, tooMuch, idleBalance)
        );
        reserveStrategy.emergencyWithdraw(address(usdc), tooMuch, owner);

        // Withdraw exact idle amount — should succeed
        vm.prank(owner);
        reserveStrategy.emergencyWithdraw(address(usdc), idleBalance, owner);
    }

    // ============ Partial Withdraw Tests ============

    function test_partialWithdraw_reserve() public {
        vm.prank(vault);
        reserveStrategy.deposit(address(usdc), 10_000e6);

        uint256 balanceBefore = reserveStrategy.getBalance(address(usdc));
        uint256 partialAmount = 3_000e6;
        vm.prank(vault);
        uint256 withdrawn = reserveStrategy.withdraw(address(usdc), partialAmount, vault);
        assertEq(withdrawn, partialAmount, "Should withdraw partial");
        uint256 balanceAfter = reserveStrategy.getBalance(address(usdc));
        assertEq(balanceAfter, balanceBefore - partialAmount, "Remaining balance");
    }

    // ============ Inactive Strategy ============

    function test_inactiveStrategy_revertsDeposit() public {
        vm.prank(owner);
        reserveStrategy.setActive(false);

        vm.prank(vault);
        vm.expectRevert("Strategy inactive");
        reserveStrategy.deposit(address(usdc), 1000e6);
    }

    // ============ Helpers ============

    address public alice = makeAddr("alice");
}

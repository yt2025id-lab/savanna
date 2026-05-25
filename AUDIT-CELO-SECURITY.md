# Savanna Finance - Celo Security Audit Report

> Mapped against [celo-org/celopedia-skills](https://github.com/celo-org/celopedia-skills) `security-patterns.md` v2.2.0

## Overview

| Item | Detail |
|------|--------|
| **Project** | Savanna Finance - AI-powered ERC-4626 yield vault on Celo |
| **Solidity** | 0.8.28 |
| **Contracts** | 15 source files |
| **Tests** | 66 passing |
| **Frameworks** | Foundry, OpenZeppelin, Chainlink Functions/Data Feeds |
| **Protocols** | Aave V3, Moola, Mento Savings, Compound V3, Reserve |
| **Audit Scope** | Celo-specific risks per celopedia-skills security-patterns.md |

---

## 1. CELO Token Duality Risk

**celopedia risk**: CELO exists as both native `msg.value` and ERC-20 at `0x471EcE3750Da237f93B8E339c536989b8978a438`. Double-counting or silent fund loss.

### Findings

| # | Contract | Finding | Severity |
|---|----------|---------|----------|
| 1.1 | `SavannaCrossChainReceiver.sol:78` | `receive() external payable {}` accepts native CELO with no tracking | **MEDIUM** |
| 1.2 | `SavannaVault.sol` | Vault does not handle CELO at all (ERC-4626 for stablecoins only) | **INFO** |
| 1.3 | All strategies | No strategy accepts CELO — all are stablecoin-only | **INFO** |

### Detail

- **1.1**: `SavannaCrossChainReceiver` has a `receive()` function that accepts native CELO, but there's no accounting for it. If CELO is accidentally sent to this contract, only `rescueTokens()` can recover it — and `rescueTokens` uses `safeTransfer` which won't work for native CELO.

### Recommendation

```solidity
// SavannaCrossChainReceiver.sol — replace receive() with a guarded version
receive() external payable {
    revert Errors.Savanna__NativeTokenNotAccepted();
}
// Or add a withdrawNative() admin function
```

---

## 2. Fee Abstraction (CIP-64) Abuse Risk

**celopedia risk**: Users paying gas in USDC/USDT (fee abstraction) can have their balance debited both by the gas fee AND the contract's token operations within the same transaction.

### Findings

| # | Contract | Finding | Severity |
|---|----------|---------|----------|
| 2.1 | `SavannaVault.sol:deposit()` | User's USDC balance could be debited by fee abstraction during `deposit()`, causing the `transferFrom` to receive fewer tokens than expected | **HIGH** |
| 2.2 | `SavannaVault.sol:crossChainDeposit()` | Cross-chain deposits use `super.deposit()` which calls `transferFrom` — fee abstraction could reduce available balance mid-call | **MEDIUM** |
| 2.3 | `SavannaController.sol:onReport()` | No accounting for fee-currency balance drift during strategy execution | **MEDIUM** |

### Detail

- **2.1**: On Celo, users can set `feeCurrency=USDC` to pay gas with USDC. If a user deposits 100 USDC and gas costs 0.5 USDC, the vault's `transferFrom` runs AFTER the gas debit. The user's USDC balance at `transferFrom` time is `balance - 0.5` (gas already taken). The deposit call expects the full pre-approval amount, which may now exceed the actual balance, causing a revert or requiring the user to over-approve.

- **2.3**: The controller's `onReport` calls `vault.executeStrategy` which transfers tokens to the strategy. If the forwarder (Chainlink Functions callback) pays gas in the same token as the vault asset, the forwarder's balance could be lower than expected.

### Recommendation

```solidity
// SavannaVault.sol — add fee abstraction buffer in deposit()
function deposit(uint256 assets, address receiver)
    public
    override
    nonReentrant
    whenNotPaused
    returns (uint256 shares)
{
    if (assets < Constants.MIN_DEPOSIT) {
        revert Errors.Savanna__InsufficientDeposit(assets, Constants.MIN_DEPOSIT);
    }

    // CIP-64: If user pays gas in the vault asset, their balance may be
    // lower by the gas cost when transferFrom executes. The caller should
    // approve a buffer or use max approval.
    uint256 preBalance = IERC20(asset()).balanceOf(msg.sender);
    uint256 actualAssets = assets > preBalance ? preBalance : assets;

    shares = super.deposit(actualAssets, receiver);
    emit Deposited(receiver, actualAssets, shares);
}
```

Also document in the frontend: **Users paying gas in the vault asset (USDC) should approve `amount + gas_buffer`**.

---

## 3. Aave V3 aToken Ratio Drift

**celopedia risk**: aToken balance is NOT 1:1 with underlying — it scales with `liquidityIndex`. Using raw `balanceOf` produces incorrect share math.

### Findings

| # | Contract | Finding | Severity |
|---|----------|---------|----------|
| 3.1 | `AaveV3Strategy.sol:_getProtocolBalance()` | Returns `IERC20(asset).balanceOf(address(this))` which returns 0 after supplying to Aave (funds are in aTokens, not the asset) | **CRITICAL** |
| 3.2 | `AaveV3Strategy.sol` | Does not track aToken address, so cannot query `scaledBalanceOf` or `convertToAssets` | **HIGH** |

### Detail

- **3.1**: After calling `IAaveV3Pool.supply()`, the strategy's asset token balance drops to 0 and aTokens are minted. `_getProtocolBalance` returns `IERC20(asset).balanceOf(address(this))` = **0** after deposit. This means:
  - `getBalance()` always returns 0
  - Emergency withdrawals based on protocol balance will fail
  - Rebalance logic cannot determine how much is deposited

- **3.2**: The contract has a comment acknowledging this ("we use asset balance as a safe proxy") but the "safe proxy" returns zero.

### Recommendation

```solidity
// AaveV3Strategy.sol — store aToken address and use it for balance queries
address public immutable AAVE_ATOKEN;

constructor(
    address asset_,
    address vault_,
    address owner_,
    address aavePool_,
    address aaveAToken_    // ADD: aToken address
) BaseStrategy(asset_, vault_, owner_) {
    AAVE_POOL = aavePool_;
    AAVE_ATOKEN = aaveAToken_;
}

function _getProtocolBalance(address) internal view override returns (uint256) {
    // Use scaledBalanceOf for accurate accounting (per celopedia security-patterns.md §3)
    uint256 scaledBalance = IAaveV3Token(AAVE_ATOKEN).scaledBalanceOf(address(this));
    // Convert to actual underlying using current index (optional — for display only)
    return IERC20(AAVE_ATOKEN).balanceOf(address(this));
}
```

Also update the interface to include `scaledBalanceOf`.

---

## 4. Mento Circuit Breaker Risk

**celopedia risk**: Mento stablecoin pools have per-pool circuit breakers that halt swaps when price deviates too far. Protocols assuming always-available mint/redeem can freeze user funds.

### Findings

| # | Contract | Finding | Severity |
|---|----------|---------|----------|
| 4.1 | `MentoSavingsStrategy.sol` | No handling for Mento Savings withdrawal failures due to circuit breaker on underlying Mento stablecoin pool | **HIGH** |
| 4.2 | `SavannaVault.sol:completeStrategy()` | If Mento Savings withdrawal fails (circuit breaker), user funds are locked until breaker resets | **HIGH** |
| 4.3 | `SavannaController.sol:withdrawFromStrategy()` | Calls `IStrategy.withdraw()` which reverts on Mento failure, blocking user exit | **HIGH** |

### Detail

- Mento Savings (sCU/sCE) is backed by the Mento Reserve, but the underlying stablecoin pools (USDm/USDC, EURm/USDm) have circuit breakers. If a breaker is tripped:
  - `IMentoSavingsToken.withdraw()` may revert
  - The strategy's `withdraw()` will bubble up the revert
  - User funds in MentoSavingsStrategy are frozen until the breaker cooldown resolves

### Recommendation

```solidity
// MentoSavingsStrategy.sol — add fallback withdrawal path
function _withdrawFromProtocol(address asset, uint256 amount) internal override returns (uint256 withdrawn) {
    // Primary: try Mento Savings withdraw
    try IMentoSavingsToken(MENTO_SAVINGS_TOKEN).withdraw(amount, address(this), address(this)) returns (uint256) {
        withdrawn = amount;
    } catch {
        // Fallback: Mento circuit breaker may be active
        // Attempt partial withdrawal or queue for later
        // Option 1: Try withdrawing available liquidity
        uint256 availableAssets = IMentoSavingsToken(MENTO_SAVINGS_TOKEN).totalAssets();
        if (availableAssets >= amount) {
            // Circuit breaker on pool side, not Savings side — may succeed with smaller amount
            try IMentoSavingsToken(MENTO_SAVINGS_TOKEN).withdraw(availableAssets, address(this), address(this)) {
                withdrawn = availableAssets;
            } catch {
                revert Errors.Savanna__StrategyWithdrawFailed("Mento breaker active");
            }
        } else {
            revert Errors.Savanna__StrategyWithdrawFailed("Mento breaker active");
        }
    }
}
```

Also add a `breakerActive` view function and surface circuit breaker status in the UI.

---

## 5. Epoch Boundary Effects (Post-L2 Migration)

**celopedia risk**: Post-L2, epoch processing moved to an `EpochManager` contract. Contracts reading staking-related balances at epoch boundaries may see non-atomic state.

### Findings

| # | Contract | Finding | Severity |
|---|----------|---------|----------|
| 5.1 | `SavannaVault.sol:performUpkeep()` | Rebalance timing is based on `block.timestamp`, not epoch boundaries | **LOW** |
| 5.2 | `ReserveStrategy.sol` | Reserve strategy interacts with idle funds only — no staking/validator dependency | **INFO** |

### Detail

- Savanna Finance does not interact with staking, validators, or epoch rewards directly. Epoch effects are **not applicable** to current contracts.

### Status: **No action needed**

---

## 6. Additional Celo-Specific Findings (Beyond celopedia-skills Scope)

### 6.1 Token Decimals Mismatch — **HIGH**

| Contract | Issue |
|----------|-------|
| `Constants.sol:MIN_DEPOSIT` | Set to `10e6` (USDC 6-decimal), but vault accepts cUSD (18-decimal). Minimum deposit for cUSD users is effectively 0.00001 cUSD instead of 10 cUSD. |
| `SavannaVault.sol:_decimalsOffset()` | Returns 6, but if vault asset is cUSD (18 decimals), this creates incorrect share math |

**Fix**: `MIN_DEPOSIT` should be dynamic based on asset decimals, or use a vault that only accepts one asset type.

```solidity
// Use separate constants or pass decimals in constructor
uint256 public immutable MIN_DEPOSIT; // Set based on asset.decimals()

constructor(IERC20 asset_, ...) {
    uint8 dec = IERC20Metadata(address(asset_)).decimals();
    MIN_DEPOSIT = 10 * (10 ** uint256(dec));
}
```

### 6.2 `_swapToVaultAsset` Placeholder — **CRITICAL**

| Contract | Issue |
|----------|-------|
| `SavannaCrossChainReceiver.sol:205-227` | `_swapToVaultAsset` is a placeholder returning `amountIn` (1:1 assumed for all stablecoins). No actual DEX swap occurs. |

**Impact**: USDT/DAI/other stablecoins bridged to Celo will be assumed 1:1 with vault asset, but they remain in the contract unswapped. The vault deposit will fail because the contract doesn't have the vault asset.

**Fix**: Integrate Uniswap V3 or Aerodrome swap, or only allow vault-asset bridge tokens.

### 6.3 `totalYieldEarned` Underflow — **MEDIUM**

| Contract | Issue |
|----------|-------|
| `SavannaVault.sol:completeStrategy()` | `totalYieldEarned` is `uint256` and only tracks positive yield. Losses (returnedAmount < allocated) are emitted as events but not deducted from `totalYieldEarned`. |

**Impact**: `totalYieldEarned` overstates actual protocol performance. Not exploitable, but misleading.

### 6.4 `withdraw` Missing `whenNotPaused` — **LOW**

| Contract | Issue |
|----------|-------|
| `SavannaVault.sol:withdraw()` | Missing `whenNotPaused` modifier (only `redeem` and `deposit` have it). Users can withdraw while vault is paused. |

### 6.5 `emergencyWithdraw` in BaseStrategy — **MEDIUM**

| Contract | Issue |
|----------|-------|
| `BaseStrategy.sol:127-129` | `emergencyWithdraw` transfers any token to any recipient without checking if funds are deployed in the protocol. Could drain aTokens that represent user deposits. |

**Fix**: Add a check or access control that prevents withdrawing protocol position tokens during active strategies.

### 6.6 `_getRevertReason` Parsing Bug — **LOW**

| Contract | Issue |
|----------|-------|
| `SavannaFunctionsConsumer.sol:282` | `uint256(bytes32(reason) >> 128)` reads the upper 16 bytes of the 3rd word as length, but standard ABI encoding puts the string length at bytes 4+32+32 = offset 68. This should be `uint256(bytes32(reason[36:68]))` for the length field. |

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 2 | Aave aToken balance=0, cross-chain swap placeholder |
| **HIGH** | 4 | Fee abstraction drift, Mento circuit breaker, token decimals mismatch, Mento withdrawal lock |
| **MEDIUM** | 4 | Native CELO receive(), totalYieldEarned overstatement, fee abstraction in controller, emergencyWithdraw |
| **LOW** | 2 | Missing whenNotPaused on withdraw, revert reason parsing |
| **INFO** | 2 | No CELO duality exposure, no epoch boundary exposure |

## celopedia-skills Integration Status

- Installed to `.agents/skills/celopedia-skill/` (v2.2.0)
- Symlinked to `.claude/skills/` for Claude Code compatibility
- Security patterns reference: `.agents/skills/celopedia-skill/references/security-patterns.md`
- DeFi protocol reference: `.agents/skills/celopedia-skill/references/defi-protocols.md`
- Contract addresses: `.agents/skills/celopedia-skill/references/contracts.md`

## Next Steps

1. **Fix CRITICAL issues** — Aave aToken balance tracking and cross-chain swap
2. **Add Mento circuit breaker handling** — fallback withdrawal paths
3. **Add fee abstraction documentation** — frontend buffer guidance
4. **Run pashov/skills solidity-auditor** — chain-agnostic audit layer per celopedia recommendation
5. **Add fuzz tests** for fee abstraction and circuit breaker edge cases

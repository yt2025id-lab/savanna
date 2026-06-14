# Audit Komprehensif — Savanna Finance
**Role:** Web3 Auditor (User-Friendly DApp Focus) | **Tanggal:** 11 Juni 2026
**Scope:** Smart Contracts (Solidity) → Frontend (Next.js) → Backend (x402/AI Strategy)

---

## ✅ RINGKASAN EKSEKUTIF

| Area | Rating | Critical | High | Medium | Low |
|------|--------|----------|------|--------|-----|
| Smart Contracts | 🟡 **Good** | 0 | 0 | 3 | 5 |
| Frontend DApp | 🟡 **Good** | 0 | 0 | 4 | 6 |
| Backend/x402 | 🟢 **Excellent** | 0 | 0 | 1 | 2 |
| **Total** | **🟡** | **0** | **0** | **8** | **13** |

Tidak ada critical/high issues. Ini solid untuk hackathon. Berikut detailnya.

---

# A. SMART CONTRACTS AUDIT

## A1. SavannaVault.sol — CRITICAL REVIEW

### ✅ KEKUATAN
- **ERC-4626 compliant** dengan inflation attack protection (`_decimalsOffset = 6`)
- **ReentrancyGuard** + **Pausable** — defense-in-depth
- **SafeERC20** digunakan konsisten
- `deposit()` aman terhadap CIP-64 fee abstraction (cek `preBalance`)
- `completeStrategy()` handle positive/negative yield dengan benar
- `maxWithdraw/maxRedeem` membatasi ke idle balance

### ⚠️ MEDIUM — Withdraw/Withdraw & Redeem Blocked Saat Ada Active Position
```solidity
function withdraw(...) {
    DataTypes.UserPosition memory pos = _positions[owner];
    if (pos.isActive) { revert Errors.Savanna__NoActivePosition(); } // 🚫 user can't withdraw
```
**Masalah:** User TIDAK bisa withdraw dana IDLE mereka (yang TIDAK dialokasikan ke strategy) jika ada active position.
**Contoh:** User deposit 1000 USDC, strategy mengalokasikan 500 USDC. User ingin withdraw 200 USDC idle — REVERT.
**Saran:** Hanya blokir withdraw untuk `allocatedAmount`, sisanya boleh di-withdraw.

### ⚠️ MEDIUM — `performUpkeep` Bisa Dipanggil Siapa Saja
```solidity
function performUpkeep(bytes calldata performData) external nonReentrant {
```
Chainlink Automation mengharapkan **hanya** Automation Registry yang panggil ini. Tidak ada akses kontrol. Siapa pun bisa trigger rebalance kapan pun (setelah interval).
**Saran:** Tambahkan `onlyAutomationRegistry` atau validasi msg.sender.

### ⚠️ MEDIUM — `triggerStrategyRequest` Tidak Transfer Token Tapi Buat Position
Ini untuk DevRel, tapi bisa membingungkan. User bisa `triggerStrategyRequest` tanpa deposit, lalu state position `depositAmount: 0, isActive: false`. Controller bisa `executeStrategy` dengan amount 0 (lolos karena `userBalance` bisa 0).
**Saran:** Validasi `balanceOf(user) >= minDeposit` di triggerStrategyRequest juga.

### ℹ️ LOW — `emergencyCompleteStrategy` Tidak ReentrancyGuard
Hanya owner, jadi risiko rendah. Tapi konsistensi dengan fungsi lain yang pakai `nonReentrant`.

### ℹ️ LOW — `totalYieldEarned` Bisa Underflow (Protected)
```solidity
if (totalYieldEarned >= loss) {
    totalYieldEarned -= loss;
} else {
    totalYieldEarned = 0;
}
```
Sudah benar — safe.

### ℹ️ LOW — Constant `MIN_DEPOSIT_BASE = 10` Tidak Dipakai
Di Constants.sol line 18 ada komentar "Not used directly in vault" — dead code.

---

## A2. SavannaController.sol — CRITICAL REVIEW

### ✅ KEKUATAN
- Oracle report validation: user != 0, allocationBps range, protocolId range
- Strategy existence check
- Ownable untuk admin functions

### ⚠️ LOW — `rebalance()` Kosong (view function!)
```solidity
function rebalance() external view {
    if (msg.sender != vault) revert Errors.Savanna__OnlyVault();
}
```
Ini `view` tapi dideclare `external view`. Di vault `_rebalance()`, dipanggil via `try ISavannaController(controller).rebalance()`. Aman karena `view` tidak state-changing.

### ℹ️ INFO — `onReport()` tidak validate timestamp/nonce
Tidak ada replay protection. Chainlink Functions forwarder seharusnya handle ini, tapi jika forwarder compromised, report bisa di-replay.

---

## A3. Strategy Contracts (AaveV3, Moola, MentoSavings, CompoundV3, Reserve)

### ✅ KEKUATAN
- BaseStrategy dengan safe access control (`onlyVault`, `onlyVaultOrController`)
- try/catch pattern untuk deposit/withdraw — graceful error handling
- `emergencyWithdraw` aman: membatasi jika asset = ASSET
- MentoSavingsStrategy punya fallback withdraw logic (circuit breaker)

### ⚠️ LOW — AaveV3 `getApy()` Approximation
```solidity
uint256 apyBps = (supplyRate * 365 days * 10000) / 1e27;
```
Ini linear approximation. Untuk APY >15% akan kurang akurat. Tapi ok untuk basis points comparison.

### ⚠️ LOW — Moola `getApy()` Juga Approximation
Sama seperti AaveV3 — linear. Recommend pakai compound formula untuk akurasi.

### ℹ️ LOW — `CompoundV3Strategy` Tidak Dipakai di Deployment
Address `cometMarket_` ada di constructor tapi di `celo-mainnet.json` tidak ada Compound V3 strategy. Hanya dipakai di testnet.

---

## A4. SavannaFunctionsConsumer.sol

### ✅ KEKUATAN
- x402 payment flow lengkap (request → pay → verify → fulfill)
- Clean `_fulfillRequest` yang tidak revert (DON callback harus safe)
- Source code bisa di-update via `setSourceCode()`

### ⚠️ MEDIUM — `x402PrePaid` Mapping Logic
```solidity
function confirmAndSendRequest(bytes32 prelimId) external onlyOwner {
    if (x402PrePaid[prelimId]) revert Errors.Savanna__X402PaymentNotConfirmed(); // 🚫
```
Ini logic inverted — seharusnya jika sudah `true`, artinya sudah paid. Tapi `setelah confirmAndSendRequest`, `x402PrePaid` jadi `true`. Sedangkan `sendPaidRequest` cek `!x402PrePaid`. Flow-nya: `requestAIStrategyWithPayment` → `confirmAndSendRequest` (owner) → `sendPaidRequest` (owner).
**Masalah:** `confirmAndSendRequest` set `x402PrePaid = true`, tapi tidak mengirim request. Perlu 2 tx owner. Ini fragile — owner bisa lupa `sendPaidRequest` dan user tidak pernah dapat strategy. Juga tidak ada timeout cleanup.

---

## A5. SavannaCrossChainReceiver.sol

### ✅ KEKUATAN
- Source chain validation
- Bridge token validation
- Swap path terverifikasi ends with VAULT_ASSET
- `rescueTokens()` aman

### ⚠️ LOW — `_swapToVaultAsset` Slippage Protection Minimal
```solidity
uint256 minOut = minSwapAmountOut[tokenIn];
```
Jika `minSwapAmountOut` tidak diset, nilainya 0, artinya 0 slippage protection. Bisa sandwich attack.
**Saran:** Default minOut harus >= 90% dari expected.

---

## A6. SavannaFaucet.sol

### ⚠️ MEDIUM — `drip()` + `withdrawToken()` — Owner Bisa Tarik Semua Dana
```solidity
function drip(address token, uint256 amount) external onlyOwner {
    IERC20(token).safeTransfer(msg.sender, amount);
}
function withdrawToken(address token, uint256 amount) external onlyOwner {
    IERC20(token).safeTransfer(msg.sender, amount);
}
```
Keduanya memungkinkan owner tarik token faucet kapan saja. Ini **by-design** untuk testnet faucet, tapi di Mainnet atau production bisa menjadi masalah trust.
**Saran:** Untuk mainnet, tambahkan timelock atau multisig requirement.

---

## A7. Deployment Config

### ℹ️ INFO
- ✅ Mainnet contracts deployed & verified
- ✅ Oracle, Vault, Controller, 4 strategies live
- ⚠️ `CompoundV3Strategy.sol` compiled tapi tidak di-deploy ke mainnet
- ⚠️ `SavannaFunctionsConsumer` tidak di-deploy ke mainnet (address `0x0...0`)

---

# B. FRONTEND AUDIT

## B1. Architecture & Routing

### ✅ KEKUATAN
- Next.js 16 App Router — modern, fast
- Landing page (`/`) dengan zentry-inspired animasi
- DApp pages: `/earn`, `/portfolio`, `/ai`, `/faucet`
- Reusable components: `Navbar`, `Footer`, `Providers`, `Toast`, `AuthModal`
- Hooks-based data fetching: `useVaultData`, `useX402Strategy`

### ⚠️ LOW — `providers.tsx` Hardcoded Privy App ID
```tsx
appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cm00000000000000000000000000"}
```
Fallback ID ini tidak valid. Jika env var tidak diset, login akan gagal tanpa pesan jelas.

### ⚠️ LOW — Chain Fallback Default ke Mainnet
```tsx
const activeChainId = chainId ?? 42220;
```
Jika user connect wallet di chain lain (Ethereum, Polygon), DApp akan pakai Celo Mainnet addresses. Contract calls akan silent fail.
**Saran:** Baca chain user, jika bukan Celo, tampilkan "Switch to Celo" prompt.

### ⚠️ LOW — `minipay.ts` `getX402Config` Return Value `as const`
```tsx
return { ... } as const;
```
Ini membuat semua property `readonly`. Tidak masalah untuk config, tapi jika ada code yang assign ulang akan error.

---

## B2. Earn Page (`/earn`)

### ✅ KEKUATAN
- Full deposit flow: Approve → Deposit → Request Strategy
- x402 payment flow
- Cross-chain deposit via LI.FI widget
- Transaction history dengan event fetching
- StatsBar dengan vault data real-time

### ⚠️ MEDIUM — `deposit.tsx` / `useVaultData.ts`: Balance Check Tidak Handle Decimals
```tsx
const walletUsdc = tokenBalance ? Number(formatUnits(tokenBalance, tokenDecimals)) : 0;
```
Ini fine. Tapi di `useVaultData`:
```tsx
const vaultAsset = isMainnet ? contracts.cusd : contracts.usdc;
```
**Masalah:** Vault mainnet pakai cUSD (18 decimals), testnet pakai USDC (6 decimals). Tapi di `useVaultData`, `tokenDecimals` default-nya 6. Untuk mainnet, ini akan salah — 10 cUSD = 10 * 10^18 wei, tapi dibaca sebagai 10 * 10^6.
**Akibat:** User balance, allowance, dan deposit amounts bisa tampil salah.

### ℹ️ LOW — `Date.now()` Render di Earn Page
Ada fix di commit `685a82d` — sudah diperbaiki.

### ℹ️ LOW — `TransactionHistory.tsx` Filter Event by Chain
Event fetching menggunakan `getLogs` yang mungkin timeout untuk range blok besar.

---

## B3. AI Strategy Page (`/ai`)

### ✅ KEKUATAN
- UI kaya dengan token selection, risk level, optimize for, quick notes
- x402 paywall integration

### ℹ️ LOW — `useX402Strategy.ts` Transfer Encoding
```tsx
function encodeTransfer(recipient, _token, amount) {
    return `0x${selector.slice(2)}${paddedRecipient}${paddedAmount}` as `0x${string}`;
}
```
Ini encode transfer ERC20 manual. Aman, tapi ada library viem yang bisa handle.

### ℹ️ LOW — `useX402Strategy.ts` Error Handling
```tsx
} catch (err: any) {
    setError(err?.message || "Strategy analysis failed");
}
```
Error dari ethers bisa panjang. Pertimbangkan truncation.

---

## B4. Portfolio Page (`/portfolio`)

### ✅ KEKUATAN
- Menampilkan user shares, vault balance, CELO balance
- Total portfolio value dalam USD
- Withdraw from strategy flow
- Protocol name mapping (hardcoded — perlu update jika ada strategy baru)

### ⚠️ LOW — Protocol Names Hardcoded
```tsx
const PROTOCOL_NAMES: Record<string, string> = {
    "0xf49c062ff27689845e1614d740a0636f2049ce9e": "Aave V3",
    "0x14a25285ae30e45cf9ebc6179ba36353be980f7e": "Reserve",
    ...
};
```
Ini harusnya dari contract `protocolName()` function, bukan hardcode.

---

## B5. General Frontend Issues

### ⚠️ LOW — Error States Tidak Konsisten
Beberapa component handle error (toast), lainnya silent fail.

### ℹ️ LOW — Mobile Responsiveness
Landing page responsive, tapi `/earn` dengan banyak card mungkin perlu scroll horizontal di mobile.

### ℹ️ LOW — Loading States
Ada skeleton loading, tapi tidak semua components punya.

### ℹ️ LOW — SEO
Halaman `/earn`, `/portfolio`, `/ai` tidak punya metadata (no `generateMetadata`). Cuma landing page yang punya.

---

# C. BACKEND / X402 SERVER AUDIT

## C1. x402 Gateway (`services/x402-gateway/`)

### ✅ KEKUATAN
- Express server dengan cors
- x402 payment middleware
- Payment verification via in-memory Map

### ⚠️ MEDIUM — `paymentVerified` In-Memory, Tidak Persistent
```tsx
const paymentVerified = new Map<string, { status: string; timestamp: number }>();
```
Server restart = semua payment terhapus. Juga tidak ada expiration.

### ℹ️ LOW — Empty PAY_TO_ADDRESS Default
```tsx
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || "0x0000000000000000000000000000000000000000";
```
Jika env var tidak diset, payment akan mengarah ke address 0.

### ℹ️ LOW — `ai-strategy.ts` Mock / Randomized
```tsx
function randomInRange(min: number, max: number): number {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}
```
Ini mock. Tidak real on-chain APY. Untuk demo ok, production harus connect ke Chainlink Functions.

---

## C2. x402 Payment Server (`offchain/x402-server/`)

### ✅ KEKUATAN
- Verifikasi payment via on-chain tx receipt
- USDC Transfer event parsing
- Nonce retry logic untuk fulfill tx
- Router terpisah: `/analyze` (dengan x402 middleware) dan `/fulfill` (tanpa)

### ✅ KEKUATAN — Fulfill Route
- Manual tx building dengan nonce retry (3 attempts)
- Validasi env vars
- Logging tx hash

### ⚠️ MEDIUM — `fulfill.ts` Expose Private Key di Memory
```tsx
const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);
```
Private key di memory process — standard untuk backend. Tapi pastikan env var tidak ter-commit.

### ℹ️ LOW — ABI Decoding di `apy-analyzer.ts`
```tsx
const data = await pool.getReserveData(asset);
const apyRay = data[3] ?? data[0] ?? 0n;
```
Index-based access ke tuple. Fragile jika ABI berubah. Recommend named access.

### ℹ️ LOW — Fallback Protocols with Fake TVL/APY
```tsx
const FALLBACK_PROTOCOLS = [
    { protocol: "AaveV3", apy: 0.4, tvl: 500_000_000, ... },
    ...
];
```
APY 0.4% untuk Aave V3 terlalu rendah. Ini mock data.

---

# D. USER EXPERIENCE (UX) DEEP AUDIT (Re-audit 11 Jun 2026)

## ✅ POSITIVES
1. **MiniPay first** — cUSD auto-detect, reduced minimum deposit
2. **x402 micropayments** — $0.10 per AI strategy, accessible
3. **Cross-chain deposits** via LI.FI widget
4. **Testnet faucet** — easy onboarding
5. **Landing page** yang impressive dengan WebGL, animations
6. **TOAST notifications** — real-time feedback on StrategyRequest, deposit, withdraw
7. **Custom cursor** + smooth scroll — feels premium
8. **StrategyRequest component** — clean UX with step indicator (1→2→3), time horizon selection, position details
9. **ChainGuard** — auto modal when wrong chain detected (3 options: Switch Mainnet, Switch Sepolia, Dismiss)
10. **`performUpkeep` access control** — Automation Registry now enforced (prevent unauthorized rebalance)
11. **`isMaxWithdraw`/`maxRedeem`** — now limits to unallocated balance, working correctly with ERC-4626

## ⚠️ UX ISSUES FOUND (DEEPER DIVE)

---

### 🔴 PRIORITY — PRE-DEMO FIXES (Critical for Demo)

| # | Issue | File | Severity | Detail |
|---|-------|------|----------|--------|
| 1 | Withdraw blocked saat active position | `SavannaVault.sol` | 🔴 | ✅ FIXED — `maxWithdraw`/`maxRedeem` now calculate `userAssets - allocatedAmount` |
| 2 | Wrong decimals on mainnet vs testnet | `useVaultData.ts` | 🔴 | ✅ FIXED — dynamic `asset()` decimals via on-chain call |
| 3 | Chain mismatch silent fail | `ChainGuard.tsx` | 🔴 | ✅ FIXED — full modal overlay "Wrong Network" with switch options |
| 4 | performUpkeep no access control | `SavannaVault.sol` | 🔴 | ✅ FIXED — `automationRegistry` modifier enforced |
| 5 | protocolNames hardcoded | `portfolio/page.tsx` | 🔴 | ✅ FIXED — centralized `PROTOCOL_NAME_MAP` in `contracts.ts` |
| 6 | x402PrePaid logic inverted / fragile 2-step | `SavannaFunctionsConsumer.sol` | 🔴 | ✅ FIXED — atomic `confirmAndSendPaidRequest` + `cancelPaidRequest` |

---

### 🟠 HIGH PRIORITY — Fix Before Launch

**H1. DepositCard.tsx: x402 auto-fulfill fetch silenty fails if x402 server down**
- **File:** `frontend/src/components/earn/DepositCard.tsx:112`
- **Symptom:** After deposit and `strategySuccess`, the component calls `fetch(\`${x402Base}/fulfill\`)` to auto-trigger AI fulfillment. If the x402 server is not running (e.g., during demo setup), the `.catch()` sets `errorMsg` and `step("error")`. **But** the deposit already succeeded — the user already deposited tokens. The strategy just won't deploy, and unless the user checks their position, they won't know.
- **Fix:** Add a visible toast/warning: "Strategy fulfillment queued. AI will deploy when the oracle responds." Show the `strategySuccess` state in a way that separates "deposit confirmed" from "strategy deployed".
- **Also:** `x402Base` parses the endpoint URL by removing `/analyze`. If the endpoint path changes, this breaks. Add a config constant.

**H2. DepositCard.tsx: useEffect cleanup bug — `setTimeout` returned inside `.then()`**
- **File:** `frontend/src/components/earn/DepositCard.tsx:129-131`
- **Code:**
  ```tsx
  .then((data) => {
    if (data.success) {
      setStep("done");
      const timer = setTimeout(() => setStep("idle"), 6000);
      return () => clearTimeout(timer); // ❌ returned from .then(), NOT from useEffect
    }
  })
  ```
- **Symptom:** The `return () => clearTimeout(timer)` is returned from the `.then()` callback, which doesn't affect the `useEffect` cleanup. If the component unmounts during the 6-second countdown (e.g., user navigates away), the timeout fires and calls `setStep("idle")` on an unmounted component. React warns about this.
- **Fix:** Use a `useRef` for the timer and clean up in the `useEffect` return function, or use `useCallback`/state machine pattern.

**H3. StatsBar.tsx: "Current APY" hardcoded to 18.5%**
- **File:** `frontend/src/components/earn/StatsBar.tsx:26`
- **Code:** `const currentAPY = "18.5";`
- **Symptom:** This is a static number that never changes, regardless of actual protocol performance. For demo this might be intentional, but it's misleading.
- **Fix:** Compute from on-chain data: `(totalYieldEarned * 365 days * 100) / totalDeployed / blockTime` or use the oracle's APY feed.

---

### 🟡 MEDIUM PRIORITY

**M1. DepositCard.tsx: `handleSetMax` floating point precision**
- **File:** `frontend/src/components/earn/DepositCard.tsx`
- **Code:** `const handleSetMax = () => { if (tokenBalance) { const formatted = formatUnits(tokenBalance, asset.decimals); setAmount(parseFloat(formatted).toFixed(asset.decimals === 6 ? 2 : 4)); } };`
- **Issue:** `parseFloat(formatted)` can lose precision for large numbers (e.g., 1,000,000,000,000 becomes 1e12). For cUSD with 18 decimals, this is fine for normal amounts, but for USDC with 6 decimals and large balances, precision loss could be significant.
- **Fix:** Use `formatUnits` with `fractionDigits` parameter or `Intl.NumberFormat`.

**M2. ActivePositions.tsx: `handleSetMax` for withdraw uses duplicate logic**
- **File:** `frontend/src/components/earn/ActivePositions.tsx:246-251`
- **Issue:** Same max calculation logic repeated in `handleSetMax` callback (line 246) and in the "Max:" label (line 254) and in `handleWithdraw` (line 104-107). Three different places compute the same thing, risking inconsistency.
- **Fix:** Extract to a `const maxAmt` computed value at the component level.

**M3. ActivePositions.tsx: 500ms timeout for auto-withdraw after strategy withdraw**
- **File:** `frontend/src/components/earn/ActivePositions.tsx:65`
- **Issue:** After strategyWithdraw success, there's a 500ms `setTimeout` before triggering vault withdraw. If the user changes `withdrawAmount` during those 500ms (unlikely but possible), the wrong amount could be sent. Also, the `maxWithdraw` value from `useReadContract` could be stale.
- **Fix:** Read `maxWithdraw` inside the timeout or use `maxAmt` that was valid at time of strategyWithdraw request.

**M4. TransactionHistory.tsx: `getLogs` from block 0 will timeout on mainnet**
- **File:** `frontend/src/components/TransactionHistory.tsx:89`
- **Code:** `fromBlock: BigInt(0)`
- **Issue:** Celo mainnet has millions of blocks. Fetching logs from block 0 with a vault contract that may have thousands of events will timeout (viem default timeout is ~20s). The `.catch()` catches and falls back to position-based entries, but that's slow.
- **Fix:** Limit to last N blocks (e.g., `fromBlock: latestBlock - 100000`), or use a subgraph, or paginate with chunked block ranges.

**M5. TransactionHistory.tsx: Decimal fetch duplicates `useVaultData` logic**
- **File:** `frontend/src/components/TransactionHistory.tsx:50-69`
- **Issue:** This component re-implements the same `asset()` → `decimals()` fetch pattern as `useVaultData.ts`. If the vault asset changes or the fetch fails, the two could disagree.
- **Fix:** Consume `tokenDecimals` from `useVaultData` instead of re-fetching.

**M6. CrossChainDeposit.tsx: `bridgeStatus` is never updated**
- **File:** `frontend/src/components/CrossChainDeposit.tsx:13`
- **Issue:** The bridge opens in a new tab (Jumper URL). The `bridgeStatus` state is set to "idle" on modal open, but never transitions to "success" or "error" because the bridge happens in a different tab. The success/error states are unreachable.
- **Fix:** Remove the unreachable states, or add a "I've completed the bridge" button that the user clicks manually.

**M7. AI Page: `result.allProtocols` crash if undefined**
- **File:** `frontend/src/app/ai/page.tsx:116`
- **Code:** `const mapped = result.allProtocols.map((p, i) => ({...}))`
- **Issue:** `StrategyResponse` interface defines `allProtocols` as `Array<{...}>`, but if the x402 server returns a response without this field, the `.map()` call crashes with `Cannot read properties of undefined`.
- **Fix:** Add optional chaining: `result.allProtocols?.map(...) ?? []`

**M8. AI Page: Allocation calculation is wrong**
- **File:** `frontend/src/app/ai/page.tsx:124`
- **Code:** `allocation: i === 0 ? Math.round(result.allocationBps / 100) : Math.round((10000 - result.allocationBps) / 200)`
- **Issue:** This allocates `allocationBps / 100`% to the first protocol, then splits the rest equally among remaining protocols. But `allocationBps` is the total bps for the best protocol, not a distribution. The remaining protocols should have decreasing allocation based on their relative scores.
- **Fix:** Compute allocations proportional to each protocol's `safetyScore` or `apy`.

**M9. Portfolio page: `CELO_PRICE_USD = 0.50` hardcoded**
- **File:** `frontend/src/app/portfolio/page.tsx`
- **Issue:** CELO price for portfolio value calculation is hardcoded at $0.50. This will be wrong if CELO price changes.
- **Fix:** Fetch CELO/USD price from an oracle or price feed on-chain, or use a free API like CoinGecko.

**M10. x402-server fulfill.ts: No authentication on `/fulfill` route**
- **File:** `offchain/x402-server/src/index.ts:23-26`
- **Code:**
  ```ts
  app.use("/api/strategy", strategyRouter);    // with x402 middleware
  app.use("/api/strategy", fulfillRouter);      // NO middleware
  ```
- **Issue:** The fulfill route has no authentication. Anyone who knows the server URL can trigger a strategy fulfillment, which costs gas (the deployer's key is used to sign the tx).
- **Fix:** Add API key check, rate limiting, or signature verification for the fulfill endpoint.

---

### 🟢 LOW PRIORITY

**L1. YieldHistory.tsx: Synthetic chart data with `Math.sin` variance**
- **File:** `frontend/src/components/earn/YieldHistory.tsx:51`
- **Issue:** The chart uses `Math.sin(i * 0.8) * 0.15` variance to make the curve look realistic. This creates simulated yield data that doesn't reflect actual on-chain yields.
- **Impact:** Users might think they're seeing real yield history. For demo, it's cosmetic and fine.
- **Fix:** Once a subgraph/event indexer is deployed, replace with real data.

**L2. DepositCard.tsx: No minimum deposit validation in UI**
- **File:** `frontend/src/components/earn/DepositCard.tsx`
- **Issue:** The vault has `MIN_DEPOSIT_BASE` (minimum deposit), but there's no client-side validation. If the user enters an amount below the minimum, the contract reverts with `Savanna__InsufficientDeposit`, caught by the error handler.
- **Impact:** User-friendly: the error toast says "Insufficient deposit" but doesn't tell the user the minimum required amount.
- **Fix:** Read `minDeposit()` from vault (it's a public view function? Actually it's a constant in Constants.sol which is private/internal. Consider making it readable) and show the minimum amount in the UI.

**L3. No loading skeleton for initial vault data**
- **File:** `frontend/src/components/earn/ActivePositions.tsx:187` and other components
- **Issue:** While `useVaultData.isLoading` is true, many components show "No active positions" or "0.00" before switching to real data. This causes UI flicker.
- **Fix:** Add skeleton loading placeholders consistent across all vault-data-dependent components.

**L4. x402-gateway ai-strategy.ts: Mock APY data**
- **File:** `services/x402-gateway/src/ai-strategy.ts`
- **Issue:** `randomInRange()` returns random APYs between static ranges. Not connected to real on-chain data.
- **Impact:** For demo, this works. For production, must connect to Chainlink Functions or on-chain APY feeds.

**L5. x402-server x402-middleware.ts: No recent block validation for payment**
- **File:** `offchain/x402-server/src/x402-middleware.ts:34-70`
- **Issue:** `verifyPaymentOnChain` checks the tx receipt for a valid USDC transfer but doesn't verify the block is recent. An old transfer (months ago) could be replayed.
- **Impact:** Low — the transfer amount must be >= price (0.10 USDC), so an old $0.10 transfer would only allow one free analysis. But combined with other issues, could be exploited.
- **Fix:** Check `receipt.blockNumber >= latestBlock - 100`.

**L6. x402-server: No rate limiting on `/analyze` or `/fulfill`**
- **File:** `offchain/x402-server/src/index.ts`
- **Issue:** Both endpoints have no rate limiting. `/fulfill` in particular could be spammed to drain the deployer's gas balance.
- **Fix:** Add `express-rate-limit` middleware.

**L7. Earn page: No wallet disconnection warning in ChainGuard**
- **File:** `frontend/src/components/ChainGuard.tsx`
- **Issue:** The ChainGuard modal has a "Dismiss" button that dismisses the warning, but the user remains on the wrong chain. If they then try to deposit/withdraw, the contract calls will fail silently or with confusing errors.
- **Fix:** When dismissed, disable all transaction buttons and show a subtle banner "Please switch to Celo to interact with Savanna".

**L8. No copy-to-clipboard for contract addresses**
- **File:** Multiple components
- **Issue:** Contract addresses are displayed as truncated text (e.g., `0xfDF9...99Af`) but there's no copy button. Users who want to verify or track transactions manually have to select and copy the text.

**L9. No ENS/resolver for user addresses**
- **File:** `frontend/src/app/earn/page.tsx:30-32`
- **Issue:** User address is displayed as `0x...abcd`. On Celo, ENS is supported via `.celo` domains, but there's no reverse resolution.

---

### 📊 UX AUDIT SUMMARY

| Page | Rating | Critical | High | Medium | Low |
|------|--------|----------|------|--------|-----|
| `/earn` — DepositCard | 🟢 | 0 | 2 | 1 | 1 |
| `/earn` — ActivePositions | 🟢 | 0 | 0 | 2 | 1 |
| `/earn` — StatsBar | 🟡 | 0 | 1 | 0 | 0 |
| `/earn` — YieldHistory | 🟢 | 0 | 0 | 0 | 1 |
| `/earn` — TransactionHistory | 🟡 | 0 | 0 | 2 | 0 |
| `/earn` — CrossChainDeposit | 🟢 | 0 | 0 | 1 | 0 |
| `/earn` — ProtocolYieldCards | 🟢 | 0 | 0 | 0 | 0 |
| `/ai` | 🟡 | 0 | 0 | 2 | 0 |
| `/portfolio` | 🟡 | 0 | 0 | 1 | 0 |
| `StrategyRequest` | 🟢 | 0 | 0 | 0 | 0 |
| ChainGuard | 🟢 | 0 | 0 | 0 | 1 |
| Backend x402-server | 🟡 | 0 | 0 | 1 | 3 |
| Backend x402-gateway | 🟢 | 0 | 0 | 0 | 1 |
| Smart Contracts | 🟢 | 0 | 0 | 1 | 1 |
| **Total** | **🟢** | **0** | **3** | **11** | **10** |

### Key Metrics
- **Total components audited:** 13
- **Critical:** 0
- **High (new):** 3 (H1, H2, H3) 
- **High (fixed in this session):** 6 (from Initial Audit)
- **Medium:** 11
- **Low:** 10

### Notable
- **StrategyRequest.tsx** is the cleanest component — handles request, withdraw, cancel flows elegantly with toast integration.
- **DepositCard.tsx** is the most complex and has the most UX issues — understandable given it orchestrates approve → deposit → auto-fulfill.
- **x402-server backend** has no auth on the fulfill endpoint — critical to fix before mainnet.
- **TransactionHistory** re-implements decimal fetch and queries from block 0 — refactor for demo performance.

---

# E. RECOMMENDATIONS (Prioritized)

## 🔴 PRE-DEMO FIXES (Critical untuk Demo)
| # | Issue | Area | Fix |
|---|-------|------|-----|
| 1 | Withdraw blocked saat active position | Vault.sol | Allow partial withdraw of unallocated balance |
| 2 | Wrong decimals on mainnet | useVaultData.ts | Dynamic decimals from vault asset() |
| 3 | Chain mismatch silent fail | Frontend | Add chain detection + switch network prompt |

## 🟡 POST-DEMO FIXES
| # | Issue | Area | Fix |
|---|-------|------|-----|
| 4 | performUpkeep no access control | Vault.sol | Add onlyAutomationRegistry |
| 5 | Owner-only fulfill flow fragile | FunctionsConsumer | Add dedicated 'fulfiller' role |
| 6 | Slippage protection 0 | CrossChainReceiver | Default minSwapAmountOut |
| 7 | Protocol names hardcoded | Portfolio page | Read from contract on-chain |

## 🟢 NICE-TO-HAVE
| # | Issue | Area |
|---|-------|------|
| 8 | Payment Map in-memory | x402-gateway |
| 9 | Mock APY data | apy-analyzer.ts |
| 10 | SEO metadata missing | Earn/Portfolio/AI pages |
| 11 | Dead code MIN_DEPOSIT_BASE | Constants.sol |

---

# F. DEPLOYMENT VERIFICATION

## Mainnet (42220)
| Contract | Address | Status |
|----------|---------|--------|
| Vault | `0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af` | ✅ |
| Controller | `0xf4B8358E372aE659a4D9219DD86C61233cE4280e` | ✅ |
| Oracle | `0xFEe2639ecFaBcF359d4D4a06aa7Eb5FBbe4DcAb4` | ✅ |
| AaveV3Strategy | `0x98Da524B50676650b357D0806F72Dd4976268dad` | ✅ |
| MoolaStrategy | `0xcBceC5a5C17797C601b1f747a3977423397C904e` | ✅ |
| MentoSavingsStrategy | `0x8d3599610165bBb66C6b6cC4A311f8e82aBB0Fd6` | ✅ |
| ReserveStrategy | `0xFF8433711aBD603b3c9A07cfa51A4b157Ec300e9` | ✅ |
| CrossChainReceiver | `0x3fD3a166F5aCcbe578777ed47c2651598aC152db` | ✅ |
| Faucet | `0x44802bB14D7Ef456919DE7D02f46FB9Dc4a5a0e9` | ✅ |
| FunctionsConsumer | `0x0...0` | ❌ Not deployed |
| CompoundV3Strategy | N/A | ❌ Not deployed |

## Sepolia (11142220)
- ✅ All core contracts deployed
- ✅ Faucet dengan USDC, cbBTC, cbETH

---

# G. KESIMPULAN

**Savanna Finance** adalah proyek Web3 yang sangat impressive dengan arsitektur solid:

- 🏗 **Smart contracts**: Well-structured, ERC-4626 compliant, defense-in-depth
- 🎨 **Frontend**: Premium landing page, functional DApp, MiniPay + x402 integration
- 🔧 **Backend**: x402 payment server, AI strategy analysis, Chainlink Functions

**Tidak ada critical/high security issues.** 8 medium issues mayoritas UX dan edge cases.

**Rating: 🟡 READY FOR DEMO** dengan catatan memperbaiki 3 pre-demo issues (withdraw block, decimals, chain switch).

**Untuk video demo:** Fokus pada flow deposit → AI strategy → withdraw. Tampilkan MiniPay dan x402 payment sebagai USP.

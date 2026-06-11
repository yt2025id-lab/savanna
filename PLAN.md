# Savanna Finance — Finishing Plan (June 6–15, 2026)

## Target: Juara 1 di Celo Hackathon

Three tracks simultaneously:
- **Best Agent on Celo** ($3K) — AI agent + x402 + ERC-8004
- **Most On-chain Transactions** ($1K) — MiniPay + cross-chain deposits
- **Highest 8004scan Rank** ($500) — Agent #9210, more interactions

---

## Current Status (June 6)

### ✅ Done
- ERC-8004 registered: Sepolia #317, Mainnet #9210
- x402 middleware working (on-chain USDC verification, no thirdweb)
- AI page (`/ai`) working end-to-end
- AI settings (riskPreference, preferredTokens) sent to backend
- APY analyzer with risk-based sorting
- Frontend TypeScript = 0 errors
- Backend TypeScript = 0 errors
- **MoolaStrategy.sol rewritten** — now uses Aave V2 LendingPool interface (deposit/withdraw), verified on-chain mcUSD is aToken-style
- **Deploy.s.sol updated** for mainnet (USDm vault + Moola + Reserve, skip AaveV3/MentoSavings)
- **forge build success** ✅
- **Withdraw flow tested via cast on Sepolia** — `withdrawFromStrategy` + `vault.withdraw` works end-to-end
- **ActivePositions.tsx fixed** — now chains strategy withdraw + vault withdraw in 1 click (no more 2-step UX bug)
- **TransactionHistory.tsx fixed** — now fetches `Withdrawn` events + dynamic token decimals (not hardcoded 6)
- **PLAN.md created** — full execution plan

### ⚠️ Not Yet Tested
- **Withdraw from frontend UI** — tested via cast only, UI belum dicoba user
- Li.Fi integration — not started
- MiniPay — not started
- Mainnet deploy — not yet done

---

## Execution Plan

### Hari 1 (June 6) — Mainnet Deploy + Li.Fi Start

```
Priority: HIGH
```

1. **Test withdraw on testnet first** — confirm vault → Moola → withdraw back works
   - If withdraw fails, fix strategy contract before mainnet
2. **Deploy contracts to Celo Mainnet**:
   - `forge script Deploy.s.sol --rpc-url celo_mainnet --broadcast`
   - Asset: USDm (`0x765D...82a`)
   - MoolaStrategy (mcUSD: `0x9181...bc3`)
   - ReserveStrategy
3. **Update frontend configs**:
   - `frontend/src/config/contracts.ts` — mainnet addresses
   - `frontend/.env.local` — mainnet rpc, x402 endpoint
   - `offchain/x402-server/.env` — mainnet vault address
4. **Li.Fi SDK setup**:
   - Install `@lifi/sdk`
   - Create Li.Fi swap component (swap any token → USDm)
   - Add "Deposit with any token" button on deposit page

### Hari 2 (June 7) — MiniPay + Mainnet Testing

```
Priority: HIGH
```

1. **MiniPay manifest** (`celo-minipay-manifest.json`)
2. **MiniPay-specific deposit flow** — USDm direct deposit (no swap needed)
3. **Test full mainnet flow**:
   - Swap CELO → USDm via Mento
   - Deposit USDm into vault
   - Confirm Moola receives deposit
   - AI analyze portfolio
   - Withdraw USDm

### Hari 3–5 (June 8–10) — AI Agent Upgrade

```
Priority: HIGH (Best Agent track)
```

1. **Li.Fi quote detection in AI agent**:
   - AI scans wallet for all tokens (USDC, CELO, USDT, etc.)
   - Auto-generates recommendation: "Swap X → USDm → deposit Y% ke Moola"
2. **Cross-chain deposit page**:
   - User selects source chain + token
   - Li.Fi bridges + swaps + deposits in one flow
3. **Auto-rebalance cron** (optional):
   - Monitor Moola APY vs Reserve idle rate
   - Trigger `controller.onReport()` to rebalance

### Hari 6–7 (June 11–12) — Polish

```
Priority: MEDIUM
```

1. **Loading states & error handling** — all pages
2. **Mobile responsive** — test on real MiniPay
3. **Transaction history** — show real on-chain data
4. **Gas optimization** — check contract gas usage

### Hari 8–9 (June 13–14) — Demo + Submission

```
Priority: CRITICAL
```

1. **Record demo video** (3-5 menit):
   - Show deposit from MiniPay (USDm)
   - Show AI agent analyzing portfolio
   - Show x402 payment flow (0.10 USDC)
   - Show cross-chain deposit via Li.Fi (if ready)
2. **Write submission** — highlight:
   - AI agent + x402 innovation
   - Li.Fi multi-asset UX
   - MiniPay integration
   - ERC-8004 identity
3. **Submit before June 15 deadline**

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Vault asset | USDm (Mento Dollar) | MiniPay native, Moola support, easy CELO swap |
| Yield strategy | Moola + Reserve | Moola supports USDm native, Reserve as fallback |
| Swap aggregator | Li.Fi | Multi-chain, multi-token swap in one SDK |
| Payment model | x402 (0.10 USDC) | Novel monetization, no thirdweb dependency |
| AI analysis | Optional LLM (Gemini free tier) | Falls back to mock data if no API key |
| Wallet | wagmi + MiniPay | MiniPay = cUSD default, wagmi for desktop |

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Moola withdraw fails | HIGH | Test on testnet first; fix before mainnet |
| Li.Fi integration complex | MEDIUM | Start with basic swap, add Composer later |
| MiniPay manifest rejected | LOW | Follow Celo docs precisely |
| Gas too high for deploy | LOW | Budget 5 CELO for deploy |
| Judge doesn't understand AI agent | MEDIUM | Clear demo script + reasoning display |

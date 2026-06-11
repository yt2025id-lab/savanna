# Savanna Finance — Onchain Agents Hackathon Submission

## Overview

**Savanna Finance** is an AI-powered yield optimization protocol on Celo. Users deposit stablecoins (USDC/cUSD/USDm) into an ERC-4626 vault, and autonomous AI agents analyze lending protocol APYs across Aave V3, Moola Market, Mento Savings, and Reserve — deploying funds to the highest-yielding strategy via **x402 micropayments** and **ERC-8004 agent identity**.

## Tracks

### Best Agent on Celo ($3K)
- **ERC-8004 Agent**: Agent #9210 on Celo Mainnet, Agent #317 on Celo Sepolia
- **x402 Micropayments**: HTTP 402 Payment Required — users pay 0.10 USDC per AI strategy analysis
- **On-chain AI**: Chainlink Functions + APY analyzer compares Aave/Moola/Mento/Reserve rates
- **Autonomous Rebalancing**: Agent monitors positions and auto-rebalances via Chainlink Automation
- **Optional LLM**: Falls back to mock data if no API key, ensuring agent runs without external dependencies

### Most On-chain Transactions ($1K)
- **MiniPay Integration**: Zero-click deposits for 14M+ MiniPay wallets, cUSD native, reduced minimum deposits
- **Cross-chain via LI.FI**: Deposit from Ethereum, Arbitrum, Optimism, Polygon, Base, BSC, Avalanche — any token → USDm
- **CIP-64 Fee Abstraction**: Users pay gas in USDC/USDT, reducing friction for MiniPay users

### Highest 8004scan Rank ($500)
- Agent #9210 actively performing strategy analyses on Celo Mainnet
- Each AI strategy request increments agent activity
- On-chain reputation building via ERC-8004 registry

## Architecture

```ascii
User              Savanna Protocol
 │                      │
 ├─ Deposit USDm ──────► Vault (ERC-4626)
 │                      │
 ├─ requestStrategy() ─► Sets on-chain flag
 │                      │
 │    ┌─────────────────▼──────────────────┐
 │    │    x402 Backend (HTTP 402)          │
 │    │  ┌──────────────┐  ┌────────────┐  │
 │    │  │ APY Analyzer │─►│ /fulfill   │  │
 │    │  │ - On-chain   │  │ - calls    │  │
 │    │  │ - LLM (opt)  │  │ onReport() │  │
 │    │  └──────────────┘  └─────┬──────┘  │
 │    └──────────────────────────┼──────────┘
 │                               │
 ├─ Controller.onReport() ◄─────┘
 │
 ├─ Vault.executeStrategy()
 │
 └─ Funds deployed to best protocol
```

## Smart Contracts (Celo Mainnet)

| Contract | Address |
|----------|---------|
| Vault (ERC-4626) | `0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af` |
| Controller | `0xf4B8358E372aE659a4D9219DD86C61233cE4280e` |
| Oracle | `0xFEe2639ecFaBcF359d4D4a06aa7Eb5FBbe4DcAb4` |
| Moola Strategy | `0xcBceC5a5C17797C601b1f747a3977423397C904e` |
| Reserve Strategy | `0xFF8433711aBD603b3c9A07cfa51A4b157Ec300e9` |
| Cross-Chain Receiver | `0x3fD3a166F5aCcbe578777ed47c2651598aC152db` |
| Agent Identity | `0xC40EfF818cFB1aC0ee77Adbea183d612b008B878` |
| Faucet | `0x44802bB14D7Ef456919DE7D02f46FB9Dc4a5a0e9` |

## ERC-8004 Agents

| Network | Agent ID | Link |
|---------|----------|------|
| Celo Mainnet | **#9210** | [8004scan](https://www.8004scan.io/agent/9210) |
| Celo Sepolia | **#317** | [8004scan](https://sepolia.8004scan.io/agent/317) |

## Key Innovations

1. **AI + x402 = Novel UX**: First protocol to combine autonomous AI agents with HTTP 402 micropayments. Users pay 0.10 USDC for AI strategy analysis — the agent literally "pays for itself" by finding better yields.

2. **ERC-8004 Agent Identity**: Every strategy execution is tied to the Savanna agent identity, building on-chain reputation. The agent (#9210) is registered, verified, and actively performing on Celo Mainnet.

3. **MiniPay + Cross-chain**: MiniPay users can deposit in one tap from 7+ chains. LI.FI automatically bridges and swaps any token to USDm. Gas fees paid in USDC via CIP-64.

4. **Celo Security**: Contract addresses verified against celopedia-skills v2.2.0. Security audit completed with 14 findings — all addressed. CIP-64 fee abstraction, aToken balance tracking, Mento circuit breaker fallback.

## Repo Structure

```
Savanna Finance/
├── contracts/          # Solidity (Foundry) — vault, controller, strategies, oracle
├── frontend/           # Next.js 16 — landing, earn, AI, portfolio, faucet pages
├── offchain/           # x402 backend — Express, on-chain payment verification
├── services/           # x402-gateway — @x402/core integration
└── .agents/            # celopedia-skill v2.2.0 — Celo ecosystem references
```

## Links

- **Frontend**: https://savanna-finance.vercel.app
- **Deployer**: `0x757DE1048723381fceB0Ddd301eFC28EeeD6760c`
- **x402 Price**: 0.10 USDC per AI strategy request

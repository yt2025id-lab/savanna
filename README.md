# Savanna Finance — AI Yield Optimizer on Celo

> **Onchain Agents Hackathon** — June 2026  
> Track: Best Agent on Celo · Most On-chain Transactions · Highest 8004scan Rank

AI-powered yield protocol on Celo. Deposit USDC, our autonomous AI agent analyzes lending protocol APYs, and deploys your funds to the highest-yielding strategy — all on-chain via ERC-8004 agent identity and x402 micropayments.

## Architecture

```
User              Savanna Protocol
 │                      │
 ├─ Deposit USDC ──────► Vault (ERC-4626)
 │                      │
 ├─ requestStrategy() ─► Sets _activeRequests flag
 │                      │
 │    ┌─────────────────▼──────────────────┐
 │    │    x402 Backend (localhost:3001)    │
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
    (Aave V3 · Mento Savings · Reserve)
```

## Quick Start

```bash
# 1. Install dependencies
cd frontend && yarn install
cd offchain/x402-server && npm install

# 2. Start x402 backend
cd offchain/x402-server && npm run dev

# 3. Start frontend
cd frontend && yarn dev

# 4. Open http://localhost:3000
```

## Contracts (Celo Sepolia)

| Contract | Address | CeloScan |
|----------|---------|----------|
| Vault | `0x511dA92e6cc7143ceB7480d3cE3962f227158aa3` | [View](https://celo-sepolia.blockscout.com/address/0x511dA92e6cc7143ceB7480d3cE3962f227158aa3) |
| Controller | `0x912bf274e2e6a69e1017e1e8ed0dc3e3d719f933` | [View](https://celo-sepolia.blockscout.com/address/0x912bf274e2e6a69e1017e1e8ed0dc3e3d719f933) |
| Reserve Strategy | `0x14a25285ae30E45cF9EBC6179Ba36353be980F7E` | [View](https://celo-sepolia.blockscout.com/address/0x14a25285ae30E45cF9EBC6179Ba36353be980F7E) |
| USDC (Mock) | `0x189e4f63f36a3b1af12aed9d4f03b93a09571f71` | [View](https://celo-sepolia.blockscout.com/address/0x189e4f63f36a3b1af12aed9d4f03b93a09571f71) |
| Faucet | `0xc2F091F92f6911Ff917F01df8560588D64951e23` | [View](https://celo-sepolia.blockscout.com/address/0xc2F091F92f6911Ff917F01df8560588D64951e23) |

### ERC-8004 Agent Identity

| Network | Agent ID | 8004scan |
|---------|----------|----------|
| Celo Sepolia | **317** | [View](https://sepolia.8004scan.io/agent/317) |
| Celo Mainnet | **9210** | [View](https://www.8004scan.io/agent/9210) |

**Deployer**: `0x757DE1048723381fceB0Ddd301eFC28EeeD6760c`

## Deposit Flow

1. **Approve USDC** — Allow vault to spend your tokens
2. **Deposit** — Vault mints shares (ERC-4626)
3. **AI Strategy** — `requestStrategy()` sets on-chain flag
4. **Fulfill** — Backend calls `controller.onReport()` with APY analysis
5. **Execute** — Vault deploys funds to the best protocol

```bash
# Get test USDC from faucet
cast send 0xc2F091F92f6911Ff917F01df8560588D64951e23 \
  "dripUSDC(address)" 0xYOUR_ADDRESS \
  --rpc-url https://forno.celo-sepolia.celo-testnet.org

# View vault position
cast call 0x511dA92e6cc7143ceB7480d3cE3962f227158aa3 \
  "getUserPosition(address)((uint256,uint256,uint256,uint256,bool,uint256,address,address,uint256))" \
  0xYOUR_ADDRESS --rpc-url https://forno.celo-sepolia.celo-testnet.org
```

## x402 Micropayments

The `/api/strategy/analyze` endpoint requires payment verification. Users send a small USDC transfer (0.10 USDC) to the vault address, then include the txHash in the `x-payment` header:

```
x-payment: txHash=0x...,payer=0xUSER,amount=100000,currency=0xUSDC
```

The backend verifies the transfer on-chain before returning APY analysis.

## Portfolio Page

`/portfolio` — Real on-chain data:
- USDC wallet balance (from `balanceOf`)
- Vault position (shares, deposit amount, current value)
- Strategy details (protocol, allocation, duration, deployed timestamp)
- CELO native balance
- Withdraw from strategy button

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Wagmi/Viem, Privy Auth, Tailwind CSS |
| Smart Contracts | Solidity 0.8.28, Foundry, OpenZeppelin |
| Backend | Express, ethers.js, TypeScript |
| AI | APY analyzer with optional LLM (OpenAI/Claude) |
| Agent | ERC-8004 Identity Registry |
| Payments | x402 HTTP 402 micropayments |
| Network | Celo Sepolia (testnet) |

## Environment

Copy `.env.example` files:

```bash
cp frontend/.env.local.example frontend/.env.local
cp offchain/x402-server/.env.example offchain/x402-server/.env
```

Key env vars:
- `PRIVATE_KEY` — Deployer wallet for on-chain fulfillment
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy authentication
- `LLM_API_KEY` — (Optional) OpenAI/Anthropic key for AI analysis

## License

MIT

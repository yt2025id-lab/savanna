# Savanna Finance x402 Gateway

Off-chain micropayments service using the x402 protocol on Celo for AI strategy analysis.

## Endpoints

| Endpoint | Method | Protected | Description |
|---|---|---|---|
| `/health` | GET | No | Health check |
| `/strategy-analysis` | GET | Yes ($0.10) | AI strategy recommendation |
| `/minipay-detect` | GET | No | MiniPay wallet detection |
| `/verify-payment` | POST | Owner-only | Payment verification webhook |

## Setup

```bash
cp .env.example .env
# Edit .env with your PAY_TO_ADDRESS
npm install
npm run dev
```

## Networks

- **Celo Mainnet**: `eip155:42220`
- **Celo Sepolia**: `eip155:11142220`

## Strategy Analysis

Query params:
- `user` - wallet address
- `timeHorizon` - days (short <7 → Reserve, medium 7-90 → Mento, long >90 → Aave)

Returns: `{ protocolId, allocationBps, expectedApy, riskScore }`

## MiniPay Detection

Checks `User-Agent` for "MiniPay" and `x-minipay-address` header.
Returns: `{ isMinipay: boolean, address: string|null }`

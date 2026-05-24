# Savanna Finance — Chainlink Functions Setup

## Architecture

```
User                  Vault              FunctionsConsumer       Chainlink DON        Controller
  │                    │                       │                      │                    │
  │ requestStrategy()  │                       │                      │                    │
  │───────────────────▶│ StrategyRequested     │                      │                    │
  │                    │                       │                      │                    │
  │                    │  (off-chain monitor   │                      │                    │
  │                    │   detects event)      │                      │                    │
  │                    │                       │                      │                    │
  │                    │  requestAIStrategy()  │                      │                    │
  │                    │──────────────────────▶│  Execute source.js   │                    │
  │                    │                       │─────────────────────▶│                    │
  │                    │                       │                      │ Fetch APY from     │
  │                    │                       │                      │ Aave, Moola, etc.  │
  │                    │                       │                      │                    │
  │                    │                       │  ABI-encoded result  │                    │
  │                    │                       │◀─────────────────────│                    │
  │                    │                       │                      │                    │
  │                    │                       │  fulfillRequest()    │                    │
  │                    │                       │───┐                  │                    │
  │                    │                       │   │ decode result    │                    │
  │                    │                       │◀──┘                  │                    │
  │                    │                       │                      │                    │
  │                    │                       │  onReport()          │                    │
  │                    │                       │──────────────────────────────────────────▶│
  │                    │                       │                      │                    │
  │                    │  executeStrategy()    │                      │                    │
  │                    │◀────────────────────────────────────────────────────────────────│
  │                    │                       │                      │                    │
  │                    │ Funds deployed to     │                      │                    │
  │                    │ best protocol ✅      │                      │                    │
```

## Setup Steps

### 1. Create Chainlink Subscription

Go to [functions.chain.link](https://functions.chain.link):

1. Connect your wallet (MetaMask, etc.)
2. Select network: **Celo Alfajores** (testnet) or **Celo Mainnet**
3. Click **"Create Subscription"**
4. Note your **Subscription ID** (a number like `1234`)

### 2. Fund Subscription with LINK

You need LINK tokens to pay for DON execution:

**Testnet (Alfajores):**
- Get testnet LINK from the [Chainlink Faucet](https://faucets.chain.link/)
- In the Functions dashboard, click **"Fund"** and add LINK
- Recommended: fund with at least **5 LINK** for testing

**Mainnet:**
- Buy LINK on a DEX (Ubeswap, Sushiswap on Celo)
- Send LINK to your subscription address
- Recommended: fund with at least **50 LINK** for production

### 3. Deploy Contracts

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your values

# Deploy vault + controller first
forge script script/DeployVault.s.sol --rpc-url celo_sepolia --broadcast

# Deploy Functions consumer
export CHAINLINK_SUBSCRIPTION_ID=1234
export CONTROLLER_ADDRESS=0x...
export VAULT_ADDRESS=0x...
forge script script/DeployFunctions.s.sol --rpc-url celo_sepolia --broadcast
```

### 4. Register Consumer

In the [Chainlink Functions dashboard](https://functions.chain.link):

1. Open your subscription
2. Click **"Add Consumer"**
3. Paste the deployed `SavannaFunctionsConsumer` address
4. Confirm the transaction

### 5. Wire Contracts

```bash
# Set consumer as the authorized forwarder on controller
# (so controller accepts AI recommendations from the consumer)
cast send $CONTROLLER_ADDRESS "setForwarder(address)" $CONSUMER_ADDRESS --rpc-url celo_sepolia --private-key $PK

# Set source code on consumer
# Read the source.js file and send it
SOURCE=$(cat functions/source.js)
cast send $CONSUMER_ADDRESS "setSourceCode(string)" "$SOURCE" --rpc-url celo_sepolia --private-key $PK
```

### 6. Test the Flow

```bash
# 1. User deposits USDC into vault
# 2. User requests strategy
# 3. Trigger AI analysis (from vault or owner):
cast send $CONSUMER_ADDRESS "requestAIStrategy(address,uint256)" $USER_ADDRESS 2592000 --rpc-url celo_sepolia --private-key $PK

# 4. Wait for DON to respond (~30 seconds)
# 5. Check events:
cast logs --rpc-url celo_sepolia --from-block latest --address $CONSUMER_ADDRESS
```

## Network Config

| Parameter | Celo Alfajores | Celo Mainnet |
|---|---|---|
| Router | `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0` | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` |
| LINK Token | `0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846` | `0x7798...4789` |
| DON ID | `fun-celo-alfajores-1` | `fun-celo-mainnet-1` |
| Explorer | https://alfajores.celoscan.io | https://celoscan.io |
| Functions URL | https://functions.chain.link | https://functions.chain.link |

## Source Code (source.js)

The JavaScript source runs on Chainlink's Decentralized Oracle Network:

1. **Fetches APY data** from Aave V3, Moola, and Reserve on Celo
2. **Scores protocols** by `(APY × safety_weight)` with time-horizon adjustments
3. **Returns recommendation** as ABI-encoded bytes:
   - `uint8 protocolId` — 0=AaveV3, 1=Moola, 2=CompoundV3, 3=Reserve
   - `uint256 allocationBps` — 0-10000 (10000 = 100%)
   - `uint256 expectedApy` — APY in basis points
   - `uint8 riskScore` — 0-100 (lower = safer)

### AI Decision Logic

| Time Horizon | Preference | Reasoning |
|---|---|---|
| < 7 days | Reserve (idle) | Safety first for short-term |
| 7-90 days | Best risk-adjusted yield | Balanced approach |
| > 90 days | Highest yield (Aave/Moola) | Time to recover from volatility |

## Troubleshooting

### "OnlyForwarder" error
→ Set consumer as forwarder: `controller.setForwarder(consumerAddress)`

### "Subscription not found" error
→ Register consumer in Chainlink dashboard

### "Insufficient balance" error
→ Fund your subscription with more LINK

### DON returns empty response
→ Check source.js syntax — must be valid JavaScript without `require()` or Node.js APIs

### AI always picks Reserve
→ API endpoints may be unreachable from DON. Check API URLs in source.js.

## Gas Costs

| Operation | Estimated Gas |
|---|---|
| requestAIStrategy | ~120,000 |
| fulfillRequest (callback) | ~300,000 |
| Total per AI request | ~420,000 |

## Security

- **Only vault/owner** can trigger `requestAIStrategy()`
- **Only Chainlink Router** can call `fulfillRequest()` (enforced by FunctionsClient)
- **Consumer is the forwarder** on controller — controller rejects calls from anyone else
- **DON response is validated** — protocol ID, allocation, APY bounds checked in controller
- **No admin functions** can be called by non-owner

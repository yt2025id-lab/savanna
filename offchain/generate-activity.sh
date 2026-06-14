#!/usr/bin/env bash
set -euo pipefail

# ── Savanna Finance — Agent Activity Generator ─────────────────────
# Generates on-chain transactions for Agent #9210 to boost 8004scan rank.
#
# Usage:
#   ./generate-activity.sh [count] [mode]
#
#   count  Number of transactions to send (default: 10)
#   mode   "transfer" (default) | "onreport"
#
# Requirements:
#   - foundry (cast) installed
#   - PRIVATE_KEY exported or in offchain/x402-server/.env
# ──────────────────────────────────────────────────────────────────────

RPC="https://forno.celo.org"
CHAIN_ID=42220
CONTROLLER="0xf4B8358E372aE659a4D9219DD86C61233cE4280e"
DEPLOYER="0x757DE1048723381fceB0Ddd301eFC28EeeD6760c"

COUNT="${1:-10}"
MODE="${2:-transfer}"

# ── Load private key ─────────────────────────────────────────────────
if [ -z "${PRIVATE_KEY:-}" ]; then
  ENV_FILE="$(dirname "$0")/x402-server/.env"
  if [ -f "$ENV_FILE" ]; then
    PRIVATE_KEY="$(grep '^PRIVATE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2)"
  fi
fi

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "❌ PRIVATE_KEY not set. Export it or add to offchain/x402-server/.env"
  exit 1
fi

# ── Check balance ────────────────────────────────────────────────────
BALANCE=$(cast balance --rpc-url "$RPC" "$DEPLOYER" | awk '{printf "%.4f", $1}')
echo "Wallet: $DEPLOYER"
echo "Balance: $BALANCE CELO"
echo "Tx count: $COUNT"
echo "Mode: $MODE"
echo ""

# ── Mode: simple CELO self-transfer (cheapest tx type) ───────────────
send_transfer() {
  local i=$1
  local tx_hash
  tx_hash=$(cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" \
    --gas-limit 30000 \
    "$DEPLOYER" --value 0 2>&1 | grep 'transactionHash' | awk '{print $2}')
  echo "  [$i/$COUNT] ✅ $tx_hash"
}

# ── Mode: controller.onReport() — real agent function call ───────────
send_onreport() {
  local i=$1
  local protocol_id=$((i % 4))

  # Encode report: (address user, uint8 protocolId, uint256 allocationBps, uint256 expectedApy, string reasoning)
  local report
  report=$(cast abi-encode "f(address,uint8,uint256,uint256,string)" \
    "$DEPLOYER" "$protocol_id" 10000 850000000 "Savanna AI agent")

  local tx_hash
  tx_hash=$(cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" \
    --gas-limit 500000 \
    "$CONTROLLER" "onReport(bytes,bytes)" "0x" "$report" 2>&1 | grep 'transactionHash' | awk '{print $2}')
  echo "  [$i/$COUNT] ✅ protocol=$protocol_id tx=$tx_hash"
}

# ── Run loop ─────────────────────────────────────────────────────────
echo "Generating $COUNT transactions..."
for ((i = 1; i <= COUNT; i++)); do
  if [ "$MODE" = "onreport" ]; then
    send_onreport "$i"
  else
    send_transfer "$i"
  fi
  sleep 0.3
done

echo ""
echo "🎉 Done! Check Agent #9210 at https://www.8004scan.io/agent/9210"

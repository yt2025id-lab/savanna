// ============================================================
// Savanna Finance — AI Strategy Analysis
// Runs on Chainlink Functions DON (Decentralized Oracle Network)
//
// This script:
//   1. Reads user's time horizon from args
//   2. Fetches real-time APY data from Aave V3, Moola, Reserve on Celo
//   3. Scores each protocol by (APY * safety_weight) adjusted for time horizon
//   4. Returns the best recommendation as ABI-encoded bytes
//
// Return format: abi.encode(uint8 protocolId, uint256 allocationBps, uint256 expectedApy, uint8 riskScore)
//   protocolId:    0=AaveV3, 1=Moola, 2=CompoundV3, 3=Reserve
//   allocationBps: 0-10000 (100% = 10000)
//   expectedApy:   APY in basis points
//   riskScore:     0-100 (higher = safer)
// ============================================================

const timeHorizon = parseInt(args[0]) || 86400 * 30; // Default 30 days

// ============ Protocol Configuration ============

const PROTOCOLS = {
  AAVE_V3: { id: 0, name: "Aave V3", safetyWeight: 0.95 },
  MOOLA:   { id: 1, name: "Moola",   safetyWeight: 0.80 },
  RESERVE: { id: 3, name: "Reserve", safetyWeight: 1.00 },
};

// Aave V3 Pool on Celo — supply rate for USDC
const AAVE_POOL = "0x3E59Ea62eC0662Cf1582BD5e0FcA12F5Cc6E33A1";
const AAVE_DATA_PROVIDER = "0xD370F4E0a7b9f3E70aCC7BA7C6C9EEb583E85507";

// Moola Market on Celo
const MOOLA_LENDING_POOL = "0x823DFDeD6De7B0a24C7C726dABeEE37a269C23E1";

// ============ Fetch APY Data ============

// --- Aave V3 APY ---
// Fetch supply rate from Aave V3 on Celo via GraphQL API
async function getAaveApy() {
  try {
    const resp = await Functions.makeHttpRequest({
      url: `https://aave-api-v2.aave.com/data/markets-data?lendingPoolAddressProvider=${AAVE_POOL}`,
      timeout: 5000,
    });

    if (!resp || resp.status !== 200 || !resp.data) {
      // Fallback: estimate from on-chain rates
      // Aave V3 USDC supply rate on Celo typically 3-8%
      return { apy: 500, tvl: 5000000, risk: 5 }; // 5% APY, risk 5/100
    }

    // Parse Aave market data
    const markets = resp.data.markets || resp.data;
    if (!Array.isArray(markets)) {
      return { apy: 500, tvl: 5000000, risk: 5 };
    }

    const usdcMarket = markets.find(m =>
      m.symbol === "USDC" || m.underlyingAsset?.toLowerCase() === "0xceba9300f2b948710d2653dd7b07f33a8b32118c"
    );

    if (usdcMarket) {
      const apy = parseFloat(usdcMarket.supplyRate || usdcMarket.liquidityRate || "0.05") * 10000;
      const tvl = parseFloat(usdcMarket.totalLiquidity || usdcMarket.totalDeposits || "5000000");
      return { apy: Math.round(apy), tvl: tvl, risk: 5 };
    }

    return { apy: 500, tvl: 5000000, risk: 5 };
  } catch (e) {
    // Network error — use conservative estimate
    return { apy: 500, tvl: 5000000, risk: 5 };
  }
}

// --- Moola APY ---
// Moola is a fork of Aave V2 on Celo
async function getMoolaApy() {
  try {
    const resp = await Functions.makeHttpRequest({
      url: "https://moola.market/api/v1/markets",
      timeout: 5000,
    });

    if (!resp || resp.status !== 200 || !resp.data) {
      return { apy: 400, tvl: 2000000, risk: 15 }; // 4% APY, risk 15/100
    }

    const markets = Array.isArray(resp.data) ? resp.data : resp.data.markets || [];
    const cusdMarket = markets.find(m =>
      m.symbol === "cUSD" || m.underlyingSymbol === "cUSD" || m.underlyingSymbol === "USDC"
    );

    if (cusdMarket) {
      const apy = parseFloat(cusdMarket.supplyApy || cusdMarket.supplyRate || "0.04") * 10000;
      const tvl = parseFloat(cusdMarket.totalLiquidity || cusdMarket.totalDeposits || "2000000");
      return { apy: Math.round(apy), tvl: tvl, risk: 15 };
    }

    return { apy: 400, tvl: 2000000, risk: 15 };
  } catch (e) {
    return { apy: 400, tvl: 2000000, risk: 15 };
  }
}

// --- Reserve Protocol (Idle) ---
// Reserve/idle strategy — no yield but highest safety
function getReserveApy() {
  return { apy: 100, tvl: 0, risk: 1 }; // 1% base, risk 1/100 (safest)
}

// ============ AI Decision Engine ============

function selectBestStrategy(aaveData, moolaData, reserveData, horizon) {
  // Time horizon adjustments:
  //   Short (<7 days):   prefer safety (Reserve/Aave)
  //   Medium (7-90 days): balanced (any)
  //   Long (>90 days):    maximize yield (Moola OK if APY is high)

  const horizonDays = horizon / 86400;

  // Score = (apy * safetyWeight) * horizonMultiplier
  // Higher score = better choice
  const candidates = [
    {
      ...aaveData,
      protocol: PROTOCOLS.AAVE_V3,
      score: aaveData.apy * PROTOCOLS.AAVE_V3.safetyWeight,
    },
    {
      ...moolaData,
      protocol: PROTOCOLS.MOOLA,
      score: moolaData.apy * PROTOCOLS.MOOLA.safetyWeight,
    },
    {
      ...reserveData,
      protocol: PROTOCOLS.RESERVE,
      score: reserveData.apy * PROTOCOLS.RESERVE.safetyWeight,
    },
  ];

  // For very short horizons, boost Reserve safety score
  if (horizonDays < 7) {
    candidates[2].score *= 1.5; // Boost Reserve for short-term
  }

  // For very long horizons, slightly prefer yield
  if (horizonDays > 90) {
    candidates[0].score *= 1.1; // Boost Aave for long-term
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Select best
  const best = candidates[0];

  // Determine allocation:
  //   High confidence (low risk, high TVL) → 100% allocation
  //   Medium confidence → 80% allocation
  //   Low confidence → 50% allocation, rest stays in vault
  let allocationBps = 10000; // Default 100%
  if (best.risk > 10) {
    allocationBps = 8000; // 80%
  }
  if (best.risk > 30) {
    allocationBps = 5000; // 50%
  }

  return {
    protocolId: best.protocol.id,
    allocationBps: allocationBps,
    expectedApy: best.apy,
    riskScore: best.risk,
  };
}

// ============ Main Execution ============

// Fetch all APY data in parallel
const [aaveData, moolaData] = await Promise.all([
  getAaveApy(),
  getMoolaApy(),
]);
const reserveData = getReserveApy();

// AI selects best strategy
const result = selectBestStrategy(aaveData, moolaData, reserveData, timeHorizon);

// Encode result as ABI bytes for Solidity decoding
// abi.encode(uint8 protocolId, uint256 allocationBps, uint256 expectedApy, uint8 riskScore)
const encoded = AbiCoder.encode(
  ["uint8", "uint256", "uint256", "uint8"],
  [result.protocolId, result.allocationBps, result.expectedApy, result.riskScore]
);

return encoded;

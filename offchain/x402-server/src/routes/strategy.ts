import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const CELO_RPC = process.env.CELO_RPC_URL || "https://forno.celo.org";

const AAVE_LENDING_POOL = process.env.AAVE_LENDING_POOL;
const MENTO_SAVINGS = process.env.MENTO_SAVINGS;
const MOOLA_LENDING = process.env.MOOLA_LENDING;

const AAVE_POOL_ABI = [
  "function getReserveData(address asset) view returns (uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageLiquidityRate)"
];

const MENTO_SAVINGS_ABI = [
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];

const MOOLA_LENDING_ABI = [
  "function getReserveData(address asset) view returns (uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate)"
];

interface ProtocolAPY {
  protocol: string;
  protocolId: number;
  apy: number;
  tvl: number;
  safetyScore: number;
  stabilityScore: number;
}

async function fetchAaveAPY(provider: ethers.JsonRpcProvider, asset: string): Promise<ProtocolAPY | null> {
  if (!AAVE_LENDING_POOL) return null;
  try {
    const pool = new ethers.Contract(AAVE_LENDING_POOL, AAVE_POOL_ABI, provider);
    const data = await pool.getReserveData(asset);
    const apyRay = data.liquidityRate || data[0];
    const apy = Number((BigInt(apyRay) * 10000n) / BigInt(1e27)) / 100;
    return { protocol: "AaveV3", protocolId: 0, apy, tvl: 0, safetyScore: 85, stabilityScore: 90 };
  } catch {
    return null;
  }
}

async function fetchMentoAPY(provider: ethers.JsonRpcProvider): Promise<ProtocolAPY | null> {
  if (!MENTO_SAVINGS) return null;
  try {
    const vault = new ethers.Contract(MENTO_SAVINGS, MENTO_SAVINGS_ABI, provider);
    const [totalAssets, totalSupply] = await Promise.all([
      vault.totalAssets(),
      vault.totalSupply(),
    ]);
    const ratio = totalSupply > 0n ? (Number(totalAssets) / Number(totalSupply) - 1) * 100 : 0;
    const apy = Math.max(ratio * 365, 3.5);
    return { protocol: "MentoSavings", protocolId: 2, apy, tvl: Number(totalAssets), safetyScore: 95, stabilityScore: 98 };
  } catch {
    return null;
  }
}

async function fetchMoolaAPY(provider: ethers.JsonRpcProvider, asset: string): Promise<ProtocolAPY | null> {
  if (!MOOLA_LENDING) return null;
  try {
    const pool = new ethers.Contract(MOOLA_LENDING, MOOLA_LENDING_ABI, provider);
    const data = await pool.getReserveData(asset);
    const apyRay = data.liquidityRate || data[0];
    const apy = Number((BigInt(apyRay) * 10000n) / BigInt(1e27)) / 100;
    return { protocol: "Moola", protocolId: 1, apy, tvl: 0, safetyScore: 80, stabilityScore: 85 };
  } catch {
    return null;
  }
}

function calculateRiskScore(protocol: ProtocolAPY, timeHorizon: number): number {
  let base = protocol.safetyScore;
  if (timeHorizon < 7 * 24 * 3600) base = Math.max(base - 5, 50);
  if (protocol.apy > 15) base = Math.max(base - 10, 50);
  return Math.min(base, 100);
}

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { userAddress, timeHorizon, depositAmount } = req.body;

    if (!userAddress || !timeHorizon) {
      res.status(400).json({ error: "Missing userAddress or timeHorizon" });
      return;
    }

    const horizon = Number(timeHorizon);
    const provider = new ethers.JsonRpcProvider(CELO_RPC);

    const usdcAddress = process.env.USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
    const usdmAddress = process.env.USDM_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";

    const [aaveData, mentoData, moolaData] = await Promise.all([
      fetchAaveAPY(provider, usdcAddress),
      fetchMentoAPY(provider),
      fetchMoolaAPY(provider, usdmAddress),
    ]);

    const protocols: ProtocolAPY[] = [aaveData, mentoData, moolaData]
      .filter((p): p is ProtocolAPY => p !== null);

    protocols.push({
      protocol: "Reserve",
      protocolId: 3,
      apy: 0,
      tvl: 0,
      safetyScore: 100,
      stabilityScore: 100,
    });

    protocols.sort((a, b) => b.apy - a.apy);

    const best = protocols[0];
    const riskScore = calculateRiskScore(best, horizon);

    const allocationBps = best.protocolId === 3 ? 0 : 10000;

    const response = {
      protocolId: best.protocolId,
      protocolName: best.protocol,
      allocationBps,
      expectedApy: Math.round(best.apy * 100),
      riskScore,
      reasoning: `Recommended ${best.protocol} with ${best.apy.toFixed(2)}% APY for ${horizon / 86400} day horizon`,
      allProtocols: protocols.map((p) => ({
        protocol: p.protocol,
        protocolId: p.protocolId,
        apy: p.apy,
        safetyScore: p.safetyScore,
      })),
      timestamp: Date.now(),
      paymentVerified: !!(req as any).payment,
    };

    res.json(response);
  } catch (err: any) {
    console.error("Strategy analysis failed:", err);
    res.status(500).json({ error: "Strategy analysis failed", detail: err.message });
  }
});

router.get("/protocols", async (_req: Request, res: Response) => {
  const provider = new ethers.JsonRpcProvider(CELO_RPC);
  const usdcAddress = process.env.USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const usdmAddress = process.env.USDM_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";

  const [aaveData, mentoData, moolaData] = await Promise.all([
    fetchAaveAPY(provider, usdcAddress),
    fetchMentoAPY(provider),
    fetchMoolaAPY(provider, usdmAddress),
  ]);

  const protocols = [aaveData, mentoData, moolaData]
    .filter((p): p is ProtocolAPY => p !== null);

  protocols.push({
    protocol: "Reserve",
    protocolId: 3,
    apy: 0,
    tvl: 0,
    safetyScore: 100,
    stabilityScore: 100,
  });

  res.json({ protocols, chainId: 42220, timestamp: Date.now() });
});

export { router as strategyRouter };

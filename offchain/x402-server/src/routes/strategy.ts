import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { analyzeAPY, fetchAaveAPY, fetchMentoAPY, fetchMoolaAPY } from "../lib/apy-analyzer.js";
import { x402Middleware } from "../x402-middleware.js";

const router = Router();
const mw = x402Middleware({
  usdcAddress: process.env.USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  vaultAddress: process.env.VAULT_ADDRESS || "0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af",
  chainId: parseInt(process.env.CELO_CHAIN_ID || "42220", 10),
  priceUSDC: process.env.X402_PRICE_USDC || "100000",
  rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
});

router.post("/analyze", mw, async (req: Request, res: Response) => {
  try {
    const { userAddress, timeHorizon, depositAmount } = req.body;

    if (!userAddress || !timeHorizon) {
      res.status(400).json({ error: "Missing userAddress or timeHorizon" });
      return;
    }

    const { riskPreference, preferredTokens } = req.body;
    const result = await analyzeAPY({
      rpcUrl: process.env.APY_RPC_URL || "https://forno.celo.org",
      usdcAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      usdmAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      aavePool: process.env.AAVE_LENDING_POOL,
      mentoSavings: process.env.MENTO_SAVINGS,
      moolaPool: process.env.MOOLA_LENDING,
      timeHorizon: Number(timeHorizon),
      riskPreference,
      preferredTokens,
    });

    res.json({
      ...result,
      paymentVerified: !!(req as any).payment,
    });
  } catch (err: any) {
    console.error("Strategy analysis failed:", err);
    res.status(500).json({ error: "Strategy analysis failed", detail: err.message });
  }
});

router.get("/protocols", async (_req: Request, res: Response) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL || "https://forno.celo.org");
    const usdcAddress = process.env.USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
    const usdmAddress = process.env.USDM_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";

    const [aaveData, mentoData, moolaData] = await Promise.all([
      fetchAaveAPY(provider, usdcAddress, process.env.AAVE_LENDING_POOL),
      fetchMentoAPY(provider, process.env.MENTO_SAVINGS),
      fetchMoolaAPY(provider, usdmAddress, process.env.MOOLA_LENDING),
    ]);

    const protocols = [aaveData, mentoData, moolaData].filter((p): p is NonNullable<typeof p> => p !== null);
    protocols.push({
      protocol: "Reserve",
      protocolId: 3, apy: 0, tvl: 0, safetyScore: 100, stabilityScore: 100,
    });

    res.json({ protocols, chainId: 42220, timestamp: Date.now() });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch protocols", detail: err.message });
  }
});

export { router as strategyRouter };

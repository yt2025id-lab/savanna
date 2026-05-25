import "dotenv/config";
import express from "express";
import cors from "cors";
import { x402Middleware, PaymentConfig } from "./x402-middleware";
import { strategyRouter } from "./routes/strategy";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

const paymentConfig: PaymentConfig = {
  usdcAddress: process.env.USDC_ADDRESS || "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  usdmAddress: process.env.USDM_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  usdtAddress: process.env.USDT_ADDRESS || "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  chainId: parseInt(process.env.CELO_CHAIN_ID || "42220", 10),
  priceUSDC: process.env.X402_PRICE_USDC || "100000",
  priceUSDM: process.env.X402_PRICE_USDM || "100000000000000000",
  thirdwebSecretKey: process.env.THIRDWEB_SECRET_KEY || "",
  facilitatorUrl: "https://x402.thirdweb.com",
};

app.use("/api/strategy", x402Middleware(paymentConfig), strategyRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "savanna-x402", chain: "celo", chainId: paymentConfig.chainId });
});

app.get("/.well-known/agent.json", (_req, res) => {
  res.json({
    name: "Savanna AI Strategy Agent",
    description: "AI-powered yield optimization agent for Celo DeFi protocols",
    version: "1.0.0",
    endpoints: [
      {
        type: "a2a",
        url: `http://localhost:${PORT}/.well-known/agent.json`,
      },
      {
        type: "x402",
        url: `http://localhost:${PORT}/api/strategy/analyze`,
        pricing: {
          scheme: "fixed",
          price: paymentConfig.priceUSDC,
          currency: paymentConfig.usdcAddress,
          chainId: paymentConfig.chainId,
        },
      },
    ],
    supportedTrust: ["reputation", "validation"],
    capabilities: ["yield-optimization", "strategy-recommendation", "apy-analysis"],
  });
});

app.listen(PORT, () => {
  console.log(`Savanna x402 Payment Server running on port ${PORT}`);
  console.log(`Chain: Celo (ID: ${paymentConfig.chainId})`);
  console.log(`USDC: ${paymentConfig.usdcAddress}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Agent: http://localhost:${PORT}/.well-known/agent.json`);
});

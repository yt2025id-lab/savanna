import "dotenv/config";
import express from "express";
import cors from "cors";
import { paymentMiddleware } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm";
import { HTTPFacilitatorClient } from "@x402/core";
import { detectMinipayWallet } from "./minipay.js";
import { analyzeStrategy } from "./ai-strategy.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4021", 10);
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || "0x0000000000000000000000000000000000000000";
const OWNER_API_KEY = process.env.OWNER_API_KEY || "";

const facilitatorClient = new HTTPFacilitatorClient("https://x402.org/facilitator");

const celoMainnet = "eip155:42220";
const celoSepolia = "eip155:11142220";

const paymentVerified = new Map<string, { status: string; timestamp: number }>();

app.use(cors());
app.use(express.json());

app.use(
  paymentMiddleware({
    payTo: PAY_TO_ADDRESS,
    networks: {
      [celoMainnet]: {
        scheme: new ExactEvmScheme(celoMainnet),
        facilitator: facilitatorClient,
      },
      [celoSepolia]: {
        scheme: new ExactEvmScheme(celoSepolia),
        facilitator: facilitatorClient,
      },
    },
    routes: {
      "/strategy-analysis": {
        price: "$0.10",
        network: celoMainnet,
      },
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "savanna-x402-gateway", timestamp: Date.now() });
});

app.get("/strategy-analysis", (req, res) => {
  const user = (req.query.user as string) || "0x0";
  const timeHorizon = parseInt(req.query.timeHorizon as string) || 30;

  const recommendation = analyzeStrategy(user, timeHorizon);

  res.json({
    success: true,
    data: recommendation,
    meta: {
      user,
      timeHorizonDays: timeHorizon,
      network: celoMainnet,
      price: "$0.10",
      timestamp: Date.now(),
    },
  });
});

app.get("/minipay-detect", (req, res) => {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }
  const result = detectMinipayWallet(headers);
  res.json(result);
});

app.post("/verify-payment", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (OWNER_API_KEY && authHeader !== `Bearer ${OWNER_API_KEY}`) {
    res.status(403).json({ error: "unauthorized" });
    return;
  }

  const { requestId, status, txHash } = req.body;

  if (!requestId) {
    res.status(400).json({ error: "requestId required" });
    return;
  }

  paymentVerified.set(requestId, {
    status: status || "verified",
    timestamp: Date.now(),
  });

  res.json({
    success: true,
    requestId,
    status: paymentVerified.get(requestId)!.status,
    txHash: txHash || null,
  });
});

app.get("/verify-payment/:requestId", (req, res) => {
  const { requestId } = req.params;
  const record = paymentVerified.get(requestId);

  if (!record) {
    res.status(404).json({ error: "payment not found", requestId });
    return;
  }

  res.json({ requestId, ...record });
});

app.listen(PORT, () => {
  console.log(`Savanna x402 Gateway running on port ${PORT}`);
  console.log(`Celo Mainnet: ${celoMainnet}`);
  console.log(`Celo Sepolia: ${celoSepolia}`);
  console.log(`Pay-to: ${PAY_TO_ADDRESS}`);
});

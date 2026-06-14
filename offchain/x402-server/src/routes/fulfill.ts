import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { analyzeAPY } from "../lib/apy-analyzer.js";

const CONTROLLER_ABI = [
  "function forwarder() view returns (address)",
  "function setForwarder(address forwarder_) external",
  "function onReport(bytes calldata, bytes calldata report) external",
  "function vault() view returns (address)",
];

const router = Router();

interface FulfillRequest {
  userAddress: string;
  timeHorizon: number;
  depositAmount?: string;
}

interface FulfillResponse {
  success: boolean;
  protocolId: number;
  protocolName: string;
  allocationBps: number;
  expectedApy: number;
  riskScore: number;
  reasoning: string;
  txHash?: string;
  error?: string;
}

// Simple API key auth for fulfill (costs deployer gas)
function checkFulfillAuth(req: Request, res: Response): boolean {
  const apiKey = process.env.FULFILL_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  FULFILL_API_KEY not set — fulfillment endpoint secured by CORS only. Set FULFILL_API_KEY in production.");
    return true;
  }
  const auth = req.headers["authorization"];
  if (auth === `Bearer ${apiKey}`) return true;
  res.status(401).json({ error: "Unauthorized — valid FULFILL_API_KEY required" });
  return false;
}

router.post("/fulfill", async (req: Request, res: Response) => {
  if (!checkFulfillAuth(req, res)) return;

  try {
    const { userAddress, timeHorizon, depositAmount } = req.body as FulfillRequest;

    if (!userAddress || !timeHorizon) {
      res.status(400).json({ error: "Missing userAddress or timeHorizon" });
      return;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      res.status(500).json({ error: "PRIVATE_KEY not configured" });
      return;
    }

    const controllerAddr = process.env.CONTROLLER_ADDRESS as string;
    if (!controllerAddr) {
      res.status(500).json({ error: "CONTROLLER_ADDRESS not configured" });
      return;
    }

    // Step 1: Analyze APY from Celo Mainnet (where real protocols exist)
    const apyRpcUrl = process.env.APY_RPC_URL || "https://forno.celo.org";
    const analysis = await analyzeAPY({
      rpcUrl: apyRpcUrl,
      usdcAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      usdmAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      aavePool: process.env.AAVE_LENDING_POOL || "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402",
      moolaPool: process.env.MOOLA_LENDING || "0xc1548F5AA1D76CDcAB7385FA6B5cEA70f941e535",
      timeHorizon: Number(timeHorizon),
    });

    // Step 2: Fulfill on-chain via controller.onReport()
    const chainRpcUrl = process.env.CELO_RPC_URL || "https://forno.celo.org";
    const provider = new ethers.JsonRpcProvider(chainRpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const controller = new ethers.Contract(controllerAddr, CONTROLLER_ABI, wallet);

    // Note: Forwarder already set to deployer address by admin.
    // See: tx 0x65f2647ecafbfe3be9f52f1df56be3a36889d3bd1d5c7ff7c1bc298a0a6773c5

    // Encode report
    const reportData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint8", "uint256", "uint256", "string"],
      [userAddress, analysis.protocolId, analysis.allocationBps, BigInt(analysis.expectedApy), analysis.reasoning]
    );

    // Manual tx with nonce retry
    const deployerAddr = await wallet.getAddress();
    const calldata = controller.interface.encodeFunctionData("onReport", ["0x", reportData]);
    const feeData = await provider.getFeeData();

    let lastErr: Error | null = null;
    let sentTx: ethers.TransactionResponse | null = null;
    const MAX_TRIES = 3;

    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      try {
        const nonce = await provider.getTransactionCount(deployerAddr);
        const rawTx = {
          to: controllerAddr,
          data: calldata,
          nonce,
          gasLimit: 500_000,
          maxFeePerGas: feeData.maxFeePerGas ?? 50000000000n,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 5000000000n,
          chainId: parseInt(process.env.CELO_CHAIN_ID || "42220", 10),
          type: 2,
        };

        console.log(`Sending onReport (attempt ${attempt + 1}, nonce ${nonce})...`);
        const signedTx = await wallet.signTransaction(rawTx);
        sentTx = await provider.broadcastTransaction(signedTx);
        console.log(`Tx sent: ${sentTx.hash}`);
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || "";
        if (msg.includes("nonce too low") || msg.includes("nonce") && msg.includes("already been used")) {
          console.log(`Nonce conflict, retrying... (${attempt + 1}/${MAX_TRIES})`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw err;
      }
    }

    if (!sentTx) throw lastErr || new Error("Failed to send transaction");

    // Wait for receipt with longer timeout
    const receipt = await provider.waitForTransaction(sentTx.hash, 1, 120_000);
    if (!receipt) throw new Error("Transaction not confirmed after 120s");
    if (receipt.status === 0) throw new Error("Transaction reverted — onReport execution failed");

    const response: FulfillResponse = {
      success: true,
      protocolId: analysis.protocolId,
      protocolName: analysis.protocolName,
      allocationBps: analysis.allocationBps,
      expectedApy: analysis.expectedApy,
      riskScore: analysis.riskScore,
      reasoning: analysis.reasoning,
      txHash: receipt.hash || sentTx.hash,
    };

    console.log(`Strategy fulfilled! Tx: ${response.txHash}`);
    res.json(response);
  } catch (err: any) {
    console.error("Fulfillment failed:", err);
    res.status(500).json({
      success: false,
      error: err?.reason || err?.message || "Fulfillment failed",
    });
  }
});

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL || "https://forno.celo.org");
    const controllerAddr = process.env.CONTROLLER_ADDRESS as string;

    if (controllerAddr) {
      const controller = new ethers.Contract(controllerAddr, CONTROLLER_ABI, provider);
      const fwd = await controller.forwarder();
      res.json({ status: "ok", forwarder: fwd, controller: controllerAddr });
    } else {
      res.json({ status: "error", message: "CONTROLLER_ADDRESS not set" });
    }
  } catch (err: any) {
    res.json({ status: "error", message: err.message });
  }
});

export { router as fulfillRouter };

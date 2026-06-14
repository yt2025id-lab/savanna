import type { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";

export interface PaymentConfig {
  usdcAddress: string;
  vaultAddress: string;
  chainId: number;
  priceUSDC: string;
  rpcUrl: string;
}

interface PaymentRequirement {
  error: string;
  scheme: string;
  price: string;
  currency: string;
  chainId: number;
  recipient: string;
}

const ERC20_TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");

const verifiedTxHashes = new Set<string>();
const MAX_TX_AGE_MS = 10 * 60 * 1000;

function build402Response(config: PaymentConfig): PaymentRequirement {
  return {
    error: "Payment Required",
    scheme: "fixed",
    price: config.priceUSDC,
    currency: config.usdcAddress,
    chainId: config.chainId,
    recipient: config.vaultAddress,
  };
}

async function verifyPaymentOnChain(
  txHash: string,
  expectedPayer: string,
  config: PaymentConfig
): Promise<{ valid: boolean; payer?: string; amount?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || !receipt.status) return { valid: false };

    const usdcAddr = config.usdcAddress.toLowerCase();
    const vaultAddr = config.vaultAddress.toLowerCase();
    const price = BigInt(config.priceUSDC);

    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() !== usdcAddr ||
        log.topics[0] !== ERC20_TRANSFER_TOPIC
      ) continue;

      const from = ethers.getAddress(ethers.dataSlice(log.topics[1], 12));
      const to = ethers.getAddress(ethers.dataSlice(log.topics[2], 12));

      if (to.toLowerCase() !== vaultAddr) continue;
      if (from.toLowerCase() !== expectedPayer.toLowerCase()) continue;

      const amount = ethers.toBigInt(log.data);
      if (amount < price) continue;

      return { valid: true, payer: from, amount: amount.toString() };
    }

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export function x402Middleware(config: PaymentConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header =
      req.headers["x-payment"] as string ||
      req.headers["payment-signature"] as string;

    if (!header) {
      res.status(402).json(build402Response(config));
      return;
    }

    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, ...v] = p.trim().split("=");
        return [k, v.join("=")];
      })
    );

    const { txHash, payer, amount, currency } = parts;

    if (!txHash || !payer) {
      res.status(402).json({ ...build402Response(config), error: "Missing txHash or payer" });
      return;
    }

    if (currency && currency.toLowerCase() !== config.usdcAddress.toLowerCase()) {
      res.status(402).json({ ...build402Response(config), error: "Unsupported currency" });
      return;
    }

    // Replay protection: reject already-verified txHashes
    if (verifiedTxHashes.has(txHash)) {
      res.status(402).json({
        ...build402Response(config),
        error: "Payment already used — each transaction can only be used once",
      });
      return;
    }

    const result = await verifyPaymentOnChain(txHash, payer, config);

    if (!result.valid) {
      res.status(402).json({
        ...build402Response(config),
        error: "Payment verification failed — no valid USDC transfer found",
      });
      return;
    }

    // Mark txHash as used (with periodic cleanup of old entries)
    verifiedTxHashes.add(txHash);
    if (verifiedTxHashes.size > 10000) {
      const entries = [...verifiedTxHashes];
      entries.slice(0, 5000).forEach((h) => verifiedTxHashes.delete(h));
    }

    (req as any).payment = { ...result, txHash, currency: config.usdcAddress };
    next();
  };
}

export { build402Response };

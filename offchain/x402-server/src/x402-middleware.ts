export interface PaymentConfig {
  usdcAddress: string;
  usdmAddress: string;
  usdtAddress: string;
  chainId: number;
  priceUSDC: string;
  priceUSDM: string;
  thirdwebSecretKey: string;
  facilitatorUrl: string;
}

interface PaymentRequirement {
  error: string;
  scheme: string;
  price: string;
  currency: string;
  chainId: number;
  recipient?: string;
}

function build402Response(config: PaymentConfig): PaymentRequirement {
  return {
    error: "Payment Required",
    scheme: "fixed",
    price: config.priceUSDC,
    currency: config.usdcAddress,
    chainId: config.chainId,
  };
}

async function verifyPayment(
  paymentHeader: string,
  config: PaymentConfig
): Promise<{ valid: boolean; payer?: string; amount?: string; currency?: string; txHash?: string }> {
  try {
    const parts = paymentHeader.split(",");
    if (parts.length < 3) return { valid: false };

    const signaturePart = parts.find((p) => p.trim().startsWith("signature="));
    const amountPart = parts.find((p) => p.trim().startsWith("amount="));
    const currencyPart = parts.find((p) => p.trim().startsWith("currency="));

    if (!signaturePart || !amountPart || !currencyPart) return { valid: false };

    const amount = amountPart.split("=")[1]?.trim();
    const currency = currencyPart.split("=")[1]?.trim();

    const supportedTokens = [config.usdcAddress, config.usdmAddress, config.usdtAddress].map(
      (a) => a.toLowerCase()
    );

    if (!supportedTokens.includes(currency?.toLowerCase())) {
      return { valid: false };
    }

    const requiredAmount =
      currency?.toLowerCase() === config.usdmAddress.toLowerCase()
        ? config.priceUSDM
        : config.priceUSDC;

    if (!amount || BigInt(amount) < BigInt(requiredAmount)) {
      return { valid: false };
    }

    return {
      valid: true,
      amount,
      currency,
      payer: parts.find((p) => p.trim().startsWith("payer="))?.split("=")[1]?.trim(),
    };
  } catch {
    return { valid: false };
  }
}

export function x402Middleware(config: PaymentConfig) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const paymentHeader =
      req.headers["x-payment"] as string ||
      req.headers["payment-signature"] as string;

    if (!paymentHeader) {
      res.status(402).json(build402Response(config));
      return;
    }

    const result = await verifyPayment(paymentHeader, config);

    if (!result.valid) {
      res.status(402).json({
        ...build402Response(config),
        error: "Payment verification failed",
      });
      return;
    }

    (req as any).payment = result;
    next();
  };
}

export { build402Response, verifyPayment };

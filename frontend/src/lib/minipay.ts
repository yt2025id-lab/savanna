/**
 * MiniPay Detection & Integration Utilities
 *
 * MiniPay is Opera's mini-app browser on Celo, giving access to millions
 * of users in Africa & Asia who already hold cUSD. This module:
 * - Detects MiniPay environment
 * - Provides cUSD-first configuration when inside MiniPay
 * - Handles MiniPay deep linking
 */

// ─── Detection ──────────────────────────────────────────────────────────────

/** Check if the app is running inside MiniPay browser */
export function detectMiniPay(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();

  // MiniPay injects itself as the Ethereum provider
  const ethereum = (window as any).ethereum;
  const isMiniPayProvider = !!ethereum?.isMiniPay;

  // Fallback: check user-agent string
  const isMiniPayUA = /minipay/i.test(ua);

  return isMiniPayProvider || isMiniPayUA;
}

/** Get MiniPay-specific provider if available */
export function getMiniPayProvider(): any | null {
  if (typeof window === "undefined") return null;
  const ethereum = (window as any).ethereum;
  return ethereum?.isMiniPay ? ethereum : null;
}

// ─── Deep Linking ───────────────────────────────────────────────────────────

/** Build a MiniPay deep link for Savanna */
export function getMiniPayDeepLink(path: string = "/earn"): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://savanna.finance";
  return `${baseUrl}${path}?ref=minipay&utm_source=minipay`;
}

/** Check if current URL has MiniPay referral params */
export function isMiniPayReferral(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("ref") === "minipay";
}

// ─── cUSD Configuration ─────────────────────────────────────────────────────

/** Celo token addresses — mainnet */
export const CELO_TOKENS = {
  /** USDC (Circle) on Celo mainnet */
  usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
  /** cUSD (Mento stablecoin) on Celo mainnet */
  cusd: "0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`,
  /** cEUR (Mento stablecoin) on Celo mainnet */
  ceur: "0xD8763CBa276a3738E6DE85Ad4eA6202C29B19080" as `0x${string}`,
  /** CELO native token (wrapped) */
  celo: "0x471EcE3750Da237f93B8E339c536989b5e3e63EA" as `0x${string}`,
  /** Mento Savings cUSD (sCU) on Celo mainnet */
  sCU: "0x2A4d787eb7e7306eF8bb5143c6295C5731D1b4F4" as `0x${string}`,
} as const;

/** Celo token addresses — Sepolia testnet */
export const CELO_TOKENS_TESTNET = {
  usdc: "0x9384F5db5Ee68829538cebc659d3b50C6ED74ad2" as `0x${string}`,
  cusd: "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`,
  ceur: "0x0000000000000000000000000000000000000000" as `0x${string}`, // not on testnet
  celo: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  sCU: "0x0000000000000000000000000000000000000000" as `0x${string}`, // TODO: deploy testnet sCU
} as const;

/** Common type for a supported deposit asset */
export type SupportedAsset = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

/**
 * Get the default deposit asset based on environment.
 * MiniPay users hold cUSD; desktop/web users hold USDC.
 */
export function getDefaultDepositAsset(chainId: number): {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
} {
  const isTestnet = chainId === 11142220;
  const isMini = detectMiniPay();

  if (isMini) {
    // MiniPay users: cUSD first
    return {
      address: isTestnet ? CELO_TOKENS_TESTNET.cusd : CELO_TOKENS.cusd,
      symbol: "cUSD",
      decimals: 18,
    };
  }

  // Web users: USDC first
  return {
    address: isTestnet ? CELO_TOKENS_TESTNET.usdc : CELO_TOKENS.usdc,
    symbol: "USDC",
    decimals: 6,
  };
}

/**
 * Get all supported deposit assets for the given chain.
 */
export function getSupportedDepositAssets(chainId: number): Array<{
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}> {
  const isTestnet = chainId === 11142220;
  const tokens = isTestnet ? CELO_TOKENS_TESTNET : CELO_TOKENS;

  return [
    {
      address: tokens.usdc,
      symbol: "USDC",
      decimals: 6,
    },
    {
      address: tokens.cusd,
      symbol: "cUSD",
      decimals: 18,
    },
  ].filter((t) => t.address !== "0x0000000000000000000000000000000000000000");
}

// ─── MiniPay Metadata ───────────────────────────────────────────────────────

/** MiniPay mini-app metadata for registration */
export const MINIPAY_APP_META = {
  name: "Savanna Finance",
  shortName: "Savanna",
  description: "AI-powered yield protocol on Celo — maximize returns while the savanna thrives",
  startUrl: "/earn",
  themeColor: "#C8A84B",
  backgroundColor: "#0D1A0F",
  icon: "/icon-192.png",
  category: "finance",
} as const;

// ─── x402 Payment Integration ──────────────────────────────────────────────

/** x402 payment configuration for AI strategy endpoint */
export function getX402Config(chainId?: number) {
  const isTestnet = chainId === 11142220;
  return {
    endpoint: process.env.NEXT_PUBLIC_X402_ENDPOINT || (isTestnet
      ? "http://localhost:3001/api/strategy/analyze"
      : "https://savanna-x402.onrender.com/api/strategy/analyze"),
    price: process.env.NEXT_PUBLIC_X402_PRICE || "100000",
    currency: (isTestnet
      ? "0x9384F5db5Ee68829538cebc659d3b50C6ED74ad2"  // testnet USDC
      : "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"   // mainnet USDC
    ) as `0x${string}`,
    chainId: isTestnet ? 11142220 : 42220,
    feeCurrency: (isTestnet
      ? "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8"  // testnet cUSD
      : "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"   // mainnet USDC fee adapter
    ) as `0x${string}`,
  } as const;
}

export const X402_CONFIG = getX402Config(11142220);

/**
 * Build x402 payment header value for a strategy request.
 * Called by the off-chain AI monitor after verifying the user's stablecoin payment.
 */
export function buildX402PaymentHeader(params: {
  payer: string;
  amount: string;
  currency: string;
  signature: string;
  txHash: string;
}): string {
  return [
    `payer=${params.payer}`,
    `amount=${params.amount}`,
    `currency=${params.currency}`,
    `signature=${params.signature}`,
    `txHash=${params.txHash}`,
  ].join(",");
}

/**
 * Check if a 402 response contains x402 payment requirements
 */
export function parseX402Requirement(body: any): {
  price: string;
  currency: string;
  chainId: number;
  scheme: string;
} | null {
  if (!body || body.error !== "Payment Required") return null;
  return {
    price: body.price,
    currency: body.currency,
    chainId: body.chainId,
    scheme: body.scheme,
  };
}

// ─── MiniPay + x402 Combined Flow ──────────────────────────────────────────

/**
 * Get the MiniPay deposit deep link for the Savanna vault.
 * Redirects MiniPay users with low balance to top up.
 */
export function getMinipayAddCashLink(tokens: string[] = ["USDm", "USDC"]): string {
  const tokenList = tokens.join(",");
  return `https://link.minipay.xyz/add_cash?tokens=${tokenList}`;
}

/**
 * Get the MiniPay receipt deep link for a transaction.
 */
export function getMinipayReceiptLink(txHash: string): string {
  return `https://link.minipay.xyz/receipt?tx=${txHash}&celebrate`;
}

/**
 * Get MiniPay deposit minimums.
 * MiniPay users get 1/5 of the standard minimum deposit.
 */
export function getMinipayDepositMin(decimals: number): {
  standard: bigint;
  minipay: bigint;
} {
  const unit = BigInt(10) ** BigInt(decimals);
  return {
    standard: BigInt(10) * unit,
    minipay: BigInt(1) * unit,
  };
}

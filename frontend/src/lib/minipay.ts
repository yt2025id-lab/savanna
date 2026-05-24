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

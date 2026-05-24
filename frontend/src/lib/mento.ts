/**
 * Mento Swap Routing Utilities
 *
 * Mento is Celo's native stablecoin DEX (AMM). It provides the best
 * swap rates for cUSD ↔ USDC, cEUR ↔ cUSD, and CELO ↔ stablecoins
 * on Celo, with lower slippage and fees than external bridges.
 *
 * Integration with Savanna Finance:
 * - Route intra-Celo token swaps through Mento (instead of LI.FI)
 * - Auto-convert deposited tokens to the vault's target asset
 * - Provide Mento Savings (sCU) deposits after swapping
 *
 * @see https://docs.mento.fi
 */

// ─── Mento Contract Addresses ──────────────────────────────────────────────

export const MENTO_ADDRESSES = {
  mainnet: {
    /** Mento Exchange proxy — main swap entry point */
    exchange: "0x1e4755eDDcAF3E2c86cC018Be56b4496a2A4a2Ef" as `0x${string}`,
    /** Mento Broker — newer API for swaps */
    broker: "0x2a8E1e676Ec238d8A992307B495b45B3fEA58149" as `0x${string}`,
    /** Mento Savings cUSD (sCU) */
    savingsCU: "0x2A4d787eb7e7306eF8bb5143c6295C5731D1b4F4" as `0x${string}`,
    /** cUSD token */
    cusd: "0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`,
    /** cEUR token */
    ceur: "0xD8763CBa276a3738E6DE85Ad4eA6202C29B19080" as `0x${string}`,
    /** USDC (Circle) */
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    /** CELO native token */
    celo: "0x471EcE3750Da237f93B8E339c536989b5e3e63EA" as `0x${string}`,
  },
  sepolia: {
    exchange: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    broker: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    savingsCU: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    cusd: "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`,
    ceur: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    usdc: "0x9384F5db5Ee68829538cebc659d3b50C6ED74ad2" as `0x${string}`,
    celo: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

// ─── Swap Pairs ─────────────────────────────────────────────────────────────

/** Supported Mento swap pairs on Celo */
export const MENTO_SWAP_PAIRS = [
  { from: "cUSD", to: "USDC", pool: "cUSD/USDC" },
  { from: "USDC", to: "cUSD", pool: "cUSD/USDC" },
  { from: "cEUR", to: "cUSD", pool: "cEUR/cUSD" },
  { from: "cUSD", to: "cEUR", pool: "cEUR/cUSD" },
  { from: "CELO", to: "cUSD", pool: "CELO/cUSD" },
  { from: "cUSD", to: "CELO", pool: "CELO/cUSD" },
  { from: "CELO", to: "USDC", pool: "CELO/USDC" },
] as const;

/** Check if Mento supports a swap between two tokens */
export function isMentoSwapSupported(fromSymbol: string, toSymbol: string): boolean {
  return MENTO_SWAP_PAIRS.some(
    (p) => p.from === fromSymbol && p.to === toSymbol
  );
}

// ─── Routing Logic ─────────────────────────────────────────────────────────

/** Swap route recommendation */
export type SwapRoute = {
  /** Which DEX/bridge to use */
  provider: "mento" | "lifi" | "direct";
  /** Number of hops in the route */
  hops: number;
  /** Path of tokens through the swap */
  path: string[];
  /** Estimated gas cost category */
  gasEstimate: "low" | "medium" | "high";
  /** Whether this route is recommended */
  recommended: boolean;
};

/**
 * Determine the best swap route for a deposit into Savanna.
 *
 * Strategy:
 * 1. If same token → direct deposit, no swap needed
 * 2. If Mento supports the pair → use Mento (lowest fees on Celo)
 * 3. If cross-chain → use LI.FI
 * 4. Fallback → LI.FI for everything
 */
export function getDepositSwapRoute(params: {
  fromSymbol: string;
  fromChainId: number;
  toSymbol: string;
  toChainId: number;
}): SwapRoute {
  const { fromSymbol, fromChainId, toSymbol, toChainId } = params;

  // Same token, same chain → direct
  if (fromSymbol === toSymbol && fromChainId === toChainId) {
    return {
      provider: "direct",
      hops: 0,
      path: [fromSymbol],
      gasEstimate: "low",
      recommended: true,
    };
  }

  // Same chain, Mento-supported pair → Mento swap
  const isSameChain = fromChainId === toChainId;
  if (isSameChain && isMentoSwapSupported(fromSymbol, toSymbol)) {
    return {
      provider: "mento",
      hops: 1,
      path: [fromSymbol, toSymbol],
      gasEstimate: "low",
      recommended: true,
    };
  }

  // Same chain but not Mento-supported → still try Mento via multi-hop
  if (isSameChain) {
    // Try routing through cUSD as intermediary
    if (
      isMentoSwapSupported(fromSymbol, "cUSD") &&
      isMentoSwapSupported("cUSD", toSymbol)
    ) {
      return {
        provider: "mento",
        hops: 2,
        path: [fromSymbol, "cUSD", toSymbol],
        gasEstimate: "medium",
        recommended: true,
      };
    }
  }

  // Cross-chain → LI.FI
  return {
    provider: "lifi",
    hops: fromChainId !== toChainId ? 2 : 1,
    path: fromChainId !== toChainId
      ? [fromSymbol, "bridge", toSymbol]
      : [fromSymbol, toSymbol],
    gasEstimate: "high",
    recommended: !isSameChain,
  };
}

// ─── Mento ABI (minimal for swaps) ─────────────────────────────────────────

export const MENTO_BROKER_ABI = [
  "function swapIn(address exchange, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
  "function swapOut(address exchange, address tokenIn, address tokenOut, uint256 amountOut, uint256 maxAmountIn) external returns (uint256 amountIn)",
  "function getAmountIn(address exchange, address tokenIn, address tokenOut, uint256 amountOut) external view returns (uint256)",
  "function getAmountOut(address exchange, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)",
] as const;

export const MENTO_SAVINGS_ABI = [
  // ERC-4626
  "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)",
  "function balanceOf(address account) external view returns (uint256)",
  "function convertToAssets(uint256 shares) external view returns (uint256)",
  "function convertToShares(uint256 assets) external view returns (uint256)",
  "function totalAssets() external view returns (uint256)",
  // Mento-specific
  "function savingsRate() external view returns (uint256)",
  "function exchangeRate() external view returns (uint256)",
] as const;

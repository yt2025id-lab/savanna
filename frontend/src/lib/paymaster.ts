/**
 * Celo Paymaster & ERC-4337 Smart Account Utilities
 *
 * Enables gasless transactions for Savanna Finance users.
 * MiniPay and Celo support fee abstraction via Paymasters,
 * so users don't need CELO to pay for gas.
 *
 * Architecture:
 *   User → Smart Account (ERC-4337) → Bundler → Paymaster pays gas
 *
 * Implementation status: PREP — these utilities are ready for when
 * Celo's ERC-4337 infrastructure is fully live on mainnet.
 */

// ─── Celo ERC-4337 Addresses ────────────────────────────────────────────────

/** Celo ERC-4337 infrastructure addresses */
export const CELO_4337 = {
  mainnet: {
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f371038F" as `0x${string}`,
    // Paymaster addresses — to be filled when Celo deploys official paymasters
    usdcPaymaster: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    cusdPaymaster: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  sepolia: {
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f371038F" as `0x${string}`,
    usdcPaymaster: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    cusdPaymaster: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

// ─── Paymaster Configuration ───────────────────────────────────────────────

export type PaymasterMode = "none" | "usdc" | "cusd" | "sponsor";

interface PaymasterConfig {
  mode: PaymasterMode;
  /** The token the user pays gas with (if mode is usdc/cusd) */
  feeToken?: `0x${string}`;
  /** Paymaster contract address */
  paymasterAddress?: `0x${string}`;
}

/**
 * Determine paymaster configuration based on environment and user assets.
 *
 * - MiniPay users: cUSD paymaster (MiniPay may sponsor gas)
 * - Web users with cUSD: cUSD paymaster
 * - Web users with USDC: USDC paymaster
 * - Fallback: no paymaster (user pays CELO gas)
 */
export function getPaymasterConfig(params: {
  isMiniPay: boolean;
  depositAssetSymbol: string;
  chainId: number;
}): PaymasterConfig {
  const { isMiniPay, depositAssetSymbol, chainId } = params;
  const isMainnet = chainId === 42220;
  const addrs = isMainnet ? CELO_4337.mainnet : CELO_4337.sepolia;

  // MiniPay may sponsor gas for its mini-apps
  if (isMiniPay) {
    if (addrs.cusdPaymaster !== "0x0000000000000000000000000000000000000000") {
      return {
        mode: "cusd",
        feeToken: isMainnet
          ? ("0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`)
          : ("0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`),
        paymasterAddress: addrs.cusdPaymaster,
      };
    }
    // If no paymaster yet, MiniPay may still handle gas internally
    return { mode: "sponsor" };
  }

  // Web users: pay in the same token they deposit
  if (depositAssetSymbol === "cUSD" && addrs.cusdPaymaster !== "0x0000000000000000000000000000000000000000") {
    return {
      mode: "cusd",
      feeToken: isMainnet
        ? ("0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`)
        : ("0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`),
      paymasterAddress: addrs.cusdPaymaster,
    };
  }

  if (depositAssetSymbol === "USDC" && addrs.usdcPaymaster !== "0x0000000000000000000000000000000000000000") {
    return {
      mode: "usdc",
      feeToken: isMainnet
        ? ("0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`)
        : ("0x9384F5db5Ee68829538cebc659d3b50C6ED74ad2" as `0x${string}`),
      paymasterAddress: addrs.usdcPaymaster,
    };
  }

  // No paymaster available — user pays gas in CELO
  return { mode: "none" };
}

/**
 * Check if gasless transactions are available for the current config.
 */
export function isGaslessAvailable(config: PaymasterConfig): boolean {
  return config.mode !== "none";
}

/**
 * Build an ERC-4337 UserOperation with paymaster data.
 * This is a PREP utility — actual submission requires a Bundler.
 */
export function buildPaymasterData(config: PaymasterConfig): `0x${string}` | undefined {
  if (config.mode === "none") return undefined;

  if (config.paymasterAddress && config.paymasterAddress !== "0x0000000000000000000000000000000000000000") {
    return config.paymasterAddress;
  }

  return undefined;
}

// ─── Celo Fee Currency ─────────────────────────────────────────────────────

/**
 * Celo supports paying gas in ERC-20 tokens via `feeCurrency` in eth_sendTransaction.
 * This is simpler than full ERC-4337 and works with regular EOA wallets.
 *
 * @see https://docs.celo.org/developer/transaction-fee-currency
 */
export const CELO_FEE_TOKENS = {
  mainnet: {
    cusd: "0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`,
    ceur: "0xD8763CBa276a3738E6DE85Ad4eA6202C29B19080" as `0x${string}`,
  },
  sepolia: {
    cusd: "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`,
  },
} as const;

/**
 * Get the fee currency for Celo gas payment.
 * This allows users to pay gas in cUSD instead of CELO.
 */
export function getFeeCurrency(
  chainId: number,
  preferToken: "cUSD" | "cEUR" = "cUSD"
): `0x${string}` | undefined {
  const isMainnet = chainId === 42220;
  const tokens = isMainnet ? CELO_FEE_TOKENS.mainnet : CELO_FEE_TOKENS.sepolia;

  if (preferToken === "cEUR" && "ceur" in tokens) {
    return tokens.ceur as `0x${string}`;
  }
  if ("cusd" in tokens) {
    return tokens.cusd as `0x${string}`;
  }
  return undefined;
}

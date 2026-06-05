export const CONTRACTS = {
  // Celo Sepolia (testnet) — chain ID 11142220
  11142220: {
    vault: "0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af" as `0x${string}`,
    controller: "0xf4B8358E372aE659a4D9219DD86C61233cE4280e" as `0x${string}`,
    oracle: "0xFEe2639ecFaBcF359d4D4a06aa7Eb5FBbe4DcAb4" as `0x${string}`,
    crossChainReceiver: "0x3fD3a166F5aCcbe578777ed47c2651598aC152db" as `0x${string}`,
    feedConsumer: "0x5B9f5553A802514f358ef61c56742a0B831C6614" as `0x${string}`,
    aaveStrategy: "0xcBceC5a5C17797C601b1f747a3977423397C904e" as `0x${string}`,
    moolaStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mentoSavingsStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    reserveStrategy: "0xFF8433711aBD603b3c9A07cfa51A4b157Ec300e9" as `0x${string}`,
    functionsConsumer: "0xb87Baf2131871fDA5c631873618647bEbB87e367" as `0x${string}`,
    agentIdentity: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    faucet: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Will be updated after redeploy
    // Tokens
    usdc: "0x9384F5db5Ee68829538cebc659d3b50C6ED74ad2" as `0x${string}`,
    cusd: "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`,
    ceur: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mentoSavingsCU: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  // Celo Mainnet — chain ID 42220
  42220: {
    vault: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    controller: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    oracle: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    crossChainReceiver: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    feedConsumer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    aaveStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    moolaStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mentoSavingsStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    reserveStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    functionsConsumer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    agentIdentity: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    // ERC-8004 Registries (deployed by ChaosChain on Celo Mainnet)
    erc8004Identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
    erc8004Reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
    // Tokens
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    cusd: "0x765DE816845861e75A25fCA1227689AB8A8B1f84" as `0x${string}`,
    ceur: "0xD8763CBa276a3738E6DE85Ad4eA6202C29B19080" as `0x${string}`,
    mentoSavingsCU: "0x2A4d787eb7e7306eF8bb5143c6295C5731D1b4F4" as `0x${string}`,
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;

export function getContracts(chainId: number) {
  return CONTRACTS[chainId as ChainId] ?? CONTRACTS[11142220];
}

/**
 * Returns the block explorer base URL for the given chain.
 * Celo Mainnet  → https://celoscan.io
 * Celo Alfajores → https://alfajores.celoscan.io
 * Celo Sepolia  → https://sepolia.celoscan.io
 * Fallback      → https://celoscan.io
 */
export function getExplorerUrl(chainId?: number): string {
  switch (chainId) {
    case 42220:
      return "https://celoscan.io";
    case 44787:
      return "https://alfajores.celoscan.io";
    case 11142220:
      return "https://sepolia.celoscan.io";
    default:
      return "https://celoscan.io";
  }
}

/** Convenience: full transaction URL */
export function getTxUrl(txHash: string, chainId?: number): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

/** Convenience: full address URL */
export function getAddressUrl(address: string, chainId?: number): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}

// LI.FI Configuration
export const LIFI_CONFIG = {
  integrator: "savanna-finance",
  // Celo chain IDs for destination
  celoChainId: 42220,
  celoSepoliaChainId: 11142220,
  // USDC on Celo Mainnet
  celoUsdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
} as const;

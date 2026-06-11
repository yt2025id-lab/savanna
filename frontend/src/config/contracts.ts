export const CONTRACTS = {
  // Celo Sepolia (testnet) — chain ID 11142220
  // Deployed 2026-06-06 with maxWithdraw/maxRedeem fix
  11142220: {
    vault: "0x9a4Ba93354A49317949B71F6CCBD5B5663d3E5e4" as `0x${string}`,
    controller: "0x87D42B986aF2775B54a7fbE8E7d57E3C95010b87" as `0x${string}`,
    oracle: "0xF74f825bBeA1De43f881aB517B9877d36C1877E4" as `0x${string}`,
    crossChainReceiver: "0xF43D05991254fEf9CCD005BE5247e962Cd4388ac" as `0x${string}`,
    feedConsumer: "0x1587bc93533D8865aF05DDE959534AA0b0dCE7Bd" as `0x${string}`,
    aaveStrategy: "0x69820126fB60b60597447f5405647F2e2DC76103" as `0x${string}`,
    moolaStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mentoSavingsStrategy: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    reserveStrategy: "0x1022bcbF6BFdC8cb9e491CD09EB39D858Cb717DB" as `0x${string}`,
    functionsConsumer: "0x9696aCE855f66c5Cea59320A3ae39904b5385c89" as `0x${string}`,
    agentIdentity: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    faucet: "0x554c3044C32D12C59d0A5DD65E3184FFF2adF8E0" as `0x${string}`,
    // Tokens
    usdc: "0x16AdCbd54e9De3C6Addf47dbff855A0bF609235D" as `0x${string}`,
    cusd: "0x874359877C2BF3B015C25910E0c3e1F6F9c1B6D8" as `0x${string}`,
    ceur: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    mentoSavingsCU: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  // Celo Mainnet — chain ID 42220
  42220: {
    vault: "0xfDF9FBCcA4cAC29F0d793F4797cAC2F87dBD99Af" as `0x${string}`,
    controller: "0xf4B8358E372aE659a4D9219DD86C61233cE4280e" as `0x${string}`,
    oracle: "0xFEe2639ecFaBcF359d4D4a06aa7Eb5FBbe4DcAb4" as `0x${string}`,
    crossChainReceiver: "0x3fD3a166F5aCcbe578777ed47c2651598aC152db" as `0x${string}`,
    feedConsumer: "0x5B9f5553A802514f358ef61c56742a0B831C6614" as `0x${string}`,
    aaveStrategy: "0x98Da524B50676650b357D0806F72Dd4976268dad" as `0x${string}`,
    moolaStrategy: "0xcBceC5a5C17797C601b1f747a3977423397C904e" as `0x${string}`,
    mentoSavingsStrategy: "0x8d3599610165bBb66C6b6cC4A311f8e82aBB0Fd6" as `0x${string}`,
    reserveStrategy: "0xFF8433711aBD603b3c9A07cfa51A4b157Ec300e9" as `0x${string}`,
    functionsConsumer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    agentIdentity: "0xC40EfF818cFB1aC0ee77Adbea183d612b008B878" as `0x${string}`,
    // ERC-8004 Registries (deployed by ChaosChain on Celo Mainnet)
    erc8004Identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
    erc8004Reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
    // Tokens
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    cusd: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    ceur: "0xD8763CBa276a3738E6DE85Ad4eA6202C29B19080" as `0x${string}`,
    mentoSavingsCU: "0x2A4d787eb7e7306eF8bb5143c6295C5731D1b4F4" as `0x${string}`,
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;

export function getContracts(chainId: number) {
  return CONTRACTS[chainId as ChainId] ?? CONTRACTS[42220];
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

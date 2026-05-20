export const CONTRACTS = {
  // Celo Sepolia (testnet) — chain ID 11142220
  11142220: {
    vault: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    controller: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    usdc: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  // Celo Mainnet — chain ID 42220
  42220: {
    vault: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    controller: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    // Real USDC on Celo Mainnet from celopedia-skills
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;

export function getContracts(chainId: number) {
  return CONTRACTS[chainId as ChainId] ?? CONTRACTS[11142220];
}

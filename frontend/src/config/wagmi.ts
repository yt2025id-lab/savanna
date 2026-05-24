import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celo, celoSepolia, mainnet, arbitrum, optimism, polygon, base, bsc, avalanche } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Savanna Finance",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [celo, celoSepolia, mainnet, arbitrum, optimism, polygon, base, bsc, avalanche],
  ssr: true,
});

/**
 * Celo-specific chain configurations for Savanna Finance.
 * Used by MiniPay detection, cUSD support, and Mento integration.
 */
export const CELO_CHAINS = {
  mainnet: {
    id: 42220,
    name: "Celo",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    rpc: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io",
  },
  sepolia: {
    id: 11142220,
    name: "Celo Sepolia",
    nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
    rpc: "https://forno.celo-sepolia.org",
    blockExplorer: "https://sepolia.celoscan.io",
  },
} as const;

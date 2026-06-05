import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { celo, celoSepolia, mainnet, arbitrum, optimism, polygon, base, bsc, avalanche } from "wagmi/chains";

export const config = createConfig({
  chains: [celoSepolia, celo, mainnet, arbitrum, optimism, polygon, base, bsc, avalanche],
  connectors: [
    injected({ target: "metaMask" }),
    coinbaseWallet(),
  ],
  transports: {
    [celoSepolia.id]: http("https://celo-sepolia.gateway.tenderly.co"),
    [celo.id]: http("https://forno.celo.org"),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [avalanche.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: cookieStorage, key: "wagmi" }),
});

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

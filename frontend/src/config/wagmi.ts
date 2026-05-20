import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celo, celoSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Savanna Finance",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [celo, celoSepolia],
  ssr: true,
});

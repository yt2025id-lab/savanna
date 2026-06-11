"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { celoSepolia, celo } from "wagmi/chains";
import { http } from "wagmi";
import { detectMiniPay } from "@/lib/minipay";
import { useEffect } from "react";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
    [celoSepolia.id]: http("https://celo-sepolia.gateway.tenderly.co"),
  },
});

function MiniPayAutoConnect({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ethereum = (window as any).ethereum;
    if (ethereum?.isMiniPay && ethereum?.request) {
      ethereum.request({ method: "eth_requestAccounts" }).catch(() => {});
    }
  }, []);
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cm00000000000000000000000"}
      config={{
        loginMethods: ["google", "email", "twitter", "sms", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#C8A84B",
          logo: "/logosavannafinance.png",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: true,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <MiniPayAutoConnect>
            {children}
          </MiniPayAutoConnect>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

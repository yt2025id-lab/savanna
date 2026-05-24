"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import { detectMiniPay } from "@/lib/minipay";
import "@rainbow-me/rainbowkit/styles.css";
import { useEffect } from "react";

const queryClient = new QueryClient();

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#C8A84B",
            accentColorForeground: "#0D1A0F",
            borderRadius: "large",
            fontStack: "system",
          })}
          modalSize="compact"
        >
          <MiniPayAutoConnect>
            {children}
          </MiniPayAutoConnect>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

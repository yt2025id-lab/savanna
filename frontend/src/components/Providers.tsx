"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, Hydrate } from "wagmi";
import { config } from "@/config/wagmi";
import { detectMiniPay } from "@/lib/minipay";
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

export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: ReturnType<typeof config["getState"]>;
}) {
  return (
    <WagmiProvider config={config}>
      <Hydrate config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <MiniPayAutoConnect>
            {children}
          </MiniPayAutoConnect>
        </QueryClientProvider>
      </Hydrate>
    </WagmiProvider>
  );
}

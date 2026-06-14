"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const CELO_CHAINS = [42220, 11142220];

const CHAIN_NAMES: Record<number, string> = {
  42220: "Celo Mainnet",
  11142220: "Celo Sepolia",
};

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  if (!isConnected || !chainId) return <>{children}</>;

  const isCelo = CELO_CHAINS.includes(chainId);

  if (isCelo || dismissed) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-2xl border border-warning/30 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-dim">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Wrong Network</h3>
            <p className="text-sm text-muted-light">
              Connected to{" "}
              <span className="font-medium text-warning">{CHAIN_NAMES[chainId] || `Chain ${chainId}`}</span>
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-light leading-relaxed">
          Savanna Finance runs on <strong className="text-accent">Celo</strong>. Switch to Celo Mainnet or Celo Sepolia to continue.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => switchChain?.({ chainId: 42220 })}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-background transition-all hover:bg-accent-hover"
          >
            Switch to Celo Mainnet
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => switchChain?.({ chainId: 11142220 })}
            className="flex items-center justify-center gap-2 rounded-xl border border-accent/30 px-4 py-2.5 text-sm font-medium text-accent transition-all hover:bg-accent-dim"
          >
            Switch to Celo Sepolia (Testnet)
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="mt-1 text-xs text-muted hover:text-muted-light transition-colors"
          >
            Dismiss — I know what I&apos;m doing
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function ConnectWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();

  if (!ready) return <div className="h-9 w-28 rounded-lg bg-card animate-pulse" />;

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-muted">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted hover:text-danger hover:border-danger/30 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-background hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      Connect
    </button>
  );
}

"use client";

import { useAccount } from "wagmi";
import { StatsBar } from "@/components/earn/StatsBar";
import { DepositCard } from "@/components/earn/DepositCard";
import { ActivePositions } from "@/components/earn/ActivePositions";
import { YieldHistory } from "@/components/earn/YieldHistory";
import { useVaultData } from "@/hooks/useVaultData";
import { TrendingUp, Wallet, Clock, Zap } from "lucide-react";

export default function EarnPage() {
  const { address, isConnected } = useAccount();
  const {
    tvlFormatted,
    totalPositions,
    totalRecommendations,
    totalYieldEarned,
    yieldEarnedFormatted,
    deployedUsdFormatted,
    rebalanceInterval,
    lastRebalance,
    isLoading,
  } = useVaultData();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "—";

  // Calculate time until next rebalance
  const now = Math.floor(Date.now() / 1000);
  const intervalSec = rebalanceInterval ? Number(rebalanceInterval) : 14400; // 4 hours default
  const lastRebalanceSec = lastRebalance ? Number(lastRebalance) : 0;
  const nextRebalanceSec = lastRebalanceSec + intervalSec;
  const timeUntilRebalance = nextRebalanceSec > now ? nextRebalanceSec - now : 0;
  const rebalanceHours = Math.floor(timeUntilRebalance / 3600);
  const rebalanceMins = Math.floor((timeUntilRebalance % 3600) / 60);

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Earn Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dim">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Earn Yield
            </h1>
            <p className="text-sm text-muted-light">
              Deposit assets and earn AI-optimized yield on Celo
            </p>
          </div>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2 mt-3">
            <Wallet className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-muted font-mono">{truncated}</span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <StatsBar />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — Deposit + Active Positions */}
        <div className="lg:col-span-2 space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <DepositCard />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <ActivePositions />
          </div>
        </div>

        {/* Right column — Yield History */}
        <div className="lg:col-span-3 space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <YieldHistory />
          </div>

          {/* Protocol Stats */}
          <div className="animate-fade-in rounded-2xl border border-border bg-card p-5" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Protocol Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">TVL</p>
                <p className="text-lg font-bold text-accent">${tvlFormatted}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Positions</p>
                <p className="text-lg font-bold text-foreground">
                  {isLoading ? "—" : (totalPositions?.toString() ?? "0")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">AI Picks</p>
                <p className="text-lg font-bold text-accent">
                  {isLoading ? "—" : (totalRecommendations?.toString() ?? "0")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Total Yield</p>
                <p className="text-lg font-bold text-accent">
                  ${yieldEarnedFormatted}
                </p>
              </div>
            </div>

            {/* Automation Status */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] text-muted">Auto-Rebalance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] text-accent font-mono">
                  {isLoading ? "—" : `${rebalanceHours}h ${rebalanceMins}m`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useAccount } from "wagmi";
import { StatsBar } from "@/components/earn/StatsBar";
import { DepositCard } from "@/components/earn/DepositCard";
import { ActivePositions } from "@/components/earn/ActivePositions";
import { YieldHistory } from "@/components/earn/YieldHistory";
import { useVaultData } from "@/hooks/useVaultData";
import { TrendingUp, Wallet } from "lucide-react";

export default function EarnPage() {
  const { address, isConnected } = useAccount();
  const { tvlFormatted, totalPositions, totalRecommendations, isLoading } = useVaultData();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "—";

  return (
    <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Earn Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(200,168,75,0.12)]">
            <TrendingUp className="h-5 w-5 text-[#C8A84B]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#F5EDD6]" style={{ fontFamily: "Georgia, serif" }}>
              Earn Yield
            </h1>
            <p className="text-sm text-[#E8D5A3] opacity-60">
              Deposit assets and earn AI-optimized yield on Celo
            </p>
          </div>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2 mt-3">
            <Wallet className="h-3.5 w-3.5 text-[#4A7C59]" />
            <span className="text-xs text-[#E8D5A3] opacity-40 font-mono">{truncated}</span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="mb-6">
        <StatsBar />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — Deposit + Active Positions */}
        <div className="lg:col-span-2 space-y-5">
          <DepositCard />
          <ActivePositions />
        </div>

        {/* Right column — Yield History */}
        <div className="lg:col-span-3 space-y-5">
          <YieldHistory />

          {/* Protocol Stats */}
          <div className="rounded-2xl border border-[rgba(200,168,75,0.1)] bg-[#1A2E1C] p-5">
            <h3 className="text-sm font-semibold text-[#F5EDD6] mb-4">Protocol Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">TVL</p>
                <p className="text-lg font-bold text-[#C8A84B]">${tvlFormatted}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">Positions</p>
                <p className="text-lg font-bold text-[#F5EDD6]">
                  {isLoading ? "—" : (totalPositions?.toString() ?? "0")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">AI Picks</p>
                <p className="text-lg font-bold text-[#4A7C59]">
                  {isLoading ? "—" : (totalRecommendations?.toString() ?? "0")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

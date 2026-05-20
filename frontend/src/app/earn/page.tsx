"use client";

import { VaultStats } from "@/components/VaultStats";
import { DepositCard } from "@/components/DepositCard";
import { StrategyRequest } from "@/components/StrategyRequest";
import { ProtocolCards } from "@/components/ProtocolCards";
import { TransactionHistory } from "@/components/TransactionHistory";
import { useVaultData } from "@/hooks/useVaultData";

export default function EarnPage() {
  const {
    tvlFormatted,
    totalPositions,
    totalRecommendations,
    isLoading,
  } = useVaultData();

  return (
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Earn</h1>
        <p className="mt-1 text-sm text-muted">
          Deposit stablecoins, let AI optimize your yield across Celo lending protocols
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <VaultStats
          tvl={`$${tvlFormatted}`}
          totalPositions={totalPositions?.toString() ?? "0"}
          totalRecommendations={totalRecommendations?.toString() ?? "0"}
          isLoading={isLoading}
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left - Deposit + Strategy */}
        <div className="lg:col-span-2 space-y-4">
          <DepositCard />
          <StrategyRequest />
        </div>

        {/* Right - Protocols + History */}
        <div className="lg:col-span-3 space-y-4">
          <ProtocolCards />
          <TransactionHistory />
        </div>
      </div>
    </main>
  );
}

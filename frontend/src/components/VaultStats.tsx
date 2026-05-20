"use client";

import { TrendingUp, Users, BarChart3, Shield } from "lucide-react";
import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatCard({ label, value, subValue, icon, accent }: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4 transition-all",
        accent
          ? "border-accent/20 bg-accent-dim animate-pulse-glow"
          : "border-border bg-card hover:border-border-light"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-dim">
          {icon}
        </div>
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-xl font-semibold tracking-tight">{value}</div>
      {subValue && (
        <div className="mt-0.5 text-xs text-muted">{subValue}</div>
      )}
    </div>
  );
}

interface VaultStatsProps {
  tvl: string;
  totalPositions: string;
  totalRecommendations: string;
  isLoading?: boolean;
}

export function VaultStats({
  tvl,
  totalPositions,
  totalRecommendations,
  isLoading,
}: VaultStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="skeleton h-4 w-16 mb-3 rounded" />
            <div className="skeleton h-6 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="TVL"
        value={tvl}
        subValue="Total Value Locked"
        icon={<TrendingUp className="h-3.5 w-3.5 text-accent" />}
        accent
      />
      <StatCard
        label="APY"
        value="AI-Optimized"
        subValue="Dynamic allocation"
        icon={<BarChart3 className="h-3.5 w-3.5 text-accent" />}
        accent
      />
      <StatCard
        label="Positions"
        value={totalPositions}
        subValue="Active deposits"
        icon={<Users className="h-3.5 w-3.5 text-accent" />}
      />
      <StatCard
        label="Strategies"
        value={totalRecommendations}
        subValue="AI executions"
        icon={<Shield className="h-3.5 w-3.5 text-accent" />}
      />
    </div>
  );
}

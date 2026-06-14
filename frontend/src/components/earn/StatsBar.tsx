"use client";

import { useAccount } from "wagmi";
import { useVaultData } from "@/hooks/useVaultData";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { Wallet, TrendingUp, DollarSign, PiggyBank, BarChart3 } from "lucide-react";

export function StatsBar() {
  const { address } = useAccount();
  const {
    userVaultBalanceFormatted,
    sharesInAssets,
    userPosition,
    totalDeployed,
    totalAssets,
    totalYieldEarned,
    yieldEarnedFormatted,
    deployedUsdFormatted,
    tokenDecimals,
    isLoading,
  } = useVaultData();

  const balance = userVaultBalanceFormatted ?? "0.00";

  // Compute APY from on-chain data: (totalYieldEarned / totalDeployed) * 100
  const currentAPY = useMemo(() => {
    if (!totalDeployed || totalDeployed === BigInt(0)) return "0.0";
    if (!totalYieldEarned || totalYieldEarned === BigInt(0)) return "0.0";
    const yieldNum = Number(formatUnits(totalYieldEarned, tokenDecimals));
    const deployedNum = Number(formatUnits(totalDeployed, tokenDecimals));
    if (deployedNum <= 0 || yieldNum <= 0) return "0.0";
    return ((yieldNum / deployedNum) * 100).toFixed(1);
  }, [totalYieldEarned, totalDeployed, tokenDecimals]);

  // User earnings = current value - deposited amount
  const deposited = userPosition?.depositAmount;
  const depositedFormatted = deposited
    ? (Number(deposited) / 10 ** tokenDecimals).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0.00";
  const earnings = sharesInAssets && deposited
    ? ((Number(sharesInAssets) - Number(deposited)) / 10 ** tokenDecimals).toFixed(2)
    : "0.00";

  const stats = [
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Your Balance",
      value: `$${balance}`,
      color: "text-accent",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Current APY",
      value: `${currentAPY}%`,
      color: "text-accent",
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Your Earnings",
      value: `$${earnings}`,
      color: "text-accent",
    },
    {
      icon: <PiggyBank className="h-4 w-4" />,
      label: "Total Deposited",
      value: `$${depositedFormatted}`,
      color: "text-foreground",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      label: "Protocol Yield",
      value: `$${yieldEarnedFormatted}`,
      color: "text-accent",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Deployed (USD)",
      value: `$${deployedUsdFormatted}`,
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 transition-colors hover:border-border-light"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-[10px] text-muted uppercase tracking-wider">{s.label}</p>
          </div>
          <p className={`text-lg font-bold ${s.color} truncate`}>
            {isLoading ? "—" : s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

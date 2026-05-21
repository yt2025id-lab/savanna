"use client";

import { useAccount } from "wagmi";
import { useVaultData } from "@/hooks/useVaultData";
import { Wallet, TrendingUp, DollarSign, PiggyBank } from "lucide-react";

export function StatsBar() {
  const { address } = useAccount();
  const {
    userVaultBalanceFormatted,
    sharesInAssets,
    userPosition,
    totalDeployed,
    totalAssets,
    isLoading,
  } = useVaultData();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "—";

  const balance = userVaultBalanceFormatted ?? "0.00";

  // Estimate APY from position (placeholder — chainlink oracle provides this)
  const currentAPY = "18.5";

  // Earnings = current value - deposited amount
  const deposited = userPosition?.depositAmount;
  const depositedFormatted = deposited
    ? (Number(deposited) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0.00";
  const earnings = sharesInAssets && deposited
    ? ((Number(sharesInAssets) - Number(deposited)) / 1e6).toFixed(2)
    : "0.00";

  const stats = [
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "Your Balance",
      value: `$${balance}`,
      color: "text-[#C8A84B]",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Current APY",
      value: `${currentAPY}%`,
      color: "text-[#4A7C59]",
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Your Earnings",
      value: `$${earnings}`,
      color: "text-[#C8A84B]",
    },
    {
      icon: <PiggyBank className="h-4 w-4" />,
      label: "Total Deposited",
      value: `$${depositedFormatted}`,
      color: "text-[#E8D5A3]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-[rgba(200,168,75,0.1)] bg-[#1A2E1C] p-4 flex items-start gap-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(200,168,75,0.1)]">
            <span className={s.color}>{s.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#E8D5A3] opacity-60">{s.label}</p>
            <p className={`text-lg font-bold ${s.color} truncate`}>
              {isLoading ? "—" : s.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

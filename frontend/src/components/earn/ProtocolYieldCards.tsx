"use client";

import { Shield, Droplets, Coins, CircleDot } from "lucide-react";
import clsx from "clsx";

type Protocol = {
  name: string;
  chain: string;
  type: string;
  description: string;
  apy: string;
  apyRange: [number, number];
  tvl: string;
  risk: "Low" | "Medium" | "High" | "Minimal";
  color: string;
  gradient: string;
  icon: React.ReactNode;
  assets: string[];
  url: string;
};

const PROTOCOLS: Protocol[] = [
  {
    name: "Aave V3",
    chain: "Celo",
    type: "Lending",
    description: "Blue-chip lending. Supply USDC or CELO for variable yield backed by over-collateralization.",
    apy: "3.2—8.5",
    apyRange: [3.2, 8.5],
    tvl: "$42.8M",
    risk: "Low",
    color: "#9b6dff",
    gradient: "from-[#9b6dff]/20 to-[#9b6dff]/0",
    icon: <Shield className="h-5 w-5" />,
    assets: ["USDC", "CELO", "cUSD"],
    url: "https://app.aave.com",
  },
  {
    name: "Moola",
    chain: "Celo",
    type: "Lending",
    description: "Native Celo lending market. Aave V2 fork with cUSD, CELO, and cEUR pools.",
    apy: "2.8—12.4",
    apyRange: [2.8, 12.4],
    tvl: "$18.2M",
    risk: "Medium",
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-[#f59e0b]/0",
    icon: <Droplets className="h-5 w-5" />,
    assets: ["cUSD", "CELO", "cEUR"],
    url: "https://moola.market",
  },
  {
    name: "Mento Savings",
    chain: "Celo",
    type: "Savings",
    description: "Native stablecoin savings. Deposit cUSD into Mento's ERC-4626 vault for governance-determined yield.",
    apy: "4.0—9.5",
    apyRange: [4.0, 9.5],
    tvl: "$8.6M",
    risk: "Low",
    color: "#fb6236",
    gradient: "from-[#fb6236]/20 to-[#fb6236]/0",
    icon: <Coins className="h-5 w-5" />,
    assets: ["cUSD"],
    url: "https://app.mento.finance",
  },
  {
    name: "Reserve",
    chain: "Celo",
    type: "Idle",
    description: "Vault idle strategy. Funds held safely on-chain as fallback, earning baseline yield with zero risk.",
    apy: "0—0.5",
    apyRange: [0, 0.5],
    tvl: "—",
    risk: "Minimal",
    color: "#22c55e",
    gradient: "from-[#22c55e]/20 to-[#22c55e]/0",
    icon: <CircleDot className="h-5 w-5" />,
    assets: ["USDC"],
    url: "#",
  },
];

const riskColors: Record<string, string> = {
  Minimal: "text-accent bg-accent-dim",
  Low: "text-info bg-[rgba(59,130,246,0.1)]",
  Medium: "text-warning bg-warning-dim",
  High: "text-danger bg-danger-dim",
};

function APYBar({ range, color }: { range: [number, number]; color: string }) {
  const min = 0;
  const max = 20;
  const left = ((range[0] - min) / (max - min)) * 100;
  const right = ((range[1] - min) / (max - min)) * 100;

  return (
    <div className="relative h-1.5 rounded-full bg-border overflow-hidden">
      <div
        className="absolute top-0 h-full rounded-full transition-all duration-700"
        style={{
          left: `${left}%`,
          width: `${right - left}%`,
          background: color,
          opacity: 0.7,
        }}
      />
      <div
        className="absolute top-0 h-full rounded-full animate-glow-pulse"
        style={{
          left: `${left}%`,
          width: `${right - left}%`,
          background: color,
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}

export function ProtocolYieldCards() {
  return (
    <div className="space-y-3">
      {PROTOCOLS.map((p, i) => (
        <div
          key={p.name}
          className={clsx(
            "group relative rounded-2xl border border-border bg-card overflow-hidden",
            "transition-all duration-300 hover:border-border-light hover:shadow-lg",
          )}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {/* Gradient glow on hover */}
          <div
            className={clsx(
              "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
              p.gradient,
            )}
          />

          <div className="relative p-4">
            {/* Top row: icon + name + badges */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${p.color}15`, borderColor: `${p.color}30` }}
              >
                <span style={{ color: p.color }}>{p.icon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {p.type}
                  </span>
                  <span className="rounded-full bg-background border border-border px-1.5 py-0.5 text-[10px] text-muted-light">
                    {p.chain}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted leading-relaxed line-clamp-2">
                  {p.description}
                </p>
              </div>

              {/* APY badge */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">APY</p>
                <p
                  className="text-base font-bold tabular-nums"
                  style={{ color: p.color }}
                >
                  {p.apy}%
                </p>
              </div>
            </div>

            {/* APY range bar */}
            <APYBar range={p.apyRange} color={p.color} />

            {/* Bottom row: assets + risk + tvl */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {p.assets.map((asset) => (
                  <span
                    key={asset}
                    className="rounded-md bg-background border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-light"
                  >
                    {asset}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {p.tvl !== "—" && (
                  <span className="text-[10px] text-muted">
                    TVL: <span className="text-muted-light font-medium">{p.tvl}</span>
                  </span>
                )}
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    riskColors[p.risk],
                  )}
                >
                  {p.risk}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

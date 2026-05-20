"use client";

import { Shield, TrendingUp } from "lucide-react";

const PROTOCOLS = [
  {
    name: "Aave V3",
    chain: "Celo",
    type: "Lending",
    description: "Blue-chip lending protocol. Supply USDC, USDm, or CELO for variable yield.",
    icon: <Shield className="h-4 w-4 text-blue-400" />,
    color: "blue",
    risk: "Low",
  },
  {
    name: "Reserve",
    chain: "Celo",
    type: "Idle",
    description: "Fallback idle strategy. Funds held safely in the vault contract.",
    icon: <TrendingUp className="h-4 w-4 text-yellow-400" />,
    color: "yellow",
    risk: "Minimal",
  },
];

export function ProtocolCards() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Supported Protocols</h3>
        <p className="text-xs text-muted mt-0.5">
          AI selects the best protocol for your strategy
        </p>
      </div>
      <div className="divide-y divide-border">
        {PROTOCOLS.map((p) => (
          <div
            key={p.name}
            className="flex items-start gap-3 p-4 transition-colors hover:bg-card-hover"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border">
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {p.type}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                {p.description}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-muted-light rounded-full bg-background border border-border px-2 py-0.5">
              {p.risk}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { getContracts } from "@/config/contracts";
import { Shield, TrendingUp, Users, Zap } from "lucide-react";

const VAULT_ABI_SHORT = [
  { name: "totalAssets", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalDeployed", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalPositions", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalYieldEarned", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "asset", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const ERC20_DEC = [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }];

export function LiveStatsBanner() {
  const contracts = getContracts(42220);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: totalAssets } = useReadContract({
    address: contracts.vault,
    abi: VAULT_ABI_SHORT,
    functionName: "totalAssets",
    chainId: 42220,
  });

  const { data: totalDeployed } = useReadContract({
    address: contracts.vault,
    abi: VAULT_ABI_SHORT,
    functionName: "totalDeployed",
    chainId: 42220,
  });

  const { data: totalPositions } = useReadContract({
    address: contracts.vault,
    abi: VAULT_ABI_SHORT,
    functionName: "totalPositions",
    chainId: 42220,
  });

  const { data: totalYieldEarned } = useReadContract({
    address: contracts.vault,
    abi: VAULT_ABI_SHORT,
    functionName: "totalYieldEarned",
    chainId: 42220,
  });

  const { data: assetAddr } = useReadContract({
    address: contracts.vault,
    abi: VAULT_ABI_SHORT,
    functionName: "asset",
    chainId: 42220,
  });

  const { data: decimals } = useReadContract({
    address: assetAddr as `0x${string}` | undefined,
    abi: ERC20_DEC,
    functionName: "decimals",
    query: { enabled: !!assetAddr },
    chainId: 42220,
  });

  const dec = typeof decimals === "number" ? decimals : 18;

  const fmt = (val: unknown) => {
    if (!val || typeof val !== "bigint" || val === BigInt(0)) return "—";
    const n = Number(formatUnits(val, dec));
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  const tvl = fmt(totalAssets);
  const deployed = totalDeployed && typeof totalDeployed === "bigint" && totalDeployed > BigInt(0)
    ? `${Number(formatUnits(totalDeployed, dec)).toFixed(1)}% deployed`
    : "—";
  const pos = totalPositions ? Number(totalPositions).toLocaleString() : "—";
  const yield_ = totalYieldEarned ? fmt(totalYieldEarned) : "—";

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.from(containerRef.current.querySelectorAll(".live-stat"), {
      scrollTrigger: { trigger: containerRef.current, start: "top 95%", toggleActions: "play none none none" },
      opacity: 0, y: 20, duration: 0.5, stagger: 0.08, ease: "power2.out",
    });
  }, { scope: containerRef });

  if (tvl === "—") return null;

  return (
    <div ref={containerRef} className="relative z-10 mx-auto max-w-6xl px-4 -mt-12 pb-12">
      <div className="rounded-2xl border border-accent/15 bg-gradient-to-r from-accent/5 via-card to-accent/5 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider">Live Vault Data</span>
          <span className="text-[10px] text-muted ml-auto">Celo Mainnet</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: <Shield className="h-4 w-4" />, label: "Total TVL", value: tvl },
            { icon: <TrendingUp className="h-4 w-4" />, label: "Deployed", value: deployed },
            { icon: <Users className="h-4 w-4" />, label: "Positions", value: pos },
            { icon: <Zap className="h-4 w-4" />, label: "Yield Earned", value: yield_ },
          ].map((stat) => (
            <div key={stat.label} className="live-stat flex items-center gap-3 rounded-xl bg-background/50 border border-border/50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-bold text-foreground tabular-nums truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

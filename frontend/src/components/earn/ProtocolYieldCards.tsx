"use client";

import { useReadContract, useAccount } from "wagmi";
import { Shield, Droplets, Coins, CircleDot } from "lucide-react";
import { getContracts } from "@/config/contracts";
import clsx from "clsx";

const STRATEGY_ABI = [
  { name: "getApy", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "protocolName", type: "function", stateMutability: "pure", inputs: [], outputs: [{ type: "string" }] },
  { name: "active", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { name: "ASSET", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

type ProtocolDef = {
  id: string;
  name: string;
  type: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
  risk: "Low" | "Medium" | "High" | "Minimal";
  assets: string[];
  url: string;
  strategyKey: keyof ReturnType<typeof getContracts>;
};

const chainLabel = "Celo";

const PROTOCOL_DEFS: ProtocolDef[] = [
  {
    id: "aave",
    name: "Aave V3",
    type: "Lending",
    description: "Blue-chip lending on Celo. Supply cUSD or CELO for variable yield backed by over-collateralization.",
    color: "#9b6dff",
    gradient: "from-[#9b6dff]/20 to-[#9b6dff]/0",
    icon: <Shield className="h-5 w-5" />,
    risk: "Low",
    assets: ["cUSD", "CELO"],
    url: "https://app.aave.com",
    strategyKey: "aaveStrategy",
  },
  {
    id: "moola",
    name: "Moola",
    type: "Lending",
    description: "Native Celo lending market. Aave V2 fork with cUSD, CELO, and cEUR pools.",
    color: "#f59e0b",
    gradient: "from-[#f59e0b]/20 to-[#f59e0b]/0",
    icon: <Droplets className="h-5 w-5" />,
    risk: "Medium",
    assets: ["cUSD", "CELO", "cEUR"],
    url: "https://moola.market",
    strategyKey: "moolaStrategy",
  },
  {
    id: "mento",
    name: "Mento Savings",
    type: "Savings",
    description: "Native stablecoin savings. Deposit cUSD into Mento's ERC-4626 vault for governance-determined yield.",
    color: "#fb6236",
    gradient: "from-[#fb6236]/20 to-[#fb6236]/0",
    icon: <Coins className="h-5 w-5" />,
    risk: "Low",
    assets: ["cUSD"],
    url: "https://app.mento.finance",
    strategyKey: "mentoSavingsStrategy",
  },
  {
    id: "reserve",
    name: "Reserve",
    type: "Idle",
    description: "Idle fallback — funds stay in the strategy contract, earning zero yield. Used when no lending protocol is active.",
    color: "#22c55e",
    gradient: "from-[#22c55e]/20 to-[#22c55e]/0",
    icon: <CircleDot className="h-5 w-5" />,
    risk: "Minimal",
    assets: ["cUSD"],
    url: "#",
    strategyKey: "reserveStrategy",
  },
];

function ProtocolCard({ def, apy, tvl, deployed, isZero }: {
  def: ProtocolDef;
  apy: string;
  tvl: string;
  deployed: boolean;
  isZero: boolean;
}) {
  return (
    <div
      className={clsx(
        "group relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-border-light hover:shadow-lg",
        !deployed && "opacity-60",
      )}
    >
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        def.gradient,
      )} />

      <div className="relative p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border"
            style={{ backgroundColor: `${def.color}15`, borderColor: `${def.color}30` }}
          >
            <span style={{ color: def.color }}>{def.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{def.name}</span>
              <span className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {def.type}
              </span>
              <span className="rounded-full bg-background border border-border px-1.5 py-0.5 text-[10px] text-muted-light">
                {chainLabel}
              </span>
              {isZero && (
                <span className="rounded-full bg-warning-dim px-1.5 py-0.5 text-[10px] font-medium text-warning">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted leading-relaxed line-clamp-2">
              {def.description}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">APY</p>
            <p className="text-base font-bold tabular-nums" style={{ color: def.color }}>
              {apy}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {def.assets.map((asset) => (
              <span
                key={asset}
                className="rounded-md bg-background border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-light"
              >
                {asset}
              </span>
            ))}
            {deployed && (
              <span className="text-[9px] text-muted font-mono">Deployed</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {tvl && (
              <span className="text-[10px] text-muted">
                TVL: <span className="text-muted-light font-medium">{tvl}</span>
              </span>
            )}
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                def.risk === "Minimal" && "text-accent bg-accent-dim",
                def.risk === "Low" && "text-info bg-[rgba(59,130,246,0.1)]",
                def.risk === "Medium" && "text-warning bg-warning-dim",
                def.risk === "High" && "text-danger bg-danger-dim",
              )}
            >
              {def.risk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtocolYieldCards() {
  const { chainId } = useAccount();
  const activeChainId = chainId ?? 42220;
  const contracts = getContracts(activeChainId);
  const isMainnet = activeChainId === 42220;

  const aaveAddr = contracts.aaveStrategy as `0x${string}` | undefined;
  const moolaAddr = contracts.moolaStrategy as `0x${string}` | undefined;
  const mentoAddr = contracts.mentoSavingsStrategy as `0x${string}` | undefined;
  const reserveAddr = contracts.reserveStrategy as `0x${string}` | undefined;

  const isAaveZero = !aaveAddr || aaveAddr === "0x0000000000000000000000000000000000000000";
  const isMoolaZero = !moolaAddr || moolaAddr === "0x0000000000000000000000000000000000000000";
  const isMentoZero = !mentoAddr || mentoAddr === "0x0000000000000000000000000000000000000000";
  const isReserveZero = !reserveAddr || reserveAddr === "0x0000000000000000000000000000000000000000";

  const { data: aaveApy } = useReadContract({
    address: aaveAddr,
    abi: STRATEGY_ABI,
    functionName: "getApy",
    query: { enabled: !isAaveZero && !!aaveAddr },
  });

  const { data: moolaApy } = useReadContract({
    address: moolaAddr,
    abi: STRATEGY_ABI,
    functionName: "getApy",
    query: { enabled: !isMoolaZero && !!moolaAddr },
  });

  const { data: mentoApy } = useReadContract({
    address: mentoAddr,
    abi: STRATEGY_ABI,
    functionName: "getApy",
    query: { enabled: !isMentoZero && !!mentoAddr },
  });

  const { data: reserveApy } = useReadContract({
    address: reserveAddr,
    abi: STRATEGY_ABI,
    functionName: "getApy",
    query: { enabled: !isReserveZero && !!reserveAddr },
  });

  const { data: vaultTotalDeployed } = useReadContract({
    address: contracts.vault,
    abi: [{ name: "totalDeployed", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
    functionName: "totalDeployed",
  });

  const { data: vaultTotalAssets } = useReadContract({
    address: contracts.vault,
    abi: [{ name: "totalAssets", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
    functionName: "totalAssets",
  });

  const fmtApy = (bps: bigint | undefined, fallback: string): string => {
    if (bps === undefined) return fallback;
    const pct = Number(bps) / 100;
    if (pct === 0) return fallback;
    return `${pct.toFixed(1)}%`;
  };

  const fmtTvl = (val: bigint | undefined): string => {
    if (!val) return "—";
    const n = Number(val) / 1e18;
    if (n === 0) return "—";
    if (n < 1) return `$${n.toFixed(2)}`;
    if (n < 1000) return `$${n.toFixed(0)}`;
    return `$${(n / 1000).toFixed(1)}K`;
  };

  const moolaApyVal = moolaApy as bigint | undefined;
  const aaveApyVal = aaveApy as bigint | undefined;
  const mentoApyVal = mentoApy as bigint | undefined;

  const aaveLabel = fmtApy(isAaveZero ? undefined : aaveApyVal, "—");
  const moolaLabel = fmtApy(isMoolaZero ? undefined : (moolaApyVal && moolaApyVal > BigInt(0) ? moolaApyVal : undefined), "—");
  const mentoLabel = fmtApy(isMentoZero ? undefined : mentoApyVal, "—");
  const reserveLabel = fmtApy(isReserveZero ? undefined : (reserveApy as bigint | undefined), "0%");
  const tvlLabel = fmtTvl(vaultTotalDeployed as bigint | undefined);

  const cards = [
    {
      def: PROTOCOL_DEFS[0],
      apy: aaveLabel,
      tvl: isAaveZero ? "—" : "$42.8M",
      deployed: !isAaveZero,
      isZero: isAaveZero,
    },
    {
      def: PROTOCOL_DEFS[1],
      apy: moolaLabel,
      tvl: tvlLabel,
      deployed: !isMoolaZero,
      isZero: isMoolaZero,
    },
    {
      def: PROTOCOL_DEFS[2],
      apy: mentoLabel,
      tvl: isMentoZero ? "—" : "$8.6M",
      deployed: !isMentoZero,
      isZero: isMentoZero,
    },
    {
      def: PROTOCOL_DEFS[3],
      apy: reserveLabel,
      tvl: tvlLabel,
      deployed: !isReserveZero,
      isZero: isReserveZero,
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((c, i) => (
        <div key={c.def.id} style={{ animationDelay: `${i * 0.08}s` }}>
          <ProtocolCard {...c} />
        </div>
      ))}
    </div>
  );
}

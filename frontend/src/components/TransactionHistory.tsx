"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ArrowDownToLine, ArrowUpFromLine, Zap, Clock } from "lucide-react";
import { clsx } from "clsx";
import { SAVANNA_VAULT_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";

interface TxEntry {
  type: "deposit" | "withdraw" | "strategy" | "pending";
  amount: string;
  timestamp: string;
  status: "confirmed" | "pending";
  hash?: string;
  protocol?: string;
}

export function TransactionHistory() {
  const { isConnected, address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 11142220;
  const contracts = getContracts(chainId);

  // Read user position for activity display
  const { data: userPosition } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "getUserPosition",
    args: address ? [address] : undefined,
  });

  const { data: hasActiveRequest } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "hasActiveRequest",
    args: address ? [address] : undefined,
  });

  if (!isConnected || !address) return null;

  // Build activity entries from on-chain position data
  const entries: TxEntry[] = [];

  const pos = userPosition as any;
  if (pos) {
    // If user has a deposit, show it
    if (pos.depositAmount && pos.depositAmount > BigInt(0)) {
      entries.push({
        type: "deposit",
        amount: Number(formatUnits(pos.depositAmount, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
        timestamp: pos.depositTimestamp > BigInt(0)
          ? new Date(Number(pos.depositTimestamp) * 1000).toLocaleDateString()
          : "—",
        status: "confirmed",
      });
    }

    // If strategy is active
    if (pos.isActive && pos.allocatedAmount > BigInt(0)) {
      entries.push({
        type: "strategy",
        amount: Number(formatUnits(pos.allocatedAmount, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
        timestamp: pos.depositTimestamp > BigInt(0)
          ? new Date(Number(pos.depositTimestamp) * 1000).toLocaleDateString()
          : "—",
        status: "confirmed",
        protocol: pos.activeStrategy !== "0x0000000000000000000000000000000000000000"
          ? `${pos.activeStrategy.slice(0, 6)}...`
          : undefined,
      });
    }
  }

  // If user has active request, show pending
  if (hasActiveRequest) {
    entries.push({
      type: "pending",
      amount: "—",
      timestamp: "Now",
      status: "pending",
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Activity</h3>
        <span className="text-[10px] text-muted">Recent transactions</span>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card-hover mx-auto mb-3">
            <Clock className="h-4 w-4 text-muted" />
          </div>
          <p className="text-xs text-muted">No transactions yet</p>
          <p className="text-[10px] text-muted/60 mt-1">
            Make your first deposit to get started
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((tx, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 hover:bg-card-hover transition-colors"
            >
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  tx.type === "deposit" && "bg-accent-dim",
                  tx.type === "withdraw" && "bg-warning-dim",
                  tx.type === "strategy" && "bg-[rgba(59,130,246,0.1)]",
                  tx.type === "pending" && "bg-accent-dim"
                )}
              >
                {(tx.type === "deposit" || tx.type === "withdraw") &&
                  (tx.type === "deposit" ? (
                    <ArrowDownToLine className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-warning" />
                  ))}
                {(tx.type === "strategy" || tx.type === "pending") && (
                  <Zap className="h-3.5 w-3.5 text-info" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium capitalize">
                    {tx.type === "strategy" ? "Strategy Deployed" : tx.type === "pending" ? "Pending Request" : tx.type}
                  </span>
                  {tx.protocol && (
                    <span className="text-[10px] text-accent bg-accent-dim px-1.5 py-0.5 rounded-full">
                      {tx.protocol}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted">{tx.timestamp}</span>
              </div>
              <div className="text-right">
                <span
                  className={clsx(
                    "text-xs font-medium",
                    tx.type === "deposit" ? "text-accent" : "text-foreground"
                  )}
                >
                  {tx.type === "deposit" ? "+" : tx.type === "withdraw" ? "-" : ""}
                  {tx.amount} USDC
                </span>
                <div className="text-[10px] text-muted">
                  {tx.status === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownToLine, ArrowUpFromLine, Zap, Clock } from "lucide-react";
import { clsx } from "clsx";

interface TxEntry {
  type: "deposit" | "withdraw" | "strategy" | "pending";
  amount: string;
  timestamp: string;
  status: "confirmed" | "pending";
  hash?: string;
  protocol?: string;
}

export function TransactionHistory() {
  const { isConnected } = useAccount();

  // This would be populated from on-chain events or indexer
  // For now showing a placeholder
  const [entries] = useState<TxEntry[]>([]);

  if (!isConnected) return null;

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
                    {tx.type === "strategy" ? "Strategy Deployed" : tx.type}
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

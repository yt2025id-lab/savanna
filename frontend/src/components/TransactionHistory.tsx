"use client";

import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { ArrowDownToLine, ArrowUpFromLine, Zap, Clock, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { SAVANNA_VAULT_ABI } from "@/config/abis";
import { getContracts, getTxUrl } from "@/config/contracts";
import { useEffect, useState } from "react";

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
  const chainId = activeChainId ?? 42220;
  const isMainnet = chainId === 42220;
  const contracts = getContracts(chainId);
  const publicClient = usePublicClient({ chainId });
  const vaultSymbol = isMainnet ? "cUSD" : "USDC";
  const [eventEntries, setEventEntries] = useState<TxEntry[]>([]);

  // Read user position
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

  function fmtTimestamp(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  // Read vault asset decimals
  const [tokenDecimals, setTokenDecimals] = useState(6);
  useEffect(() => {
    if (!publicClient || !contracts.vault) return;
    const fetchDecimals = async () => {
      try {
        const asset = await publicClient.readContract({
          address: contracts.vault,
          abi: SAVANNA_VAULT_ABI,
          functionName: "asset",
        });
        const decimals = await publicClient.readContract({
          address: asset as `0x${string}`,
          abi: [{ type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }] }],
          functionName: "decimals",
        });
        setTokenDecimals(Number(decimals));
      } catch { /* keep default 6 */ }
    };
    fetchDecimals();
  }, [publicClient, contracts.vault]);

  // Fetch on-chain events
  useEffect(() => {
    if (!address || !publicClient || !contracts.vault) return;

    const fetchEvents = async () => {
      try {
        const depositedLogs = await publicClient.getLogs({
          address: contracts.vault,
          event: {
            type: "event",
            name: "Deposited",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "amount", indexed: false },
              { type: "uint256", name: "shares", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        const withdrawnLogs = await publicClient.getLogs({
          address: contracts.vault,
          event: {
            type: "event",
            name: "Withdrawn",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "amount", indexed: false },
              { type: "uint256", name: "shares", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        const strategyLogs = await publicClient.getLogs({
          address: contracts.vault,
          event: {
            type: "event",
            name: "StrategyRequested",
            inputs: [
              { type: "address", name: "user", indexed: true },
              { type: "uint256", name: "depositAmount", indexed: false },
              { type: "uint256", name: "timeHorizon", indexed: false },
              { type: "uint256", name: "timestamp", indexed: false },
            ],
          },
          args: { user: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });

        const allLogs = [...depositedLogs, ...withdrawnLogs, ...strategyLogs];
        const blockCache = new Map<bigint, number>();
        const uniqueBlocks = new Set(allLogs.map(l => l.blockNumber));
        await Promise.all(
          [...uniqueBlocks].map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockCache.set(bn, Number(block.timestamp) * 1000);
            } catch { /* skip */ }
          })
        );

        const entries: TxEntry[] = [];

        for (const log of depositedLogs) {
          const { transactionHash, args, blockNumber } = log;
          const ts = blockCache.get(blockNumber);
          entries.push({
            type: "deposit",
            amount: args.amount
              ? Number(formatUnits(args.amount, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "—",
            timestamp: ts ? fmtTimestamp(ts) : "—",
            status: "confirmed",
            hash: transactionHash,
          });
        }

        for (const log of withdrawnLogs) {
          const { transactionHash, args, blockNumber } = log;
          const ts = blockCache.get(blockNumber);
          entries.push({
            type: "withdraw",
            amount: args.amount
              ? Number(formatUnits(args.amount, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "—",
            timestamp: ts ? fmtTimestamp(ts) : "—",
            status: "confirmed",
            hash: transactionHash,
          });
        }

        for (const log of strategyLogs) {
          const { transactionHash, args } = log;
          entries.push({
            type: "strategy",
            amount: args.depositAmount
              ? Number(formatUnits(args.depositAmount, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "—",
            timestamp: args.timestamp
              ? fmtTimestamp(Number(args.timestamp) * 1000)
              : "—",
            status: "confirmed",
            hash: transactionHash,
          });
        }

        setEventEntries(entries);
      } catch {
        // Fallback: show position-based entries
      }
    };

    fetchEvents();
  }, [address, publicClient, contracts.vault, tokenDecimals]);

  if (!isConnected || !address) return null;

  const pos = userPosition as any;
  const positionEntries: TxEntry[] = [];

  if (pos?.depositAmount && pos.depositAmount > BigInt(0)) {
    positionEntries.push({
      type: "deposit",
      amount: Number(formatUnits(pos.depositAmount, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      timestamp: pos.depositTimestamp > BigInt(0)
        ? fmtTimestamp(Number(pos.depositTimestamp) * 1000)
        : "—",
      status: "confirmed",
    });
  }

  if (pos?.isActive && pos?.allocatedAmount > BigInt(0)) {
    positionEntries.push({
      type: "strategy",
      amount: Number(formatUnits(pos.allocatedAmount, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      timestamp: pos.depositTimestamp > BigInt(0)
        ? fmtTimestamp(Number(pos.depositTimestamp) * 1000)
        : "—",
      status: "confirmed",
      protocol: pos.activeStrategy !== "0x0000000000000000000000000000000000000000"
        ? `${pos.activeStrategy.slice(0, 6)}...`
        : undefined,
    });
  }

  if (hasActiveRequest) {
    positionEntries.push({
      type: "pending",
      amount: "—",
      timestamp: "Now",
      status: "pending",
    });
  }

  // Use event-sourced entries if available, fall back to position-based
  const entries = eventEntries.length > 0 ? eventEntries : positionEntries;

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
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">{tx.timestamp}</span>
                  {tx.hash && (
                    <a
                      href={getTxUrl(tx.hash, chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
                    >
                      {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={clsx(
                    "text-xs font-medium",
                    tx.type === "deposit" ? "text-accent" : "text-foreground"
                  )}
                >
                  {tx.type === "deposit" ? "+" : tx.type === "withdraw" ? "-" : ""}
                  {tx.amount} {vaultSymbol}
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

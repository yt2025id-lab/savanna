"use client";

import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { useVaultData } from "@/hooks/useVaultData";
import { getContracts, getAddressUrl } from "@/config/contracts";
import { SAVANNA_CONTROLLER_ABI } from "@/config/abis";
import { useState, useCallback, useEffect } from "react";
import {
  Wallet,
  Shield,
  Zap,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Loader2,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/components/AuthModal";

const CELO_PRICE_USD = 0.50;

const PROTOCOL_NAMES: Record<string, string> = {
  "0xf49c062ff27689845e1614d740a0636f2049ce9e": "Aave V3",
  "0x14a25285ae30e45cf9ebc6179ba36353be980f7e": "Reserve",
  "0xcbcec5a5c17797c601b1f747a3977423397c904e": "Moola",
  "0xff8433711abd603b3c9a07cfa51a4b157ec300e9": "Reserve",
};

export default function PortfolioPage() {
  const { address, chainId } = useAccount();
  const activeChainId = chainId ?? 42220;
  const contracts = getContracts(activeChainId);
  const isMainnet = activeChainId === 42220;
  const chainLabel = isMainnet ? "Celo Mainnet" : "Celo Sepolia";
  const vaultSymbol = isMainnet ? "cUSD" : "USDC";
  const { isAuthed, login } = useAuth();

  const {
    userShares,
    sharesInAssets,
    userPosition,
    tokenDecimals,
    tokenSymbol,
    isLoading,
    tokenBalance,
  } = useVaultData();

  const { data: celoBalance } = useBalance({ address, chainId: activeChainId });

  const depositAmount = userPosition?.depositAmount as bigint | undefined;
  const allocatedAmount = userPosition?.allocatedAmount as bigint | undefined;
  const isActive = userPosition?.isActive as boolean | undefined;
  const activeStrategy = userPosition?.activeStrategy as `0x${string}` | undefined;
  const timeHorizon = userPosition?.timeHorizon as bigint | undefined;
  const depositTs = userPosition?.depositTimestamp as bigint | undefined;
  const hasPosition = userShares !== undefined && userShares > BigInt(0);

  const walletUsdc = tokenBalance ? Number(formatUnits(tokenBalance, tokenDecimals)) : 0;
  const vaultValueUsd = sharesInAssets
    ? Number(formatUnits(sharesInAssets, tokenDecimals)) * 1
    : 0;
  const celoNum = celoBalance ? Number(celoBalance.value) / 10 ** (celoBalance.decimals ?? 18) : 0;
  const celoValueUsd = celoNum * CELO_PRICE_USD;
  const totalPortfolioUsd = vaultValueUsd + celoValueUsd;

  const earnings = sharesInAssets && depositAmount
    ? Number(formatUnits(sharesInAssets, tokenDecimals)) - Number(formatUnits(depositAmount, tokenDecimals))
    : 0;

  const protocolName = activeStrategy
    ? PROTOCOL_NAMES[activeStrategy.toLowerCase()] ?? `${activeStrategy.slice(0, 6)}...`
    : undefined;

  // Withdraw from strategy
  const {
    writeContract: withdrawStrategyWrite,
    data: withdrawStrategyHash,
    isPending: withdrawStrategyPending,
  } = useWriteContract();

  const { isLoading: withdrawStrategyConfirming, isSuccess: withdrawStrategySuccess } =
    useWaitForTransactionReceipt({ hash: withdrawStrategyHash, query: { enabled: !!withdrawStrategyHash } });

  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawDone, setWithdrawDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (withdrawStrategySuccess && withdrawing) {
      setWithdrawing(false);
      setWithdrawDone(true);
      setTimeout(() => setWithdrawDone(false), 3000);
    }
  }, [withdrawStrategySuccess]);

  const handleWithdraw = useCallback(() => {
    if (!address) return;
    setErrorMsg("");
    setWithdrawing(true);
    withdrawStrategyWrite({
      address: contracts.controller,
      abi: SAVANNA_CONTROLLER_ABI,
      functionName: "withdrawFromStrategy",
      args: [address],
    }, {
      onError: (err) => {
        setErrorMsg(err.message.slice(0, 120));
        setWithdrawing(false);
      },
    });
  }, [address, contracts, withdrawStrategyWrite]);

  const fmt = (val: bigint | undefined) => {
    if (!val) return "0.00";
    return Number(formatUnits(val, tokenDecimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  };

  const fmtUsd = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtTs = (ts: bigint | undefined) => {
    if (!ts) return "—";
    const d = new Date(Number(ts) * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const isWithdrawBusy = withdrawing || withdrawStrategyPending || withdrawStrategyConfirming;

  return (
    <main className="relative flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-80 w-96 rounded-full bg-accent/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute -bottom-20 right-1/4 h-60 w-72 rounded-full bg-info/5 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {!isAuthed && (
        <div className="relative mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-dim px-4 py-3 animate-fade-in">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-light flex-1">Connect wallet to view portfolio.</p>
          <button onClick={login} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-background hover:bg-accent-hover transition-colors">
            Connect
          </button>
        </div>
      )}

      {/* Portfolio Value Hero */}
      <div className="relative rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-info/5 p-6 mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Portfolio Value</p>
            <p className="text-4xl font-bold text-accent tabular-nums">
              {isAuthed ? `$${fmtUsd(totalPortfolioUsd)}` : "$0.00"}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted">{chainLabel}</span>
              {isAuthed && hasPosition && (
                <span className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[9px] font-bold text-[#22c55e]">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Active
                </span>
              )}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 animate-pulse-glow">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
        </div>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-5">

          {/* Vault Positions — real on-chain data */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                Vault Positions
              </h2>
              {isAuthed && (
                <a href="/earn" className="text-[10px] text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
                  Deposit <ArrowRight className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            {!isAuthed ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim">
                  <Wallet className="h-7 w-7 text-muted" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Wallet not connected</p>
                <p className="text-xs text-muted">Connect and sign in to view your positions.</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : !hasPosition ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-info/10 border border-accent/20">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No vault positions yet</p>
                <p className="text-xs text-muted mb-4">Deposit on the Earn page to start earning yield with AI optimization.</p>
                <a
                  href="/earn"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
                >
                  Start Earning <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-background border border-border p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Asset</p>
                      <p className="text-sm font-semibold text-foreground">{tokenSymbol}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Deposited</p>
                      <p className="text-sm font-semibold text-foreground">{fmt(depositAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Current Value</p>
                      <p className="text-sm font-semibold text-accent">{fmt(sharesInAssets)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Earnings</p>
                      <p className={clsx("text-sm font-semibold", earnings >= 0 ? "text-accent" : "text-danger")}>
                        {earnings >= 0 ? "+" : ""}{fmtNum(earnings)} {tokenSymbol}
                      </p>
                    </div>
                  </div>

                  {/* Strategy status */}
                  {isActive && activeStrategy ? (
                    <div className="rounded-lg bg-accent-dim/50 border border-accent/20 p-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-3.5 w-3.5 text-accent" />
                        <span className="text-xs font-semibold text-accent">Strategy Active</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted">Protocol</span>
                          <p className="text-foreground font-medium">{protocolName ?? "Unknown"}</p>
                        </div>
                        <div>
                          <span className="text-muted">Allocated</span>
                          <p className="text-foreground font-medium">{fmt(allocatedAmount)} {tokenSymbol}</p>
                        </div>
                        {timeHorizon && (
                          <div>
                            <span className="text-muted">Duration</span>
                            <p className="text-foreground font-medium">
                              {Math.floor(Number(timeHorizon) / 86400)} days
                            </p>
                          </div>
                        )}
                        {depositTs && (
                          <div>
                            <span className="text-muted">Deployed</span>
                            <p className="text-foreground font-medium">{fmtTs(depositTs)}</p>
                          </div>
                        )}
                      </div>
                      {activeStrategy && (
                        <a
                          href={getAddressUrl(activeStrategy, activeChainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-[10px] text-accent hover:underline"
                        >
                          {activeStrategy.slice(0, 6)}...{activeStrategy.slice(-4)}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  ) : null}

                  {/* Warning if strategy active — withdraw needs 2 steps */}
                  {isActive && (
                    <div className="flex items-start gap-2 rounded-lg bg-warning-dim p-2.5 mb-3">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <p className="text-[11px] text-warning/80">
                        Funds are deployed. Use withdraw below to pull from strategy first.
                      </p>
                    </div>
                  )}

                  {/* Withdraw button */}
                  {isActive ? (
                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawBusy}
                      className={clsx(
                        "w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                        withdrawDone
                          ? "bg-accent-dim text-accent border border-accent/30"
                          : isWithdrawBusy
                          ? "bg-card text-accent/50 cursor-wait"
                          : "bg-warning text-white hover:opacity-90"
                      )}
                    >
                      {withdrawDone ? (
                        <><CheckCircle2 className="h-4 w-4" /> Withdrawn!</>
                      ) : isWithdrawBusy ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Withdrawing from strategy...</>
                      ) : (
                        <><LogOut className="h-4 w-4" /> Withdraw from Strategy</>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-card text-muted border border-border cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Withdraw
                    </button>
                  )}
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-lg bg-danger-dim border border-danger/30 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                    <p className="text-xs text-danger">{errorMsg}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wallet Balances */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" />
                Wallet Balances
              </h2>
              <span className="text-[10px] text-muted">{chainLabel}</span>
            </div>

            {isAuthed ? (
              <div className="space-y-3">
                <BalanceRow
                  icon={<USDCMini />}
                  symbol={tokenSymbol || vaultSymbol}
                  name="Wallet"
                  balance={fmtNum(walletUsdc)}
                  usdText={`$${fmtUsd(walletUsdc)}`}
                />
                {hasPosition && (
                  <BalanceRow
                    icon={<ShieldMini />}
                    symbol={tokenSymbol || vaultSymbol}
                    name="Vault Position"
                    balance={fmtNum(vaultValueUsd)}
                    usdText={`$${fmtUsd(vaultValueUsd)}`}
                  />
                )}
                <BalanceRow
                  icon={<CeloMini />}
                  symbol="CELO"
                  name="Celo Native"
                  balance={celoNum.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  usdText={`$${fmtUsd(celoValueUsd)}`}
                />
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xl font-bold text-muted">$0.00</p>
                <p className="text-[10px] text-muted mt-1">Connect wallet to view balances</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column — simple stats */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Stats */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-foreground mb-3">Protocol Stats</h3>
            <div className="space-y-2">
              <StatRow label="Total Positions" value={isAuthed && hasPosition ? "1" : "—"} />
              <StatRow label="Strategy" value={isActive ? (protocolName ?? "Active") : "—"} />
              <StatRow label="Deposited" value={isAuthed ? `${fmt(depositAmount)} ${tokenSymbol}` : "—"} />
              <StatRow label="Allocated" value={isAuthed && isActive ? `${fmt(allocatedAmount)} ${tokenSymbol}` : "—"} />
            </div>
          </div>

          {/* Shortcut */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
            <div className="space-y-2">
              <a
                href="/earn"
                className="flex items-center gap-2 rounded-xl bg-accent-dim px-3 py-2.5 text-xs font-medium text-accent hover:bg-accent-dim/80 transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Deposit & Earn
                <ArrowRight className="h-3 w-3 ml-auto" />
              </a>
              <a
                href={getAddressUrl(contracts.vault, activeChainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-background border border-border px-3 py-2.5 text-xs font-medium text-foreground hover:border-accent/30 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted" />
                View Vault on CeloScan
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function BalanceRow({ icon, symbol, name, balance, usdText }: {
  icon: React.ReactNode; symbol: string; name: string; balance: string; usdText: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background p-3.5 border border-transparent hover:border-border transition-colors">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{symbol}</p>
        <p className="text-[10px] text-muted">{name}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-foreground">{balance}</p>
        <p className="text-[10px] text-muted">{usdText}</p>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[11px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function USDCMini() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#2775CA20" }}>
      <svg width="18" height="18" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#2775CA" /><path d="M24 17.5C24 15.5 22.5 14.5 20 14.2V12H18V14.1C15.5 14.4 14 15.7 14 17.7C14 20.2 16 21 18.5 21.5L20 21.9V26.5C17.8 26.2 16.5 25 16.5 23.2H14.5C14.5 25.8 16.3 27.5 18 27.8V30H20V27.9C22.5 27.6 24 26.2 24 24C24 21.7 22.2 20.7 19.5 20.1L18 19.7V15.5C19.8 15.7 21 16.6 21 17.5H24Z" fill="white" /></svg>
    </div>
  );
}

function CeloMini() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#35D07F20" }}>
      <svg width="18" height="18" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#35D07F" /><circle cx="16" cy="20" r="6" stroke="white" strokeWidth="2" fill="none" /><circle cx="24" cy="20" r="6" stroke="white" strokeWidth="2" fill="none" /></svg>
    </div>
  );
}

function ShieldMini() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#22c55e20" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    </div>
  );
}

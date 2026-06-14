"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { SAVANNA_VAULT_ABI, SAVANNA_CONTROLLER_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { useVaultData } from "@/hooks/useVaultData";
import { ListChecks, Loader2, AlertCircle, CheckCircle2, ArrowUpFromLine, AlertTriangle, Wallet } from "lucide-react";
import clsx from "clsx";

type WithdrawStep = "idle" | "strategyWithdraw" | "vaultWithdraw" | "done";

export function ActivePositions() {
  const { address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 42220;
  const contracts = getContracts(chainId);
  const { userShares, sharesInAssets, userPosition, tokenDecimals, isLoading, tokenSymbol } = useVaultData();

  const [step, setStep] = useState<WithdrawStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const stepRef = useRef(step);
  const withdrawAmountRef = useRef(withdrawAmount);
  stepRef.current = step;
  withdrawAmountRef.current = withdrawAmount;

  // Withdraw from vault (ERC-4626)
  const {
    writeContract: withdrawWrite,
    data: withdrawHash,
    isPending: withdrawPending,
  } = useWriteContract();

  // Withdraw from strategy (controller)
  const {
    writeContract: withdrawStrategyWrite,
    data: withdrawStrategyHash,
    isPending: withdrawStrategyPending,
  } = useWriteContract();

  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
    query: { enabled: !!withdrawHash },
  });

  const { isLoading: withdrawStrategyConfirming, isSuccess: withdrawStrategySuccess } = useWaitForTransactionReceipt({
    hash: withdrawStrategyHash,
    query: { enabled: !!withdrawStrategyHash },
  });

  // Read max withdrawable (capped by idle balance if no active strategy)
  const { data: maxWithdrawRaw } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "maxWithdraw",
    args: address ? [address] : undefined,
  });
  const maxWithdraw = maxWithdrawRaw as bigint | undefined;

  // Max amount (lower of maxWithdraw and sharesInAssets)
  const maxAmt = maxWithdraw && sharesInAssets
    ? (maxWithdraw < sharesInAssets ? maxWithdraw : sharesInAssets)
    : (sharesInAssets ?? BigInt(0));

  // Capture the chosen amount at strategy withdraw time to avoid race conditions
  const pendingWithdrawAmount = useRef<bigint>(BigInt(0));

  // After strategy withdraw confirms, auto-trigger vault withdraw
  useEffect(() => {
    if (withdrawStrategySuccess && stepRef.current === "strategyWithdraw") {
      setStep("vaultWithdraw");
      const chosen = pendingWithdrawAmount.current;
      const timer = setTimeout(() => {
        if (!address || !sharesInAssets || !chosen || chosen === BigInt(0)) return;
        withdrawWrite(
          {
            address: contracts.vault,
            abi: SAVANNA_VAULT_ABI,
            functionName: "withdraw",
            args: [chosen, address, address],
          },
          {
            onError: (err) => {
              setErrorMsg(err.message.slice(0, 120));
              setStep("idle");
            },
          },
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [withdrawStrategySuccess, address, sharesInAssets, tokenDecimals, contracts, withdrawWrite]);

  // After vault withdraw confirms
  useEffect(() => {
    if (withdrawSuccess && stepRef.current === "vaultWithdraw") {
      setStep("done");
      const timer = setTimeout(() => setStep("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [withdrawSuccess]);

  const handleWithdraw = useCallback(() => {
    if (!address) return;
    if (!maxAmt || maxAmt === BigInt(0)) return;
    const amtStr = withdrawAmountRef.current;
    const chosen = amtStr && !isNaN(Number(amtStr)) && Number(amtStr) > 0
      ? parseUnits(amtStr, tokenDecimals)
      : maxAmt;
    if (!chosen || chosen === BigInt(0)) return;
    if (chosen > maxAmt) { setErrorMsg("Amount exceeds available balance"); return; }
    setErrorMsg("");
    setStep("vaultWithdraw");
    withdrawWrite(
      {
        address: contracts.vault,
        abi: SAVANNA_VAULT_ABI,
        functionName: "withdraw",
        args: [chosen, address, address],
      },
      {
        onError: (err) => {
          setErrorMsg(err.message.slice(0, 120));
          setStep("idle");
        },
      },
    );
  }, [address, maxAmt, tokenDecimals, contracts, withdrawWrite]);

  const handleWithdrawFromStrategy = useCallback(() => {
    if (!address) return;
    setErrorMsg("");
    setStep("strategyWithdraw");
    // Capture the current max amount for post-strategy-withdraw vault withdraw
    const amtStr = withdrawAmountRef.current;
    const chosen = amtStr && !isNaN(Number(amtStr)) && Number(amtStr) > 0
      ? parseUnits(amtStr, tokenDecimals)
      : maxAmt;
    pendingWithdrawAmount.current = chosen;
    withdrawStrategyWrite(
      {
        address: contracts.controller,
        abi: SAVANNA_CONTROLLER_ABI,
        functionName: "withdrawFromStrategy",
        args: [address],
      },
      {
        onError: (err) => {
          setErrorMsg(err.message.slice(0, 120));
          setStep("idle");
        },
      },
    );
  }, [address, maxAmt, tokenDecimals, contracts, withdrawStrategyWrite]);

  const hasPosition = userShares && userShares > BigInt(0);
  const isActive = userPosition?.isActive;

  const fmt = (val: bigint | undefined | null) => {
    if (!val) return "0.00";
    return (Number(formatUnits(val, tokenDecimals))).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const earningsValue = sharesInAssets && userPosition?.depositAmount
    ? (Number(formatUnits(sharesInAssets, tokenDecimals)) -
       Number(formatUnits(userPosition.depositAmount, tokenDecimals)))
    : 0;

  const isBusy = step === "strategyWithdraw" || step === "vaultWithdraw";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ListChecks className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-foreground">Active Positions</h2>
      </div>

      <div className="p-5">
        {!address ? (
          <p className="text-sm text-muted text-center py-8">
            Connect wallet to view positions
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !hasPosition ? (
          <p className="text-sm text-muted text-center py-8">
            No active positions. Deposit to start earning yield.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Position row */}
            <div className="rounded-xl bg-background border border-border p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Asset</p>
                  <p className="text-sm font-semibold text-foreground">{tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Deposited</p>
                  <p className="text-sm font-semibold text-foreground">{fmt(userPosition?.depositAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Current Value</p>
                  <p className="text-sm font-semibold text-accent">{fmt(sharesInAssets)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider">Earnings</p>
                  <p className={clsx(
                    "text-sm font-semibold",
                    earningsValue >= 0 ? "text-accent" : "text-danger"
                  )}>
                    {earningsValue >= 0 ? "+" : ""}{earningsValue.toFixed(2)} {tokenSymbol}
                  </p>
                </div>
              </div>

              {/* Strategy info — single, clean */}
              {isActive && userPosition?.activeStrategy && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[11px] text-accent font-medium">Strategy active</span>
                  <span className="text-[10px] text-muted font-mono">
                    ({userPosition.activeStrategy.slice(0, 6)}...{userPosition.activeStrategy.slice(-4)})
                  </span>
                </div>
              )}

              {/* Warning if strategy active */}
              {isActive && (
                <div className="flex items-start gap-2 rounded-lg bg-warning-dim p-2.5 mb-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <p className="text-[11px] text-warning/80">
                    Funds are deployed in a strategy. Withdraw will pull funds from the strategy first.
                  </p>
                </div>
              )}

              {/* Withdraw amount input */}
              {step !== "done" && !isBusy && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted">Withdraw Amount</label>
                    <button
                      onClick={() => {
                        if (maxAmt) setWithdrawAmount(formatUnits(maxAmt, tokenDecimals));
                      }}
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >
                      Max: {fmt(maxAmt)}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => { setWithdrawAmount(e.target.value); setErrorMsg(""); }}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 pr-14 text-base text-foreground placeholder-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
                      disabled={isBusy}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-accent">
                      {tokenSymbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Withdraw button */}
              <button
                onClick={isActive ? handleWithdrawFromStrategy : handleWithdraw}
                disabled={isBusy || !sharesInAssets}
                className={clsx(
                  "w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                  step === "done"
                    ? "bg-accent-dim text-accent border border-accent/30"
                    : isBusy
                    ? "bg-card text-accent/50 cursor-wait"
                    : isActive
                    ? "bg-warning text-white hover:opacity-90"
                    : "bg-card text-accent border border-border hover:border-accent/30 hover:bg-card-hover"
                )}
              >
                {step === "done" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Withdrawn!
                  </>
                ) : step === "strategyWithdraw" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Withdrawing from strategy...
                  </>
                ) : step === "vaultWithdraw" && !isActive ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Withdrawing...
                  </>
                ) : step === "vaultWithdraw" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing withdrawal...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="h-4 w-4" />
                    {isActive ? "Withdraw from Strategy" : "Withdraw"}
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg bg-danger-dim border border-danger/30 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                <p className="text-xs text-danger">{errorMsg}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

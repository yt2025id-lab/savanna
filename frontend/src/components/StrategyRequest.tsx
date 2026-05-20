"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { Loader2, CheckCircle2, Zap, Clock, ArrowRight, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { useVaultData } from "@/hooks/useVaultData";
import { useToast } from "@/components/Toast";
import { SAVANNA_VAULT_ABI, SAVANNA_CONTROLLER_ABI } from "@/config/abis";

const TIME_OPTIONS = [
  { label: "7 Days", value: 7 * 24 * 60 * 60 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 },
  { label: "90 Days", value: 90 * 24 * 60 * 60 },
  { label: "180 Days", value: 180 * 24 * 60 * 60 },
] as const;

export function StrategyRequest() {
  const { isConnected, address } = useAccount();
  const {
    userPosition,
    hasActiveRequest,
    contracts,
    tokenDecimals,
    tokenSymbol,
  } = useVaultData();
  const { addToast } = useToast();
  const [selectedTime, setSelectedTime] = useState<number>(TIME_OPTIONS[1].value);

  const hasPosition = userPosition?.isActive;
  const hasRequest = hasActiveRequest;

  // Request strategy
  const {
    writeContract: requestStrategy,
    data: requestHash,
    isPending: requestPending,
    error: requestError,
    reset: resetRequest,
  } = useWriteContract();

  // Withdraw from strategy
  const {
    writeContract: withdrawFromStrategy,
    data: withdrawHash,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();

  // Cancel timed out request
  const {
    writeContract: cancelRequest,
    data: cancelHash,
    isPending: cancelPending,
    error: cancelError,
    reset: resetCancel,
  } = useWriteContract();

  const { isLoading: requestConfirming, isSuccess: requestSuccess } =
    useWaitForTransactionReceipt({ hash: requestHash });
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });
  const { isLoading: cancelConfirming, isSuccess: cancelSuccess } =
    useWaitForTransactionReceipt({ hash: cancelHash });

  const isPending =
    requestPending ||
    requestConfirming ||
    withdrawPending ||
    withdrawConfirming ||
    cancelPending ||
    cancelConfirming;

  // Toasts
  useEffect(() => {
    if (requestSuccess) {
      addToast("success", "Strategy request submitted!", requestHash);
      resetRequest();
    }
  }, [requestSuccess]);

  useEffect(() => {
    if (withdrawSuccess) {
      addToast("success", "Funds withdrawn from strategy", withdrawHash);
      resetWithdraw();
    }
  }, [withdrawSuccess]);

  useEffect(() => {
    if (cancelSuccess) {
      addToast("info", "Request cancelled", cancelHash);
      resetCancel();
    }
  }, [cancelSuccess]);

  useEffect(() => {
    if (requestError) {
      addToast("error", requestError.message.slice(0, 80));
      resetRequest();
    }
  }, [requestError]);

  useEffect(() => {
    if (withdrawError) {
      addToast("error", withdrawError.message.slice(0, 80));
      resetWithdraw();
    }
  }, [withdrawError]);

  useEffect(() => {
    if (cancelError) {
      addToast("error", cancelError.message.slice(0, 80));
      resetCancel();
    }
  }, [cancelError]);

  const handleRequest = () => {
    requestStrategy({
      address: contracts.vault,
      abi: SAVANNA_VAULT_ABI,
      functionName: "requestStrategy",
      args: [BigInt(selectedTime)],
    });
  };

  const handleWithdraw = () => {
    if (!address) return;
    withdrawFromStrategy({
      address: contracts.controller,
      abi: SAVANNA_CONTROLLER_ABI,
      functionName: "withdrawFromStrategy",
      args: [address],
    });
  };

  const handleCancel = () => {
    cancelRequest({
      address: contracts.vault,
      abi: SAVANNA_VAULT_ABI,
      functionName: "cancelTimedOutRequest",
    });
  };

  if (!isConnected) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Yield Optimization</h3>
          <p className="text-xs text-muted">
            AI finds the best yield across lending protocols
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        {hasRequest && !requestSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-warning-dim p-3">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-warning">Request Pending</p>
              <p className="text-xs text-muted">
                AI is analyzing protocols...
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="text-[10px] font-medium text-muted hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {hasPosition && !hasRequest && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-accent-dim p-3">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
              <div>
                <p className="text-xs font-medium text-accent">Strategy Active</p>
                <p className="text-xs text-muted">
                  Funds deployed — earning yield
                </p>
              </div>
            </div>

            {/* Position details */}
            {userPosition && (
              <div className="rounded-lg bg-background border border-border p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Deposited</span>
                  <span className="font-medium">
                    {Number(formatUnits(userPosition.depositAmount as bigint, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Allocated</span>
                  <span className="font-medium">
                    {Number(formatUnits(userPosition.allocatedAmount as bigint, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Duration</span>
                  <span className="font-medium">
                    {userPosition.timeHorizon >= 86400
                      ? `${Math.floor(Number(userPosition.timeHorizon) / 86400)} days`
                      : `${Math.floor(Number(userPosition.timeHorizon) / 3600)} hours`}
                  </span>
                </div>
              </div>
            )}

            {/* Withdraw from strategy */}
            <button
              onClick={handleWithdraw}
              disabled={isPending}
              className={clsx(
                "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors",
                isPending
                  ? "bg-card border border-border text-muted cursor-not-allowed"
                  : "bg-warning text-white hover:opacity-90"
              )}
            >
              {withdrawPending || withdrawConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {withdrawPending || withdrawConfirming
                ? "Withdrawing..."
                : "Withdraw from Strategy"}
            </button>
          </div>
        )}

        {requestSuccess && !hasRequest && !hasPosition && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-dim p-3 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <div>
              <p className="text-xs font-medium text-accent">Submitted!</p>
              <p className="text-xs text-muted">
                Strategy request sent to Chainlink oracle
              </p>
            </div>
          </div>
        )}

        {/* Time Horizon Selection (only show when no active request/position) */}
        {!hasRequest && !hasPosition && (
          <>
            <div>
              <p className="text-xs text-muted mb-2.5">
                Select investment duration
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedTime(opt.value)}
                    className={clsx(
                      "rounded-lg border p-2.5 text-left transition-all",
                      selectedTime === opt.value
                        ? "border-accent/40 bg-accent-dim"
                        : "border-border bg-background hover:border-border-light"
                    )}
                  >
                    <span
                      className={clsx(
                        "text-sm font-medium",
                        selectedTime === opt.value
                          ? "text-accent"
                          : "text-foreground"
                      )}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Flow */}
            <div className="rounded-lg bg-background border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <div className="h-5 w-5 rounded-full bg-accent-dim flex items-center justify-center">
                    <span className="text-[10px] font-bold text-accent">1</span>
                  </div>
                  Request
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="flex items-center gap-1">
                  <div className="h-5 w-5 rounded-full bg-accent-dim flex items-center justify-center">
                    <span className="text-[10px] font-bold text-accent">2</span>
                  </div>
                  AI Analysis
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="flex items-center gap-1">
                  <div className="h-5 w-5 rounded-full bg-accent-dim flex items-center justify-center">
                    <span className="text-[10px] font-bold text-accent">3</span>
                  </div>
                  Auto-Deploy
                </span>
              </div>
            </div>

            {/* Submit */}
            {isPending ? (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-card border border-border py-3 text-sm font-medium text-muted"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </button>
            ) : (
              <button
                onClick={handleRequest}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                <Zap className="h-4 w-4" />
                Request Strategy
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

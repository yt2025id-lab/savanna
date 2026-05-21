"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { SAVANNA_VAULT_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { useVaultData } from "@/hooks/useVaultData";
import { ListChecks, Loader2, AlertCircle, CheckCircle2, ArrowUpFromLine } from "lucide-react";
import clsx from "clsx";

export function ActivePositions() {
  const { address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 11142220;
  const contracts = getContracts(chainId);
  const { userShares, sharesInAssets, userPosition, tokenDecimals, isLoading } = useVaultData();

  const [withdrawing, setWithdrawing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  const {
    writeContract: withdrawWrite,
    data: withdrawHash,
    isPending: withdrawPending,
  } = useWriteContract();

  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
    query: { enabled: !!withdrawHash },
  });

  if (withdrawSuccess && withdrawing) {
    setWithdrawing(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  const handleWithdraw = useCallback(() => {
    if (!address || !sharesInAssets) return;
    setErrorMsg("");
    setWithdrawing(true);
    withdrawWrite(
      {
        address: contracts.vault,
        abi: SAVANNA_VAULT_ABI,
        functionName: "withdraw",
        args: [sharesInAssets, address, address],
      },
      {
        onSuccess: () => {},
        onError: (err) => {
          setErrorMsg(err.message.slice(0, 100));
          setWithdrawing(false);
        },
      },
    );
  }, [address, sharesInAssets, contracts, withdrawWrite]);

  const hasPosition = userShares && userShares > BigInt(0);

  // Format helpers
  const fmt = (val: bigint | undefined) => {
    if (!val) return "0.00";
    return (Number(formatUnits(val, tokenDecimals))).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate earnings
  const earningsValue = sharesInAssets && userPosition?.depositAmount
    ? (Number(formatUnits(sharesInAssets, tokenDecimals)) -
       Number(formatUnits(userPosition.depositAmount, tokenDecimals)))
    : 0;

  const isActive = userPosition?.isActive;

  return (
    <div className="rounded-2xl border border-[rgba(200,168,75,0.1)] bg-[#1A2E1C] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(200,168,75,0.08)]">
        <ListChecks className="h-5 w-5 text-[#C8A84B]" />
        <h2 className="text-base font-semibold text-[#F5EDD6]">Active Positions</h2>
      </div>

      <div className="p-5">
        {!address ? (
          <p className="text-sm text-[#E8D5A3] opacity-50 text-center py-8">
            Connect wallet to view positions
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#C8A84B]" />
          </div>
        ) : !hasPosition ? (
          <p className="text-sm text-[#E8D5A3] opacity-50 text-center py-8">
            No active positions. Deposit to start earning yield.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Position row */}
            <div className="rounded-xl bg-[#0D1A0F] border border-[rgba(200,168,75,0.08)] p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">Asset</p>
                  <p className="text-sm font-semibold text-[#F5EDD6]">USDC</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">Deposited</p>
                  <p className="text-sm font-semibold text-[#F5EDD6]">${fmt(userPosition?.depositAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">Current Value</p>
                  <p className="text-sm font-semibold text-[#C8A84B]">${fmt(sharesInAssets)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#E8D5A3] opacity-50 uppercase tracking-wider">Earnings</p>
                  <p className={clsx(
                    "text-sm font-semibold",
                    earningsValue >= 0 ? "text-[#4A7C59]" : "text-red-400"
                  )}>
                    {earningsValue >= 0 ? "+" : ""}${earningsValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Strategy info */}
              {isActive && userPosition?.activeStrategy && (
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
                  <span className="text-[11px] text-[#4A7C59]">
                    Strategy active: {userPosition.activeStrategy.slice(0, 6)}...{userPosition.activeStrategy.slice(-4)}
                  </span>
                </div>
              )}

              {/* Withdraw button */}
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || withdrawPending || withdrawConfirming || !sharesInAssets}
                className={clsx(
                  "w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                  done
                    ? "bg-[#4A7C59]/20 text-[#4A7C59] border border-[#4A7C59]/30"
                    : withdrawing || withdrawPending || withdrawConfirming
                    ? "bg-[rgba(200,168,75,0.08)] text-[#C8A84B]/50 cursor-wait"
                    : "bg-[rgba(200,168,75,0.08)] text-[#C8A84B] border border-[rgba(200,168,75,0.15)] hover:bg-[rgba(200,168,75,0.15)]"
                )}
              >
                {done ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Withdrawn!
                  </>
                ) : withdrawing || withdrawPending || withdrawConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Withdrawing...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="h-4 w-4" />
                    Withdraw
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{errorMsg}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

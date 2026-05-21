"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { SAVANNA_VAULT_ABI, ERC20_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { useVaultData } from "@/hooks/useVaultData";
import { ArrowDownToLine, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

const ASSETS = [
  { symbol: "USDC", label: "USD Coin", decimals: 6, apy: "18.5" },
  { symbol: "CELO", label: "Celo Native", decimals: 18, apy: "12.3" },
  { symbol: "cUSD", label: "Celo Dollar", decimals: 18, apy: "15.8" },
] as const;

type AssetSymbol = (typeof ASSETS)[number]["symbol"];

export function DepositCard() {
  const { address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 11142220;
  const contracts = getContracts(chainId);
  const { tokenBalance, tokenDecimals, tokenSymbol, allowance, userTokenBalanceFormatted } = useVaultData();

  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "depositing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const asset = ASSETS.find((a) => a.symbol === selectedAsset)!;

  // Token allowance
  const { data: currentAllowance } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, contracts.vault] : undefined,
  });

  // Approve write
  const {
    writeContract: approve,
    data: approveHash,
    isPending: approvePending,
  } = useWriteContract();

  // Deposit write
  const {
    writeContract: deposit,
    data: depositHash,
    isPending: depositPending,
  } = useWriteContract();

  // Wait for approve tx
  const { isLoading: approveConfirming } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: !!approveHash },
  });

  // Wait for deposit tx
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
    query: { enabled: !!depositHash },
  });

  // Handle deposit success
  if (depositSuccess && step === "depositing") {
    setStep("done");
    setAmount("");
    setTimeout(() => setStep("idle"), 3000);
  }

  const parsedAmount = amount && !isNaN(Number(amount))
    ? parseUnits(amount, asset.decimals)
    : BigInt(0);

  const allowanceBig = currentAllowance as bigint | undefined;
  const needsApproval = allowanceBig !== undefined && parsedAmount > BigInt(0) && allowanceBig < parsedAmount;

  const handleApprove = useCallback(() => {
    if (!address || !parsedAmount) return;
    setErrorMsg("");
    setStep("approving");
    approve(
      {
        address: contracts.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contracts.vault, parsedAmount],
      },
      {
        onSuccess: () => {
          // Wait for confirmation then move to deposit step
          setStep("idle");
        },
        onError: (err) => {
          setErrorMsg(err.message.slice(0, 100));
          setStep("error");
        },
      },
    );
  }, [address, parsedAmount, contracts, approve]);

  const handleDeposit = useCallback(() => {
    if (!address || !parsedAmount) return;
    setErrorMsg("");
    setStep("depositing");
    deposit(
      {
        address: contracts.vault,
        abi: SAVANNA_VAULT_ABI,
        functionName: "deposit",
        args: [parsedAmount, address],
      },
      {
        onSuccess: () => {},
        onError: (err) => {
          setErrorMsg(err.message.slice(0, 100));
          setStep("error");
        },
      },
    );
  }, [address, parsedAmount, contracts, deposit]);

  const handleSetMax = () => {
    if (tokenBalance) {
      const formatted = formatUnits(tokenBalance, selectedAsset === "USDC" ? tokenDecimals : 18);
      setAmount(parseFloat(formatted).toFixed(selectedAsset === "USDC" ? 2 : 4));
    }
  };

  const isBusy = step === "approving" || step === "depositing" || approvePending || depositPending || approveConfirming || depositConfirming;

  return (
    <div className="rounded-2xl border border-[rgba(200,168,75,0.1)] bg-[#1A2E1C] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[rgba(200,168,75,0.08)]">
        <ArrowDownToLine className="h-5 w-5 text-[#C8A84B]" />
        <h2 className="text-base font-semibold text-[#F5EDD6]">Deposit</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Asset selector */}
        <div>
          <label className="text-xs text-[#E8D5A3] opacity-60 mb-1.5 block">Select Asset</label>
          <div className="flex gap-2">
            {ASSETS.map((a) => (
              <button
                key={a.symbol}
                onClick={() => { setSelectedAsset(a.symbol); setAmount(""); }}
                className={clsx(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                  selectedAsset === a.symbol
                    ? "bg-[rgba(200,168,75,0.15)] border-[#C8A84B] text-[#C8A84B]"
                    : "bg-transparent border-[rgba(200,168,75,0.1)] text-[#E8D5A3] opacity-60 hover:opacity-100"
                )}
              >
                {a.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-[#E8D5A3] opacity-60">Amount</label>
            <button
              onClick={handleSetMax}
              className="text-xs text-[#C8A84B] hover:underline cursor-pointer"
            >
              Max: {userTokenBalanceFormatted ?? "0"}
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setStep("idle"); setErrorMsg(""); }}
              className="w-full bg-[#0D1A0F] border border-[rgba(200,168,75,0.15)] rounded-xl px-4 py-3 pr-16 text-lg text-[#F5EDD6] placeholder-[#E8D5A3]/30 focus:outline-none focus:border-[#C8A84B]/40 transition-colors"
              disabled={isBusy}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#C8A84B]">
              {selectedAsset}
            </span>
          </div>
        </div>

        {/* APY preview */}
        <div className="flex items-center justify-between rounded-lg bg-[rgba(74,124,89,0.12)] px-4 py-2.5">
          <span className="text-xs text-[#E8D5A3] opacity-70">Estimated APY</span>
          <span className="text-sm font-bold text-[#4A7C59]">{asset.apy}%</span>
        </div>

        {/* Estimated return */}
        {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
          <div className="flex items-center justify-between text-xs text-[#E8D5A3] opacity-60">
            <span>Estimated yearly return</span>
            <span className="text-[#C8A84B] font-medium">
              ${(Number(amount) * Number(asset.apy) / 100).toFixed(2)}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {!address ? (
            <div className="text-center py-3 text-sm text-[#E8D5A3] opacity-50">
              Connect wallet to deposit
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isBusy || !parsedAmount}
              className={clsx(
                "w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
                isBusy
                  ? "bg-[#C8A84B]/30 text-[#0D1A0F]/50 cursor-wait"
                  : "bg-[#C8A84B] text-[#0D1A0F] hover:bg-[#d4b85a] hover:shadow-[0_0_30px_rgba(200,168,75,0.3)]"
              )}
            >
              {approvePending || approveConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </span>
              ) : (
                `Approve ${selectedAsset}`
              )}
            </button>
          ) : (
            <button
              onClick={handleDeposit}
              disabled={isBusy || !parsedAmount}
              className={clsx(
                "w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
                isBusy || !parsedAmount
                  ? "bg-[#C8A84B]/30 text-[#0D1A0F]/50 cursor-wait"
                  : "bg-[#C8A84B] text-[#0D1A0F] hover:bg-[#d4b85a] hover:shadow-[0_0_30px_rgba(200,168,75,0.3)]"
              )}
            >
              {depositPending || depositConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Depositing...
                </span>
              ) : step === "done" ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Deposited!
                </span>
              ) : (
                "Deposit"
              )}
            </button>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* LI.FI Placeholder */}
      <div className="border-t border-[rgba(200,168,75,0.08)] px-5 py-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-[rgba(74,124,89,0.08)] border border-dashed border-[rgba(74,124,89,0.2)] py-5">
          <span className="text-lg">🌉</span>
          <div className="text-center">
            <p className="text-sm text-[#E8D5A3] opacity-60">Cross-chain deposit coming soon</p>
            <p className="text-[10px] text-[#E8D5A3] opacity-30 mt-0.5">via LI.FI integration</p>
          </div>
        </div>
      </div>
    </div>
  );
}

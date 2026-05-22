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
  // CELO and cUSD support coming soon — vault currently only accepts USDC
  // { symbol: "CELO", label: "Celo Native", decimals: 18, apy: "12.3" },
  // { symbol: "cUSD", label: "Celo Dollar", decimals: 18, apy: "15.8" },
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
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ArrowDownToLine className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-foreground">Deposit</h2>
      </div>

      <div className="p-5 space-y-4">
        {/* Asset selector */}
        <div>
          <label className="text-xs text-muted mb-1.5 block">Select Asset</label>
          <div className="flex gap-2">
            {ASSETS.map((a) => (
              <button
                key={a.symbol}
                onClick={() => { setSelectedAsset(a.symbol); setAmount(""); }}
                className={clsx(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                  selectedAsset === a.symbol
                    ? "bg-accent-dim border-accent/30 text-accent"
                    : "bg-transparent border-border text-muted-light hover:text-foreground"
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
            <label className="text-xs text-muted">Amount</label>
            <button
              onClick={handleSetMax}
              className="text-xs text-accent hover:underline cursor-pointer"
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
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-16 text-lg text-foreground placeholder-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
              disabled={isBusy}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-accent">
              {selectedAsset}
            </span>
          </div>
        </div>

        {/* APY preview */}
        <div className="flex items-center justify-between rounded-lg bg-accent-dim px-4 py-2.5">
          <span className="text-xs text-muted-light">Estimated APY</span>
          <span className="text-sm font-bold text-accent">{asset.apy}%</span>
        </div>

        {/* Estimated return */}
        {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Estimated yearly return</span>
            <span className="text-accent font-medium">
              ${(Number(amount) * Number(asset.apy) / 100).toFixed(2)}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {!address ? (
            <div className="text-center py-3 text-sm text-muted">
              Connect wallet to deposit
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isBusy || !parsedAmount}
              className={clsx(
                "w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
                isBusy
                  ? "bg-accent/30 text-white/50 cursor-wait"
                  : "bg-accent text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
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
                  ? "bg-accent/30 text-white/50 cursor-wait"
                  : "bg-accent text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
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
          <div className="flex items-start gap-2 rounded-lg bg-danger-dim border border-danger/30 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
            <p className="text-xs text-danger">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Cross-chain shortcut */}
      <div className="border-t border-border px-5 py-4">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // Scroll to cross-chain section
            const el = document.querySelector("[data-cross-chain-deposit]");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-dim/50 border border-dashed border-accent/20 py-4 transition-all hover:border-accent/40 hover:bg-accent-dim cursor-pointer"
        >
          <span className="text-lg">🌉</span>
          <div className="text-center">
            <p className="text-sm text-muted-light">Bridge from another chain</p>
            <p className="text-[10px] text-muted mt-0.5">via LI.FI — 60+ chains supported</p>
          </div>
        </a>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ArrowDown, Loader2, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { useVaultData } from "@/hooks/useVaultData";
import { useToast } from "@/components/Toast";
import { SAVANNA_VAULT_ABI, ERC20_ABI } from "@/config/abis";
import { CrossChainDeposit } from "@/components/CrossChainDeposit";

export function DepositCard() {
  const { isConnected, address } = useAccount();
  const {
    tokenBalance,
    sharesInAssets,
    tokenDecimals,
    allowance,
    contracts,
    userVaultBalanceFormatted,
    userTokenBalanceFormatted,
  } = useVaultData();
  const { addToast } = useToast();
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  const dec = tokenDecimals;

  // Approve
  const {
    writeContract: approve,
    data: approveHash,
    isPending: approvePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  // Deposit
  const {
    writeContract: deposit,
    data: depositHash,
    isPending: depositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  // Withdraw
  const {
    writeContract: withdraw,
    data: withdrawHash,
    isPending: withdrawPending,
    error: withdrawError,
    reset: resetWithdraw,
  } = useWriteContract();

  // Wait for receipts
  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: depositConfirming, isSuccess: depositSuccess } =
    useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash });

  const parsedAmount = amount ? parseUnits(amount, dec) : BigInt(0);
  const needsApproval =
    tab === "deposit" && parsedAmount > ((allowance as bigint) ?? BigInt(0));

  const setMax = () => {
    if (tab === "deposit" && tokenBalance) {
      setAmount(formatUnits(tokenBalance as bigint, dec));
    } else if (tab === "withdraw" && sharesInAssets) {
      setAmount(formatUnits(sharesInAssets as bigint, dec));
    }
  };

  // Toast on success/error
  useEffect(() => {
    if (approveSuccess) {
      addToast("success", "USDC approved successfully", approveHash);
      resetApprove();
    }
  }, [approveSuccess]);

  useEffect(() => {
    if (depositSuccess) {
      addToast("success", "Deposit confirmed!", depositHash);
      resetDeposit();
      setAmount("");
    }
  }, [depositSuccess]);

  useEffect(() => {
    if (withdrawSuccess) {
      addToast("success", "Withdraw confirmed!", withdrawHash);
      resetWithdraw();
      setAmount("");
    }
  }, [withdrawSuccess]);

  useEffect(() => {
    if (approveError) {
      addToast("error", approveError.message.slice(0, 80));
      resetApprove();
    }
  }, [approveError]);

  useEffect(() => {
    if (depositError) {
      addToast("error", depositError.message.slice(0, 80));
      resetDeposit();
    }
  }, [depositError]);

  useEffect(() => {
    if (withdrawError) {
      addToast("error", withdrawError.message.slice(0, 80));
      resetWithdraw();
    }
  }, [withdrawError]);

  const handleApprove = () => {
    approve({
      address: contracts.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contracts.vault, parseUnits("999999999", dec)],
    });
  };

  const handleDeposit = () => {
    if (!amount || !address) return;
    deposit({
      address: contracts.vault,
      abi: SAVANNA_VAULT_ABI,
      functionName: "deposit",
      args: [parsedAmount, address],
    });
  };

  const handleWithdraw = () => {
    if (!amount || !address) return;
    withdraw({
      address: contracts.vault,
      abi: SAVANNA_VAULT_ABI,
      functionName: "withdraw",
      args: [parsedAmount, address, address],
    });
  };

  const isPending =
    approvePending ||
    depositPending ||
    withdrawPending ||
    approveConfirming ||
    depositConfirming ||
    withdrawConfirming;

  const isSuccess = tab === "deposit" ? depositSuccess : withdrawSuccess;

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-center text-sm text-muted">
          Connect your wallet to start earning
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setTab("deposit"); setAmount(""); }}
          className={clsx(
            "flex-1 py-3 text-sm font-medium transition-colors",
            tab === "deposit"
              ? "text-accent border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          )}
        >
          Deposit
        </button>
        <button
          onClick={() => { setTab("withdraw"); setAmount(""); }}
          className={clsx(
            "flex-1 py-3 text-sm font-medium transition-colors",
            tab === "withdraw"
              ? "text-accent border-b-2 border-accent"
              : "text-muted hover:text-foreground"
          )}
        >
          Withdraw
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Amount Input */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted">Amount</span>
            <button
              onClick={setMax}
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              MAX
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
            />
            <span className="text-sm font-medium text-muted-light">USDC</span>
          </div>
          <div className="mt-1.5 text-xs text-muted">
            {tab === "deposit"
              ? `Balance: ${userTokenBalanceFormatted} USDC`
              : `Vault: ${userVaultBalanceFormatted} USDC`}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card">
            <ArrowDown className="h-3.5 w-3.5 text-muted" />
          </div>
        </div>

        {/* Receive */}
        <div className="rounded-lg border border-border bg-background p-3">
          <span className="text-xs text-muted">
            {tab === "deposit" ? "You receive" : "You receive"}
          </span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-semibold">{amount || "0.00"}</span>
            <span className="text-sm font-medium text-muted-light">
              {tab === "deposit" ? "svYLD" : "USDC"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isSuccess ? (
          <button
            onClick={() => setAmount("")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent/20 py-3 text-sm font-medium text-accent"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmed — Click to reset
          </button>
        ) : isPending ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-card border border-border py-3 text-sm font-medium text-muted"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {approvePending || approveConfirming
              ? "Approving..."
              : depositPending || depositConfirming
              ? "Depositing..."
              : "Withdrawing..."}
          </button>
        ) : tab === "deposit" && needsApproval ? (
          <button
            onClick={handleApprove}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Approve USDC
          </button>
        ) : (
          <button
            onClick={tab === "deposit" ? handleDeposit : handleWithdraw}
            disabled={!amount || Number(amount) <= 0}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors",
              amount && Number(amount) > 0
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-card border border-border text-muted cursor-not-allowed"
            )}
          >
            {tab === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        )}

        {/* Cross-Chain Deposit (LI.FI) */}
        {tab === "deposit" && (
          <div className="pt-1">
            <CrossChainDeposit />
          </div>
        )}
      </div>
    </div>
  );
}

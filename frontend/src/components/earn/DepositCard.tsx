"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { SAVANNA_VAULT_ABI, ERC20_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { useVaultData } from "@/hooks/useVaultData";
import { LiFiSwapCard } from "@/components/lifi/LiFiSwapCard";
import { CrossChainDeposit } from "@/components/CrossChainDeposit";
import { ArrowDownToLine, AlertCircle, AlertTriangle, Loader2, CheckCircle2, Sparkles, Zap, RefreshCw } from "lucide-react";
import clsx from "clsx";

const TESTNET_ASSETS = [
  { symbol: "USDC", label: "USD Coin", decimals: 6, token: "usdc" as const },
] as const;

const MAINNET_ASSETS = [
  { symbol: "cUSD", label: "Celo Dollar", decimals: 18, token: "cusd" as const },
] as const;

const ASSETS = {
  testnet: TESTNET_ASSETS,
  mainnet: MAINNET_ASSETS,
} as const;

type AssetSymbol = "USDC" | "cUSD";

export function DepositCard() {
  const { address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 42220;
  const isMainnet = chainId === 42220;
  const contracts = getContracts(chainId);
  const { tokenBalance, tokenDecimals, tokenSymbol, allowance, userTokenBalanceFormatted } = useVaultData();

  const assetsList = isMainnet ? ASSETS.mainnet : ASSETS.testnet;
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>(isMainnet ? "cUSD" : "USDC");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "depositing" | "strategizing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const asset = assetsList.find((a) => a.symbol === selectedAsset)!;
  const tokenKey = asset?.token ?? "usdc";
  const tokenAddress = contracts[tokenKey] as `0x${string}`;

  // Token allowance
  const { data: currentAllowance } = useReadContract({
    address: tokenAddress,
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

  // Strategy request write (needed to set _activeRequests flag on vault)
  const {
    writeContract: requestStrategy,
    data: strategyHash,
    isPending: strategyPending,
  } = useWriteContract();

  // Wait for strategy request tx
  const { isLoading: strategyConfirming, isSuccess: strategySuccess } = useWaitForTransactionReceipt({
    hash: strategyHash,
    query: { enabled: !!strategyHash },
  });

  // Handle deposit tx
  const { isLoading: depositConfirming, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
    query: { enabled: !!depositHash },
  });

  // Step 1: Deposit success → call requestStrategy to set _activeRequests flag
  useEffect(() => {
    if (depositSuccess && step === "depositing" && address) {
      setStep("strategizing");
      setAmount("");
      requestStrategy({
        address: contracts.vault,
        abi: SAVANNA_VAULT_ABI,
        functionName: "requestStrategy",
        args: [BigInt(30 * 24 * 60 * 60)],
      });
    }
  }, [depositSuccess]);

  // Step 2: requestStrategy success → call x402 backend to fulfill on-chain
  // Deposit already succeeded — x402 failure won't block the user
  useEffect(() => {
    if (!strategySuccess || step !== "strategizing" || !address) return;

    const x402Base = (process.env.NEXT_PUBLIC_X402_ENDPOINT || "http://localhost:3001/api/strategy/analyze").replace(/\/analyze$/, "");

    fetch(`${x402Base}/fulfill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress: address,
        timeHorizon: 30 * 24 * 60 * 60,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStep("done");
        } else {
          setStep("done");
        }
      })
      .catch(() => {
        setStep("done");
      });
  }, [strategySuccess, address, step]);

  // Auto-return to idle after done state
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (step === "done") {
      doneTimerRef.current = setTimeout(() => {
        setStep("idle");
        setErrorMsg("");
      }, 6000);
      return () => {
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      };
    }
  }, [step]);

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
        address: tokenAddress,
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
      const formatted = formatUnits(tokenBalance, asset.decimals);
      const dot = formatted.indexOf(".");
      const maxDecimals = asset.decimals === 6 ? 2 : 4;
      if (dot === -1) {
        setAmount(formatted);
      } else {
        setAmount(formatted.slice(0, dot + 1 + maxDecimals));
      }
    }
  };

  const isBusy = step === "approving" || step === "depositing" || step === "strategizing" || approvePending || depositPending || approveConfirming || depositConfirming || strategyPending || strategyConfirming;

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
            {assetsList.map((a) => (
              <button
                key={a.symbol}
                onClick={() => { setSelectedAsset(a.symbol as AssetSymbol); setAmount(""); }}
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

        {/* AI-Optimized APY banner */}
        <div className="flex items-center gap-2 rounded-lg bg-accent-dim px-4 py-2.5">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <span className="text-xs text-muted-light flex-1">AI-optimized yield</span>
          <span className="text-xs font-semibold text-accent">Auto-selected best protocol</span>
        </div>

        {/* Insufficient balance warning */}
        {parsedAmount > BigInt(0) && tokenBalance !== undefined && parsedAmount > tokenBalance && (
          <div className="flex items-center gap-2 rounded-lg bg-danger-dim/30 border border-danger/20 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0" />
            <p className="text-xs text-danger">
              Insufficient balance: you have {userTokenBalanceFormatted} {selectedAsset}, trying to deposit {amount}
            </p>
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
              ) : step === "strategizing" ? (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" />
                  AI Optimizing Yield...
                </span>
              ) : step === "done" ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Deposited &amp; Optimizing!
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

      {/* Quick actions */}
      <div className="border-t border-border px-5 py-4 space-y-3">
        <LiFiSwapCard />
        <CrossChainDeposit />
      </div>
    </div>
  );
}

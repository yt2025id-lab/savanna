"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { SAVANNA_VAULT_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { detectMiniPay, getMinipayDepositMin, getMinipayAddCashLink, getMinipayReceiptLink } from "@/lib/minipay";

export function useMinipayDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contracts = getContracts(chainId);
  const isMinipay = detectMiniPay();

  const { writeContractAsync } = useWriteContract();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (amount: string, decimals: number = 6) => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const amountWei = parseUnits(amount, decimals);
        const mins = getMinipayDepositMin(decimals);

        if (amountWei < mins.minipay) {
          setError(`Minimum deposit for MiniPay is ${isMinipay ? "1" : "10"} units`);
          setIsSubmitting(false);
          return null;
        }

        const hash = await writeContractAsync({
          address: contracts.vault,
          abi: SAVANNA_VAULT_ABI,
          functionName: isMinipay ? "minipayDeposit" : "deposit",
          args: [BigInt(amountWei), address],
          ...(isMinipay && contracts.cusd
            ? { feeCurrency: contracts.cusd }
            : {}),
        });

        setTxHash(hash);
        return hash;
      } catch (err: any) {
        setError(err?.shortMessage || err?.message || "Deposit failed");
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, contracts, isMinipay, writeContractAsync]
  );

  const openAddCash = useCallback(() => {
    if (isMinipay && typeof window !== "undefined") {
      window.open(getMinipayAddCashLink(), "_blank");
    }
  }, [isMinipay]);

  const getReceiptUrl = useCallback(() => {
    return txHash ? getMinipayReceiptLink(txHash) : null;
  }, [txHash]);

  return {
    deposit,
    isMinipay,
    isSubmitting,
    txHash,
    error,
    openAddCash,
    getReceiptUrl,
  };
}

"use client";

import { useState, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { celo } from "viem/chains";
import { getX402Config, parseX402Requirement } from "@/lib/minipay";
import { getContracts } from "@/config/contracts";
import { ERC20_ABI } from "@/config/abis";

interface StrategyResponse {
  protocolId: number;
  protocolName: string;
  allocationBps: number;
  expectedApy: number;
  riskScore: number;
  reasoning: string;
  allProtocols: Array<{
    protocol: string;
    protocolId: number;
    apy: number;
    safetyScore: number;
  }>;
  timestamp: number;
  paymentVerified: boolean;
}

const X402_PRICE_USDC = "100000"; // 0.10 USDC

export function useX402Strategy() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const activeChainId = chainId ?? 42220;
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StrategyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);

  const analyze = useCallback(
    async (params: { userAddress: string; timeHorizon: number; depositAmount?: string; riskPreference?: string; preferredTokens?: string[] }) => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setPaymentRequired(false);

      const config = getX402Config(params.userAddress ? activeChainId : undefined);

      try {
        const res = await fetch(`${config.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (res.status === 402) {
          const body = await res.json();
          const req = parseX402Requirement(body);
          if (req) {
            setPaymentRequired(true);
            setError(`Payment required: ${req.price} units of ${req.currency.slice(0, 10)}...`);
          } else {
            setError("Payment required but could not parse requirements");
          }
          setIsLoading(false);
          return null;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `HTTP ${res.status}`);
          setIsLoading(false);
          return null;
        }

        const data: StrategyResponse = await res.json();
        setResult(data);
        setIsLoading(false);
        return data;
      } catch (err: any) {
        setError(err?.message || "Strategy analysis failed");
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  const payAndAnalyze = useCallback(
    async (params: { userAddress: string; timeHorizon: number; depositAmount?: string; riskPreference?: string; preferredTokens?: string[] }) => {
      if (!address || !walletClient) {
        setError("Wallet not connected");
        return null;
      }

      setIsLoading(true);
      setError(null);

      const config = getX402Config(activeChainId);

      try {
        const res = await fetch(`${config.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (res.status === 402) {
          const body = await res.json();
          const req = parseX402Requirement(body);
          if (!req) throw new Error("Could not parse payment requirement");

          setPaymentRequired(true);

          const amount = BigInt(req.price);
          const recipient = req.recipient;

          // Step 2: Send 0.10 USDC to vault
          const txHash = await walletClient.sendTransaction({
            chainId: celo.id,
            account: address,
            to: config.currency as `0x${string}`,
            value: BigInt(0),
            data: encodeTransfer(recipient, config.currency, amount),
          });

          // Step 3: Wait for tx to be confirmed (up to 60s)
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
          }

          // Step 4: Retry with payment proof
          const retryRes = await fetch(`${config.endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Payment": `payer=${address},amount=${req.price},currency=${req.currency},txHash=${txHash}`,
            },
            body: JSON.stringify(params),
          });

          if (!retryRes.ok) {
            const retryBody = await retryRes.json().catch(() => ({}));
            throw new Error(retryBody.error || `HTTP ${retryRes.status}`);
          }

          const data: StrategyResponse = await retryRes.json();
          setResult(data);
          setPaymentRequired(false);
          setIsLoading(false);
          return data;
        }

        if (res.ok) {
          const data: StrategyResponse = await res.json();
          setResult(data);
          setIsLoading(false);
          return data;
        }

        throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setError(err?.message || "Payment + analysis failed");
        setIsLoading(false);
        return null;
      }
    },
    [address, walletClient, publicClient]
  );

  return { analyze, payAndAnalyze, isLoading, result, error, paymentRequired };
}

function encodeTransfer(recipient: string, _token: string, amount: bigint): `0x${string}` {
  const selector = "0xa9059cbb";
  const paddedRecipient = recipient.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${selector.slice(2)}${paddedRecipient}${paddedAmount}` as `0x${string}`;
}

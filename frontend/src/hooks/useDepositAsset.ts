"use client";

import { useAccount } from "wagmi";
import { useState, useEffect, useMemo } from "react";
import {
  CELO_TOKENS,
  CELO_TOKENS_TESTNET,
  detectMiniPay,
  type SupportedAsset,
} from "@/lib/minipay";
import { ERC20_ABI } from "@/config/abis";
import { useReadContract } from "wagmi";

/**
 * Hook that provides the correct deposit asset configuration
 * based on chain ID and MiniPay detection.
 *
 * - MiniPay users → cUSD by default
 * - Web users → USDC by default
 * - Both can switch between supported assets
 */
export function useDepositAsset() {
  const { chainId } = useAccount();
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    setIsMiniPay(detectMiniPay());
  }, []);

  const supportedAssets = useMemo<SupportedAsset[]>(() => {
    const isTestnet = chainId === 11142220;
    const tokens = isTestnet ? CELO_TOKENS_TESTNET : CELO_TOKENS;

    return [
      {
        address: tokens.usdc,
        symbol: "USDC",
        decimals: 6,
      },
      {
        address: tokens.cusd,
        symbol: "cUSD",
        decimals: 18,
      },
    ].filter(
      (t) =>
        t.address !== "0x0000000000000000000000000000000000000000"
    );
  }, [chainId]);

  const defaultAsset = useMemo<SupportedAsset>(() => {
    if (isMiniPay) {
      const cusd = supportedAssets.find((a) => a.symbol === "cUSD");
      if (cusd) return cusd;
    }
    return supportedAssets[0] || supportedAssets.find((a) => a.symbol === "USDC")!;
  }, [isMiniPay, supportedAssets]);

  return {
    supportedAssets,
    defaultAsset,
    isMiniPay,
  };
}

/**
 * Hook to read an ERC-20 token balance for the connected wallet.
 */
export function useTokenBalance(tokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!tokenAddress && !!address,
    },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!tokenAddress,
    },
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: !!tokenAddress,
    },
  });

  return {
    balance: balance as bigint | undefined,
    decimals: decimals as number | undefined,
    symbol: symbol as string | undefined,
  };
}

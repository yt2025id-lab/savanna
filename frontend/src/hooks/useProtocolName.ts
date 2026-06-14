"use client";

import { useReadContract } from "wagmi";
import { PROTOCOL_NAME_MAP } from "@/config/contracts";

const STRATEGY_NAME_ABI = [
  {
    name: "protocolName",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * Resolves a strategy address to a human-readable protocol name.
 * Tries on-chain `protocolName()` first, falls back to hardcoded map,
 * then to truncated address.
 */
export function useProtocolName(strategyAddress?: `0x${string}`) {
  const { data: onChainName } = useReadContract({
    address: strategyAddress,
    abi: STRATEGY_NAME_ABI,
    functionName: "protocolName",
    query: { enabled: !!strategyAddress },
  });

  if (!strategyAddress) return "—";

  if (onChainName) return onChainName as string;

  const key = strategyAddress.toLowerCase();
  if (PROTOCOL_NAME_MAP[key]) return PROTOCOL_NAME_MAP[key];

  return `${strategyAddress.slice(0, 6)}...${strategyAddress.slice(-4)}`;
}

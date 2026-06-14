"use client";

import { useAccount, useReadContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { formatUnits } from "viem";
import { SAVANNA_VAULT_ABI, SAVANNA_CONTROLLER_ABI, SAVANNA_ORACLE_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";
import { useState, useEffect, useCallback } from "react";

const ERC20_ABI_META = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
];

export function useVaultData() {
  const { address, chainId } = useAccount();
  const activeChainId = chainId ?? 42220;
  const contracts = getContracts(activeChainId);
  const publicClient = usePublicClient({ chainId: activeChainId });
  const [assetAddress, setAssetAddress] = useState<`0x${string}` | undefined>(undefined);

  // Read vault asset address dynamically
  const { data: vaultAsset } = useReadContract({
    address: contracts.vault as `0x${string}`,
    abi: [{ name: "asset", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] }],
    functionName: "asset",
  });

  useEffect(() => {
    if (vaultAsset) setAssetAddress(vaultAsset as `0x${string}`);
  }, [vaultAsset]);

  // Read token balance, decimals, symbol, allowance via wagmi hooks (auto-refresh)
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI_META,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const { data: tokenDecimalsRaw } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI_META,
    functionName: "decimals",
    query: { enabled: !!assetAddress },
  });

  const { data: tokenSymbolRaw } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI_META,
    functionName: "symbol",
    query: { enabled: !!assetAddress },
  });

  const { data: allowance } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI_META,
    functionName: "allowance",
    args: address ? [address, contracts.vault as `0x${string}`] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const tokenDecimals = typeof tokenDecimalsRaw === "number" ? tokenDecimalsRaw : 18;
  const tokenSymbol = typeof tokenSymbolRaw === "string" ? tokenSymbolRaw : "cUSD";

  // Auto-refresh balance when user sends/receives tokens
  useWatchContractEvent({
    address: assetAddress,
    abi: ERC20_ABI_META,
    eventName: "Transfer",
    onLogs: () => { refetchBalance(); },
    enabled: !!assetAddress,
  });

  // Read total assets (TVL)
  const { data: totalAssets, isLoading: loadingTotalAssets } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "totalAssets",
  });

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "totalSupply",
  });

  // Read total deployed
  const { data: totalDeployed, isLoading: loadingTotalDeployed } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "totalDeployed",
  });

  // Read total positions
  const { data: totalPositions, isLoading: loadingTotalPositions } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "totalPositions",
  });

  // Read total yield earned
  const { data: totalYieldEarned } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "totalYieldEarned",
  });

  // Read rebalance interval
  const { data: rebalanceInterval } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "rebalanceInterval",
  });

  // Read last rebalance timestamp
  const { data: lastRebalance } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "lastRebalance",
  });

  // Read USD price of asset from oracle
  const { data: assetPriceUsd } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "getAssetPriceUsd",
  });

  // Read total deployed value in USD
  const { data: totalDeployedValueUsd } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "getTotalDeployedValueUsd",
  });

  // Read user balance (shares)
  const { data: userShares, isLoading: loadingUserShares } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read user position
  const { data: userPosition, isLoading: loadingUserPosition } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "getUserPosition",
    args: address ? [address] : undefined,
  });

  // Read active request
  const { data: hasActiveRequest } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "hasActiveRequest",
    args: address ? [address] : undefined,
  });

  // Read shares value in assets
  const { data: sharesInAssets } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "convertToAssets",
    args: userShares ? [userShares] : undefined,
  });

  // Read user position value in USD
  const { data: userPositionValueUsd } = useReadContract({
    address: contracts.vault,
    abi: SAVANNA_VAULT_ABI,
    functionName: "getUserPositionValueUsd",
    args: address ? [address] : undefined,
  });

  // Read total recommendations
  const { data: totalRecommendations } = useReadContract({
    address: contracts.controller,
    abi: SAVANNA_CONTROLLER_ABI,
    functionName: "totalRecommendations",
  });

  // Read oracle asset price (for StatsBar APY calculation)
  const oracleAddr = contracts.oracle as `0x${string}`;
  const { data: oracleAssetPrice } = useReadContract({
    address: oracleAddr,
    abi: SAVANNA_ORACLE_ABI,
    functionName: "getAssetPrice",
    args: [contracts.usdc],
    query: { enabled: !!contracts.oracle && contracts.oracle !== "0x0000000000000000000000000000000000000000" },
  });

  const dec = tokenDecimals;

  // Format helpers
  const formatBalance = (val: unknown) => {
    if (!val || typeof val !== "bigint") return "0";
    return Number(formatUnits(val, dec)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  // Format 18-decimal USD values
  const formatUsd = (val: unknown) => {
    if (!val || typeof val !== "bigint") return "0";
    return Number(formatUnits(val, 18)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  return {
    // Raw data
    totalAssets: totalAssets as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    totalDeployed: totalDeployed as bigint | undefined,
    totalPositions: totalPositions as bigint | undefined,
    totalYieldEarned: totalYieldEarned as bigint | undefined,
    rebalanceInterval: rebalanceInterval as bigint | undefined,
    lastRebalance: lastRebalance as bigint | undefined,
    assetPriceUsd: assetPriceUsd as bigint | undefined,
    totalDeployedValueUsd: totalDeployedValueUsd as bigint | undefined,
    userShares: userShares as bigint | undefined,
    sharesInAssets: sharesInAssets as bigint | undefined,
    userPosition: userPosition as any | undefined,
    userPositionValueUsd: userPositionValueUsd as bigint | undefined,
    hasActiveRequest: hasActiveRequest as boolean | undefined,
    tokenBalance: tokenBalance as bigint | undefined,
    tokenDecimals: dec,
    tokenSymbol,
    allowance: allowance as bigint | undefined,
    totalRecommendations: totalRecommendations as bigint | undefined,
    oracleAssetPrice: oracleAssetPrice as bigint | undefined,

    // Formatted (asset decimals)
    tvlFormatted: formatBalance(totalAssets),
    deployedFormatted: formatBalance(totalDeployed),
    yieldEarnedFormatted: formatBalance(totalYieldEarned),
    userVaultBalanceFormatted: formatBalance(sharesInAssets),
    userTokenBalanceFormatted: formatBalance(tokenBalance),

    // Formatted (USD 18-decimals)
    deployedUsdFormatted: formatUsd(totalDeployedValueUsd),
    positionUsdFormatted: formatUsd(userPositionValueUsd),
    assetPriceFormatted: formatUsd(assetPriceUsd),

    // Loading
    isLoading:
      loadingTotalAssets ||
      loadingTotalDeployed ||
      loadingTotalPositions ||
      loadingUserShares ||
      loadingUserPosition,

    // Contracts
    contracts,
    chainId: activeChainId,
  };
}

"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { SAVANNA_VAULT_ABI, SAVANNA_CONTROLLER_ABI, SAVANNA_ORACLE_ABI, ERC20_ABI } from "@/config/abis";
import { getContracts } from "@/config/contracts";

export function useVaultData() {
  const { address, chainId } = useAccount();
  const activeChainId = chainId ?? 11142220;
  const contracts = getContracts(activeChainId);

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

  // Read token balance
  const { data: tokenBalance } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read token decimals
  const { data: tokenDecimals } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  // Read token symbol
  const { data: tokenSymbol } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  // Read allowance
  const { data: allowance } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, contracts.vault] : undefined,
  });

  // Read total recommendations
  const { data: totalRecommendations } = useReadContract({
    address: contracts.controller,
    abi: SAVANNA_CONTROLLER_ABI,
    functionName: "totalRecommendations",
  });

  // Read oracle asset price (for StatsBar APY calculation)
  const { data: oracleAssetPrice } = useReadContract({
    address: contracts.oracle as `0x${string}`,
    abi: SAVANNA_ORACLE_ABI,
    functionName: "getAssetPrice",
    args: [contracts.usdc],
    query: { enabled: !!contracts.oracle },
  });

  const dec = (tokenDecimals as number) ?? 6;

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
    tokenSymbol: (tokenSymbol as string) ?? "USDC",
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

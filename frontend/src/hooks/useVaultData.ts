"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { SAVANNA_VAULT_ABI, SAVANNA_CONTROLLER_ABI, ERC20_ABI } from "@/config/abis";
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

  const dec = (tokenDecimals as number) ?? 6;

  // Format helpers
  const formatBalance = (val: unknown) => {
    if (!val || typeof val !== "bigint") return "0";
    return Number(formatUnits(val, dec)).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  return {
    // Raw data
    totalAssets: totalAssets as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    totalDeployed: totalDeployed as bigint | undefined,
    totalPositions: totalPositions as bigint | undefined,
    userShares: userShares as bigint | undefined,
    sharesInAssets: sharesInAssets as bigint | undefined,
    userPosition: userPosition as any | undefined,
    hasActiveRequest: hasActiveRequest as boolean | undefined,
    tokenBalance: tokenBalance as bigint | undefined,
    tokenDecimals: dec,
    tokenSymbol: (tokenSymbol as string) ?? "USDC",
    allowance: allowance as bigint | undefined,
    totalRecommendations: totalRecommendations as bigint | undefined,

    // Formatted
    tvlFormatted: formatBalance(totalAssets),
    deployedFormatted: formatBalance(totalDeployed),
    userVaultBalanceFormatted: formatBalance(sharesInAssets),
    userTokenBalanceFormatted: formatBalance(tokenBalance),

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

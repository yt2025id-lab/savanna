"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useCallback } from "react";

export function useAuth() {
  const { ready, authenticated, login: privyLogin } = usePrivy();
  const { address, isConnected } = useAccount();

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  return {
    isAuthed: authenticated && isConnected,
    address: address ?? null,
    isConnected,
    ready,
    login,
  };
}

"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { celoSepolia } from "wagmi/chains";
import { useState, useCallback, useSyncExternalStore } from "react";

const CELO_SEPOLIA_ID = celoSepolia.id;

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const hydrated = useHydrated();
  const [showPicker, setShowPicker] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [switchingChain, setSwitchingChain] = useState(false);

  const handleConnect = useCallback(async (connector: (typeof connectors)[number]) => {
    setConnectError(null);
    setShowPicker(false);

    try {
      const result = await connectAsync({ connector });

      const currentChainId = result.chainId ?? Number(await connector.getChainId());

      if (currentChainId !== CELO_SEPOLIA_ID) {
        setSwitchingChain(true);
        try {
          await switchChainAsync({ chainId: CELO_SEPOLIA_ID });
        } catch {
          setConnectError("Connected but wrong network. Use MetaMask to switch to Celo Sepolia.");
        } finally {
          setSwitchingChain(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("User rejected") || msg.includes("denied") || msg.includes("rejected")) {
        setConnectError("Connection rejected.");
      } else if (msg.includes("already pending")) {
        setConnectError("Check MetaMask popup...");
      } else if (msg.includes("timeout") || msg.includes("timed out")) {
        setConnectError("Connection timed out. Unlock MetaMask and try again.");
      } else {
        setConnectError(msg.length > 80 ? msg.slice(0, 80) + "..." : msg || "Connection failed");
      }
    }
  }, [connectAsync, switchChainAsync]);

  const wrongChain = isConnected && chain && chain.id !== CELO_SEPOLIA_ID;

  if (!hydrated) return <div className="h-9 w-28 rounded-lg bg-card animate-pulse" />;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-card border border-border px-2.5 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-muted">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        {chain?.id === CELO_SEPOLIA_ID && (
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-info/10 px-2 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-info" />
            <span className="text-[10px] text-info font-medium">Sepolia</span>
          </div>
        )}
        {wrongChain && (
          <button
            onClick={async () => {
              setSwitchingChain(true);
              try {
                await switchChainAsync({ chainId: CELO_SEPOLIA_ID });
              } catch {
                setConnectError("Switch rejected. Please switch to Celo Sepolia in MetaMask.");
              } finally {
                setSwitchingChain(false);
              }
            }}
            disabled={switchingChain}
            className="rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning hover:bg-warning/20 transition-colors disabled:opacity-50"
          >
            {switchingChain ? "Switching..." : "Switch to Celo Sepolia"}
          </button>
        )}
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted hover:text-danger hover:border-danger/30 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setShowPicker(!showPicker); setConnectError(null); }}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-background hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      {connectError && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger shadow-xl z-50">
          {connectError}
        </div>
      )}

      {showPicker && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/10 transition-colors text-left disabled:opacity-50"
            >
              {connector.name === "MetaMask" ? (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 35 33" fill="none">
                  <path d="M32.958.001l-14.06 10.46 2.62-6.21L32.958.001z" fill="#E2761B" stroke="#E2761B" />
                  <path d="M2.022.001l13.96 10.55-2.52-6.3L2.022.001z" fill="#E4761B" stroke="#E4761B" />
                  <path d="M28.188 23.62l-3.74 5.74 8.02 2.2 2.31-7.82-6.59-.12z" fill="#D7C1B3" stroke="#D7C1B3" />
                  <path d="M.386 23.74l2.3 7.82 8.02-2.2-3.74-5.74-6.58.12z" fill="#D7C1B3" stroke="#D7C1B3" />
                  <path d="M10.476 14.38l-2.23 3.38 7.97.36-.28-8.56-5.46 4.82z" fill="#233447" stroke="#233447" />
                  <path d="M24.504 14.38l-5.56-4.78-.18 8.56 7.97-.36-2.23-3.42z" fill="#233447" stroke="#233447" />
                  <path d="M10.704 29.36l4.82-2.34-4.16-3.28-.66 5.62z" fill="#CD6116" stroke="#CD6116" />
                  <path d="M19.458 27.02l4.82 2.34-.66-5.62-4.16 3.28z" fill="#CD6116" stroke="#CD6116" />
                  <path d="M24.278 29.36l-4.82-2.34.4 1.88-.04.8 4.46-.34z" fill="#E4751F" stroke="#E4751F" />
                  <path d="M10.704 29.36l4.46.34-.04-.8.4-1.88-4.82 2.34z" fill="#E4751F" stroke="#E4751F" />
                </svg>
              ) : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
              <span>{(connector.name === "Injected" || connector.name === "MetaMask") ? "MetaMask" : connector.name}</span>
            </button>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
      )}
    </div>
  );
}

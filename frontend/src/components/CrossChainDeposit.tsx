"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Globe, ArrowDownRight, X, CheckCircle2 } from "lucide-react";
import { LIFI_CONFIG } from "@/config/contracts";

export function CrossChainDeposit() {
  const { isConnected, address, chainId } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [bridgeDone, setBridgeDone] = useState(false);

  const isOnCelo = chainId === 42220 || chainId === 11142220;
  const isMainnet = chainId === 42220;
  const destChain = isOnCelo ? chainId : LIFI_CONFIG.celoChainId;
  const destToken = isMainnet
    ? "0x765DE816845861e75A25fCA122bb6898B8B1282a" // cUSD (vault asset on mainnet)
    : "0x16AdCbd54e9De3C6Addf47dbff855A0bF609235D"; // Mock USDC (testnet)

  // Build Jumper (LI.FI) URL with correct parameters
  const jumperUrl = address
    ? `https://jumper.exchange/?` +
      `integrator=${LIFI_CONFIG.integrator}` +
      `&fromChain=&toChain=${destChain}` +
      `&toToken=${destToken}` +
      `&toAddress=${address}`
    : "https://jumper.exchange/";

  return (
    <>
      {/* Trigger Button */}
      <button
        data-cross-chain-deposit
        onClick={() => {
          setIsOpen(true);
          setBridgeDone(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-dim py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/15 hover:border-accent/50 cursor-pointer"
      >
        <Globe className="h-4 w-4" />
        Deposit from Another Chain
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">Cross-Chain Deposit</h3>
                <p className="text-xs text-muted mt-0.5">
                  Bridge tokens from any chain to deposit on Celo
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {isConnected ? (
                <>
                  {/* How it works */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent-dim p-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white mt-0.5">1</div>
                      <div>
                        <p className="text-xs font-medium text-accent">Open Jumper (Powered by LI.FI)</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Click the button below to open Jumper Exchange. It uses LI.FI&#39;s bridge aggregator to find the best route.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground mt-0.5">2</div>
                      <div>
                        <p className="text-xs font-medium">Bridge to Celo USDC</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Select any source chain (Ethereum, Arbitrum, Base, Polygon, etc.) and token. Destination is pre-set to Celo {isMainnet ? "cUSD" : "USDC"}.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground mt-0.5">3</div>
                      <div>
                        <p className="text-xs font-medium">Deposit into Savanna Vault</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          After bridging completes, come back here and deposit your {isMainnet ? "cUSD" : "USDC"} on Celo into the vault. AI will optimize your yield.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual bridge completion confirmation */}
                  {bridgeDone && (
                    <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-dim p-3">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <p className="text-xs text-accent font-medium">
                        Great! Now deposit your {isMainnet ? "cUSD" : "USDC"} on Celo using the deposit form above.
                      </p>
                    </div>
                  )}

                  {/* Destination info */}
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted">Destination</span>
                      <span className="text-xs font-medium text-accent">Celo</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted">Token</span>
                      <span className="text-xs font-medium">{isMainnet ? "cUSD" : "USDC"}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted">Address</span>
                      <span className="text-[11px] font-mono text-muted">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <a
                    href={jumperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Open Jumper (LI.FI) to Bridge
                  </a>

                  {/* Manual confirmation */}
                  <button
                    onClick={() => setBridgeDone(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-dim py-2.5 text-xs font-semibold text-accent transition-all hover:bg-accent/15"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    I&apos;ve Completed the Bridge
                  </button>

                  {/* Fallback info */}
                  <p className="text-center text-[11px] text-muted">
                    Powered by <span className="text-accent">LI.FI</span> — Aggregating 15+ bridges across 60+ chains
                  </p>
                </>
              ) : (
                <div className="py-12 text-center">
                  <Globe className="h-8 w-8 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">
                    Connect your wallet to start cross-chain deposit
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

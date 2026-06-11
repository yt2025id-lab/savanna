"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { LIFI_CONFIG } from "@/config/contracts";
import { RefreshCw, ArrowDown, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import clsx from "clsx";

interface TokenOption {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

const MAINNET_TOKENS: TokenOption[] = [
  { address: "0x471EcE3750Da237f93B8E339c536989b8978a438", symbol: "CELO", decimals: 18, name: "Celo Native" },
  { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", symbol: "USDC", decimals: 6, name: "USD Coin" },
  { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", symbol: "cUSD", decimals: 18, name: "Celo Dollar" },
];

const TESTNET_TOKENS: TokenOption[] = [
  { address: "0x16AdCbd54e9De3C6Addf47dbff855A0bF609235D", symbol: "USDC", decimals: 6, name: "Mock USDC" },
];

export function LiFiSwapCard() {
  const { address, chainId: activeChainId } = useAccount();
  const chainId = activeChainId ?? 42220;
  const isMainnet = chainId === 42220;

  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<TokenOption>(isMainnet ? MAINNET_TOKENS[0] : TESTNET_TOKENS[0]);
  const [quote, setQuote] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  const tokens = isMainnet ? MAINNET_TOKENS : TESTNET_TOKENS;
  const destToken = isMainnet
    ? "0x765DE816845861e75A25fCA122bb6898B8B1282a" // cUSD (vault asset)
    : TESTNET_TOKENS[0].address; // Mock USDC
  const toSymbol = isMainnet ? "cUSD" : "USDC";
  const destChain = isMainnet ? 42220 : 11142220;

  const jumperUrl = address
    ? `https://jumper.exchange/?integrator=${LIFI_CONFIG.integrator}&fromChain=${chainId}&toChain=${destChain}&toToken=${destToken}&toAddress=${address}`
    : "https://jumper.exchange/";

  const getQuotePrice = useCallback(async () => {
    if (!amount || Number(amount) <= 0) return;
    setQuoting(true);
    setErrorMsg("");
    setQuote(null);
    try {
      if (isMainnet) {
        const { getQuote, createClient } = await import("@lifi/sdk");
        const client = createClient({ integrator: LIFI_CONFIG.integrator });
        const parsedAmt = parseUnits(amount, selectedToken.decimals).toString();
        const result = await getQuote(client, {
          fromChain: chainId,
          toChain: destChain,
          fromToken: selectedToken.address,
          toToken: destToken,
          fromAmount: parsedAmt,
          fromAddress: address!,
        });
        if (result.estimate?.toAmount) {
          const destDecimals = isMainnet ? 18 : 6;
          setQuote(formatUnits(BigInt(result.estimate.toAmount), destDecimals));
        }
      } else {
        setQuote(amount);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Quote failed");
    }
    setQuoting(false);
  }, [amount, address, chainId, isMainnet, selectedToken.address, selectedToken.decimals, destChain]);

  const isBusy = quoting;

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setQuote(null); setErrorMsg(""); setAmount(""); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-dim/50 border border-dashed border-accent/20 py-4 transition-all hover:border-accent/40 hover:bg-accent-dim cursor-pointer"
      >
        <RefreshCw className="h-4 w-4 text-accent" />
        <div className="text-center">
          <p className="text-sm text-muted-light">Deposit with any Token</p>
          <p className="text-[10px] text-muted mt-0.5">Swap CELO, cUSD, or any token via LI.FI</p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold">Swap & Deposit</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground text-sm">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Source Token */}
              <div>
                <label className="text-xs text-muted mb-1.5 block">From</label>
                <div className="flex gap-2">
                  {tokens.map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => { setSelectedToken(t); setQuote(null); }}
                      className={clsx(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                        selectedToken.symbol === t.symbol
                          ? "bg-accent-dim border-accent/30 text-accent"
                          : "bg-transparent border-border text-muted-light hover:text-foreground"
                      )}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-muted mb-1.5 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); setErrorMsg(""); }}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-16 text-lg text-foreground placeholder-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
                    disabled={isBusy}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-accent">{selectedToken.symbol}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="rounded-full bg-accent-dim p-2 border border-accent/20">
                  <ArrowDown className="h-4 w-4 text-accent" />
                </div>
              </div>

              {/* Destination */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">To</span>
                  <span className="font-medium text-accent">{toSymbol} on Celo</span>
                </div>
              </div>

              {/* Quote */}
              {quote && (
                <div className="rounded-lg bg-accent-dim border border-accent/20 p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Estimated output</span>
                    <span className="font-medium text-accent">{Number(quote).toFixed(6)} {toSymbol}</span>
                  </div>
                </div>
              )}

              {/* Action */}
              {!quote ? (
                <button
                  onClick={getQuotePrice}
                  disabled={!amount || Number(amount) <= 0 || isBusy}
                  className={clsx(
                    "w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                    isBusy ? "bg-accent/30 text-white/50 cursor-wait" : "bg-accent text-white hover:bg-accent-hover"
                  )}
                >
                  {quoting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting Quote...
                    </span>
                  ) : isMainnet ? "Get Quote via LI.FI" : "Simulate Swap"}
                </button>
              ) : (
                <a
                  href={jumperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Swap on Jumper (LI.FI)
                </a>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg bg-danger-dim border border-danger/30 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                  <p className="text-xs text-danger">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect, useCallback, useRef } from "react";
import { Droplets, Clock, CheckCircle2, AlertCircle, Zap, Info, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/AuthModal";
import { CONTRACTS } from "@/config/contracts";

/* ------------------------------------------------------------------ */
/*  Token config                                                       */
/* ------------------------------------------------------------------ */
const FAUCET_TOKENS = [
  {
    symbol: "USDC",
    name: "USD Coin",
    amount: "100",
    decimals: 6,
    color: "#2775CA",
    bgGradient: "from-[#2775CA]/20 to-[#2775CA]/5",
    borderColor: "border-[#2775CA]/20 hover:border-[#2775CA]/40",
    description: "Stablecoin for yield deposits",
  },
  {
    symbol: "cbBTC",
    name: "Coinbase BTC",
    amount: "0.001",
    decimals: 8,
    color: "#F7931A",
    bgGradient: "from-[#F7931A]/20 to-[#F7931A]/5",
    borderColor: "border-[#F7931A]/20 hover:border-[#F7931A]/40",
    description: "Bitcoin on Celo",
  },
  {
    symbol: "cbETH",
    name: "Coinbase ETH",
    amount: "0.01",
    decimals: 18,
    color: "#627EEA",
    bgGradient: "from-[#627EEA]/20 to-[#627EEA]/5",
    borderColor: "border-[#627EEA]/20 hover:border-[#627EEA]/40",
    description: "Ethereum on Celo",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Cooldown helpers                                                   */
/* ------------------------------------------------------------------ */
function getCooldownEnd(tokenSymbol: string, address: string): number {
  if (typeof window === "undefined") return 0;
  const key = `savanna-faucet-${tokenSymbol}-${address}`;
  return Number(localStorage.getItem(key) ?? 0);
}
function setCooldownEnd(tokenSymbol: string, address: string) {
  const key = `savanna-faucet-${tokenSymbol}-${address}`;
  localStorage.setItem(key, String(Date.now() + 24 * 60 * 60 * 1000));
}
function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

/* ------------------------------------------------------------------ */
/*  Token SVG Icons                                                    */
/* ------------------------------------------------------------------ */
function USDCIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#2775CA" />
      <path
        d="M24 17.5C24 15.5 22.5 14.5 20 14.2V12H18V14.1C15.5 14.4 14 15.7 14 17.7C14 20.2 16 21 18.5 21.5L20 21.9V26.5C17.8 26.2 16.5 25 16.5 23.2H14.5C14.5 25.8 16.3 27.5 18 27.8V30H20V27.9C22.5 27.6 24 26.2 24 24C24 21.7 22.2 20.7 19.5 20.1L18 19.7V15.5C19.8 15.7 21 16.6 21 17.5H24Z"
        fill="white"
      />
      <path d="M17 20.3C15.5 19.9 14.5 19.3 14.5 17.8C14.5 16.4 15.5 15.5 17 15.2V20.3Z" fill="white" opacity="0" />
      <path d="M21 24.2C21 25.6 20 26.4 18 26.6V21.6L19.5 22C21 22.4 21 23.2 21 24.2Z" fill="white" opacity="0" />
    </svg>
  );
}

function CbBTCIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#F7931A" />
      <path
        d="M26.5 17C26.8 15.2 25.5 14.2 23.5 13.5L24.2 10.8L22.2 10.3L21.5 12.9C21 12.8 20.5 12.7 20 12.6L20.7 10L18.7 9.5L18 12.2C17.6 12.1 17.2 12 16.8 11.9L14.5 11.3L14 13.4C14 13.4 15.3 13.7 15.2 13.7C16 13.9 16.1 14.4 16.1 14.8L15.2 18.5C15.3 18.5 15.4 18.5 15.5 18.6H15.2L14 23.2C13.9 23.4 13.6 23.8 13 23.6C13 23.6 11.8 23.3 11.8 23.3L11 25.5L13.2 26C13.6 26.1 14 26.2 14.4 26.3L13.7 29L15.7 29.5L16.4 26.8C16.9 26.9 17.5 27 18 27.1L17.3 29.7L19.3 30.2L20 27.5C22.8 28 24.9 27.8 25.7 25.3C26.4 23.3 25.7 22.2 24.2 21.4C25.3 21.1 26.2 20.4 26.5 17ZM22.5 24.2C22 26.2 18.9 25.5 17.4 25.1L18.4 21.2C19.9 21.6 23 22.1 22.5 24.2ZM23 17C22.5 18.9 20 18.3 18.7 18L19.6 14.5C20.9 14.8 23.5 15 23 17Z"
        fill="white"
      />
    </svg>
  );
}

function CbETHIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#627EEA" />
      <path d="M20 8L19.7 8.9V23.4L20 23.7L26.5 19.8L20 8Z" fill="white" opacity="0.6" />
      <path d="M20 8L13.5 19.8L20 23.7V8Z" fill="white" />
      <path d="M20 25.2L19.8 25.5V30.5L20 31L26.5 21.3L20 25.2Z" fill="white" opacity="0.6" />
      <path d="M20 31V25.2L13.5 21.3L20 31Z" fill="white" />
      <path d="M20 23.7L26.5 19.8L20 16.4V23.7Z" fill="white" opacity="0.2" />
      <path d="M13.5 19.8L20 23.7V16.4L13.5 19.8Z" fill="white" opacity="0.5" />
    </svg>
  );
}

const TOKEN_ICONS: Record<string, ({ size }: { size?: number }) => React.ReactElement> = {
  USDC: USDCIcon,
  cbBTC: CbBTCIcon,
  cbETH: CbETHIcon,
};

/* ------------------------------------------------------------------ */
/*  Faucet Page                                                       */
/* ------------------------------------------------------------------ */
export default function FaucetPage() {
  const { address, isConnected, chainId } = useAccount();
  const { isAuthed, login } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [totalClaimed, setTotalClaimed] = useState(0);
  const isMainnet = chainId === 42220;

  // Redirect to Earn on mainnet (no faucet)
  useEffect(() => {
    if (isMainnet) {
      window.location.href = "/earn";
    }
  }, [isMainnet]);

  if (isMainnet) return null;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load total claimed from localStorage
  useEffect(() => {
    if (!address) return;
    const key = `savanna-faucet-claimed-${address}`;
    setTotalClaimed(Number(localStorage.getItem(key) ?? 0));
  }, [address]);

  const addClaimedCount = useCallback(() => {
    if (!address) return;
    const key = `savanna-faucet-claimed-${address}`;
    setTotalClaimed((prev) => {
      const next = prev + 1;
      localStorage.setItem(key, String(next));
      return next;
    });
  }, [address]);

  return (
    <main className="relative flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-80 w-96 rounded-full bg-info/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute -bottom-20 right-1/4 h-60 w-72 rounded-full bg-accent/5 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#2775CA]/3 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="relative mb-8 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20 animate-pulse-glow">
            <Droplets className="h-7 w-7 text-info" />
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-info text-[9px] font-bold text-white">
              3
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Token Faucet</h1>
            <p className="text-sm text-muted-light mt-1">
              Claim free test tokens every 24 hours to explore DeFi strategies.
            </p>
          </div>
          {/* Stats */}
          {isAuthed && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] text-muted">Claimed</span>
              <span className="text-sm font-bold text-accent">{totalClaimed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Auth prompt */}
      {!isAuthed && (
        <div className="relative mb-6 animate-fade-in">
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-dim px-4 py-3">
            <Info className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs text-muted-light">
              Connect to claim test tokens. Sign in with Google, email, or your wallet.
            </p>
            <button
              onClick={login}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-background hover:bg-accent-hover transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {/* Token Cards */}
      <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {FAUCET_TOKENS.map((token) => (
          <FaucetCard
            key={token.symbol}
            token={token}
            address={address}
            isConnected={isConnected}
            isAuthed={isAuthed}
            now={now}
            onClaimed={addClaimedCount}
            onConnect={login}
          />
        ))}
      </div>

      {/* How it works */}
      <div className="relative mt-8 animate-fade-in rounded-2xl border border-border bg-card p-6" style={{ animationDelay: "0.2s" }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">How it works</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Connect & Sign", desc: "Connect your wallet and sign a free message to authenticate." },
            { step: "2", title: "Claim Tokens", desc: "Each token can be claimed once per 24 hours. No gas required." },
            { step: "3", title: "Start Earning", desc: "Head to the Earn page and deposit tokens into AI-optimized vaults." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                {item.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Faucet Card — premium version                                      */
/* ------------------------------------------------------------------ */
function FaucetCard({
  token,
  address,
  isConnected,
  isAuthed,
  now,
  onClaimed,
  onConnect,
}: {
  token: (typeof FAUCET_TOKENS)[number];
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isAuthed: boolean;
  now: number;
  onClaimed: () => void;
  onConnect: () => void;
}) {
  const cooldownEnd = address ? getCooldownEnd(token.symbol, address) : 0;
  const cooldownRemaining = cooldownEnd - now;
  const canClaim = isAuthed && cooldownRemaining <= 0;

  const { writeContract, data: txHash, isPending: isWriting, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Faucet contract address from config
  const FAUCET_ADDRESS = process.env.NEXT_PUBLIC_FAUCET_ADDRESS as `0x${string}` | undefined;
  const FAUCET_ABI = [
    { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
  ] as const;

  // Token address mapping
  const usdcAddress = CONTRACTS[11142220]?.usdc;
  const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
    USDC: usdcAddress as `0x${string}`,
    cbBTC: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    cbETH: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  };

  const claimedRef = useRef(false);
  useEffect(() => {
    if (isSuccess && address && !claimedRef.current) {
      claimedRef.current = true;
      setCooldownEnd(token.symbol, address);
      onClaimed();
    }
  }, [isSuccess, token.symbol, address, onClaimed]);

  const handleClaim = () => {
    if (!address || !canClaim || !FAUCET_ADDRESS) return;
    const tokenAddress = TOKEN_ADDRESSES[token.symbol];
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Token not in faucet yet — simulate for demo
      setCooldownEnd(token.symbol, address);
      onClaimed();
      return;
    }
    writeContract({
      address: FAUCET_ADDRESS,
      abi: FAUCET_ABI,
      functionName: "claim",
      args: [tokenAddress as `0x${string}`],
      chainId: 11142220,
    });
  };

  const isProcessing = isWriting || isConfirming;
  const IconComponent = TOKEN_ICONS[token.symbol];

  return (
    <div
      className={`group relative rounded-2xl border bg-gradient-to-br ${token.bgGradient} ${token.borderColor} p-[1px] transition-all hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5`}
    >
      <div className="rounded-2xl bg-[#0D1A0F]/80 p-5 h-full flex flex-col">
        {/* Token header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <IconComponent size={40} />
            {/* Pulse ring on ready */}
            {canClaim && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: token.color }} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{token.symbol}</h3>
            <p className="text-[10px] text-muted">{token.name}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-3xl font-bold text-foreground">{token.amount}</span>
          <span className="text-sm font-medium text-muted">{token.symbol}</span>
        </div>
        <p className="text-[10px] text-muted mb-4">{token.description}</p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Claim button */}
        {!isAuthed ? (
          <button onClick={onConnect} className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-background hover:bg-accent-hover transition-all">
            Connect
          </button>
        ) : isProcessing ? (
          <button disabled className="w-full rounded-xl py-2.5 text-sm font-medium text-accent animate-pulse" style={{ background: `${token.color}20` }}>
            {isConfirming ? "Confirming…" : "Claiming…"}
          </button>
        ) : isSuccess ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-[#22c55e]/10 py-2.5 text-sm font-medium text-[#22c55e]">
            <CheckCircle2 className="h-4 w-4" />
            Claimed!
          </div>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            className="group/btn w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: token.color }}
          >
            <Zap className="h-3.5 w-3.5" />
            Claim {token.symbol}
            <ChevronRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm text-muted">
            <Clock className="h-3.5 w-3.5" />
            {formatCooldown(cooldownRemaining)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-dim p-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />
            <p className="text-[11px] text-danger flex-1">{error.message.slice(0, 100)}</p>
            <button onClick={() => reset()} className="text-[10px] text-muted hover:text-foreground">✕</button>
          </div>
        )}

        {/* Tx hash */}
        {txHash && (
          <p className="mt-2 text-[10px] text-muted font-mono truncate">
            tx: {txHash}
          </p>
        )}
      </div>
    </div>
  );
}

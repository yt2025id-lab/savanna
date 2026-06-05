"use client";

import { useAccount, useBalance, useReadContract } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import { ERC20_ABI } from "@/config/abis";
import { useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  Trophy,
  Target,
  Users,
  Copy,
  ArrowRight,
  Gift,
  Star,
  Shield,
  Zap,
  ExternalLink,
  Flame,
  Crown,
  Info,
  BarChart3,
  Coins,
  Leaf,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthModal";

/* ------------------------------------------------------------------ */
/*  Mock XP / Quests / Leaderboard data                                */
/* ------------------------------------------------------------------ */
const DAILY_QUESTS = [
  { name: "Deposit into a vault", xp: 50, done: false, icon: Coins },
  { name: "Run AI strategy", xp: 30, done: false, icon: Zap },
  { name: "Claim faucet tokens", xp: 20, done: false, icon: Leaf },
  { name: "Invite a friend", xp: 100, done: false, icon: Users },
];

const LEADERBOARD = [
  { rank: 1, address: "0x7a3b…f2e1", xp: 2840, badge: Crown },
  { rank: 2, address: "0x9d4c…a8b3", xp: 1920, badge: Flame },
  { rank: 3, address: "0x2f8e…d4c7", xp: 1450, badge: Star },
];

/* ------------------------------------------------------------------ */
/*  Portfolio Page                                                     */
/* ------------------------------------------------------------------ */
export default function PortfolioPage() {
  const { address, chainId } = useAccount();
  const { isAuthed, login } = useAuth();
  const activeChainId = chainId ?? 11142220;
  const contracts = CONTRACTS[activeChainId as keyof typeof CONTRACTS];

  // Native CELO balance
  const { data: celoBalance } = useBalance({ address, chainId: activeChainId });

  // USDC ERC-20 balance
  const enabled = !!address && !!contracts?.usdc;
  const { data: usdcRaw, error: usdcError } = useReadContract({
    address: contracts?.usdc as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const { data: usdcDecimals } = useReadContract({
    address: contracts?.usdc as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled },
  });
  const usdcFormatted = usdcRaw && usdcDecimals ? Number(usdcRaw) / 10 ** Number(usdcDecimals) : 0;

  // Debug logging
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log({ address, contracts_usdc: contracts?.usdc, usdcRaw, usdcDecimals, usdcError, activeChainId });
    }
  }, [address, contracts?.usdc, usdcRaw, usdcDecimals, usdcError, activeChainId]);

  const celoDecimals = celoBalance?.decimals ?? 18;
  const celoNum = celoBalance ? Number(celoBalance.value) / 10 ** celoDecimals : 0;
  const portfolioValue = usdcFormatted * 1 + celoNum * 0.5;

  // Referral state
  const [refCode] = useState(() => {
    if (!address) return "";
    return `SAV-${address.slice(2, 8).toUpperCase()}`;
  });
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showQuests, setShowQuests] = useState(false);

  // Animated XP counter
  const [displayXp, setDisplayXp] = useState(0);
  const targetXp = isAuthed ? 0 : 0;
  useEffect(() => {
    const diff = targetXp - displayXp;
    if (Math.abs(diff) < 1) return;
    const step = Math.ceil(Math.abs(diff) / 20);
    setDisplayXp((prev) => prev + (diff > 0 ? step : -step));
  }, [targetXp, displayXp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-80 w-96 rounded-full bg-accent/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute -bottom-20 right-1/4 h-60 w-72 rounded-full bg-info/5 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Auth prompt */}
      {!isAuthed && (
        <div className="relative mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-dim px-4 py-3 animate-fade-in">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-light flex-1">Connect to view your full portfolio, XP, and referral rewards.</p>
          <button onClick={login} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-background hover:bg-accent-hover transition-colors">
            Connect
          </button>
        </div>
      )}

      {/* Portfolio Value Hero */}
      <div className="relative rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-info/5 p-6 mb-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Portfolio Value</p>
            <p className="text-4xl font-bold text-accent tabular-nums">
              {isAuthed ? `$${formatUsd(portfolioValue)}` : "$0.00"}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted">Celo Sepolia</span>
              {isAuthed && portfolioValue > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[9px] font-bold text-[#22c55e]">
                  <TrendingUp className="h-2.5 w-2.5" />
                  Active
                </span>
              )}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 animate-pulse-glow">
            <TrendingUp className="h-6 w-6 text-accent" />
          </div>
        </div>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-5">
          {/* Vault Positions */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                Vault Positions
              </h2>
              {isAuthed && (
                <a href="/earn" className="text-[10px] text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
                  Deposit <ArrowRight className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            {isAuthed ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-info/10 border border-accent/20">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No vault positions yet</p>
                <p className="text-xs text-muted mb-4">Deposit on the Earn page to start earning yield with AI optimization.</p>
                <a
                  href="/earn"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-background transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
                >
                  Start Earning <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim">
                  <Wallet className="h-7 w-7 text-muted" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Wallet not connected</p>
                <p className="text-xs text-muted">Connect and sign in to view your positions.</p>
              </div>
            )}
          </div>

          {/* Wallet Balances */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent" />
                Balance
              </h2>
              <span className="text-[10px] text-muted">Celo Sepolia</span>
            </div>

            {isAuthed ? (
              <div className="space-y-3">
                <BalanceRow icon={<USDCMini />} symbol="USDC" name="USD Coin" balance={usdcFormatted.toFixed(4)} usdValue={usdcFormatted * 1} color="#2775CA" />
                <BalanceRow icon={<CeloMini />} symbol="CELO" name="Celo Native" balance={celoNum.toFixed(4)} usdValue={celoNum * 0.5} color="#35D07F" />
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xl font-bold text-muted">$0.00</p>
                <p className="text-[10px] text-muted mt-1">Connect wallet to view balances</p>
              </div>
            )}
          </div>

          {/* XP + Progress */}
          <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-accent" />
                Your Progress
              </h2>
              <span className="text-[10px] text-muted">Level 1</span>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-2xl font-bold text-accent">{displayXp} XP</span>
                <span className="text-[10px] text-muted">100 XP to Level 2</span>
              </div>
              <div className="h-2.5 rounded-full bg-accent-dim overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-700" style={{ width: `${Math.min((displayXp / 100) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Achievement badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge emoji="🌱" label="Early Adopter" unlocked />
              <Badge emoji="🦁" label="Savanna Pioneer" unlocked={false} />
              <Badge emoji="💎" label="Diamond Hands" unlocked={false} />
              <Badge emoji="🤖" label="AI Strategist" unlocked={false} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Leaderboard */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Leaderboard</h3>
              </div>
              <ArrowRight className={`h-3.5 w-3.5 text-muted transition-transform ${showLeaderboard ? "rotate-90" : ""}`} />
            </button>
            {showLeaderboard && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {LEADERBOARD.map((entry) => (
                  <div key={entry.rank} className="flex items-center gap-3 rounded-xl bg-background p-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-[11px] ${entry.rank === 1 ? "bg-warning/20 text-warning" : entry.rank === 2 ? "bg-muted/20 text-muted" : "bg-accent-dim text-accent"}`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-mono text-foreground">{entry.address}</p>
                    </div>
                    <p className="text-xs font-bold text-accent">{entry.xp.toLocaleString()} XP</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Quests */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <button onClick={() => setShowQuests(!showQuests)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold text-foreground">Daily Quests</h3>
                <span className="rounded-full bg-info/15 px-2 py-0.5 text-[9px] font-bold text-info">{DAILY_QUESTS.filter((q) => q.done).length}/{DAILY_QUESTS.length}</span>
              </div>
              <ArrowRight className={`h-3.5 w-3.5 text-muted transition-transform ${showQuests ? "rotate-90" : ""}`} />
            </button>
            {showQuests && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {DAILY_QUESTS.map((quest) => (
                  <div key={quest.name} className="flex items-center gap-3 rounded-xl bg-background p-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/15">
                      <quest.icon className="h-3.5 w-3.5 text-info" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-foreground">{quest.name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-accent">+{quest.xp} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invite Friends */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-[#a855f7]/10 to-[#a855f7]/5 p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a855f7]/15">
                <Users className="h-4 w-4 text-[#a855f7]" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Invite Friends</h3>
                <p className="text-[10px] text-muted">Earn XP rewards together</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-[#0D1A0F] p-3 text-center">
                <p className="text-[10px] text-muted">Total Referrals</p>
                <p className="text-lg font-bold text-foreground">0</p>
              </div>
              <div className="rounded-xl bg-[#0D1A0F] p-3 text-center">
                <p className="text-[10px] text-muted">XP Earned</p>
                <p className="text-lg font-bold text-accent">0</p>
              </div>
            </div>

            {/* Referral Code */}
            <div className="mb-3">
              <p className="text-[10px] text-muted mb-1.5">Your Referral Code</p>
              <div className="flex items-center gap-2 rounded-xl bg-[#0D1A0F] border border-border px-3 py-2.5">
                <p className="text-xs font-mono text-foreground flex-1">
                  {isAuthed ? refCode : "Connect wallet"}
                </p>
                <button onClick={handleCopy} disabled={!isAuthed} className="text-muted hover:text-accent transition-colors disabled:cursor-not-allowed" title="Copy code">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              disabled={!isAuthed}
              className="w-full rounded-xl bg-[#a855f7] py-2.5 text-xs font-bold text-white transition-all hover:bg-[#9333ea] hover:shadow-lg hover:shadow-[#a855f7]/20 disabled:bg-[#a855f7]/20 disabled:text-muted disabled:cursor-not-allowed"
            >
              {copied ? "✓ Copied!" : "Copy Referral Link"}
            </button>

            {/* Friend code input */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-3.5 w-3.5 text-[#a855f7]" />
                <span className="text-[10px] text-muted">Enter your friend&apos;s referral code</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  placeholder="SAV-XXXXXX"
                  className="flex-1 rounded-xl border border-border bg-[#0D1A0F] px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none font-mono"
                />
                <button
                  disabled={!friendCode.match(/^SAV-[A-F0-9]{6}$/i)}
                  className="rounded-xl bg-[#a855f7]/15 px-3 py-2 text-xs font-semibold text-[#a855f7] transition-all hover:bg-[#a855f7] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */
function BalanceRow({ icon, symbol, name, balance, usdValue, color }: { icon: React.ReactNode; symbol: string; name: string; balance: string; usdValue: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background p-3.5 border border-transparent hover:border-border transition-colors">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{symbol}</p>
        <p className="text-[10px] text-muted">{name}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-foreground">
          {balance} <span className="text-muted">{symbol}</span>
        </p>
        <p className="text-[10px] text-muted">${formatUsd(usdValue)}</p>
      </div>
    </div>
  );
}

function USDCMini() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#2775CA20" }}>
      <svg width="18" height="18" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#2775CA" /><path d="M24 17.5C24 15.5 22.5 14.5 20 14.2V12H18V14.1C15.5 14.4 14 15.7 14 17.7C14 20.2 16 21 18.5 21.5L20 21.9V26.5C17.8 26.2 16.5 25 16.5 23.2H14.5C14.5 25.8 16.3 27.5 18 27.8V30H20V27.9C22.5 27.6 24 26.2 24 24C24 21.7 22.2 20.7 19.5 20.1L18 19.7V15.5C19.8 15.7 21 16.6 21 17.5H24Z" fill="white" /></svg>
    </div>
  );
}

function CeloMini() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#35D07F20" }}>
      <svg width="18" height="18" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#35D07F" /><circle cx="16" cy="20" r="6" stroke="white" strokeWidth="2" fill="none" /><circle cx="24" cy="20" r="6" stroke="white" strokeWidth="2" fill="none" /></svg>
    </div>
  );
}

function Badge({ emoji, label, unlocked }: { emoji: string; label: string; unlocked: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${unlocked ? "border-accent/30 bg-accent/10" : "border-border bg-card"}`}>
      <span className={`text-sm ${unlocked ? "" : "grayscale opacity-40"}`}>{emoji}</span>
      <span className={`text-[9px] font-medium ${unlocked ? "text-accent" : "text-muted"}`}>{label}</span>
    </div>
  );
}

function formatUsd(value: number): string {
  if (value >= 1) return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value > 0) return value.toFixed(4);
  return "0.00";
}

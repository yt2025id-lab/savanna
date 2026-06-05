"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import {
  Sparkles,
  Cpu,
  Shield,
  TrendingUp,
  Zap,
  Brain,
  ArrowRight,
  Info,
  BarChart3,
  Gauge,
  Lightbulb,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  Target,
  Fingerprint,
  DollarSign,
} from "lucide-react";
import { useAuth } from "@/components/AuthModal";
import { LogoMark } from "@/components/landing/Icons";
import { useX402Strategy } from "@/hooks/useX402Strategy";
import { detectMiniPay } from "@/lib/minipay";

/* ------------------------------------------------------------------ */
/*  Token options                                                      */
/* ------------------------------------------------------------------ */
const TOKENS = [
  { symbol: "USDC", label: "USDC", color: "#2775CA" },
  { symbol: "cUSD", label: "cUSD (MiniPay)", color: "#4A7C59" },
] as const;

const RISK_LEVELS = [
  { value: "Any", color: "#C8A84B", bg: "bg-accent" },
  { value: "Low", color: "#22c55e", bg: "bg-[#22c55e]" },
  { value: "Medium", color: "#f59e0b", bg: "bg-warning" },
  { value: "High", color: "#ef4444", bg: "bg-danger" },
] as const;

const OPTIMIZE_FOR = ["Balanced", "Higher APY", "Lower Risk"] as const;

const QUICK_NOTES = [
  "Preserve capital, blue-chip protocols only",
  "Maximise yield, comfortable with high risk",
  "Diversify across two or three vaults",
  "Stable yield for long-term holding",
  "Prefer audited protocols with low TVL risk",
] as const;

/* ------------------------------------------------------------------ */
/*  Strategy type                                                      */
/* ------------------------------------------------------------------ */
interface Strategy {
  name: string;
  protocol: string;
  apy: number;
  risk: string;
  tvl: string;
  confidence: number;
  chain: string;
  allocation: number;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  AI Page                                                            */
/* ------------------------------------------------------------------ */
export default function AIPage() {
  const { isConnected, address } = useAccount();
  const { isAuthed, login } = useAuth();
  const { payAndAnalyze, isLoading: x402Loading, result: x402Result, error: x402Error, paymentRequired } = useX402Strategy();

  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [riskTolerance, setRiskTolerance] = useState("Any");
  const [optimizeFor, setOptimizeFor] = useState("Balanced");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[] | null>(null);
  const isMiniPay = typeof window !== "undefined" && detectMiniPay();

  const toggleToken = (symbol: string) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const handleRunAI = async () => {
    if (!isAuthed || !address) return;
    setIsRunning(true);
    setShowResults(false);
    setStrategies(null);

    try {
      const timeHorizonMap: Record<string, number> = {
        "Lower Risk": 7 * 86400,
        "Balanced": 30 * 86400,
        "Higher APY": 90 * 86400,
      };
      const horizon = timeHorizonMap[optimizeFor] || 30 * 86400;

      const result = await payAndAnalyze({
        userAddress: address,
        timeHorizon: horizon,
        depositAmount: "100",
      });

      if (result) {
        const mapped = result.allProtocols.map((p, i) => ({
          name: p.protocol === "Aave V3" ? "Aave V3 Lending" : p.protocol === "MentoSavings" ? "Mento Savings" : p.protocol === "Moola" ? "Moola Market Supply" : p.protocol === "Reserve" ? "Savanna Reserve" : p.protocol,
          protocol: p.protocol,
          apy: p.apy,
          risk: p.safetyScore > 90 ? "Low" : p.safetyScore > 70 ? "Medium" : "High",
          tvl: "$--",
          confidence: p.safetyScore,
          chain: "Celo",
          allocation: i === 0 ? Math.round(result.allocationBps / 100) : Math.round((10000 - result.allocationBps) / 200),
          color: p.protocolId === 0 ? "#B6509E" : p.protocolId === 1 ? "#4A7C59" : p.protocolId === 2 ? "#fb6236" : "#C8A84B",
        }));
        setStrategies(mapped);
        setShowResults(true);
      } else {
        setError(x402Error || "No AI response received. Check x402 server connection.");
      }
    } catch (err: any) {
      setError(err?.message || "AI strategy analysis failed");
    }

    setIsRunning(false);
  };

  return (
    <main className="relative flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">

      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-80 w-96 rounded-full bg-accent/5 blur-[120px] animate-glow-pulse" />
        <div className="absolute -bottom-20 right-1/3 h-60 w-72 rounded-full bg-info/5 blur-[100px] animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative grid gap-6 lg:grid-cols-5">
        {/* Left — Main form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-info/5 p-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/30">
                <Brain className="h-6 w-6 text-accent" />
                <div className="absolute -top-1 -right-1 rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[8px] font-bold text-white">
                  LIVE
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">AI-Powered Strategy</span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold text-accent">3 live vaults</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Find your best vault in seconds</h1>
                <p className="text-sm text-muted-light mt-1 leading-relaxed">
                  Pick your assets and preferences. Savanna AI ranks live on-chain strategies and explains each pick.
                </p>
              </div>
            </div>
          </div>

          {/* Auth prompt */}
          {!isAuthed && (
            <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent-dim px-4 py-3 animate-fade-in">
              <Info className="h-4 w-4 text-accent shrink-0" />
              <p className="text-xs text-muted-light flex-1">Connect to run the AI assistant against live strategies.</p>
              <button onClick={login} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-background hover:bg-accent-hover transition-colors">
                Connect
              </button>
            </div>
          )}

          {/* Token selection */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">Tokens</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTokens(new Set())}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedTokens.size === 0 ? "bg-accent text-background" : "bg-accent-dim text-muted-light hover:bg-card-hover"
                }`}
              >
                All Tokens
              </button>
              {TOKENS.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => toggleToken(t.symbol)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedTokens.has(t.symbol)
                      ? "text-white"
                      : "bg-accent-dim text-muted-light hover:bg-card-hover"
                  }`}
                  style={selectedTokens.has(t.symbol) ? { backgroundColor: t.color } : undefined}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Risk tolerance */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2.5 block flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  Risk tolerance
                </label>
                <div className="flex gap-1.5">
                  {RISK_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setRiskTolerance(level.value)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all border ${
                        riskTolerance === level.value
                          ? `border-transparent text-white`
                          : "border-border bg-accent-dim text-muted-light hover:bg-card-hover"
                      }`}
                      style={riskTolerance === level.value ? { backgroundColor: level.color, borderColor: level.color } : undefined}
                    >
                      {level.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optimise for */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2.5 block flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-accent" />
                  Optimise for
                </label>
                <div className="flex gap-1.5">
                  {OPTIMIZE_FOR.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOptimizeFor(opt)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all border ${
                        optimizeFor === opt
                          ? "bg-accent text-background border-accent"
                          : "border-border bg-accent-dim text-muted-light hover:bg-card-hover"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-card p-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-accent" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. preserve capital, prefer blue-chip protocols…"
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 resize-none transition-colors"
            />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {QUICK_NOTES.map((note) => (
                <button
                  key={note}
                  onClick={() => setNotes(note)}
                  className="rounded-full border border-border bg-accent-dim px-2.5 py-1 text-[10px] text-muted-light transition-all hover:border-accent/30 hover:text-foreground"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {isRunning ? (
              <>
                <Loader2 className="mx-auto h-10 w-10 text-accent animate-spin mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">AI is analysing strategies…</h3>
                <p className="text-xs text-muted">Evaluating risk, APY, and TVL across live vaults…</p>
                {/* Animated progress bar */}
                <div className="mt-4 h-1.5 rounded-full bg-accent-dim overflow-hidden">
                  <div className="h-full rounded-full bg-accent animate-shimmer" style={{ width: "60%", animation: "shimmer 1.5s infinite" }} />
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {showResults ? "Strategy updated!" : "Ready to find your best vault?"}
                </h3>
                <p className="text-xs text-muted mb-4">
                  {showResults
                    ? "Review the ranked strategies below. Tap any vault to learn more."
                    : "Adjust your preferences, then get an AI-optimized allocation."}
                </p>
              </>
            )}
            <button
              onClick={handleRunAI}
              disabled={!isAuthed || isRunning}
              className={`group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                !isAuthed || isRunning
                  ? "bg-accent-dim text-muted cursor-not-allowed"
                  : "bg-accent text-background hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 hover:-translate-y-0.5"
              }`}
            >
              <LogoMark size={18} color={isAuthed && !isRunning ? "#0D1A0F" : "#6B8F71"} />
              {isRunning ? "Processing…" : "Get AI Strategy"}
              {!isRunning && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </div>

          {/* Strategy Results */}
          {showResults && strategies && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                <h3 className="text-sm font-semibold text-foreground">Recommended Allocation</h3>
                <span className="text-[10px] text-muted ml-auto">Based on your {riskTolerance.toLowerCase()} risk profile</span>
              </div>

              {strategies.map((strategy) => (
                <StrategyCard key={strategy.name} strategy={strategy} />
              ))}

              {x402Error && (
                <div className="rounded-xl border border-warning/20 bg-warning-dim/30 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-foreground">x402 Payment Required</p>
                    <p className="text-[10px] text-muted leading-relaxed">{x402Error}</p>
                  </div>
                </div>
              )}

              {paymentRequired && (
                <div className="rounded-xl border border-accent/20 bg-accent-dim/30 p-3 flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-accent shrink-0" />
                  <p className="text-[10px] text-muted-light">x402 micropayment: AI agent pays $0.10 per strategy analysis</p>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-2xl border border-accent/20 bg-accent-dim/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-[10px] font-semibold text-foreground">AI Disclaimer</span>
                </div>
                <p className="text-[10px] text-muted leading-relaxed">
                  Strategies are generated by AI and based on historical data. Past performance does not guarantee future results.
                  Always DYOR and never deposit more than you can afford to lose.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right — Sidebar */}
        <div className="lg:col-span-2 space-y-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {/* How it works */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              How AI Strategy works
            </h3>
            <div className="space-y-3">
              {[
                { icon: Shield, label: "Risk Analysis", desc: "Evaluates protocol audit status, TVL stability, and smart-contract risk.", color: "#22c55e" },
                { icon: TrendingUp, label: "Yield Ranking", desc: "Compares real-time APYs across Aave, Moola, and Reserve strategies.", color: "#C8A84B" },
                { icon: Cpu, label: "On-Chain Execution", desc: "Sends recommendation via Chainlink Functions to the Controller.", color: "#627EEA" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${step.color}20` }}>
                    <step.icon className="h-3.5 w-3.5" style={{ color: step.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{step.label}</p>
                    <p className="text-[11px] text-muted leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live protocols */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-xs font-semibold text-foreground mb-3">Live Protocols</h3>
            <div className="space-y-2">
              {[
                { name: "Aave V3", chain: "Celo", color: "#B6509E", tvl: "$12.4M" },
                { name: "Moola Market", chain: "Celo", color: "#4A7C59", tvl: "$3.1M" },
                { name: "Savanna Reserve", chain: "Celo", color: "#C8A84B", tvl: "$890K" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3 rounded-xl bg-background p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${p.color}20` }}>
                    <Leaf className="h-3.5 w-3.5" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{p.name}</p>
                    <p className="text-[9px] text-muted">{p.chain} · TVL {p.tvl}</p>
                  </div>
                  <span className="rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[9px] font-bold text-[#22c55e]">Live</span>
                </div>
              ))}
            </div>
          </div>

          {/* ERC-8004 Agent Identity */}
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-info/5 p-5">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-accent" />
              ERC-8004 Agent Trust
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 rounded-lg bg-background p-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15">
                  <Shield className="h-3 w-3 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-foreground">On-Chain Identity</p>
                  <p className="text-[9px] text-muted">Agent registered as ERC-721 NFT</p>
                </div>
                <span className="rounded-full bg-[#22c55e]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#22c55e]">VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background p-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-info/15">
                  <BarChart3 className="h-3 w-3 text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-foreground">Reputation Registry</p>
                  <p className="text-[9px] text-muted">Strategy feedback tracked on-chain</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background p-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#627EEA]/15">
                  <DollarSign className="h-3 w-3 text-[#627EEA]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-foreground">x402 Payment</p>
                  <p className="text-[9px] text-muted">$0.10 USDC per strategy request</p>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-muted mt-3 leading-relaxed">
              Savanna AI agents are registered with ERC-8004 identity and reputation on Celo. Every strategy decision is traceable and accountable.
            </p>
          </div>

          {/* Network badge */}
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/15">
              <Zap className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Celo L2</p>
              <p className="text-[10px] text-muted">{isMiniPay ? "MiniPay detected — zero-click deposit" : "1-second finality · $0.001 fees"}</p>
            </div>
          </div>

          {/* Powered by */}
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-accent mb-2" />
            <p className="text-xs text-muted-light">Savanna AI ranks every live strategy. Pick a vault and start earning.</p>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-medium text-info">ERC-8004</span>
              <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-medium text-accent">x402</span>
              <span className="rounded-full bg-[#627EEA]/15 px-2 py-0.5 text-[10px] font-medium text-[#627EEA]">Chainlink</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Strategy Card                                                      */
/* ------------------------------------------------------------------ */
function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-border-light hover:shadow-lg hover:shadow-accent/5 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${strategy.color}20` }}>
          <Leaf className="h-4.5 w-4.5" style={{ color: strategy.color }} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground">{strategy.name}</h4>
          <p className="text-[10px] text-muted">{strategy.protocol} · {strategy.chain}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-accent">{strategy.apy}%</p>
          <p className="text-[9px] text-muted">APY</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted">Confidence</span>
          <span className="text-[9px] font-semibold text-foreground">{strategy.confidence}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent-dim overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000"
            style={{ width: `${strategy.confidence}%` }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1 text-muted">
          <Gauge className="h-3 w-3" />
          {strategy.risk} risk
        </span>
        <span className="flex items-center gap-1 text-muted">
          <BarChart3 className="h-3 w-3" />
          TVL {strategy.tvl}
        </span>
        <span className="ml-auto flex items-center gap-1 font-semibold text-accent">
          {strategy.allocation}% allocation
        </span>
      </div>
    </div>
  );
}

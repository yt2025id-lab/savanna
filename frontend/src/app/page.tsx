import Link from "next/link";
import { Leaf, ArrowRight, Zap, Shield, BarChart3, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-dim px-4 py-1.5 mb-6">
            <Leaf className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">
              Cross-Chain · Live on Celo
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Regenerative
            <br />
            <span className="text-accent">Yield</span> on Celo
          </h1>

          <p className="mt-4 max-w-md mx-auto text-base text-muted-light leading-relaxed">
            Deposit stablecoins from any chain via LI.FI. AI finds the best
            yield across lending protocols on Celo. Earn passively.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/earn"
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
            >
              Start Earning
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-accent" />}
            title="AI-Optimized"
            description="Chainlink oracle analyzes lending rates across protocols and auto-deploys your funds to the highest yield."
          />
          <FeatureCard
            icon={<Globe className="h-5 w-5 text-accent" />}
            title="Cross-Chain via LI.FI"
            description="Deposit from any chain — Ethereum, Arbitrum, Optimism, Polygon, Base, and 50+ more — all in one click via LI.FI bridge."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5 text-accent" />}
            title="Secure by Design"
            description="OpenZeppelin ERC-4626 vault with custom errors, reentrancy guard, and emergency pause. Auditable on-chain."
          />
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t border-border bg-card/50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight mb-2">
            How it Works
          </h2>
          <p className="text-center text-sm text-muted mb-10">
            Four steps to start earning from any chain
          </p>

          <div className="grid gap-6 sm:grid-cols-4">
            <StepCard step={1} title="Bridge" description="Deposit from any chain via LI.FI — Ethereum, Arbitrum, Polygon, and 50+ more." />
            <StepCard step={2} title="Deposit" description="Receive USDC on Celo and deposit into the Savanna vault. Get svYLD shares." />
            <StepCard step={3} title="AI Analyzes" description="Chainlink oracle compares APY across Aave V3 and other lending protocols on Celo." />
            <StepCard step={4} title="Auto-Deploy" description="Funds deployed to the best protocol. Withdraw anytime." />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:border-border-light">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-dim mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white mb-3">
        {step}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </div>
  );
}

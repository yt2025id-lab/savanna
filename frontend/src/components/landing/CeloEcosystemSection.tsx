"use client";

import { AnimatedTitle } from "./AnimatedTitle";

const items = [
  { name: "x402 Protocol", desc: "AI agents pay $0.10 per strategy request via HTTP 402", color: "#C8A84B", tag: "Agentic Payments" },
  { name: "MiniPay", desc: "Zero-click connect, reduced deposits, fee abstraction CIP-64", color: "#4A7C59", tag: "Mobile-First DeFi" },
  { name: "ERC-8004", desc: "On-chain agent identity with reputation feedback", color: "#C8A84B", tag: "Agent Trust" },
  { name: "Chainlink", desc: "Price feeds + Functions for AI strategy analysis", color: "#4A7C59", tag: "Oracle Layer" },
  { name: "Aave V3", desc: "Lending pool yield — deposit USDC, earn with aTokens", color: "#C8A84B", tag: "Yield Source" },
  { name: "Mento Savings", desc: "Stable savings on cUSD with circuit breaker fallback", color: "#4A7C59", tag: "Stable Yield" },
  { name: "LI.FI Bridge", desc: "Cross-chain deposits from ETH, ARB, BASE, OP, POLYGON", color: "#C8A84B", tag: "Cross-Chain" },
  { name: "Celo Fee Abstraction", desc: "Pay gas in USDC/USDT/USDm — no CELO required", color: "#4A7C59", tag: "Gasless" },
  { name: "Ubeswap DEX", desc: "Uniswap V2 swap router — auto-swap to vault asset", color: "#C8A84B", tag: "DEX Layer" },
  { name: "Carbon Negative", desc: "Celo offsets 2x carbon — greenest chain for the savanna", color: "#4A7C59", tag: "Sustainability" },
];

function EcoCard({ item }: { item: typeof items[0] }) {
  return (
    <div className="eco-card">
      <div className="eco-card-accent-line" style={{ background: item.color }} />
      <div className="eco-card-inner">
        <div className="eco-card-text">
          <div className="eco-card-tag" style={{ borderColor: `${item.color}35`, color: item.color, background: `${item.color}0d` }}>
            {item.tag}
          </div>
          <h3 className="eco-card-name" style={{ color: item.color }}>{item.name}</h3>
          <p className="eco-card-desc">{item.desc}</p>
        </div>
      </div>
    </div>
  );
}

export function CeloEcosystemSection() {
  const items2 = [...items, ...items];

  return (
    <section
      className="section eco-section"
      id="ecosystem"
    >
      <div className="savanna-bg-anim savanna-bg-anim-fg">
        <img src="/savanna-ecosystem.svg" alt="" />
      </div>
      <div style={{ position: "relative", zIndex: 2 }}>
        <div className="section-label">Celo Ecosystem</div>
        <AnimatedTitle title="Full Stack<br /><b>Integration</b>" containerClass="mb-4" />
        <p className="section-sub" style={{ marginTop: "1rem" }}>
          Every piece of the Celo ecosystem, working together. x402 micropayments, MiniPay wallets, Chainlink oracles, and more.
        </p>

        <div className="eco-marquee-row">
          <div className="eco-marquee-fade-l" />
          <div className="eco-marquee-fade-r" />
          <div className="eco-marquee-track">
            {items2.map((item, i) => (
              <EcoCard key={`${item.name}-${i}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

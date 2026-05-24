"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { AnimatedTitle } from "./AnimatedTitle";

const features = [
  {
    title: "AI-Powered Yield",
    description: "Rebalancing engine scans Aave V3 and Mento Savings on Celo — automatically shifting capital to highest APY.",
    accent: "#C8A84B",
    tag: "Yield",
  },
  {
    title: "x402 Micropayments",
    description: "AI agents pay for strategy analysis via HTTP 402 protocol. $0.10 per request — autonomous agents, autonomous payments.",
    accent: "#C8A84B",
    tag: "Payments",
  },
  {
    title: "MiniPay Zero-Click",
    description: "Deposit with a single tap — no Connect Wallet, no signing. Reduced minimums and fee abstraction via Celo CIP-64.",
    accent: "#4A7C59",
    tag: "Mobile",
  },
  {
    title: "ERC-8004 Agent Trust",
    description: "AI agents register on-chain identity with reputation feedback. Every strategy decision is traceable and accountable.",
    accent: "#C8A84B",
    tag: "Identity",
  },
  {
    title: "Cross-Chain Deposits",
    description: "Bridge from Ethereum, Arbitrum, Base, Polygon, Optimism directly into Savanna via LI.FI. Deposit and earn instantly.",
    accent: "#4A7C59",
    tag: "Bridge",
  },
  {
    title: "Non-Custodial Vault",
    description: "You always hold your keys. Smart contract vault — no middlemen, no lock-ups. Withdraw anytime with Celo fee abstraction.",
    accent: "#4A7C59",
    tag: "Security",
  },
];

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      className="feat-card"
      style={{ ["--accent" as string]: feature.accent }}
    >
      <div className="feat-card-glow" style={{ background: `radial-gradient(ellipse at 50% 0%, ${feature.accent}15, transparent 70%)` }} />
      <div className="feat-card-border" />
      <div className="feat-card-inner">
        <div className="feat-card-tag" style={{ borderColor: `${feature.accent}30`, color: feature.accent, background: `${feature.accent}0d` }}>
          {feature.tag}
        </div>
        <h3 className="feat-card-title" style={{ color: feature.accent }}>{feature.title}</h3>
        <p className="feat-card-desc">{feature.description}</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const cards = containerRef.current.querySelectorAll(".feat-card");
    cards.forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: "top 92%", toggleActions: "play none none none" },
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: i * 0.08,
        ease: "power2.out",
      });
    });

    const title = containerRef.current.querySelector(".features-title-area");
    if (title) {
      gsap.from(title, {
        scrollTrigger: { trigger: title, start: "top 90%", toggleActions: "play none none none" },
        opacity: 0,
        y: 25,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  }, { scope: containerRef });

  return (
    <section
      ref={sectionRef}
      className="section"
      id="features"
      style={{
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
        background: "linear-gradient(180deg, #0D1A0F 0%, #111F13 30%, #0F1D11 70%, #0D1A0F 100%)",
      }}
    >
      <div className="savanna-bg-anim savanna-bg-anim-mid">
        <img src="/savanna-features.svg" alt="" />
      </div>

      <div ref={containerRef} style={{ position: "relative", zIndex: 1 }}>
        <div className="features-title-area">
          <div className="section-label">Hackathon Features</div>
          <AnimatedTitle title="Agentic <b>Payments</b><br />Meet <b>DeFi</b>" containerClass="mb-4" />
          <p className="section-sub" style={{ marginTop: "1rem" }}>
            x402 micropayments, MiniPay integration, and ERC-8004 agent identity — built for the Onchain Agents Hackathon on Celo.
          </p>
        </div>

        <div className="feat-grid">
          {features.map((f, i) => (
            <FeatureCard key={i} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

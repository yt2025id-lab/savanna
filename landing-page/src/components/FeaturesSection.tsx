"use client";

import { useEffect } from "react";

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Yield",
    desc: "Chainlink oracle analyzes lending rates across protocols and auto-deploys your funds to the highest APY. Smart rebalancing, zero effort.",
  },
  {
    icon: "🌉",
    title: "Cross-Chain Deposit",
    desc: "Deposit from any chain — Ethereum, Arbitrum, Base, Polygon, and 50+ more — all bridged seamlessly via LI.FI integration.",
  },
  {
    icon: "🛡️",
    title: "Battle-Tested Security",
    desc: "OpenZeppelin ERC-4626 vault with reentrancy guards, custom errors, and emergency pause. 21/21 smart contract tests passed.",
  },
];

export function FeaturesSection() {
  useEffect(() => {
    const gsap = require("gsap");
    const { ScrollTrigger } = require("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);

    // Section headers
    document.querySelectorAll("#features .section-label, #features .section-title, #features .section-sub").forEach((el: Element) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
        opacity: 0, y: 40, duration: 0.7,
      });
    });

    // Cards
    document.querySelectorAll(".feature-card").forEach((card: Element, i: number) => {
      gsap.from(card, {
        scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none reverse" },
        opacity: 0, y: 60, duration: 0.8, delay: i * 0.15,
      });
    });
  }, []);

  return (
    <section className="section" id="features" style={{ background: "var(--bg)" }}>
      <div className="section-label">Features</div>
      <h2 className="section-title">
        Built for the <span style={{ color: "var(--primary)" }}>Future of Finance</span>
      </h2>
      <p className="section-sub">
        Three pillars that make Savanna Finance the smartest way to earn yield on Celo.
      </p>
      <div className="features-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

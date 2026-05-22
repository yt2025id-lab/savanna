"use client";

import { useRef, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { BrainIcon, BridgeIcon, ShieldIcon, ShieldSmall } from "./Icons";

const chartBars = [30, 45, 35, 60, 50, 75, 65, 90, 80, 95, 85, 100];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use gsap.quickTo for performant per-pixel tilt
  const tiltRefs = useRef<Map<HTMLElement, { x: (v: number) => void; y: (v: number) => void }>>(new Map());

  const getQuickTo = useCallback((el: HTMLElement) => {
    if (!tiltRefs.current.has(el)) {
      tiltRefs.current.set(el, {
        x: gsap.quickTo(el, "rotateY", { duration: 0.3, ease: "power2.out", transformPerspective: 1000 }),
        y: gsap.quickTo(el, "rotateX", { duration: 0.3, ease: "power2.out", transformPerspective: 1000 }),
      });
    }
    return tiltRefs.current.get(el)!;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const qt = getQuickTo(card);
    qt.x(x * 10);
    qt.y(-y * 10);
  }, [getQuickTo]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const qt = getQuickTo(card);
    qt.x(0);
    qt.y(0);
  }, [getQuickTo]);

  useGSAP(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll(".feature-card");
    cards.forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: "top 90%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 60,
        duration: 0.8,
        delay: i * 0.15,
        ease: "power3.out",
      });
    });
  }, { scope: containerRef });

  return (
    <section
      className="section"
      id="features"
      style={{ background: "#0D1A0F", position: "relative", zIndex: 2 }}
    >
      <div ref={containerRef}>
        <div className="section-label">Features</div>
        <h2
          className="section-title"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Built for the Future of Finance
        </h2>
        <p className="section-sub">
          Three pillars that make Savanna Finance the smartest way to earn yield
          on Celo.
        </p>

        <div className="features-grid">
          {/* Card 1 — Large: AI-Powered Yield */}
          <div
            className="feature-card feature-card-large"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div>
              <span className="feature-icon feature-icon-glow"><BrainIcon size={48} /></span>
              <h3>AI-Powered Yield</h3>
              <p>
                Smart rebalancing engine continuously optimizes your position for
                maximum APY across Celo DeFi protocols. Zero effort, maximum
                returns.
              </p>
            </div>
            <div className="mini-chart">
              {chartBars.map((h, i) => (
                <div
                  key={i}
                  className="mini-chart-bar"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Card 2 — Cross-Chain Deposit (60%) */}
          <div
            className="feature-card feature-card-wide"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d" }}
          >
            <span className="feature-icon feature-icon-glow"><BridgeIcon size={48} /></span>
            <h3>Cross-Chain Deposit</h3>
            <p>
              Bridge assets from any chain directly into Savanna via LI.FI
              integration. One click, any chain, instant yield.
            </p>
            <div className="chain-logos">
              {["Celo", "Ethereum", "Arbitrum", "Base", "Polygon", "Optimism", "50+ more"].map(
                (chain) => (
                  <span key={chain} className="chain-badge">
                    {chain}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Card 3 — Security (40%) */}
          <div
            className="feature-card feature-card-narrow"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transformStyle: "preserve-3d" }}
          >
            <span className="feature-icon feature-icon-glow"><ShieldIcon size={48} /></span>
            <h3>Battle-Tested Security</h3>
            <p>
              21/21 smart contract tests passed. Chainlink oracle secured.
              Audited before launch. Your funds are safe.
            </p>
            <div className="shield-visual">
              <div className="shield-ring" />
              <div className="shield-ring" />
              <div className="shield-ring" />
              <span style={{ position: "relative", zIndex: 2 }}><ShieldSmall size={32} /></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

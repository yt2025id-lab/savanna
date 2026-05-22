"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ChartBarIcon } from "./Icons";

export function AboutSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    const els = containerRef.current.querySelectorAll(".anim-up");
    els.forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 40,
        duration: 0.7,
        delay: i * 0.1,
      });
    });
  }, { scope: containerRef });

  return (
    <section
      className="section"
      id="about"
      style={{
        background: "linear-gradient(180deg, #0D1A0F 0%, #111F13 50%, #0D1A0F 100%)",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div ref={containerRef}>
        <div className="anim-up section-label">What is Savanna</div>
        <h2
          className="anim-up section-title"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Intelligent Yield Protocol for Celo DeFi
        </h2>
        <div className="about-grid">
          {/* Left — Text */}
          <div>
            <p
              className="anim-up"
              style={{
                fontSize: "1.1rem",
                color: "#E8D5A3",
                lineHeight: 1.8,
                marginBottom: "1.5rem",
              }}
            >
              <strong style={{ color: "#C8A84B" }}>Savanna Finance</strong> is
              the AI-driven yield protocol native to Celo. Built for the next
              generation of DeFi — combining intelligent yield optimization,
              cross-chain liquidity, and Chainlink-secured price data.
            </p>
            <p
              className="anim-up"
              style={{
                color: "#E8D5A3",
                opacity: 0.7,
                lineHeight: 1.8,
                marginBottom: "1.5rem",
              }}
            >
              Our smart contract vault uses an ERC-4626 architecture with
              Chainlink oracle integration to continuously scan lending protocols
              on Celo and rebalance your position to the highest yield —
              automatically.
            </p>
            <div
              className="anim-up"
              style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
            >
              {["ERC-4626 Vault", "Chainlink Oracle", "LI.FI Bridge", "OpenZeppelin"].map(
                (tech) => (
                  <span
                    key={tech}
                    style={{
                      background: "rgba(200, 168, 75, 0.08)",
                      border: "1px solid rgba(200, 168, 75, 0.2)",
                      borderRadius: "20px",
                      padding: "0.35rem 0.9rem",
                      fontSize: "0.8rem",
                      color: "#C8A84B",
                    }}
                  >
                    {tech}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Right — APY Visual */}
          <div className="about-visual">
            <div className="apy-card glow-primary anim-up">
              <div className="apy-card-content">
                <div className="apy-label"><ChartBarIcon size={14} color="#E8D5A3" /> Current Average APY</div>
                <div className="apy-value">18.5%</div>
                <div className="apy-sublabel">
                  Auto-compounded · Real-time rebalancing
                </div>
                <div
                  style={{
                    marginTop: "1.5rem",
                    display: "flex",
                    justifyContent: "center",
                    gap: "2rem",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#C8A84B",
                      }}
                    >
                      $2.4M+
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>
                      TVL
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#4A7C59",
                      }}
                    >
                      3+
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>
                      Protocols
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#E8D5A3",
                      }}
                    >
                      24/7
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>
                      Monitoring
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ChartBarIcon } from "./Icons";
import { AnimatedTitle } from "./AnimatedTitle";

export function AboutSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Clip-path expanding animation (Zentry-inspired)
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#about-clip",
        start: "center 80%",
        end: "center 20%",
        scrub: 0.5,
      },
    });

    clipAnimation.to(".about-mask-clip", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
      duration: 1,
    });

    // Fade-in elements
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
        overflow: "hidden",
      }}
    >
      <div className="savanna-bg-anim savanna-bg-anim-bg">
        <img src="/savanna-about.svg" alt="" />
      </div>
      <div ref={containerRef} style={{ position: "relative", zIndex: 1 }}>
        <div style={{ position: "relative", zIndex: 30, background: "linear-gradient(180deg, #0D1A0F 0%, #111F13 60%, transparent 100%)", paddingBottom: "2rem" }}>
          <div className="anim-up section-label">What is Savanna</div>

          <AnimatedTitle
            title="Intelligent <b>Yield</b><br />Protocol for <b>Celo</b>"
            containerClass="mb-6"
          />

          <p
            className="anim-up section-sub"
            style={{ marginTop: "1rem" }}
          >
            AI-powered yield optimization across Aave V3 and Mento Savings, with x402 micropayments for autonomous strategy analysis and MiniPay zero-click deposits.
          </p>
        </div>

        {/* Clip-path expanding visual (Zentry-style) */}
        <div id="about-clip" style={{ height: "80vh", width: "100%", position: "relative", marginTop: "2rem" }}>
          <div
            className="about-mask-clip"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              zIndex: 5,
              height: "60vh",
              width: "380px",
              transformOrigin: "center",
              transform: "translateX(-50%)",
              overflow: "hidden",
              borderRadius: "1.5rem",
              clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
            }}
          >
            {/* Gold gradient background as placeholder for visual */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, #1A2E1C 0%, #0D1A0F 30%, #2D3A1F 60%, #4A3C1A 100%)",
              }}
            >
              {/* APY Card content inside the clip */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <ChartBarIcon size={16} color="#E8D5A3" />
                  <span style={{ fontSize: "1.7rem", color: "#E8D5A3" }}>AI-Optimized APY</span>
                </div>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "clamp(6rem, 12vw, 9rem)",
                    fontWeight: 900,
                    color: "#C8A84B",
                    lineHeight: 1,
                  }}
                >
                  Auto
                </div>
                  <div style={{ fontSize: "1.6rem", color: "#6B8F71", marginTop: "0.5rem" }}>
                  x402 micropayments · AI scans &amp; rebalances
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
                    <div style={{ fontSize: "3rem", fontWeight: 700, color: "#C8A84B" }}>x402</div>
                    <div style={{ fontSize: "1.5rem", color: "#6B8F71" }}>Micropayments</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", fontWeight: 700, color: "#4A7C59" }}>MiniPay</div>
                    <div style={{ fontSize: "1.5rem", color: "#6B8F71" }}>Zero-Click</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", fontWeight: 700, color: "#E8D5A3" }}>ERC-8004</div>
                    <div style={{ fontSize: "1.5rem", color: "#6B8F71" }}>Agent Trust</div>
                  </div>
                </div>
              </div>

              {/* Rotating conic gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background: "conic-gradient(from 0deg, transparent, rgba(200, 168, 75, 0.08), transparent, rgba(74, 124, 89, 0.06), transparent)",
                  animation: "apy-rotate 8s linear infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Description below the clip */}
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", position: "relative", zIndex: 30, background: "linear-gradient(180deg, transparent 0%, #111F13 30%, #0D1A0F 100%)", paddingTop: "3rem" }}>
          <p
            className="anim-up"
            style={{
              fontSize: "1.1rem",
              color: "#E8D5A3",
              lineHeight: 1.8,
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <strong style={{ color: "#C8A84B" }}>Savanna Finance</strong> is
            the AI-powered yield protocol native to Celo — built for the
            Onchain Agents Hackathon. AI agents autonomously pay for strategy
            analysis via x402 micropayments, MiniPay users deposit with zero
            clicks, and the ERC-4626 vault deploys capital to the highest yield.
          </p>
          <p
            className="anim-up"
            style={{
              color: "#E8D5A3",
              opacity: 0.7,
              lineHeight: 1.8,
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            Our vault uses Chainlink price feeds to continuously scan
            lending and savings protocols on Celo — Aave V3 and Mento Savings — and rebalance
            your position to the highest yield, automatically. ERC-8004 agent identity
            ensures trust between autonomous AI and your funds.
          </p>
          <div
            className="anim-up"
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            {["ERC-4626", "Chainlink Oracle", "x402 Payments", "MiniPay", "ERC-8004 Agent", "LI.FI Bridge"].map(
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
      </div>
    </section>
  );
}

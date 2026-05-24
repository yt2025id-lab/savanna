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
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
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
      }}
    >
      <div ref={containerRef}>
        <div className="anim-up section-label">What is Savanna</div>

        <AnimatedTitle
          title="Intelligent <b>Yield</b><br />Protocol for <b>Celo</b>"
          containerClass="mb-6"
        />

        <p
          className="anim-up section-sub"
          style={{ marginTop: "1rem" }}
        >
          AI-powered yield optimization across Aave V3, Moola, and Mento savings, with cross-chain deposits and Chainlink-secured price data.
        </p>

        {/* Clip-path expanding visual (Zentry-style) */}
        <div id="about-clip" style={{ height: "100dvh", width: "100vw", position: "relative", marginTop: "2rem" }}>
          <div
            className="about-mask-clip"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              zIndex: 20,
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
                  <span style={{ fontSize: "0.85rem", color: "#E8D5A3" }}>Current Average APY</span>
                </div>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "clamp(3rem, 6vw, 4.5rem)",
                    fontWeight: 900,
                    color: "#C8A84B",
                    lineHeight: 1,
                  }}
                >
                  18.5%
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6B8F71", marginTop: "0.5rem" }}>
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
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#C8A84B" }}>$2.4M+</div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>TVL</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4A7C59" }}>3</div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>Yield Protocols</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E8D5A3" }}>24/7</div>
                    <div style={{ fontSize: "0.75rem", color: "#6B8F71" }}>Monitoring</div>
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
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
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
            the AI-powered yield protocol native to Celo. Built for the next
            generation of DeFi — combining intelligent yield optimization,
            cross-chain deposits, and Chainlink-secured price data.
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
            Our ERC-4626 vault uses Chainlink price feeds to continuously scan
            lending and savings protocols on Celo — Aave V3, Moola, and Mento Savings — and rebalance
            your position to the highest yield, automatically.
          </p>
          <div
            className="anim-up"
            style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            {["ERC-4626 Vault", "Chainlink Oracle", "Mento Savings", "LI.FI Bridge", "OpenZeppelin"].map(
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

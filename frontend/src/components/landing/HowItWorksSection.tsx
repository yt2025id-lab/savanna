"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { LinkIcon, CoinIcon, ChartIcon } from "./Icons";
import { AnimatedTitle } from "./AnimatedTitle";

const steps = [
  {
    num: 1,
    keyword: "CONNECT",
    title: "Connect Wallet",
    desc: "Connect your wallet from any supported chain. MetaMask, Rainbow, Coinbase Wallet and more.",
    icon: <LinkIcon size={20} />,
    microClass: "micro-pulse",
  },
  {
    num: 2,
    keyword: "DEPOSIT",
    title: "Deposit Assets",
    desc: "Bridge from any chain via LI.FI or deposit USDC directly on Celo. Receive svYLD vault shares representing your position.",
    icon: <CoinIcon size={20} />,
    microClass: "micro-coin",
  },
  {
    num: 3,
    keyword: "EARN",
    title: "Earn Automatically",
    desc: "AI scans Aave V3, Moola, and Mento Savings rates and deploys your funds to the highest yield. Watch your svYLD balance grow.",
    icon: <ChartIcon size={20} />,
    microClass: "micro-chart",
  },
];

export function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Background text parallax
    const bgText = containerRef.current.querySelector(".bg-keyword");
    if (bgText) {
      gsap.fromTo(
        bgText,
        { xPercent: 20, opacity: 0.04 },
        {
          xPercent: -20,
          opacity: 0.1,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );
    }

    // Connector line draw animation
    const connector = containerRef.current.querySelector(".steps-connector-svg line");
    if (connector) {
      gsap.fromTo(
        connector,
        { strokeDasharray: 800, strokeDashoffset: 800 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current.querySelector(".steps-container"),
            start: "top 80%",
            end: "bottom 60%",
            scrub: 1,
          },
        }
      );
    }

    // Step circles — highlight sequentially on scroll
    const stepCircles = containerRef.current.querySelectorAll(".step-circle");
    stepCircles.forEach((circle, i) => {
      gsap.fromTo(
        circle,
        { borderColor: "rgba(200, 168, 75, 0.2)", boxShadow: "none" },
        {
          borderColor: "#C8A84B",
          boxShadow: "0 0 30px rgba(200, 168, 75, 0.3), inset 0 0 20px rgba(200, 168, 75, 0.1)",
          duration: 0.5,
          scrollTrigger: {
            trigger: circle,
            start: "top 75%",
            end: "bottom 50%",
            toggleActions: `play none none reverse`,
          },
        }
      );
    });

    // Step cards entrance
    const stepEls = containerRef.current.querySelectorAll(".step");
    stepEls.forEach((step, i) => {
      gsap.from(step, {
        scrollTrigger: {
          trigger: step,
          start: "top 90%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 50,
        duration: 0.7,
        delay: i * 0.15,
      });
    });
  }, { scope: containerRef });

  return (
    <section
      className="section"
      id="how-it-works"
      style={{
        background: "linear-gradient(180deg, #0D1A0F 0%, #111F13 50%, #0D1A0F 100%)",
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ position: "relative" }}>
        {/* Background keyword */}
        <div
          className="bg-keyword"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: "Georgia, serif",
            fontSize: "clamp(4rem, 15vw, 12rem)",
            fontWeight: 900,
            color: "#C8A84B",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.04,
          }}
        >
          CONNECT · DEPOSIT · EARN
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="section-label">How It Works</div>

          <AnimatedTitle
            title="Three Steps to<br /><b>Earn</b>"
            containerClass="mb-4"
          />

          <p className="section-sub" style={{ marginTop: "1rem" }}>
            From any chain to earning yield on Celo — powered by AI.
          </p>

          <div className="steps-container">
            {/* SVG connector line */}
            <svg
              className="steps-connector-svg"
              style={{
                position: "absolute",
                top: "40px",
                left: "16.6%",
                width: "66.8%",
                height: "2px",
                pointerEvents: "none",
                zIndex: 0,
              }}
              viewBox="0 0 800 2"
              preserveAspectRatio="none"
            >
              <line
                x1="0" y1="1" x2="800" y2="1"
                stroke="#C8A84B"
                strokeWidth="2"
                opacity="0.3"
              />
            </svg>

            {steps.map((s) => (
              <div key={s.num} className="step">
                <div className="step-number-wrapper">
                  <div className="step-circle">
                    <span className="step-circle-num">{s.num}</span>
                  </div>
                  <div className={`step-micro ${s.microClass}`}>
                    {s.icon}
                  </div>
                </div>
                <h3>
                  <span className="step-keyword">{s.keyword}</span>
                  {s.title}
                </h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

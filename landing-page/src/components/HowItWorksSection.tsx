"use client";

import { useEffect } from "react";

const steps = [
  {
    num: 1,
    title: "Connect Wallet",
    desc: "Connect your wallet from any supported chain. MetaMask, Rainbow, Coinbase Wallet and more.",
  },
  {
    num: 2,
    title: "Deposit Assets",
    desc: "Bridge from any chain via LI.FI or deposit USDC directly on Celo. Get svYLD vault shares instantly.",
  },
  {
    num: 3,
    title: "Earn Automatically",
    desc: "AI analyzes lending rates and deploys your funds to the best protocol. Watch your yield grow.",
  },
];

export function HowItWorksSection() {
  useEffect(() => {
    const gsap = require("gsap");
    const { ScrollTrigger } = require("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("#how-it-works .section-label, #how-it-works .section-title, #how-it-works .section-sub").forEach((el: Element) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
        opacity: 0, y: 40, duration: 0.7,
      });
    });

    document.querySelectorAll(".step").forEach((step: Element, i: number) => {
      gsap.from(step, {
        scrollTrigger: { trigger: step, start: "top 85%", toggleActions: "play none none reverse" },
        opacity: 0, y: 50, scale: 0.9, duration: 0.7, delay: i * 0.2,
      });
    });
  }, []);

  return (
    <section
      className="section"
      id="how-it-works"
      style={{ background: "linear-gradient(180deg, #0D1A0F 0%, #111F13 100%)" }}
    >
      <div className="section-label">How It Works</div>
      <h2 className="section-title">
        Three Steps to <span style={{ color: "var(--primary)" }}>Start Earning</span>
      </h2>
      <p className="section-sub">
        From any chain to earning yield on Celo in under 2 minutes.
      </p>
      <div className="steps-container">
        {steps.map((s) => (
          <div key={s.num} className="step">
            <div className="step-number">{s.num}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

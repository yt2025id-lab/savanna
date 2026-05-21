"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Background } from "./Background";

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Staggered reveal: from opacity 0 → visible (CSS default)
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-badge", { opacity: 0, y: 30, duration: 0.6, delay: 0.6 })
      .from(".hero h1", { opacity: 0, y: 50, duration: 0.8 }, "-=0.3")
      .from(".hero-sub", { opacity: 0, y: 40, duration: 0.7 }, "-=0.4")
      .from(".hero-buttons", { opacity: 0, y: 30, duration: 0.6 }, "-=0.3")
      .from(".hero-powered", { opacity: 0, duration: 0.5 }, "-=0.2");

    // Parallax on scroll
    gsap.to(".hero-content", {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: 100,
      opacity: 0.3,
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="hero" id="home">
      <Background />
      <div className="hero-content">
        <div className="hero-badge">
          <div className="hero-badge-dot" />
          Live on Celo Network
        </div>
        <h1>
          Yield That Grows
          <br />
          <span className="highlight">Naturally</span>
        </h1>
        <p className="hero-sub">
          AI-powered yield protocol on Celo — maximize your returns while the
          ecosystem thrives. Deposit from any chain, earn passively.
        </p>
        <div className="hero-buttons">
          <a href="http://localhost:3000/earn" className="btn-primary">
            Start Earning →
          </a>
          <a href="#how-it-works" className="btn-outline">
            Read Docs
          </a>
        </div>
        <p className="hero-powered">
          ⚡ Powered by Celo Network — Carbon Negative Blockchain
        </p>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Background } from "./Background";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const gsap = require("gsap");

    // Set initial states
    gsap.set(".hero-badge", { opacity: 0, y: 30 });
    gsap.set(".hero h1", { opacity: 0, y: 50 });
    gsap.set(".hero-sub", { opacity: 0, y: 40 });
    gsap.set(".hero-buttons", { opacity: 0, y: 30 });
    gsap.set(".hero-powered", { opacity: 0 });

    // Stagger timeline
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(".hero-badge", { opacity: 1, y: 0, duration: 0.6, delay: 0.6 })
      .to(".hero h1", { opacity: 1, y: 0, duration: 0.8 }, "-=0.3")
      .to(".hero-sub", { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
      .to(".hero-buttons", { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
      .to(".hero-powered", { opacity: 1, duration: 0.5 }, "-=0.2");

    // Parallax on scroll
    gsap.to(".hero-content", {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: 100,
      opacity: 0.3,
    });
  }, []);

  return (
    <section ref={sectionRef} className="hero" id="home">
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

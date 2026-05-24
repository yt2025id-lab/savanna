"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { HeroCanvas } from "./HeroCanvas";
import { SavannaScene } from "./SavannaScene";
import { ParticleField } from "./ParticleField";
import { BoltIcon } from "./Icons";

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Split headline text into chars for reveal animation
    if (headlineRef.current) {
      const lines = headlineRef.current.querySelectorAll(".hero-line");
      lines.forEach((line) => {
        const text = line.textContent || "";
        line.textContent = "";
        text.split("").forEach((char) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? " " : char;
          span.classList.add("hero-char");
          span.style.display = "inline-block";
          line.appendChild(span);
        });
      });
    }

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    // Badge
    tl.from(".hero-badge", { opacity: 0, y: 30, duration: 0.6, delay: 0.3 });

    // Headline chars — reveal from below with clip
    const chars = containerRef.current.querySelectorAll(".hero-char");
    tl.from(chars, {
      yPercent: 120,
      opacity: 0,
      stagger: 0.025,
      duration: 0.7,
      ease: "power4.out",
    }, "-=0.2");

    // Subtitle
    tl.from(".hero-sub", { opacity: 0, y: 40, duration: 0.8 }, "-=0.4");

    // Buttons
    tl.from(".hero-buttons", { opacity: 0, y: 30, duration: 0.6 }, "-=0.3");

    // Powered line
    tl.from(".hero-powered", { opacity: 0, duration: 0.5 }, "-=0.2");

    // Scroll indicator
    if (scrollIndicatorRef.current) {
      gsap.from(scrollIndicatorRef.current, {
        opacity: 0,
        duration: 1,
        delay: 2.5,
      });
      gsap.to(".scroll-line", {
        scaleY: 1,
        duration: 1.5,
        delay: 3,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".scroll-arrow", {
        y: 10,
        duration: 1.2,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // Parallax on scroll
    gsap.to(".hero-content", {
      y: 120,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="hero" id="home">
      {/* WebGL Background */}
      <HeroCanvas />

      {/* Savanna Scene Overlay — Acacia, Moon, Grass, Fireflies */}
      <SavannaScene />

      {/* Particles (stars / ambient) */}
      <ParticleField />

      {/* Content */}
      <div className="hero-content">
        <div className="hero-badge">
          <div className="hero-badge-dot" />
          Live on Celo Network
        </div>

        <div ref={headlineRef} className="hero-headline-wrapper">
          <h1 className="hero-headline">
            <span className="hero-line" style={{ color: "#F5EDD6" }}>YIELD THAT</span>
            <br />
            <span className="hero-line hero-grows">GROWS</span>
            <br />
            <span className="hero-line hero-naturally">NATURALLY</span>
          </h1>
        </div>

        <p className="hero-sub">
          AI-powered yield protocol on Celo — maximize returns while the
          savanna thrives
        </p>
        <div className="hero-buttons">
          <Link href="/earn" className="btn-primary">
            Start Earning →
          </Link>
          <a href="#about" className="btn-outline">
            Learn More
          </a>
        </div>
        <p className="hero-powered">
          <BoltIcon size={12} color="rgba(245, 237, 214, 0.4)" /> Powered by Celo Network — Carbon Negative Blockchain
        </p>
      </div>

      {/* Scroll indicator */}
      <div ref={scrollIndicatorRef} className="scroll-indicator">
        <span className="scroll-text">SCROLL</span>
        <div className="scroll-line-wrapper">
          <div className="scroll-line" />
        </div>
        <div className="scroll-arrow">↓</div>
      </div>
    </section>
  );
}

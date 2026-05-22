"use client";

import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { LogoMark } from "./Icons";

export function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useGSAP(() => {
    if (!navRef.current) return;
    gsap.to(navRef.current, {
      yPercent: 0,
      duration: 1,
      ease: "power2.out",
      delay: 0.3,
    });
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav ref={navRef} className={`nav ${scrolled ? "scrolled" : ""}`}>
      <a href="#" className="nav-logo">
        <LogoMark size={24} /> Savanna Finance
      </a>
      <div className={`nav-links ${open ? "open" : ""}`}>
        <a href="#about" onClick={() => setOpen(false)}>About</a>
        <a href="#features" onClick={() => setOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How It Works</a>
        <a href="#stats" onClick={() => setOpen(false)}>Stats</a>
        <a href={`${process.env.NEXT_PUBLIC_APP_URL || ""}/earn`} className="btn-launch">
          Launch App
        </a>
      </div>
      <button
        className="mobile-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? "✕" : "☰"}
      </button>
    </nav>
  );
}

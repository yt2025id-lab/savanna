"use client";

import { useEffect, useRef, useState } from "react";

export function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // GSAP slide-down
    const gsap = require("gsap");
    gsap.to(navRef.current, { y: 0, duration: 0.8, ease: "power3.out", delay: 0.2 });

    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={navRef} className={`nav ${scrolled ? "scrolled" : ""}`}>
      <a href="#" className="nav-logo">
        <span style={{ fontSize: "1.5rem" }}>🌿</span> Savanna Finance
      </a>
      <div className={`nav-links ${open ? "open" : ""}`}>
        <a href="#features" onClick={() => setOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How It Works</a>
        <a href="#stats" onClick={() => setOpen(false)}>Stats</a>
        <a href="#" onClick={() => setOpen(false)}>Docs</a>
        <a href="http://localhost:3000/earn" className="btn-launch">Launch App</a>
      </div>
      <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? "✕" : "☰"}
      </button>
    </nav>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { LogoMark } from "./Icons";

export function LandingNav() {
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useGSAP(() => {
    if (!navRef.current) return;
    gsap.to(navRef.current, {
      yPercent: 0,
      duration: 1,
      ease: "power2.out",
      delay: 0.3,
    });
  });

  // Scroll-aware navbar: hide on scroll down, show on scroll up (Zentry-style)
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 50);

      if (currentY === 0) {
        setIsNavVisible(true);
      } else if (currentY > lastScrollY.current) {
        // Scrolling down — hide
        setIsNavVisible(false);
      } else {
        // Scrolling up — show
        setIsNavVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animate nav in/out with GSAP
  useEffect(() => {
    if (!navRef.current) return;
    gsap.to(navRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.3,
      ease: "power2.inOut",
    });
  }, [isNavVisible]);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeMobile = useCallback(() => setOpen(false), []);

  return (
    <nav
      ref={navRef}
      className={`nav ${scrolled ? "scrolled" : ""}`}
      style={{ transform: "translateY(-100%)", opacity: 0 }}
    >
      <a href="#" className="nav-logo">
        <LogoMark size={24} /> Savanna Finance
      </a>
      <div className={`nav-links ${open ? "open" : ""}`}>
        <a href="#about" onClick={closeMobile}>About</a>
        <a href="#features" onClick={closeMobile}>Features</a>
        <a href="#how-it-works" onClick={closeMobile}>How It Works</a>
        <a href="#stats" onClick={closeMobile}>Stats</a>
        <Link href="/earn" className="btn-launch">
          Launch App
        </Link>
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

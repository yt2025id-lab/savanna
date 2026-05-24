"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LogoMark } from "@/components/landing/Icons";
import { Droplets, TrendingUp, Brain, Briefcase } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

const NAV_LINKS = [
  { href: "/faucet", label: "Faucet", icon: Droplets },
  { href: "/earn", label: "Earn", icon: TrendingUp },
  { href: "/ai", label: "AI", icon: Brain },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Pill animation state
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const navLinksRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // Measure and position the pill
  const updatePill = useCallback(() => {
    const container = navLinksRef.current;
    const activeLink = linkRefs.current.get(pathname);
    if (container && activeLink) {
      const containerRect = container.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setPillStyle({
        left: linkRect.left - containerRect.left,
        width: linkRect.width,
        opacity: 1,
      });
    }
  }, [pathname]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => updatePill();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updatePill]);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "navbar-glass-scrolled"
          : "navbar-glass"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <LogoMark size={28} />
          <span
            className="text-lg font-semibold tracking-tight group-hover:text-accent-hover transition-colors duration-300"
            style={{ fontFamily: "Georgia, serif", color: "#C8A84B" }}
          >
            Savanna Finance
          </span>
        </Link>

        {/* Nav Links — Desktop with pill */}
        <div
          ref={navLinksRef}
          className="hidden items-center gap-1 sm:flex relative"
        >
          {/* Animated pill background */}
          <span
            className="nav-pill"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              opacity: pillStyle.opacity,
            }}
          />

          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                ref={(el) => {
                  if (el) linkRefs.current.set(href, el);
                }}
                className={`nav-link-item ${
                  isActive ? "nav-link-active" : ""
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side: mobile toggle + Connect Wallet */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex sm:hidden items-center justify-center h-9 w-9 rounded-lg text-muted-light hover:bg-card transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden navbar-mobile-menu animate-fade-in">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-accent/15 text-accent shadow-[0_0_20px_rgba(200,168,75,0.1)]"
                    : "text-muted-light hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

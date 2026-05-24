"use client";

import Link from "next/link";
import { LogoMark } from "@/components/landing/Icons";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto" style={{ background: "#0A140B" }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="text-sm font-medium" style={{ fontFamily: "Georgia, serif", color: "#C8A84B" }}>
              Savanna
            </span>
            <span className="text-xs" style={{ color: "rgba(245, 237, 214, 0.3)" }}>© 2026</span>
          </Link>

          {/* Navigation links */}
          <nav className="flex items-center gap-4">
            <Link href="/earn" className="text-xs text-muted hover:text-accent transition-colors">
              Earn
            </Link>
            <Link href="/portfolio" className="text-xs text-muted hover:text-accent transition-colors">
              Portfolio
            </Link>
            <Link href="/faucet" className="text-xs text-muted hover:text-accent transition-colors">
              Faucet
            </Link>
            <Link href="/ai" className="text-xs text-muted hover:text-accent transition-colors">
              AI
            </Link>
          </nav>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <span className="text-xs text-muted">
            Built on Celo · AI-Powered Yield
          </span>
          <p className="text-[11px] text-center" style={{ color: "rgba(245, 237, 214, 0.3)" }}>
            Savanna Finance is experimental software. Use at your own risk. This is not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

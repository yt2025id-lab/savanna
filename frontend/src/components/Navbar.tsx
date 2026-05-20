"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Leaf } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim transition-colors group-hover:bg-accent-glow">
            <Leaf className="h-4 w-4 text-accent" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Savanna<span className="text-accent">.</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href="/earn"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-light transition-colors hover:bg-card hover:text-foreground"
          >
            Earn
          </Link>
        </div>

        {/* Connect Wallet */}
        <ConnectButton
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
      </div>
    </nav>
  );
}

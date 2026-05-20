"use client";

import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-muted">
              Savanna Finance
            </span>
            <span className="text-xs text-muted/60">© 2026</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">
              Built on Celo · AI-Powered Yield
            </span>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-muted/50">
          Savanna Finance is experimental software. Use at your own risk. This is not financial advice.
        </div>
      </div>
    </footer>
  );
}

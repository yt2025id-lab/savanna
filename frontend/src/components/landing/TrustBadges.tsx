"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Shield, FileCheck, Code2, Globe, Key, Lock } from "lucide-react";

const badges = [
  { icon: <FileCheck className="h-5 w-5" />, label: "Dual Audit", desc: "Celo Security + Comprehensive", color: "#22c55e" },
  { icon: <Code2 className="h-5 w-5" />, label: "OpenZeppelin", desc: "ERC-4626 Standard", color: "#4A7C59" },
  { icon: <Globe className="h-5 w-5" />, label: "Celo Mainnet", desc: "10 Contracts Verified", color: "#C8A84B" },
  { icon: <Key className="h-5 w-5" />, label: "Non-Custodial", desc: "You Hold the Keys", color: "#f59e0b" },
  { icon: <Lock className="h-5 w-5" />, label: "ReentrancyGuard", desc: "Defense in Depth", color: "#9b6dff" },
  { icon: <Shield className="h-5 w-5" />, label: "ERC-8004", desc: "Agent Identity Verified", color: "#fb6236" },
];

export function TrustBadges() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!gridRef.current) return;
    const items = gridRef.current.querySelectorAll(".badge-item");
    gsap.set(items, { opacity: 0, scale: 0.85 });
    ScrollTrigger.batch(items, {
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.5)",
        });
      },
      start: "top 90%",
    });
  }, { scope: containerRef });

  return (
    <section
      style={{
        background: "#0D1A0F",
        borderTop: "1px solid rgba(200, 168, 75, 0.06)",
        padding: "4rem 1rem",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div ref={containerRef} className="mx-auto max-w-4xl text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-3 block">
          Audited & Verified
        </span>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Built to the Highest Security Standards
        </h3>
        <p className="text-sm text-muted-light mb-8 max-w-xl mx-auto">
          Every contract verified on Celoscan. Dual security audits. OpenZeppelin battle-tested libraries.
        </p>

        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className="badge-item flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 transition-all hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
              >
                {badge.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{badge.label}</p>
                <p className="text-[10px] text-muted">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

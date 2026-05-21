"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const stats = [
  { target: 2.4, decimals: 1, suffix: "M+", label: "Total Value Locked", prefix: "$" },
  { target: 18.5, decimals: 1, suffix: "%", label: "Average APY", prefix: "" },
  { target: 10000, decimals: 0, suffix: "+", label: "Transactions", prefix: "" },
  { target: 12, decimals: 0, suffix: "+", label: "Supported Assets", prefix: "" },
];

export function StatsSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Headers
    const headers = containerRef.current.querySelectorAll(".section-label, .section-title, .section-sub");
    headers.forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
        opacity: 0, y: 40, duration: 0.7,
      });
    });

    // Counter animation — trigger once
    let counted = false;
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 75%",
      once: true,
      onEnter: () => {
        if (counted) return;
        counted = true;
        const counters = containerRef.current?.querySelectorAll(".counter");
        counters?.forEach((el) => {
          const target = parseFloat(el.getAttribute("data-target")!);
          const decimals = parseInt(el.getAttribute("data-decimals") || "0");
          const prefix = el.getAttribute("data-prefix") || "";
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: "power2.out",
            onUpdate() {
              const display = decimals > 0
                ? obj.val.toFixed(decimals)
                : Math.floor(obj.val).toLocaleString();
              el.textContent = prefix + display;
            },
          });
        });
      },
    });

    // Items fade in
    const items = containerRef.current.querySelectorAll(".stat-item");
    items.forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: { trigger: item, start: "top 85%" },
        opacity: 0, y: 40, duration: 0.6, delay: i * 0.12,
      });
    });
  }, { scope: containerRef });

  return (
    <section
      className="section"
      id="stats"
      style={{
        background: "#111F13",
        borderTop: "1px solid rgba(200, 168, 75, 0.1)",
        borderBottom: "1px solid rgba(200, 168, 75, 0.1)",
      }}
    >
      <div ref={containerRef}>
        <div className="section-label">Protocol Stats</div>
        <h2 className="section-title">
          Growing <span style={{ color: "var(--primary)" }}>Every Day</span>
        </h2>
        <p className="section-sub">Real numbers from a real protocol on Celo.</p>
        <div className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">
                <span
                  className="counter"
                  data-target={s.target}
                  data-decimals={s.decimals}
                  data-prefix={s.prefix}
                >
                  {s.prefix}0
                </span>
                <span className="suffix">{s.suffix}</span>
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { AnimatedTitle } from "./AnimatedTitle";

const stats = [
  { target: 2.4, decimals: 1, suffix: "M+", label: "Total Value Locked", prefix: "$" },
  { target: 18.5, decimals: 1, suffix: "%", label: "Average APY", prefix: "" },
  { target: 3, decimals: 0, suffix: "", label: "Yield Protocols", prefix: "" },
  { target: 12, decimals: 0, suffix: "+", label: "Active Vaults", prefix: "" },
];

const bgNumbers = ["$2.4M", "18.5%", "3", "12+"]; 

export function StatsSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    let counted = false;
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 80%",
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
              let display: string;
              if (decimals > 0) {
                display = obj.val.toFixed(decimals);
              } else {
                display = Math.floor(obj.val).toLocaleString();
              }
              el.textContent = prefix + display;
            },
          });
        });
      },
    });

    const items = containerRef.current.querySelectorAll(".stat-item");
    items.forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: "top 90%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 40,
        duration: 0.6,
        delay: i * 0.1,
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
        position: "relative",
        zIndex: 2,
      }}
    >
      <div ref={containerRef}>
        <div className="section-label">Protocol Stats</div>

        <AnimatedTitle
          title="Growing <b>Every</b><br />Day"
          containerClass="mb-4"
        />

        <p className="section-sub" style={{ marginTop: "1rem" }}>Real numbers from a real protocol, live on Celo.</p>

        <div className="stats-grid">
          {stats.map((s, i) => (
            <div key={s.label} className="stat-item">
              <div className="stat-bg-number">{bgNumbers[i]}</div>
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

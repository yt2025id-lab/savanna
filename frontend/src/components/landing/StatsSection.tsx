"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { AnimatedTitle } from "./AnimatedTitle";

const stats = [
  { target: 5, decimals: 0, suffix: "+", label: "Yield Strategies", prefix: "" },
  { target: 8, decimals: 0, suffix: "+", label: "Source Chains", prefix: "" },
  { target: 0.1, decimals: 1, suffix: "", label: "x402 Cost (USDC)", prefix: "$" },
  { target: 1, decimals: 0, suffix: "", label: "Second Finality", prefix: "" },
];

const bgNumbers = ["5+", "8+", "$0.1", "1s"]; 

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
        overflow: "hidden",
      }}
    >
      <div className="savanna-bg-anim savanna-bg-anim-bg">
        <img src="/savanna-stats.svg" alt="" />
      </div>
      <div ref={containerRef} style={{ position: "relative", zIndex: 1 }}>
        <div className="section-label">Project Stats</div>

        <AnimatedTitle
          title="Built for<br /><b>Celo</b>"
          containerClass="mb-4"
        />

        <p className="section-sub" style={{ marginTop: "1rem" }}>Onchain Agents Hackathon — agentic payments meet DeFi yield.</p>

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

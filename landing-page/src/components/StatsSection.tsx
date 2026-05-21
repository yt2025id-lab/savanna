"use client";

import { useEffect } from "react";

const stats = [
  { target: 2.4, decimals: 1, suffix: "M+", label: "Total Value Locked", prefix: "$" },
  { target: 18.5, decimals: 1, suffix: "%", label: "Average APY", prefix: "" },
  { target: 10000, decimals: 0, suffix: "+", label: "Transactions", prefix: "" },
  { target: 12, decimals: 0, suffix: "+", label: "Supported Assets", prefix: "" },
];

export function StatsSection() {
  useEffect(() => {
    const gsap = require("gsap");
    const { ScrollTrigger } = require("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);

    // Section headers
    document.querySelectorAll("#stats .section-label, #stats .section-title, #stats .section-sub").forEach((el: Element) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" },
        opacity: 0, y: 40, duration: 0.7,
      });
    });

    // Counter animation
    let done = false;
    ScrollTrigger.create({
      trigger: "#stats",
      start: "top 75%",
      onEnter: () => {
        if (done) return;
        done = true;
        document.querySelectorAll(".counter").forEach((el: Element) => {
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
    document.querySelectorAll(".stat-item").forEach((item: Element, i: number) => {
      gsap.from(item, {
        scrollTrigger: { trigger: item, start: "top 85%" },
        opacity: 0, y: 40, duration: 0.6, delay: i * 0.12,
      });
    });
  }, []);

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
    </section>
  );
}

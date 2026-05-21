"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function Footer() {
  const ctaRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!ctaRef.current) return;

    const h2 = ctaRef.current.querySelector("h2");
    const p = ctaRef.current.querySelector("p");
    const btn = ctaRef.current.querySelector(".btn-cta");

    if (h2) {
      gsap.from(h2, {
        scrollTrigger: { trigger: ctaRef.current, start: "top 80%" },
        opacity: 0, y: 50, duration: 0.8,
      });
    }
    if (p) {
      gsap.from(p, {
        scrollTrigger: { trigger: ctaRef.current, start: "top 75%" },
        opacity: 0, y: 40, duration: 0.7, delay: 0.2,
      });
    }
    if (btn) {
      gsap.from(btn, {
        scrollTrigger: { trigger: btn, start: "top 90%" },
        opacity: 0, scale: 0.8, duration: 0.6, delay: 0.3,
      });
    }
  }, { scope: ctaRef });

  return (
    <>
      {/* CTA Section */}
      <section ref={ctaRef} className="cta-section">
        <h2>
          Ready to Grow
          <br />
          Your <span style={{ color: "var(--primary)" }}>Yield</span>?
        </h2>
        <p>Join hundreds of depositors earning passive yield on Celo Network.</p>
        <a href="http://localhost:3000/earn" className="btn-cta">
          Launch App Now →
        </a>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">🌿 Savanna Finance</div>
            <p>Yield That Grows Naturally</p>
          </div>
          <div className="footer-links">
            <a href="#">Twitter</a>
            <a href="#">Discord</a>
            <a href="#">GitHub</a>
            <a href="#">Docs</a>
          </div>
        </div>
        <div className="footer-bottom">
          Built on Celo Network · © 2026 Savanna Finance. All rights reserved.
        </div>
      </footer>
    </>
  );
}

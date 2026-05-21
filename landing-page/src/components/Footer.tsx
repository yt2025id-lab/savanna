"use client";

import { useEffect } from "react";

export function Footer() {
  useEffect(() => {
    const gsap = require("gsap");
    const { ScrollTrigger } = require("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);

    // CTA section
    gsap.from(".cta-section h2", {
      scrollTrigger: { trigger: ".cta-section", start: "top 80%" },
      opacity: 0, y: 50, duration: 0.8,
    });
    gsap.from(".cta-section p", {
      scrollTrigger: { trigger: ".cta-section", start: "top 75%" },
      opacity: 0, y: 40, duration: 0.7, delay: 0.2,
    });
    gsap.from(".btn-cta", {
      scrollTrigger: { trigger: ".btn-cta", start: "top 90%" },
      opacity: 0, scale: 0.8, duration: 0.6, delay: 0.3,
    });
  }, []);

  return (
    <>
      {/* CTA Section */}
      <section className="cta-section">
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

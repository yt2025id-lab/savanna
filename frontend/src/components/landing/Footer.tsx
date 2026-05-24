"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { LogoMark } from "./Icons";
import { AnimatedTitle } from "./AnimatedTitle";

export function LandingFooter() {
  const ctaRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  const magneticQuick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  const getMagnetic = useCallback(() => {
    if (!btnRef.current) return null;
    if (!magneticQuick.current) {
      magneticQuick.current = {
        x: gsap.quickTo(btnRef.current, "x", { duration: 0.3, ease: "power2.out" }),
        y: gsap.quickTo(btnRef.current, "y", { duration: 0.3, ease: "power2.out" }),
      };
    }
    return magneticQuick.current;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const m = getMagnetic();
    if (m) {
      m.x(x * 0.3);
      m.y(y * 0.3);
    }
  }, [getMagnetic]);

  const handleMouseLeave = useCallback(() => {
    const m = getMagnetic();
    if (m) {
      gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    }
  }, [getMagnetic]);

  useGSAP(() => {
    if (!ctaRef.current) return;
    gsap.from(ctaRef.current.querySelector("h2"), {
      scrollTrigger: { trigger: ctaRef.current, start: "top 85%", toggleActions: "play none none none" },
      opacity: 0, y: 50, duration: 0.8,
    });
    gsap.from(btnRef.current, {
      scrollTrigger: { trigger: btnRef.current, start: "top 90%", toggleActions: "play none none none" },
      opacity: 0, scale: 0.8, duration: 0.6, delay: 0.3,
    });
  }, { scope: ctaRef });

  return (
    <>
      {/* CTA Section with AnimatedTitle */}
      <section
        ref={ctaRef}
        className="cta-section"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <AnimatedTitle
          title="Ready to <b>Grow</b><br />Your <b>Yield</b>?"
          containerClass="mb-4"
        />

        <p style={{ color: "#E8D5A3", fontSize: "1.1rem", marginBottom: "2.5rem", position: "relative", opacity: 0.85 }}>
          Join the savanna — earn yield on Celo with AI-powered optimization
        </p>
        <Link
          ref={btnRef as React.Ref<HTMLAnchorElement>}
          href="/earn"
          className="btn-cta"
          style={{ position: "relative", display: "inline-flex" }}
        >
          Launch App Now →
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <LogoMark size={20} />
              <span>Savanna Finance</span>
            </div>
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
          Built on Celo · © 2026 Savanna Finance. All rights reserved.
        </div>
      </footer>
    </>
  );
}

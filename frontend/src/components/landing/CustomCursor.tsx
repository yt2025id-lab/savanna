"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("ontouchstart" in window || window.innerWidth < 768) return;

    const moveCursor = (e: MouseEvent) => {
      if (!visible) setVisible(true);
      if (dotRef.current) {
        gsap.to(dotRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.1,
          ease: "power2.out",
        });
      }
      if (ringRef.current) {
        gsap.to(ringRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.4,
          ease: "power2.out",
        });
      }
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.25,
          ease: "power2.out",
        });
      }
    };

    // Event delegation — single listener on document instead of per-element
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "a, button, input, textarea, [role='button'], .btn-primary, .btn-outline, .btn-cta, .btn-launch, .feature-card, .step"
        )
      ) {
        setHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          "a, button, input, textarea, [role='button'], .btn-primary, .btn-outline, .btn-cta, .btn-launch, .feature-card, .step"
        )
      ) {
        setHovering(false);
      }
    };

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [visible]);

  if (typeof window !== "undefined" && "ontouchstart" in window) return null;

  return (
    <>
      {/* Sun glow */}
      <div
        ref={glowRef}
        className="cursor-sun-glow"
        style={{ opacity: visible ? 1 : 0 }}
      />
      {/* Dot */}
      <div
        ref={dotRef}
        className={`cursor-dot ${hovering ? "cursor-hover" : ""}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className={`cursor-ring ${hovering ? "cursor-hover" : ""}`}
        style={{ opacity: visible ? 1 : 0 }}
      />
    </>
  );
}

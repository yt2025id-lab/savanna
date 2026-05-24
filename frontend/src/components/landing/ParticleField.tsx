"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  offset: number;
  color: string;
}

const COLORS = ["#C8A84B", "#4A7C59", "#E8D5A3", "#C8A84B", "#4A7C59"];

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let raf: number;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }
    resize();
    window.addEventListener("resize", resize);

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    window.addEventListener("mousemove", onMouseMove);

    // Create 80 particles (reduced to not overlap with fireflies)
    const particles: Particle[] = Array.from({ length: 80 }, () => {
      const baseOpacity = 0.15 + Math.random() * 0.5;
      return {
        x: Math.random() * width,
        y: Math.random() * height * 0.65, // concentrate in upper 65% (sky area)
        vx: (0.05 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1),
        vy: -(0.05 + Math.random() * 0.15), // very slow upward drift
        size: 0.8 + Math.random() * 1.5,
        opacity: baseOpacity,
        baseOpacity,
        offset: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const start = performance.now();

    function draw() {
      const t = (performance.now() - start) / 1000;
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Mouse parallax — slight pull toward mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const force = (200 - dist) / 200 * 0.15;
          p.x += dx * force * 0.01;
          p.y += dy * force * 0.01;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Twinkle: oscillate opacity
        p.opacity = p.baseOpacity * (0.5 + 0.5 * Math.sin(t * 1.5 + p.offset));

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.opacity;
        ctx!.fill();

        // Glow
        if (p.size > 1.5) {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, "transparent");
          ctx!.fillStyle = grad;
          ctx!.globalAlpha = p.opacity * 0.3;
          ctx!.fill();
        }
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-field"
    />
  );
}

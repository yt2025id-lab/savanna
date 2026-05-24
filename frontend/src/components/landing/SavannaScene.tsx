"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/* ═══════════════════════════════════════════════════════════════════════════
   SavannaScene — Animated savanna landscape overlay for the Hero section.

   Renders:
   - Crescent moon with golden glow
   - Acacia tree silhouette with wind sway (GSAP)
   - Layered grass silhouettes with wave animation
   - Fireflies (golden particles rising from grass, Canvas 2D)
   - Distant horizon glow
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Firefly Canvas ─────────────────────────────────────────────────────────

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  phase: number;
  speed: number;
  wobble: number;
}

function FireflyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf: number;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create fireflies — they start near the bottom (grass level)
    const fireflyCount = Math.min(60, Math.floor(width / 25));
    const fireflies: Firefly[] = Array.from({ length: fireflyCount }, () => {
      const baseOpacity = 0.3 + Math.random() * 0.7;
      return {
        x: Math.random() * width,
        y: height * 0.55 + Math.random() * height * 0.4, // bottom 45% of screen
        vx: (0.1 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
        vy: -(0.15 + Math.random() * 0.35), // drift upward
        size: 1.5 + Math.random() * 2.5,
        opacity: baseOpacity,
        baseOpacity,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.5,
        wobble: 0.3 + Math.random() * 0.6,
      };
    });

    const start = performance.now();

    function draw() {
      const t = (performance.now() - start) / 1000;
      ctx!.clearRect(0, 0, width, height);

      for (const f of fireflies) {
        // Organic movement: sinusoidal wobble + upward drift
        f.x += f.vx + Math.sin(t * f.speed + f.phase) * f.wobble * 0.3;
        f.y += f.vy + Math.cos(t * f.speed * 0.7 + f.phase) * 0.15;

        // Wrap around
        if (f.y < height * 0.15) {
          f.y = height * 0.92 + Math.random() * height * 0.06;
          f.x = Math.random() * width;
        }
        if (f.x < -20) f.x = width + 20;
        if (f.x > width + 20) f.x = -20;

        // Pulsing opacity (firefly blink)
        f.opacity = f.baseOpacity * (0.4 + 0.6 * Math.max(0, Math.sin(t * f.speed * 2 + f.phase)));

        // Glow core
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx!.fillStyle = "#E8D5A3";
        ctx!.globalAlpha = f.opacity;
        ctx!.fill();

        // Outer glow
        const glowRadius = f.size * 6;
        const grad = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRadius);
        grad.addColorStop(0, "rgba(200, 168, 75, 0.25)");
        grad.addColorStop(0.3, "rgba(200, 168, 75, 0.08)");
        grad.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.globalAlpha = f.opacity * 0.6;
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="savanna-fireflies"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  );
}

// ─── Acacia Tree SVG with Wind Sway ─────────────────────────────────────────

function AcaciaTree() {
  const treeRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!treeRef.current) return;

    // Subtle wind sway on the canopy
    const canopy = treeRef.current.querySelector(".acacia-canopy");
    if (canopy) {
      gsap.to(canopy, {
        transformOrigin: "center bottom",
        rotate: 0.8,
        duration: 3 + Math.random() * 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2,
      });
    }

    // Slightly different sway on branches
    const branches = treeRef.current.querySelectorAll(".acacia-branch");
    branches.forEach((branch, i) => {
      gsap.to(branch, {
        transformOrigin: i < 2 ? "left center" : "right center",
        rotate: (i % 2 === 0 ? 1 : -1) * (0.5 + Math.random() * 0.5),
        duration: 4 + Math.random() * 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.5,
      });
    });
  }, []);

  return (
    <g ref={treeRef} className="acacia-tree">
      {/* Trunk */}
      <path
        d="M 0 0 L -3 -80 Q -4 -120 -8 -140 L -10 -150 L 10 -150 L 8 -140 Q 4 -120 3 -80 L 0 0 Z"
        fill="#2D1E0E"
        stroke="#1A1209"
        strokeWidth="0.5"
      />

      {/* Main branches */}
      <path
        className="acacia-branch"
        d="M -5 -130 Q -40 -155 -90 -165"
        stroke="#2D1E0E"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        className="acacia-branch"
        d="M 5 -130 Q 35 -150 80 -158"
        stroke="#2D1E0E"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        className="acacia-branch"
        d="M -6 -145 Q -30 -162 -60 -168"
        stroke="#2D1E0E"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        className="acacia-branch"
        d="M 6 -145 Q 25 -160 55 -166"
        stroke="#2D1E0E"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Canopy — iconic flat umbrella shape */}
      <ellipse
        className="acacia-canopy"
        cx="0"
        cy="-175"
        rx="130"
        ry="30"
        fill="#1A3D20"
        stroke="none"
      />
      {/* Canopy layers for depth */}
      <ellipse
        cx="-30"
        cy="-172"
        rx="100"
        ry="25"
        fill="#1F4D28"
        opacity="0.7"
      />
      <ellipse
        cx="20"
        cy="-180"
        rx="90"
        ry="20"
        fill="#153518"
        opacity="0.5"
      />

      {/* Small leaf clusters */}
      <circle cx="-100" cy="-168" r="18" fill="#1A3D20" />
      <circle cx="-60" cy="-178" r="22" fill="#1F4D28" opacity="0.6" />
      <circle cx="70" cy="-170" r="16" fill="#1A3D20" />
      <circle cx="100" cy="-165" r="14" fill="#1A3D20" opacity="0.8" />
      <circle cx="0" cy="-185" r="20" fill="#153518" opacity="0.4" />
    </g>
  );
}

// ─── Grass Layers ────────────────────────────────────────────────────────────

function GrassLayer() {
  return (
    <g className="savanna-grass">
      {/* Back grass layer — lighter */}
      <path
        className="grass-back"
        d={`
          M -100 ${880}
          Q 0 ${850} 80 ${870}
          Q 160 ${840} 250 ${860}
          Q 350 ${830} 450 ${855}
          Q 550 ${825} 650 ${850}
          Q 750 ${835} 850 ${860}
          Q 950 ${840} 1050 ${855}
          Q 1150 ${830} 1250 ${850}
          Q 1350 ${840} 1450 ${870}
          L 1450 ${950} L -100 ${950} Z
        `}
        fill="#0F1F11"
      />

      {/* Mid grass layer */}
      <path
        className="grass-mid"
        d={`
          M -100 ${900}
          Q 50 ${880} 150 ${895}
          Q 250 ${875} 380 ${890}
          Q 480 ${870} 600 ${885}
          Q 720 ${868} 850 ${888}
          Q 950 ${872} 1050 ${892}
          Q 1180 ${878} 1300 ${898}
          Q 1400 ${885} 1450 ${910}
          L 1450 ${950} L -100 ${950} Z
        `}
        fill="#0C1A0D"
      />

      {/* Front grass layer — darkest */}
      <path
        className="grass-front"
        d={`
          M -100 ${920}
          Q 80 ${910} 200 ${918}
          Q 350 ${905} 500 ${915}
          Q 650 ${902} 800 ${912}
          Q 950 ${900} 1100 ${910}
          Q 1250 ${905} 1450 ${925}
          L 1450 ${950} L -100 ${950} Z
        `}
        fill="#0A140B"
      />

      {/* Grass blades */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = (i / 40) * 1500 - 50;
        const h = 12 + Math.random() * 25;
        const lean = (Math.random() - 0.5) * 8;
        const baseY = 910 + Math.random() * 20;
        return (
          <line
            key={i}
            x1={x}
            y1={baseY}
            x2={x + lean}
            y2={baseY - h}
            stroke="#1A3D20"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.4 + Math.random() * 0.4}
            className={`grass-blade grass-blade-${i % 5}`}
          />
        );
      })}

      {/* Small bushes */}
      <ellipse cx="200" cy="905" rx="25" ry="12" fill="#0F2211" opacity="0.8" />
      <ellipse cx="600" cy="900" rx="18" ry="10" fill="#0F2211" opacity="0.6" />
      <ellipse cx="900" cy="908" rx="22" ry="11" fill="#0F2211" opacity="0.7" />
      <ellipse cx="1200" cy="902" rx="20" ry="10" fill="#0F2211" opacity="0.5" />
    </g>
  );
}

// ─── Crescent Moon ──────────────────────────────────────────────────────────

function CrescentMoon() {
  return (
    <g className="savanna-moon">
      {/* Outer glow — large soft circle */}
      <circle
        cx="1100"
        cy="180"
        r="80"
        fill="url(#moonGlow)"
        opacity="0.4"
      />
      {/* Inner glow */}
      <circle
        cx="1100"
        cy="180"
        r="45"
        fill="url(#moonGlowInner)"
        opacity="0.6"
      />
      {/* Moon crescent — two overlapping circles */}
      <clipPath id="moonClip">
        <circle cx="1100" cy="180" r="32" />
      </clipPath>
      <g clipPath="url(#moonClip)">
        <circle cx="1100" cy="180" r="32" fill="#E8D5A3" />
        <circle cx="1112" cy="170" r="28" fill="#0D1A0F" />
      </g>
    </g>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────────

function Stars() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    cx: Math.random() * 1500,
    cy: Math.random() * 500,
    r: 0.5 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 3,
  }));

  return (
    <g className="savanna-stars">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="#E8D5A3"
          opacity={s.opacity}
          className={`savanna-star savanna-star-${i % 4}`}
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
    </g>
  );
}

// ─── Horizon Glow ───────────────────────────────────────────────────────────

function HorizonGlow() {
  return (
    <g className="savanna-horizon">
      {/* Warm amber glow at the horizon line */}
      <defs>
        <linearGradient id="horizonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="rgba(200, 168, 75, 0.06)" />
          <stop offset="80%" stopColor="rgba(200, 168, 75, 0.12)" />
          <stop offset="100%" stopColor="rgba(200, 168, 75, 0.03)" />
        </linearGradient>
        <radialGradient id="horizonSpot" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="rgba(200, 168, 75, 0.15)" />
          <stop offset="40%" stopColor="rgba(200, 168, 75, 0.05)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(232, 213, 163, 0.2)" />
          <stop offset="50%" stopColor="rgba(200, 168, 75, 0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="moonGlowInner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(232, 213, 163, 0.3)" />
          <stop offset="100%" stopColor="rgba(200, 168, 75, 0.05)" />
        </radialGradient>
      </defs>
      <rect x="0" y="700" width="1500" height="250" fill="url(#horizonGrad)" />
      <ellipse cx="750" cy="900" rx="600" ry="120" fill="url(#horizonSpot)" />
    </g>
  );
}

// ─── Distant Tree Silhouettes ───────────────────────────────────────────────

function DistantTrees() {
  return (
    <g className="savanna-distant-trees" opacity="0.3">
      {/* Far distant acacia silhouettes */}
      <g transform="translate(150, 830) scale(0.3)">
        <line x1="0" y1="0" x2="0" y2="-60" stroke="#0C1A0D" strokeWidth="2" />
        <ellipse cx="0" cy="-75" rx="40" ry="12" fill="#0C1A0D" />
      </g>
      <g transform="translate(450, 840) scale(0.25)">
        <line x1="0" y1="0" x2="0" y2="-50" stroke="#0C1A0D" strokeWidth="2" />
        <ellipse cx="0" cy="-62" rx="35" ry="10" fill="#0C1A0D" />
      </g>
      <g transform="translate(1000, 835) scale(0.35)">
        <line x1="0" y1="0" x2="0" y2="-65" stroke="#0C1A0D" strokeWidth="2" />
        <ellipse cx="0" cy="-80" rx="45" ry="14" fill="#0C1A0D" />
      </g>
      <g transform="translate(1300, 845) scale(0.2)">
        <line x1="0" y1="0" x2="0" y2="-45" stroke="#0C1A0D" strokeWidth="2" />
        <ellipse cx="0" cy="-55" rx="30" ry="9" fill="#0C1A0D" />
      </g>
    </g>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SavannaScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Grass blade wind sway
    const blades = sceneRef.current.querySelectorAll(".grass-blade");
    blades.forEach((blade, i) => {
      gsap.to(blade, {
        attr: {
          x2: parseFloat(blade.getAttribute("x1") || "0") + (Math.random() - 0.5) * 6,
        },
        duration: 2 + Math.random() * 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.1 + Math.random() * 2,
      });
    });

    // Parallax on scroll — scene moves slower than content
    gsap.to(".savanna-svg", {
      y: 80,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1.5,
      },
    });
  }, []);

  return (
    <div
      ref={sceneRef}
      className="savanna-scene"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 2,
        overflow: "hidden",
      }}
    >
      {/* SVG Savanna Landscape */}
      <svg
        className="savanna-svg"
        viewBox="0 0 1500 950"
        preserveAspectRatio="xMidYMax slice"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Stars */}
        <Stars />

        {/* Horizon glow */}
        <HorizonGlow />

        {/* Crescent Moon */}
        <CrescentMoon />

        {/* Distant trees */}
        <DistantTrees />

        {/* Main Acacia Tree — positioned left-center */}
        <g transform="translate(350, 880) scale(1.2)">
          <AcaciaTree />
        </g>

        {/* Grass layers */}
        <GrassLayer />
      </svg>

      {/* Firefly Canvas overlay */}
      <FireflyCanvas />
    </div>
  );
}

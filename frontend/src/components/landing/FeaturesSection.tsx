"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { BrainIcon, BridgeIcon, ShieldIcon, ShieldSmall, BoltIcon, ChartBarIcon, LeafIcon } from "./Icons";
import { AnimatedTitle } from "./AnimatedTitle";

// ─── Types ──────────────────────────────────────────────────────────────

interface FeatureData {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  size: "hero" | "wide" | "tall" | "standard";
  visual: React.ReactNode;
}

// ─── Savanna Background Canvas for Features ──────────────────────────────

function FeaturesSavannaBg() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Animate grass blades
    const blades = svgRef.current.querySelectorAll(".feat-grass-blade");
    blades.forEach((blade, i) => {
      gsap.to(blade, {
        attr: {
          x2: parseFloat(blade.getAttribute("x1") || "0") + (Math.random() - 0.5) * 5,
        },
        duration: 2.5 + Math.random() * 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.08 + Math.random() * 1,
      });
    });

    // Giraffe gentle sway
    const giraffe = svgRef.current.querySelector(".feat-giraffe-group");
    if (giraffe) {
      gsap.to(giraffe, {
        rotation: 0.8,
        transformOrigin: "50% 100%",
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      // Gentle head bob
      gsap.to(giraffe, {
        y: -2,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }

    // Distant elephant walking
    const elephant = svgRef.current.querySelector(".feat-elephant");
    if (elephant) {
      gsap.fromTo(
        elephant,
        { x: -120 },
        { x: 1600, duration: 55, ease: "none", repeat: -1 }
      );
    }

    // Acacia tree gentle sway
    const acaciaCanopy = svgRef.current.querySelector(".feat-acacia-canopy");
    if (acaciaCanopy) {
      gsap.to(acaciaCanopy, {
        scaleX: 1.015,
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "50% 100%",
      });
    }

    // Fireflies
    const fireflies = svgRef.current.querySelectorAll(".feat-firefly");
    fireflies.forEach((ff, i) => {
      gsap.to(ff, {
        opacity: 0.08,
        duration: 1.5 + Math.random() * 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.4 + Math.random() * 2,
      });
      gsap.to(ff, {
        y: -8 - Math.random() * 12,
        x: (Math.random() - 0.5) * 10,
        duration: 5 + Math.random() * 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.3,
      });
    });

    // Sun rays rotation
    const sunRays = svgRef.current.querySelector(".feat-sun-rays");
    if (sunRays) {
      gsap.to(sunRays, {
        rotation: 360,
        duration: 60,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    }
  }, []);

  // Generate grass blades
  const grassBlades = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const x = (i / 60) * 1500 - 25;
        const h = 10 + Math.random() * 24;
        const lean = (Math.random() - 0.5) * 6;
        const baseY = 555 + Math.random() * 18;
        return { x, h, lean, baseY, opacity: 0.2 + Math.random() * 0.35 };
      }),
    []
  );

  // Fireflies
  const fireflyData = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        cx: 60 + Math.random() * 1380,
        cy: 350 + Math.random() * 200,
        r: 1 + Math.random() * 2.2,
        opacity: 0.15 + Math.random() * 0.55,
      })),
    []
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1500 600"
      preserveAspectRatio="xMidYMax slice"
      className="features-savanna-bg"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    >
      <defs>
        <linearGradient id="feat-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="35%" stopColor="rgba(200, 168, 75, 0.03)" />
          <stop offset="60%" stopColor="rgba(200, 168, 75, 0.06)" />
          <stop offset="100%" stopColor="rgba(200, 168, 75, 0.10)" />
        </linearGradient>
        <radialGradient id="feat-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 168, 75, 0.30)" />
          <stop offset="35%" stopColor="rgba(200, 168, 75, 0.12)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="feat-horizon-spot" cx="50%" cy="100%" r="55%">
          <stop offset="0%" stopColor="rgba(200, 168, 75, 0.12)" />
          <stop offset="50%" stopColor="rgba(200, 168, 75, 0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Sky gradient — warm golden haze */}
      <rect x="0" y="200" width="1500" height="400" fill="url(#feat-sky)" />

      {/* Sun — main gold palette */}
      <g transform="translate(1280, 100)">
        <circle r="100" fill="url(#feat-sun-glow)" />
        <circle r="25" fill="#C8A84B" opacity="0.2" />
        <circle r="14" fill="#C8A84B" opacity="0.38" />
        <g className="feat-sun-rays" opacity="0.15">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
            <line
              key={a}
              x1="0"
              y1="0"
              x2={Math.cos((a * Math.PI) / 180) * 70}
              y2={Math.sin((a * Math.PI) / 180) * 70}
              stroke="#C8A84B"
              strokeWidth="1.2"
            />
          ))}
        </g>
      </g>

      {/* Horizon glow — more prominent */}
      <ellipse cx="750" cy="585" rx="650" ry="110" fill="url(#feat-horizon-spot)" />

      {/* ── Acacia Tree — main palette warm tones ── */}
      <g transform="translate(400, 500)" opacity="0.45">
        {/* Trunk */}
        <line x1="0" y1="0" x2="0" y2="-70" stroke="#C8A84B" strokeWidth="4" opacity="0.5" />
        <line x1="0" y1="-50" x2="-15" y2="-60" stroke="#C8A84B" strokeWidth="2.5" opacity="0.4" />
        <line x1="0" y1="-55" x2="12" y2="-65" stroke="#C8A84B" strokeWidth="2.5" opacity="0.4" />
        {/* Canopy */}
        <g className="feat-acacia-canopy">
          <ellipse cx="0" cy="-80" rx="55" ry="14" fill="#4A7C59" opacity="0.5" />
          <ellipse cx="-8" cy="-82" rx="40" ry="10" fill="#4A7C59" opacity="0.35" />
          <ellipse cx="5" cy="-78" rx="35" ry="8" fill="#4A7C59" opacity="0.25" />
        </g>
      </g>

      {/* ── Giraffe — main palette warm gold ── */}
      <g className="feat-giraffe-group" transform="translate(520, 455)" opacity="0.35">
        {/* Body */}
        <ellipse cx="12" cy="20" rx="16" ry="10" fill="#C8A84B" opacity="0.6" />
        {/* Neck */}
        <rect x="22" y="-10" width="5" height="32" rx="2.5" fill="#C8A84B" opacity="0.5" />
        {/* Head */}
        <ellipse cx="27" cy="-14" rx="5" ry="4" fill="#C8A84B" opacity="0.55" />
        {/* Ossicones (horns) */}
        <line x1="24" y1="-18" x2="24" y2="-22" stroke="#C8A84B" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        <line x1="30" y1="-18" x2="30" y2="-22" stroke="#C8A84B" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        {/* Eye */}
        <circle cx="29" cy="-14" r="0.8" fill="#2C1A08" />
        {/* Legs */}
        <rect x="2" y="28" width="2.5" height="18" rx="1" fill="#C8A84B" opacity="0.35" />
        <rect x="8" y="28" width="2.5" height="19" rx="1" fill="#C8A84B" opacity="0.35" />
        <rect x="17" y="28" width="2.5" height="17" rx="1" fill="#C8A84B" opacity="0.35" />
        <rect x="22" y="28" width="2.5" height="18" rx="1" fill="#C8A84B" opacity="0.35" />
        {/* Tail */}
        <path d="M-4 18 Q-8 16 -7 10" stroke="#C8A84B" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.35" />
        {/* Spots — main green accent */}
        <circle cx="8" cy="18" r="2" fill="#4A7C59" opacity="0.25" />
        <circle cx="16" cy="22" r="1.8" fill="#4A7C59" opacity="0.25" />
        <circle cx="12" cy="15" r="1.5" fill="#4A7C59" opacity="0.2" />
      </g>

      {/* Distant tree silhouettes — darker for contrast on light bg */}
      <g opacity="0.2">
        <g transform="translate(180, 530) scale(0.35)">
          <line x1="0" y1="0" x2="0" y2="-55" stroke="#2A1A08" strokeWidth="3" />
          <ellipse cx="0" cy="-68" rx="38" ry="11" fill="#2A1A08" />
        </g>
        <g transform="translate(950, 535) scale(0.3)">
          <line x1="0" y1="0" x2="0" y2="-50" stroke="#2A1A08" strokeWidth="2" />
          <ellipse cx="0" cy="-63" rx="35" ry="10" fill="#2A1A08" />
        </g>
        <g transform="translate(1250, 538) scale(0.22)">
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#2A1A08" strokeWidth="2" />
          <ellipse cx="0" cy="-50" rx="28" ry="8" fill="#2A1A08" />
        </g>
      </g>

      {/* Walking elephant silhouette — more visible */}
      <g className="feat-elephant" transform="translate(0, 520) scale(0.5)">
        <path
          d="M0,0 C-2,-8 -1,-16 2,-22 C4,-26 8,-28 12,-28 C14,-28 16,-26 18,-24 
             L20,-26 C22,-28 24,-28 26,-26 L28,-24 
             C30,-20 32,-14 30,-8 L30,0 
             L28,0 L28,-2 C28,-2 26,2 24,2 L18,2 L18,0 L16,2 L10,2 L10,0 L8,2 L2,2 L2,0 Z"
          fill="#0C1A0D"
          stroke="none"
        />
        <path d="M12,-28 C10,-32 8,-36 6,-38 C4,-40 2,-40 0,-38" stroke="#0C1A0D" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="20" cy="-24" rx="5" ry="7" fill="#0C1A0D" opacity="0.8" />
        <rect x="4" y="0" width="3" height="8" rx="1" fill="#0C1A0D" />
        <rect x="10" y="0" width="3" height="9" rx="1" fill="#0C1A0D" />
        <rect x="20" y="0" width="3" height="7" rx="1" fill="#0C1A0D" />
        <rect x="26" y="0" width="3" height="8" rx="1" fill="#0C1A0D" />
        <path d="M2,-4 C-2,-6 -4,-10 -3,-14" stroke="#0C1A0D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Fireflies — main palette cream-gold */}
      {fireflyData.map((ff, i) => (
        <circle key={i} className="feat-firefly" cx={ff.cx} cy={ff.cy} r={ff.r} fill="#C8A84B" opacity={ff.opacity} />
      ))}

      {/* Ground layers — warm palette earth tones */}
      <path
        d={`M -50 ${570} Q 80 ${552} 200 ${563} Q 350 ${545} 500 ${560} Q 650 ${542} 800 ${557} Q 950 ${545} 1100 ${560} Q 1250 ${550} 1550 ${568} L 1550 600 L -50 600 Z`}
        fill="#C8A84B"
        opacity="0.2"
      />
      <path
        d={`M -50 ${580} Q 100 ${568} 250 ${576} Q 400 ${563} 550 ${573} Q 700 ${560} 850 ${570} Q 1000 ${563} 1150 ${575} Q 1300 ${566} 1550 ${578} L 1550 600 L -50 600 Z`}
        fill="#4A7C59"
        opacity="0.12"
      />
      <path
        d={`M -50 ${590} Q 120 ${583} 300 ${588} Q 480 ${580} 650 ${586} Q 830 ${578} 1000 ${585} Q 1180 ${580} 1350 ${590} L 1550 600 L -50 600 Z`}
        fill="#4A7C59"
        opacity="0.08"
      />

      {/* Grass blades — richer green on light bg */}
      {grassBlades.map((b, i) => (
        <line
          key={i}
          className="feat-grass-blade"
          x1={b.x}
          y1={b.baseY}
          x2={b.x + b.lean}
          y2={b.baseY - b.h}
          stroke="#4A7C59"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={b.opacity}
        />
      ))}

      {/* Small bushes — main palette green */}
      <ellipse cx="350" cy="578" rx="20" ry="9" fill="#4A7C59" opacity="0.35" />
      <ellipse cx="750" cy="573" rx="16" ry="8" fill="#4A7C59" opacity="0.28" />
      <ellipse cx="1100" cy="576" rx="18" ry="8" fill="#4A7C59" opacity="0.32" />
    </svg>
  );
}

// ─── Glass Card ──────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  style,
  accentColor = "#C8A84B",
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  accentColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState("");

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const { left, top, width, height } = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;
      const tiltX = (y - 0.5) * 3;
      const tiltY = (x - 0.5) * -3;
      setTransform(`perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`);
      setCursorPos({ x: e.clientX - left, y: e.clientY - top });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTransform("");
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`glass-feature-card glass-card-light ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform,
        transition: transform ? "none" : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
        ["--accent" as string]: accentColor,
      }}
    >
      {/* Spotlight follow-cursor glow */}
      <div
        className="glass-card-spotlight"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(300px circle at ${cursorPos.x}px ${cursorPos.y}px, ${accentColor}18, transparent 70%)`,
        }}
      />

      {/* Top accent border glow */}
      <div className="glass-card-accent-line" style={{ background: accentColor }} />

      {children}
    </div>
  );
}

// ─── Feature Card Content ────────────────────────────────────────────────

function FeatureContent({
  icon,
  title,
  description,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-card-inner glass-card-inner-light">
      <div className="glass-card-icon-ring glass-card-icon-ring-light" style={{ borderColor: `${accent}25` }}>
        <div className="glass-card-icon-bg" style={{ background: `${accent}10` }}>
          {icon}
        </div>
      </div>
      <h3 className="glass-card-title glass-card-title-light">{title}</h3>
      <p className="glass-card-desc glass-card-desc-light">{description}</p>
      {children}
    </div>
  );
}

// ─── Animated Chart Bars ──────────────────────────────────────────────────

function AnimatedChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartBars = [30, 45, 35, 60, 50, 75, 65, 90, 80, 95, 85, 100];

  useGSAP(
    () => {
      if (!chartRef.current) return;
      const bars = chartRef.current.querySelectorAll(".glass-chart-bar");
      gsap.from(bars, {
        scaleY: 0,
        transformOrigin: "bottom",
        duration: 0.7,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: {
          trigger: chartRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: chartRef }
  );

  return (
    <div ref={chartRef} className="glass-chart glass-chart-light">
      {chartBars.map((h, i) => (
        <div key={i} className="glass-chart-bar glass-chart-bar-light" style={{ height: `${h}%` }} />
      ))}
      {/* Y-axis line */}
      <div className="glass-chart-axis glass-chart-axis-light" />
    </div>
  );
}

// ─── Animated Shield ──────────────────────────────────────────────────────

function AnimatedShield() {
  const shieldRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!shieldRef.current) return;
      gsap.from(shieldRef.current, {
        scale: 0,
        rotation: -180,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: shieldRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: shieldRef }
  );

  return (
    <div ref={shieldRef} className="glass-shield-visual glass-shield-visual-light">
      <div className="glass-shield-ring glass-shield-ring-light" />
      <div className="glass-shield-ring glass-shield-ring-light" style={{ animationDelay: "1s" }} />
      <div className="glass-shield-ring glass-shield-ring-light" style={{ animationDelay: "2s" }} />
      <span style={{ position: "relative", zIndex: 2 }}>
        <ShieldSmall size={32} color="#4A7C59" />
      </span>
    </div>
  );
}

// ─── Animated Chain Badges ────────────────────────────────────────────────

function AnimatedChainBadges() {
  const badgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!badgeRef.current) return;
      const badges = badgeRef.current.querySelectorAll(".glass-chain-badge");
      gsap.from(badges, {
        opacity: 0,
        x: -12,
        stagger: 0.06,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: badgeRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: badgeRef }
  );

  return (
    <div ref={badgeRef} className="glass-chain-logos glass-chain-logos-light">
      {["Celo", "Ethereum", "Arbitrum", "Base", "Polygon", "Optimism"].map((chain) => (
        <span key={chain} className="glass-chain-badge glass-chain-badge-light">
          {chain}
        </span>
      ))}
    </div>
  );
}

// ─── Auto-Compound Visual ─────────────────────────────────────────────────

function AutoCompoundVisual() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const rings = ref.current.querySelectorAll(".compound-ring");
      gsap.from(rings, {
        scale: 0,
        opacity: 0,
        stagger: 0.12,
        duration: 0.6,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className="compound-visual compound-visual-light">
      <div className="compound-ring compound-ring-outer compound-ring-light" />
      <div className="compound-ring compound-ring-mid compound-ring-light-mid" />
      <div className="compound-ring compound-ring-inner compound-ring-light-inner" />
      <div className="compound-center">
        <BoltIcon size={20} color="#C8A84B" />
      </div>
    </div>
  );
}

// ─── Realtime Analytics Visual ────────────────────────────────────────────

function AnalyticsVisual() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const dots = ref.current.querySelectorAll(".analytics-dot");
      gsap.from(dots, {
        scale: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: "back.out(1.5)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
      // Animate the line
      const line = ref.current.querySelector(".analytics-line");
      if (line) {
        gsap.fromTo(
          line,
          { strokeDashoffset: 300 },
          {
            strokeDashoffset: 0,
            duration: 2,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    },
    { scope: ref }
  );

  const points = [
    [0, 40],
    [20, 30],
    [40, 35],
    [60, 20],
    [80, 25],
    [100, 10],
  ];

  return (
    <div ref={ref} className="analytics-visual analytics-visual-light">
      <svg viewBox="0 0 120 60" className="analytics-svg">
        <path
          className="analytics-line"
          d={`M ${points.map((p) => p.join(",")).join(" L ")}`}
          fill="none"
          stroke="#4A7C59"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="300"
          opacity="0.8"
        />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            className="analytics-dot"
            cx={x}
            cy={y}
            r="3"
            fill="#4A7C59"
            opacity={i === points.length - 1 ? 1 : 0.5}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Non-Custodial Visual ────────────────────────────────────────────────

function NonCustodialVisual() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.from(ref.current, {
        opacity: 0,
        y: 15,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className="noncustodial-visual noncustodial-visual-light">
      <div className="key-icon-wrapper key-icon-wrapper-light">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 2l-2 2m-4 4l-2 2m-2 2l-5 5m0 0l-2 2m2-2l-1 3m1-3l3-1"
            stroke="#C8A84B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="16" r="3" stroke="#C8A84B" strokeWidth="1.5" />
        </svg>
      </div>
      <span className="noncustodial-label noncustodial-label-light">Your Keys. Your Crypto.</span>
    </div>
  );
}

// ─── Main Features Section ──────────────────────────────────────────────

const features: FeatureData[] = [
  {
    icon: <BrainIcon size={36} />,
    title: "AI-Powered Yield",
    description:
      "Our rebalancing engine continuously scans Aave V3, Moola, and Mento Savings on Celo — automatically shifting your capital to the highest APY with zero manual effort.",
    accent: "#C8A84B",
    size: "hero",
    visual: <AnimatedChart />,
  },
  {
    icon: <BridgeIcon size={36} />,
    title: "Cross-Chain Deposit",
    description:
      "Bridge assets from any chain directly into Savanna via LI.FI integration. Deposit USDC or CELO and start earning across protocols instantly.",
    accent: "#4A7C59",
    size: "wide",
    visual: <AnimatedChainBadges />,
  },
  {
    icon: <ShieldIcon size={36} />,
    title: "Battle-Tested Security",
    description:
      "ERC-4626 vault standard with Chainlink price feeds and OpenZeppelin guardrails. Your funds are secured by architecture, not promises.",
    accent: "#4A7C59",
    size: "tall",
    visual: <AnimatedShield />,
  },
  {
    icon: <BoltIcon size={22} />,
    title: "Auto-Compounding",
    description:
      "Harvest rewards and reinvest them automatically. Your yield generates its own yield — compounding silently in the background, 24/7.",
    accent: "#C8A84B",
    size: "standard",
    visual: <AutoCompoundVisual />,
  },
  {
    icon: <ChartBarIcon size={22} />,
    title: "Real-Time Analytics",
    description:
      "Live position tracking, yield history charts, and protocol health metrics. Full transparency into every strategy move the AI makes.",
    accent: "#4A7C59",
    size: "standard",
    visual: <AnalyticsVisual />,
  },
  {
    icon: <LeafIcon size={22} />,
    title: "Non-Custodial",
    description:
      "You always hold your keys. Savanna is a smart contract vault — no middlemen, no gatekeepers. Withdraw anytime, no lock-ups.",
    accent: "#4A7C59",
    size: "standard",
    visual: <NonCustodialVisual />,
  },
];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      // Staggered card entrance
      const cards = containerRef.current.querySelectorAll(".glass-feature-card");
      cards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none none",
          },
          opacity: 0,
          y: 50,
          rotateX: 4,
          duration: 0.85,
          delay: i * 0.1,
          ease: "power3.out",
        });
      });

      // Section title entrance
      const title = containerRef.current.querySelector(".features-title-area");
      if (title) {
        gsap.from(title, {
          scrollTrigger: {
            trigger: title,
            start: "top 90%",
            toggleActions: "play none none none",
          },
          opacity: 0,
          y: 35,
          duration: 1,
          ease: "power2.out",
        });
      }

      // Savanna bg parallax
      const svg = sectionRef.current?.querySelector(".features-savanna-bg");
      if (svg) {
        gsap.to(svg, {
          y: -25,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 2,
          },
        });
      }
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={sectionRef}
      className="section features-light-section"
      id="features"
      style={{
        position: "relative",
        zIndex: 2,
        overflow: "hidden",
      }}
    >
      {/* Savanna landscape background */}
      <FeaturesSavannaBg />

      {/* Decorative golden orbs */}
      <div className="features-orb features-orb-1" />
      <div className="features-orb features-orb-2" />
      <div className="features-orb features-orb-3" />

      {/* Content */}
      <div ref={containerRef} style={{ position: "relative", zIndex: 1 }}>
        <div className="features-title-area">
          <div className="section-label features-label-light">Features</div>
          <AnimatedTitle title="Built for the <b>Future</b><br />of <b>Finance</b>" containerClass="mb-4" />
          <p className="section-sub features-sub-light" style={{ marginTop: "1rem" }}>
            Six pillars that make Savanna Finance the smartest way to earn on Celo.
          </p>
        </div>

        <div className="glass-features-grid">
          {/* ── Card 1: AI-Powered Yield — Hero (2×2) ── */}
          <GlassCard
            accentColor={features[0].accent}
            className="glass-card-hero"
          >
            <FeatureContent
              icon={features[0].icon}
              title={features[0].title}
              description={features[0].description}
              accent={features[0].accent}
            />
            <div className="glass-card-visual">{features[0].visual}</div>
          </GlassCard>

          {/* ── Card 3: Security — Tall (row-span 2) ── */}
          <GlassCard
            accentColor={features[2].accent}
            className="glass-card-tall"
          >
            <FeatureContent
              icon={features[2].icon}
              title={features[2].title}
              description={features[2].description}
              accent={features[2].accent}
            >
              <div className="glass-card-visual-sm">{features[2].visual}</div>
            </FeatureContent>
          </GlassCard>

          {/* ── Card 2: Cross-Chain — Wide (2 cols) ── */}
          <GlassCard
            accentColor={features[1].accent}
            className="glass-card-wide"
          >
            <FeatureContent
              icon={features[1].icon}
              title={features[1].title}
              description={features[1].description}
              accent={features[1].accent}
            >
              <div className="glass-card-visual-sm">{features[1].visual}</div>
            </FeatureContent>
          </GlassCard>

          {/* ── Card 4: Auto-Compound ── */}
          <GlassCard accentColor={features[3].accent}>
            <FeatureContent
              icon={features[3].icon}
              title={features[3].title}
              description={features[3].description}
              accent={features[3].accent}
            >
              <div className="glass-card-visual-sm">{features[3].visual}</div>
            </FeatureContent>
          </GlassCard>

          {/* ── Card 5: Analytics ── */}
          <GlassCard accentColor={features[4].accent}>
            <FeatureContent
              icon={features[4].icon}
              title={features[4].title}
              description={features[4].description}
              accent={features[4].accent}
            >
              <div className="glass-card-visual-sm">{features[4].visual}</div>
            </FeatureContent>
          </GlassCard>

          {/* ── Card 6: Non-Custodial ── */}
          <GlassCard accentColor={features[5].accent}>
            <FeatureContent
              icon={features[5].icon}
              title={features[5].title}
              description={features[5].description}
              accent={features[5].accent}
            >
              <div className="glass-card-visual-sm">{features[5].visual}</div>
            </FeatureContent>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import clsx from "clsx";

type Filter = "7D" | "30D" | "ALL";

// Mock data — will be replaced with real on-chain data via subgraph/events
function generateMockData(filter: Filter) {
  const days = filter === "7D" ? 7 : filter === "30D" ? 30 : 90;
  const points = filter === "7D" ? 7 : filter === "30D" ? 15 : 18;
  const step = Math.max(1, Math.floor(days / points));
  const data: { day: number; value: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < points; i++) {
    cumulative += Math.random() * 8 + 2;
    data.push({ day: i * step, value: Number(cumulative.toFixed(2)) });
  }
  return data;
}

export function YieldHistory() {
  const [filter, setFilter] = useState<Filter>("30D");
  const data = useMemo(() => generateMockData(filter), [filter]);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const filters: Filter[] = ["7D", "30D", "ALL"];

  // Chart dimensions
  const W = 600;
  const H = 200;
  const PX = 45;
  const PY = 15;
  const CW = W - PX * 2;
  const CH = H - PY * 2;

  // Build path
  const points = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * CW,
    y: PY + CH - (d.value / maxVal) * CH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area fill path
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PY + CH} L ${points[0].x} ${PY + CH} Z`;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-foreground">Yield History</h2>
        </div>
        {/* Filter buttons */}
        <div className="flex gap-1 rounded-lg bg-background p-0.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer",
                filter === f
                  ? "bg-accent-dim text-accent"
                  : "text-muted hover:text-muted-light"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* SVG Chart */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = PY + CH - frac * CH;
              const val = (frac * maxVal).toFixed(0);
              return (
                <g key={frac}>
                  <line x1={PX} y1={y} x2={PX + CW} y2={y} stroke="rgba(34,197,94,0.08)" />
                  <text x={PX - 6} y={y + 3} textAnchor="end" fill="#a1a1aa" opacity="0.5" fontSize="9">
                    ${val}
                  </text>
                </g>
              );
            })}

            {/* Area */}
            <path d={areaPath} fill="url(#areaGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" stroke="#131316" strokeWidth="2" />
            ))}

            {/* Last value label */}
            {points.length > 0 && (
              <text
                x={points[points.length - 1].x + 6}
                y={points[points.length - 1].y + 3}
                fill="#22c55e"
                fontSize="10"
                fontWeight="600"
              >
                ${data[data.length - 1].value}
              </text>
            )}
          </svg>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-[11px] text-muted">Cumulative earnings</span>
          <span className="text-sm font-bold text-accent">
            +${data[data.length - 1]?.value ?? "0.00"}
          </span>
        </div>
      </div>
    </div>
  );
}

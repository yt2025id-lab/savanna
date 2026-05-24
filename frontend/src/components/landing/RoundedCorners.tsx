"use client";

export function RoundedCorners() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter id="flt-corners">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="rounded"
          />
          <feBlend in="SourceGraphic" in2="rounded" />
        </filter>
      </defs>
    </svg>
  );
}

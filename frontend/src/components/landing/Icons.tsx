// SVG icon components — replaces all emoji icons with proper vector graphics
// Colors use the Savanna palette: gold #C8A84B, green #4A7C59, cream #E8D5A3

export function LeafIcon({ size = 24, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.5-3.5 9-12z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.71 12.71a20.37 20.37 0 01-5.09 4.13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({ size = 28 }: { size?: number; color?: string }) {
  return (
    <img
      src="/logosavannafinance.png"
      alt="Savanna Finance"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

export function BrainIcon({ size = 48, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="1" opacity="0.2" />
      <path
        d="M24 12C18.5 12 14 16.5 14 22C14 25 15.5 27.5 18 29V34C18 35.1 18.9 36 20 36H28C29.1 36 30 35.1 30 34V29C32.5 27.5 34 25 34 22C34 16.5 29.5 12 24 12Z"
        stroke={color}
        strokeWidth="1.5"
        fill={`${color}10`}
      />
      <path d="M20 22H20.01M24 20H24.01M28 22H28.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M24 12V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 29H30" stroke={color} strokeWidth="1" opacity="0.5" />
      {/* Neural network lines */}
      <line x1="20" y1="22" x2="24" y2="20" stroke={color} strokeWidth="0.8" opacity="0.3" />
      <line x1="24" y1="20" x2="28" y2="22" stroke={color} strokeWidth="0.8" opacity="0.3" />
      <line x1="20" y1="22" x2="28" y2="22" stroke={color} strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

export function BridgeIcon({ size = 48, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="1" opacity="0.2" />
      {/* Left chain node */}
      <circle cx="12" cy="24" r="6" stroke={color} strokeWidth="1.5" fill={`${color}10`} />
      <path d="M10 22L12 24L14 22M10 26L12 24L14 26" stroke={color} strokeWidth="1" opacity="0.5" />
      {/* Right chain node */}
      <circle cx="36" cy="24" r="6" stroke={color} strokeWidth="1.5" fill={`${color}10`} />
      <path d="M34 22L36 24L38 22M34 26L36 24L38 26" stroke={color} strokeWidth="1" opacity="0.5" />
      {/* Bridge arch */}
      <path d="M18 28C18 28 21 20 24 20C27 20 30 28 30 28" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Dotted transfer line */}
      <line x1="18" y1="24" x2="30" y2="24" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      {/* Arrow */}
      <path d="M28 22L30 24L28 26" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function ShieldIcon({ size = 48, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="1" opacity="0.2" />
      <path
        d="M24 8L36 14V24C36 32 24 40 24 40C24 40 12 32 12 24V14L24 8Z"
        stroke={color}
        strokeWidth="1.5"
        fill={`${color}10`}
        strokeLinejoin="round"
      />
      <path d="M19 24L22 27L29 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldSmall({ size = 32, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 4L26 9V16C26 22 16 28 16 28C16 28 6 22 6 16V9L16 4Z"
        stroke={color}
        strokeWidth="1.5"
        fill={`${color}10`}
        strokeLinejoin="round"
      />
      <path d="M12 16L14.5 18.5L20 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon({ size = 20, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 11.5C9.05 12.03 9.78 12.33 10.54 12.33C11.3 12.33 12.03 12.03 12.58 11.5L14.5 9.58C15.56 8.5 15.56 6.78 14.5 5.7C13.42 4.64 11.7 4.64 10.62 5.7L9.5 6.83"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 8.5C10.95 7.97 10.22 7.67 9.46 7.67C8.7 7.67 7.97 7.97 7.42 8.5L5.5 10.42C4.44 11.5 4.44 13.22 5.5 14.3C6.58 15.36 8.3 15.36 9.38 14.3L10.5 13.17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CoinIcon({ size = 20, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
      <path d="M10 5V15M7 8C7 8 8.5 7 10 7C11.5 7 13 8 13 8M7 12C7 12 8.5 13 10 13C11.5 13 13 12 13 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChartIcon({ size = 20, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17L3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 17L17 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 13L9 9L12 11L16 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="6" r="1.5" fill={color} />
    </svg>
  );
}

export function BoltIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L3 8H7L6 13L11 6H7L8 1Z" stroke={color} strokeWidth="1.2" fill={`${color === "currentColor" ? "currentColor" : color}30`} strokeLinejoin="round" />
    </svg>
  );
}

export function ChartBarIcon({ size = 16, color = "#C8A84B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="9" width="3" height="6" rx="0.5" fill={color} opacity="0.5" />
      <rect x="6.5" y="5" width="3" height="10" rx="0.5" fill={color} opacity="0.7" />
      <rect x="12" y="1" width="3" height="14" rx="0.5" fill={color} />
    </svg>
  );
}

"use client";

import { useState } from "react";

const PALETTE = [
  "#3ecf4a", // green (brand)
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
];

function colorForCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function TeamBadge({
  shortCode,
  logoUrl,
  size = 36,
}: {
  shortCode: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = colorForCode(shortCode);

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={shortCode}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: `1.5px solid var(--cp-surface-border)`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}22`,
        border: `1.5px solid ${color}55`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {shortCode.slice(0, 3).toUpperCase()}
    </div>
  );
}
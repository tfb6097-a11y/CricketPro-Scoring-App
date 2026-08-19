"use client";

interface Props {
  label: string;
  tone: "success" | "danger" | "neutral" | "info";
}

const TONE_STYLES: Record<Props["tone"], { color: string; bg: string }> = {
  success: { color: "#3ECF4A", bg: "rgba(62,207,74,0.12)" },
  danger: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  neutral: { color: "#8A93A0", bg: "rgba(138,147,160,0.12)" },
  info: { color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
};

export function StatusBadge({ label, tone }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <span
      style={{
        color: s.color,
        background: s.bg,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        padding: "3px 9px",
        borderRadius: 20,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}
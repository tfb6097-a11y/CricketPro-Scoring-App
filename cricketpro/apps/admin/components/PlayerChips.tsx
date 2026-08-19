"use client";

interface Player {
  id: string;
  name: string;
}

interface Props {
  striker: Player;
  nonStriker: Player;
  bowler: Player;
  onSwap: (role: "striker" | "nonStriker" | "bowler") => void;
}

export function PlayerChips({ striker, nonStriker, bowler, onSwap }: Props) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Chip label="Striker" name={striker.name} accent="var(--cp-accent-primary)" onClick={() => onSwap("striker")} />
      <Chip label="Non-Striker" name={nonStriker.name} accent="var(--cp-text-secondary)" onClick={() => onSwap("nonStriker")} />
      <Chip label="Bowler" name={bowler.name} accent="var(--cp-accent-secondary)" onClick={() => onSwap("bowler")} />
    </div>
  );
}

function Chip({ label, name, accent, onClick }: { label: string; name: string; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--cp-surface)",
        border: `1px solid ${accent}`,
        borderRadius: 20,
        padding: "6px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
      }}
      title="Tap to manually swap"
    >
      <span style={{ fontSize: 10, color: accent, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--cp-text-primary)", fontWeight: 600 }}>{name}</span>
    </button>
  );
}
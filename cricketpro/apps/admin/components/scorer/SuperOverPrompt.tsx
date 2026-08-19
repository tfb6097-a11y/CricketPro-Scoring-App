"use client";

import { useState } from "react";

interface Props {
  teamAName: string; teamAId: string;
  teamBName: string; teamBId: string;
  onStart: (battingTeamId: string) => void;
}

export function SuperOverPrompt({ teamAName, teamAId, teamBName, teamBId, onStart }: Props) {
  const [selected, setSelected] = useState("");

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 400, textAlign: "center" }}>
        <p style={{ color: "var(--cp-danger)", fontWeight: 800, fontSize: 16, margin: 0, textTransform: "uppercase" }}>Match Tied</p>
        <p className="cp-text-secondary" style={{ margin: "8px 0 20px", fontSize: 13 }}>Scores level — a Super Over will decide the winner.</p>

        <p style={{ fontSize: 12, marginBottom: 8, color: "var(--cp-text-secondary)" }}>Who bats first in the Super Over?</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[{ id: teamAId, name: teamAName }, { id: teamBId, name: teamBName }].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                flex: 1, padding: "12px", borderRadius: "var(--cp-radius-inner)",
                border: selected === t.id ? "2px solid var(--cp-accent-primary)" : "1px solid var(--cp-surface-border)",
                background: "var(--cp-bg)", color: selected === t.id ? "var(--cp-accent-primary)" : "var(--cp-text-primary)",
                fontWeight: 700, cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => selected && onStart(selected)}
          disabled={!selected}
          style={{ width: "100%", background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "12px", fontWeight: 700, fontSize: 14, opacity: selected ? 1 : 0.5, cursor: selected ? "pointer" : "not-allowed" }}
        >
          Start Super Over
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, fontFamily: "Inter, system-ui, sans-serif" };
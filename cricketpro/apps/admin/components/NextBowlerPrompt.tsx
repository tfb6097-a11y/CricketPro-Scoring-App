"use client";

import { useState } from "react";

interface Player {
  id: string;
  name: string;
}

interface Props {
  bowlingTeamPlayers: Player[];
  lastOverBowlerId: string | null;
  onConfirm: (bowlerId: string) => void;
}

export function NextBowlerPrompt({ bowlingTeamPlayers, lastOverBowlerId, onConfirm }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!selectedId) {
      setError("Select the next bowler");
      return;
    }
    if (selectedId === lastOverBowlerId) {
      setError("This bowler just finished the last over — pick someone else");
      return;
    }
    onConfirm(selectedId);
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 380 }}>
        <h3 style={{ marginTop: 0 }}>Over Complete — Select Next Bowler</h3>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {bowlingTeamPlayers.map((p) => {
            const isLastBowler = p.id === lastOverBowlerId;
            return (
              <button
                key={p.id}
                disabled={isLastBowler}
                onClick={() => {
                  setSelectedId(p.id);
                  setError(null);
                }}
                style={{
                  ...optionButtonStyle,
                  opacity: isLastBowler ? 0.4 : 1,
                  cursor: isLastBowler ? "not-allowed" : "pointer",
                  borderColor: selectedId === p.id ? "var(--cp-accent-primary)" : "var(--cp-surface-border)",
                  color: selectedId === p.id ? "var(--cp-accent-primary)" : "var(--cp-text-primary)",
                }}
              >
                {p.name} {isLastBowler && <span style={{ fontSize: 11 }}>(bowled last over)</span>}
              </button>
            );
          })}
        </div>

        {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button onClick={handleConfirm} style={confirmButtonStyle}>
          Confirm Bowler
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  fontFamily: "Inter, system-ui, sans-serif",
};

const optionButtonStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 600,
  textAlign: "left",
};

const confirmButtonStyle: React.CSSProperties = {
  background: "var(--cp-accent-primary)",
  color: "#0b0e11",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
};
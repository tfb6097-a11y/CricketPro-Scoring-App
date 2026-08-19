"use client";

import { useState } from "react";

interface Props {
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  onSubmit: (tossWinnerTeamId: string, tossDecision: "BAT" | "BOWL") => Promise<void>;
}

export function TossScreen({ teamA, teamB, onSubmit }: Props) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"BAT" | "BOWL" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!winnerId || !decision) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(winnerId, decision);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record toss");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const winnerName = winnerId === teamA.id ? teamA.name : teamB.name;
    return (
      <div className="cp-card">
        <p style={{ color: "var(--cp-accent-primary)", margin: 0 }}>
          ✓ Toss: {winnerName} won and chose to {decision}
        </p>
      </div>
    );
  }

  return (
    <div className="cp-card">
      <h3 style={{ marginTop: 0 }}>Toss</h3>

      <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>Who won the toss?</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[teamA, teamB].map((team) => (
          <button
            key={team.id}
            onClick={() => setWinnerId(team.id)}
            style={{
              ...toggleButtonStyle,
              borderColor: winnerId === team.id ? "var(--cp-accent-primary)" : "var(--cp-surface-border)",
              color: winnerId === team.id ? "var(--cp-accent-primary)" : "var(--cp-text-primary)",
            }}
          >
            {team.name}
          </button>
        ))}
      </div>

      <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>Elected to:</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {(["BAT", "BOWL"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDecision(d)}
            style={{
              ...toggleButtonStyle,
              borderColor: decision === d ? "var(--cp-accent-secondary)" : "var(--cp-surface-border)",
              color: decision === d ? "var(--cp-accent-secondary)" : "var(--cp-text-primary)",
            }}
          >
            {d === "BAT" ? "Bat" : "Bowl"}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={!winnerId || !decision || submitting}
        style={{
          ...primaryButtonStyle,
          opacity: !winnerId || !decision ? 0.5 : 1,
          cursor: !winnerId || !decision ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Confirming..." : "Confirm Toss"}
      </button>
    </div>
  );
}

const toggleButtonStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  flex: 1,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--cp-accent-primary)",
  color: "#0b0e11",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: 14,
};
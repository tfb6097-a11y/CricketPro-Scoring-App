"use client";

import { useState } from "react";
import { TeamPlayerEntry } from "../lib/api-client";

interface Props {
  teamName: string;
  squad: TeamPlayerEntry[]; // active squad members for this team
  onSubmit: (selections: { playerId: string; isCaptain: boolean; isKeeper: boolean }[]) => Promise<void>;
}

export function PlayingXIPicker({ teamName, squad, onSubmit }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [keeperId, setKeeperId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleSelect(playerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        if (captainId === playerId) setCaptainId(null);
        if (keeperId === playerId) setKeeperId(null);
      } else {
        if (next.size >= 11) return prev; // hard cap at 11
        next.add(playerId);
      }
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (selectedIds.size !== 11) {
      setError(`Select exactly 11 players (currently ${selectedIds.size})`);
      return;
    }
    if (!captainId) {
      setError("Flag one player as captain");
      return;
    }
    if (!keeperId) {
      setError("Flag one player as wicketkeeper");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(
        Array.from(selectedIds).map((playerId) => ({
          playerId,
          isCaptain: playerId === captainId,
          isKeeper: playerId === keeperId,
        })),
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit Playing XI");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="cp-card">
        <p style={{ color: "var(--cp-accent-primary)", margin: 0 }}>
          ✓ Playing XI confirmed for {teamName}
        </p>
      </div>
    );
  }

  return (
    <div className="cp-card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{teamName} — Playing XI</h3>
        <span className="cp-text-secondary" style={{ fontSize: 13 }}>
          {selectedIds.size} / 11 selected
        </span>
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
        {squad.map((entry) => {
          const p = entry.player;
          const isSelected = selectedIds.has(p.id);
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "var(--cp-radius-inner)",
                background: isSelected ? "var(--cp-bg)" : "transparent",
                border: "1px solid var(--cp-surface-border)",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} />
                <span>{p.name}</span>
                <span className="cp-text-secondary" style={{ fontSize: 12 }}>{p.role}</span>
              </label>

              {isSelected && (
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="radio"
                      name="captain"
                      checked={captainId === p.id}
                      onChange={() => setCaptainId(p.id)}
                    />
                    Captain
                  </label>
                  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="radio"
                      name="keeper"
                      checked={keeperId === p.id}
                      onChange={() => setKeeperId(p.id)}
                    />
                    Keeper
                  </label>
                </div>
              )}
            </div>
          );
        })}
        {squad.length === 0 && (
          <p className="cp-text-secondary" style={{ fontSize: 13 }}>
            No active squad members found for this team.
          </p>
        )}
      </div>

      {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          background: "var(--cp-accent-primary)",
          color: "#0b0e11",
          border: "none",
          borderRadius: "var(--cp-radius-inner)",
          padding: "8px 16px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        {submitting ? "Confirming..." : "Confirm Playing XI"}
      </button>
    </div>
  );
}
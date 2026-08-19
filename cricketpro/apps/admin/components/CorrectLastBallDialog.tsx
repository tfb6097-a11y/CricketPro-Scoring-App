"use client";

import { useState } from "react";
import { correctBall, CorrectBallPayload } from "../lib/api-client";

interface LastBall {
  id: string;
  runsOffBat: number;
  extraType: "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE";
  extraRuns: number;
}

interface Props {
  lastBall: LastBall;
  inningsId: string;
  nextSequenceNum: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  isFreeHit: boolean;
  onClose: () => void;
  onCorrected: () => void;
}

const EXTRA_TYPES = ["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE"] as const;

export function CorrectLastBallDialog({
  lastBall,
  inningsId,
  nextSequenceNum,
  strikerId,
  nonStrikerId,
  bowlerId,
  isFreeHit,
  onClose,
  onCorrected,
}: Props) {
  const [runsOffBat, setRunsOffBat] = useState(lastBall.runsOffBat);
  const [extraType, setExtraType] = useState(lastBall.extraType);
  const [extraRuns, setExtraRuns] = useState(lastBall.extraRuns);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload: CorrectBallPayload = {
        originalBallId: lastBall.id,
        inningsId,
        sequenceNum: nextSequenceNum,
        strikerId,
        nonStrikerId,
        bowlerId,
        runsOffBat,
        extraType,
        extraRuns,
        isFreeHit,
        reason: reason || undefined,
      };
      await correctBall(payload);
      onCorrected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to correct ball");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "var(--cp-accent-secondary)" }}>Correct Last Ball</h3>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <p className="cp-text-secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          This does not edit the original record — it inserts a correcting entry and
          recalculates the score. The original stays in the audit trail.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Runs off bat</label>
            <input
              type="number"
              min={0}
              value={runsOffBat}
              onChange={(e) => setRunsOffBat(parseInt(e.target.value, 10) || 0)}
              style={inputStyle}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Extra type</label>
            <select value={extraType} onChange={(e) => setExtraType(e.target.value as any)} style={inputStyle}>
              {EXTRA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Extra runs</label>
            <input
              type="number"
              min={0}
              value={extraRuns}
              onChange={(e) => setExtraRuns(parseInt(e.target.value, 10) || 0)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reason (optional, goes to audit log)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. mis-tapped 4 instead of 1"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={submitting} style={confirmButtonStyle}>
          {submitting ? "Correcting..." : "Submit Correction"}
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
  zIndex: 55,
  fontFamily: "Inter, system-ui, sans-serif",
};

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--cp-text-secondary)",
  fontSize: 16,
  cursor: "pointer",
};

const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, flex: 1 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--cp-text-secondary)" };

const inputStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 10px",
  color: "var(--cp-text-primary)",
  fontSize: 14,
  width: "100%",
};

const confirmButtonStyle: React.CSSProperties = {
  background: "var(--cp-accent-secondary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
};
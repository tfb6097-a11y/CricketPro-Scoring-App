"use client";

import { useState } from "react";

export type DismissalType =
  | "BOWLED"
  | "CAUGHT"
  | "LBW"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET"
  | "RETIRED_HURT"
  | "OTHER";

const DISMISSAL_TYPES: { value: DismissalType; label: string; needsFielder: boolean }[] = [
  { value: "BOWLED", label: "Bowled", needsFielder: false },
  { value: "CAUGHT", label: "Caught", needsFielder: true },
  { value: "LBW", label: "LBW", needsFielder: false },
  { value: "RUN_OUT", label: "Run Out", needsFielder: true },
  { value: "STUMPED", label: "Stumped", needsFielder: true },
  { value: "HIT_WICKET", label: "Hit Wicket", needsFielder: false },
  { value: "RETIRED_HURT", label: "Retired Hurt", needsFielder: false },
  { value: "OTHER", label: "Other", needsFielder: false },
];

interface Player {
  id: string;
  name: string;
}

interface Props {
  isFreeHit: boolean;
  striker: Player;
  nonStriker: Player;
  fieldingTeamPlayers: Player[]; // for fielder selection on catches/run-outs/stumpings
  onConfirm: (result: { dismissedPlayerId: string; dismissalType: DismissalType; fielderId?: string }) => void;
  onCancel: () => void;
}

export function WicketDialog({
  isFreeHit,
  striker,
  nonStriker,
  fieldingTeamPlayers,
  onConfirm,
  onCancel,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [dismissalType, setDismissalType] = useState<DismissalType | null>(null);
  const [dismissedPlayerId, setDismissedPlayerId] = useState<string>(striker.id);
  const [fielderId, setFielderId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // On a free hit, only RUN_OUT is selectable — enforced here so the scorer
  // can't even pick an invalid option, in addition to the backend guard.
  const availableTypes = isFreeHit
    ? DISMISSAL_TYPES.filter((d) => d.value === "RUN_OUT")
    : DISMISSAL_TYPES;

  const selectedTypeInfo = DISMISSAL_TYPES.find((d) => d.value === dismissalType);

  function handleSelectType(type: DismissalType) {
    setDismissalType(type);
    setError(null);
    setStep(2);
  }

  function handleConfirm() {
    if (!dismissalType) return;
    if (selectedTypeInfo?.needsFielder && !fielderId) {
      setError("Select the fielder involved in the dismissal");
      return;
    }
    onConfirm({
      dismissedPlayerId,
      dismissalType,
      fielderId: selectedTypeInfo?.needsFielder ? fielderId : undefined,
    });
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "var(--cp-danger)" }}>Wicket</h3>
          <button onClick={onCancel} style={closeButtonStyle}>✕</button>
        </div>

        {isFreeHit && (
          <p style={{ fontSize: 12, color: "var(--cp-accent-secondary)", marginTop: 0, marginBottom: 12 }}>
            Free hit — only Run Out is allowed
          </p>
        )}

        {step === 1 && (
          <>
            <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>Dismissal type</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {availableTypes.map((d) => (
                <button key={d.value} onClick={() => handleSelectType(d.value)} style={optionButtonStyle}>
                  {d.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && dismissalType && (
          <>
            <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 4 }}>
              {selectedTypeInfo?.label} — who was dismissed?
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[striker, nonStriker].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDismissedPlayerId(p.id)}
                  style={{
                    ...toggleButtonStyle,
                    borderColor: dismissedPlayerId === p.id ? "var(--cp-danger)" : "var(--cp-surface-border)",
                    color: dismissedPlayerId === p.id ? "var(--cp-danger)" : "var(--cp-text-primary)",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {selectedTypeInfo?.needsFielder && (
              <>
                <p className="cp-text-secondary" style={{ fontSize: 13, marginBottom: 4 }}>Fielder</p>
                <select
                  value={fielderId}
                  onChange={(e) => setFielderId(e.target.value)}
                  style={{ ...inputStyle, width: "100%", marginBottom: 14 }}
                >
                  <option value="">Select fielder...</option>
                  {fieldingTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </>
            )}

            {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 10 }}>{error}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ ...optionButtonStyle, flex: 1 }}>Back</button>
              <button onClick={handleConfirm} style={{ ...confirmButtonStyle, flex: 1 }}>Confirm Wicket</button>
            </div>
          </>
        )}
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

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--cp-text-secondary)",
  fontSize: 16,
  cursor: "pointer",
};

const optionButtonStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "var(--cp-text-primary)",
};

const toggleButtonStyle: React.CSSProperties = {
  ...optionButtonStyle,
  flex: 1,
};

const inputStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 10px",
  color: "var(--cp-text-primary)",
  fontSize: 14,
};

const confirmButtonStyle: React.CSSProperties = {
  background: "var(--cp-danger)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "10px 12px",
  fontWeight: 700,
  cursor: "pointer",
};
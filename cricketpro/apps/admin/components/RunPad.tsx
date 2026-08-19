"use client";

interface Props {
  onRun: (runs: number) => void;
  onExtra: (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => void;
  onWicket: () => void;
  disabled?: boolean;
}

export function RunPad({ onRun, onExtra, onWicket, disabled }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr 0.85fr", gap: 16 }}>
      {/* RUNS */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>Runs</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(2, 60px)", gap: 10 }}>
          {[0, 1, 2, 3].map((r) => (
            <RunButton key={r} label={String(r)} onClick={() => onRun(r)} disabled={disabled} />
          ))}
          <RunButton label="4" onClick={() => onRun(4)} disabled={disabled} accent="var(--cp-accent-secondary)" filled />
          <RunButton label="6" onClick={() => onRun(6)} disabled={disabled} accent="var(--cp-accent-primary)" filled />
        </div>
      </div>

      {/* EXTRAS */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>Extras</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(2, 60px)", gap: 10 }}>
          <ExtraChip label="Wide" onClick={() => onExtra("WIDE")} disabled={disabled} />
          <ExtraChip label="No Ball" onClick={() => onExtra("NO_BALL")} disabled={disabled} danger />
          <ExtraChip label="Bye" onClick={() => onExtra("BYE")} disabled={disabled} />
          <ExtraChip label="Leg Bye" onClick={() => onExtra("LEG_BYE")} disabled={disabled} />
        </div>
      </div>

      {/* WICKET */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p className="cp-text-secondary" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8, letterSpacing: 0.5 }}>Wicket</p>
        <button
          onClick={onWicket}
          disabled={disabled}
          style={{
            width: "100%",
            height: 130,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid var(--cp-danger)",
            borderRadius: "var(--cp-radius-inner)",
            color: "var(--cp-danger)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 10px",
          }}
        >
          🏏 Tap to add wicket
        </button>
      </div>
    </div>
  );
}

function RunButton({ label, onClick, disabled, accent, filled }: { label: string; onClick: () => void; disabled?: boolean; accent?: string; filled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: "100%",
        background: filled ? accent : "var(--cp-bg)",
        border: `1px solid ${accent ?? "var(--cp-surface-border)"}`,
        borderRadius: "var(--cp-radius-inner)",
        color: filled ? "#0b0e11" : accent ?? "var(--cp-text-primary)",
        fontSize: 20,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function ExtraChip({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        height: "100%",
        padding: "0 6px",
        background: "var(--cp-bg)",
        border: `1px solid ${danger ? "var(--cp-danger)" : "var(--cp-surface-border)"}`,
        borderRadius: "var(--cp-radius-inner)",
        color: danger ? "var(--cp-danger)" : "var(--cp-text-primary)",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
"use client";

interface Props {
  inningsNumber: number; // the innings that JUST completed
  totalRuns: number;
  totalWickets: number;
  targetRuns: number | null; // set when 1st innings just closed
  battingTeamName: string;
  bowlingTeamName: string;
  onContinue: () => void;
}

export function InningsTransitionScreen({
  inningsNumber,
  totalRuns,
  totalWickets,
  targetRuns,
  battingTeamName,
  bowlingTeamName,
  onContinue,
}: Props) {
  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 420, textAlign: "center" }}>
        <p className="cp-text-secondary" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
          Innings {inningsNumber} Complete
        </p>
        <h2 style={{ margin: "8px 0" }}>{battingTeamName}</h2>
        <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0", fontVariantNumeric: "tabular-nums" }}>
          {totalRuns}/{totalWickets}
        </p>

        {targetRuns && (
          <div
            className="cp-card"
            style={{ marginTop: 16, background: "var(--cp-bg)", border: "1px solid var(--cp-accent-secondary)" }}
          >
            <p className="cp-text-secondary" style={{ fontSize: 12, margin: 0 }}>Target for {bowlingTeamName}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "var(--cp-accent-secondary)", margin: "4px 0 0" }}>
              {targetRuns}
            </p>
          </div>
        )}

        <button onClick={onContinue} style={continueButtonStyle}>
          {targetRuns ? "Start 2nd Innings" : "Continue"}
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
  fontFamily: "Inter, system-ui, sans-serif",
};

const continueButtonStyle: React.CSSProperties = {
  marginTop: 20,
  background: "var(--cp-accent-primary)",
  color: "#0b0e11",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "12px 24px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
  width: "100%",
};
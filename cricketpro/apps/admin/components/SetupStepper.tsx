"use client";

interface Props {
  currentStep: number; // 1-5
}

const STEPS = ["Match", "Toss", "Team A (XI)", "Team B (XI)", "Confirm"];

export function SetupStepper({ currentStep }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}>
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  background: isDone || isActive ? "var(--cp-accent-primary)" : "var(--cp-surface)",
                  color: isDone || isActive ? "#0b0e11" : "var(--cp-text-secondary)",
                  border: isDone || isActive ? "none" : "1px solid var(--cp-surface-border)",
                }}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span style={{ fontSize: 10.5, color: isActive ? "var(--cp-text-primary)" : "var(--cp-text-secondary)", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {stepNum < STEPS.length && (
              <div style={{ width: 32, height: 1, background: isDone ? "var(--cp-accent-primary)" : "var(--cp-surface-border)", margin: "0 4px 16px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
"use client";

interface Props {
  strikerName: string;
  strikerRuns: number;
  strikerBalls: number;
  nonStrikerName: string;
  nonStrikerRuns: number;
  nonStrikerBalls: number;
  partnershipRuns: number;
  partnershipBalls: number;
}

export function PartnershipCard({
  strikerName, strikerRuns, strikerBalls,
  nonStrikerName, nonStrikerRuns, nonStrikerBalls,
  partnershipRuns, partnershipBalls,
}: Props) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Partnership</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p className="cp-stat-number" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{strikerRuns} ({strikerBalls})</p>
          <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 12 }}>{strikerName}</p>
        </div>
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "3px solid var(--cp-accent-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 16,
          }}
        >
          {partnershipRuns}
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="cp-stat-number" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{nonStrikerRuns} ({nonStrikerBalls})</p>
          <p className="cp-text-secondary" style={{ margin: "2px 0 0", fontSize: 12 }}>{nonStrikerName}</p>
        </div>
      </div>
      <p className="cp-text-secondary" style={{ textAlign: "center", margin: "10px 0 0", fontSize: 12 }}>
        {partnershipRuns} Runs from {partnershipBalls} Balls
      </p>
    </div>
  );
}
"use client";

interface Props {
  name: string; runs: number; balls: number; isStriker: boolean; photoUrl?: string | null;
}

export function BatsmanCard({ name, runs, balls, isStriker, photoUrl }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
      <p className="cp-text-secondary" style={{ margin: 0, fontSize: 10, textTransform: "uppercase" }}>
        {isStriker ? "Striker" : "Non-Striker"}
      </p>
      <div
        style={{
          width: 40, height: 40, borderRadius: "50%", overflow: "hidden",
          background: photoUrl ? undefined : "var(--cp-bg)",
          border: isStriker ? "2px solid var(--cp-accent-primary)" : "1px solid var(--cp-surface-border)",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "var(--cp-text-secondary)",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          name[0]
        )}
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{name}</p>
      <p className="cp-stat-number" style={{ margin: 0, fontSize: 12, color: "var(--cp-text-secondary)" }}>
        {runs} ({balls})
      </p>
    </div>
  );
}
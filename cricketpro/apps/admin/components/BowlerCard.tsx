"use client";

interface Props {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  photoUrl?: string | null;
}

export function BowlerCard({ name, overs, maidens, runs, wickets, photoUrl }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
      <p className="cp-text-secondary" style={{ margin: 0, fontSize: 10, textTransform: "uppercase" }}>Bowler</p>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          overflow: "hidden",
          background: photoUrl ? undefined : "var(--cp-bg)",
          border: "1px solid var(--cp-accent-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--cp-accent-secondary)",
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
        {overs} - {maidens} - {runs} - {wickets}
      </p>
    </div>
  );
}
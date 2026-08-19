"use client";

import { useEffect, useState } from "react";
import { fetchAllTournaments, fetchPointsTable } from "../../lib/api-client";

export default function PointsTablePage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    fetchAllTournaments()
      .then((t) => {
        setTournaments(t);
        if (t.length > 0) setSelectedId(t[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setTableLoading(true);
    fetchPointsTable(selectedId)
      .then(setRows)
      .finally(() => setTableLoading(false));
  }, [selectedId]);

  if (loading) return <main style={{ padding: 24, color: "var(--cp-text-secondary)" }}>Loading...</main>;

  const selectedTournament = tournaments.find((t) => t.id === selectedId);

  // Sort by points desc, then NRR desc — standard cricket points-table ordering,
  // matching what the backend already computes but re-sorted defensively here
  // in case ordering ever changes server-side.
  const sortedRows = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.nrr ?? 0) - (a.nrr ?? 0);
  });

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>
          {selectedTournament?.name ?? "Points Table"}
        </h1>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            background: "var(--cp-surface)",
            border: "1px solid var(--cp-surface-border)",
            borderRadius: "var(--cp-radius-inner)",
            padding: "8px 12px",
            color: "var(--cp-text-primary)",
            fontSize: 13,
          }}
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTournament && (
        <p className="cp-text-secondary" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 16 }}>
          {selectedTournament.format} · {new Date(selectedTournament.startDate).toLocaleDateString()} – {new Date(selectedTournament.endDate).toLocaleDateString()}
        </p>
      )}

      <div className="cp-card">
        {tableLoading ? (
          <p className="cp-text-secondary" style={{ fontSize: 13, margin: 0 }}>Loading table...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Pos", "Team", "M", "W", "L", "T", "Pts", "NRR"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => (
                <tr key={r.teamId} style={{ background: i < 4 ? "rgba(62,207,74,0.04)" : "transparent" }}>
                  <td style={cellStyle}>{i + 1}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: r.team?.logoUrl ? `url(${r.team.logoUrl}) center/cover` : "var(--cp-bg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {!r.team?.logoUrl && r.team?.shortCode}
                      </div>
                      <span style={{ fontWeight: 600 }}>{r.team?.name ?? "—"}</span>
                    </div>
                  </td>
                  <td style={cellStyle} className="cp-stat-number">{r.played}</td>
                  <td style={cellStyle} className="cp-stat-number">{r.won}</td>
                  <td style={cellStyle} className="cp-stat-number">{r.lost}</td>
                  <td style={cellStyle} className="cp-stat-number">{r.tied}</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }} className="cp-stat-number">{r.points}</td>
                  <td
                    style={{ ...cellStyle, color: r.nrr >= 0 ? "var(--cp-accent-primary)" : "var(--cp-danger)" }}
                    className="cp-stat-number"
                  >
                    {r.nrr > 0 ? "+" : ""}{Number(r.nrr).toFixed(3)}
                  </td>
                </tr>
              ))}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>
                    No matches completed yet in this tournament.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {sortedRows.length > 0 && (
        <p className="cp-text-secondary" style={{ fontSize: 11.5, marginTop: 10 }}>
          Top 4 teams qualify for playoffs. Pts = Points, NRR = Net Run Rate.
        </p>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  padding: "10px",
  borderBottom: "1px solid var(--cp-surface-border)",
};

const cellStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid var(--cp-surface-border)",
  fontSize: 13.5,
};
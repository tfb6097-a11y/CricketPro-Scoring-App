"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTournaments,AdminTournament,createTournament } from "../../../../lib/api-client";

const FORMATS = ["T20", "ODI", "TEST","PRACTICE"];
const DEFAULT_OVERS: Record<string, number> = { T20: 20, ODI: 50, TEST: 90, Practice: 2, };

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [format, setFormat] = useState("T20");
  const [oversPerInnings, setOversPerInnings] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadTournaments() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTournaments();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  function handleFormatChange(f: string) {
    setFormat(f);
    setOversPerInnings(DEFAULT_OVERS[f] ?? 20);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createTournament({ name, format, oversPerInnings, startDate, endDate });
      setName("");
      setStartDate("");
      setEndDate("");
      setShowForm(false);
      loadTournaments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create tournament");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Loading tournaments...</main>;
  if (error)
    return <main style={{ padding: 24, color: "var(--cp-danger)" }}>Error: {error}</main>;

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-tour-header { flex-wrap: wrap; gap: 10px; }
        .cp-tour-form { flex-wrap: wrap; }
        @media (max-width: 600px) {
          main { padding: 16px !important; }
        }
      `}</style>

      <div className="cp-tour-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Tournaments</h1>
        <button onClick={() => setShowForm((s) => !s)} style={primaryButtonStyle}>
          {showForm ? "Cancel" : "Create Tournament"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card cp-tour-form" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Format</label>
            <select value={format} onChange={(e) => handleFormatChange(e.target.value)} style={inputStyle}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Overs / Innings</label>
            <input
              type="number"
              value={oversPerInnings}
              onChange={(e) => setOversPerInnings(parseInt(e.target.value, 10))}
              required
              style={{ ...inputStyle, width: 90 }}
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Saving..." : "Save Tournament"}
          </button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {tournaments.map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="cp-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <strong>{t.name}</strong>{" "}
                <span className="cp-text-secondary" style={{ fontSize: 13 }}>
                  {t.format} · {t.oversPerInnings} overs · {t.teams.length} teams
                </span>
              </div>
              <StatusPill status={t.status} />
            </div>
          </Link>
        ))}
        {tournaments.length === 0 && <p className="cp-text-secondary">No tournaments yet.</p>}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    UPCOMING: "var(--cp-text-secondary)",
    ONGOING: "var(--cp-accent-primary)",
    COMPLETED: "var(--cp-accent-secondary)",
  };
  return (
    <span style={{ color: colorMap[status] ?? "var(--cp-text-secondary)", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>
      {status}
    </span>
  );
}

const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--cp-text-secondary)" };

const inputStyle: React.CSSProperties = {
  background: "var(--cp-bg)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 10px",
  color: "var(--cp-text-primary)",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "var(--cp-accent-primary)",
  color: "#0b0e11",
  border: "none",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 16px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};
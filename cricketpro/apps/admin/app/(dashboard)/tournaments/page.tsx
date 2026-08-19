"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import {
  fetchTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  fetchTeams,
  addTeamToTournament,
  removeTeamFromTournament,
  AdminTournament,
} from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { SearchInput } from "../../../components/SearchInput";
import { ImageUploadField } from "../../../components/ImageUploadField";

const FORMATS = ["T20", "ODI", "TEST", "PRACTICE"];
const DEFAULT_OVERS: Record<string, number> = { T20: 20, ODI: 50, TEST: 90, Practice: 2, };
const PAGE_SIZE = 6;

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [format, setFormat] = useState("T20");
  const [oversPerInnings, setOversPerInnings] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingTournament, setEditingTournament] = useState<AdminTournament | null>(null);

  async function loadTournaments() {
    setLoading(true);
    setError(null);
    try {
      setTournaments(await fetchTournaments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTournaments(); }, []);

  function handleFormatChange(f: string) {
    setFormat(f);
    setOversPerInnings(DEFAULT_OVERS[f] ?? 20);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createTournament({ name, format, oversPerInnings, startDate, endDate, logoUrl: logoUrl || undefined });
      setName(""); setStartDate(""); setEndDate(""); setLogoUrl(null); setShowForm(false);
      await loadTournaments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create tournament");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tournament? This cannot be undone.")) return;
    try {
      await deleteTournament(id);
      loadTournaments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete tournament");
    }
  }

  const filtered = tournaments.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p style={{ color: "var(--cp-text-secondary)" }}>Loading tournaments...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 640px; }
        .cp-tour-form { flex-wrap: wrap; }
        .cp-modal-card { width: min(420px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-tour-footer { flex-wrap: wrap; gap: 10px; }
        .cp-tour-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--cp-surface-border); margin-bottom: 14px; }
        .cp-team-chip { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: var(--cp-bg); border: 1px solid var(--cp-surface-border); font-size: 13; margin-bottom: 6px; }
      `}</style>

      <AdminPageHeader title="Tournaments" subtitle="Manage all tournaments." actionLabel="Add Tournament" onAction={() => setShowForm((s) => !s)} />

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card cp-tour-form" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="tournaments" value={logoUrl} onChange={setLogoUrl} shape="square" />
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={15}style={inputStyle} /></Field>
          <Field label="Format">
            <select value={format} onChange={(e) => handleFormatChange(e.target.value)} style={inputStyle}>
              {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Overs / Innings"><input type="number" value={oversPerInnings} onChange={(e) => setOversPerInnings(parseInt(e.target.value, 10))} required style={{ ...inputStyle, width: 90 }} /></Field>
          <Field label="Start Date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={inputStyle} /></Field>
          <Field label="End Date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Tournament"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div style={{ marginBottom: 16, maxWidth: 260 }}>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search tournaments..." />
      </div>

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Tournament", "Format", "Start Date", "End Date", "Status", "Actions"].map((h) => <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t.id}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: t.logoUrl ? `url(${t.logoUrl}) center/cover` : "var(--cp-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                        {!t.logoUrl && "🏆"}
                      </div>
                      <Link href={`/tournaments/${t.id}`} style={{ color: "var(--cp-text-primary)", textDecoration: "none", fontWeight: 600 }}>{t.name}</Link>
                    </div>
                  </td>
                  <td style={cellStyle}>{t.format}</td>
                  <td style={cellStyle} className="cp-text-secondary">{new Date(t.startDate).toLocaleDateString()}</td>
                  <td style={cellStyle} className="cp-text-secondary">{new Date(t.endDate).toLocaleDateString()}</td>
                  <td style={cellStyle}><StatusPill status={t.status} /></td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditingTournament(t)} style={iconButtonStyle} title="Edit"><Pencil size={14} color="var(--cp-accent-secondary)" /></button>
                      <button onClick={() => handleDelete(t.id)} style={iconButtonStyle} title="Delete"><Trash2 size={14} color="var(--cp-danger)" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No tournaments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-tour-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
            Showing {paginated.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tournaments
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} onClick={() => setPage(n)} style={{ ...pageButtonStyle, background: n === page ? "var(--cp-accent-primary)" : "var(--cp-bg)", color: n === page ? "#0b0e11" : "var(--cp-text-secondary)" }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {editingTournament && (
        <EditTournamentModal
          tournament={editingTournament}
          onClose={() => setEditingTournament(null)}
          onSaved={() => { setEditingTournament(null); loadTournaments(); }}
        />
      )}
    </div>
  );
}

function EditTournamentModal({ tournament, onClose, onSaved }: { tournament: AdminTournament; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"details" | "teams">("details");

  const [name, setName] = useState(tournament.name);
  const [format, setFormat] = useState(tournament.format);
  const [oversPerInnings, setOversPerInnings] = useState(tournament.oversPerInnings);
  const [startDate, setStartDate] = useState(tournament.startDate.split("T")[0]);
  const [endDate, setEndDate] = useState(tournament.endDate.split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(tournament.logoUrl);

  // --- Teams tab state ---
  const [allTeams, setAllTeams] = useState<any[]>([]);
  // tournament.teams is included from findAll()/findOne() as { team }[] entries
  const [registeredTeams, setRegisteredTeams] = useState<any[]>((tournament as any).teams?.map((tt: any) => tt.team) ?? []);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamActionLoading, setTeamActionLoading] = useState(false);

  useEffect(() => {
    if (tab !== "teams" || allTeams.length > 0) return;
    setTeamsLoading(true);
    fetchTeams()
      .then(setAllTeams)
      .catch(() => setTeamError("Failed to load teams"))
      .finally(() => setTeamsLoading(false));
  }, [tab, allTeams.length]);

  const registeredIds = new Set(registeredTeams.map((t) => t.id));
  const availableTeams = allTeams.filter((t) => !registeredIds.has(t.id));

  async function handleAddTeam() {
    if (!selectedTeamId) return;
    setTeamError(null);
    setTeamActionLoading(true);
    try {
      await addTeamToTournament(tournament.id, selectedTeamId);
      const team = allTeams.find((t) => t.id === selectedTeamId);
      if (team) setRegisteredTeams((prev) => [...prev, team]);
      setSelectedTeamId("");
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to add team");
    } finally {
      setTeamActionLoading(false);
    }
  }

  async function handleRemoveTeam(teamId: string) {
    setTeamError(null);
    setTeamActionLoading(true);
    try {
      await removeTeamFromTournament(tournament.id, teamId);
      setRegisteredTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to remove team");
    } finally {
      setTeamActionLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updateTournament(tournament.id, { name, format, oversPerInnings, startDate, endDate, logoUrl: logoUrl || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tournament");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card" style={{ width: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Tournament</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cp-text-secondary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div className="cp-tour-tabs">
          <button
            onClick={() => setTab("details")}
            style={{
              background: "transparent", border: "none",
              borderBottom: tab === "details" ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
              color: tab === "details" ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
              padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Details
          </button>
          <button
            onClick={() => setTab("teams")}
            style={{
              background: "transparent", border: "none",
              borderBottom: tab === "teams" ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
              color: tab === "teams" ? "var(--cp-text-primary)" : "var(--cp-text-secondary)",
              padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Teams ({registeredTeams.length})
          </button>
        </div>

        {tab === "details" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ImageUploadField type="tournaments" value={logoUrl} onChange={setLogoUrl} shape="square" />
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)}required maxLength={15} style={inputStyle} /></Field>
            <Field label="Format">
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Overs / Innings"><input type="number" value={oversPerInnings} onChange={(e) => setOversPerInnings(parseInt(e.target.value, 10))} style={inputStyle} /></Field>
            <Field label="Start Date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} /></Field>
            <Field label="End Date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} /></Field>
            {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
            <button onClick={handleSave} disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Changes"}</button>
          </div>
        )}

        {tab === "teams" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="cp-text-secondary" style={{ fontSize: 12, margin: 0 }}>
              Teams registered here are used for the points table (NRR, wins/losses) and tournament fixtures.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                disabled={teamsLoading || availableTeams.length === 0}
              >
                <option value="">
                  {teamsLoading ? "Loading teams..." : availableTeams.length === 0 ? "All teams added" : "Select a team..."}
                </option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddTeam}
                disabled={!selectedTeamId || teamActionLoading}
                style={{ ...primaryButtonStyle, padding: "8px 14px" }}
              >
                Add
              </button>
            </div>

            {teamError && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{teamError}</p>}

            <div>
              {registeredTeams.length === 0 ? (
                <p className="cp-text-secondary" style={{ fontSize: 13 }}>No teams registered yet.</p>
              ) : (
                registeredTeams.map((t) => (
                  <div key={t.id} className="cp-team-chip">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: t.logoUrl ? `url(${t.logoUrl}) center/cover` : "var(--cp-bg)", flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveTeam(t.id)}
                      disabled={teamActionLoading}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--cp-danger)", display: "flex" }}
                      title="Remove from tournament"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = { UPCOMING: "var(--cp-text-secondary)", ONGOING: "var(--cp-accent-primary)", COMPLETED: "var(--cp-accent-secondary)" };
  return <span style={{ color: colorMap[status] ?? "var(--cp-text-secondary)", fontSize: 12.5, fontWeight: 600 }}>● {status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--cp-text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid var(--cp-surface-border)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };
const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "#0B0E11", fontSize: 13 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13.5 };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const pageButtonStyle: React.CSSProperties = { border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif", padding: 16 };
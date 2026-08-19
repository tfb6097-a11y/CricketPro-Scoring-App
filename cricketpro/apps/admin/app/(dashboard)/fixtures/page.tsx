"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  fetchFixtures, createFixture, updateFixture, deleteFixture,
  fetchTournaments, fetchTeams, fetchGrounds,
  AdminFixture, AdminTournament, AdminTeam, AdminGround,
  fetchScorerUsers, assignScorer, unassignScorer, AdminUser
} from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { SearchInput } from "../../../components/SearchInput";

const PAGE_SIZE = 6;

interface FixtureFormData {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  groundId: string;
  scheduledAt: string;
}

interface FixtureFilters {
  search: string;
  tournamentFilter: string;
  statusFilter: string;
  page: number;
}

const emptyFixtureForm: FixtureFormData = {
  tournamentId: "", teamAId: "", teamBId: "", groundId: "", scheduledAt: "",
};

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<AdminFixture[]>([]);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [scorers, setScorers] = useState<AdminUser[]>([]);
  const [grounds, setGrounds] = useState<AdminGround[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FixtureFilters>({
    search: "", tournamentFilter: "All Tournaments", statusFilter: "All Status", page: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FixtureFormData>(emptyFixtureForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingFixture, setEditingFixture] = useState<AdminFixture | null>(null);

  async function loadAll() {
    const s = await fetchScorerUsers();
    setScorers(s);
    setLoading(true);
    setError(null);
    try {
      const [f, t, tm, g] = await Promise.all([fetchFixtures(), fetchTournaments(), fetchTeams(), fetchGrounds()]);
      setFixtures(f); setTournaments(t); setTeams(tm); setGrounds(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createFixture(formData);
      setFormData((prev) => ({ ...prev, teamAId: "", teamBId: "", groundId: "", scheduledAt: "" }));
      setShowForm(false);
      loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create fixture");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fixture? This cannot be undone.")) return;
    try {
      await deleteFixture(id);
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete fixture");
    }
  }

  const filtered = fixtures.filter((f) => {
    const matchesSearch = f.teamA.name.toLowerCase().includes(filters.search.toLowerCase()) || f.teamB.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesTournament = filters.tournamentFilter === "All Tournaments" || f.tournament?.name === filters.tournamentFilter;
    const matchesStatus = filters.statusFilter === "All Status" || f.status === filters.statusFilter;
    return matchesSearch && matchesTournament && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (loading) return <p style={{ color: "#FFFFFF" }}>Loading fixtures...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 760px; }
        .cp-modal-card { width: min(380px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-filter-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .cp-filter-row > * { flex: 1; min-width: 160px; }

        /* Force search input + selects to look visually identical:
           same height, padding, border-radius, font, regardless of
           SearchInput's own internal styling. */
        .cp-filter-row,
        .cp-filter-row * {
          box-sizing: border-box;
        }
        .cp-filter-row > * {
          height: 42px;
        }
        .cp-filter-row select {
          height: 42px;
          background: #FFFFFF;
          color: #0B0E11;
          border: 1px solid var(--cp-surface-border);
          border-radius: var(--cp-radius-inner);
          padding: 0 12px;
          font-size: 13.5px;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230B0E11' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          cursor: pointer;
        }
        .cp-filter-row input[type="text"],
        .cp-filter-row input:not([type]) {
          height: 42px !important;
          border-radius: var(--cp-radius-inner) !important;
          font-size: 13.5px !important;
        }

        .cp-pagination-row { flex-wrap: wrap; gap: 10px; }

        @media (max-width: 640px) {
          .cp-filter-row > * { min-width: 100%; }
        }
      `}</style>

      <AdminPageHeader title="Fixtures" subtitle="Manage all match fixtures." actionLabel="Add Fixture" onAction={() => setShowForm((s) => !s)} />

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Tournament">
            <select value={formData.tournamentId} onChange={(e) => setFormData((p) => ({ ...p, tournamentId: e.target.value }))} required style={inputStyle}>
              <option value="">Select...</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Team A">
            <select value={formData.teamAId} onChange={(e) => setFormData((p) => ({ ...p, teamAId: e.target.value }))} required style={inputStyle}>
              <option value="">Select...</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Team B">
            <select value={formData.teamBId} onChange={(e) => setFormData((p) => ({ ...p, teamBId: e.target.value }))} required style={inputStyle}>
              <option value="">Select...</option>
              {teams.filter((t) => t.id !== formData.teamAId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Ground">
            <select value={formData.groundId} onChange={(e) => setFormData((p) => ({ ...p, groundId: e.target.value }))} required style={inputStyle}>
              <option value="">Select...</option>
              {grounds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Date & Time"><input type="datetime-local" value={formData.scheduledAt} onChange={(e) => setFormData((p) => ({ ...p, scheduledAt: e.target.value }))} required style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Match"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div className="cp-filter-row">
        <SearchInput value={filters.search} onChange={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))} placeholder="Search fixtures..." />
        <select value={filters.tournamentFilter} onChange={(e) => setFilters((p) => ({ ...p, tournamentFilter: e.target.value, page: 1 }))}>
          <option>All Tournaments</option>
          {tournaments.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select value={filters.statusFilter} onChange={(e) => setFilters((p) => ({ ...p, statusFilter: e.target.value, page: 1 }))}>
          <option>All Status</option>
          <option>LIVE</option>
          <option>UPCOMING</option>
          <option>COMPLETED</option>
        </select>
      </div>

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Match", "Tournament", "Date & Time", "Venue", "Assigned Scorer", "Status", "Actions"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((f) => (
                <tr key={f.id}>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{f.teamA.shortCode} vs {f.teamB.shortCode}</td>
                  <td style={cellStyle} className="cp-text-secondary">{f.tournament?.name ?? "—"}</td>
                  <td style={cellStyle} className="cp-text-secondary">{new Date(f.scheduledAt).toLocaleString()}</td>
                  <td style={cellStyle} className="cp-text-secondary">{f.ground.name}</td>
                  <td style={cellStyle}>
                    <select
                      value={f.assignedScorer?.id ?? ""}
                      onChange={async (e) => {
                        if (e.target.value) await assignScorer(f.id, e.target.value);
                        else await unassignScorer(f.id);
                        loadAll();
                      }}
                      style={inputStyle}
                    >
                      <option value="">Unassigned</option>
                      {scorers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td style={cellStyle}><StatusPill status={f.status} /></td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditingFixture(f)} style={iconButtonStyle} title="Edit" disabled={f.status !== "UPCOMING"}>
                        <Pencil size={14} color={f.status === "UPCOMING" ? "var(--cp-accent-secondary)" : "#FFFFFF"} />
                      </button>
                      <button onClick={() => handleDelete(f.id)} style={iconButtonStyle} title="Delete" disabled={f.status !== "UPCOMING"}>
                        <Trash2 size={14} color={f.status === "UPCOMING" ? "var(--cp-danger)" : "#FFFFFF"} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No fixtures found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-pagination-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
            Showing {paginated.length === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1} to {Math.min(filters.page * PAGE_SIZE, filtered.length)} of {filtered.length} fixtures
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} onClick={() => setFilters((p) => ({ ...p, page: n }))} style={{ ...pageButtonStyle, background: n === filters.page ? "var(--cp-accent-primary)" : "var(--cp-bg)", color: "#FFFFFF" }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {editingFixture && (
        <EditFixtureModal
          fixture={editingFixture}
          grounds={grounds}
          onClose={() => setEditingFixture(null)}
          onSaved={() => { setEditingFixture(null); loadAll(); }}
        />
      )}
    </div>
  );
}

function EditFixtureModal({ fixture, grounds, onClose, onSaved }: { fixture: AdminFixture; grounds: AdminGround[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ groundId: fixture.ground.id, scheduledAt: fixture.scheduledAt.slice(0, 16) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updateFixture(fixture.id, form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update fixture");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Fixture</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <p className="cp-text-secondary" style={{ fontSize: 13, marginTop: 0 }}>{fixture.teamA.name} vs {fixture.teamB.name}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Ground">
            <select value={form.groundId} onChange={(e) => setForm((p) => ({ ...p, groundId: e.target.value }))} style={inputStyle}>
              {grounds.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Date & Time"><input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} style={inputStyle} /></Field>
          {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          <button onClick={handleSave} disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = { LIVE: "var(--cp-danger)", UPCOMING: "#FFFFFF", COMPLETED: "var(--cp-accent-secondary)", ABANDONED: "#FFFFFF" };
  return <span style={{ color: colorMap[status] ?? "#FFFFFF", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase" }}>{status === "LIVE" && "● "}{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "#FFFFFF" }}>{label}</label>
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
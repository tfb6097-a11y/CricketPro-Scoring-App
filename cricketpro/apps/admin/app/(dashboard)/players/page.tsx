"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { fetchPlayers, createPlayer, updatePlayer, deactivatePlayer, reactivatePlayer, AdminPlayer } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { ImageUploadField } from "../../../components/ImageUploadField";
import { ImportPlayersModal } from "../../../components/ImportPlayersModal";
const ROLES = ["BATTER", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"];
const PAGE_SIZE = 10;

interface PlayerFormData {
  name: string;
  country: string;
  role: string;
  photoUrl: string | null;
}

const emptyPlayerForm: PlayerFormData = { name: "", country: "", role: "BATTER", photoUrl: null };

export default function PlayersPage() {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "", roleFilter: "All Roles", statusFilter: "All Status", countryFilter: "All Countries", page: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PlayerFormData>(emptyPlayerForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<AdminPlayer | null>(null);

  async function loadPlayers() {
    setLoading(true);
    setError(null);
    try {
      setPlayers(await fetchPlayers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load players");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPlayers(); }, []);

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this player?")) return;
    await deactivatePlayer(id);
    loadPlayers();
  }

  async function handleReactivate(id: string) {
    await reactivatePlayer(id);
    loadPlayers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createPlayer({
        name: formData.name,
        country: formData.country || undefined,
        role: formData.role,
        photoUrl: formData.photoUrl || undefined,
      });
      setFormData(emptyPlayerForm);
      setShowForm(false);
      loadPlayers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create player");
    } finally {
      setSubmitting(false);
    }
  }

  const countryOptions = Array.from(
    new Set(players.map((p) => p.country).filter((c): c is string => !!c && c.trim().length > 0))
  ).sort((a, b) => a.localeCompare(b));

  const filtered = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRole = filters.roleFilter === "All Roles" || p.role === filters.roleFilter;
    const matchesStatus = filters.statusFilter === "All Status" || (filters.statusFilter === "Active" ? p.isActive : !p.isActive);
    const matchesCountry = filters.countryFilter === "All Countries" || p.country === filters.countryFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesCountry;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (loading) return <p style={{ color: "#FFFFFF" }}>Loading players...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .cp-filter-bar input, .cp-filter-bar select { flex: 1; min-width: 140px; }
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 680px; }
        .cp-modal-card { width: min(380px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-pagination-row { flex-wrap: wrap; gap: 10px; }
        @media (max-width: 480px) {
          .cp-pagination-row { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      <AdminPageHeader title="Players" subtitle="Manage all players in the system." actionLabel="Add Player" onAction={() => setShowForm((s) => !s)} />
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowImport(true)} style={secondaryButtonStyle}>
          📥 Import Players (Excel)
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="players" value={formData.photoUrl} onChange={(v) => setFormData((p) => ({ ...p, photoUrl: v }))} />
          <Field label="Name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required maxLength={15} style={inputStyle} /></Field>
          <Field label="Country"><input value={formData.country} onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))} required maxLength={15} style={inputStyle} /></Field>
          <Field label="Role">
            <select value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} style={inputStyle}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Player"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div className="cp-filter-bar">
        <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))} placeholder="Search players..." style={{ ...inputStyle, maxWidth: 260 }} />
        <select value={filters.countryFilter} onChange={(e) => setFilters((p) => ({ ...p, countryFilter: e.target.value, page: 1 }))} style={inputStyle}>
          <option>All Countries</option>
          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.roleFilter} onChange={(e) => setFilters((p) => ({ ...p, roleFilter: e.target.value, page: 1 }))} style={inputStyle}>
          <option>All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <select value={filters.statusFilter} onChange={(e) => setFilters((p) => ({ ...p, statusFilter: e.target.value, page: 1 }))} style={inputStyle}>
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Player", "Country", "Role", "Status", "Actions"].map((h) => <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...avatarStyle, background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : "var(--cp-bg)" }}>
                        {!p.photoUrl && p.name[0]?.toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{p.name}</p>
                    </div>
                  </td>
                  <td style={cellStyle} className="cp-text-secondary">{p.country ?? "—"}</td>
                  <td style={cellStyle}><RoleBadge role={p.role} /></td>
                  <td style={cellStyle}>
                    <span style={{ color: p.isActive ? "var(--cp-accent-primary)" : "var(--cp-danger)", fontSize: 12.5, fontWeight: 600 }}>
                      ● {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditingPlayer(p)} style={iconButtonStyle} title="Edit">
                        <Pencil size={14} color="var(--cp-accent-secondary)" />
                      </button>
                      {p.isActive ? (
                        <button onClick={() => handleDeactivate(p.id)} style={iconButtonStyle} title="Deactivate">
                          <Trash2 size={14} color="var(--cp-danger)" />
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(p.id)} style={iconButtonStyle} title="Activate">
                          <RotateCcw size={14} color="var(--cp-accent-primary)" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No players found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-pagination-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
            Showing {paginated.length === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1} to {Math.min(filters.page * PAGE_SIZE, filtered.length)} of {filtered.length} players
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={filters.page === 1}
              style={{ ...pageButtonStyle, opacity: filters.page === 1 ? 0.4 : 1, cursor: filters.page === 1 ? "not-allowed" : "pointer" }}
            >
              ‹ Prev
            </button>

            {getPageWindow(filters.page, totalPages).map((n) => (
              <button
                key={n}
                onClick={() => setFilters((p) => ({ ...p, page: n }))}
                style={pageButtonStyle}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
              disabled={filters.page === totalPages}
              style={{ ...pageButtonStyle, opacity: filters.page === totalPages ? 0.4 : 1, cursor: filters.page === totalPages ? "not-allowed" : "pointer" }}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSaved={() => { setEditingPlayer(null); loadPlayers(); }}
        />
      )}

      {showImport && (
        <ImportPlayersModal
          onClose={() => setShowImport(false)}
          onImported={loadPlayers}
        />
      )}
    </div>
  );
}

function EditPlayerModal({ player, onClose, onSaved }: { player: AdminPlayer; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<PlayerFormData>({
    name: player.name,
    country: player.country ?? "",
    role: player.role,
    photoUrl: player.photoUrl,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updatePlayer(player.id, {
        name: form.name,
        country: form.country || undefined,
        role: form.role,
        photoUrl: form.photoUrl || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update player");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Player</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ImageUploadField type="players" value={form.photoUrl} onChange={(v) => setForm((p) => ({ ...p, photoUrl: v }))} />
          <Field label="Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={15} style={inputStyle} /></Field>
          <Field label="Country"><input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} required maxLength={20} style={inputStyle} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} style={inputStyle}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </Field>

          {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}

          <button onClick={handleSave} disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    BATTER: "var(--cp-accent-primary)",
    BOWLER: "var(--cp-accent-secondary)",
    ALL_ROUNDER: "#c084fc",
    WICKET_KEEPER: "#FFFFFF",
  };
  return <span style={{ color: colorMap[role] ?? "#FFFFFF", fontSize: 12.5, fontWeight: 600 }}>{role.replace("_", " ")}</span>;
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
const avatarStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, color: "#FFFFFF" };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const pageButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", border: "1px solid var(--cp-accent-primary)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer", color: "#000000", fontWeight: 600 };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif", padding: 16 };
const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: "var(--cp-radius-inner)",
  padding: "8px 14px",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: 13.5,
};
function getPageWindow(current: number, total: number): number[] {
  const windowSize = 5;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import {
  fetchTeams, createTeam, updateTeam, deactivateTeam, reactivateTeam, addPlayerToTeam, removePlayerFromTeam, setPlayerRole,
  fetchPlayers, fetchTeamSquad,
  AdminTeam, AdminPlayer,
} from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { SearchInput } from "../../../components/SearchInput";
import { ImageUploadField } from "../../../components/ImageUploadField";

const PAGE_SIZE = 10;

interface TeamFormData {
  name: string;
  shortCode: string;
  coach: string;
  logoUrl: string | null;
}

const emptyTeamForm: TeamFormData = { name: "", shortCode: "", coach: "", logoUrl: null };

export default function TeamsPage() {
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ search: "", page: 1, showInactive: false });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<TeamFormData>(emptyTeamForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const editingTeam = teams.find((t) => t.id === editingTeamId) ?? null;

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, playersData] = await Promise.all([fetchTeams(true), fetchPlayers()]);
      setTeams(teamsData);
      setPlayers(playersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function patchTeam(updated: AdminTeam) {
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDeleteTeam(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the active list until reactivated.`)) return;
    try {
      const updated = await deactivateTeam(id);
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate team");
    }
  }

  async function handleReactivateTeam(id: string) {
    try {
      const updated = await reactivateTeam(id);
      setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reactivate team");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createTeam({ name: formData.name, shortCode: formData.shortCode.toUpperCase(), coach: formData.coach || undefined, logoUrl: formData.logoUrl || undefined });
      setFormData(emptyTeamForm);
      setShowForm(false);
      loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  }

  function getCaptainName(team: AdminTeam) {
    const captainEntry = team.players.find((tp) => tp.isCaptain);
    return captainEntry ? captainEntry.player.name : "—";
  }

  const filtered = teams
    .filter((t) => filters.showInactive || t.isActive)
    .filter((t) => t.name.toLowerCase().includes(filters.search.toLowerCase()) || t.shortCode.toLowerCase().includes(filters.search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (loading) return <p style={{ color: "#FFFFFF" }}>Loading teams...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 680px; }
        .cp-modal-card { width: min(380px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-modal-card-lg { width: min(460px, 92vw) !important; }
        .cp-filter-row { flex-wrap: wrap; gap: 10px; }
        .cp-pagination-row { flex-wrap: wrap; gap: 10px; }
        @media (max-width: 480px) {
          .cp-pagination-row { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      <AdminPageHeader title="Teams" subtitle="Manage all teams and their details." actionLabel="Add Team" onAction={() => setShowForm((s) => !s)} />

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="teams" value={formData.logoUrl} onChange={(v) => setFormData((p) => ({ ...p, logoUrl: v }))} shape="square" />
          <Field label="Team Name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required style={inputStyle} /></Field>
          <Field label="Short Code"><input value={formData.shortCode} onChange={(e) => setFormData((p) => ({ ...p, shortCode: e.target.value }))} required maxLength={5} style={inputStyle} /></Field>
          <Field label="Coach"><input value={formData.coach} onChange={(e) => setFormData((p) => ({ ...p, coach: e.target.value }))} style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Team"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div className="cp-filter-row" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <div style={{ maxWidth: 260, flex: 1, minWidth: 200 }}>
          <SearchInput value={filters.search} onChange={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))} placeholder="Search teams..." />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#FFFFFF", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={filters.showInactive}
            onChange={(e) => setFilters((p) => ({ ...p, showInactive: e.target.checked, page: 1 }))}
          />
          Show Inactive Teams
        </label>
      </div>

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Team", "Coach", "Captain", "Short Name", "Status", "Actions"].map((h) => <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginated.map((team) => (
                <tr key={team.id}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...logoStyle, background: team.logoUrl ? `url(${team.logoUrl}) center/cover` : "var(--cp-bg)" }}>
                        {!team.logoUrl && team.shortCode[0]?.toUpperCase()}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{team.name}</p>
                    </div>
                  </td>
                  <td style={cellStyle} className="cp-text-secondary">{team.coach ?? "—"}</td>
                  <td style={cellStyle} className="cp-text-secondary">{getCaptainName(team)}</td>
                  <td style={cellStyle}>
                    <span style={shortCodeBadge}>{team.shortCode}</span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: team.isActive ? "var(--cp-accent-primary)" : "var(--cp-danger)", fontSize: 12.5, fontWeight: 600 }}>
                      ● {team.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditingTeamId(team.id)} style={iconButtonStyle} title="Edit / Manage Squad">
                        <Pencil size={14} color="var(--cp-accent-secondary)" />
                      </button>
                      {team.isActive ? (
                        <button onClick={() => handleDeleteTeam(team.id, team.name)} style={iconButtonStyle} title="Deactivate">
                          <Trash2 size={14} color="var(--cp-danger)" />
                        </button>
                      ) : (
                        <button onClick={() => handleReactivateTeam(team.id)} style={iconButtonStyle} title="Activate">
                          <RotateCcw size={14} color="var(--cp-accent-primary)" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={6} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No teams found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-pagination-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
            Showing {paginated.length === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1} to {Math.min(filters.page * PAGE_SIZE, filtered.length)} of {filtered.length} teams
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} onClick={() => setFilters((p) => ({ ...p, page: n }))} style={{ ...pageButtonStyle, background: n === filters.page ? "var(--cp-accent-primary)" : "var(--cp-bg)", color: "#FFFFFF" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {editingTeam && (
        <EditTeamModal
          key={editingTeam.id}
          team={editingTeam}
          allPlayers={players}
          onClose={() => setEditingTeamId(null)}
          onTeamPatched={patchTeam}
        />
      )}
    </div>
  );
}

function EditTeamModal({
  team, allPlayers, onClose, onTeamPatched,
}: {
  team: AdminTeam;
  allPlayers: AdminPlayer[];
  onClose: () => void;
  onTeamPatched: (updated: AdminTeam) => void;
}) {
  const [localTeam, setLocalTeam] = useState<AdminTeam>(team);

  const [detailsForm, setDetailsForm] = useState<TeamFormData>({
    name: team.name, shortCode: team.shortCode, coach: team.coach ?? "", logoUrl: team.logoUrl,
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const [addPlayerForm, setAddPlayerForm] = useState({ selectedPlayerId: "", addAsCaptain: false, addAsKeeper: false });
  const [busy, setBusy] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);

  const squadPlayerIds = new Set(localTeam.players.map((tp) => tp.player.id));
  const availablePlayers = allPlayers.filter((p) => p.isActive && !squadPlayerIds.has(p.id));

  async function refreshSquad() {
    const fresh = await fetchTeamSquad(localTeam.id);
    setLocalTeam(fresh);
    onTeamPatched(fresh);
  }

  async function handleSaveDetails() {
    setDetailsError(null);
    setSavedMsg(false);
    setSavingDetails(true);
    try {
      const updated = await updateTeam(localTeam.id, {
        name: detailsForm.name, shortCode: detailsForm.shortCode.toUpperCase(), coach: detailsForm.coach || undefined, logoUrl: detailsForm.logoUrl || undefined,
      });
      const merged: AdminTeam = { ...localTeam, ...updated };
      setLocalTeam(merged);
      onTeamPatched(merged);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleAddPlayer() {
    if (!addPlayerForm.selectedPlayerId) return;
    setSquadError(null);
    setBusy(true);
    try {
      await addPlayerToTeam(localTeam.id, addPlayerForm.selectedPlayerId, addPlayerForm.addAsCaptain, addPlayerForm.addAsKeeper);
      setAddPlayerForm({ selectedPlayerId: "", addAsCaptain: false, addAsKeeper: false });
      await refreshSquad();
    } catch (err) {
      setSquadError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!confirm("Remove this player from the squad?")) return;
    setSquadError(null);
    setBusy(true);
    try {
      await removePlayerFromTeam(localTeam.id, playerId);
      await refreshSquad();
    } catch (err) {
      setSquadError(err instanceof Error ? err.message : "Failed to remove player");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCaptain(playerId: string, current: boolean) {
    setSquadError(null);
    setBusy(true);
    try {
      await setPlayerRole(localTeam.id, playerId, { isCaptain: !current });
      await refreshSquad();
    } catch (err) {
      setSquadError(err instanceof Error ? err.message : "Failed to update captain");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleKeeper(playerId: string, current: boolean) {
    setSquadError(null);
    setBusy(true);
    try {
      await setPlayerRole(localTeam.id, playerId, { isKeeper: !current });
      await refreshSquad();
    } catch (err) {
      setSquadError(err instanceof Error ? err.message : "Failed to update keeper");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card-lg" style={{ width: 460, maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Team</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--cp-surface-border)" }}>
          <ImageUploadField type="teams" value={detailsForm.logoUrl} onChange={(v) => setDetailsForm((p) => ({ ...p, logoUrl: v }))} shape="square" />
          <Field label="Team Name"><input value={detailsForm.name} onChange={(e) => setDetailsForm((p) => ({ ...p, name: e.target.value }))} required maxLength={20} style={inputStyle} /></Field>
          <Field label="Short Code"><input value={detailsForm.shortCode} onChange={(e) => setDetailsForm((p) => ({ ...p, shortCode: e.target.value }))} maxLength={5} style={inputStyle} /></Field>
          <Field label="Coach"><input value={detailsForm.coach} onChange={(e) => setDetailsForm((p) => ({ ...p, coach: e.target.value }))} required maxLength={20} style={inputStyle} /></Field>

          {detailsError && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{detailsError}</p>}
          {savedMsg && <p style={{ color: "var(--cp-accent-primary)", fontSize: 13, margin: 0 }}>Saved ✓</p>}

          <button type="button" onClick={handleSaveDetails} disabled={savingDetails} style={primaryButtonStyle}>
            {savingDetails ? "Saving..." : "Save Team Details"}
          </button>
        </div>

        <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Squad</h4>
        {squadError && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginBottom: 8 }}>{squadError}</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12, minWidth: 380 }}>
            <thead>
              <tr>{["Name", "Role", "Captain", "Keeper", ""].map((h) => <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {localTeam.players.map((tp) => (
                <tr key={tp.id}>
                  <td style={cellStyle}>{tp.player.name}</td>
                  <td style={cellStyle}>{tp.player.role.replace("_", " ")}</td>
                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => handleToggleCaptain(tp.player.id, tp.isCaptain)}
                      disabled={busy}
                      style={{ ...toggleButtonStyle, color: tp.isCaptain ? "var(--cp-accent-primary)" : "#FFFFFF" }}
                      title={tp.isCaptain ? "Remove as captain" : "Set as captain"}
                    >
                      {tp.isCaptain ? "✓" : "—"}
                    </button>
                  </td>
                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => handleToggleKeeper(tp.player.id, tp.isKeeper)}
                      disabled={busy}
                      style={{ ...toggleButtonStyle, color: tp.isKeeper ? "var(--cp-accent-primary)" : "#FFFFFF" }}
                      title={tp.isKeeper ? "Remove as keeper" : "Set as keeper"}
                    >
                      {tp.isKeeper ? "✓" : "—"}
                    </button>
                  </td>
                  <td style={cellStyle}>
                    <button type="button" onClick={() => handleRemovePlayer(tp.player.id)} disabled={busy} style={iconButtonStyle} title="Remove">
                      <Trash2 size={14} color="var(--cp-danger)" />
                    </button>
                  </td>
                </tr>
              ))}
              {localTeam.players.length === 0 && (
                <tr><td colSpan={5} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No players in squad yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select value={addPlayerForm.selectedPlayerId} onChange={(e) => setAddPlayerForm((p) => ({ ...p, selectedPlayerId: e.target.value }))} style={inputStyle}>
            <option value="">Select a player to add...</option>
            {availablePlayers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role.replace("_", " ")})</option>)}
          </select>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#FFFFFF", cursor: "pointer" }}>
              <input type="checkbox" checked={addPlayerForm.addAsCaptain} onChange={(e) => setAddPlayerForm((p) => ({ ...p, addAsCaptain: e.target.checked }))} />
              Captain
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#FFFFFF", cursor: "pointer" }}>
              <input type="checkbox" checked={addPlayerForm.addAsKeeper} onChange={(e) => setAddPlayerForm((p) => ({ ...p, addAsKeeper: e.target.checked }))} />
              Keeper
            </label>
            <button type="button" onClick={handleAddPlayer} disabled={busy || !addPlayerForm.selectedPlayerId} style={{ ...primaryButtonStyle, marginLeft: "auto" }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
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
const logoStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, color: "#FFFFFF" };
const shortCodeBadge: React.CSSProperties = { background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#FFFFFF", fontWeight: 600 };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const pageButtonStyle: React.CSSProperties = { border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif", padding: 16 };
const toggleButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "2px 6px" };
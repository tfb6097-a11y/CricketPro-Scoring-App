"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { fetchGrounds, createGround, updateGround, deleteGround, AdminGround } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { SearchInput } from "../../../components/SearchInput";
import { ImageUploadField } from "../../../components/ImageUploadField";

const PAGE_SIZE = 6;

interface GroundFormData {
  name: string;
  city: string;
  capacity: string;
  photoUrl: string | null;
}

const emptyGroundForm: GroundFormData = { name: "", city: "", capacity: "", photoUrl: null };

export default function GroundsPage() {
  const [grounds, setGrounds] = useState<AdminGround[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ search: "", page: 1 });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<GroundFormData>(emptyGroundForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingGround, setEditingGround] = useState<AdminGround | null>(null);

  async function loadGrounds() {
    setLoading(true);
    setError(null);
    try {
      setGrounds(await fetchGrounds());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grounds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGrounds(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createGround({
        name: formData.name,
        city: formData.city,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
        photoUrl: formData.photoUrl || undefined,
      });
      setFormData(emptyGroundForm);
      setShowForm(false);
      loadGrounds();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create ground");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ground? This cannot be undone.")) return;
    try {
      await deleteGround(id);
      loadGrounds();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete ground");
    }
  }

  const filtered = grounds.filter(
    (g) => g.name.toLowerCase().includes(filters.search.toLowerCase()) || g.city.toLowerCase().includes(filters.search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (loading) return <p style={{ color: "#FFFFFF" }}>Loading grounds...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 560px; }
        .cp-modal-card { width: min(380px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-pagination-row { flex-wrap: wrap; gap: 10px; }
        @media (max-width: 480px) {
          .cp-pagination-row { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      <AdminPageHeader title="Grounds" subtitle="Manage all cricket grounds." actionLabel="Add Ground" onAction={() => setShowForm((s) => !s)} />

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="grounds" value={formData.photoUrl} onChange={(v) => setFormData((p) => ({ ...p, photoUrl: v }))} shape="square" />
          <Field label="Ground Name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required maxLength={25} style={inputStyle} /></Field>
          <Field label="City"><input value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} required maxLength={25} style={inputStyle} /></Field>
          <Field label="Capacity"><input type="number" value={formData.capacity} onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))} style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Ground"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div style={{ marginBottom: 16, maxWidth: 260 }}>
        <SearchInput value={filters.search} onChange={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))} placeholder="Search grounds..." />
      </div>

      <div className="cp-card">
        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Ground", "City", "Capacity", "Status", "Actions"].map((h) => <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginated.map((g) => (
                <tr key={g.id}>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...thumbStyle, background: g.photoUrl ? `url(${g.photoUrl}) center/cover` : "var(--cp-bg)" }}>
                        {!g.photoUrl && "🏟"}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>{g.name}</p>
                    </div>
                  </td>
                  <td style={cellStyle} className="cp-text-secondary">{g.city}</td>
                  <td style={cellStyle} className="cp-stat-number">{g.capacity?.toLocaleString() ?? "—"}</td>
                  <td style={cellStyle}>
                    <span style={{ color: "var(--cp-accent-primary)", fontSize: 12.5, fontWeight: 600 }}>● Active</span>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setEditingGround(g)} style={iconButtonStyle} title="Edit">
                        <Pencil size={14} color="var(--cp-accent-secondary)" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} style={iconButtonStyle} title="Delete">
                        <Trash2 size={14} color="var(--cp-danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="cp-text-secondary" style={{ ...cellStyle, textAlign: "center" }}>No grounds found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-pagination-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <span className="cp-text-secondary" style={{ fontSize: 12.5 }}>
            Showing {paginated.length === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1} to {Math.min(filters.page * PAGE_SIZE, filtered.length)} of {filtered.length} grounds
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

      {editingGround && (
        <EditGroundModal
          ground={editingGround}
          onClose={() => setEditingGround(null)}
          onSaved={() => { setEditingGround(null); loadGrounds(); }}
        />
      )}
    </div>
  );
}

function EditGroundModal({ ground, onClose, onSaved }: { ground: AdminGround; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<GroundFormData>({
    name: ground.name,
    city: ground.city,
    capacity: ground.capacity?.toString() ?? "",
    photoUrl: ground.photoUrl,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updateGround(ground.id, {
        name: form.name,
        city: form.city,
        capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
        photoUrl: form.photoUrl || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ground");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Ground</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ImageUploadField type="grounds" value={form.photoUrl} onChange={(v) => setForm((p) => ({ ...p, photoUrl: v }))} shape="square" />
          <Field label="Ground Name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} maxLength={25} style={inputStyle} /></Field>
          <Field label="City"><input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} maxLength={25} style={inputStyle} /></Field>
          <Field label="Capacity"><input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} style={inputStyle} /></Field>

          {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}

          <button onClick={handleSave} disabled={submitting} style={primaryButtonStyle}>
            {submitting ? "Saving..." : "Save Changes"}
          </button>
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
const thumbStyle: React.CSSProperties = { width: 44, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const pageButtonStyle: React.CSSProperties = { border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif", padding: 16 };
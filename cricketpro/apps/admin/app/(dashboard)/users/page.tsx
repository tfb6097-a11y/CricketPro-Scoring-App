"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { fetchUsers, updateUser, deactivateUser, createUser, AdminUser } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { ImageUploadField } from "../../../components/ImageUploadField";

const PAGE_SIZE = 7;

interface UserFormData {
  name: string;
  email: string;
  password: string;
  avatarUrl: string | null;
}

const emptyUserForm: UserFormData = { name: "", email: "", password: "", avatarUrl: null };

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "", roleFilter: "All Roles", statusFilter: "All Status", page: 1,
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this user? This cannot be undone from here.")) return;
    await deactivateUser(id);
    loadUsers();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createUser({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: "SCORER",
        avatarUrl: formData.avatarUrl || undefined,
      });
      setFormData(emptyUserForm);
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(filters.search.toLowerCase()) || u.email.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRole = filters.roleFilter === "All Roles" || u.role === filters.roleFilter;
    const matchesStatus = filters.statusFilter === "All Status" || (filters.statusFilter === "Active" ? u.isActive : !u.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE);

  if (loading) return <p style={{ color: "var(--cp-text-primary)" }}>Loading users...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .cp-filter-bar input, .cp-filter-bar select { flex: 1; min-width: 140px; }
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 640px; }
        .cp-modal-card { width: min(380px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        @media (max-width: 480px) {
          .cp-pagination-row { flex-direction: column; align-items: flex-start !important; gap: 10px; }
        }
      `}</style>

      <AdminPageHeader title="Users" subtitle="Manage scorer accounts. Admin accounts are managed on the Super Admin page." actionLabel="Add Scorer" onAction={() => setShowForm((s) => !s)} />

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="users" value={formData.avatarUrl} onChange={(v) => setFormData((p) => ({ ...p, avatarUrl: v }))} />
          <Field label="Name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required maxLength={15} style={inputStyle} /></Field>
          <Field label="Email"><input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required maxLength={25} style={inputStyle} /></Field>
          <Field label="Password"><input type="password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required minLength={8} maxLength={20} style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Creating..." : "Create Scorer"}</button>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div className="cp-filter-bar">
        <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))} placeholder="Search users..." style={{ ...inputStyle, maxWidth: 260 }} required maxLength={15} />
        <select value={filters.roleFilter} onChange={(e) => setFilters((p) => ({ ...p, roleFilter: e.target.value, page: 1 }))} style={inputStyle}>
          <option>All Roles</option>
          <option>SUPER_ADMIN</option>
          <option>ADMIN</option>
          <option>SCORER</option>
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
              <tr>{["User", "Role", "Status", "Joined On", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginated.map((user) => {
                const canManage = user.role === "SCORER";
                return (
                  <tr key={user.id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ ...avatarStyle, background: user.avatarUrl ? `url(${user.avatarUrl}) center/cover` : "var(--cp-bg)" }}>
                          {!user.avatarUrl && user.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: "var(--cp-text-primary)" }}>{user.name}</p>
                          <p style={{ margin: 0, fontSize: 12, color: "var(--cp-text-primary)" }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}><RoleBadge role={user.role} /></td>
                    <td style={cellStyle}>
                      <span style={{ color: user.isActive ? "var(--cp-accent-primary)" : "var(--cp-danger)", fontSize: 12.5, fontWeight: 600 }}>
                        ● {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, color: "var(--cp-text-primary)" }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td style={cellStyle}>
                      {canManage ? (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setEditingUser(user)} style={iconButtonStyle} title="Edit">
                            <Pencil size={14} color="var(--cp-accent-secondary)" />
                          </button>
                          {user.isActive && (
                            <button onClick={() => handleDeactivate(user.id)} style={iconButtonStyle} title="Deactivate">
                              <Trash2 size={14} color="var(--cp-danger)" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--cp-text-primary)" }}>— Locked —</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={5} style={{ ...cellStyle, textAlign: "center", color: "var(--cp-text-primary)" }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="cp-pagination-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--cp-text-primary)" }}>
            Showing {paginated.length === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1} to {Math.min(filters.page * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button key={p} onClick={() => setFilters((prev) => ({ ...prev, page: p }))} style={{ ...pageButtonStyle, background: p === filters.page ? "var(--cp-accent-primary)" : "var(--cp-bg)", color: p === filters.page ? "#FFFFFF" : "var(--cp-text-primary)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers(); }}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await updateUser(user.id, {
        name,
        email,
        password: password || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card cp-modal-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "var(--cp-text-primary)" }}>Edit User</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cp-text-primary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ImageUploadField type="users" value={avatarUrl} onChange={setAvatarUrl} />
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} style={inputStyle} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={20} style={inputStyle} /></Field>
          <Field label="New Password (leave blank to keep current)">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={20} style={inputStyle} placeholder="••••••••" />
          </Field>
          <Field label="Role">
            <input value={user.role} disabled style={{ ...inputStyle, opacity: 0.6 }} />
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
    SUPER_ADMIN: "#f5a524",
    ADMIN: "var(--cp-accent-primary)",
    SCORER: "var(--cp-accent-secondary)",
    VIEWER: "var(--cp-text-primary)",
  };
  return <span style={{ color: colorMap[role] ?? "var(--cp-text-primary)", fontSize: 12.5, fontWeight: 600 }}>{role}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--cp-text-primary)" }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };
const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "#0B0E11", fontSize: 13 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13.5 };
const avatarStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, color: "var(--cp-text-primary)" };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const pageButtonStyle: React.CSSProperties = { border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "4px 9px", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif", padding: 16 };
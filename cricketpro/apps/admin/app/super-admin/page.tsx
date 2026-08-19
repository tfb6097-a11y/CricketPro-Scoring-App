"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import { fetchUsers, createUser, updateUser, deactivateUser, AdminUser } from "../../lib/api-client";
import { AdminPageHeader } from "../../components/layout/AdminPageHeader";
import { ImageUploadField } from "../../components/ImageUploadField";

interface AdminFormData {
  name: string;
  email: string;
  password: string;
  avatarUrl: string | null;
}

const emptyForm: AdminFormData = { name: "", email: "", password: "", avatarUrl: null };

export default function SuperAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>(emptyForm);
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

  const admins = users.filter((u) => u.role === "ADMIN");
  const scorers = users.filter((u) => u.role === "SCORER");
  const activeAdmins = admins.filter((a) => a.isActive).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createUser({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: "ADMIN",
        avatarUrl: formData.avatarUrl || undefined,
      });
      setFormData(emptyForm);
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this admin account?")) return;
    await deactivateUser(id);
    loadUsers();
  }

  if (loading) return <p style={{ color: "var(--cp-text-primary)" }}>Loading...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <AdminPageHeader
        title="Super Admin"
        subtitle="Create and manage administrator accounts across CrickPro."
        actionLabel="Add Admin"
        onAction={() => setShowForm((s) => !s)}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Admins" value={admins.length} accent="#f5a524" />
        <StatCard label="Active Admins" value={activeAdmins} accent="var(--cp-accent-primary)" />
        <StatCard label="Total Scorers" value={scorers.length} accent="var(--cp-accent-secondary)" />
        <StatCard label="Total Users" value={users.length} accent="var(--cp-text-primary)" />
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="cp-card" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <ImageUploadField type="users" value={formData.avatarUrl} onChange={(v) => setFormData((p) => ({ ...p, avatarUrl: v }))} />
          <Field label="Name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required maxLength={20} style={inputStyle} /></Field>
          <Field label="Email"><input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} required maxLength={25} style={inputStyle} /></Field>
          <Field label="Password"><input type="password" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} required minLength={8} maxLength={20} style={inputStyle} /></Field>
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>{submitting ? "Creating..." : "Create Admin"}</button>
          <p style={{ fontSize: 11.5, width: "100%", margin: 0, color: "var(--cp-text-primary)" }}>
            Accounts created here are always Admins. Scorer accounts are managed on the Users page.
          </p>
          {formError && <p style={{ color: "var(--cp-danger)", fontSize: 13, width: "100%" }}>{formError}</p>}
        </form>
      )}

      <div className="cp-card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ShieldCheck size={16} color="#f5a524" />
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--cp-text-primary)" }}>Admin Accounts</h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Admin", "Status", "Joined On", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td style={cellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...avatarStyle, background: admin.avatarUrl ? `url(${admin.avatarUrl}) center/cover` : "var(--cp-bg)" }}>
                      {!admin.avatarUrl && admin.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: "var(--cp-text-primary)" }}>{admin.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--cp-text-primary)" }}>{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td style={cellStyle}>
                  <span style={{ color: admin.isActive ? "var(--cp-accent-primary)" : "var(--cp-danger)", fontSize: 12.5, fontWeight: 600 }}>
                    ● {admin.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ ...cellStyle, color: "var(--cp-text-primary)" }}>{new Date(admin.createdAt).toLocaleDateString()}</td>
                <td style={cellStyle}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setEditingUser(admin)} style={iconButtonStyle} title="Edit"><Pencil size={14} color="var(--cp-accent-secondary)" /></button>
                    {admin.isActive && (
                      <button onClick={() => handleDeactivate(admin.id)} style={iconButtonStyle} title="Deactivate"><Trash2 size={14} color="var(--cp-danger)" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr><td colSpan={4} style={{ ...cellStyle, textAlign: "center", color: "var(--cp-text-primary)" }}>No admin accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditAdminModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers(); }}
        />
      )}
    </div>
  );
}

// Super Admin editing an Admin: name, email, password (optional — leave
// blank to keep unchanged), and avatar. The Admin themselves never has
// access to this — only reachable from this Super Admin page.
function EditAdminModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
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
      setError(err instanceof Error ? err.message : "Failed to update admin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 380 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "var(--cp-text-primary)" }}>Edit Admin</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cp-text-primary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ImageUploadField type="users" value={avatarUrl} onChange={setAvatarUrl} />
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} style={inputStyle} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={20} style={inputStyle} /></Field>
          <Field label="New Password (leave blank to keep current)">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={20} style={inputStyle} placeholder="••••••••" />
          </Field>
          {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          <button onClick={handleSave} disabled={submitting} style={primaryButtonStyle}>{submitting ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 6px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--cp-text-primary)" }}>{label}</p>
      <p className="cp-stat-number" style={{ margin: 0, fontSize: 26, fontWeight: 800, color: accent }}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, color: "var(--cp-text-primary)" }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "10px 14px", borderBottom: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)" };
const cellStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13.5 };
const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "#0B0E11", fontSize: 13 };
const primaryButtonStyle: React.CSSProperties = { background: "#f5a524", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13.5 };
const avatarStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, color: "var(--cp-text-primary)" };
const iconButtonStyle: React.CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 2 };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, fontFamily: "Inter, system-ui, sans-serif" };
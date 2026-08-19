"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  fetchNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  type AdminNotification,
} from "../../../lib/api-client";

type NotificationType = AdminNotification["type"];
type NotifStatus = AdminNotification["status"];
type NotificationAudience = "ALL_USERS" | "SCORERS" | "VIEWERS" | "ADMINS";

const PAGE_SIZE = 5;
const TYPES: NotificationType[] = ["MATCH", "SYSTEM", "TOURNAMENT", "ANNOUNCEMENT"];
const AUDIENCES: NotificationAudience[] = ["ALL_USERS", "SCORERS", "VIEWERS", "ADMINS"];

const TYPE_LABELS: Record<NotificationType, string> = {
  MATCH: "Match",
  SYSTEM: "System",
  TOURNAMENT: "Tournament",
  ANNOUNCEMENT: "Announcement",
};

const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  ALL_USERS: "All Users",
  SCORERS: "Scorers",
  VIEWERS: "Viewers",
  ADMINS: "Admins",
};

function statusTone(status: NotifStatus): "success" | "info" | "danger" {
  if (status === "SENT") return "success";
  if (status === "SCHEDULED") return "info";
  return "danger";
}

function formatSentOn(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface NotificationFormData {
  title: string;
  type: NotificationType;
  audience: NotificationAudience;
}

const emptyNotificationForm: NotificationFormData = { title: "", type: "MATCH", audience: "ALL_USERS" };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ search: "", page: 1 });

  const [modal, setModal] = useState<{ open: boolean; editingId: string | null }>({ open: false, editingId: null });
  const [deleteTarget, setDeleteTarget] = useState<AdminNotification | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<NotificationFormData>(emptyNotificationForm);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications({
        page: filters.page,
        pageSize: PAGE_SIZE,
        search: filters.search.trim() || undefined,
      });
      setNotifications(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [filters.page, filters.search]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredCountLabel = useMemo(() => {
    if (total === 0) return "Showing 0 notifications";
    const from = (filters.page - 1) * PAGE_SIZE + 1;
    const to = Math.min(filters.page * PAGE_SIZE, total);
    return `Showing ${from} to ${to} of ${total} notifications`;
  }, [filters.page, total]);

  function openCreateModal() {
    setForm(emptyNotificationForm);
    setModal({ open: true, editingId: null });
  }

  function openEditModal(row: AdminNotification) {
  setForm({ title: row.title, type: row.type, audience: (row as any).audience ?? "ALL_USERS" });
  setModal({ open: true, editingId: row.id });
}

  function closeModal() {
    setModal({ open: false, editingId: null });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (modal.editingId) {
        await updateNotification(modal.editingId, form);
      } else {
        await createNotification(form);
        setFilters((p) => ({ ...p, search: "", page: 1 }));
      }
      closeModal();
      await loadNotifications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save notification.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteNotification(deleteTarget.id);
      setDeleteTarget(null);
      await loadNotifications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete notification.");
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 560px; }
        .cp-modal-card { width: min(440px, 92vw) !important; max-height: 88vh; overflow-y: auto; }
        .cp-notif-footer { flex-wrap: wrap; gap: 10px; }
        @media (max-width: 480px) {
          .cp-notif-search { max-width: 100% !important; }
        }
      `}</style>

      <AdminPageHeader
        title="Notifications"
        subtitle="Send and manage notifications."
        actionLabel="New Notification"
        onAction={openCreateModal}
      />

      <div className="cp-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--cp-surface-border)" }}>
          <input
            className="cp-notif-search"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
            placeholder="Search notifications..."
            style={searchInputStyle}
          />
        </div>

        {error && (
          <div style={{ padding: "12px 16px", color: "#f87171", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="cp-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Title", "Type", "Sent On", "Status", "Actions"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, textAlign: "center", opacity: 0.6 }}>
                    Loading notifications...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, textAlign: "center", opacity: 0.6 }}>
                    No notifications found.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id}>
                    <td style={cellStyle}>{n.title}</td>
                    <td style={cellStyle}>{TYPE_LABELS[n.type]}</td>
                    <td style={cellStyle}>{formatSentOn(n.createdAt)}</td>
                    <td style={cellStyle}>
                      <StatusBadge label={n.status === "SENT" ? "Sent" : n.status === "SCHEDULED" ? "Scheduled" : "Failed"} tone={statusTone(n.status)} />
                    </td>
                    <td style={cellStyle}>
                      <button onClick={() => openEditModal(n)} style={iconBtnStyle} title="Edit" aria-label="Edit">
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteTarget(n)}
                        style={{ ...iconBtnStyle, color: "#f87171" }}
                        title="Delete"
                        aria-label="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className="cp-text-secondary cp-notif-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            fontSize: 12.5,
          }}
        >
          <span>{filteredCountLabel}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                style={{
                  ...pageBtnStyle,
                  ...(p === filters.page ? pageBtnActiveStyle : {}),
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modal.open && (
        <div style={overlayStyle} onClick={closeModal}>
          <div className="cp-modal-card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>
              {modal.editingId ? "Edit Notification" : "New Notification"}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Match Started: MI vs CSK"
                  style={inputStyle}
                  autoFocus
                  required
                  maxLength={50}
                />
              </label>

              <label style={labelStyle}>
  Type
  <select
    value={form.type}
    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NotificationType }))}
    style={inputStyle}
  >
    {TYPES.map((t) => (
      <option key={t} value={t}>
        {TYPE_LABELS[t]}
      </option>
    ))}
  </select>
</label>

<label style={labelStyle}>
  Audience
  <select
    value={form.audience}
    onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as NotificationAudience }))}
    style={inputStyle}
  >
    {AUDIENCES.map((a) => (
      <option key={a} value={a}>
        {AUDIENCE_LABELS[a]}
      </option>
    ))}
  </select>
</label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={closeModal} style={secondaryBtnStyle} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" style={primaryBtnStyle} disabled={isSaving}>
                  {isSaving ? "Saving..." : modal.editingId ? "Save Changes" : "Send Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={overlayStyle} onClick={() => setDeleteTarget(null)}>
          <div className="cp-modal-card" style={{ ...modalStyle, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Delete notification?</h3>
            <p className="cp-text-secondary" style={{ fontSize: 13.5, margin: "0 0 20px" }}>
              This will permanently remove &quot;{deleteTarget.title}&quot;. This can&apos;t be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setDeleteTarget(null)} style={secondaryBtnStyle}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={{ ...primaryBtnStyle, background: "#dc2626" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  padding: "10px 14px",
  borderBottom: "1px solid var(--cp-surface-border)",
  whiteSpace: "nowrap",
};
const cellStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--cp-surface-border)",
  fontSize: 13.5,
};
const searchInputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 320,
  padding: "8px 12px",
  fontSize: 13.5,
  background: "#FFFFFF",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: 6,
  color: "#0B0E11",
  outline: "none",
};
const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  padding: "4px 6px",
  marginRight: 4,
};
const pageBtnStyle: React.CSSProperties = {
  border: "1px solid var(--cp-surface-border)",
  background: "transparent",
  color: "inherit",
  borderRadius: 5,
  padding: "3px 9px",
  fontSize: 12,
  cursor: "pointer",
};
const pageBtnActiveStyle: React.CSSProperties = {
  background: "#22c55e",
  borderColor: "#22c55e",
  color: "#03130a",
  fontWeight: 600,
};
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: 16,
};
const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "var(--cp-surface-bg, #0e1420)",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: 10,
  padding: 22,
  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
};
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12.5,
};
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13.5,
  background: "#FFFFFF",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: 6,
  color: "#0B0E11",
  outline: "none",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#FFFFFF",
  color: "#0B0E11",
  border: "none",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "inherit",
  border: "1px solid var(--cp-surface-border)",
  borderRadius: 6,
  padding: "9px 16px",
  fontSize: 13,
  cursor: "pointer",
};
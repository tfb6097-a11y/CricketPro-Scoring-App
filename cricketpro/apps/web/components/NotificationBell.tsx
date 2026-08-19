"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPublicNotifications, PublicNotification, PublicNotificationType } from "../lib/api-client";

const TYPE_META: Record<PublicNotificationType, { color: string; icon: string; label: string }> = {
  MATCH: { color: "#22c55e", icon: "🏏", label: "Match" },
  SYSTEM: { color: "#60a5fa", icon: "⚙️", label: "System" },
  TOURNAMENT: { color: "#f59e0b", icon: "🏆", label: "Tournament" },
  ANNOUNCEMENT: { color: "#a78bfa", icon: "📢", label: "Announcement" },
};

const SEEN_KEY = "cp-notif-last-seen";
const POLL_MS = 30000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<PublicNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) : null;
    setLastSeen(stored ? parseInt(stored, 10) : 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPublicNotifications();
        if (!cancelled) setItems(data);
      } catch {
        // silent fail — bell just shows nothing new
      }
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((n) => new Date(n.createdAt).getTime() > lastSeen).length;

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setLastSeen(now);
      localStorage.setItem(SEEN_KEY, String(now));
    }
  }

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: "var(--cp-text-secondary)",
          padding: 6,
          display: "flex",
          alignItems: "center",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 15,
              height: 15,
              borderRadius: "50%",
              background: "var(--cp-accent-primary, #22c55e)",
              color: "#03130a",
              fontSize: 9.5,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            background: "var(--cp-surface-bg, #0e1420)",
            border: "1px solid var(--cp-surface-border)",
            borderRadius: 12,
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--cp-surface-border)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--cp-text-primary)",
            }}
          >
            Notifications
          </div>

          {items.length === 0 ? (
            <p style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--cp-text-secondary)" }}>
              No notifications yet.
            </p>
          ) : (
            items.map((n) => {
              const meta = TYPE_META[n.type];
              return (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--cp-surface-border)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${meta.color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--cp-text-primary)" }}>
                      {n.title}
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--cp-text-secondary)" }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
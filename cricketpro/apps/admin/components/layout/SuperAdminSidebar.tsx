"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { getCurrentUser, logout } from "../../lib/api-client";

export function SuperAdminSidebar() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--cp-bg)",
        borderRight: "1px solid var(--cp-surface-border)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ padding: "20px 20px 16px" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--cp-text-primary)" }}>
          CRICKET<span style={{ color: "var(--cp-accent-primary)" }}>PRO</span>
        </span>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            padding: "3px 9px",
            borderRadius: 20,
            background: "rgba(245,165,36,0.12)",
            border: "1px solid rgba(245,165,36,0.35)",
          }}
        >
          <ShieldCheck size={12} color="#f5a524" />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#f5a524", letterSpacing: 0.3 }}>SUPER ADMIN</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "4px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            marginBottom: 2,
            borderRadius: "var(--cp-radius-inner)",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--cp-text-primary)",
            background: "var(--cp-surface)",
            borderLeft: "2px solid #f5a524",
          }}
        >
          <LayoutDashboard size={16} strokeWidth={2} />
          Dashboard
        </div>
      </nav>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 12px",
          margin: "0 10px 10px",
          borderRadius: "var(--cp-radius-inner)",
          border: "none",
          background: "transparent",
          color: "var(--cp-danger)",
          fontSize: 13.5,
          fontWeight: 500,
          cursor: loggingOut ? "not-allowed" : "pointer",
          opacity: loggingOut ? 0.6 : 1,
          textAlign: "left",
        }}
      >
        <LogOut size={16} strokeWidth={2} />
        {loggingOut ? "Logging out..." : "Log Out"}
      </button>

      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--cp-surface-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#f5a524",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            color: "#0b0e11",
          }}
        >
          {user?.name?.[0]?.toUpperCase() ?? "S"}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--cp-text-primary)" }}>
            {user?.name ?? "Super Admin"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--cp-text-secondary)" }}>SUPER ADMIN</p>
        </div>
      </div>
    </aside>
  );
}
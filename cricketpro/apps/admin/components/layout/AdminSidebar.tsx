"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserSquare2, Shield, MapPin, Trophy,
  CalendarDays, Radio, BarChart3, Bell, FileText, Settings, LogOut,
  Menu, X,
} from "lucide-react";
import { getCurrentUser, logout } from "../../lib/api-client";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/players", label: "Players", icon: UserSquare2 },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/grounds", label: "Grounds", icon: MapPin },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/live-matches", label: "Live Matches", icon: Radio },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    function handleProfileUpdated() {
      setUser(getCurrentUser());
    }
    window.addEventListener("cp-profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("cp-profile-updated", handleProfileUpdated);
  }, []);

  // Close the mobile drawer automatically whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <>
      <style>{`
        .cp-hamburger-btn { display: none; }
        .cp-sidebar-backdrop { display: none; }

        @media (max-width: 768px) {
          .cp-hamburger-btn {
            display: flex;
            position: fixed;
            top: 14px;
            left: 14px;
            z-index: 70;
          }
          .cp-admin-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            z-index: 65;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 2px 0 24px rgba(0,0,0,0.4);
          }
          .cp-admin-sidebar.cp-sidebar-open {
            transform: translateX(0);
          }
          .cp-sidebar-backdrop.cp-backdrop-open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 60;
          }
        }
      `}</style>

      {/* Hamburger toggle — only visible on mobile via CSS above */}
      <button
        className="cp-hamburger-btn"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: "var(--cp-radius-inner)",
          border: "1px solid var(--cp-surface-border)",
          background: "var(--cp-bg)",
          color: "#FFFFFF",
          cursor: "pointer",
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Backdrop — click to close on mobile */}
      <div
        className={`cp-sidebar-backdrop ${mobileOpen ? "cp-backdrop-open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`cp-admin-sidebar ${mobileOpen ? "cp-sidebar-open" : ""}`}
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
        </div>

        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  marginBottom: 2,
                  borderRadius: "var(--cp-radius-inner)",
                  textDecoration: "none",
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  color: "var(--cp-text-primary)",
                  background: isActive ? "var(--cp-surface)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--cp-accent-primary)" : "2px solid transparent",
                }}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
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
              background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : "var(--cp-accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              color: "#0b0e11",
            }}
          >
            {!user?.avatarUrl && (user?.name?.[0]?.toUpperCase() ?? "A")}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--cp-text-primary)" }}>
              {user?.name ?? "Admin"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#FFFFFF" }}>
              {user?.role ?? "ADMIN"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
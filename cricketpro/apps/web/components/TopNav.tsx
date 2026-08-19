"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live Scores" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/points-table", label: "Points Table" },
  { href: "/stats", label: "Stats" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: "1px solid var(--cp-surface-border)",
        background: "var(--cp-bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--cp-text-primary)" }}>
          CRICKET<span style={{ color: "var(--cp-accent-primary)" }}>PRO</span>
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <nav style={{ display: "flex", gap: 22 }}>
          {NAV_ITEMS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  textDecoration: "none",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? "var(--cp-accent-primary)" : "#FFFF",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <NotificationBell />
      </div>
    </header>
  );
}
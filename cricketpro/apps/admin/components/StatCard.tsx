"use client";

import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
  trend?: string;
}

export function StatCard({ icon: Icon, label, value, accent = "var(--cp-accent-primary)", trend }: Props) {
  return (
    <div className="cp-card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--cp-radius-inner)",
            background: "var(--cp-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
          }}
        >
          <Icon size={16} />
        </div>
        <span className="cp-text-secondary" style={{ fontSize: 12 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <p className="cp-stat-number" style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "var(--cp-text-primary)" }}>
          {value}
        </p>
        {trend && (
          <span style={{ fontSize: 11, color: "var(--cp-accent-primary)", fontWeight: 600 }}>{trend}</span>
        )}
      </div>
    </div>
  );
}
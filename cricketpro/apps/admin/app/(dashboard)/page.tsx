"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Download, CalendarClock, Radio, Users, UserSquare2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchDashboardSummary } from "../../lib/api-client";
import { StatCard } from "../../components/StatCard";
import { useRouter } from "next/navigation";
const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? "http://localhost:3000";
function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDashboardSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(toInputDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  // Filter recent matches + trend data by the selected date range.
  const filteredMatches = useMemo(() => {
    if (!summary) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return summary.recentMatches.filter((m: any) => {
      const d = new Date(m.scheduledAt);
      return d >= start && d <= end;
    });
  }, [summary, startDate, endDate]);

  const trendData = useMemo(() => {
  if (!summary) return [];
  return buildTrendData([...summary.recentMatches, ...summary.liveMatches], startDate, endDate);
}, [summary, startDate, endDate]);

  function handleExport() {
    if (!filteredMatches.length) {
      alert("No matches in this date range to export");
      return;
    }
    const header = ["Match", "Score", "Status", "Scorer", "Date"];
    const rows = filteredMatches.map((m: any) => {
      const latestInnings = m.innings?.[m.innings.length - 1];
      return [
        `${m.teamA.shortCode} vs ${m.teamB.shortCode}`,
        latestInnings ? `${latestInnings.totalRuns}/${latestInnings.totalWickets}` : "-",
        m.status,
        m.scoredBy?.name ?? "-",
        new Date(m.scheduledAt).toLocaleDateString(),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crickpro-matches-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p style={{ color: "var(--cp-text-secondary)" }}>Loading dashboard...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;
  if (!summary) return null;

  const dateRangeLabel = `${new Date(startDate).toLocaleDateString(undefined, { day: "2-digit", month: "short" })} - ${new Date(endDate).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-dash-header { flex-wrap: wrap; gap: 12px; }
        .cp-dash-header-actions { flex-wrap: wrap; gap: 10px; }
        .cp-dash-datepicker { flex-wrap: wrap; }
        .cp-dash-2col {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .cp-table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cp-table-scroll table { min-width: 480px; }
        @media (max-width: 900px) {
          .cp-dash-2col { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .cp-dash-datepicker {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            border-radius: 12px 12px 0 0 !important;
            z-index: 50;
          }
        }
      `}</style>

      {/* Header row: title left, date range + export right */}
      <div className="cp-dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Welcome back, Admin 👋</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#FFFFFF" }}>
            Here's what's happening in CrickPro today.
          </p>
        </div>
        <div className="cp-dash-header-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowDatePicker((s) => !s)}
            style={{
              fontSize: 12.5,
              color: "#FFFFFF",
              background: "var(--cp-surface)",
              border: "1px solid var(--cp-surface-border)",
              borderRadius: "var(--cp-radius-inner)",
              padding: "7px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {dateRangeLabel}
          </button>
          <button onClick={handleExport} style={exportButtonStyle}>
            <Download size={14} /> Export
          </button>

          {showDatePicker && (
            <div
              className="cp-card cp-dash-datepicker"
              style={{
                position: "absolute",
                top: 42,
                right: 0,
                zIndex: 20,
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label style={labelStyle}>From</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={() => setShowDatePicker(false)} style={applyButtonStyle}>Apply</button>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon={CalendarClock} label="Total Matches" value={filteredMatches.length} trend={`of ${summary.totalMatches} total`} />
        <StatCard icon={Radio} label="Live Matches" value={summary.liveMatchesCount} accent="var(--cp-danger)" trend={summary.liveMatchesCount > 0 ? "Live Now" : undefined} />
        <StatCard icon={Users} label="Total Users" value={summary.totalUsers} />
        <StatCard icon={UserSquare2} label="Total Players" value={summary.totalPlayers} accent="var(--cp-accent-secondary)" />
      </div>

      {/* Row 2: Matches Overview chart + Top Tournaments */}
      <div className="cp-dash-2col" style={{ marginBottom: 20 }}>
        <div className="cp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 15 }}>Matches Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--cp-surface-border)" />
              <XAxis dataKey="date" tick={{ fill: "#8A93A0", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8A93A0", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#151A1F", border: "1px solid #232A31", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="live" stroke="#EF4444" strokeWidth={2} dot={false} name="Live" />
              <Line type="monotone" dataKey="completed" stroke="#3ECF4A" strokeWidth={2} dot={false} name="Completed" />
              <Line type="monotone" dataKey="upcoming" stroke="#3B82F6" strokeWidth={2} dot={false} name="Upcoming" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="cp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 15 }}>Top Tournaments</h3>
          {summary.tournamentMatchCounts
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 5)
            .map((t) => (
              <div key={t.name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13 }}>
                <span>{t.name}</span>
                <span className="cp-text-secondary">{t.matches} Matches</span>
              </div>
            ))}
          {summary.tournamentMatchCounts.length === 0 && (
            <p className="cp-text-secondary" style={{ fontSize: 12.5 }}>No tournaments yet.</p>
          )}
        </div>
      </div>

      {/* Row 3: Recent Matches (filtered) + System Status */}
      <div className="cp-dash-2col">
        <div className="cp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 15 }}>Recent Matches</h3>
          <div className="cp-table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Match", "Score", "Status", "Scorer", "Actions"].map((h) => (
                    <th key={h} className="cp-text-secondary" style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m: any) => (
                  <tr key={m.id}>
                    <td style={cellStyle}>
                      <Link href="/fixtures" style={{ color: "var(--cp-text-primary)", textDecoration: "none" }}>
                        {m.teamA.shortCode} vs {m.teamB.shortCode}
                      </Link>
                    </td>
                    <td style={cellStyle} className="cp-stat-number">
                      {m.innings?.length ? `${m.innings[m.innings.length - 1].totalRuns}/${m.innings[m.innings.length - 1].totalWickets}` : "—"}
                    </td>
                    <td style={cellStyle}><StatusPill status={m.status} /></td>
                    <td style={cellStyle} className="cp-text-secondary">{m.scoredBy?.name ?? "—"}</td>
                   <td style={cellStyle}>
  {m.status === "LIVE" ? (
    <button onClick={() => (window.location.href = `${PUBLIC_SITE_URL}/live/${m.id}`)} style={actionButtonStyle}>
      Open
    </button>
  ) : m.status === "COMPLETED" ? (
    <button onClick={() => (window.location.href = `${PUBLIC_SITE_URL}/scorecard/${m.id}`)} style={actionButtonStyle}>
      View
    </button>
  ) : (
    <span className="cp-text-secondary" style={{ fontSize: 12 }}>—</span>
  )}
</td>
                  </tr>
                ))}
                {filteredMatches.length === 0 && (
                  <tr><td colSpan={5} className="cp-text-secondary" style={{ padding: 12, textAlign: "center" }}>No matches in this date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cp-card">
          <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 15 }}>System Status</h3>
          {[
            { label: "API Status", value: "Operational" },
            { label: "WebSocket", value: "Connected" },
            { label: "Database", value: "Healthy" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--cp-surface-border)" }}>
              <span className="cp-text-secondary" style={{ fontSize: 13 }}>{s.label}</span>
              <span style={{ color: "var(--cp-accent-primary)", fontSize: 13, fontWeight: 600 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildTrendData(matches: any[], startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: { date: string; live: number; completed: number; upcoming: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const numDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    const label = d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    const dayMatches = matches.filter((m) => new Date(m.scheduledAt).toDateString() === d.toDateString());
    days.push({
      date: label,
      live: dayMatches.filter((m) => m.status === "LIVE").length,
      completed: dayMatches.filter((m) => m.status === "COMPLETED").length,
      upcoming: dayMatches.filter((m) => m.status === "UPCOMING").length,
    });
  }
  return days;
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    LIVE: "var(--cp-danger)",
    UPCOMING: "var(--cp-text-secondary)",
    COMPLETED: "var(--cp-accent-secondary)",
    ABANDONED: "var(--cp-text-secondary)",
  };
  return (
    <span style={{ color: colorMap[status] ?? "var(--cp-text-secondary)", fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>
      {status === "LIVE" && "● "}{status}
    </span>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", padding: "6px 10px", borderBottom: "1px solid var(--cp-surface-border)", whiteSpace: "nowrap" };
const cellStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)", fontSize: 13 };
const actionButtonStyle: React.CSSProperties = { color: "#FFFFFF", fontSize: 12.5, fontWeight: 600, textDecoration: "none", background: "transparent", border: "none", cursor: "pointer", padding: 0 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, color: "#FFFFFF", marginBottom: 3 };
const inputStyle: React.CSSProperties = { background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "6px 8px", color: "var(--cp-text-primary)", fontSize: 12.5 };
const exportButtonStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const applyButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" };
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText, Users, UserSquare2, BarChart3, Download, Radio, DollarSign, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  fetchFixtures, fetchUsers, fetchPlayers, downloadScorecardPdf, AdminFixture, AdminUser,
} from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";

type AnyPlayer = Record<string, any>;

interface ReportData {
  fixtures: AdminFixture[];
  users: AdminUser[];
  players: AnyPlayer[];
}

type ReportKey = "matches" | "users" | "players" | "statistics" | "scorers" | null;

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({ fixtures: [], users: [], players: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [scorecard, setScorecard] = useState({ selectedMatchId: "", generating: false, error: null as string | null });
  const [activeReport, setActiveReport] = useState<ReportKey>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [fixturesData, usersData, playersData] = await Promise.all([
          fetchFixtures(), fetchUsers(), fetchPlayers(),
        ]);
        if (cancelled) return;
        setReportData({ fixtures: fixturesData, users: usersData, players: playersData as AnyPlayer[] });
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load report data.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scorers = useMemo(() => reportData.users.filter((u) => u.role === "SCORER"), [reportData.users]);

  async function handleGenerateScorecard() {
    if (!scorecard.selectedMatchId) {
      setScorecard((s) => ({ ...s, error: "Select a match first" }));
      return;
    }
    setScorecard((s) => ({ ...s, error: null, generating: true }));
    try {
      await downloadScorecardPdf(scorecard.selectedMatchId);
      setScorecard((s) => ({ ...s, generating: false }));
    } catch (err) {
      setScorecard((s) => ({ ...s, generating: false, error: err instanceof Error ? err.message : "Failed to generate report" }));
    }
  }

  function toggleReport(key: ReportKey) {
    setActiveReport((current) => (current === key ? null : key));
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-report-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 900px) {
          .cp-report-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .cp-report-grid { grid-template-columns: 1fr; }
        }
        .cp-scorecard-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
        .cp-scorecard-row select { flex: 1; min-width: 220px; }
      `}</style>

      <AdminPageHeader title="Reports & Analytics" subtitle="Generate and download reports — pick one item or download the full list." />

      {loadError && (
        <div className="cp-card" style={{ marginBottom: 16, padding: "12px 16px", color: "#f87171", fontSize: 13 }}>
          {loadError}
        </div>
      )}

      <div className="cp-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>Match Scorecard PDF</h3>
        <p style={{ fontSize: 12, marginTop: 0, marginBottom: 10, color: "#FFFFFF" }}>
          Select any single match to download its full scorecard as a PDF.
        </p>
        <div className="cp-scorecard-row">
          <select
            value={scorecard.selectedMatchId}
            onChange={(e) => setScorecard((s) => ({ ...s, selectedMatchId: e.target.value }))}
            style={{ ...inputStyle, minWidth: 220 }}
          >
            <option value="">Select a match...</option>
            {reportData.fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.teamA.shortCode} vs {f.teamB.shortCode} — {new Date(f.scheduledAt).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button onClick={handleGenerateScorecard} disabled={scorecard.generating} style={primaryButtonStyle}>
            <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {scorecard.generating ? "Generating..." : "Generate & Download"}
          </button>
        </div>
        {scorecard.error && <p style={{ color: "var(--cp-danger)", fontSize: 13, marginTop: 10 }}>{scorecard.error}</p>}
      </div>

      <div className="cp-report-grid">
        <ReportCard
          icon={FileText}
          title="Matches Report"
          subtitle={isLoading ? "Loading..." : `Total: ${reportData.fixtures.length} Matches`}
          active={activeReport === "matches"}
          onView={() => toggleReport("matches")}
        />
        <ReportCard
          icon={Users}
          title="Users Report"
          subtitle={isLoading ? "Loading..." : `Total: ${reportData.users.length} Users`}
          active={activeReport === "users"}
          onView={() => toggleReport("users")}
        />
        <ReportCard
          icon={UserSquare2}
          title="Players Report"
          subtitle={isLoading ? "Loading..." : `Total: ${reportData.players.length} Players`}
          active={activeReport === "players"}
          onView={() => toggleReport("players")}
        />
        <ReportCard
          icon={BarChart3}
          title="Statistics Report"
          subtitle="View detailed stats"
          active={activeReport === "statistics"}
          onView={() => toggleReport("statistics")}
        />
        <ReportCard
          icon={Radio}
          title="Scorers Activity"
          subtitle={isLoading ? "Loading..." : `Total: ${scorers.length} Scorers`}
          active={activeReport === "scorers"}
          onView={() => toggleReport("scorers")}
        />
        <ReportCard
          icon={DollarSign}
          title="Revenue Report"
          subtitle="Not available — no revenue tracking in backend yet"
          disabled
        />
      </div>

      {activeReport && (
        <div className="cp-card" style={{ marginTop: 20 }}>
          {activeReport === "matches" && <MatchesReportTable fixtures={reportData.fixtures} />}
          {activeReport === "users" && <UsersReportTable users={reportData.users} />}
          {activeReport === "players" && <PlayersReportTable players={reportData.players} />}
          {activeReport === "statistics" && (
            <StatisticsReportTable
              matches={reportData.fixtures.length}
              users={reportData.users.length}
              players={reportData.players.length}
              scorers={scorers.length}
            />
          )}
          {activeReport === "scorers" && <ScorersReportTable scorers={scorers} />}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  icon: Icon, title, subtitle, onView, disabled, active,
}: {
  icon: any; title: string; subtitle: string; onView?: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <div className="cp-card" style={{ textAlign: "center", opacity: disabled ? 0.6 : 1 }}>
      <div style={{ width: 40, height: 40, borderRadius: "var(--cp-radius-inner)", background: "var(--cp-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: "var(--cp-accent-secondary)" }}>
        <Icon size={18} />
      </div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{title}</p>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#FFFFFF" }}>{subtitle}</p>
      <button style={secondaryButtonStyle} disabled={disabled || !onView} onClick={onView}>
        {disabled ? "Unavailable" : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", width: "100%" }}>
            {active ? "Hide Report" : "View Report"}
            {active ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>
    </div>
  );
}

function SectionHeader({ title, onDownloadAll }: { title: string; onDownloadAll: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
      <button onClick={onDownloadAll} style={downloadAllButtonStyle}>
        <Download size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Download All
      </button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ fontSize: 13, padding: "16px 0", textAlign: "center", color: "#FFFFFF" }}>{text}</p>;
}

function MatchesReportTable({ fixtures }: { fixtures: AdminFixture[] }) {
  if (!fixtures.length) return <EmptyState text="No matches found." />;

  function downloadOne(f: AdminFixture) {
    downloadCSV(`match-${f.teamA.shortCode}-vs-${f.teamB.shortCode}.csv`, ["Match", "Date", "Status", "Venue"], [
      [`${f.teamA.name} vs ${f.teamB.name}`, new Date(f.scheduledAt).toLocaleString(), (f as any).status ?? "—", f.ground?.name ?? "—"],
    ]);
  }
  function downloadAll() {
    downloadCSV("matches-report.csv", ["Match", "Date", "Status", "Venue"], fixtures.map((f) => [
      `${f.teamA.name} vs ${f.teamB.name}`, new Date(f.scheduledAt).toLocaleString(), (f as any).status ?? "—", f.ground?.name ?? "—",
    ]));
  }

  return (
    <div>
      <SectionHeader title="Matches Report" onDownloadAll={downloadAll} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, minWidth: 480 }}>
          <thead>
            <tr>
              <th style={thStyle}>Match</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => (
              <tr key={f.id}>
                <td style={tdStyle}>{f.teamA.shortCode} vs {f.teamB.shortCode}</td>
                <td style={tdStyle}>{new Date(f.scheduledAt).toLocaleDateString()}</td>
                <td style={tdStyle}>{(f as any).status ?? "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => downloadOne(f)} style={rowDownloadButtonStyle}><Download size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersReportTable({ users }: { users: AdminUser[] }) {
  if (!users.length) return <EmptyState text="No users found." />;

  function downloadOne(u: AdminUser) {
    downloadCSV(`user-${(u as any).name ?? u.email}.csv`, ["Name", "Email", "Role"], [
      [(u as any).name ?? "—", u.email, u.role],
    ]);
  }
  function downloadAll() {
    downloadCSV("users-report.csv", ["Name", "Email", "Role"], users.map((u) => [(u as any).name ?? "—", u.email, u.role]));
  }

  return (
    <div>
      <SectionHeader title="Users Report" onDownloadAll={downloadAll} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, minWidth: 480 }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={tdStyle}>{(u as any).name ?? "—"}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.role}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => downloadOne(u)} style={rowDownloadButtonStyle}><Download size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayersReportTable({ players }: { players: AnyPlayer[] }) {
  if (!players.length) return <EmptyState text="No players found." />;

  function downloadOne(p: AnyPlayer) {
    downloadCSV(`player-${p.name ?? "player"}.csv`, ["Name", "Team", "Role"], [
      [p.name ?? "—", p.team?.shortCode ?? p.teamName ?? "—", p.role ?? "—"],
    ]);
  }
  function downloadAll() {
    downloadCSV("players-report.csv", ["Name", "Team", "Role"], players.map((p) => [p.name ?? "—", p.team?.shortCode ?? p.teamName ?? "—", p.role ?? "—"]));
  }

  return (
    <div>
      <SectionHeader title="Players Report" onDownloadAll={downloadAll} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, minWidth: 480 }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Team</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={p.id ?? idx}>
                <td style={tdStyle}>{p.name ?? p.fullName ?? "—"}</td>
                <td style={tdStyle}>{p.team?.shortCode ?? p.team?.name ?? p.teamName ?? "—"}</td>
                <td style={tdStyle}>{p.role ?? p.playingRole ?? "—"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => downloadOne(p)} style={rowDownloadButtonStyle}><Download size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScorersReportTable({ scorers }: { scorers: AdminUser[] }) {
  if (!scorers.length) return <EmptyState text="No scorers found." />;

  function downloadOne(s: AdminUser) {
    downloadCSV(`scorer-${(s as any).name ?? s.email}.csv`, ["Name", "Email"], [[(s as any).name ?? "—", s.email]]);
  }
  function downloadAll() {
    downloadCSV("scorers-report.csv", ["Name", "Email"], scorers.map((s) => [(s as any).name ?? "—", s.email]));
  }

  return (
    <div>
      <SectionHeader title="Scorers Activity" onDownloadAll={downloadAll} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, minWidth: 380 }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((s) => (
              <tr key={s.id}>
                <td style={tdStyle}>{(s as any).name ?? "—"}</td>
                <td style={tdStyle}>{s.email}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => downloadOne(s)} style={rowDownloadButtonStyle}><Download size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatisticsReportTable({ matches, users, players, scorers }: { matches: number; users: number; players: number; scorers: number }) {
  const stats = [
    { label: "Total Matches", value: matches },
    { label: "Total Users", value: users },
    { label: "Total Players", value: players },
    { label: "Total Scorers", value: scorers },
  ];
  function downloadAll() {
    downloadCSV("statistics-report.csv", ["Metric", "Value"], stats.map((s) => [s.label, s.value]));
  }
  return (
    <div>
      <SectionHeader title="Statistics Report" onDownloadAll={downloadAll} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "14px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{s.value}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#FFFFFF" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)", color: "#FFFFFF", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid var(--cp-surface-border)" };
const inputStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "8px 10px", color: "#0B0E11", fontSize: 14 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "9px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13.5 };
const secondaryButtonStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-primary)", borderRadius: "var(--cp-radius-inner)", padding: "6px 14px", fontSize: 12.5, cursor: "pointer", width: "100%" };
const downloadAllButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 };
const rowDownloadButtonStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--cp-surface-border)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: "var(--cp-accent-secondary)", display: "inline-flex", alignItems: "center" };
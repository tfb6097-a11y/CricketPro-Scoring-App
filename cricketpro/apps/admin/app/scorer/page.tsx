"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { fetchMyAssignedMatches, getCurrentUser, logout, AdminFixture } from "../../lib/api-client";

export default function ScorerHomePage() {
  const router = useRouter();
  const [matches, setMatches] = useState<AdminFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getCurrentUser();

  useEffect(() => {
  fetchMyAssignedMatches()
    .then(setMatches)
    .finally(() => setLoading(false));
}, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>
            CRICK<span style={{ color: "var(--cp-accent-primary)" }}>PRO</span> Scorer Console
          </h1>
          <p className="cp-text-secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Welcome, {user?.name ?? "Scorer"}
          </p>
        </div>
        <button onClick={handleLogout} style={logoutButtonStyle}>
          <LogOut size={14} /> Logout
        </button>
      </div>

      {loading ? (
        <p className="cp-text-secondary" style={{ fontSize: 13 }}>Loading matches...</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.map((m) => (
            <div key={m.id} className="cp-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{m.teamA.shortCode} vs {m.teamB.shortCode}</p>
                <p className="cp-text-secondary" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                  {m.ground.name} · {new Date(m.scheduledAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(m.status === "LIVE" ? `/scorer/live/${m.id}` : `/scorer/setup/${m.id}`)
                }
                style={primaryButtonStyle}
              >
                {m.status === "LIVE" ? "Continue Scoring" : "Start Match Setup"}
              </button>
            </div>
          ))}
          {matches.length === 0 && (
            <p className="cp-text-secondary" style={{ fontSize: 13 }}>No matches assigned to you right now.</p>
          )}
        </div>
      )}
    </main>
  );
}

const logoutButtonStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--cp-surface-border)", color: "var(--cp-text-secondary)", borderRadius: "var(--cp-radius-inner)", padding: "8px 14px", fontSize: 13, cursor: "pointer" };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13 };
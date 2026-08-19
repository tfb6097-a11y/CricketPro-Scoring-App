"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { bulkImportPlayers, BulkImportRow, BulkImportResult } from "../lib/api-client";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function ImportPlayersModal({ onClose, onImported }: Props) {
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [replaceExistingSquad, setReplaceExistingSquad] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        const parsed: BulkImportRow[] = json.map((r) => ({
          playerName: String(r["Player Name"] ?? r["Name"] ?? "").trim(),
          country: String(r["Country"] ?? "").trim() || undefined,
          role: String(r["Role"] ?? "BATTER").trim().toUpperCase().replace(/\s+/g, "_"),
          photoUrl: String(r["Player Photo URL"] ?? r["Photo URL"] ?? "").trim() || undefined,
          teamName: String(r["Team Name"] ?? "").trim() || undefined,
          teamShortCode: String(r["Team Short Code"] ?? "").trim() || undefined,
          teamLogoUrl: String(r["Team Logo URL"] ?? "").trim() || undefined,
        })).filter((r) => r.playerName);

        if (parsed.length === 0) {
          setParseError("No valid rows found — check that 'Player Name' column exists and has data.");
        }
        setRows(parsed);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to read file");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadTemplate() {
    const sample = [
      {
        "Player Name": "Babar Azam",
        "Country": "Pakistan",
        "Role": "BATTER",
        "Player Photo URL": "https://example.com/babar.jpg",
        "Team Name": "Pakistan Shaheens",
        "Team Short Code": "PSH",
        "Team Logo URL": "https://example.com/pak-logo.png",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Players");
    XLSX.writeFile(wb, "crickpro-players-template.xlsx");
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkImportPlayers(rows, replaceExistingSquad);
      setResult(res);
      if (res.playersCreated > 0 || res.playersUpdated > 0) onImported();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="cp-card" style={{ width: 520, maxHeight: "85vh", overflowY: "auto", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Import Players</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--cp-text-secondary)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <p className="cp-text-secondary" style={{ fontSize: 13, marginTop: 0 }}>
          Upload an Excel file with columns: <strong>Player Name</strong>, Country, Role, Player Photo URL, Team Name, Team Short Code, Team Logo URL.
          If a team name doesn't exist yet, it'll be created automatically.
        </p>

        <button type="button" onClick={downloadTemplate} style={{ ...secondaryButtonStyle, marginBottom: 14 }}>
          Download Template
        </button>

        <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ marginBottom: 14 }} />
        {fileName && <p className="cp-text-secondary" style={{ fontSize: 12.5 }}>Loaded: {fileName} — {rows.length} row(s) parsed</p>}

        {fileName && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--cp-text-secondary)", marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={replaceExistingSquad}
              onChange={(e) => setReplaceExistingSquad(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              <strong>Replace existing team squads</strong> — if a team in this file already exists, its current squad will be cleared and replaced with the players from this file. Leave unchecked to just add new players alongside the existing squad.
            </span>
          </label>
        )}

        {parseError && <p style={{ color: "var(--cp-danger)", fontSize: 13 }}>{parseError}</p>}

        {rows.length > 0 && !result && (
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>{["Name", "Country", "Role", "Team"].map((h) => (
                  <th key={h} className="cp-text-secondary" style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid var(--cp-surface-border)" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 10px" }}>{r.playerName}</td>
                    <td style={{ padding: "6px 10px" }}>{r.country ?? "—"}</td>
                    <td style={{ padding: "6px 10px" }}>{r.role}</td>
                    <td style={{ padding: "6px 10px" }}>{r.teamName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && <p className="cp-text-secondary" style={{ fontSize: 11.5, padding: 8 }}>...and {rows.length - 50} more</p>}
          </div>
        )}

        {result && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: "var(--cp-radius-inner)", background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)" }}>
            <p style={{ margin: 0, color: "var(--cp-accent-primary)", fontSize: 13.5, fontWeight: 600 }}>
              ✓ {result.playersCreated} created, {result.playersUpdated} updated, {result.teamsCreated} team(s) created
              {result.squadsReplaced > 0 && `, ${result.squadsReplaced} squad(s) replaced`}
            </p>
            {result.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: 0, color: "var(--cp-danger)", fontSize: 12.5 }}>{result.errors.length} row(s) had issues:</p>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--cp-text-secondary)" }}>
                  {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ ...secondaryButtonStyle, flex: 1 }}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button type="button" onClick={handleImport} disabled={rows.length === 0 || importing} style={{ ...primaryButtonStyle, flex: 1 }}>
              {importing ? "Importing..." : `Import ${rows.length || ""} Player${rows.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#0b0e11", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "9px 0", fontWeight: 600, cursor: "pointer", fontSize: 13.5 };
const secondaryButtonStyle: React.CSSProperties = { background: "transparent", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "9px 0", color: "var(--cp-text-secondary)", cursor: "pointer", fontSize: 13.5 };
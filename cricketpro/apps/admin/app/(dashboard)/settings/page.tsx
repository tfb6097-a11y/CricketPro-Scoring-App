"use client";

import { useEffect, useState } from "react";
import { fetchSettings, updateSettings, fetchSystemInfo, SystemSettings, SystemInfo, fetchMyProfile, updateMyProfile, CurrentUserProfile, changeMyPassword, getCurrentUser } from "../../../lib/api-client";
import { AdminPageHeader } from "../../../components/layout/AdminPageHeader";
import { ImageUploadField } from "../../../components/ImageUploadField";

const SUB_NAV = ["Profile", "General", "Email Settings", "Live Scoring", "Security", "Backup", "System Info"];
const TIMEZONES = ["(GMT+05:30) Asia/Karachi", "(GMT+00:00) UTC", "(GMT+04:00) Asia/Dubai"];
const DATE_FORMATS = ["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const TIME_FORMATS = ["12 Hour", "24 Hour"];
const FORMATS = ["T20", "ODI", "TEST"];
const BACKUP_FREQUENCIES = ["Daily", "Weekly", "Monthly"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("Profile");
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settingsSaveState, setSettingsSaveState] = useState({ saving: false, saved: false });
  const [profileSaveState, setProfileSaveState] = useState({ saving: false, saved: false });

  const currentUser = getCurrentUser();
  const canEditSelf = currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    Promise.all([fetchSettings(), fetchSystemInfo(), fetchMyProfile()])
      .then(([s, info, p]) => { setSettings(s); setSystemInfo(info); setProfile(p); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  async function handleSave() {
    if (!settings) return;
    setSettingsSaveState({ saving: true, saved: false });
    try {
      const payload = {
        siteName: settings.siteName,
        siteTagline: settings.siteTagline,
        adminEmail: settings.adminEmail,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        emailEnabled: settings.emailEnabled,
        smtpHost: settings.smtpHost ?? undefined,
        smtpPort: settings.smtpPort ?? undefined,
        smtpUsername: settings.smtpUsername ?? undefined,
        smtpPassword: settings.smtpPassword ?? undefined,
        emailFromAddress: settings.emailFromAddress ?? undefined,
        defaultFormat: settings.defaultFormat,
        defaultOversPerInnings: settings.defaultOversPerInnings,
        freeHitEnabled: settings.freeHitEnabled,
        autoStrikeRotation: settings.autoStrikeRotation,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        requireStrongPassword: settings.requireStrongPassword,
        autoBackupEnabled: settings.autoBackupEnabled,
        backupFrequency: settings.backupFrequency,
      };

      const updated = await updateSettings(payload);
      setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
      setSettingsSaveState({ saving: false, saved: true });
      setTimeout(() => setSettingsSaveState((s) => ({ ...s, saved: false })), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save settings");
      setSettingsSaveState((s) => ({ ...s, saving: false }));
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    setProfileSaveState({ saving: true, saved: false });
    try {
      const updated = await updateMyProfile({ name: profile.name, avatarUrl: profile.avatarUrl ?? undefined });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setProfileSaveState({ saving: false, saved: true });
      setTimeout(() => setProfileSaveState((s) => ({ ...s, saved: false })), 2500);

      const cached = localStorage.getItem("cp_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        localStorage.setItem("cp_user", JSON.stringify({ ...parsed, name: updated.name, avatarUrl: updated.avatarUrl }));
        window.dispatchEvent(new Event("cp-profile-updated"));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update profile");
      setProfileSaveState((s) => ({ ...s, saving: false }));
    }
  }

  if (loading) return <p style={{ color: "var(--cp-text-primary)" }}>Loading settings...</p>;
  if (error) return <p style={{ color: "var(--cp-danger)" }}>Error: {error}</p>;
  if (!settings) return null;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .cp-settings-grid {
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 20px;
        }
        .cp-settings-nav {
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 768px) {
          .cp-settings-grid { grid-template-columns: 1fr; }
          .cp-settings-nav {
            flex-direction: row;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            gap: 4px;
          }
          .cp-settings-nav button { white-space: nowrap; }
        }
      `}</style>

      <AdminPageHeader title="Settings" subtitle="Manage system settings." />

      <div className="cp-settings-grid">
        <div className="cp-card cp-settings-nav" style={{ padding: 8, height: "fit-content" }}>
          {SUB_NAV.map((item) => (
            <button
              key={item}
              onClick={() => setActiveSection(item)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: activeSection === item ? "var(--cp-bg)" : "transparent",
                border: "none", borderRadius: "var(--cp-radius-inner)", padding: "9px 12px", marginBottom: 2,
                fontSize: 13, fontWeight: activeSection === item ? 600 : 500,
                color: activeSection === item ? "var(--cp-accent-primary)" : "var(--cp-text-primary)",
                cursor: "pointer",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="cp-card">
          {activeSection === "Profile" && profile && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: "var(--cp-text-primary)" }}>Profile</h3>

              {!canEditSelf && (
                <p style={{ fontSize: 12.5, color: "var(--cp-text-primary)", margin: "0 0 16px", maxWidth: 420 }}>
                  Your profile is managed by an administrator and cannot be edited here.
                  {currentUser?.role === "ADMIN" && " Contact a Super Admin to update your details."}
                  {currentUser?.role === "SCORER" && " Contact an Admin to update your details."}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
                <ImageUploadField
                  type="users"
                  value={profile.avatarUrl}
                  onChange={(url) => canEditSelf && setProfile({ ...profile, avatarUrl: url })}
                />
                <Field label="Name">
                  <input
                    value={profile.name}
                    onChange={(e) => canEditSelf && setProfile({ ...profile, name: e.target.value })}
                    disabled={!canEditSelf}
                    maxLength={20}
                    style={canEditSelf ? inputStyle : { ...inputStyle, opacity: 0.6 }}
                  />
                </Field>
                <Field label="Email">
                  <input value={profile.email} disabled maxLength={20} style={{ ...inputStyle, opacity: 0.6 }} />
                </Field>
                <Field label="Role">
                  <input value={profile.role} disabled style={{ ...inputStyle, opacity: 0.6 }} />
                </Field>

                {canEditSelf && (
                  <>
                    {profileSaveState.saved && <p style={{ color: "var(--cp-accent-primary)", fontSize: 13, margin: 0 }}>✓ Saved</p>}
                    <button onClick={handleSaveProfile} disabled={profileSaveState.saving} style={primaryButtonStyle}>
                      {profileSaveState.saving ? "Saving..." : "Save Profile"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeSection === "General" && (
            <SectionForm title="General" onSave={handleSave} saving={settingsSaveState.saving} saved={settingsSaveState.saved}>
              <Field label="Site Name"><input value={settings.siteName} onChange={(e) => updateField("siteName", e.target.value)} maxLength={20} style={inputStyle} /></Field>
              <Field label="Site Tagline"><input value={settings.siteTagline} onChange={(e) => updateField("siteTagline", e.target.value)} maxLength={20} style={inputStyle} /></Field>
              <Field label="Admin Email"><input type="email" value={settings.adminEmail} onChange={(e) => updateField("adminEmail", e.target.value)} maxLength={20} style={inputStyle} /></Field>
              <Field label="Timezone">
                <select value={settings.timezone} onChange={(e) => updateField("timezone", e.target.value)} style={inputStyle}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
              <Field label="Date Format">
                <select value={settings.dateFormat} onChange={(e) => updateField("dateFormat", e.target.value)} style={inputStyle}>
                  {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Time Format">
                <select value={settings.timeFormat} onChange={(e) => updateField("timeFormat", e.target.value)} style={inputStyle}>
                  {TIME_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
            </SectionForm>
          )}

          {activeSection === "Email Settings" && (
            <SectionForm title="Email Settings" onSave={handleSave} saving={settingsSaveState.saving} saved={settingsSaveState.saved}>
              <Toggle label="Enable Email Notifications" checked={settings.emailEnabled} onChange={(v) => updateField("emailEnabled", v)} />
              <Field label="SMTP Host"><input value={settings.smtpHost ?? ""} onChange={(e) => updateField("smtpHost", e.target.value)} maxLength={22} style={inputStyle} placeholder="smtp.gmail.com" /></Field>
              <Field label="SMTP Port"><input type="number" value={settings.smtpPort ?? 587} onChange={(e) => updateField("smtpPort", parseInt(e.target.value, 10))} style={inputStyle} /></Field>
              <Field label="SMTP Username"><input value={settings.smtpUsername ?? ""} onChange={(e) => updateField("smtpUsername", e.target.value)} maxLength={20} style={inputStyle} /></Field>
              <Field label="SMTP Password"><input type="password" value={settings.smtpPassword ?? ""} onChange={(e) => updateField("smtpPassword", e.target.value)} maxLength={20} style={inputStyle} /></Field>
              <Field label="From Address"><input type="email" value={settings.emailFromAddress ?? ""} onChange={(e) => updateField("emailFromAddress", e.target.value)} maxLength={20} style={inputStyle} /></Field>
            </SectionForm>
          )}

          {activeSection === "Live Scoring" && (
            <SectionForm title="Live Scoring" onSave={handleSave} saving={settingsSaveState.saving} saved={settingsSaveState.saved}>
              <Field label="Default Format">
                <select value={settings.defaultFormat} onChange={(e) => updateField("defaultFormat", e.target.value)} style={inputStyle}>
                  {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Default Overs per Innings"><input type="number" value={settings.defaultOversPerInnings} onChange={(e) => updateField("defaultOversPerInnings", parseInt(e.target.value, 10))} style={inputStyle} /></Field>
              <Toggle label="Free Hit Rule Enabled" checked={settings.freeHitEnabled} onChange={(v) => updateField("freeHitEnabled", v)} />
              <Toggle label="Automatic Strike Rotation" checked={settings.autoStrikeRotation} onChange={(v) => updateField("autoStrikeRotation", v)} />
              <p style={{ fontSize: 12, color: "var(--cp-text-primary)" }}>
                Note: these are defaults for new tournaments — existing tournaments keep their own overs-per-innings value.
              </p>
            </SectionForm>
          )}

          {activeSection === "Security" && (
            <>
              <SectionForm title="Security" onSave={handleSave} saving={settingsSaveState.saving} saved={settingsSaveState.saved}>
                <Field label="Session Timeout (minutes)"><input type="number" value={settings.sessionTimeoutMinutes} onChange={(e) => updateField("sessionTimeoutMinutes", parseInt(e.target.value, 10))} style={inputStyle} /></Field>
                <Toggle label="Require Strong Passwords" checked={settings.requireStrongPassword} onChange={(v) => updateField("requireStrongPassword", v)} />
              </SectionForm>

              {canEditSelf && (
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--cp-surface-border)" }}>
                  <ChangePasswordForm />
                </div>
              )}
            </>
          )}

          {activeSection === "Backup" && (
            <SectionForm title="Backup" onSave={handleSave} saving={settingsSaveState.saving} saved={settingsSaveState.saved}>
              <Toggle label="Automatic Backups" checked={settings.autoBackupEnabled} onChange={(v) => updateField("autoBackupEnabled", v)} />
              <Field label="Backup Frequency">
                <select value={settings.backupFrequency} onChange={(e) => updateField("backupFrequency", e.target.value)} style={inputStyle}>
                  {BACKUP_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <p style={{ fontSize: 12, color: "var(--cp-text-primary)" }}>
                Note: this schedules preference only — an actual automated pg_dump job runner is a future infra task, not part of the app itself.
              </p>
            </SectionForm>
          )}

          {activeSection === "System Info" && systemInfo && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: "var(--cp-text-primary)" }}>System Info</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 420 }}>
                <InfoRow label="API Version" value={systemInfo.apiVersion} />
                <InfoRow label="Environment" value={systemInfo.nodeEnv} />
                <InfoRow label="Uptime" value={formatUptime(systemInfo.uptimeSeconds)} />
                <InfoRow label="Database Status" value={systemInfo.dbStatus} accent={systemInfo.dbStatus === "Healthy" ? "var(--cp-accent-primary)" : "var(--cp-danger)"} />
                <InfoRow label="Total Users" value={String(systemInfo.counts.userCount)} />
                <InfoRow label="Total Players" value={String(systemInfo.counts.playerCount)} />
                <InfoRow label="Total Teams" value={String(systemInfo.counts.teamCount)} />
                <InfoRow label="Total Matches" value={String(systemInfo.counts.matchCount)} />
                <InfoRow label="Live Matches" value={String(systemInfo.counts.liveMatchCount)} accent={systemInfo.counts.liveMatchCount > 0 ? "var(--cp-danger)" : undefined} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionForm({ title, onSave, saving, saved, children }: { title: string; onSave: () => void; saving: boolean; saved: boolean; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: "var(--cp-text-primary)" }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
        {children}
        {saved && <p style={{ color: "var(--cp-accent-primary)", fontSize: 13, margin: 0 }}>✓ Saved</p>}
        <button onClick={onSave} disabled={saving} style={primaryButtonStyle}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    try {
      await changeMyPassword(passwords.currentPassword, passwords.newPassword);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 15, color: "var(--cp-text-primary)" }}>Change Password</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Current Password">
          <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} required maxLength={20} style={inputStyle} />
        </Field>
        <Field label="New Password">
          <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} required minLength={8} maxLength={20} style={inputStyle} />
        </Field>
        <Field label="Confirm New Password">
          <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} maxLength={20} style={inputStyle} />
        </Field>

        {error && <p style={{ color: "var(--cp-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
        {success && <p style={{ color: "var(--cp-accent-primary)", fontSize: 13, margin: 0 }}>✓ Password changed</p>}

        <button type="submit" disabled={submitting} style={primaryButtonStyle}>
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--cp-text-primary)", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
      <span style={{ fontSize: 13, color: "var(--cp-text-primary)" }}>{label}</span>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, background: checked ? "var(--cp-accent-primary)" : "var(--cp-surface-border)",
          position: "relative", transition: "background 0.15s",
        }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#0b0e11", transition: "left 0.15s" }} />
      </span>
    </label>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--cp-surface-border)" }}>
      <span style={{ fontSize: 13, color: "var(--cp-text-primary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ?? "var(--cp-text-primary)" }}>{value}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

const inputStyle: React.CSSProperties = { width: "100%", background: "var(--cp-bg)", border: "1px solid var(--cp-surface-border)", borderRadius: "var(--cp-radius-inner)", padding: "9px 12px", color: "var(--cp-text-primary)", fontSize: 14 };
const primaryButtonStyle: React.CSSProperties = { background: "var(--cp-accent-primary)", color: "#FFFFFF", border: "none", borderRadius: "var(--cp-radius-inner)", padding: "9px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13.5, alignSelf: "flex-start" };
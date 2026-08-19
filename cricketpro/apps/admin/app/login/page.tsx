"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Radio } from "lucide-react";
import { login, getCurrentUser } from "../../lib/api-client";

const TICKER_ITEMS = [
  "GATE OPENS 09:00",
  "SQUAD SHEETS DUE 60 MIN BEFORE TOSS",
  "SCORERS — SIGN IN TO START YOUR SHIFT",
  "PITCH REPORT: DRY, TRUE BOUNCE EXPECTED",
  "NEXT FIXTURE: QUALIFIER 2",
  "LIVE SCORING SYSTEMS — ALL GREEN",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const user = getCurrentUser();
      if (user?.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (user?.role === "ADMIN") {
        router.push("/");
      } else if (user?.role === "SCORER") {
        router.push("/scorer");
      } else {
        router.push("/scorer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const tickerText = TICKER_ITEMS.join("   •   ");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .cp-login-page {
          --bg: #0B0E11;
          --surface: #151A1F;
          --border: #232A31;
          --green: #3ECF4A;
          --blue: #3B82F6;
          --danger: #EF4444;
          --text-primary: #F2F4F5;
          --text-secondary: #8A93A0;

          min-height: 100vh;
          width: 100%;
          background: var(--bg);
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .cp-ticker {
          width: 100%;
          overflow: hidden;
          border-bottom: 1px solid var(--border);
          background: rgba(62, 207, 74, 0.04);
          padding: 9px 0;
        }
        .cp-ticker-track {
          display: flex;
          white-space: nowrap;
          width: max-content;
          animation: cp-marquee 32s linear infinite;
        }
        .cp-ticker-track span {
          font-family: 'Inter', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--green);
          padding-right: 60px;
        }
        @keyframes cp-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .cp-login-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .cp-login-shell {
          width: 100%;
          max-width: 400px;
        }

        .cp-brand-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .cp-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          color: #06110A;
        }
        .cp-brand-name {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .cp-brand-name span { color: var(--green); }

        .cp-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0 auto 20px;
          padding: 5px 11px 5px 9px;
          background: rgba(62, 207, 74, 0.08);
          border: 1px solid rgba(62, 207, 74, 0.25);
          border-radius: 100px;
          width: fit-content;
        }
        .cp-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 0 0 rgba(62, 207, 74, 0.6);
          animation: cp-pulse 1.8s ease-out infinite;
        }
        @keyframes cp-pulse {
          0% { box-shadow: 0 0 0 0 rgba(62, 207, 74, 0.55); }
          70% { box-shadow: 0 0 0 6px rgba(62, 207, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(62, 207, 74, 0); }
        }
        .cp-live-pill span {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--green);
          text-transform: uppercase;
        }

        .cp-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 28px;
          animation: cp-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cp-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cp-card-head {
          margin-bottom: 22px;
        }
        .cp-card-head h1 {
          margin: 0 0 4px;
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .cp-card-head p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .cp-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cp-field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 7px;
        }
        .cp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 9px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 11px 13px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .cp-input-wrap:focus-within {
          border-color: #2f3941;
        }

        .cp-input-wrap::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0%;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, transparent, var(--green), transparent);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1;
        }
        .cp-input-wrap:focus-within::before {
          width: 100%;
        }

        .cp-input-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(62, 207, 74, 0.22), transparent 75%);
          opacity: 0;
          transform: translateY(-100%);
          pointer-events: none;
        }
        .cp-input-wrap:focus-within::after {
          animation: cp-glow-sweep 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cp-glow-sweep {
          from { transform: translateY(-100%); opacity: 0.9; }
          to { transform: translateY(0); opacity: 0; }
        }

        .cp-input-wrap input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .cp-input-wrap input::placeholder { color: #4B5563; }

        .cp-input-wrap input:-webkit-autofill,
        .cp-input-wrap input:-webkit-autofill:hover,
        .cp-input-wrap input:-webkit-autofill:focus,
        .cp-input-wrap input:-webkit-autofill:active {
          -webkit-text-fill-color: var(--text-primary);
          -webkit-box-shadow: 0 0 0 1000px var(--bg) inset;
          box-shadow: 0 0 0 1000px var(--bg) inset;
          caret-color: var(--text-primary);
          transition: background-color 9999s ease-in-out 0s;
        }

        .cp-eye-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          padding: 0;
          color: var(--text-secondary);
        }
        .cp-forgot {
          text-align: right;
          margin-top: -6px;
        }
        .cp-forgot a {
          font-size: 12.5px;
          color: var(--blue);
          text-decoration: none;
          font-weight: 500;
        }
        .cp-forgot a:hover { text-decoration: underline; }

        .cp-error {
          margin: 0;
          font-size: 12.5px;
          color: var(--danger);
          font-weight: 500;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 8px;
          padding: 9px 11px;
        }

        .cp-submit-btn {
          margin-top: 2px;
          background: var(--green);
          color: #06110A;
          border: none;
          border-radius: 8px;
          padding: 12px 12px;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .cp-submit-btn:hover:not(:disabled) { background: #35b840; }
        .cp-submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .cp-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .cp-divider {
          height: 1px;
          background: var(--border);
          margin: 22px 0 16px;
        }

        .cp-footnote {
          margin: 0;
          font-size: 11.5px;
          color: var(--text-secondary);
          text-align: center;
        }

        .cp-below-card {
          margin-top: 20px;
          text-align: center;
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        @media (prefers-reduced-motion: reduce) {
          .cp-card { animation: none; }
          .cp-live-dot { animation: none; }
          .cp-input-wrap::after { animation: none; }
          .cp-input-wrap::before { transition: none; }
          .cp-ticker-track { animation: none; }
        }
      `,
        }}
      />

      <main className="cp-login-page">
        <div className="cp-ticker" aria-hidden="true">
          <div className="cp-ticker-track">
            <span>{tickerText}</span>
            <span>{tickerText}</span>
          </div>
        </div>

        <div className="cp-login-center">
        <div className="cp-login-shell">
          <div className="cp-brand-row">
            <div className="cp-brand-mark">CP</div>
            <div className="cp-brand-name">
              CRICKET<span>PRO</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="cp-card" autoComplete="off">
            <div style={{ display: "flex", justifyContent: "center", alignItems:"center" }}>
            <div className=" cp-card-head">
              <h1>Sign in to your account</h1>
            </div>
            </div>

            <div className="cp-form">
              <div>
                <label className="cp-field-label" htmlFor="cp-email">Email address</label>
                <div className="cp-input-wrap">
                  <Mail size={16} color="#8A93A0" />
                  <input
                    id="cp-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="cp-field-label" htmlFor="cp-password">Password</label>
                <div className="cp-input-wrap">
                  <Lock size={16} color="#8A93A0" />
                  <input
                    id="cp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <p className="cp-error">{error}</p>}

              <button type="submit" disabled={loading} className="cp-submit-btn">
                {loading ? "Checking credentials..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
        </div>
      </main>
    </>
  );
}
"use client";

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AdminPageHeader({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--cp-text-primary)" }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#FFFFFF" }}>{subtitle}</p>
        )}
      </div>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: "var(--cp-accent-primary)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "var(--cp-radius-inner)",
            padding: "9px 16px",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          + {actionLabel}
        </button>
      )}
    </div>
  );
}
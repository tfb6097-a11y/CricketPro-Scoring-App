export function LivePill() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--cp-accent-primary)",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--cp-accent-primary)",
          animation: "cp-pulse 1.6s infinite",
        }}
      />
      Live
      <style>{`
        @keyframes cp-pulse {
          0% { box-shadow: 0 0 0 0 rgba(62,207,74,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(62,207,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(62,207,74,0); }
        }
      `}</style>
    </span>
  );
}
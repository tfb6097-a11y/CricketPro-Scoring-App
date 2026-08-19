"use client";

import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: Props) {
  return (
    <div style={{ position: "relative", maxWidth: 280, marginBottom: 16 }}>
      <Search size={15} style={{ position: "absolute", left: 10, top: 9, color: "var(--cp-text-secondary)" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--cp-surface-border)",
          borderRadius: "var(--cp-radius-inner)",
          padding: "8px 12px 8px 32px",
          color: "#0b0e11",
          fontSize: 13,
          width: "100%",
        }}
      />
    </div>
  );
}
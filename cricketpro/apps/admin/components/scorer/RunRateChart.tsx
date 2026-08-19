"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface InningsData { teamName: string; overs: { over: number; runs: number }[]; }

export function RunRateChart({ data }: { data: InningsData[] }) {
  const maxOvers = Math.max(1, ...data.map((d) => d.overs.length));
  const chartData = Array.from({ length: maxOvers }, (_, i) => {
    const row: any = { over: i + 1 };
    data.forEach((d) => {
      const cumulative = d.overs.slice(0, i + 1).reduce((sum, o) => sum + o.runs, 0);
      row[d.teamName] = Number((cumulative / (i + 1)).toFixed(2));
    });
    return row;
  });
  const colors = ["var(--cp-accent-secondary)", "var(--cp-accent-primary)"];

  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Current Run Rate</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--cp-surface-border)" />
          <XAxis dataKey="over" tick={{ fill: "#8A93A0", fontSize: 10 }} />
          <YAxis tick={{ fill: "#8A93A0", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "#151A1F", border: "1px solid #232A31", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.map((d, i) => (
            <Line key={d.teamName} type="monotone" dataKey={d.teamName} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface InningsData { teamName: string; overs: { over: number; runs: number }[]; }

export function ManhattanChart({ data }: { data: InningsData[] }) {
  const maxOvers = Math.max(1, ...data.map((d) => d.overs.length));
  const chartData = Array.from({ length: maxOvers }, (_, i) => {
    const row: any = { over: i + 1 };
    data.forEach((d) => { row[d.teamName] = d.overs[i]?.runs ?? 0; });
    return row;
  });
  const colors = ["var(--cp-accent-secondary)", "var(--cp-accent-primary)"];

  return (
    <div className="cp-card">
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--cp-text-secondary)" }}>Manhattan Chart</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--cp-surface-border)" />
          <XAxis dataKey="over" tick={{ fill: "#8A93A0", fontSize: 10 }} />
          <YAxis tick={{ fill: "#8A93A0", fontSize: 10 }} />
          <Tooltip contentStyle={{ background: "#151A1F", border: "1px solid #232A31", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.map((d, i) => (
            <Bar key={d.teamName} dataKey={d.teamName} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
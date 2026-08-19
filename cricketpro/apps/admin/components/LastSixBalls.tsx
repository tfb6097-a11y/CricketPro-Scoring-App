"use client";

interface BallDisplay {
  label: string; // "4", "6", "W", "1wd", "•"
  isWicket?: boolean;
  isBoundary?: boolean;
}

export function LastSixBalls({ balls }: { balls: BallDisplay[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--cp-text-secondary)]">Last 6 Balls</p>
      <div className="flex gap-1.5">
        {balls.map((b, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              b.isWicket
                ? "bg-[var(--cp-danger)] text-[#0b0e11]"
                : b.isBoundary
                ? "bg-[var(--cp-accent-primary)] text-[#0b0e11]"
                : "border border-[var(--cp-surface-border)] bg-[var(--cp-bg)] text-[var(--cp-text-secondary)]"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
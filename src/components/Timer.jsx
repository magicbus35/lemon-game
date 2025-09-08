import React from "react";

export default function Timer({ timeLeft = 0 }) {
  const m = Math.floor(timeLeft / 60);
  const s = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        style={{
          color: "var(--metric-text)",
          opacity: 0.85,
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        남은 시간
      </div>

      <div
        style={{
          color: "#34d399",           // emerald-400
          fontSize: "1.5rem",         // ↓ 1.75rem → 1.5rem
          fontWeight: 700,            // ↓ 800 → 700
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {m}:{s}
      </div>
    </div>
  );
}

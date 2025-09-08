import React from "react";

export default function ScoreDisplay({ score = 0 }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* 라벨: 살짝 옅은 톤, 과하지 않게 */}
      <div
        style={{
          color: "var(--metric-text)",
          opacity: 0.85,
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        점수
      </div>

      {/* 값: 이전 느낌처럼 덜 두껍고, 크기도 살짝 줄임 */}
      <div
        style={{
          color: "#34d399",           // emerald-400 (부드러운 그린)
          fontSize: "1.5rem",         // ↓ 1.75rem → 1.5rem
          fontWeight: 700,            // ↓ 800 → 700 (원하면 600으로 더 낮춰도 OK)
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
      </div>
    </div>
  );
}

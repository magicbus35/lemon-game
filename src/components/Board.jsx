// src/components/Board.jsx
import React from "react";

/**
 * props:
 * - board: number[][] (null은 지워진 칸)
 * - lemonCells: Set<string>
 * - selectedCells: Set<string>
 * - hoveredCell: string | null
 * - missedCells: Set<string>
 * - onMouseDown(row,col), onMouseOver(row,col)
 * - disabled?: boolean
 * - cellSize?: number  // ← 추가: 기본 34px
 */
export default function Board({
  board = [],
  lemonCells = new Set(),
  selectedCells = new Set(),
  hoveredCell = null,
  missedCells = new Set(),
  onMouseDown,
  onMouseOver,
  disabled = false,
  cellSize = 34,
}) {
  const fs = Math.max(14, Math.round(cellSize * 0.55)); // 숫자 폰트 크기
  const lemonFs = Math.round(cellSize * 0.7); // 레몬 이모지 크기

  return (
    <div
      className="inline-block rounded-lg border-2 border-green-400 bg-white user-select-none select-none"
      style={{ padding: 6 }}
    >
      {board.map((row, r) => (
        <div key={r} className="flex">
          {row.map((num, c) => {
            const key = `${r}-${c}`;
            const isSelected = selectedCells?.has(key);
            const isMissed = missedCells?.has(key);
            const isHovered = hoveredCell === key;
            const isLemon = lemonCells?.has(key);
            const isEmpty = num === null;

            const bg =
              isSelected ? "rgba(59,130,246,0.18)" : // blue-500/18
              isMissed   ? "rgba(239,68,68,0.14)"  : // red-500/14
              isHovered  ? "rgba(34,197,94,0.10)"  : // green-500/10
              "rgba(243,244,246,1)";                 // gray-100

            const border = isMissed ? "1px solid rgba(239,68,68,.7)" : "1px solid rgba(209,213,219,1)"; // gray-300

            return (
              <div
                key={c}
                onMouseDown={() => !disabled && onMouseDown?.(r, c)}
                onMouseOver={() => !disabled && onMouseOver?.(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  lineHeight: `${cellSize}px`,
                  fontSize: fs,
                  textAlign: "center",
                  position: "relative",
                  background: bg,
                  borderRight: border,
                  borderBottom: border,
                  cursor: disabled ? "default" : "crosshair",
                  userSelect: "none",
                }}
              >
                {/* 값 */}
                {!isEmpty && <span style={{ position: "relative", zIndex: 1 }}>{num}</span>}

                {/* 레몬 표시 */}
                {isLemon && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: lemonFs,
                      opacity: 0.9,
                    }}
                  >
                    🍋
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

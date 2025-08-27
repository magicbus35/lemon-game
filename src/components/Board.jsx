// src/components/Board.jsx
import React from "react";

const Board = ({
  board = [],
  lemonCells = new Set(),
  selectedCells = new Set(),
  hoveredCell = null,
  missedCells = new Set(),
  onMouseDown,
  onMouseOver,
  disabled = false,
  cellSize = 36,      // 보드 크기 조절
}) => {
  if (!board || board.length === 0) return null;

  const fontSize = Math.max(14, Math.round(cellSize * 0.56));

  return (
    <div
      className="grid gap-[1px] select-none"
      style={{ gridTemplateColumns: `repeat(${board[0].length}, ${cellSize}px)` }}
    >
      {board.map((row, rowIndex) =>
        row.map((num, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isSelected = selectedCells.has(key);
          const isLemon = lemonCells.has(key);
          const isMissed = missedCells.has(key);
          const isHovered = hoveredCell === key;

          return (
            <div
              key={key}
              onMouseDown={() => !disabled && onMouseDown?.(rowIndex, colIndex)}
              onMouseOver={() => !disabled && onMouseOver?.(rowIndex, colIndex)}
              className={`relative flex items-center justify-center text-sm border
                ${isMissed ? "bg-red-200"
                  : isSelected ? "bg-blue-200"
                  : isHovered ? "bg-green-100"
                  : "bg-gray-100"}
                ${disabled ? "opacity-50" : ""}`}
              style={{ width: cellSize, height: cellSize }}
            >
              {/* 레몬: 원래 위치(롤백). 숫자보다 아래(zIndex 1) */}
              {isLemon && num !== null && (
                <img
                  src="/images/lemon.png"
                  alt="lemon"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ opacity: 0.9, zIndex: 1 }}
                />
              )}

              {/* 숫자: 레몬 위(zIndex 2)로 가독성 유지 */}
              {num !== null && (
                <span
                  className="relative font-bold select-none"
                  style={{ zIndex: 2, fontSize }}
                >
                  {num}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Board;

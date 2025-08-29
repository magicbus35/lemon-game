import React from "react";

const Board = ({
  board = [],
  lemonCells = new Set(),
  selectedCells = new Set(),
  hoveredCell = null,
  missedCells = new Set(),
  onMouseDown,
  onMouseOver,
  // ⬇ 추가: 터치 지원 콜백(옵션)
  onTouchStartCell,
  onTouchMoveCell,
  disabled = false,
  cellSize = 36,
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

          const bg =
            isMissed ? "bg-red-200"
            : isSelected ? "bg-blue-200"
            : isHovered ? "bg-green-100"
            : "bg-gray-100";

          return (
            <div
              key={key}
              onMouseDown={() => !disabled && onMouseDown?.(rowIndex, colIndex)}
              onMouseOver={() => !disabled && onMouseOver?.(rowIndex, colIndex)}
              onTouchStart={(e) => !disabled && onTouchStartCell?.(rowIndex, colIndex, e)}
              onTouchMove={(e) => !disabled && onTouchMoveCell?.(rowIndex, colIndex, e)}
              className={`relative flex items-center justify-center text-sm border ${bg} ${disabled ? "opacity-50" : ""}`}
              style={{ width: cellSize, height: cellSize, touchAction: "none" }}
            >
              {/* 레몬 (원래 위치 유지) */}
              {isLemon && num !== null && (
                <img
                  src="/images/lemon.png"
                  alt="lemon"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ opacity: 0.9, zIndex: 1 }}
                />
              )}

              {/* 숫자 (레몬 위) */}
              {num !== null && (
                <span className="relative font-bold select-none" style={{ zIndex: 2, fontSize }}>
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

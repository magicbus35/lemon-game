import React from "react";

const Board = ({
  board,
  lemonCells,
  selectedCells,
  hoveredCell,
  missedCells,
  onMouseDown,
  onMouseOver,
  disabled,
}) => {
  if (!board || board.length === 0) return null;

  return (
    <div
      className="grid gap-[1px] select-none"
      style={{ gridTemplateColumns: `repeat(${board[0].length}, minmax(0, 1fr))` }}
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
              onMouseDown={() => !disabled && onMouseDown(rowIndex, colIndex)}
              onMouseOver={() => !disabled && onMouseOver(rowIndex, colIndex)}
              className={`relative w-[30px] h-[30px] flex items-center justify-center text-sm border
                ${
                  isMissed
                    ? "bg-red-300"
                    : isSelected
                    ? "bg-yellow-300"
                    : isHovered
                    ? "bg-gray-200"
                    : "bg-white"
                }
                ${disabled ? "opacity-50" : ""}
              `}
            >
              {/* 레몬 배경(숫자가 남아있을 때만 표시) */}
              {isLemon && num !== null && (
                <img
                  src="/images/lemon.png"
                  alt="lemon"
                  className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none"
                />
              )}

              {/* 숫자 */}
              {num !== null ? (
                <span className="relative z-10 font-bold select-none">{num}</span>
              ) : (
                ""
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Board;

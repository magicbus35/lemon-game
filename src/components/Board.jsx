import React from "react";

const Board = ({ board, selectedCells, onMouseDown, onMouseEnter, disabled }) => {
  if (!board || board.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-[1px]"
      style={{ gridTemplateColumns: `repeat(${board[0].length}, minmax(0, 1fr))` }}
    >
      {board.map((row, rowIndex) =>
        row.map((num, colIndex) => {
          const isSelected = selectedCells.has(`${rowIndex}-${colIndex}`);
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              onMouseDown={() => !disabled && onMouseDown(rowIndex, colIndex)}
              onMouseEnter={() => !disabled && onMouseEnter(rowIndex, colIndex)}
              className={`w-[30px] h-[30px] flex items-center justify-center text-sm border
                ${isSelected ? "bg-yellow-300" : "bg-white"}
                ${disabled ? "opacity-50" : ""}`}
            >
              {num !== null ? num : ""}
            </div>
          );
        })
      )}
    </div>
  );
};

export default Board;

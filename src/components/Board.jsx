import React from "react";
import styles from "../styles/Board.module.css";

export default function Board({
  board,
  lemonCells,
  selectedCells,
  hoveredCell,
  missedCells,
  onMouseDown,
  onMouseOver,
  onMouseUpCell,      // ← 추가
  onTouchStartCell,
  onTouchMoveCell,
  onTouchEndCell,     // ← 추가
  disabled,
  cellSize,
}) {
  const rows = board.length;
  const cols = board[0].length;

  const GAP = 2;
  const fontSize = Math.max(12, Math.floor(cellSize * 0.48));
  const gridWidth = cols * cellSize + (cols - 1) * GAP;
  const gridHeight = rows * cellSize + (rows - 1) * GAP;

  const hasSelection = selectedCells && selectedCells.size > 0;
  let overlayRect = null;
  if (hasSelection) {
    let minR = Infinity, minC = Infinity, maxR = -1, maxC = -1;
    selectedCells.forEach((k) => {
      const [r, c] = k.split("-").map(Number);
      if (r < minR) minR = r;
      if (c < minC) minC = c;
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    });
    if (minR !== Infinity) {
      const left = minC * (cellSize + GAP);
      const top = minR * (cellSize + GAP);
      const width = (maxC - minC + 1) * cellSize + (maxC - minC) * GAP;
      const height = (maxR - minR + 1) * cellSize + (maxR - minR) * GAP;
      overlayRect = { left, top, width, height };
    }
  }

  return (
    <div
      className="relative select-none"
      style={{ width: gridWidth, height: gridHeight, margin: "0 auto" }}
    >
      {overlayRect && (
        <div
          className="pointer-events-none absolute rounded-md"
          style={{
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
            border: "2px solid rgba(34,197,94,1)",
            background: "rgba(34,197,94,0.12)",
            zIndex: 3,
          }}
        />
      )}

      <div
        className={styles.boardGrid}
        style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
      >
        {board.map((row, r) =>
          row.map((num, c) => {
            const key = `${r}-${c}`;
            const isLemon = lemonCells.has(key);
            const isSelected = selectedCells.has(key);
            const isMissed = missedCells.has(key);
            const isHovered = hoveredCell === key;

            const handlers = disabled
              ? {}
              : {
                  onMouseDown: (e) => onMouseDown?.(r, c, e),
                  onMouseOver: (e) => onMouseOver?.(r, c, e),
                  onMouseUp:   (e) => onMouseUpCell?.(r, c, e),        // ← 끝 좌표 전달
                  onTouchStart: (e) => onTouchStartCell?.(r, c, e),
                  onTouchMove:  (e) => onTouchMoveCell?.(r, c, e),
                  onTouchEnd:   (e) => onTouchEndCell?.(r, c, e),      // ← 끝 좌표 전달
                };

            const selectedCls = isSelected ? " bg-green-100 ring-2 ring-green-500" : "";
            const hoverCls    = isHovered && !isSelected ? " ring-2 ring-yellow-400" : "";
            const missCls     = isMissed ? " !bg-red-500/70" : ""; // 라이트 모드도 또렷
            const disabledCls = disabled ? " opacity-50 pointer-events-none" : "";

            return (
              <div
                key={key}
                className={`${styles.cell} ${selectedCls} ${hoverCls} ${missCls} ${disabledCls}`}
                style={{ width: cellSize, height: cellSize, touchAction: "none", position: "relative" }}
                {...handlers}
              >
                {isLemon && num !== null && (
                  <img
                    src="/images/lemon.png"
                    alt="lemon"
                    className={styles.lemon}
                    style={{ opacity: 0.9, zIndex: 0 }}
                  />
                )}

                {num !== null && (
                  <span
                    className={isLemon ? styles.numberLemon : styles.number}
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
    </div>
  );
}

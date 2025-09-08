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
  onTouchStartCell,
  onTouchMoveCell,
  disabled,
  cellSize,
}) {
  const rows = board.length;
  const cols = board[0].length;

  // Board.module.css의 gap과 동일
  const GAP = 2;

  const fontSize = Math.max(12, Math.floor(cellSize * 0.48));
  const gridWidth = cols * cellSize + (cols - 1) * GAP;
  const gridHeight = rows * cellSize + (rows - 1) * GAP;

  // 드래그 사각형 오버레이 (선택 범위 박스)
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
      style={{
        width: gridWidth,
        height: gridHeight,
        margin: "0 auto",
      }}
    >
      {/* 드래그 선택 박스 오버레이 */}
      {overlayRect && (
        <div
          className="pointer-events-none absolute rounded-md"
          style={{
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
            border: "2px solid rgba(34,197,94,1)",   // green-500
            background: "rgba(34,197,94,0.12)",     // 연한 초록
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
                  onTouchStart: (e) => onTouchStartCell?.(r, c, e),
                  onTouchMove: (e) => onTouchMoveCell?.(r, c, e),
                };

            const selectedCls = isSelected ? " bg-green-100 ring-2 ring-green-500" : "";
            const hoverCls    = isHovered && !isSelected ? " ring-2 ring-yellow-400" : "";
            const missCls     = isMissed ? " !bg-red-400" : ""; // 빨강 우선권 보장
            const disabledCls = disabled ? " opacity-50 pointer-events-none" : "";

            return (
              <div
                key={key}
                className={`${styles.cell} ${selectedCls} ${hoverCls} ${missCls} ${disabledCls}`}
                style={{ width: cellSize, height: cellSize, touchAction: "none", position: "relative" }}
                {...handlers}
              >
                {/* 레몬(숨기지 않음 — 원본 유지) */}
                {isLemon && num !== null && (
                  <img
                    src="/images/lemon.png"
                    alt="lemon"
                    className={styles.lemon}
                    style={{ opacity: 0.9, zIndex: 0 }}
                  />
                )}

                {/* 숫자 */}
                {num !== null && (
                  <span
                    className={styles.number}
                    style={{ zIndex: 2, fontSize, color: "#000" }}
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

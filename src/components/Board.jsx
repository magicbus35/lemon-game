import React from "react";
import styles from "../styles/Board.module.css";
import { useBirdy } from "../context/BirdyMode";

export default function Board({
  board,
  lemonCells,
  selectedCells,
  hoveredCell,
  missedCells,
  onMouseDown,
  onMouseOver,
  onMouseUpCell,      // ← 끝 좌표 전달
  onTouchStartCell,
  onTouchMoveCell,
  onTouchEndCell,     // ← 끝 좌표 전달
  disabled,
  cellSize,
}) {
  // 🔵 버디 모드 이미지 전환
  const { active: birdy } = useBirdy();
  const lemonImg = birdy ? "/images/birdy.png" : "/images/lemon.png";

  const rows = board?.length ?? 0;
  const cols = rows ? (board[0]?.length ?? 0) : 0;

  const GAP = 2;
  const fontSize = Math.max(12, Math.floor(cellSize * 0.48));
  const gridWidth  = cols * cellSize + Math.max(0, cols - 1) * GAP;
  const gridHeight = rows * cellSize + Math.max(0, rows - 1) * GAP;

  // 드래그 선택 영역(하이라이트 사각형)
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
      const left   = minC * (cellSize + GAP);
      const top    = minR * (cellSize + GAP);
      const width  = (maxC - minC + 1) * cellSize + (maxC - minC) * GAP;
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
            const key        = `${r}-${c}`;
            const isLemon    = lemonCells?.has(key);
            const isSelected = selectedCells?.has(key);
            const isMissed   = missedCells?.has(key);
            const isHovered  = hoveredCell === key;

            const handlers = disabled
              ? {}
              : {
                  onMouseDown:  (e) => onMouseDown?.(r, c, e),
                  onMouseOver:  (e) => onMouseOver?.(r, c, e),
                  onMouseUp:    (e) => onMouseUpCell?.(r, c, e),
                  onTouchStart: (e) => onTouchStartCell?.(r, c, e),
                  onTouchMove:  (e) => onTouchMoveCell?.(r, c, e),
                  onTouchEnd:   (e) => onTouchEndCell?.(r, c, e),
                };

            const selectedCls = isSelected ? " bg-green-100 ring-2 ring-green-500" : "";
            const hoverCls    = isHovered && !isSelected ? " ring-2 ring-yellow-400" : "";
            const missCls     = isMissed ? " !bg-red-500/70" : "";
            const disabledCls = disabled ? " opacity-50 pointer-events-none" : "";

            const numberClass = isLemon ? styles.numberLemon : styles.number;

            return (
              <div
                key={key}
                className={`${styles.cell} ${selectedCls} ${hoverCls} ${missCls} ${disabledCls}`}
                style={{ width: cellSize, height: cellSize, touchAction: "none", position: "relative" }}
                {...handlers}
              >
                {isLemon && num !== null && (
                  <img
                    src={lemonImg}
                    alt="lemon"
                    className={styles.lemon}
                    draggable="false"
                  />
                )}

                {num !== null && (
                  <span className={numberClass} style={{ zIndex: 2, fontSize }}>
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

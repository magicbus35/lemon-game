// src/components/Board.jsx
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

  /* ⛔️ 이중 표시 원인 제거: overlayRect 계산/렌더링 전부 삭제 */

  return (
    <div
      className="relative select-none"
      style={{ width: gridWidth, height: gridHeight, margin: "0 auto" }}
    >
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

            // 선택/호버/미스/비활성 스타일 (Tailwind + CSS Module 혼용 그대로 유지)
            const selectedCls = isSelected ? " bg-green-100 ring-2 ring-green-500" : "";
            const hoverCls    = isHovered && !isSelected ? " ring-2 ring-yellow-400" : "";
            const missCls     = isMissed ? " !bg-red-500/70" : "";
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
                    src={lemonImg}
                    alt="lemon"
                    className={styles.lemon}
                    draggable="false"
                    style={{ opacity: 0.9, zIndex: 0 }}
                  />
                )}

                {num !== null && (
                  <span className={styles.number} style={{ zIndex: 2, fontSize }}>
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

// src/pages/GamePage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Board from "../components/Board";
import Countdown from "../components/Countdown";
import ScoreDisplay from "../components/ScoreDisplay";
import Timer from "../components/Timer";
import { saveScore } from "../services/scoreStore";
import styles from "../styles/GamePage.module.css";

const ROWS = 10;
const COLS = 17;
const GAME_DURATION = 120;

const bonusMessages = [
  "이봐, 친구! 그거 알아? 버디의 본캐는 버디1204라는 놀라운 사실을!",
  '이봐, 친구! 그거 알아? 블레는 무려 카운터를 "못"친다는 놀라운 사실을!',
  "이봐, 친구! 그거 알아? 주급이 무려 200만을 넘는 사람이 있다는 놀라운 사실을!",
];

// 무작위 보드 생성 (1~9)
const generateBoard = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 9) + 1)
  );

// 레몬 칸 무작위 배치
const generateLemonCells = (rows, cols, count = 10) => {
  const maxCount = Math.min(count, rows * cols);
  const all = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push(`${r}-${c}`);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return new Set(all.slice(0, maxCount));
};

/* ----------------------- 보조 유틸 ----------------------- */
// 드래그 시작/끝으로 직사각형 경계 계산
const getRectBounds = (start, end) => {
  if (!start || !end) return null;
  const r1 = Math.min(start.r, end.r);
  const c1 = Math.min(start.c, end.c);
  const r2 = Math.max(start.r, end.r);
  const c2 = Math.max(start.c, end.c);
  return { r1, c1, r2, c2 };
};

// (새 규칙) 직사각형 내부 숫자만 합산: sum, 숫자칸 수, 레몬칸 수
const summarizeRectNumbers = (board, lemonCells, r1, c1, r2, c2) => {
  let sum = 0;
  let numCount = 0;
  let lemonCount = 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const v = board[r][c];
      if (v != null) {
        sum += Number(v);
        numCount += 1;
        if (lemonCells.has(`${r}-${c}`)) lemonCount += 1;
      }
    }
  }
  return { sum, numCount, lemonCount };
};
/* -------------------------------------------------------- */

// (새 규칙) 합=10인 직사각형이 있는지: null은 0으로 취급(무시)
const hasValidMove = (board) => {
  const R = board.length;
  if (!R) return false;
  const C = board[0].length;

  // 숫자 누적합(프리픽스) — null은 0
  const ps = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const nv = board[r][c] == null ? 0 : Number(board[r][c]);
      ps[r + 1][c + 1] = nv + ps[r][c + 1] + ps[r + 1][c] - ps[r][c];
    }
  }
  const rectSum = (r1, c1, r2, c2) =>
    ps[r2 + 1][c2 + 1] - ps[r1][c2 + 1] - ps[r2 + 1][c1] + ps[r1][c1];

  for (let r1 = 0; r1 < R; r1++) {
    for (let c1 = 0; c1 < C; c1++) {
      for (let r2 = r1; r2 < R; r2++) {
        for (let c2 = c1; c2 < C; c2++) {
          if (rectSum(r1, c1, r2, c2) === 10) return true;
        }
      }
    }
  }
  return false;
};

export default function GamePage() {
  const navigate = useNavigate();

  // 🐒 우끼끼 연출 컨테이너/상태
  const containerRef = useRef(null);
  const [monkeys, setMonkeys] = useState([]);

  // 게임 보드/상태
  const [board, setBoard] = useState([]);
  const [lemonCells, setLemonCells] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [hoveredCell, setHoveredCell] = useState(null);
  const hoveredCellRef = useRef(null); // 끝 좌표 보강
  const [missedCells, setMissedCells] = useState(new Set());

  // 드래그
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  // 게임 진행
  const [bonusMessage, setBonusMessage] = useState(bonusMessages[0]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // 점수/닉네임
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState(localStorage.getItem("nickname") || "");
  const NICK_RE = /^(?=.{2,16}$)[가-힣A-Za-z0-9_-]+$/;
  const FORBIDDEN = ["익명", "anonymous", "anon"];
  const trimmedName = useMemo(() => (playerName || "").trim(), [playerName]);
  const isNickValid = useMemo(
    () =>
      trimmedName.length > 0 &&
      NICK_RE.test(trimmedName) &&
      !FORBIDDEN.some((w) => trimmedName.toLowerCase() === w),
    [trimmedName]
  );

  // 🔊 성공 사운드
  const [sfxVol, setSfxVol] = useState(() => {
    const v = Number(localStorage.getItem("sfxVol"));
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.15;
  });
  const successAudioRef = useRef(null);
  useEffect(() => {
    try {
      const a = new Audio("/sound/success.mp3");
      successAudioRef.current = a;
      a.volume = sfxVol;
    } catch {}
  }, []);
  const playSuccess = useCallback(() => {
    const a = successAudioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play();
    } catch {}
  }, []);
  const prevScoreRef = useRef(0);
  useEffect(() => {
    if (typeof score === "number" && score > prevScoreRef.current) playSuccess();
    prevScoreRef.current = typeof score === "number" ? score : prevScoreRef.current;
  }, [score, playSuccess]);
  useEffect(() => {
    localStorage.setItem("sfxVol", String(sfxVol));
    const a = successAudioRef.current;
    if (a) a.volume = sfxVol;
  }, [sfxVol]);

  // 셀 크기(반응형)
  const [cellSize, setCellSize] = useState(36);
  useEffect(() => {
    const applySize = () => {
      const w = window.innerWidth;
      if (w <= 360) setCellSize(26);
      else if (w <= 420) setCellSize(28);
      else if (w <= 480) setCellSize(30);
      else if (w <= 560) setCellSize(32);
      else setCellSize(36);
    };
    applySize();
    window.addEventListener("resize", applySize);
    return () => window.removeEventListener("resize", applySize);
  }, []);

  // 🐒 아이콘 생성
  const sprinkleMonkeys = useCallback((count = 140) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * Math.max(0, width - pad * 2) + pad,
      y: Math.random() * Math.max(0, height - pad * 2) + pad,
      r: Math.floor(Math.random() * 360),
      s: 0.9 + Math.random() * 0.5,
      delay: Math.floor(Math.random() * 500),
    }));
    setMonkeys(items);
  }, []);

  // 게임 시작(카운트다운)
  const startGame = useCallback(() => {
    setGameStarted(false);
    setIsCountingDown(true);
    setCountdown(3);
    setTimeLeft(0);
    setBoard([]);
    setLemonCells(new Set());
    setSelectedCells(new Set());
    setHoveredCell(null);
    hoveredCellRef.current = null;
    setMissedCells(new Set());
    setGameOver(false);
    setScore(0);
    setMonkeys([]);
  }, []);

  // 카운트다운
  useEffect(() => {
    if (!isCountingDown) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((x) => (x > 0 ? x - 1 : 0)), 1000);
      return () => clearTimeout(t);
    }
    setBoard(generateBoard(ROWS, COLS));
    setLemonCells(generateLemonCells(ROWS, COLS, 10));
    setTimeLeft(GAME_DURATION);
    setIsCountingDown(false);
  }, [isCountingDown, countdown]);

  // 카운트다운 끝나면 시작
  useEffect(() => {
    if (!isCountingDown && !gameStarted && timeLeft > 0) setGameStarted(true);
  }, [isCountingDown, gameStarted, timeLeft]);

  // 타이머
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [gameStarted, timeLeft]);

  // (새 규칙) 타임아웃 처리: 빈칸 허용, 숫자칸만 미스 마킹
  useEffect(() => {
    if (timeLeft !== 0 || !gameStarted || board.length === 0 || gameOver) return;

    const R = board.length, C = board[0].length;
    const missed = new Set();

    // 모든 직사각형 검사: 숫자만 합산해서 10이면, 그 직사각형 내의 '숫자칸'만 missed에 추가
    for (let r1 = 0; r1 < R; r1++) {
      for (let c1 = 0; c1 < C; c1++) {
        for (let r2 = r1; r2 < R; r2++) {
          for (let c2 = c1; c2 < C; c2++) {
            let sum = 0;
            for (let r = r1; r <= r2; r++) {
              for (let c = c1; c <= c2; c++) {
                const v = board[r][c];
                if (v != null) sum += Number(v);
              }
            }
            if (sum === 10) {
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  if (board[r][c] != null) missed.add(`${r}-${c}`); // 숫자칸만
                }
              }
            }
          }
        }
      }
    }

    setMissedCells(missed);
    setSelectedCells(new Set());
    setHoveredCell(null);
    hoveredCellRef.current = null;
    setGameStarted(false);
    setGameOver(true);
  }, [timeLeft, gameStarted, board, gameOver]);

  // 드래그
  const onDragStart = useCallback((r, c) => {
    setIsDragging(true);
    const ds = { r, c };
    setDragStart(ds);
    setSelectedCells(new Set([`${r}-${c}`]));
    setHoveredCell(`${r}-${c}`);
    hoveredCellRef.current = { r, c };
  }, []);

  const onDragOver = useCallback(
    (r, c) => {
      if (!isDragging || !dragStart) return;
      const { r: r1, c: c1 } = dragStart;
      const r2 = r, c2 = c;
      const ns = new Set();
      for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++) {
        for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++) {
          ns.add(`${rr}-${cc}`);
        }
      }
      setSelectedCells(ns);
      setHoveredCell(`${r}-${c}`);
      hoveredCellRef.current = { r, c };
    },
    [isDragging, dragStart]
  );

  // (새 규칙) 판정: 빈칸 허용, 점수=숫자칸 수 + 레몬×4, 제거=숫자칸만
  const onDragEnd = useCallback(
    (endRC) => {
      setIsDragging(false);
      const ds = dragStart;
      setDragStart(null);

      if (!board.length || !ds) {
        setSelectedCells(new Set());
        setHoveredCell(null);
        hoveredCellRef.current = null;
        return;
      }

      const end = endRC || hoveredCellRef.current || { r: ds.r, c: ds.c };
      const bounds = getRectBounds(ds, end);
      if (!bounds) {
        setSelectedCells(new Set());
        setHoveredCell(null);
        hoveredCellRef.current = null;
        return;
      }
      const { r1, c1, r2, c2 } = bounds;

      // 숫자만 합산해서 10인지 확인 + 점수 요소들 집계
      const { sum, numCount, lemonCount } = summarizeRectNumbers(
        board,
        lemonCells,
        r1,
        c1,
        r2,
        c2
      );

      if (sum === 10 && numCount > 0) {
        const gained = numCount + lemonCount * 4; // 새 규칙 점수
        const next = board.map((row) => [...row]);
        const nextLemons = new Set(lemonCells);

        // 숫자칸만 제거(null) + 레몬도 제거
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            if (next[r][c] != null) {
              next[r][c] = null;
              nextLemons.delete(`${r}-${c}`);
            }
          }
        }

        setScore((s) => s + gained);
        setBoard(next);
        setLemonCells(nextLemons);

        setBonusMessage((prev) => {
          const i = bonusMessages.indexOf(prev);
          return bonusMessages[(i + 1) % bonusMessages.length];
        });

        setTimeout(() => {
          const still = next.map((row) => [...row]);
          if (!hasValidMove(still)) {
            setBoard(generateBoard(ROWS, COLS));
            setLemonCells(generateLemonCells(ROWS, COLS, 10));
          }
        }, 50);
      }

      setSelectedCells(new Set());
      setHoveredCell(null);
      hoveredCellRef.current = null;
    },
    [board, lemonCells, dragStart]
  );

  // 각 셀에서 직접 mouseup/touchend으로 끝 좌표 전달
  const handleMouseUpCell = (r, c) => onDragEnd({ r, c });
  const handleTouchEndCell = (r, c) => onDragEnd({ r, c });

  // ✅ 우끼끼(포기) — 원숭이 뿌리고 즉시 종료
  const handleGiveUp = useCallback(() => {
    if (!gameStarted || gameOver) return;
    sprinkleMonkeys(140);
    setTimeLeft(0);
  }, [gameStarted, gameOver, sprinkleMonkeys]);

  // 드래그 종료 리스너(보드 밖에서 놓을 때 대비)
  useEffect(() => {
    if (!isDragging) return;
    const up = () => onDragEnd();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [isDragging, onDragEnd]);

  const handleMouseDown = (r, c) => onDragStart(r, c);
  const handleMouseOver = (r, c) => onDragOver(r, c);
  const handleTouchStart = (r, c) => onDragStart(r, c);
  const handleTouchMove = (r, c) => onDragOver(r, c);

  // 점수 저장 → 저장 성공 시 랭킹 페이지로 이동
  const handleSaveScore = async () => {
    if (!isNickValid) {
      alert("닉네임 형식이 올바르지 않습니다. (2~16자, 한글/영문/숫자/_-)");
      return;
    }
    localStorage.setItem("nickname", trimmedName);
    try {
      const ok = await saveScore({ nickname: trimmedName, score });
      if (ok) {
        alert("랭킹 저장 완료!");
        navigate("/ranking");
      } else {
        alert("저장 실패. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const isPreGame = useMemo(
    () => !gameStarted && !isCountingDown && board.length === 0,
    [gameStarted, isCountingDown, board.length]
  );

  return (
    <div className={styles.page}>
      <div className={styles.container} ref={containerRef}>
        {/* 🐒 우끼끼 아이콘들 */}
        {monkeys.map((m) => (
          <span
            key={m.id}
            className={styles.monkey}
            style={{
              left: m.x,
              top: m.y,
              transform: `rotate(${m.r}deg) scale(${m.s})`,
              animationDelay: `${m.delay}ms`,
            }}
            aria-hidden
          >
            🐒
          </span>
        ))}

        <h1 className={styles.title}>🍋 레몬게임</h1>

        <div className={`${styles.card} ${styles.boardCard}`}>
          {isPreGame ? (
            <div className="text-center">
              <p className={styles.leadText}>
                숫자 블록을 드래그해 <strong>합이 10</strong>이 되는 직사각형을 찾으세요.
              </p>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={startGame}>
                게임 시작
              </button>
            </div>
          ) : (
            <>
              {/* 중앙(점수/타이머) + 우측(볼륨) */}
              <div className={styles.statusBar}>
                <div className={styles.statusRow}>
                  <div className={styles.metricCard}>
                    <ScoreDisplay score={score} />
                  </div>
                  <div className={styles.metricCard}>
                    <Timer timeLeft={timeLeft} />
                  </div>
                </div>
                <div className={styles.volWrap}>
                  <span className={styles.volLabel}>🔊</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sfxVol}
                    onChange={(e) => setSfxVol(Number(e.target.value))}
                    className={styles.volSlider}
                    aria-label="효과음 볼륨"
                    style={{ width: 140 }}
                  />
                  <span className={styles.volLabel}>{(sfxVol * 100).toFixed(0)}%</span>
                </div>
              </div>

              {isCountingDown && countdown > 0 && (
                <div className={styles.countdownRow}>
                  <Countdown countdown={countdown} />
                </div>
              )}

              {board.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className={`${styles.boardWrap} ${styles.boardSurface}`}>
                    <Board
                      board={board}
                      lemonCells={lemonCells}
                      selectedCells={selectedCells}
                      hoveredCell={hoveredCell}
                      missedCells={missedCells}
                      onMouseDown={handleMouseDown}
                      onMouseOver={handleMouseOver}
                      onMouseUpCell={handleMouseUpCell}       // 끝 좌표 전달
                      onTouchStartCell={handleTouchStart}
                      onTouchMoveCell={handleTouchMove}
                      onTouchEndCell={handleTouchEndCell}     // 끝 좌표 전달
                      disabled={!gameStarted || isCountingDown || timeLeft <= 0}
                      cellSize={cellSize}
                    />
                  </div>

                  <p className={`${styles.rulesText} mt-2 text-center text-xs italic`}>
                    "{bonusMessage}"
                  </p>

                  {/* 진행 중: 우끼끼(포기) + 다시하기 */}
                  {gameStarted && !isCountingDown && !gameOver && (
                    <div className="mt-4 flex gap-2">
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={handleGiveUp}
                        aria-label="포기하고 즉시 종료"
                        title="포기하고 즉시 종료"
                      >
                        🐒 우끼끼
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.textAlwaysBlack}`}
                        onClick={startGame}
                      >
                        다시하기
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 종료 화면 */}
              {!gameStarted && !isCountingDown && gameOver && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <p className="text-lg font-semibold">게임 종료!</p>
                  <p className={styles.leadText}>
                    최종 점수: <span className="font-bold">{score}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      className="border rounded px-3 py-2"
                      placeholder="닉네임 (2~16자, 한글/영문/숫자/_-)"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.buttonBlackText}`}
                      onClick={handleSaveScore}
                    >
                      점수 저장
                    </button>
                  </div>

                  <button className={`${styles.btn} ${styles.btnPrimary} mt-2`} onClick={startGame}>
                    다시하기
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 규칙 카드 */}
        <div className={styles.rulesCard}>
          <h3 className="text-lg font-semibold mb-3">게임 규칙</h3>
          <ul className={`${styles.rulesText} space-y-2 text-sm`}>
            <RuleItem index="1" text="드래그로 사각형을 선택해 숫자의 합만 10이면 성공입니다. (빈칸 허용)" />
            <RuleItem index="2" text="레몬 칸은 +4 보너스가 적용됩니다." />
            <RuleItem index="3" text="정답 시 숫자칸만 사라집니다. (빈칸은 그대로)" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ index, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className={styles.ruleBadge}>{index}</span>
      <p className="leading-7">{text}</p>
    </li>
  );
}

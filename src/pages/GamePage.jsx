import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 추가
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

// ✅ 직사각형 합이 10이고 내부에 null이 없어야 유효
const hasValidMove = (board) => {
  const R = board.length;
  const C = board[0].length;

  const sumPS = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  const nullPS = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const v = board[r][c];
      sumPS[r + 1][c + 1] =
        (v ?? 0) + sumPS[r][c + 1] + sumPS[r + 1][c] - sumPS[r][c];
      nullPS[r + 1][c + 1] =
        (v == null ? 1 : 0) + nullPS[r][c + 1] + nullPS[r + 1][c] - nullPS[r][c];
    }
  }

  const rect = (ps, r1, c1, r2, c2) =>
    ps[r2 + 1][c2 + 1] - ps[r1][c2 + 1] - ps[r2 + 1][c1] + ps[r1][c1];

  for (let r1 = 0; r1 < R; r1++) {
    for (let c1 = 0; c1 < C; c1++) {
      for (let r2 = r1; r2 < R; r2++) {
        for (let c2 = c1; c2 < C; c2++) {
          const sum = rect(sumPS, r1, c1, r2, c2);
          const nullCnt = rect(nullPS, r1, c1, r2, c2);
          if (sum === 10 && nullCnt === 0) return true;
        }
      }
    }
  }
  return false;
};

export default function GamePage() {
  const navigate = useNavigate(); // ✅ 추가

  // 게임 보드/상태
  const [board, setBoard] = useState([]);
  const [lemonCells, setLemonCells] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [hoveredCell, setHoveredCell] = useState(null);
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
  const trimmedName = (playerName || "").trim();
  const isNickValid =
    trimmedName.length > 0 &&
    NICK_RE.test(trimmedName) &&
    !FORBIDDEN.some((w) => trimmedName.toLowerCase() === w);

  // 🔊 성공 사운드 볼륨 (기본 0.15)
  const [sfxVol, setSfxVol] = useState(() => {
    const v = Number(localStorage.getItem("sfxVol"));
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.15;
  });

  // 셀 크기 반응형
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

  // 효과음
  const successAudioRef = useRef(null);
  useEffect(() => {
    try {
      const a = new Audio("/sound/success.mp3");
      successAudioRef.current = a;
      a.volume = sfxVol;
    } catch {}
  }, []); // 1회

  const playSuccess = () => {
    const a = successAudioRef.current;
    if (!a) return;
    try { a.currentTime = 0; a.play(); } catch {}
  };
  const prevScoreRef = useRef(0);
  useEffect(() => {
    if (typeof score === "number" && score > prevScoreRef.current) playSuccess();
    prevScoreRef.current = typeof score === "number" ? score : prevScoreRef.current;
  }, [score]);

  // 볼륨 반영
  useEffect(() => {
    localStorage.setItem("sfxVol", String(sfxVol));
    const a = successAudioRef.current;
    if (a) a.volume = sfxVol;
  }, [sfxVol]);

  // 게임 시작(카운트다운)
  const startGame = () => {
    setGameStarted(false);
    setIsCountingDown(true);
    setCountdown(3);
    setTimeLeft(0);
    setBoard([]);
    setLemonCells(new Set());
    setSelectedCells(new Set());
    setHoveredCell(null);
    setMissedCells(new Set());
    setGameOver(false);
    setScore(0);
  };

  // 카운트다운
  useEffect(() => {
    if (!isCountingDown) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((x) => (x > 0 ? x - 1 : 0)), 1000);
      return () => clearTimeout(t);
    } else if (isCountingDown && countdown === 0) {
      setBoard(generateBoard(ROWS, COLS));
      setLemonCells(generateLemonCells(ROWS, COLS, 10));
      setTimeLeft(GAME_DURATION);
      setIsCountingDown(false);
    }
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

  // ✅ 타임아웃: 빈칸 포함 직사각형 제외, 숫자칸만 missed
  useEffect(() => {
    if (timeLeft === 0 && gameStarted && board.length > 0 && !gameOver) {
      const snap = board.map((row) => [...row]);
      const R = snap.length, C = snap[0].length;
      const missed = new Set();

      for (let r1 = 0; r1 < R; r1++) {
        for (let c1 = 0; c1 < C; c1++) {
          for (let r2 = r1; r2 < R; r2++) {
            for (let c2 = c1; c2 < C; c2++) {
              let sum = 0;
              let hasNull = false;
              for (let r = r1; r <= r2 && !hasNull; r++) {
                for (let c = c1; c <= c2; c++) {
                  const v = snap[r][c];
                  if (v == null) { hasNull = true; break; }
                  sum += v;
                }
              }
              if (!hasNull && sum === 10) {
                for (let r = r1; r <= r2; r++) {
                  for (let c = c1; c <= c2; c++) {
                    missed.add(`${r}-${c}`);
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
      setGameStarted(false);  // ✅ 종료 화면 보이게
      setGameOver(true);
    }
  }, [timeLeft, gameStarted, board, gameOver]);

  // 드래그
  const onDragStart = (r, c) => {
    setIsDragging(true);
    setDragStart({ r, c });
    setSelectedCells(new Set([`${r}-${c}`]));
  };
  const onDragOver = (r, c) => {
    if (!isDragging || !dragStart) return;
    const { r: r1, c: c1 } = dragStart;
    const r2 = r, c2 = c;
    const ns = new Set();
    for (let rr = Math.min(r1, r2); rr <= Math.max(r1, r2); rr++)
      for (let cc = Math.min(c1, c2); cc <= Math.max(c1, c2); cc++)
        ns.add(`${rr}-${cc}`);
    setSelectedCells(ns);
    setHoveredCell(`${r}-${c}`);
  };
  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    if (!board.length) {
      setSelectedCells(new Set());
      setHoveredCell(null);
      return;
    }
    let sum = 0;
    let gained = 0;
    selectedCells.forEach((key) => {
      const [r, c] = key.split("-").map(Number);
      const val = board[r][c];
      if (val !== null) {
        sum += val;
        gained += 1;
        if (lemonCells.has(key)) gained += 4;
      }
    });
    if (sum === 10) {
      setScore((s) => s + gained);
      const next = board.map((row, r) =>
        row.map((num, c) => (selectedCells.has(`${r}-${c}`) ? null : num))
      );
      setBoard(next);
      const nextLemons = new Set(lemonCells);
      selectedCells.forEach((key) => nextLemons.delete(key));
      setLemonCells(nextLemons);
      setBonusMessage((prev) => {
        const i = bonusMessages.indexOf(prev);
        const j = (i + 1) % bonusMessages.length;
        return bonusMessages[j];
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
  }, [board, lemonCells, selectedCells]);

  const handleMouseDown = (r, c) => onDragStart(r, c);
  const handleMouseOver = (r, c) => onDragOver(r, c);
  const handleMouseUpAnywhere = useCallback(() => onDragEnd(), [onDragEnd]);
  useEffect(() => {
    const up = () => handleMouseUpAnywhere();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [handleMouseUpAnywhere]);

  const handleTouchStart = (r, c) => onDragStart(r, c);
  const handleTouchMove = (r, c) => onDragOver(r, c);

  // 점수 저장 → 저장 성공 시 랭킹 페이지로 이동
  const handleSaveScore = async () => {
    const trimmed = (playerName || "").trim();
    const okForm =
      trimmed.length > 0 &&
      NICK_RE.test(trimmed) &&
      !FORBIDDEN.some((w) => trimmed.toLowerCase() === w);

    if (!okForm) {
      alert("닉네임 형식이 올바르지 않습니다. (2~16자, 한글/영문/숫자/_-)");
      return;
    }

    localStorage.setItem("nickname", trimmed);
    try {
      const ok = await saveScore({ nickname: trimmed, score });
      if (ok) {
        alert("랭킹 저장 완료!");
        navigate("/ranking"); // ✅ 여기서 이동
      } else {
        alert("저장 실패. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const isPreGame = !gameStarted && !isCountingDown && board.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>🍋 레몬게임</h1>

        <div className={`${styles.card} ${styles.boardCard}`}>
          {isPreGame ? (
            <div className="text-center">
              <p className="text-gray-700 mb-4">
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
                  <ScoreDisplay score={score} />
                  <Timer timeLeft={timeLeft} />
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
                  <span className={styles.volLabel}>
                    {(sfxVol * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {isCountingDown && countdown > 0 && (
                <div className={styles.countdownRow}>
                  <Countdown countdown={countdown} />
                </div>
              )}

              {board.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className={styles.boardWrap}>
                    <Board
                      board={board}
                      lemonCells={lemonCells}
                      selectedCells={selectedCells}
                      hoveredCell={hoveredCell}
                      missedCells={missedCells}
                      onMouseDown={handleMouseDown}
                      onMouseOver={handleMouseOver}
                      onTouchStartCell={handleTouchStart}
                      onTouchMoveCell={handleTouchMove}
                      disabled={!gameStarted || isCountingDown || timeLeft <= 0}
                      cellSize={cellSize}
                    />
                  </div>

                  <p className="mt-2 text-center text-gray-400 text-xs italic">
                    "{bonusMessage}"
                  </p>

                  {/* 진행 중 다시하기 */}
                  {gameStarted && !isCountingDown && !gameOver && (
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} mt-4`}
                      onClick={startGame}
                    >
                      다시하기
                    </button>
                  )}
                </div>
              )}

              {/* 종료 화면 */}
              {!gameStarted && !isCountingDown && gameOver && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <p className="text-lg font-semibold">게임 종료!</p>
                  <p className="text-gray-700">
                    최종 점수: <span className="font-bold">{score}</span>
                  </p>

                  {/* 닉네임 입력 + 점수 저장 */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      className="border rounded px-3 py-2"
                      placeholder="닉네임 (2~16자, 한글/영문/숫자/_-)"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={handleSaveScore}
                    >
                      점수 저장
                    </button>
                  </div>

                  {/* 종료 후 다시하기 */}
                  <button
                    className={`${styles.btn} ${styles.btnPrimary} mt-2`}
                    onClick={startGame}
                  >
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
          <ul className="space-y-2 text-sm text-gray-700">
            <RuleItem index="1" text="드래그로 사각형을 선택해 숫자의 합이 10이 되면 성공입니다." />
            <RuleItem index="2" text="레몬 칸은 추가 점수를 줍니다." />
            <RuleItem index="3" text="120초 안에 더 높은 점수를 노려보세요!" />
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

// src/pages/GamePage.jsx
import React, { useState, useEffect, useRef } from "react";
import Board from "../components/Board";
import Countdown from "../components/Countdown";
import ScoreDisplay from "../components/ScoreDisplay";
import Timer from "../components/Timer";
import { saveScore } from "../services/scoreStore";

const ROWS = 10;
const COLS = 17;
const GAME_DURATION = 120; // 테스트 시 20 등으로 변경

const bonusMessages = [
  "이봐, 친구! 그거 알아? 버디의 본캐는 무려 버디1204라는 놀라운 사실을!",
  '이봐, 친구! 그거 알아? 블레는 무려 카운터를 "못"친다는 놀라운 사실을!',
  "이봐, 친구! 그거 알아? 주급이 200만을 넘는 사람이 있다는 놀라운 사실을!",
];

const generateBoard = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 9) + 1)
  );

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

const hasValidMove = (board) => {
  const R = board.length;
  const C = board[0].length;
  const ps = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
    ps[r + 1][c + 1] = (board[r][c] || 0) + ps[r][c + 1] + ps[r + 1][c] - ps[r][c];
  const sumRect = (r1, c1, r2, c2) =>
    ps[r2 + 1][c2 + 1] - ps[r1][c2 + 1] - ps[r2 + 1][c1] + ps[r1][c1];
  for (let r1 = 0; r1 < R; r1++)
    for (let c1 = 0; c1 < C; c1++)
      for (let r2 = r1; r2 < R; r2++)
        for (let c2 = c1; c2 < C; c2++)
          if (sumRect(r1, c1, r2, c2) === 10) return true;
  return false;
};

const GamePage = () => {
  const [board, setBoard] = useState([]);
  const [lemonCells, setLemonCells] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [hoveredCell, setHoveredCell] = useState(null);
  const [missedCells, setMissedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [bonusMessage, setBonusMessage] = useState("");

  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");

  // ✅ 닉네임 검증 규칙
  const NICK_RE = /^(?=.{2,16}$)[가-힣A-Za-z0-9_-]+$/;
  const FORBIDDEN = ["익명", "anonymous", "anon"];
  const trimmedName = (playerName || "").trim();
  const isNickValid =
    trimmedName.length > 0 &&
    NICK_RE.test(trimmedName) &&
    !FORBIDDEN.some((w) => trimmedName.toLowerCase() === w);

  // 성공 사운드 프리로드 + 점수 증가 시 재생(useEffect)
  const successAudioRef = useRef(null);
  useEffect(() => {
    try {
      const a = new Audio("/sound/success.mp3");
      a.preload = "auto";
      a.load();
      successAudioRef.current = a;
    } catch {
      // 무시
    }
  }, []);
  const playSuccess = () => {
    try {
      const a = successAudioRef.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
    } catch {
      // 무시
    }
  };
  const prevScoreRef = useRef(0);
  useEffect(() => {
    const current = score;
    if (typeof current === "number" && current > prevScoreRef.current) {
      playSuccess();
    }
    prevScoreRef.current = typeof current === "number" ? current : prevScoreRef.current;
  }, [score]);

  // 🔒 첫 로드시 자동 시작(StrictMode 2회 렌더 가드)
  const bootedRef = useRef(false);
  useEffect(() => {
    if (!bootedRef.current) {
      bootedRef.current = true;
      startGame();
    }
  }, []);

  const startGame = () => {
    setScore(0);
    if (prevScoreRef) prevScoreRef.current = 0; // 점수 감지 기준 초기화
    setBoard([]);
    setLemonCells(new Set());
    setSelectedCells(new Set());
    setHoveredCell(null);
    setMissedCells(new Set());
    setDragStart(null);
    setIsCountingDown(true);
    setCountdown(3);
    setGameStarted(false);
    setTimeLeft(0);
    setGameOver(false);
    setPlayerName("");
    setBonusMessage(bonusMessages[Math.floor(Math.random() * bonusMessages.length)]);
  };

  // ⏳ 카운트다운
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (isCountingDown && countdown === 0) {
      setBoard(generateBoard(ROWS, COLS));
      setLemonCells(generateLemonCells(ROWS, COLS, 10));
      setGameStarted(true);
      setTimeLeft(GAME_DURATION);
      setIsCountingDown(false);
    }
  }, [isCountingDown, countdown]);

  // ⏱ 타이머(interval) — 안정화
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((x) => (x > 0 ? x - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [gameStarted, timeLeft]);

  // 🟥 종료 시 놓친 정답 스냅샷
  useEffect(() => {
    if (timeLeft === 0 && gameStarted) {
      const snap = board.map((row) => [...row]);
      const R = snap.length, C = snap[0].length;
      const missed = new Set();
      for (let r1 = 0; r1 < R; r1++) {
        for (let c1 = 0; c1 < C; c1++) {
          for (let r2 = r1; r2 < R; r2++) {
            for (let c2 = c1; c2 < C; c2++) {
              let sum = 0; const cells = [];
              for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                  if (snap[r][c] !== null) { sum += snap[r][c]; cells.push(`${r}-${c}`); }
                }
              }
              if (sum === 10) cells.forEach((k) => missed.add(k));
            }
          }
        }
      }
      setMissedCells(missed);
      setGameOver(true);
    }
  }, [timeLeft, gameStarted, board]);

  // 🖱️ 드래그 종료
  useEffect(() => {
    const up = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setDragStart(null);
      if (selectedCells.size === 0) return;

      let sum = 0;
      let gained = 0; // 블록 수 + 레몬 보너스(+4)
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
        selectedCells.forEach((k) => nextLemons.delete(k));
        setLemonCells(nextLemons);

        // 성공음은 score 변화 useEffect에서 재생됨
        // (직접 재생을 원하면 아래 한 줄을 해제하세요)
        // new Audio("/sound/success.mp3").play();
      }
      setSelectedCells(new Set());
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [isDragging, selectedCells, board, lemonCells]);

  // ♻️ 보드 변경 시 유효해 검사 → 정답 없으면 즉시 리셋
  useEffect(() => {
    if (gameStarted && !gameOver && board.length > 0) {
      if (!hasValidMove(board)) {
        setBoard(generateBoard(ROWS, COLS));
        setLemonCells(generateLemonCells(ROWS, COLS, 10));
      }
    }
  }, [board, gameStarted, gameOver]);

  // 드래그 시작/진행
  const handleMouseDown = (row, col) => {
    if (!gameStarted || isCountingDown || timeLeft <= 0) return;
    setIsDragging(true);
    setDragStart({ row, col });
    setSelectedCells(new Set([`${row}-${col}`]));
  };
  const handleMouseOver = (row, col) => {
    setHoveredCell(`${row}-${col}`);
    if (isDragging && dragStart) {
      const r1 = Math.min(dragStart.row, row);
      const r2 = Math.max(dragStart.row, row);
      const c1 = Math.min(dragStart.col, col);
      const c2 = Math.max(dragStart.col, col);
      const ns = new Set();
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ns.add(`${r}-${c}`);
      setSelectedCells(ns);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">🍋 레몬게임</h1>

      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-md flex flex-col items-center">
        {/* 점수/타이머 */}
        <div className="flex justify-center gap-8 mb-6">
          <ScoreDisplay score={score} />
          <Timer timeLeft={timeLeft} />
        </div>

        {/* 카운트다운 오버레이 */}
        {isCountingDown && countdown > 0 && <Countdown countdown={countdown} />}

        {/* 보드 */}
        {board.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="p-2 bg-green-100 border-2 border-green-400 rounded-lg">
              <Board
                board={board}
                lemonCells={lemonCells}
                selectedCells={selectedCells}
                hoveredCell={hoveredCell}
                missedCells={missedCells}
                onMouseDown={handleMouseDown}
                onMouseOver={handleMouseOver}
                disabled={!gameStarted || isCountingDown || timeLeft <= 0}
              />
            </div>

            {/* 보너스 문구(작고 은은하게) */}
            <p className="mt-2 text-center text-gray-400 text-xs italic">"{bonusMessage}"</p>
          </div>
        )}

        {/* 종료 UI */}
        {gameOver && (
          <div className="mt-6 bg-white border rounded-lg p-6 shadow text-center">
            <p className="text-xl font-bold mb-4">게임 종료! 🍋</p>
            <p className="text-lg mb-2">
              최종 점수: <span className="text-green-600 font-bold">{score}</span>
            </p>

            {/* 닉네임 입력 + 등록 버튼 */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="2~16자, 한/영/숫자/_/- (공백 불가)"
                maxLength={16}
                className="border px-3 py-2 rounded w-60"
              />

              {/* 형식 경고 */}
              {trimmedName.length > 0 && !isNickValid && (
                <p className="text-red-600 text-sm">
                  닉네임 형식이 올바르지 않습니다. (2~16자, 한/영/숫자/_/-, 공백 불가, “익명/anonymous/anon” 금지)
                </p>
              )}

              <button
                onClick={async () => {
                  if (!isNickValid) {
                    alert("닉네임 형식이 올바르지 않습니다.");
                    return;
                  }
                  try {
                    const ok = await saveScore({ nickname: trimmedName, score });
                    if (ok) {
                      // (옵션) 마지막 등록 닉 저장 — 랭킹 페이지에서 강조 표시 등에 쓸 수 있음
                      try { sessionStorage.setItem("lemon_last_nick", trimmedName); } catch {}

                      // ✅ 저장 성공 시 자동 이동
                      window.location.href = "/ranking";
                      // SPA 방식으로 하고 싶다면:
                      // import { useNavigate } from "react-router-dom";
                      // const navigate = useNavigate();
                      // navigate("/ranking", { replace: true });
                    } else {
                      alert("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
                    }
                  } catch (err) {
                    console.error(err);
                    alert("등록 중 오류가 발생했습니다.");
                  }
                }}
                disabled={!isNickValid}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                등록
              </button>

            </div>

            {/* 이동/재시작 */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => { window.location.href = "/ranking"; }}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                🏆 랭킹 보기
              </button>

              <button
                onClick={startGame}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                🍋 다시하기
              </button>
            </div>
          </div>
        )}

        {/* 게임 중 빠른 리트 */}
        {gameStarted && !gameOver && (
          <div className="mt-6">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              🍋 다시하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;

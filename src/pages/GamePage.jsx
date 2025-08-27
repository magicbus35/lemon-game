import React, { useState, useEffect, useRef } from "react";
import Board from "../components/Board";
import Countdown from "../components/Countdown";
import ScoreDisplay from "../components/ScoreDisplay";
import Timer from "../components/Timer";
import { saveScore } from "../services/scoreStore";

const ROWS = 10;
const COLS = 17;
const GAME_DURATION = 120;

const bonusMessages = [
  "이봐, 친구! 그거 알아? 버디의 본캐는 버디1204라는 놀라운 사실을!",
  '이봐, 친구! 그거 알아? 블레는 무려 카운터를 "못"친다는 놀라운 사실을!',
  "이봐, 친구! 그거 알아? 주급이 무려 200만을 넘는 사람이 있다는 놀라운 사실을!",
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

export default function GamePage() {
  // 보드/게임 상태
  const [board, setBoard] = useState([]);
  const [lemonCells, setLemonCells] = useState(new Set());
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [hoveredCell, setHoveredCell] = useState(null);
  const [missedCells, setMissedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);      // ← 시작 버튼 누른 후 true
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [bonusMessage, setBonusMessage] = useState("");

  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");

  // 닉네임 검증
  const NICK_RE = /^(?=.{2,16}$)[가-힣A-Za-z0-9_-]+$/;
  const FORBIDDEN = ["익명", "anonymous", "anon"];
  const trimmedName = (playerName || "").trim();
  const isNickValid =
    trimmedName.length > 0 &&
    NICK_RE.test(trimmedName) &&
    !FORBIDDEN.some((w) => trimmedName.toLowerCase() === w);

  // 성공 사운드
  const successAudioRef = useRef(null);
  useEffect(() => {
    try {
      const a = new Audio("/sound/success.mp3");
      a.preload = "auto";
      a.load();
      successAudioRef.current = a;
    } catch {}
  }, []);
  const playSuccess = () => {
    try {
      const a = successAudioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } catch {}
  };
  const prevScoreRef = useRef(0);
  useEffect(() => {
    if (typeof score === "number" && score > prevScoreRef.current) playSuccess();
    prevScoreRef.current = typeof score === "number" ? score : prevScoreRef.current;
  }, [score]);

  // ✅ 자동 시작 제거: 처음엔 대기 화면(규칙 + 시작 버튼)만 보여줌
  const startGame = () => {
    setScore(0);
    prevScoreRef.current = 0;
    setBoard([]);
    setLemonCells(new Set());
    setSelectedCells(new Set());
    setHoveredCell(null);
    setMissedCells(new Set());
    setDragStart(null);
    setIsCountingDown(true);
    setCountdown(3);
    setGameStarted(true);            // ← “시작 버튼” 눌렀음을 표시
    setTimeLeft(0);
    setGameOver(false);
    setPlayerName("");
    setBonusMessage(bonusMessages[Math.floor(Math.random() * bonusMessages.length)]);
  };

  // 카운트다운 → 보드 생성
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (isCountingDown && countdown === 0) {
      setBoard(generateBoard(ROWS, COLS));
      setLemonCells(generateLemonCells(ROWS, COLS, 10));
      setTimeLeft(GAME_DURATION);
      setIsCountingDown(false);
    }
  }, [isCountingDown, countdown]);

  // 타이머
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [gameStarted, timeLeft]);

  // 타임업 시 놓친 정답 표시
  useEffect(() => {
    if (timeLeft === 0 && gameStarted && board.length > 0 && !gameOver) {
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
  }, [timeLeft, gameStarted, board, gameOver]);

  // 드래그 종료
  useEffect(() => {
    const up = () => {
      if (!isDragging) return;
      setIsDragging(false);
      setDragStart(null);
      if (selectedCells.size === 0) return;

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
        selectedCells.forEach((k) => nextLemons.delete(k));
        setLemonCells(nextLemons);
      }
      setSelectedCells(new Set());
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [isDragging, selectedCells, board, lemonCells]);

  // 정답 없으면 즉시 리셋
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

  // ───────────────────────────────── UI ─────────────────────────────────

  // ① 프리게임(규칙만 보여주고, 시작 버튼)
  const isPreGame = !gameStarted && !isCountingDown && board.length === 0;

  return (
    <div className="max-w-[1200px]">
      {/* 제목 */}
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">🍋 레몬게임</h1>

      {/* 2열 레이아웃: 왼쪽(보드/컨트롤) + 오른쪽(규칙 패널) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT */}
        <div className="flex-1 w-full">
          {isPreGame ? (
            // 프리게임 카드
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-md">
              <p className="text-gray-700 mb-4">
                규칙을 확인한 뒤 <b>게임 시작</b>을 누르면 3초 후에 시작합니다.
              </p>
              <button
                onClick={startGame}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                🍋 게임 시작
              </button>
            </div>
          ) : (
            // 게임/카운트다운/종료 UI
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-md">
              {/* 점수/타이머 */}
              <div className="flex justify-center gap-8 mb-4">
                <ScoreDisplay score={score} />
                <Timer timeLeft={timeLeft} />
              </div>

              {/* 카운트다운 */}
              {isCountingDown && countdown > 0 && <Countdown countdown={countdown} />}

              {/* 보드 */}
              {board.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-green-100 border-2 border-green-400 rounded-lg overflow-auto">
                    <Board
                      board={board}
                      lemonCells={lemonCells}
                      selectedCells={selectedCells}
                      hoveredCell={hoveredCell}
                      missedCells={missedCells}
                      onMouseDown={handleMouseDown}
                      onMouseOver={handleMouseOver}
                      disabled={!gameStarted || isCountingDown || timeLeft <= 0}
                      cellSize={36} // ← 원하는 크기로(34~40 추천)
                    />
                  </div>
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

                  {/* 닉네임 입력 + 등록 */}
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="2~16자, 한/영/숫자/_/- (공백 불가)"
                      maxLength={16}
                      className="border px-3 py-2 rounded w-60"
                    />
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
                            try { sessionStorage.setItem("lemon_last_nick", trimmedName); } catch {}
                            window.location.href = "/ranking";
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
          )}
        </div>

        {/* RIGHT: 규칙 패널 (항상 표시, sticky) */}
        <div className="w-full lg:w-80 xl:w-96">
          <div className="lg:sticky lg:top-6 bg-white border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🍋</span>
              <h2 className="text-xl font-bold">레몬 게임 규칙</h2>
            </div>
            <ul className="space-y-3">
              <RuleItem index={1} text="두 점을 클릭하여 사각형 영역을 선택합니다" />
              <RuleItem index={2} text="선택한 영역의 숫자 합이 10이 되면 제거됩니다" />
              <RuleItem index={3} text="제한 시간 2분 동안 최대한 많은 점수를 획득하세요" />
              <RuleItem index={4} text="더 이상 10을 만들 수 없으면 자동으로 판이 리셋됩니다" />
              <RuleItem index={5} text="레몬을 지우면 4점을 더 얻습니다" />
            </ul>
            <p className="mt-4 text-gray-500 text-xs">
              Tip: 카운트다운 3초 후 게임 시작. 텍스트 드래그 방지 & 빠른 다시하기 버튼 지원.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ index, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold">
        {index}
      </span>
      <p className="leading-7">{text}</p>
    </li>
  );
}

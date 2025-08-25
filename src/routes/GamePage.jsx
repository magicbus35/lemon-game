import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Board from "../components/Board";
import Countdown from "../components/Countdown";
import Timer from "../components/Timer";
import ScoreDisplay from "../components/ScoreDisplay";

const ROWS = 10;
const COLS = 17;

const generateBoard = (rows, cols) => {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 9) + 1)
  );
};

const GamePage = () => {
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  const navigate = useNavigate();

  // 게임 시작 버튼
  const startGame = () => {
    setScore(0);
    setBoard([]);
    setIsCountingDown(true);
    setCountdown(3);
    setGameStarted(false);
    setTimeLeft(0);
  };

  // 카운트다운
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      setBoard(generateBoard(ROWS, COLS));
      setGameStarted(true);
      setTimeLeft(120); // 2분
      setIsCountingDown(false);
    }
  }, [isCountingDown, countdown]);

  // 타이머
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft === 0 && gameStarted) {
      // 결과 페이지로 이동
      navigate("/result", { state: { score, board } });
    }
  }, [gameStarted, timeLeft, navigate, board, score]);

  // 드래그 로직
  const handleMouseDown = (row, col) => {
    if (!gameStarted || timeLeft <= 0) return;
    setDragStart([row, col]);
    setDragEnd([row, col]);
  };

  const handleMouseEnter = (row, col) => {
    if (!gameStarted || timeLeft <= 0) return;
    if (dragStart) setDragEnd([row, col]);
  };

  const handleMouseUp = () => {
    if (!gameStarted || timeLeft <= 0) return;
    if (!dragStart || !dragEnd) return;

    const [r1, c1] = dragStart;
    const [r2, c2] = dragEnd;
    const rowMin = Math.min(r1, r2);
    const rowMax = Math.max(r1, r2);
    const colMin = Math.min(c1, c2);
    const colMax = Math.max(c1, c2);

    const selectedCells = [];
    let sum = 0;

    for (let r = rowMin; r <= rowMax; r++) {
      for (let c = colMin; c <= colMax; c++) {
        if (board[r][c] !== null) {
          selectedCells.push([r, c]);
          sum += board[r][c];
        }
      }
    }

    if (sum === 10) {
      setScore((prev) => prev + selectedCells.length);
      const newBoard = board.map((row, r) =>
        row.map((num, c) =>
          selectedCells.some(([sr, sc]) => sr === r && sc === c) ? null : num
        )
      );
      setBoard(newBoard);
    }

    setDragStart(null);
    setDragEnd(null);
  };

  // 현재 드래그 영역
  const selectedCells = new Set();
  if (dragStart && dragEnd) {
    const [r1, c1] = dragStart;
    const [r2, c2] = dragEnd;
    const rowMin = Math.min(r1, r2);
    const rowMax = Math.max(r1, r2);
    const colMin = Math.min(c1, c2);
    const colMax = Math.max(c1, c2);
    for (let r = rowMin; r <= rowMax; r++) {
      for (let c = colMin; c <= colMax; c++) {
        selectedCells.add(`${r}-${c}`);
      }
    }
  }

  return (
    <div className="flex flex-col items-center mt-6 select-none" onMouseUp={handleMouseUp}>
      <h1 className="text-2xl font-bold mb-2">🍋 레몬게임</h1>

      {gameStarted && <ScoreDisplay score={score} />}
      {gameStarted && <Timer timeLeft={timeLeft} />}
      {isCountingDown && countdown > 0 && <Countdown countdown={countdown} />}

      {/* 보드는 게임 시작 후에만 렌더링 */}
      {board.length > 0 && (
        <Board
          board={board}
          selectedCells={selectedCells}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          disabled={timeLeft <= 0}
        />
      )}

      {!gameStarted && !isCountingDown && (
        <button
          onClick={startGame}
          className="px-4 py-2 bg-yellow-400 rounded font-semibold mt-4"
        >
          게임 시작
        </button>
      )}
    </div>
  );
};

export default GamePage;

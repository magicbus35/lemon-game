import React, { useEffect, useMemo, useRef, useState } from "react";
import Board from "../components/Board";
import Countdown from "../components/Countdown";
import ScoreDisplay from "../components/ScoreDisplay";
import Timer from "../components/Timer";
import { saveScore } from "../services/scoreStore";
import { logPlayEvent } from "../services/analytics";

const ROWS = 10;
const COLS = 17;
const GAME_DURATION = 120; // 120초
const LEMON_COUNT = 10;

const bonusMessages = [
  "이봐, 친구! 그거 알아? 버디의 본캐는 버디1204라는 놀라운 사실을!",
  '이봐, 친구! 그거 알아? 블레는 무려 카운터를 "못"친다는 놀라운 사실을!',
  "이봐, 친구! 그거 알아? 주급이 무려 200만을 넘는 사람이 있다는 놀라운 사실을!",
];

const NICK_RE = /^(?=.{2,16}$)[가-힣A-Za-z0-9_-]+$/;
const FORBIDDEN = ["익명", "anonymous", "anon"];

const key = (r, c) => `${r}-${c}`;

const generateBoard = (rows, cols) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 9) + 1)
  );

const generateLemonCells = (rows, cols, count = 10) => {
  const maxCount = Math.min(count, rows * cols);
  const used = new Set();
  while (used.size < maxCount) used.add(Math.floor(Math.random() * rows * cols));
  const out = new Set();
  for (const p of used) {
    const r = Math.floor(p / cols);
    const c = p % cols;
    out.add(key(r, c));
  }
  return out;
};

function buildPrefix(board) {
  const R = board.length, C = board[0].length;
  const ps = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const v = board[r][c] ?? 0;
    ps[r + 1][c + 1] = v + ps[r][c + 1] + ps[r + 1][c] - ps[r][c];
  }
  return ps;
}
function sumRect(ps, r1, c1, r2, c2) {
  const R1 = Math.min(r1, r2), C1 = Math.min(c1, c2);
  const R2 = Math.max(r1, r2), C2 = Math.max(c1, c2);
  return ps[R2 + 1][C2 + 1] - ps[R1][C2 + 1] - ps[R2 + 1][C1] + ps[R1][C1];
}
function hasValidMove(board) {
  const R = board.length, C = board[0].length, ps = buildPrefix(board);
  for (let r1 = 0; r1 < R; r1++) for (let c1 = 0; c1 < C; c1++)
    for (let r2 = r1; r2 < R; r2++) for (let c2 = c1; c2 < C; c2++)
      if (sumRect(ps, r1, c1, r2, c2) === 10) return true;
  return false;
}
function findAllTenRects(board) {
  const R = board.length, C = board[0].length, ps = buildPrefix(board);
  const res = [];
  for (let r1 = 0; r1 < R; r1++) for (let c1 = 0; c1 < C; c1++)
    for (let r2 = r1; r2 < R; r2++) for (let c2 = c1; c2 < C; c2++)
      if (sumRect(ps, r1, c1, r2, c2) === 10) res.push({ r1, c1, r2, c2 });
  return res;
}

export default function GamePage() {
  const [board, setBoard] = useState(() => generateBoard(ROWS, COLS));
  const [lemonCells, setLemonCells] = useState(() =>
    generateLemonCells(ROWS, COLS, LEMON_COUNT)
  );
  const [score, setScore] = useState(0);

  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const timerRef = useRef(null);

  const [selectRect, setSelectRect] = useState(null);
  const selectingRef = useRef(null);
  const [missedRects, setMissedRects] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const [bonusMsg, setBonusMsg] = useState("");
  const pickRandomMessage = () =>
    bonusMessages[Math.floor(Math.random() * bonusMessages.length)];

  const boardRef = useRef(board);
  useEffect(() => { boardRef.current = board; }, [board]);

  // 세션 ID는 한 판 동안 유지
  const sessionIdRef = useRef(crypto?.randomUUID?.() ?? null);

  // 반응형 셀 크기
  const [cellSize, setCellSize] = useState(36);
  const wrapRef = useRef(null);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(el.clientWidth, 980);
      const size = Math.floor((w - 4) / COLS);
      setCellSize(Math.max(24, Math.min(48, size)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 최소 1해답 보장
  useEffect(() => {
    let b = board, tries = 0;
    while (!hasValidMove(b) && tries < 10) { b = generateBoard(ROWS, COLS); tries++; }
    if (tries > 0) setBoard(b);
    // eslint-disable-next-line
  }, []);

  const successAudioRef = useRef(null);
  useEffect(() => {
    try {
      const a = new Audio("/sound/success.mp3");
      a.preload = "auto"; a.load();
      successAudioRef.current = a;
    } catch {}
  }, []);
  const playSuccess = () => {
    try {
      const a = successAudioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } catch {}
  };

  const lastTapRef = useRef(null);

  const finalizeRect = (rect) => {
    const ps = buildPrefix(board);
    if (sumRect(ps, rect.r1, rect.c1, rect.r2, rect.c2) !== 10) return;

    const r1 = Math.min(rect.r1, rect.r2), c1 = Math.min(rect.c1, rect.c2);
    const r2 = Math.max(rect.r1, rect.r2), c2 = Math.max(rect.c1, rect.c2);

    const next = board.map((row) => row.slice());
    let add = 0;
    const lemons = new Set(lemonCells);

    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (next[r][c] !== null) {
          add += 1;
          const k = key(r, c);
          if (lemons.has(k)) { add += 4; lemons.delete(k); }
          next[r][c] = null;
        }
      }
    }

    if (add > 0) {
      setBoard(next);
      setLemonCells(lemons);
      setScore((v) => v + add);
      playSuccess();

      setTimeout(() => {
        if (!hasValidMove(next)) {
          setBoard(generateBoard(ROWS, COLS));
          setLemonCells(generateLemonCells(ROWS, COLS, LEMON_COUNT));
        }
      }, 0);
    }
  };

  const handlers = {
    onStart: (r, c) => {
      if (!started || gameOver) return;
      const now = Date.now();
      if (lastTapRef.current && now - lastTapRef.current.t < 1200) {
        selectingRef.current = { r1: lastTapRef.current.r, c1: lastTapRef.current.c, r2: r, c2: c };
        setSelectRect({ ...selectingRef.current });
      } else {
        selectingRef.current = { r1: r, c1: c, r2: r, c2: c };
        setSelectRect({ ...selectingRef.current });
      }
    },
    onMove: (r, c) => {
      if (!started || gameOver) return;
      if (!selectingRef.current) return;
      selectingRef.current.r2 = r; selectingRef.current.c2 = c;
      setSelectRect({ ...selectingRef.current });
    },
    onEnd: () => {
      if (!started || gameOver) return;
      const rect = selectingRef.current; selectingRef.current = null;
      if (!rect) { setSelectRect(null); return; }
      const single = rect.r1 === rect.r2 && rect.c1 === rect.c2;
      if (single) {
        lastTapRef.current = { r: rect.r1, c: rect.c1, t: Date.now() };
        setSelectRect(null);
        return;
      }
      setSelectRect(null);
      finalizeRect(rect);
      lastTapRef.current = null;
    },
  };

  const startGame = async () => {
    setScore(0);
    setMissedRects([]);
    setGameOver(false);
    setBoard(generateBoard(ROWS, COLS));
    setLemonCells(generateLemonCells(ROWS, COLS, LEMON_COUNT));
    setBonusMsg(pickRandomMessage());

    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((n) => {
        if (n === 1) {
          clearInterval(id);
          setCountdown(null);
          setStarted(true);
          setTimeLeft(GAME_DURATION);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                setStarted(false);
                const rects = findAllTenRects(boardRef.current).slice(0, 50);
                setMissedRects(rects);
                setGameOver(true);
                logPlayEvent("end", { session_id: sessionIdRef.current, duration_ms: GAME_DURATION * 1000 });
              }
              return prev - 1;
            });
          }, 1000);
        }
        return n - 1;
      });
    }, 1000);

    try { await logPlayEvent("start", { session_id: sessionIdRef.current }); } catch {}
  };

  const [nick, setNick] = useState("");
  const nickValid = useMemo(() => {
    const t = (nick || "").trim();
    const tl = t.toLowerCase();
    return t.length > 0 && NICK_RE.test(t) && !FORBIDDEN.map(x => x.toLowerCase()).includes(tl);
  }, [nick]);

  const saveAndGoRanking = async () => {
    if (!gameOver || !nickValid) return;
    try {
      await saveScore(nick.trim(), score);
      try { await logPlayEvent("save", { session_id: sessionIdRef.current, nickname: nick.trim(), score }); } catch {}
      window.location.href = "/ranking";
    } catch (err) {
      alert("저장 실패: " + (err?.message || String(err)));
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div ref={wrapRef} className="max-w-[1100px] mx-auto px-4">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><span>🍋</span>레몬게임</h2>

      <div className="grid grid-cols-2 gap-3">
        <ScoreDisplay score={score} />
        <Timer timeLeft={timeLeft} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={startGame}>게임 시작</button>
        <button
          className="px-4 py-2 rounded-lg border"
          onClick={() => {
            setScore(0); setMissedRects([]); setGameOver(false);
            setBoard(generateBoard(ROWS, COLS));
            setLemonCells(generateLemonCells(ROWS, COLS, LEMON_COUNT));
            setStarted(true); setTimeLeft(GAME_DURATION);
            setBonusMsg(pickRandomMessage());
          }}
        >
          다시하기
        </button>
        <span className="text-gray-500 text-sm">드래그 또는 두 지점 탭으로 직사각형 선택</span>
      </div>

      <div className="mt-4">
        <Board
          rows={ROWS}
          cols={COLS}
          board={board}
          lemonCells={lemonCells}
          cellSize={cellSize}
          selectingRect={selectRect}
          missedRects={missedRects}
          onStart={handlers.onStart}
          onMove={handlers.onMove}
          onEnd={handlers.onEnd}
        />
        {bonusMsg && (
          <div className="mt-2 text-center text-gray-600 italic">
            “{bonusMsg}”
          </div>
        )}
      </div>

      {gameOver && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="text-lg font-bold">
            ⏰ 타임업! 점수: <span className="text-green-600">{score}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            빨간 테두리는 놓친 정답 예시입니다.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-gray-600">닉네임</label>
            <input
              className="px-3 py-2 border rounded-lg"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="2~16자, 한영숫자, _-"
            />
            <button
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
              disabled={!nickValid}
              onClick={saveAndGoRanking}
            >
              점수 저장
            </button>
          </div>
        </div>
      )}

      {Number.isInteger(countdown) && <Countdown countdown={countdown} />}
    </div>
  );
}

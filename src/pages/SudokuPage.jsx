// src/pages/SudokuPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/SudokuPage.module.css";
import { saveSudokuResult } from "../services/sudokuStore";

/** ---------- 퍼즐 엔진(유일성 보장 + MRV) ---------- */
const N = 9;
const DIGITS = [1,2,3,4,5,6,7,8,9];

const deepCopy = (b) => b.map((r) => r.slice());
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function isSafe(board, r, c, n) {
  for (let i = 0; i < N; i++) {
    if (board[r][i] === n) return false;
    if (board[i][c] === n) return false;
  }
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (board[br+i][bc+j] === n) return false;
  }
  return true;
}

/** MRV: 후보가 가장 적은 빈 칸 우선 선택 */
function findEmptyCellMRV(board) {
  let best = null;
  let bestLen = 10;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0) {
        const cand = [];
        for (let n = 1; n <= 9; n++) if (isSafe(board, r, c, n)) cand.push(n);
        const len = cand.length;
        if (len === 0) return { r, c, cand }; // dead-end
        if (len < bestLen) {
          best = { r, c, cand: shuffle(cand) };
          bestLen = len;
          if (bestLen === 1) return best;
        }
      }
    }
  }
  return best; // null이면 모두 채워짐
}

function solveBacktrack(board) {
  const cell = findEmptyCellMRV(board);
  if (!cell) return true;
  const { r, c, cand } = cell;
  for (const n of cand) {
    board[r][c] = n;
    if (solveBacktrack(board)) return true;
    board[r][c] = 0;
  }
  return false;
}

/** 최대 limit개까지 해답을 세서 2해 이상 여부 빠르게 확인 */
function countSolutionsUpTo(board, limit = 2) {
  let count = 0;
  function dfs() {
    if (count >= limit) return;
    const cell = findEmptyCellMRV(board);
    if (!cell) { count++; return; }
    const { r, c, cand } = cell;
    if (!cand.length) return;
    for (const n of cand) {
      board[r][c] = n;
      dfs();
      if (count >= limit) { board[r][c] = 0; return; }
      board[r][c] = 0;
    }
  }
  const b = deepCopy(board);
  dfs(b);
  return count;
}

/** 완성 보드 생성 */
function generateFullSolution() {
  const b = Array.from({ length: N }, () => Array(N).fill(0));
  const row = shuffle(DIGITS);
  for (let c = 0; c < N; c++) b[0][c] = row[c];
  solveBacktrack(b);
  return b;
}

/** 유일성 보장 퍼즐 생성 (시간 예산으로 UI 프리즈 방지) */
async function makePuzzleUnique({ clues = 36, timeBudgetMs = 350 } = {}) {
  const t0 = performance.now();

  const solution = generateFullSolution();
  const puzzle = deepCopy(solution);

  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);

  for (const [r, c] of shuffle(cells)) {
    const remain = puzzle.flat().filter((x) => x !== 0).length;
    if (remain <= clues) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const cnt = countSolutionsUpTo(puzzle, 2);
    if (cnt !== 1) puzzle[r][c] = backup;

    if (performance.now() - t0 > timeBudgetMs) break;
    if ((performance.now() - t0) % 12 < 1) await new Promise((r) => setTimeout(r, 0));
  }

  const fixed = puzzle.map((row) => row.map((v) => v !== 0));
  return { puzzle, solution, fixed };
}

/** ---------- 그리드(행/열만 하이라이트, 입력값은 빨간색) ---------- */
function SudokuGrid({ values, fixed, selected, onInput }) {
  const selR = selected?.r ?? -1;
  const selC = selected?.c ?? -1;

  return (
    <div className={styles.boardWrap}>
      <div className={styles.board} role="grid" aria-label="스도쿠 보드">
        {values.map((row, r) =>
          row.map((v, c) => {
            const isGiven = fixed[r][c];
            const isSelected = selR === r && selC === c;
            const isPeer = !isSelected && selR >= 0 && (r === selR || c === selC);

            const classes = [
              styles.cell,
              isGiven ? styles.given : styles.user, // user는 빨간 글씨
              isSelected ? styles.selected : "",
              isPeer ? styles.peer : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={`${r}-${c}`}
                className={classes}
                role="button"
                tabIndex={0}
                aria-label={v ? `값 ${v}` : "빈칸"}
                onClick={() => !isGiven && onInput(r, c, null, "focus")}
                onKeyDown={(e) => {
                  if (isGiven) return;
                  const k = e.key;
                  if (k >= "1" && k <= "9") onInput(r, c, Number(k), "type");
                  if (k === "Backspace" || k === "Delete") onInput(r, c, 0, "clear");
                  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) {
                    e.preventDefault();
                    onInput(r, c, null, k);
                  }
                }}
              >
                {v || ""}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** ---------- 페이지 ---------- */
export default function SudokuPage() {
  const navigate = useNavigate();

  // 닉/비번
  const [playerName, setPlayerName] = useState(localStorage.getItem("nickname") || "");
  const [playerPw, setPlayerPw] = useState("");

  // 난이도(드롭다운)
  const [difficulty, setDifficulty] = useState("normal"); // super-easy | easy | normal | hard
  const clueMap = {
    "super-easy": 79, // 81칸 중 79칸 힌트 → 2칸만 비움
    easy: 40,
    normal: 36,
    hard: 28,
  };

  // 진행 상태
  const [puzzleId, setPuzzleId] = useState(() => crypto.randomUUID());
  const [board, setBoard] = useState(Array.from({ length: N }, () => Array(N).fill(0)));
  const [fixed, setFixed] = useState(Array.from({ length: N }, () => Array(N).fill(false)));
  const [solution, setSolution] = useState(Array.from({ length: N }, () => Array(N).fill(0)));
  const [selected, setSelected] = useState(null);
  const [mistakes, setMistakes] = useState(0); // 화면 비노출
  const [startTs, setStartTs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 타이머
  useEffect(() => {
    if (done || !startTs) return;
    const id = setInterval(() => setElapsed(Date.now() - startTs), 250);
    return () => clearInterval(id);
  }, [startTs, done]);

  // 새 퍼즐
  const resetPuzzle = async (diff = difficulty) => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 0));
    const pid = crypto.randomUUID();
    const { puzzle, solution: sol, fixed: fi } = await makePuzzleUnique({
      clues: clueMap[diff] ?? 36,
      timeBudgetMs: 350,
    });
    setPuzzleId(pid);
    setBoard(puzzle);
    setSolution(sol);
    setFixed(fi);
    setSelected(null);
    setMistakes(0);
    setStartTs(Date.now());
    setElapsed(0);
    setDone(false);
    setIsGenerating(false);
  };

  useEffect(() => {
    resetPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDifficultyChange = async (e) => {
    const next = e.target.value;
    setDifficulty(next);
    await resetPuzzle(next);
  };

  // 입력
  const onInput = (r, c, value, kind) => {
    if (done) return;

    // 이동키
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(kind)) {
      const sr = selected?.r ?? r, sc = selected?.c ?? c;
      const dr = kind === "ArrowUp" ? -1 : kind === "ArrowDown" ? 1 : 0;
      const dc = kind === "ArrowLeft" ? -1 : kind === "ArrowRight" ? 1 : 0;
      const nr = Math.max(0, Math.min(8, sr + dr));
      const nc = Math.max(0, Math.min(8, sc + dc));
      setSelected({ r: nr, c: nc });
      return;
    }

    if (fixed[r][c] && kind !== "focus") return;
    if (kind === "focus") { setSelected({ r, c }); return; }

    const next = deepCopy(board);
    const nv = value ?? 0;
    if (nv === 0) next[r][c] = 0;
    else {
      next[r][c] = nv;
      if (solution[r][c] !== nv) setMistakes((m) => m + 1);
    }
    setBoard(next);
    setSelected({ r, c });

    // 완료 체크
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (next[i][j] !== solution[i][j]) return;
      }
    }
    setDone(true);
    setElapsed(Date.now() - startTs);
  };

  // 시간 포맷
  const mmss = useMemo(() => {
    const s = Math.floor(elapsed / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  }, [elapsed]);

  // 저장 버튼 → 성공 시 해당 난이도로 랭킹 이동
  const handleSave = async () => {
    if (!done) {
      alert("먼저 퍼즐을 완료하세요!");
      return;
    }
    const name = (playerName || "").trim();
    const pass = (playerPw || "").trim();
    if (!name || pass.length < 4) {
      alert("닉네임과 4자 이상 비밀번호를 입력하세요.");
      return;
    }
    localStorage.setItem("nickname", name);

    const res = await saveSudokuResult({
      nickname: name,
      password: pass,
      puzzleId,
      elapsedMs: elapsed,
      mistakes,
      difficulty,
    });

    if (res.ok) {
      alert("스도쿠 기록 저장 완료!");
      navigate(`/ranking?game=sudoku&difficulty=${encodeURIComponent(difficulty)}`);
    } else if (res.reason === "NICK_AUTH_FAILED") {
      alert("닉네임/비밀번호가 일치하지 않습니다.");
    } else if (res.reason === "PASSWORD_REQUIRED") {
      alert("이 닉네임에는 비밀번호가 필요합니다.");
    } else {
      alert("저장 실패. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className={styles.page}>
      <h1 className="text-2xl font-bold mb-3">스도쿠</h1>

      {/* 상태/컨트롤: 시간 + 난이도 드롭다운 + 새 퍼즐 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--c-chip)" }}>
          시간: <b>{mmss}</b>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--c-text,#444)" }}>난이도</span>
          <select
            className="border rounded px-2 py-2"
            value={difficulty}
            onChange={handleDifficultyChange}
            aria-label="난이도 선택"
          >
            <option value="super-easy">매우매우쉬움</option>
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="hard">어려움</option>
          </select>
        </label>

        <button className="btn btn-secondary" onClick={() => resetPuzzle()}>
          새 퍼즐
        </button>
      </div>

      {/* 보드 (중앙 정렬 + 생성 중 오버레이) */}
      <div className={styles.centerRow} style={{ position: "relative" }}>
        <SudokuGrid values={board} fixed={fixed} selected={selected} onInput={onInput} />
        {isGenerating && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,.6)", backdropFilter: "blur(1px)", borderRadius: 12
          }}>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
              퍼즐 생성 중…
            </div>
          </div>
        )}
      </div>

      {/* 닉/비번/저장 + 랭킹 보기 (중앙 정렬) */}
      <div className={styles.centerRow} style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <input
            type="text" className="border rounded px-3 py-2"
            placeholder="닉네임"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            type="password"
            placeholder="비밀번호(4자 이상)"
            value={playerPw}
            onChange={(e) => setPlayerPw(e.target.value)}
          />
          <button className="btn btn-accent" onClick={handleSave}>점수 저장하기</button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/ranking?game=sudoku&difficulty=${encodeURIComponent(difficulty)}`)}
          >
            랭킹 보기
          </button>
        </div>
      </div>
    </div>
  );
}

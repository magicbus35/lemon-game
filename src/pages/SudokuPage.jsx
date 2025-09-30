// src/pages/SudokuPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/SudokuPage.module.css";
import { saveSudokuResult } from "../services/sudokuStore";

/** ===================== Sudoku engine (로컬 폴백) ===================== */
const DIGITS = [1,2,3,4,5,6,7,8,9];
const dc = (b) => b.map(r => r.slice());
function rowVals(b, r){ return new Set(b[r].filter(v => v)); }
function colVals(b, c){ return new Set(b.map(r => r[c]).filter(v => v)); }
function boxVals(b, r, c){
  const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
  const s = new Set();
  for(let i=0;i<3;i++) for(let j=0;j<3;j++){ const v=b[br+i][bc+j]; if(v) s.add(v); }
  return s;
}
function candidates(b, r, c){
  if(b[r][c]) return new Set();
  const used = new Set([...rowVals(b,r), ...colVals(b,c), ...boxVals(b,r,c)]);
  const s = new Set(); for(const d of DIGITS) if(!used.has(d)) s.add(d); return s;
}
function findEmptyCellMRV(b){
  let best=null, bestSize=10;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(!b[r][c]){
    const cand = candidates(b,r,c); const sz=cand.size;
    if(sz<bestSize){ best={r,c, cand}; bestSize=sz; if(sz===1) return best; }
  }
  return best;
}
function solveBacktrack(board, cap=2){
  const b=dc(board); let solutions=0;
  (function dfs(){
    if(solutions>=cap) return;
    const m = findEmptyCellMRV(b);
    if(!m){ solutions++; return; }
    const {r,c,cand} = m;
    for(const d of cand){
      b[r][c]=d; dfs(); b[r][c]=0;
      if(solutions>=cap) return;
    }
  })();
  return solutions;
}
function generateFullSolution(){
  const b = Array.from({length:9}, ()=>Array(9).fill(0));
  (function fillCell(i=0){
    if(i===81) return true;
    const r=(i/9|0), c=i%9;
    const digits=DIGITS.slice().sort(()=>Math.random()-0.5);
    for(const d of digits){
      if(!rowVals(b,r).has(d) && !colVals(b,c).has(d) && !boxVals(b,r,c).has(d)){
        b[r][c]=d; if(fillCell(i+1)) return true; b[r][c]=0;
      }
    } return false;
  })();
  return b;
}
function makePuzzleUnique(full, cluesTarget=36){
  const b=dc(full), pos=[]; for(let r=0;r<9;r++) for(let c=0;c<9;c++) pos.push({r,c});
  pos.sort(()=>Math.random()-0.5); let rem=0;
  for(const {r,c} of pos){
    const v1=b[r][c]; if(!v1) continue; b[r][c]=0;
    const r2=8-r, c2=8-c; let v2=null, pair=false;
    if(!(r===r2&&c===c2)){ v2=b[r2][c2]; if(v2){ b[r2][c2]=0; pair=true; } }
    const sols=solveBacktrack(b,2);
    if(sols!==1){ b[r][c]=v1; if(pair) b[r2][c2]=v2; }
    else{ rem+=pair?2:1; if(81-rem<=cluesTarget) break; }
  } return b;
}

function generateRatedPuzzle(target = "easy") {
  // ✅ 테스트: 한 칸만 비우기
  if (target === "test") {
    const solution = generateFullSolution();
    const puzzle   = dc(solution);
    puzzle[0][0] = 0;
    return { puzzle, solution, rating: "test" };
  }

  // ✅ 매우 쉬움: 힌트 46개(= 남기는 칸 46)
  const cluesTarget =
    target === "super-easy" ? 46 :
    target === "easy"       ? 40 :
    target === "normal"     ? 32 :
    target === "hard"       ? 28 : 24; // expert

  const solution = generateFullSolution();
  const puzzle   = makePuzzleUnique(solution, cluesTarget);
  return { puzzle, solution, rating: target };
}

/** ===================== Grid ===================== */
function SudokuGrid({ cells, selected, setSelected, memoMode, onNumber, onErase, disabled }){
  return (
    <div className={styles.boardWrap}>
      <div className={styles.frame}>
        <div className={styles.board} role="grid" aria-label="스도쿠 보드">
          {cells.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected && selected.r === r && selected.c === c;

              // === 하이라이트 (행/열 OR 3×3) — 3×3는 AND 판정 ===
              const inRow = selected && selected.r === r;
              const inCol = selected && selected.c === c;
              const inSameBox =
                selected &&
                Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                Math.floor(selected.c / 3) === Math.floor(c / 3);

              const peer = selected && !isSelected && (inRow || inCol || inSameBox);

              const cls = [
                styles.cell,
                cell.fixed ? styles.given : styles.user,
                isSelected ? styles.selected : "",
                peer ? styles.peer : "",
              ].filter(Boolean).join(" ");

              return (
                <div
                  key={`${r}-${c}`}
                  className={cls}
                  onClick={() => !disabled && setSelected({ r, c })}
                >
                  {cell.value ? (
                    <span className={styles.value}>{cell.value}</span>
                  ) : (
                    <div className={styles.notes}>
                      {DIGITS.map((d) => (
                        <span key={d} className={styles.note}>
                          {cell.notes?.has(d) ? d : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 키패드(모바일도 가로정렬 유지) */}
      <div className={styles.keypadLarge} aria-disabled={disabled}>
        {DIGITS.map((d) => (
          <button key={d} onClick={() => onNumber(d)} className={styles.keyBig} disabled={disabled}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 선형 아이콘 ── */
const IconUndo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 7H5V3" />
    <path d="M5 7c1.9-2.5 4.8-4 8-4a8 8 0 1 1 0 16h-4" />
  </svg>
);
const IconErase = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{overflow:"visible"}} aria-hidden="true">
    <path d="M7 21h10" />
    <path d="M3.5 16.5l5-5L17 3a2.828 2.828 0 1 1 4 4L12.5 15.5l-3.5 3.5H6.5z" />
  </svg>
);
const IconMemo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21v-4l12-12 4 4-12 12H3z" />
    <path d="M14 7l4 4" />
  </svg>
);

/** ===================== Page ===================== */
export default function SudokuPage(){
  const navigate = useNavigate();

  const puzzleIdRef = useRef(null);
  useEffect(() => {
    if (!puzzleIdRef.current) {
      const makeId =
        (typeof window !== "undefined" &&
          window.crypto &&
          typeof window.crypto.randomUUID === "function" &&
          window.crypto.randomUUID()) ||
        String(Date.now());
      puzzleIdRef.current = makeId;
    }
  }, []);

  const [difficulty, setDifficulty] = useState("easy");
  const [running, setRunning] = useState(false);
  const [startTs, setStartTs] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [saved, setSaved] = useState(false);

  const emptyCell = { value: 0, fixed: false, notes: new Set() };
  const [cells, setCells] = useState(()=> Array.from({length:9},()=> Array.from({length:9},()=> ({...emptyCell, notes:new Set()})) ));
  const [solution, setSolution] = useState(()=> Array.from({length:9},()=> Array(9).fill(0)));
  const [selected, setSelected] = useState({ r:0, c:0 });
  const [memoMode, setMemoMode] = useState(false);
  const [history, setHistory] = useState([]);

  const workerRef = useRef(null);
  const jobIdRef = useRef(0);
  const [loading, setLoading] = useState(false);

  // 타이머
  useEffect(()=>{
    if(!running || !startTs) return;
    const id = setInterval(()=> setElapsed(Math.floor((Date.now()-startTs)/1000)), 250);
    return ()=> clearInterval(id);
  }, [running, startTs]);

  const pushHistory = (prev) => setHistory(h => [...h.slice(-199), prev]);
  const fromGrid = (grid, fixedMask) =>
    grid.map((row,r)=> row.map((v,c)=> ({ value: v||0, fixed: !!fixedMask[r][c], notes: new Set() })));

  // Worker 초기화
  useEffect(() => {
    try{
      workerRef.current = new Worker(new URL("../workers/sudokuWorker.js", import.meta.url), { type:"module" });
      workerRef.current.onmessage = (e) => {
        const { jobId, ok, data } = e.data || {};
        if (jobId !== jobIdRef.current) return;
        setLoading(false);
        if (!ok || !data) return;
        const { puzzle, solution } = data;
        const fixedMask = puzzle.map(row => row.map(v => !!v));
        setCells(fromGrid(puzzle, fixedMask));
        setSolution(solution);
        setSelected({ r:0, c:0 }); setMemoMode(false); setHistory([]);
        setDone(false); setSaved(false); setElapsed(0);
        setStartTs(Date.now()); setRunning(true);
      };
    }catch(e){
      console.warn("Worker init failed, fallback local:", e);
      workerRef.current = null;
    }
    return () => { workerRef.current?.terminate(); };
  }, []);

  // 새 퍼즐
  async function newPuzzle(diff = difficulty){
  setDone(false); setSaved(false); setName(""); setPass("");

  // ✅ super-easy도 워커 우회(혹시 워커가 모르는 난이도일 수 있어서 안전하게 로컬 생성)
  if (diff === "test" || diff === "super-easy") {
    const { puzzle, solution: sol } = generateRatedPuzzle(diff);
    const fixedMask = puzzle.map(row=> row.map(v=> !!v));
    setCells(fromGrid(puzzle, fixedMask));
    setSolution(sol);
    setSelected({ r:0, c:0 }); setMemoMode(false); setHistory([]);
    setElapsed(0); setStartTs(Date.now()); setRunning(true);
    return;
  }

  if (workerRef.current) {
    setLoading(true); setRunning(false); jobIdRef.current += 1;
    workerRef.current.postMessage({ type: "gen", jobId: jobIdRef.current, difficulty: diff });
    return;
  }

  const { puzzle, solution:sol } = generateRatedPuzzle(diff);
  const fixedMask = puzzle.map(row=> row.map(v=> !!v));
  setCells(fromGrid(puzzle, fixedMask));
  setSolution(sol);
  setSelected({ r:0, c:0 }); setMemoMode(false); setHistory([]);
  setElapsed(0); setStartTs(Date.now()); setRunning(true);
}

  useEffect(()=>{ newPuzzle("easy"); }, []);

  // 입력
  function applyNumber(n){
    if(!selected || loading || done) return;
    const {r,c}=selected;
    const before = JSON.stringify(cells.map(row=> row.map(cell=> ({v:cell.value,f:cell.fixed,n:[...cell.notes]}))));
    const next = cells.map(row=> row.map(cell=> ({...cell, notes:new Set(cell.notes)})));
    const cell = next[r][c];
    if(cell.fixed) return;
    if(memoMode){ cell.notes.has(n) ? cell.notes.delete(n) : cell.notes.add(n); }
    else{ cell.value = n; cell.notes.clear(); }
    pushHistory(before); setCells(next);

    const finished = next.every((row,ri)=> row.every((cell,ci)=> cell.value && cell.value===solution[ri][ci]));
    if(finished){ setDone(true); setRunning(false); }
  }

  function erase(){
    if(!selected || loading || done) return;
    const {r,c}=selected;
    const before = JSON.stringify(cells.map(row=> row.map(cell=> ({v:cell.value,f:cell.fixed,n:[...cell.notes]}))));
    const next = cells.map(row=> row.map(cell=> ({...cell, notes:new Set(cell.notes)})));
    if(!next[r][c].fixed){ next[r][c].value=0; next[r][c].notes.clear(); pushHistory(before); setCells(next); }
  }

  function undo(){
    if(loading || done) return;
    setHistory(h => {
      if(h.length===0) return h;
      const last = h[h.length-1], parsed = JSON.parse(last);
      const restored = parsed.map(row=> row.map(o=> ({ value:o.v||0, fixed:!!o.f, notes:new Set(o.n||[]) })));
      setCells(restored); return h.slice(0,-1);
    });
  }

  function handleSave(){
    if(saved) return;
    const nickname = name.trim(), password = pass.trim();
    if(!nickname || password.length < 4){ alert("닉네임 및 4자 이상 비밀번호를 입력하세요."); return; }
    if (!puzzleIdRef.current) puzzleIdRef.current = String(Date.now());

    const payload = { nickname, password, puzzleId:String(puzzleIdRef.current), elapsedMs:Number(elapsed)*1000, mistakes:0, difficulty };
  console.log("[SudokuPage] ▶ save payload:", { ...payload, password: payload.password ? "(provided)" : "(empty)" });
    (async () => {
      try{
        const res = await saveSudokuResult(payload);
      console.log("[SudokuPage] ◀ save result:", res);
        if(res?.ok){ setSaved(true); navigate("/ranking?game=sudoku&difficulty="+encodeURIComponent(difficulty)); }
        else{
          const reason = res?.reason || "SERVER_ERROR";
          alert(reason==="PASSWORD_REQUIRED"?"비밀번호가 필요합니다."
            : reason==="NICK_AUTH_FAILED"?"닉네임/비밀번호가 일치하지 않습니다."
            : "서버 오류로 저장에 실패했습니다.");
        }
      }catch(e){ console.error("[SudokuPage] ❌ save exception:", e); alert("저장 중 오류가 발생했습니다."); }
    })();
  }

  /* 키보드 입력 — 입력창에 포커스면 스도쿠 단축키 무시 */
  useEffect(()=>{
    function isEditingTarget(e){
      const t = e.target;
      if (t && typeof t.closest === "function") {
        if (t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')) return true;
      }
      const tag = (t && t.tagName) ? t.tagName.toLowerCase() : "";
      return (
        (tag === "input" || tag === "textarea" || tag === "select") ||
        (t && t.isContentEditable)
      );
    }
    function moveSel(dr, dc){
      setSelected(sel=>{
        const r = Math.min(8, Math.max(0, (sel?.r ?? 0)+dr));
        const c = Math.min(8, Math.max(0, (sel?.c ?? 0)+dc));
        return { r, c };
      });
    }
    function onKey(e){
      if (isEditingTarget(e)) return; // 폼 입력 중엔 단축키 비활성
      if(loading) return;
      if(/^[1-9]$/.test(e.key)){ applyNumber(parseInt(e.key,10)); e.preventDefault(); return; }
      if(e.key === "Backspace" || e.key === "Delete" || e.key === "0"){ erase(); e.preventDefault(); return; }
      if(e.key === "ArrowUp"){ moveSel(-1,0); e.preventDefault(); return; }
      if(e.key === "ArrowDown"){ moveSel(1,0); e.preventDefault(); return; }
      if(e.key === "ArrowLeft"){ moveSel(0,-1); e.preventDefault(); return; }
      if(e.key === "ArrowRight"){ moveSel(0,1); e.preventDefault(); return; }
      if(e.key.toLowerCase() === "m"){ setMemoMode(v=>!v); e.preventDefault(); return; }
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ undo(); e.preventDefault(); return; }
    }
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [loading, selected, memoMode, cells, solution, done]);

  const timeText = `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,"0")}`;

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <h1>스도쿠</h1>
        <div className={styles.controls}>
          <span className={styles.badge}>{timeText}</span>
          <div className={styles.selectWrap}>
            <label>
              난이도&nbsp;
              <select
                value={difficulty}
                onChange={e=>{ const d=e.target.value; setDifficulty(d); newPuzzle(d); }}
                disabled={loading}
              >
                <option value="super-easy">매우 쉬움</option>
                <option value="easy">쉬움</option>
                <option value="normal">보통</option>
                <option value="hard">어려움</option>
                <option value="expert">전문가</option>
              </select>
            </label>
          </div>
          <button className={styles.action} onClick={()=> newPuzzle(difficulty)} disabled={loading}>
            {loading ? "생성 중..." : "새 퍼즐"}
          </button>
        </div>
      </div>

      {/* 보드 + 툴바 + 키패드 */}
      <div className={styles.boardArea}>
        <SudokuGrid
          cells={cells}
          selected={selected}
          setSelected={setSelected}
          memoMode={memoMode}
          onNumber={applyNumber}
          onErase={erase}
          disabled={loading || done}
        />

        {/* 툴바 */}
        <div className={styles.toolbar}>
          <button className={styles.tool} onClick={undo} disabled={loading || done || history.length===0}>
            <span className={styles.toolIcon}><IconUndo/></span>
            <span className={styles.toolLabel}>실행 취소</span>
          </button>
          <button className={styles.tool} onClick={erase} disabled={loading || done}>
            <span className={styles.toolIcon}><IconErase/></span>
            <span className={styles.toolLabel}>지우기</span>
          </button>
          <button className={styles.tool} onClick={()=> setMemoMode(v=>!v)} disabled={loading || done}>
            <span className={styles.toolIcon}><IconMemo/></span>
            <span className={styles.toolLabel}>메모 {memoMode ? "On" : "Off"}</span>
          </button>
        </div>

        {/* 숫자 키패드 */}
        <div className={styles.keypadLarge} aria-disabled={loading || done}>
          {DIGITS.map((d) => (
            <button key={d} onClick={() => applyNumber(d)} className={styles.keyBig} disabled={loading || done}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 완료 시 저장 패널 */}
      {done && (
        <div className={styles.footer}>
          <div className={styles.savePanel}>
            <div className={styles.saveTitle}>기록 저장</div>
            <div className={styles.actions}>
              <input
                className={styles.input}
                placeholder="닉네임"
                value={name}
                onChange={e=> setName(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="비밀번호(4자 이상)"
                type="password"
                value={pass}
                onChange={e=> setPass(e.target.value)}
                minLength={4}
              />
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saved}>
                {saved ? "저장됨" : "점수 저장하기"}
              </button>
              <button className={styles.btn} onClick={()=> navigate("/ranking?game=sudoku&difficulty="+encodeURIComponent(difficulty))}>
                랭킹 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

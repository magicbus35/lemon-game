// src/pages/SudokuPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/SudokuPage.module.css";
import { saveSudokuResult } from "../services/sudokuStore";

/** =====================
 *  Sudoku engine
 *  - Generator (unique solution)
 *  - Rater by strategies
 *  - Simple solver with strategies
 *  ===================== */
const N = 9;
const DIGITS = [1,2,3,4,5,6,7,8,9];
const range9 = [...Array(9).keys()];

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
  const s = new Set();
  for(const d of DIGITS) if(!used.has(d)) s.add(d);
  return s;
}

function findEmptyCellMRV(b){
  let best=null, bestSize=10;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(!b[r][c]){
    const cand = candidates(b,r,c);
    const sz=cand.size;
    if(sz<bestSize){ best={r,c, cand}; bestSize=sz; if(sz===1) return best; }
  }
  return best;
}

function solveBacktrack(board, cap=2){
  const b=dc(board);
  let solutions=0;
  function dfs(){
    if(solutions>=cap) return;
    const m = findEmptyCellMRV(b);
    if(!m){ solutions++; return; }
    const {r,c,cand} = m;
    for(const d of cand){
      b[r][c]=d;
      dfs();
      b[r][c]=0;
      if(solutions>=cap) return;
    }
  }
  dfs();
  return solutions;
}

function generateFullSolution(){
  const b = Array.from({length:9}, ()=>Array(9).fill(0));
  function fillCell(idx=0){
    if(idx===81) return true;
    const r= Math.floor(idx/9), c=idx%9;
    if(b[r][c]) return fillCell(idx+1);
    const digits = DIGITS.slice().sort(()=>Math.random()-0.5);
    for(const d of digits){
      if(!rowVals(b,r).has(d) && !colVals(b,c).has(d) && !boxVals(b,r,c).has(d)){
        b[r][c]=d;
        if(fillCell(idx+1)) return true;
        b[r][c]=0;
      }
    }
    return false;
  }
  fillCell();
  return b;
}

function makePuzzleUnique(full, cluesTarget=36){
  const b = dc(full);
  const positions = [];
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) positions.push({r,c});
  positions.sort(()=>Math.random()-0.5);

  let removed=0;
  for(const {r,c} of positions){
    const v1=b[r][c];
    if(!v1) continue;
    b[r][c]=0;
    const r2=8-r, c2=8-c;
    let v2=null, wasPair=false;
    if(!(r===r2 && c===c2)){
      v2=b[r2][c2];
      if(v2){ b[r2][c2]=0; wasPair=true; }
    }
    const sols = solveBacktrack(b, 2);
    if(sols!==1){
      b[r][c]=v1;
      if(wasPair) b[r2][c2]=v2;
    }else{
      removed += wasPair?2:1;
      if(81-removed<=cluesTarget) break;
    }
  }
  return b;
}

/** ----- Strategy-based solver (rating) ----- */
function applySingles(b){
  let progress=false;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++){
    if(!b[r][c]){
      const cand = candidates(b,r,c);
      if(cand.size===1){
        b[r][c]=[...cand][0];
        progress=true;
      }
    }
  }
  // hidden singles
  for(let unit=0;unit<27;unit++){
    const counts = new Map();
    const cells = [];
    if(unit<9){
      const r=unit;
      for(let c=0;c<9;c++) if(!b[r][c]){ const cand=candidates(b,r,c); cells.push({r,c,cand}); for(const d of cand) counts.set(d,(counts.get(d)||0)+1); }
    }else if(unit<18){
      const c=unit-9;
      for(let r=0;r<9;r++) if(!b[r][c]){ const cand=candidates(b,r,c); cells.push({r,c,cand}); for(const d of cand) counts.set(d,(counts.get(d)||0)+1); }
    }else{
      const br=(unit-18);
      const r0=Math.floor(br/3)*3, c0=(br%3)*3;
      for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
        const r=r0+dr, c=c0+dc;
        if(!b[r][c]){ const cand=candidates(b,r,c); cells.push({r,c,cand}); for(const d of cand) counts.set(d,(counts.get(d)||0)+1); }
      }
    }
    for(const [d,count] of counts.entries()){
      if(count===1){
        const cell = cells.find(x=>x.cand.has(d));
        if(cell){ b[cell.r][cell.c]=d; progress=true; }
      }
    }
  }
  return progress;
}

function applyLockedCandidates(b){
  let progress=false;
  for(let box=0;box<9;box++){
    const r0=Math.floor(box/3)*3, c0=(box%3)*3;
    for(const d of DIGITS){
      const pos=[];
      for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++){
        const r=r0+dr, c=c0+dc;
        if(!b[r][c] && candidates(b,r,c).has(d)) pos.push({r,c});
      }
      if(pos.length<=1) continue;
      const sameRow = pos.every(p=>p.r===pos[0].r);
      const sameCol = pos.every(p=>p.c===pos[0].c);
      if(sameRow){
        const row=pos[0].r;
        for(let c=0;c<9;c++){
          if(c<c0 || c>=c0+3){
            if(!b[row][c] && candidates(b,row,c).has(d)){
              const cd=candidates(b,row,c); cd.delete(d);
              progress=true;
            }
          }
        }
      }
      if(sameCol){
        const col=pos[0].c;
        for(let r=0;r<9;r++){
          if(r<r0 || r>=r0+3){
            if(!b[r][col] && candidates(b,r,col).has(d)){
              const cd=candidates(b,r,col); cd.delete(d);
              progress=true;
            }
          }
        }
      }
    }
  }
  return progress;
}

function applyPairsTriples(b){
  let progress=false;
  const units = [];
  for(let r=0;r<9;r++) units.push({type:"row", cells: range9.map(c=>({r,c}))});
  for(let c=0;c<9;c++) units.push({type:"col", cells: range9.map(r=>({r,c}))});
  for(let br=0;br<9;br++){
    const r0=Math.floor(br/3)*3, c0=(br%3)*3;
    const cells=[]; for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) cells.push({r:r0+dr,c:c0+dc});
    units.push({type:"box", cells});
  }
  for(const u of units){
    const empties = u.cells.filter(({r,c})=>!b[r][c]).map(({r,c})=>({r,c,cand:candidates(b,r,c)}));
    for(let i=0;i<empties.length;i++) for(let j=i+1;j<empties.length;j++){
      const A=empties[i], B=empties[j];
      if(A.cand.size===2 && B.cand.size===2){
        const a=[...A.cand].sort().join(","), b2=[...B.cand].sort().join(",");
        if(a===b2){
          for(const cell of empties){
            if(cell!==A && cell!==B){
              for(const d of A.cand){ if(cell.cand.has(d)){ progress=true; } }
            }
          }
        }
      }
    }
  }
  return progress;
}

function strategySolve(board, maxDepth=0){
  const b = dc(board);
  let madeProgress=true;
  while(madeProgress){
    madeProgress=false;
    if(applySingles(b)) { madeProgress=true; continue; }
    if(applyLockedCandidates(b)) { madeProgress=true; continue; }
    if(applyPairsTriples(b)) { madeProgress=true; continue; }
  }
  const solved = solveBacktrack(b, 2)===1 && b.flat().every(v=>v);
  if(b.flat().every(v=>v)) return { solved:true, required:"singles-or-basic" };
  if(maxDepth>0){
    const trialSolutions = solveBacktrack(board, 2);
    if(trialSolutions===1) return { solved:true, required:"trial-1" };
  }
  return { solved, required:"hard" };
}

function ratePuzzle(puzzle){
  const res1 = strategySolve(puzzle, 0);
  if(res1.solved && res1.required==="singles-or-basic") return "easy";
  const res2 = strategySolve(puzzle, 1);
  if(res2.solved && res2.required==="trial-1") return "medium";
  const sols = solveBacktrack(puzzle, 2);
  if(sols===1) return "hard";
  return "expert";
}

function generateRatedPuzzle(target="normal"){
  const allow = {
    easy: ["easy"],
    normal: ["medium","easy"],
    hard: ["hard","medium"],
    expert: ["expert","hard"]
  }[target] || ["medium"];
  for(let tries=0; tries<200; tries++){
    const full = generateFullSolution();
    const clues = target==="easy"? 40 : target==="normal"? 32 : target==="hard"? 28 : 24;
    const puzzle = makePuzzleUnique(full, clues);
    const rating = ratePuzzle(puzzle);
    if(allow.includes(rating)){
      return { puzzle, solution: full, rating };
    }
  }
  const full = generateFullSolution();
  const puzzle = makePuzzleUnique(full, 32);
  return { puzzle, solution: full, rating:"unknown" };
}

/** ===================== UI (notes/undo/erase) ===================== */
function SudokuGrid({ cells, selected, setSelected, memoMode, onNumber, onErase }){
  return (
    <div className={styles.boardWrap}>
      {/* 프레임(바깥 굵은 테두리) 추가 */}
      <div className={styles.frame}>
        <div className={styles.board} role="grid" aria-label="스도쿠 보드">
          {cells.map((row, r) =>
            row.map((cell, c) => {
              const isSelected =
                selected && selected.r === r && selected.c === c;
              const peer =
                selected &&
                !isSelected &&
                (selected.r === r ||
                  selected.c === c ||
                  (Math.floor(selected.r / 3) === Math.floor(r / 3) &&
                    Math.floor(selected.c / 3) === Math.floor(c / 3)));

              const cls = [
                styles.cell,
                cell.fixed ? styles.given : styles.user,
                isSelected ? styles.selected : "",
                peer ? styles.peer : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={`${r}-${c}`}
                  className={cls}
                  onClick={() => setSelected({ r, c })}
                >
                  {cell.value ? (
                    <span className={styles.value}>{cell.value}</span>
                  ) : (
                    <div className={styles.notes}>
                      {[1,2,3,4,5,6,7,8,9].map((d) => (
                        <span
                          key={d}
                          className={styles.note}
                          data-active={cell.notes.has(d) ? "1" : ""}
                        >
                          {cell.notes.has(d) ? d : ""}
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

      <div className={styles.keypad}>
        {[1,2,3,4,5,6,7,8,9].map((d) => (
          <button key={d} onClick={() => onNumber(d)} className={styles.key}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SudokuPage(){
  const navigate = useNavigate();

  // meta
  const [difficulty, setDifficulty] = useState("normal");
  const [startTs, setStartTs] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  // board state
  const emptyCell = { value: 0, fixed: false, notes: new Set() };
  const [cells, setCells] = useState(()=> Array.from({length:9},()=> Array.from({length:9},()=> ({...emptyCell, notes:new Set()})) ));
  const [solution, setSolution] = useState(()=> Array.from({length:9},()=> Array(9).fill(0)));
  const [selected, setSelected] = useState(null);
  const [memoMode, setMemoMode] = useState(false);

  // history for undo
  const [history, setHistory] = useState([]);

  useEffect(()=>{
    const id = setInterval(()=> setElapsed(Math.floor((Date.now()-startTs)/1000)), 250);
    return ()=> clearInterval(id);
  }, [startTs]);

  function pushHistory(prev){
    setHistory(h => [...h.slice(-199), prev]);
  }

  function fromGrid(grid, fixedMask){
    return grid.map((row,r)=> row.map((v,c)=> ({
      value: v||0, fixed: !!fixedMask[r][c], notes: new Set()
    })));
  }

  async function newPuzzle(diff = difficulty){
    const { puzzle, solution:sol } = generateRatedPuzzle(diff);
    const fixedMask = puzzle.map(row=> row.map(v=> !!v));
    setCells(fromGrid(puzzle, fixedMask));
    setSolution(sol);
    setSelected(null);
    setMemoMode(false);
    setHistory([]);
    setDone(false);
    setStartTs(Date.now());
  }

  useEffect(()=>{ newPuzzle("normal"); }, []);

  // actions
  function applyNumber(n){
    if(!selected) return;
    const {r,c}=selected;
    const before = JSON.stringify(cells.map(row=> row.map(cell=> ({v:cell.value,f:cell.fixed,n:[...cell.notes]}))));
    const next = cells.map(row=> row.map(cell=> ({...cell, notes:new Set(cell.notes)})));
    const cell = next[r][c];
    if(cell.fixed) return;
    if(memoMode){
      if(cell.notes.has(n)) cell.notes.delete(n); else cell.notes.add(n);
    }else{
      cell.value = n;
      cell.notes.clear();
    }
    pushHistory(before);
    setCells(next);
    const flat = next.flat();
    if(flat.every(cell => cell.value)){
      const allOk = next.every((row,r)=> row.every((cell,c)=> cell.value===solution[r][c]));
      if(allOk){ setDone(true); }
    }
  }

  function erase(){
    if(!selected) return;
    const {r,c}=selected;
    const cell = cells[r][c];
    if(cell.fixed) return;
    const before = JSON.stringify(cells.map(row=> row.map(cell=> ({v:cell.value,f:cell.fixed,n:[...cell.notes]}))));
    const next = cells.map(row=> row.map(cell=> ({...cell, notes:new Set(cell.notes)})));
    next[r][c].value=0; next[r][c].notes.clear();
    pushHistory(before);
    setCells(next);
  }

  function undo(){
    setHistory(h => {
      if(h.length===0) return h;
      const last = h[h.length-1];
      const parsed = JSON.parse(last);
      const restored = parsed.map(row=> row.map(obj=> ({
        value: obj.v||0, fixed: !!obj.f, notes: new Set(obj.n||[])
      })));
      setCells(restored);
      return h.slice(0,-1);
    });
  }

  function handleSave(){
    saveSudokuResult({ seconds: elapsed, difficulty });
    navigate("/ranking?game=sudoku&difficulty="+encodeURIComponent(difficulty));
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>스도쿠</h1>
        <div className={styles.controls}>
          <span className={styles.time}>시간: <b>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}</b></span>
          <label className={styles.selectWrap}>
            난이도{" "}
            <select value={difficulty} onChange={e=>{ setDifficulty(e.target.value); newPuzzle(e.target.value); }}>
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
              <option value="expert">전문가</option>
            </select>
          </label>
          <button className={styles.btn} onClick={()=> newPuzzle(difficulty)}>새 퍼즐</button>
        </div>
      </div>

      <SudokuGrid
        cells={cells}
        selected={selected}
        setSelected={setSelected}
        memoMode={memoMode}
        onNumber={applyNumber}
        onErase={erase}
      />

      <div className={styles.footer}>
        <div className={styles.actions}>
          <button onClick={undo} className={styles.action}><span className={styles.icon}>↩</span> 실행 취소</button>
          <button onClick={erase} className={styles.action}><span className={styles.icon}>⌫</span> 지우기</button>
          <button onClick={()=> setMemoMode(v=>!v)} className={styles.action}>
            <span className={styles.icon}>✎</span> 메모 <span className={styles.badge}>{memoMode? "On":"Off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

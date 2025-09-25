/* eslint-disable no-restricted-globals */
// --- Sudoku engine (당신 코드 그대로 옮김, 약간 정리) ---
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
    if(sz<bestSize){ best={r,c,cand}; bestSize=sz; if(sz===1) return best; }
  } return best;
}
function solveBacktrack(board, cap=2){
  const b=dc(board); let solutions=0;
  (function dfs(){
    if(solutions>=cap) return;
    const m=findEmptyCellMRV(b); if(!m){ solutions++; return; }
    const {r,c,cand}=m;
    // LCV: 작은 수부터 섞어주기 (조금 더 빨라짐)
    const order=[...cand].sort(()=>Math.random()-0.5);
    for(const d of order){ b[r][c]=d; dfs(); b[r][c]=0; if(solutions>=cap) return; }
  })(); return solutions;
}
function generateFullSolution(){
  const b = Array.from({length:9}, ()=>Array(9).fill(0));
  (function fillCell(idx=0){
    if(idx===81) return true;
    const r=Math.floor(idx/9), c=idx%9;
    const digits = DIGITS.slice().sort(()=>Math.random()-0.5);
    for(const d of digits){
      if(!rowVals(b,r).has(d)&&!colVals(b,c).has(d)&&!boxVals(b,r,c).has(d)){
        b[r][c]=d; if(fillCell(idx+1)) return true; b[r][c]=0;
      }
    } return false;
  })(); return b;
}
function makePuzzleUnique(full, cluesTarget=36){
  const b = dc(full), positions=[];
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) positions.push({r,c});
  positions.sort(()=>Math.random()-0.5);
  let removed=0;
  for(const {r,c} of positions){
    const v1=b[r][c]; if(!v1) continue; b[r][c]=0;
    const r2=8-r, c2=8-c; let v2=null, pair=false;
    if(!(r===r2&&c===c2)){ v2=b[r2][c2]; if(v2){ b[r2][c2]=0; pair=true; } }
    const sols=solveBacktrack(b,2);
    if(sols!==1){ b[r][c]=v1; if(pair) b[r2][c2]=v2; }
    else{ removed+=pair?2:1; if(81-removed<=cluesTarget) break; }
  } return b;
}
// --- 간단한 전략평가 (당신 코드 요약본) ---
function applySingles(b){
  let progress=false;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++){
    if(!b[r][c]){ const cand=candidates(b,r,c);
      if(cand.size===1){ b[r][c]=[...cand][0]; progress=true; }
    }
  }
  return progress;
}
function strategySolve(board){
  const b=dc(board); let made=true;
  while(made){ made=false; if(applySingles(b)) made=true; }
  const solved = solveBacktrack(b,2)===1 && b.flat().every(v=>v);
  return { solved, singlesOnly: b.flat().every(v=>v) };
}
function ratePuzzle(p){
  const r1=strategySolve(p); if(r1.singlesOnly) return "easy";
  // 한 단계 더 허용
  return solveBacktrack(p,2)===1 ? "hard" : "expert";
}
// --- 시간예산 기반 생성기 ---
function generateRatedPuzzleWithBudget(target, msBudget){
  const allow = {
    easy:["easy"],
    normal:["easy","hard"],   // singles 또는 쉬운 백트래킹
    hard:["hard"],
    expert:["expert","hard"]  // 못찾으면 hard 허용
  }[target] || ["hard"];
  const clues = target==="easy"?40:target==="normal"?32:target==="hard"?28:24;
  const deadline = performance.now() + msBudget;
  let last={};
  for(let tries=0; tries<9999; tries++){
    if(performance.now()>deadline) break;
    const full=generateFullSolution();
    const puzzle=makePuzzleUnique(full, clues);
    const rating=ratePuzzle(puzzle);
    last={puzzle, solution:full, rating};
    if(allow.includes(rating)) return last;
  }
  return last; // 예산 초과 시 최근 결과 반환
}

// --- 메시지 핸들러 ---
self.onmessage = (e)=>{
  const { type, jobId, difficulty } = e.data||{};
  if(type!=="gen") return;
  const budget = difficulty==="easy"? 400
               : difficulty==="normal"? 900
               : difficulty==="hard"? 1800
               : 3000; // expert
  const out = generateRatedPuzzleWithBudget(difficulty, budget);
  self.postMessage({ jobId, ok:true, data: out });
};

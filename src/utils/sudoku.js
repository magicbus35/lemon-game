// src/utils/sudoku.js

// 0 = 빈칸
export function makeEmpty9() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isValid(board, r, c, v) {
  if (v < 1 || v > 9) return false;
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === v || board[i][c] === v) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (board[br + i][bc + j] === v) return false;
  return true;
}

// 백트래킹으로 정답 보드(완성형) 만들기
export function generateFullSolution(seedBoard = makeEmpty9()) {
  const board = seedBoard.map(r => r.slice());
  const nums = [1,2,3,4,5,6,7,8,9];

  function dfs(pos = 0) {
    if (pos === 81) return true;
    const r = (pos / 9) | 0, c = pos % 9;
    if (board[r][c] !== 0) return dfs(pos + 1);
    for (const v of shuffle(nums)) {
      if (isValid(board, r, c, v)) {
        board[r][c] = v;
        if (dfs(pos + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }
  if (!dfs(0)) throw new Error("Failed to generate a full solution");
  return board;
}

// 솔버: 해답 개수 세기 (limit 초과 시 조기 종료)
export function countSolutions(puzzle, limit = 2) {
  const b = puzzle.map(r => r.slice());
  let count = 0;

  function nextEmpty() {
    for (let i = 0; i < 81; i++) {
      const r = (i / 9) | 0, c = i % 9;
      if (b[r][c] === 0) return [r, c];
    }
    return null;
  }

  function dfs() {
    if (count >= limit) return; // 조기 중단
    const spot = nextEmpty();
    if (!spot) { count++; return; }
    const [r, c] = spot;
    for (let v = 1; v <= 9; v++) {
      if (isValid(b, r, c, v)) {
        b[r][c] = v;
        dfs();
        if (count >= limit) return;
        b[r][c] = 0;
      }
    }
  }
  dfs();
  return count;
}

// 퍼즐 생성: blanks 개 지우되 "유일해답" 유지
export function makeUniquePuzzleFrom(solution, blanks = 40) {
  const puzzle = solution.map(r => r.slice());
  // 모든 좌표 섞기
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => [ (i/9)|0, i%9 ]));

  let removed = 0;
  for (const [r, c] of cells) {
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;
    // 유일해답 검사
    const solCount = countSolutions(puzzle, 2);
    if (solCount !== 1) {
      puzzle[r][c] = backup; // 되돌림
      continue;
    }
    removed++;
    if (removed >= blanks) break;
  }
  return puzzle;
}

// 난이도 → blanks 매핑
export function blanksByDifficulty(diff = "normal") {
  switch (diff) {
    case "easy": return 32;    // 지우는 칸 적음
    case "normal": return 40;
    case "hard": return 50;    // 지우는 칸 많음
    default: return 40;
  }
}

// 편의: 보드 동일성 체크
export function equals9(a, b) {
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 9; j++)
      if (a[i][j] !== b[i][j]) return false;
  return true;
}

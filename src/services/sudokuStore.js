// src/services/sudokuStore.js
import { supabase } from "../lib/supabaseClient";

/**
 * 스도쿠 기록 저장 (닉네임/비번 검증 + insert)
 * DB에 설치된 RPC: save_sudoku_secure(p_nickname text, p_password text, p_puzzle_id uuid,
 *                                     p_elapsed_ms int, p_mistakes int, p_difficulty text)
 * 반환: { ok: true } | { ok:false, reason?: 'PASSWORD_REQUIRED'|'NICK_AUTH_FAILED'|'SERVER_ERROR' }
 */
export async function saveSudokuResult({
  nickname,
  password,
  puzzleId,
  elapsedMs,
  mistakes = 0,
  difficulty = "hard",
}) {
  try {
    const nick = (nickname || "").trim();
    const pass = (password || "").trim();

    if (!nick || pass.length < 4) {
      return { ok: false, reason: "BAD_INPUT" };
    }

    const { data, error } = await supabase.rpc("save_sudoku_secure", {
      p_nickname: nick,
      p_password: pass,
      p_puzzle_id: puzzleId,
      p_elapsed_ms: elapsedMs,
      p_mistakes: mistakes,
      p_difficulty: difficulty,
    });

    if (error) {
      console.error("[saveSudokuResult] rpc error:", error);
      return { ok: false, reason: "SERVER_ERROR" };
    }
    const norm = Array.isArray(data) ? data[0] : data;
    return norm && typeof norm === "object" ? norm : { ok: !!norm };
  } catch (e) {
    console.error("[saveSudokuResult] error:", e?.message || e);
    return { ok: false, reason: "SERVER_ERROR" };
  }
}

/**
 * 스도쿠 전체 베스트 시간 랭킹 (난이도 필터)
 * difficulty: 'super-easy' | 'easy' | 'normal' | 'hard'
 * 우선 뷰(sudoku_ranking_alltime; difficulty 컬럼 포함)를 시도하고,
 * 없으면 테이블(sudoku_scores)에서 폴백 집계
 */
export async function fetchSudokuAlltime(difficulty = "hard", limit = 50) {
  if (!supabase) return [];

  // 1차: 뷰 사용
  let { data, error } = await supabase
    .from("sudoku_ranking_alltime")
    .select("nickname, best_time_ms, achieved_at, difficulty")
    .eq("difficulty", difficulty)
    .order("best_time_ms", { ascending: true })
    .order("achieved_at", { ascending: true })
    .limit(limit);

  if (!error && Array.isArray(data)) {
    return data;
  }

  // 2차: 테이블 폴백
  console.warn("[fetchSudokuAlltime] fallback to table:", error?.message);
  const { data: rows, error: e2 } = await supabase
    .from("sudoku_scores")
    .select("nickname, elapsed_ms, created_at, difficulty")
    .eq("difficulty", difficulty)
    .order("elapsed_ms", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (e2) {
    console.error("[fetchSudokuAlltime] table err:", e2);
    return [];
  }
  return (rows || []).map((r) => ({
    nickname: r.nickname,
    best_time_ms: r.elapsed_ms,
    achieved_at: r.created_at,
    difficulty: r.difficulty,
  }));
}

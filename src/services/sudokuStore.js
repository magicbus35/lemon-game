// src/services/sudokuStore.js
import { supabase } from "../lib/supabaseClient";

/**
 * 스도쿠 기록 저장
 * DB RPC: save_sudoku_secure(
 *   p_nickname text, p_password text, p_puzzle_id uuid,
 *   p_elapsed_ms integer, p_mistakes integer, p_difficulty text
 * )
 * 성공: { ok:true }
 * 실패: { ok:false, reason:'PASSWORD_REQUIRED'|'NICK_AUTH_FAILED'|'BAD_INPUT'|'SERVER_ERROR' }
 */
export async function saveSudokuResult({
  nickname,
  password,
  puzzleId,
  elapsedMs,
  mistakes = 0,
  difficulty = "hard",
} = {}) {
  try {
    console.log("[saveSudokuResult] ⛳ input:", {
      nickname,
      password: password ? "(provided)" : "(empty)",
      puzzleId,
      elapsedMs,
      mistakes,
      difficulty,
    });

    // 입력 검증
    const nick = String(nickname ?? "").trim();
    const pass = String(password ?? "").trim();
    if (!nick) {
      console.warn("[saveSudokuResult] BAD_INPUT: nickname empty");
      return { ok: false, reason: "BAD_INPUT", details: "nickname empty" };
    }
    if (!pass) {
      console.warn("[saveSudokuResult] PASSWORD_REQUIRED");
      return { ok: false, reason: "PASSWORD_REQUIRED" };
    }
    const ms = Number(elapsedMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      console.warn("[saveSudokuResult] BAD_INPUT: elapsedMs invalid:", elapsedMs);
      return { ok: false, reason: "BAD_INPUT", details: "elapsedMs invalid" };
    }
    const diff = String(difficulty || "hard");

    // Supabase 미연결 시 로컬 폴백 (랭킹 반영 X)
    if (!supabase) {
      console.log("[saveSudokuResult] supabase null → local fallback");
      try {
        const raw = localStorage.getItem("sudoku_scores");
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({
          id: `local_${Date.now()}`,
          nickname: nick,
          elapsed_ms: ms,
          mistakes: Number(mistakes) || 0,
          difficulty: diff,
          puzzle_id: String(puzzleId || ""),
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("sudoku_scores", JSON.stringify(arr));
        console.log("[saveSudokuResult] ✅ local saved:", arr[arr.length - 1]);
        return { ok: true };
      } catch (e) {
        console.error("[saveSudokuResult] ❌ local fallback error:", e);
        return { ok: false, reason: "SERVER_ERROR" };
      }
    }

    // Supabase RPC 호출
    const rpcArgs = {
      p_nickname: nick,
      p_password: pass,
      p_puzzle_id: puzzleId || null,
      p_elapsed_ms: ms,
      p_mistakes: Number(mistakes) || 0,
      p_difficulty: diff,
    };
    console.log("[saveSudokuResult] RPC args:", {
      ...rpcArgs,
      p_password_len: rpcArgs.p_password?.length ?? 0, // 실제 비번 노출 금지
    });

    const { data, error } = await supabase.rpc("save_sudoku_secure", rpcArgs);

    if (error) {
      console.error("[saveSudokuResult] ❌ rpc error:", error);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("password") || msg.includes("auth")) {
        return { ok: false, reason: "NICK_AUTH_FAILED" };
      }
      return { ok: false, reason: "SERVER_ERROR" };
    }

    const norm = Array.isArray(data) ? data[0] : data;
    console.log("[saveSudokuResult] rpc returned:", norm);

    // ✅ DB에서 { ok, reason } 형태로 내려주면 그대로 반영
    if (norm && typeof norm === "object" && "ok" in norm) {
      return norm.ok ? { ok: true } : { ok: false, reason: norm.reason || "SERVER_ERROR" };
    }

    // 반환값이 없으면 성공으로 간주(환경에 따라 함수가 void일 수 있음)
    return { ok: true };
  } catch (e) {
    console.error("[saveSudokuResult] ❌ unexpected error:", e);
    return { ok: false, reason: "SERVER_ERROR" };
  }
}

/**
 * 스도쿠 올타임 랭킹 조회 (난이도 선택 가능)
 * @param {number} limit
 * @param {string=} difficulty  예: "easy" | "normal" | "hard" | "expert" | "test"
 */
export async function fetchSudokuAlltime(limit = 50, difficulty) {
  try {
    if (!supabase) {
      console.warn("[fetchSudokuAlltime] supabase=null → []");
      return [];
    }

    // 1) 뷰 우선
    {
      let q = supabase
        .from("sudoku_ranking_alltime")
        .select("*")
        .order("best_time_ms", { ascending: true })
        .order("achieved_at", { ascending: true })
        .limit(limit);

      if (difficulty) q = q.eq("difficulty", String(difficulty));

      const { data: rows, error } = await q;

      if (!error && Array.isArray(rows)) {
        return rows.map((r) => ({
          nickname: r.nickname,
          best_time_ms: r.best_time_ms,
          achieved_at: r.achieved_at,
          difficulty: r.difficulty || "unknown",
        }));
      }
      if (error) console.warn("[fetchSudokuAlltime] view fallback:", error?.message);
    }

    // 2) 테이블 폴백
    {
      let q2 = supabase
        .from("sudoku_scores")
        .select("nickname, elapsed_ms, created_at, difficulty")
        .order("elapsed_ms", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(limit);

      if (difficulty) q2 = q2.eq("difficulty", String(difficulty));

      const { data: rows2, error: e2 } = await q2;
      if (e2) {
        console.error("[fetchSudokuAlltime] table err:", e2);
        return [];
      }
      return (rows2 || []).map((r) => ({
        nickname: r.nickname,
        best_time_ms: r.elapsed_ms,
        achieved_at: r.created_at,
        difficulty: r.difficulty,
      }));
    }
  } catch (e) {
    console.error("[fetchSudokuAlltime] unexpected error:", e);
    return [];
  }
}

// src/services/watermelonStore.js
import { supabase } from "../lib/supabaseClient";

// 저장
export async function saveWatermelonScore({ nickname, password, score } = {}) {
  try {
    const nick = String(nickname ?? "").trim();
    const pass = String(password ?? "").trim();
    const sc   = Number(score ?? 0);

    if (!nick) return { ok:false, reason:"BAD_INPUT" };
    if (!pass) return { ok:false, reason:"PASSWORD_REQUIRED" };
    if (!Number.isFinite(sc) || sc < 0) return { ok:false, reason:"BAD_INPUT" };

    // 로컬 폴백
    if (!supabase) {
      const raw = localStorage.getItem("watermelon_scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id:`local_${Date.now()}`, nickname:nick, score:sc, created_at:new Date().toISOString() });
      localStorage.setItem("watermelon_scores", JSON.stringify(arr));
      return { ok:true };
    }

    // 서버 RPC (SQL 함수명과 일치해야 함)
    const { data, error } = await supabase.rpc("save_watermelon_secure", {
      p_nickname: nick,
      p_password: pass,
      p_score: sc,
    });

    if (error) return { ok:false, reason:"SERVER_ERROR" };

    const norm = Array.isArray(data) ? data[0] : data;
    if (norm && typeof norm === "object" && "ok" in norm) {
      return norm.ok ? { ok:true } : { ok:false, reason:norm.reason || "SERVER_ERROR" };
    }
    return { ok:true };
  } catch (e) {
    console.error("[saveWatermelonScore] error:", e);
    return { ok:false, reason:"SERVER_ERROR" };
  }
}

/**
 * ✅ 통일된 반환 형식:
 *   [{ nickname, score, created_at }, ...]
 * - Supabase RPC(get_watermelon_top) 또는 테이블에서 직접 조회
 */
export async function fetchWatermelonAlltime(limit = 50) {
  try {
    if (supabase) {
      // 1) RPC 우선
      const { data, error } = await supabase.rpc("get_watermelon_top", { p_limit: limit });
      if (!error && Array.isArray(data)) {
        return data.map((r) => ({
          nickname: r.nickname ?? r.name ?? "",
          score: Number(r.score ?? r.best_score ?? 0),
          created_at: r.created_at ?? r.achieved_at ?? r.ts ?? null,
        }));
      }

      // 2) RPC 없거나 실패 → 테이블 직접
      const { data: rows, error: err2 } = await supabase
        .from("watermelon_scores")
        .select("nickname, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(Math.max(1, limit));

      if (!err2 && Array.isArray(rows)) return rows;
      return [];
    }

    // 3) 로컬 폴백
    const raw = localStorage.getItem("watermelon_scores");
    const arr = raw ? JSON.parse(raw) : [];
    arr.sort((a,b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
    return arr.slice(0, limit).map(r => ({
      nickname: r.nickname,
      score: r.score,
      created_at: r.created_at,
    }));
  } catch (e) {
    console.error("[fetchWatermelonAlltime] error:", e);
    return [];
  }
}

/** 홈 카드 TOP3 등에서 재사용 */
export async function fetchWatermelonTop(limit = 3) {
  return fetchWatermelonAlltime(limit);
}

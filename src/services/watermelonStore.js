// src/services/watermelonStore.js
import { supabase } from "../lib/supabaseClient";

// 저장 (이미 만들었으면 그대로 사용)
export async function saveWatermelonScore({ nickname, password, score } = {}) {
  try {
    const nick = String(nickname ?? "").trim();
    const pass = String(password ?? "").trim();
    const sc   = Number(score ?? 0);

    if (!nick) return { ok:false, reason:"BAD_INPUT" };
    if (!pass) return { ok:false, reason:"PASSWORD_REQUIRED" };
    if (!Number.isFinite(sc) || sc < 0) return { ok:false, reason:"BAD_INPUT" };

    if (!supabase) {
      const raw = localStorage.getItem("watermelon_scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id:`local_${Date.now()}`, nickname:nick, score:sc, created_at:new Date().toISOString() });
      localStorage.setItem("watermelon_scores", JSON.stringify(arr));
      return { ok:true };
    }

    // RPC 이름은 SQL과 맞춰주세요. (아래 SQL은 save_watermelon_secure)
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

// ✅ TOP N 불러오기
export async function fetchWatermelonTop(limit = 3) {
  try {
    // 1순위: 랭킹 뷰/함수 사용
    if (supabase) {
      const { data, error } = await supabase.rpc("get_watermelon_top", { p_limit: limit });
      if (!error && Array.isArray(data)) return data;
      // 뷰 없는 경우 테이블에서 직접 best를 계산
      const { data: rows, error: err2 } = await supabase
        .from("watermelon_scores")
        .select("nickname, score, created_at")
        .order("score", { ascending: false })
        .limit(Math.max(1, limit));
      if (!err2 && Array.isArray(rows)) {
        return rows.map((r) => ({ nickname: r.nickname, best_score: r.score, achieved_at: r.created_at }));
      }
      return [];
    }

    // 로컬 폴백
    const raw = localStorage.getItem("watermelon_scores");
    const arr = raw ? JSON.parse(raw) : [];
    arr.sort((a,b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
    return arr.slice(0, limit).map(r => ({
      nickname: r.nickname,
      best_score: r.score,
      achieved_at: r.created_at
    }));
  } catch (e) {
    console.error("[fetchWatermelonTop] error:", e);
    return [];
  }
}

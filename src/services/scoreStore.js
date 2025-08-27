// src/services/scoreStore.js
import { supabase } from "../lib/supabaseClient";

/**
 * 점수 저장: Supabase 가능 시 원격 저장, 아니면 localStorage 폴백
 * @param {{ nickname: string, score: number }} payload
 * @returns {Promise<boolean>} 성공 여부
 */
export async function saveScore(payload) {
  try {
    const { nickname, score } = payload || {};
    if (
      typeof nickname !== "string" ||
      !nickname.trim() ||
      typeof score !== "number" ||
      Number.isNaN(score)
    ) {
      return false; // 형식 불일치
    }

    if (supabase) {
      const { error } = await supabase
        .from("scores")
        .insert({ nickname: nickname.trim(), score })
        .select("id")
        .single();
      if (error) throw error;
    } else {
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ nickname: nickname.trim(), score, created_at: new Date().toISOString() });
      localStorage.setItem("scores", JSON.stringify(arr));
    }

    return true;
  } catch (e) {
    console.error("[scoreStore.saveScore] error:", e);
    return false;
  }
}

/**
 * 랭킹 조회: 닉네임당 최고점(뷰 ranking_top) 기준 TOP N
 * 뷰가 없으면 임시 폴백: scores에서 가져와 닉네임별 1회만 남김
 */
export async function fetchRanking(limit = 50) {
  try {
    if (!supabase) {
      // 로컬 폴백
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      return dedupeTopByNickname(arr)
        .sort(sortByScoreDescThenCreatedAtAsc)
        .slice(0, limit);
    }

    // 1차: 뷰 사용(권장)
    const { data, error } = await supabase
      .from("ranking_top")
      .select("nickname, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      // 2차: 뷰가 없을 때(예: 42P01) 폴백
      console.warn("[fetchRanking] view ranking_top not available, fallback to client dedupe:", error?.message);
      const { data: raw, error: e2 } = await supabase
        .from("scores")
        .select("nickname, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit * 5); // 여유있게
      if (e2) throw e2;
      const deduped = dedupeTopByNickname(raw).sort(sortByScoreDescThenCreatedAtAsc);
      return deduped.slice(0, limit);
    }

    return data ?? [];
  } catch (e) {
    console.error("[scoreStore.fetchRanking] error:", e?.message || e);
    return [];
  }
}

// 헬퍼들
function sortByScoreDescThenCreatedAtAsc(a, b) {
  if ((b?.score ?? 0) !== (a?.score ?? 0)) return (b?.score ?? 0) - (a?.score ?? 0);
  const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
  const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
  return ta - tb;
}
function dedupeTopByNickname(rows = []) {
  const best = new Map();
  for (const r of rows) {
    const nick = r?.nickname?.toString?.() ?? "";
    if (!nick) continue;
    const cur = best.get(nick);
    if (!cur) {
      best.set(nick, r);
    } else {
      // 더 높은 점수 또는 같은 점수면 더 이른 created_at 유지
      if ((r.score ?? 0) > (cur.score ?? 0)) best.set(nick, r);
      else if ((r.score ?? 0) === (cur.score ?? 0)) {
        const ta = new Date(r.created_at || r.createdAt || 0).getTime();
        const tb = new Date(cur.created_at || cur.createdAt || 0).getTime();
        if (ta < tb) best.set(nick, r);
      }
    }
  }
  return Array.from(best.values());
}

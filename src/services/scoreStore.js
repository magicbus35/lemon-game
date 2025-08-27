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
        .select("id") // 불필요한 컬럼 최소화
        .single();
      if (error) throw error; // ✅ 에러 체크
    } else {
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ nickname: nickname.trim(), score, createdAt: Date.now() });
      localStorage.setItem("scores", JSON.stringify(arr));
    }

    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[scoreStore.saveScore] error:", e);
    return false;
  }
}

/**
 * 랭킹 조회: 상위 점수 순서대로 반환
 * @param {number} limit 최대 개수 (기본 50)
 * @returns {Promise<Array<{nickname:string, score:number, created_at?:string, createdAt?:number}>>}
 */
export async function fetchRanking(limit = 50) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("scores")
        .select("nickname, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true }) // 동점 시 먼저 올린 사람 우선
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    } else {
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.sort(
        (a, b) => (b.score - a.score) || ((a.createdAt || 0) - (b.createdAt || 0))
      );
      return arr.slice(0, limit);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[scoreStore.fetchRanking] error:", e);
    return [];
  }
}

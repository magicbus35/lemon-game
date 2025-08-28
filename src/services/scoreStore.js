// src/services/scoreStore.js
import { supabase } from "../lib/supabaseClient";

/** 점수 저장 */
export async function saveScore(nickname, score) {
  if (!supabase) throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");

  const { error } = await supabase.from("scores").insert([{ nickname, score }]);
  if (error) {
    console.error("❌ saveScore 실패:", error);
    throw error;
  }
  return true;
}

/** 랭킹 조회 (뷰 ranking_top 우선, 실패 시 fallback) */
export async function fetchRanking() {
  if (!supabase) throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");

  // 1) ranking_top 뷰 사용
  let { data, error } = await supabase
    .from("ranking_top")
    .select("nickname, score, created_at")
    .order("score", { ascending: false });

  if (!error && data) return data;

  // 2) fallback — scores에서 닉네임별 최고점 계산
  console.warn("⚠️ ranking_top 조회 실패, fallback으로 진행:", error?.message);
  const { data: scores, error: err2 } = await supabase
    .from("scores")
    .select("nickname, score, created_at")
    .order("score", { ascending: false })
    .limit(500);

  if (err2) {
    console.error("❌ fetchRanking 실패:", err2.message);
    throw err2;
  }

  const bestByNick = {};
  for (const row of scores || []) {
    if (!bestByNick[row.nickname]) bestByNick[row.nickname] = row;
  }
  return Object.values(bestByNick).sort((a, b) => b.score - a.score);
}

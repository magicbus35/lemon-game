// src/services/analytics.js
import { supabase } from "../lib/supabaseClient";

/**
 * 플레이 이벤트 기록
 * @param {Object} payload
 * @param {'start'|'end'|'save'} payload.event
 * @param {string} payload.session_id
 * @param {number} [payload.score]
 * @param {number} [payload.duration_ms]
 * @param {string} [payload.nickname]
 * @param {string} [payload.user_agent]
 * @param {string} [payload.referrer]
 * @returns {Promise<boolean>}
 */
export async function logPlayEvent(payload = {}) {
  try {
    // Supabase 미설정 시 조용히 통과 (빌드/로컬에서 안전)
    if (!supabase) return true;

    const row = sanitize(payload);
    const { error } = await supabase
      .from("play_events")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[analytics.logPlayEvent] error:", e?.message || e);
    return false;
  }
}

/**
 * 시간대별(KST) 집계 가져오기 (옵션)
 * @param {number} limit 최근 N시간 행
 */
export async function fetchHourlyCounts(limit = 48) {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("play_counts_hour_kst")
      .select("*")
      .order("hour_kst", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[analytics.fetchHourlyCounts] error:", e?.message || e);
    return [];
  }
}

// --- helpers ---
function sanitize(o = {}) {
  const out = {
    event: o.event,
    session_id: o.session_id,
    score: numOrNull(o.score),
    duration_ms: numOrNull(o.duration_ms),
    nickname: strOrNull(o.nickname),
    user_agent: strOrNull(o.user_agent),
    referrer: strOrNull(o.referrer),
  };
  if (!out.event || !out.session_id) throw new Error("invalid payload");
  return out;
}
function numOrNull(v) {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}
function strOrNull(v) {
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
}

// src/services/analytics.js
import { supabase } from "../lib/supabaseClient";

/**
 * 이벤트 로깅
 * event: 'start' | 'end' | 'save'
 * extras: { session_id?: string, nickname?: string, score?: number, duration_ms?: number }
 */
export async function logPlayEvent(event, extras = {}) {
  try {
    if (!supabase) return; // 환경 변수 미설정 시 조용히 스킵

    const payload = {
      event, // 'start' | 'end' | 'save'
      session_id: extras.session_id || (crypto?.randomUUID?.() ?? null),
      nickname: extras.nickname ?? null,
      score: typeof extras.score === "number" ? extras.score : null,
      duration_ms: typeof extras.duration_ms === "number" ? extras.duration_ms : null,
      user_agent: navigator?.userAgent || null,
      referrer: document?.referrer || null,
    };

    const { error } = await supabase.from("play_events").insert([payload]);
    if (error) console.warn("[analytics] insert error:", error.message);
  } catch (e) {
    console.warn("[analytics] failed:", e?.message || e);
  }
}

/** 시간대별 집계 조회 (KST 뷰: play_counts_hour_kst) */
export async function fetchHourlyCounts(hours = 24) {
  try {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("play_counts_hour_kst")
      .select("hour_kst, total_events, starts, ends, saves")
      .order("hour_kst", { ascending: false })
      .limit(hours);

    if (error) {
      console.warn("[analytics] fetchHourlyCounts error:", error.message);
      return [];
    }

    return (data || []).sort(
      (a, b) => new Date(a.hour_kst).getTime() - new Date(b.hour_kst).getTime()
    );
  } catch (e) {
    console.warn("[analytics] fetchHourlyCounts failed:", e?.message || e);
    return [];
  }
}

export const logStart = (extras = {}) => logPlayEvent("start", extras);
export const logEnd   = (extras = {}) => logPlayEvent("end", extras);
export const logSave  = (extras = {}) => logPlayEvent("save", extras);

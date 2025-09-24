// src/services/scoreStore.js
import { supabase } from "../lib/supabaseClient";

/**
 * 점수 저장 (단일 엔트리 포인트)
 * - password가 있으면 RPC(save_score_secure)로 검증/저장
 * - password가 없으면 과거 호환: scores에 직접 insert
 * 반환: { ok: true } | { ok:false, reason?: 'PASSWORD_REQUIRED'|'PASSWORD_MISMATCH'|'BAD_INPUT' }
 */
export async function saveScore(payload) {
  try {
    const { nickname, score, password } = payload || {};
    console.log("[saveScore] input:", payload);

    if (
      typeof nickname !== "string" ||
      !nickname.trim() ||
      typeof score !== "number" ||
      Number.isNaN(score)
    ) {
      console.warn("[saveScore] BAD_INPUT:", { nickname, score });
      return { ok: false, reason: "BAD_INPUT" };
    }
    const nick = nickname.trim().toLowerCase();
    const pass = String(password ?? "").trim();

    // 로컬 폴백
    if (!supabase) {
      console.log("[saveScore] supabase null → local fallback");
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({
        id: `local_${Date.now()}`,
        nickname: nick,
        score,
        game: "lemon",
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("scores", JSON.stringify(arr));
      return { ok: true };
    }

    // 비밀번호 없으면 거부
    if (!pass) {
      console.warn("[saveScore] PASSWORD_REQUIRED");
      return { ok: false, reason: "PASSWORD_REQUIRED" };
    }

    // 닉네임 선점/검증
    console.log("[saveScore] calling nick_set_or_check:", { nick, pass });
    const { data: ok1, error: e1 } = await supabase.rpc("nick_set_or_check", {
      p_nickname: nick,
      p_password: pass,
    });
    console.log("[saveScore] nick_set_or_check result:", { ok1, e1 });

    if (e1) {
      console.error("[nick_set_or_check] error:", e1);
      return { ok: false, reason: "RPC_ERROR" };
    }
    if (!ok1) {
      console.warn("[saveScore] PASSWORD_MISMATCH");
      return { ok: false, reason: "PASSWORD_MISMATCH" };
    }

    // 점수 저장
    console.log("[saveScore] calling save_score_secure:", {
      nick,
      pass,
      score,
    });
    const { data, error } = await supabase.rpc("save_score_secure", {
      p_nickname: nick,
      p_password: pass,
      p_score: score,
    });
    console.log("[saveScore] save_score_secure result:", { data, error });

    if (error) {
      console.error("[RPC save_score_secure] error:", error);
      return { ok: false, reason: "RPC_ERROR" };
    }

    const norm = Array.isArray(data) ? data[0] : data;
    console.log("[saveScore] normalized result:", norm);

    if (norm && typeof norm === "object" && "ok" in norm) {
      return { ok: !!norm.ok, reason: norm.reason };
    }
    return { ok: !!norm };
  } catch (e) {
    console.error("[saveScore] unexpected error:", e);
    return { ok: false, reason: "UNEXPECTED" };
  }
}

// 과거 코드 호환용 이름
export const saveScoreWithPassword = saveScore;

/**
 * 랭킹 조회
 * @param {{scope?: 'season'|'all', limit?: number}} opts
 *  - scope: 'season' => ranking_top_season_current (이번 시즌)
 *           'all'    => ranking_top_alltime      (전체 최고)
 *  - limit: 기본 50
 * 뷰 조회 실패 시 scores에서 닉네임별 최고점 폴백 처리
 */
export async function fetchRanking(opts = {}) {
  const { scope = "season", limit = 50 } = opts;

  try {
    if (!supabase) {
      // 로컬 폴백
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      return dedupeTopByNickname(arr)
        .sort(sortByScoreDescThenCreatedAtAsc)
        .slice(0, limit);
    }

    const viewName =
      scope === "all" ? "ranking_top_alltime" : "ranking_top_season_current";

    // 1차: 뷰 사용(권장)
    const { data, error } = await supabase
      .from(viewName)
      .select("nickname, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      // 2차: 뷰가 없거나 권한 이슈 → scores에서 폴백
      console.warn(`[fetchRanking] view ${viewName} fallback:`, error?.message);
      const { data: raw, error: e2 } = await supabase
        .from("scores")
        .select("nickname, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit * 5); // 여유 확보
      if (e2) throw e2;
      const deduped = dedupeTopByNickname(raw).sort(
        sortByScoreDescThenCreatedAtAsc
      );
      return deduped.slice(0, limit);
    }

    return data ?? [];
  } catch (e) {
    console.error("[fetchRanking] error:", e?.message || e);
    return [];
  }
}

/** 지난 시즌(YYYY-MM) 랭킹 조회: Supabase RPC 사용 */
export async function fetchRankingByMonth(ym, limit = 100) {
  // 로컬 폴백(오프라인 개발용)
  if (!supabase) {
    const raw = localStorage.getItem("scores");
    const arr = raw ? JSON.parse(raw) : [];
    // 로컬에서는 월 필터가 불가능하므로 단순 정렬만
    const sorted = arr
      .sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          new Date(a.created_at) - new Date(b.created_at)
      )
      .slice(0, limit);
    return sorted;
  }

  const { data, error } = await supabase.rpc("ranking_top_by_month", {
    p_ym: ym,
  });
  if (error) throw error;

  // 안전 차원에서 한 번 더 정렬
  const rows = (data ?? []).sort(
    (a, b) =>
      (b.score ?? 0) - (a.score ?? 0) ||
      new Date(a.created_at) - new Date(b.created_at)
  );
  return rows.slice(0, limit);
}

/** DB에 실제 기록이 있는 시즌(YYYY-MM) 목록을 최신→과거로 가져옴 */
export async function fetchAvailableSeasons() {
  // 로컬 폴백(개발/오프라인): localStorage에서 달만 추정
  if (!supabase) {
    const raw = localStorage.getItem("scores");
    const arr = raw ? JSON.parse(raw) : [];
    const set = new Set(
      arr
        .map((r) => {
          const d = new Date(r.created_at || r.createdAt);
          if (Number.isNaN(+d)) return null;
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          return `${y}-${m}`;
        })
        .filter(Boolean)
    );
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }

  const { data, error } = await supabase
    .from("seasons_with_data_kst")
    .select("ym, mstart")
    .order("mstart", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => r.ym);
}

// ---- helpers ----
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

/** KST 기준 현재 시즌 라벨 'YYYY-MM' */
export function getCurrentSeasonLabelKST(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Seoul",
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m =
    parts.find((p) => p.type === "month")?.value?.padStart(2, "0") ?? "00";
  return `${y}-${m}`;
}

/** 최근 N개월 시즌 라벨 목록(현재 포함, 최신→과거) — (지금은 미사용) */
export function listRecentSeasonsKST(n = 12) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    out.push(getCurrentSeasonLabelKST(d));
  }
  return out;
}

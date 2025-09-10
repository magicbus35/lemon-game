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
    if (
      typeof nickname !== "string" ||
      !nickname.trim() ||
      typeof score !== "number" ||
      Number.isNaN(score)
    ) {
      return { ok: false, reason: "BAD_INPUT" };
    }
    const nick = nickname.trim();

    // 🥾 로컬 폴백(개발/오프라인)
    if (!supabase) {
      const raw = localStorage.getItem("scores");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ nickname: nick, score, created_at: new Date().toISOString() });
      localStorage.setItem("scores", JSON.stringify(arr));
      return { ok: true };
    }

    // 🔐 비번이 있는 경우: 서버 RPC로 처리
    if (password && String(password).trim()) {
      const { data, error } = await supabase.rpc("save_score_secure", {
        p_nickname: nick,
        p_password: String(password),
        p_score: score,
      });

      if (error) {
        console.error("[RPC save_score_secure] error:", error);
        return { ok: false };
      }

      // 일부 환경에서 jsonb가 배열로 올 수 있어 정규화
      const norm = Array.isArray(data) ? data[0] : data;

      // 서버가 {ok, reason?} 형태로 반환
      if (norm && typeof norm === "object" && "ok" in norm) {
        if (!norm.ok && norm.reason) {
          console.warn("[RPC save_score_secure] fail:", norm.reason);
        }
        return { ok: !!norm.ok, reason: norm.reason };
      }

      // 혹시 boolean 스칼라로 오는 경우
      return { ok: !!norm };
    }

    // 비번 없이 과거 방식(호환)
    const { error } = await supabase
      .from("scores")
      .insert({ nickname: nick, score })
      .select("id")
      .single();

    if (error) {
      console.error("[scores.insert] error:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[saveScore] unexpected error:", e?.message || e);
    return { ok: false };
  }
}

// 과거 코드 호환용 이름
export const saveScoreWithPassword = saveScore;

/**
 * 랭킹 조회: 닉네임당 최고점(뷰 ranking_top) 기준 TOP N
 * 뷰가 없으면 폴백: scores에서 가져와 닉네임별 최고 1개만 남김
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
      // 2차: 뷰가 없을 때 클라이언트에서 닉네임별 최고점 선별
      console.warn("[fetchRanking] view ranking_top fallback:", error?.message);
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

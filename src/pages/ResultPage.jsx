// src/pages/ResultPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as scoreStore from "../services/scoreStore";
import { useSettings } from "../hooks/useSettings";

// 닉네임 검증: 2~16자, 한/영/숫자/_/-, 공백 불가, 금지어
const NICK_RE = /^(?=.{2,16}$)[가-힣A-Za-z0-9_-]+$/;
const FORBIDDEN = ["익명", "anonymous", "anon"];

export default function ResultPage() {
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const { settings, save } = useSettings();
  const navigate = useNavigate();

  const trimmed = nickname.trim();
  const isValid = useMemo(() => {
    if (!NICK_RE.test(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    return !FORBIDDEN.some((w) => lower === w);
  }, [trimmed]);

  const onToggleRedirect = (e) => {
    save({ autoRedirectToRanking: e.target.checked });
  };

  const onSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      // 점수 전달 방식에 따라 가져오기 (예: location.state, 전역, 컨텍스트)
      // 임시: 전역을 사용 중이면 아래를 교체하세요.
      const score = typeof window !== "undefined" && window.__LEMON_SCORE__ ? window.__LEMON_SCORE__ : 0;

      const ok = await scoreStore.saveScore({
        nickname: trimmed,
        score,
      });

      if (ok) {
        if (settings.autoRedirectToRanking) {
          navigate("/ranking", { replace: true });
        } else {
          alert("등록 완료!");
        }
      } else {
        alert("등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ userSelect: "none", maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
      <h2>결과</h2>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="2~16자, 한/영/숫자/_/-"
          maxLength={16}
          style={{ display: "block", marginTop: 6, width: "100%" }}
        />
        {!isValid && trimmed.length > 0 && (
          <p style={{ color: "crimson", marginTop: 6 }}>
            닉네임 형식이 올바르지 않습니다. (2~16자, 한/영/숫자/_/-, 공백 불가, “익명/anonymous/anon” 금지)
          </p>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={!!settings.autoRedirectToRanking}
            onChange={onToggleRedirect}
          />
          {" "}등록 성공 시 자동으로 🏆 랭킹으로 이동
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={onSave} disabled={!isValid || saving}>
          {saving ? "저장 중..." : "등록"}
        </button>
        <button onClick={() => navigate("/ranking")}>🏆 랭킹 보기</button>
        <button onClick={() => navigate("/game")}>🍋 다시하기</button>
      </div>
    </main>
  );
}

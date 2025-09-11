// src/context/BirdyMode.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const BirdyContext = createContext({
  active: false,
  decide: (_prob = 0.03, _src = "auto") => false,
  set: (_on, _src = "manual") => {},
});

// /game?birdy=1 또는 /#/game?birdy=1 둘 다 지원
function getBirdyParam() {
  try {
    const s = new URLSearchParams(window.location.search);
    const p = s.get("birdy");
    if (p === "1" || p === "0") return p;
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex !== -1) {
      const hs = new URLSearchParams(hash.slice(qIndex + 1));
      const hp = hs.get("birdy");
      if (hp === "1" || hp === "0") return hp;
    }
  } catch {}
  return null;
}

export function BirdyModeProvider({ children }) {
  const [active, _setActive] = useState(false);

  // 🔒 사용자 토글 보호 락: 일정 시간(auto) 변경 무시
  const lockUntilRef = useRef(0);
  const lock = (ms = 600) => { lockUntilRef.current = Date.now() + ms; };
  const isLocked = () => Date.now() < lockUntilRef.current;

  const set = (on, src = "manual") => {
    // 사용자 토글이면 락을 건다 → 잠시 동안 auto 변경 무시
    if (src === "manual") lock(800);
    if (src !== "manual" && isLocked()) {
      // eslint-disable-next-line no-console
      console.log("[birdy] ignore set(", on, ") from", src, "(locked)");
      return active;
    }
    // eslint-disable-next-line no-console
    console.log("[birdy] set ->", on, "src=", src);
    _setActive(!!on);
    return !!on;
  };

  const decide = (prob = 1, src = "auto") => {
    if (src !== "manual" && isLocked()) {
      // eslint-disable-next-line no-console
      console.log("[birdy] ignore decide(prob=", prob, ") from", src, "(locked)");
      return active;
    }
    const on = Math.random() < prob;
    // eslint-disable-next-line no-console
    console.log("[birdy] decide(", prob, ") ->", on, "src=", src);
    _setActive(on);
    return on;
  };

  // html 클래스 토글 + 상태 로그
  useEffect(() => {
    const el = document.documentElement;
    if (active) el.classList.add("birdy");
    else el.classList.remove("birdy");
    // eslint-disable-next-line no-console
    console.log("[birdy] active:", active, "href:", window.location.href);
  }, [active]);

  // URL 파라미터 강제 (최초 진입 시)
  useEffect(() => {
    const p = getBirdyParam();
    if (p === "1") set(true, "url");
    if (p === "0") set(false, "url");
  }, []);

  // 전역 디버그 헬퍼
  useEffect(() => {
    try {
      window.birdySet = (on) => set(on, "console");
      window.birdyDecide = (p) => decide(p, "console");
      // eslint-disable-next-line no-console
      console.log("[birdy] expose window.birdySet(true/false), window.birdyDecide(p)");
    } catch {}
  }, []);

  const value = useMemo(() => ({ active, decide, set }), [active]);
  return <BirdyContext.Provider value={value}>{children}</BirdyContext.Provider>;
}

export function useBirdy() {
  return useContext(BirdyContext);
}

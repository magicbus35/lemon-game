import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const getInitial = () => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    // 시스템 선호
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  };

  const [theme, setTheme] = useState(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      title={theme === "dark" ? "다크 모드 (ON)" : "라이트 모드 (ON)"}
      aria-label="테마 전환"
      onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
      className="theme-toggle"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

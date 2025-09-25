import React, {createContext, useContext, useLayoutEffect, useMemo, useState, useEffect} from "react";

const ThemeCtx = createContext({ theme: "light", toggle: () => {}, setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply synchronously before paint so UI flips instantly
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  // Optional: follow OS theme
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")),
  }), [theme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

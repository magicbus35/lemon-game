import React from "react";
import { useTheme } from "../theme/ThemeProvider";

export default function ThemeToggle(){
  const { theme, toggle } = useTheme();
  return (
    <button type="button" aria-label="테마 전환" onClick={toggle}>
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

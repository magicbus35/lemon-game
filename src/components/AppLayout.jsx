// src/components/AppLayout.jsx
import { Link, NavLink, Outlet } from "react-router-dom";
import { useBirdy } from "../context/BirdyMode";
import { useTheme } from "../theme/ThemeProvider";

export default function AppLayout() {
  const { active: birdy, set } = useBirdy();

  const gameLabel   = birdy ? "버디 게임" : "레몬 게임";
  const iconSrc     = birdy ? "/images/birdy.png" : "/images/lemon.png"; // ← 아이콘 공통 소스
  const headerLogo  = iconSrc;                                           // 헤더 좌상단 로고도 동일

  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-900 dark:text-neutral-100 select-none">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-neutral-900/70 border-b border-gray-200 dark:border-neutral-800">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={headerLogo} alt="logo" width={24} height={24} draggable="false" />
            <span className="text-lg font-semibold tracking-tight">{gameLabel}</span>
          </Link>

          <nav className="flex items-center gap-2">
            {/* 게임 버튼 아이콘만 살짝 크게 (22px) */}
            <NavItem to="/game"    iconImgSrc={iconSrc} label={gameLabel} iconSize={22} />
            <NavItem to="/ranking" iconEmoji="🏆"       label="랭킹" />

            {/* 상태 뱃지 + 즉시 토글 */}
            <span
              className={
                "px-2 py-1 rounded text-xs font-semibold " +
                (birdy
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300")
              }
              title="현재 Birdy 상태"
            >
              {birdy ? "BIRDY: ON" : "BIRDY: OFF"}
            </span>
            <button
              type="button"
              onClick={() => set(!birdy, "manual")}
              className="px-2 py-1 rounded border text-xs hover:bg-yellow-50 dark:hover:bg-neutral-800"
              title="Birdy 토글"
            >
              토글
            </button>

            {/* 다크모드 토글 */}
            <button
              type="button"
              onClick={toggle}
              className="ml-2 px-3 py-2 rounded-lg border transition
                         hover:bg-yellow-50 hover:border-yellow-300
                         dark:hover:bg-neutral-800 dark:hover:border-neutral-700"
              aria-label="Toggle theme"
              title={isDark ? "라이트 모드로" : "다크 모드로"}
            >
              {isDark ? "🌙" : "☀️"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-sm text-gray-500 dark:text-neutral-400">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Lemon Game</span>
          <span className="opacity-80">{birdy ? "Birdy game" : "Lemon game"}</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * NavItem
 * - iconImgSrc가 있으면 이미지 아이콘 사용 (iconSize로 크기 조절)
 * - 아니면 iconEmoji 사용
 */
function NavItem({ to, iconImgSrc, iconEmoji, label, iconSize = 16 }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "px-3 py-2 rounded-lg border transition " +
        (isActive
          ? "bg-yellow-50 border-yellow-400 dark:bg-neutral-800 dark:border-neutral-600"
          : "hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-neutral-800 dark:hover:border-neutral-700")
      }
    >
      {iconImgSrc ? (
        <img
          src={iconImgSrc}
          alt=""
          width={iconSize}
          height={iconSize}
          className="inline-block align-[-3px] mr-1"
          draggable="false"
        />
      ) : (
        <span className="mr-1">{iconEmoji}</span>
      )}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

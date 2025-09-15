import { Link, NavLink, Outlet } from "react-router-dom";
import { useBirdy } from "../context/BirdyMode";
import { useTheme } from "../theme/ThemeProvider";

export default function AppLayout() {
  const { active: birdy } = useBirdy();

  const gameLabel   = birdy ? "버디 게임" : "레몬 게임";
  const iconSrc     = birdy ? "/images/birdy.png" : "/images/lemon.png"; // ← 아이콘 공통 소스
  const headerLogo  = iconSrc;                                           // 헤더 좌상단 로고도 동일

  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="theme-app min-h-screen select-none">
      <header className="sticky top-0 z-30 backdrop-blur bg-[var(--surface)]/70 border-b border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={headerLogo} alt="logo" width={28} height={28} draggable="false" />
            <span className="text-lg font-semibold tracking-tight">{gameLabel}</span>
          </Link>

          <nav className="flex items-center gap-2">
            <NavItem to="/game" iconImgSrc={iconSrc} label={gameLabel} />
            <NavItem to="/ranking" iconEmoji="🏆" label="랭킹" />

            {/* ✅ 다크모드 토글만 유지 (버디 토글/상태 뱃지 제거됨) */}
            <button
              type="button"
              onClick={toggle}
              className="ml-2 px-3 py-2 rounded-lg border transition
                         bg-[var(--surface-2)] border-[var(--border)]
                         hover:bg-[var(--cell-hover)]"
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

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-sm text-muted">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Lemon Game</span>
          {/* 상태 문구도 깔끔히 제거하거나 남기고 싶다면 아래 한 줄만 변경 */}
          {/* <span className="opacity-80">{birdy ? "Birdy game" : "Lemon game"}</span> */}
          <span className="opacity-80">Lemon game</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * NavItem
 * - iconImgSrc가 있으면 이미지 아이콘 사용
 * - 아니면 iconEmoji 사용
 */
function NavItem({ to, iconImgSrc, iconEmoji, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "px-3 py-2 rounded-lg border transition " +
        (isActive
          ? "bg-[var(--accent-weak)] border-[var(--accent)]"
          : "bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--cell-hover)]")
      }
    >
      {iconImgSrc ? (
        <img
          src={iconImgSrc}
          alt=""
          width={18}
          height={18}
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

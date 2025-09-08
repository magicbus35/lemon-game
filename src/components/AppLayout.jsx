// src/components/AppLayout.jsx
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTheme } from "../theme/ThemeProvider";

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-900 dark:text-neutral-100 select-none">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b dark:border-neutral-800">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/lemon.png" alt="lemon" width={24} height={24} draggable="false" />
            <span className="text-lg font-bold">lemon-game</span>
          </Link>

          <nav className="flex items-center gap-2">
            <NavItem to="/game" icon="🍋" label="레몬게임" />
            <NavItem to="/ranking" icon="🏆" label="랭킹" />

            {/* 다크모드 토글 */}
            <button
              type="button"
              onClick={toggle}
              className="ml-2 px-3 py-2 rounded-lg border transition
                         hover:bg-yellow-50 hover:border-yellow-300
                         dark:hover:bg-neutral-800 dark:hover:border-neutral-700"
              aria-label="Toggle theme"
              title="테마 전환"
            >
              {isDark ? "🌙 다크" : "☀️ 라이트"}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }) {
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
      {icon} <span className="font-medium">{label}</span>
    </NavLink>
  );
}

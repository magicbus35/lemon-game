// src/components/AppLayout.jsx
import { Link, NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white select-none">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/lemon.png" alt="lemon" width={24} height={24} draggable="false" />
            <span className="text-lg font-bold">lemon-game</span>
          </Link>
          <nav className="flex items-center gap-2">
            <NavItem to="/game" icon="🍋" label="레몬게임" />
            <NavItem to="/ranking" icon="🏆" label="랭킹" />
          </nav>
        </div>
      </header>

      {/* 뷰포트 기준 가로 중앙 정렬 */}
      <main className="w-full flex justify-center">
        <div className="w-full max-w-[1000px] px-4 sm:px-6 md:px-8 py-6 md:py-8">
          <Outlet />
        </div>
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
        (isActive ? "bg-yellow-50 border-yellow-400" : "hover:bg-yellow-50 hover:border-yellow-300")
      }
    >
      {icon} <span className="font-medium">{label}</span>
    </NavLink>
  );
}

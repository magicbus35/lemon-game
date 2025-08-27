// src/components/AppLayout.jsx
import { Link, NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-white select-none">
      {/* Sidebar (모든 페이지 공통) */}
      <aside className="w-64 border-r bg-gray-50/60 p-4">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src="/images/lemon.png" alt="lemon" width={28} height={28} draggable="false" />
          <h1 className="text-xl font-bold">lemon-game</h1>
        </Link>

        <nav className="flex flex-col gap-2">
          <NavItem to="/game" icon="🍋" label="레몬게임" />
          <NavItem to="/ranking" icon="🏆" label="랭킹" />
        </nav>

        <div className="mt-6 text-xs text-gray-500">
          <p>v1 • Made for friends</p>
        </div>
      </aside>

      {/* Page outlet */}
      <main className="flex-1 p-6 md:p-8">
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
          ? "bg-yellow-50 border-yellow-400"
          : "hover:bg-yellow-50 hover:border-yellow-300")
      }
    >
      {icon} <span className="font-medium">{label}</span>
    </NavLink>
  );
}

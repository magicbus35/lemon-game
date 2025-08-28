import { NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="min-h-screen grid" style={{ gridTemplateRows: "auto 1fr auto" }}>
      {/* 상단 네비 */}
      <nav className="sticky top-0 z-20 backdrop-blur bg-black/50 border-b border-white/10">
        <div className="container mx-auto px-4 py-2 flex items-center gap-2">
          <NavLink to="/" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/10 text-white" : "text-slate-200"}`}>홈</NavLink>
          <NavLink to="/game" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/10 text-white" : "text-slate-200"}`}>게임</NavLink>
          <NavLink to="/ranking" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/10 text-white" : "text-slate-200"}`}>랭킹</NavLink>
          <NavLink to="/result" className={({ isActive }) => `px-3 py-2 rounded-lg ${isActive ? "bg-white/10 text-white" : "text-slate-200"}`}>보조</NavLink>
        </div>
      </nav>

      {/* 페이지 콘텐츠 자리 */}
      <main className="container mx-auto px-4 mt-4">
        <Outlet />
      </main>

      {/* 푸터 */}
      <footer className="container mx-auto px-4 mt-4 text-sm text-gray-500 pb-8">
        lemon-game © {new Date().getFullYear()} — 10×17 합=10 퍼즐 · 레몬 +4 보너스
      </footer>
    </div>
  );
}

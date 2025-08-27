// src/pages/HomePage.jsx
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen flex bg-white select-none">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50/60 p-4">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="/images/lemon.png"
            alt="lemon"
            width={28}
            height={28}
            draggable="false"
          />
          <h1 className="text-xl font-bold">lemon-game</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <Link to="/game" className="group">
            <div className="px-3 py-2 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300 transition">
              🍋 <span className="font-medium">레몬게임</span>
            </div>
          </Link>
          <Link to="/ranking" className="group">
            <div className="px-3 py-2 rounded-lg border hover:bg-yellow-50 hover:border-yellow-300 transition">
              🏆 <span className="font-medium">랭킹</span>
            </div>
          </Link>
        </nav>

        <div className="mt-6 text-xs text-gray-500">
          <p>v1 • Made for friends</p>
        </div>
      </aside>

      {/* Main (Rules) */}
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🍋</span>
            <h2 className="text-2xl font-bold">레몬 게임 규칙</h2>
          </div>

          <ul className="space-y-3">
            <RuleItem index={1} text="두 점을 클릭하여 사각형 영역을 선택합니다" />
            <RuleItem index={2} text="선택한 영역의 숫자 합이 10이 되면 제거됩니다" />
            <RuleItem index={3} text="제한 시간 2분 동안 최대한 많은 점수를 획득하세요" />
            <RuleItem index={4} text="더 이상 10을 만들 수 없으면 자동으로 판이 리셋됩니다" />
            <RuleItem index={5} text="레몬을 지우면 4점을 더 얻습니다" />
          </ul>

          <div className="mt-6 text-gray-500 text-sm">
            <p>Tip: 카운트다운 3초 후 게임 시작. 텍스트 드래그 방지 & 빠른 다시하기 버튼 지원.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function RuleItem({ index, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold">
        {index}
      </span>
      <p className="leading-7">{text}</p>
    </li>
  );
}

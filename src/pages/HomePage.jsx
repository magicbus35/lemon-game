// src/pages/HomePage.jsx
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 select-none">
      <div className="text-center">
        <img
          src="/images/lemon.png"
          alt="lemon"
          width={96}
          height={96}
          draggable="false"
          className="mx-auto"
        />
        <h1 className="mt-3 text-3xl font-bold">lemon-game</h1>
        <p className="opacity-80 mt-1">직사각형 합이 10이면 제거! 120초 스피드런 🍋</p>
        <div className="mt-4 flex gap-3 justify-center">
          <Link to="/game">
            <button className="px-5 py-3 bg-black text-white rounded-lg hover:bg-gray-800">
              🍋 게임 시작
            </button>
          </Link>
          <Link to="/ranking">
            <button className="px-5 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
              🏆 랭킹 보기
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}

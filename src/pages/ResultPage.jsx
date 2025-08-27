// src/pages/ResultPage.jsx
import { Link } from "react-router-dom";

export default function ResultPage() {
  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-3">결과</h2>
      <p className="text-gray-700 mb-6">게임 결과 페이지(보조). 메인 흐름은 게임 종료 카드에서 처리됩니다.</p>

      <div className="flex gap-3">
        <Link to="/game">
          <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">🍋 다시하기</button>
        </Link>
        <Link to="/ranking">
          <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">🏆 랭킹 보기</button>
        </Link>
        <Link to="/">
          <button className="px-4 py-2 border rounded hover:bg-gray-50">홈</button>
        </Link>
      </div>
    </div>
  );
}

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score = 0 } = location.state || {};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-6">
      <h1 className="text-3xl font-bold mb-6">🍋 결과</h1>
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-md flex flex-col items-center">
        <p className="text-xl mb-4">
          최종 점수: <span className="text-green-600 font-bold">{score}</span>
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            🍋 다시하기
          </button>
          <button
            onClick={() => navigate("/ranking")}
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            🏆 랭킹 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;

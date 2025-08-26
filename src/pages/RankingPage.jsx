import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RankingPage = () => {
  const [rankings, setRankings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("scores")) || [];
    const sorted = stored.sort((a, b) => b.score - a.score);
    setRankings(sorted);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">🏆 랭킹</h1>
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 shadow-md flex flex-col items-center w-full max-w-2xl">
        <div className="bg-white shadow rounded-lg w-full">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-green-100 text-green-800">
                <th className="py-3 px-4 border">순위</th>
                <th className="py-3 px-4 border">닉네임</th>
                <th className="py-3 px-4 border">점수</th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-6 text-gray-500">
                    아직 등록된 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                rankings.map((r, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-green-50"}`}>
                    <td className="py-2 px-4 border font-semibold">{idx + 1}</td>
                    <td className="py-2 px-4 border">{r.name}</td>
                    <td className="py-2 px-4 border text-green-700 font-bold">{r.score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          🍋 메인으로
        </button>
      </div>
    </div>
  );
};

export default RankingPage;

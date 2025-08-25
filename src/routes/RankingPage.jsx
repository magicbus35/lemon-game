import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RankingPage = () => {
  const [rankings, setRankings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const records = JSON.parse(localStorage.getItem("lemonGameRecords") || "[]");

    // 같은 이름일 경우 최고 점수만 반영
    const bestScores = {};
    records.forEach((record) => {
      if (!bestScores[record.name] || bestScores[record.name].score < record.score) {
        bestScores[record.name] = record;
      }
    });

    const sorted = Object.values(bestScores).sort((a, b) => b.score - a.score);
    setRankings(sorted);
  }, []);

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold mb-6">🏆 랭킹</h1>

      {rankings.length === 0 ? (
        <p className="text-gray-500">저장된 기록이 없습니다.</p>
      ) : (
        <table className="border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">순위</th>
              <th className="border border-gray-300 px-4 py-2">닉네임</th>
              <th className="border border-gray-300 px-4 py-2">점수</th>
              <th className="border border-gray-300 px-4 py-2">날짜</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((record, index) => (
              <tr key={index} className="text-center">
                <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                <td className="border border-gray-300 px-4 py-2">{record.name}</td>
                <td className="border border-gray-300 px-4 py-2">{record.score}</td>
                <td className="border border-gray-300 px-4 py-2">{record.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-yellow-400 rounded font-semibold"
        >
          게임으로 돌아가기
        </button>
        <button
          onClick={() => navigate("/result")}
          className="px-4 py-2 bg-blue-400 text-white rounded font-semibold"
        >
          결과 페이지로
        </button>
      </div>
    </div>
  );
};

export default RankingPage;

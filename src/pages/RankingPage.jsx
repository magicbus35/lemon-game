// src/pages/RankingPage.jsx
import React, { useEffect, useState } from "react";
import { fetchRanking } from "../services/scoreStore";

export default function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rows = await fetchRanking();
        setRanking(rows || []);
      } catch (err) {
        console.error("랭킹 조회 실패:", err);
        setError("랭킹 데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-[800px] mx-auto px-4">
      <h1 className="text-3xl font-bold mb-4">🏆 랭킹</h1>

      {loading && <p>불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-3 py-2 text-left">순위</th>
              <th className="px-3 py-2 text-left">닉네임</th>
              <th className="px-3 py-2 text-right">점수</th>
              <th className="px-3 py-2 text-right">등록일</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  아직 등록된 점수가 없습니다.
                </td>
              </tr>
            )}
            {ranking.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{row.nickname}</td>
                <td className="px-3 py-2 text-right font-bold text-green-600">
                  {row.score}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-500">
                  {new Date(row.created_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

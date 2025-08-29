// src/pages/RankingPage.jsx
import { useEffect, useState } from "react";
import { fetchRanking } from "../services/scoreStore";
import { Link } from "react-router-dom";

export default function RankingPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const data = await fetchRanking(50); // 닉네임당 최고점(뷰 기반) TOP 50
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("랭킹을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (v) => {
    if (!v) return "-";
    try {
      const d = typeof v === "string" ? new Date(v) : new Date(Number(v));
      return d.toLocaleString("ko-KR");
    } catch { return "-"; }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">🏆 랭킹</h2>
        <div className="flex gap-2">
          <Link to="/game">
            <button className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800">
              🍋 게임 시작
            </button>
          </Link>
          <button onClick={load} className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
            새로고침
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-600">불러오는 중...</p>}
      {!loading && err && <p className="text-red-600">{err}</p>}
      {!loading && !err && rows.length === 0 && (
        <p className="text-gray-600">아직 등록된 기록이 없어요. 첫 기록을 남겨보세요!</p>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border-b px-3 py-2 w-16">순위</th>
                <th className="border-b px-3 py-2">닉네임</th>
                <th className="border-b px-3 py-2 w-28 text-right">점수</th>
                <th className="border-b px-3 py-2 w-56">등록 시간</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.nickname}-${i}`} className="odd:bg-white even:bg-gray-50">
                  <td className="border-t px-3 py-2">{i + 1}</td>
                  <td className="border-t px-3 py-2 break-all">{r.nickname}</td>
                  <td className="border-t px-3 py-2 text-right font-semibold">{r.score}</td>
                  <td className="border-t px-3 py-2">{formatDate(r.created_at ?? r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">동점이면 먼저 등록한 기록이 우선합니다.</p>
        </div>
      )}
    </div>
  );
}

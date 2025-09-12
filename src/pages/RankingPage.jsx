// src/pages/RankingPage.jsx
import React, { useEffect, useState } from "react";
import { fetchRanking } from "../services/scoreStore"; // ✅ 경로 확인
import { Link } from "react-router-dom";
import styles from "../styles/RankingPage.module.css";

function formatKST(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("ko-KR", { hour12: false });
  } catch {
    return isoString ?? "";
  }
}

export default function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchRanking(50); // TOP 50
      setRanking(rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={`${styles.root} text-[var(--text-muted)]`}>
      <div className="flex items-center justify-between mb-4">
        {/* 제목에도 muted 색상 강제 */}
        <h2 className="text-2xl font-bold text-[var(--text-muted)]">🏆 랭킹</h2>
        <div className="flex gap-2">
          <Link
            to="/game"
            className="px-3 py-2 rounded-lg border text-[var(--text-muted)]
                       bg-[var(--surface-2)] border-[var(--border)]
                       hover:bg-[var(--cell-hover)]"
          >
            🍋 게임 시작
          </Link>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg border text-[var(--text-muted)]
                       bg-[var(--surface-2)] border-[var(--border)]
                       hover:bg-[var(--cell-hover)]"
          >
            새로고침
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={`${styles.table} text-[var(--text-muted)]`}>
          <thead className={styles.thead}>
            <tr>
              <th style={{ width: 64 }}>순위</th>
              <th>닉네임</th>
              <th style={{ width: 96 }}>점수</th>
              <th style={{ width: 200 }}>기록 시간</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 16 }}>불러오는 중…</td>
              </tr>
            ) : ranking.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 16 }}>기록이 없습니다.</td>
              </tr>
            ) : (
              ranking.map((row, idx) => (
                <tr key={row.id ?? `${row.nickname}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>
                    {row.nickname}
                    {row.isMe && (
                      <span
                        className={styles.badgeMe}
                        style={{ marginLeft: 8 }}
                      >
                        내 기록
                      </span>
                    )}
                  </td>
                  <td>{row.score}</td>
                  <td>{formatKST(row.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

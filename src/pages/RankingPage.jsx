// src/pages/RankingPage.jsx
import React, { useEffect, useState } from "react";
import {
  fetchRanking,
  getCurrentSeasonLabelKST,
  fetchRankingByMonth,
  fetchAvailableSeasons,
} from "../services/scoreStore";
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // scope: 'season' | 'all'
  const [scope, setScope] = useState("season");

  // 시즌 선택
  const currentYM = getCurrentSeasonLabelKST();
  const [seasons, setSeasons] = useState([]);       // DB에 실제 기록 있는 월만
  const [selectedYM, setSelectedYM] = useState(""); // 로드 후 세팅

  // 시즌 목록 로드(기록 있는 월만)
  useEffect(() => {
    (async () => {
      try {
        const ys = await fetchAvailableSeasons();
        setSeasons(ys);
        // 기본 선택: 현재 시즌이 목록에 있으면 현재, 아니면 가장 최근(첫 번째)
        const cur = getCurrentSeasonLabelKST();
        setSelectedYM(ys.includes(cur) ? cur : (ys[0] || ""));
      } catch (e) {
        console.error("[RankingPage] load seasons failed:", e);
        setSeasons([]);
        setSelectedYM("");
      }
    })();
  }, []);

  const myNick = localStorage.getItem("nickname") || "";

  // 데이터 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (scope === "all") {
          const data = await fetchRanking({ scope: "all", limit: 100 });
          setRows(data);
        } else {
          if (!selectedYM) {
            setRows([]);
            return;
          }
          if (selectedYM === currentYM) {
            const data = await fetchRanking({ scope: "season", limit: 100 });
            setRows(data);
          } else {
            const data = await fetchRankingByMonth(selectedYM, 100);
            setRows(data);
          }
        }
      } catch (e) {
        console.error("[RankingPage] fetch failed:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope, selectedYM, currentYM]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>
          {scope === "season" ? `시즌 랭킹 (${selectedYM || "-"})` : "전체 최고 랭킹"}
        </h1>

        <div className={styles.controlsRow}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${scope === "season" ? styles.active : ""}`}
              onClick={() => setScope("season")}
              aria-pressed={scope === "season"}
            >
              시즌
            </button>
            <button
              className={`${styles.tab} ${scope === "all" ? styles.active : ""}`}
              onClick={() => setScope("all")}
              aria-pressed={scope === "all"}
            >
              전체
            </button>
          </div>

          {scope === "season" && seasons.length > 0 && (
            <div className={styles.seasonPicker}>
              <label className={styles.label} htmlFor="seasonSelect">
                시즌 선택
              </label>
              <select
                id="seasonSelect"
                className={styles.select}
                value={selectedYM}
                onChange={(e) => setSelectedYM(e.target.value)}
              >
                {seasons.map((ym) => (
                  <option key={ym} value={ym}>
                    {ym}
                    {ym === currentYM ? " (현재)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actions}>
            <Link className={styles.btn} to="/lemon-game">
              게임 시작
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 56 }}>순위</th>
              <th>닉네임</th>
              <th style={{ width: 120 }}>점수</th>
              <th style={{ width: 200 }}>달성시간(KST)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.loadingCell}>
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>
                  랭킹 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.nickname}-${row.created_at}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>
                    <span className={styles.nick}>{row.nickname}</span>
                    {myNick && myNick === row.nickname && (
                      <span className={styles.meBadge}>내 기록</span>
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

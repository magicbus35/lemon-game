// src/pages/RankingPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchRanking,
  getCurrentSeasonLabelKST,
  fetchRankingByMonth,
  fetchAvailableSeasons,
} from "../services/scoreStore";
import { fetchSudokuAlltime } from "../services/sudokuStore";
import styles from "../styles/RankingPage.module.css";

function formatKST(isoString) {
  try { return new Date(isoString).toLocaleString("ko-KR", { hour12: false }); }
  catch { return isoString ?? ""; }
}

export default function RankingPage() {
  const [params, setParams] = useSearchParams();

  // 탭: lemon | sudoku
  const tabFromURL = (params.get("game") || "lemon").toLowerCase();
  const [gameTab, setGameTab] = useState(tabFromURL === "sudoku" ? "sudoku" : "lemon");

  // 스도쿠 난이도 (?difficulty=)
  const diffFromURL = (params.get("difficulty") || "easy").toLowerCase();
  const [sudokuDiff, setSudokuDiff] = useState(diffFromURL);

  // 레몬 랭킹
  const [lemonRows, setLemonRows] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const currentYM = getCurrentSeasonLabelKST?.() || "";
  const [selectedYM, setSelectedYM] = useState(currentYM || "");

  // 스도쿠 랭킹
  const [sudokuRows, setSudokuRows] = useState([]);

  // URL 동기화
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("game", gameTab);
    if (gameTab === "sudoku") next.set("difficulty", sudokuDiff);
    else next.delete("difficulty");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTab, sudokuDiff]);

  // 시즌 목록 (레몬 탭일 때만)
  useEffect(() => {
    if (gameTab !== "lemon") return;
    (async () => {
      try {
        const ys = await fetchAvailableSeasons();
        setSeasons(ys);
        setSelectedYM(ys.includes(currentYM) ? currentYM : (ys[0] || ""));
      } catch (e) {
        console.error("[RankingPage] load seasons failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameTab]);

  // 레몬 랭킹 로드
  useEffect(() => {
    if (gameTab !== "lemon") return;
    (async () => {
      try {
        if (selectedYM) {
          const rows = await fetchRankingByMonth(selectedYM, 50);
          setLemonRows(rows || []);
        } else {
          const rows = await fetchRanking("all", 50);
          setLemonRows(rows || []);
        }
      } catch (e) {
        console.error("[RankingPage] lemon load failed:", e);
        setLemonRows([]);
      }
    })();
  }, [gameTab, selectedYM]);

  // 스도쿠 랭킹 로드 (난이도별)
  useEffect(() => {
    if (gameTab !== "sudoku") return;
    (async () => {
      try {
        const rows = await fetchSudokuAlltime(50, sudokuDiff);
        setSudokuRows(rows || []);
      } catch (e) {
        console.error("[RankingPage] sudoku load failed:", e);
        setSudokuRows([]);
      }
    })();
  }, [gameTab, sudokuDiff]);

  // 렌더
  const lemonTable = useMemo(() => (
    <div className={styles.tableWrap}>
      <div className={styles.toolbar}>
        <label className={styles.label}>시즌</label>
        <select
          className={styles.select}
          value={selectedYM}
          onChange={(e) => setSelectedYM(e.target.value)}
        >
          {seasons.map((ym) => (
            <option key={ym} value={ym}>{ym}</option>
          ))}
          {!seasons?.length && <option value="">(시즌 데이터 없음)</option>}
        </select>
        <Link to="/lemon-game" className={styles.linkBtn}>게임으로</Link>
      </div>

      <table className={`${styles.table} ${styles.compact} ${styles.zebra}`}>
        <thead>
          <tr>
            <th className={styles.colRank}>순위</th>
            <th>닉네임</th>
            <th className={styles.colNum}>점수</th>
            <th>기록일</th>
          </tr>
        </thead>
        <tbody>
          {lemonRows.map((r, i) => (
            <tr key={`${r.nickname}-${i}`}>
              <td className={styles.colRank}>{i + 1}</td>
              <td>{r.nickname}</td>
              <td className={styles.colNum}>{r.score}</td>
              <td>{formatKST(r.created_at)}</td>
            </tr>
          ))}
          {!lemonRows.length && (
            <tr><td colSpan={4} className={styles.empty}>데이터가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  ), [lemonRows, seasons, selectedYM]);

  const sudokuTable = useMemo(() => (
    <div className={styles.tableWrap}>
      <div className={styles.toolbar}>
        <label className={styles.label}>난이도</label>
        <select
          className={styles.select}
          value={sudokuDiff}
          onChange={(e) => setSudokuDiff(e.target.value)}
        >
          <option value="easy">쉬움</option>
          <option value="normal">보통</option>
          <option value="hard">어려움</option>
          <option value="expert">전문가</option>
          <option value="test">테스트</option>
        </select>
        <Link to="/sudoku" className={styles.linkBtn}>게임으로</Link>
      </div>

      {/* ✅ 난이도 열 제거 / 순위 열 좁게 / 숫자 우측 정렬 */}
      <table className={`${styles.table} ${styles.compact} ${styles.zebra}`}>
        <thead>
          <tr>
            <th className={styles.colRank}>순위</th>
            <th>닉네임</th>
            <th className={styles.colNum}>기록(초)</th>
            <th>등록일</th>
          </tr>
        </thead>
        <tbody>
          {sudokuRows.map((r, i) => (
            <tr key={`${r.nickname}-${r.achieved_at}-${i}`}>
              <td className={styles.colRank}>{i + 1}</td>
              <td>{r.nickname}</td>
              <td className={styles.colNum}>{Math.round((r.best_time_ms || 0) / 1000)}</td>
              <td>{formatKST(r.achieved_at)}</td>
            </tr>
          ))}
          {!sudokuRows.length && (
            <tr><td colSpan={4} className={styles.empty}>데이터가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  ), [sudokuRows, sudokuDiff]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${gameTab === "lemon" ? styles.active : ""}`}
            onClick={() => setGameTab("lemon")}
          >
            레몬
          </button>
          <button
            className={`${styles.tab} ${gameTab === "sudoku" ? styles.active : ""}`}
            onClick={() => setGameTab("sudoku")}
          >
            스도쿠
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {gameTab === "lemon" ? lemonTable : sudokuTable}
      </main>
    </div>
  );
}

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
import { fetchWatermelonAlltime } from "../services/watermelonStore";
import styles from "../styles/RankingPage.module.css";

function formatKST(isoString) {
  try { return new Date(isoString).toLocaleString("ko-KR", { hour12: false }); }
  catch { return isoString ?? ""; }
}

export default function RankingPage() {
  const [params, setParams] = useSearchParams();

  // 탭: lemon | sudoku | watermelon
  const tabFromURL = (params.get("game") || "lemon").toLowerCase();
  const [gameTab, setGameTab] = useState(
    tabFromURL === "sudoku" ? "sudoku" :
    tabFromURL === "watermelon" ? "watermelon" : "lemon"
  );

  // 스도쿠 난이도 (?difficulty=)
  const diffFromURL = (params.get("difficulty") || "super-easy").toLowerCase();
  const [sudokuDiff, setSudokuDiff] = useState(diffFromURL);

  // 레몬 랭킹
  const [lemonRows, setLemonRows] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const currentYM = getCurrentSeasonLabelKST?.() || "";
  const [selectedYM, setSelectedYM] = useState(currentYM || "");

  // 스도쿠 랭킹
  const [sudokuRows, setSudokuRows] = useState([]);

  // 수박 랭킹
  const [watermelonRows, setWatermelonRows] = useState([]);

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

  // 스도쿠 랭킹 로드
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

  // 수박 랭킹 로드
  useEffect(() => {
    if (gameTab !== "watermelon") return;
    (async () => {
      try {
        const rows = await fetchWatermelonAlltime(50);
        setWatermelonRows(rows || []);
      } catch (e) {
        console.error("[RankingPage] watermelon load failed:", e);
        setWatermelonRows([]);
      }
    })();
  }, [gameTab]);

  // 렌더: 레몬
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

  // 렌더: 스도쿠
  const sudokuTable = useMemo(() => (
    <div className={styles.tableWrap}>
      <div className={styles.toolbar}>
        <label className={styles.label}>난이도</label>
        <select
          className={styles.select}
          value={sudokuDiff}
          onChange={(e) => setSudokuDiff(e.target.value)}
        >
          <option value="super-easy">매우쉬움</option>
          <option value="easy">쉬움</option>
          <option value="normal">보통</option>
          <option value="hard">어려움</option>
          <option value="expert">전문가</option>
        </select>
        <Link to="/sudoku" className={styles.linkBtn}>게임으로</Link>
      </div>

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

  // 렌더: 수박
  const watermelonTable = useMemo(() => (
    <div className={styles.tableWrap}>
      <div className={styles.toolbar}>
        <span className={styles.label}>전체</span>
        <Link to="/Watermelon" className={styles.linkBtn}>게임으로</Link>
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
          {watermelonRows.map((r, i) => (
            <tr key={`${r.nickname}-${r.created_at}-${i}`}>
              <td className={styles.colRank}>{i + 1}</td>
              <td>{r.nickname}</td>
              <td className={styles.colNum}>{r.score}</td>
              <td>{formatKST(r.created_at)}</td>
            </tr>
          ))}
          {!watermelonRows.length && (
            <tr><td colSpan={4} className={styles.empty}>데이터가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  ), [watermelonRows]);

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
          <button
            className={`${styles.tab} ${gameTab === "watermelon" ? styles.active : ""}`}
            onClick={() => setGameTab("watermelon")}
          >
            수박
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {gameTab === "lemon" ? lemonTable
          : gameTab === "sudoku" ? sudokuTable
          : watermelonTable}
      </main>
    </div>
  );
}

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

  // URL 쿼리 → 초기상태
  const initialGame = (params.get("game") === "sudoku" ? "sudoku" : "lemon");
  const initialDiff = params.get("difficulty") || "hard"; // 스도쿠 기본 hard

  const [gameTab, setGameTab] = useState(initialGame);         // 'lemon' | 'sudoku'
  const [scope, setScope] = useState("season");                // 레몬: 'season' | 'all'
  const [sudokuDiff, setSudokuDiff] = useState(initialDiff);   // 스도쿠 난이도

  const currentYM = getCurrentSeasonLabelKST();
  const [seasons, setSeasons] = useState([]);
  const [selectedYM, setSelectedYM] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const myNick = localStorage.getItem("nickname") || "";

  // URL을 상태 변화에 맞춰 갱신
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
        setSeasons([]); setSelectedYM("");
      }
    })();
  }, [gameTab, currentYM]);

  // 랭킹 데이터
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (gameTab === "lemon") {
          if (scope === "all") {
            setRows(await fetchRanking({ scope: "all", limit: 100 }));
          } else {
            if (selectedYM === currentYM || !selectedYM) {
              setRows(await fetchRanking({ scope: "season", limit: 100 }));
            } else {
              setRows(await fetchRankingByMonth(selectedYM, 100));
            }
          }
        } else {
          const data = await fetchSudokuAlltime(sudokuDiff, 100);
          const mapped = (data || []).map((r) => ({
            nickname: r.nickname,
            score: r.best_time_ms,
            created_at: r.achieved_at,
            __sudoku: true,
          }));
          setRows(mapped);
        }
      } catch (e) {
        console.error("[RankingPage] fetch failed:", e);
        setRows([]);
      } finally { setLoading(false); }
    })();
  }, [gameTab, scope, selectedYM, currentYM, sudokuDiff]);

  const title = useMemo(() => {
    if (gameTab === "lemon") {
      return scope === "season"
        ? `레몬 시즌 랭킹 (${selectedYM || currentYM})`
        : "레몬 전체 최고 랭킹";
    }
    const diffLabel = { easy:"쉬움", normal:"보통", hard:"어려움", "super-easy":"매우 쉬움" }[sudokuDiff] || sudokuDiff;
    return `스도쿠 베스트 시간 (${diffLabel})`;
  }, [gameTab, scope, selectedYM, currentYM, sudokuDiff]);

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>{title}</h1>

        <div className={styles.controlsRow}>
          {/* 게임 탭 */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${gameTab === "lemon" ? styles.active : ""}`}
              onClick={() => setGameTab("lemon")}
            >레몬</button>
            <button
              className={`${styles.tab} ${gameTab === "sudoku" ? styles.active : ""}`}
              onClick={() => setGameTab("sudoku")}
            >스도쿠</button>
          </div>

          {/* 레몬 전용 컨트롤 */}
          {gameTab === "lemon" && (
            <>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${scope === "season" ? styles.active : ""}`}
                  onClick={() => setScope("season")}
                >시즌</button>
                <button
                  className={`${styles.tab} ${scope === "all" ? styles.active : ""}`}
                  onClick={() => setScope("all")}
                >전체</button>
              </div>

              {scope === "season" && (
                <div className={styles.seasonPicker}>
                  <label className={styles.label} htmlFor="seasonSelect">시즌 선택</label>
                  <select
                    id="seasonSelect"
                    className={styles.select}
                    value={selectedYM}
                    onChange={(e) => setSelectedYM(e.target.value)}
                  >
                    {seasons.map((ym) => (
                      <option key={ym} value={ym}>
                        {ym}{ym === currentYM ? " (현재)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* 스도쿠 전용: 난이도 드롭다운 */}
          {gameTab === "sudoku" && (
            <div className={styles.seasonPicker}>
              <label className={styles.label} htmlFor="diffSelect">난이도</label>
              <select
                id="diffSelect"
                className={styles.select}
                value={sudokuDiff}
                onChange={(e) => setSudokuDiff(e.target.value)}
              >
                <option value="easy">쉬움</option>
                <option value="normal">보통</option>
                <option value="hard">어려움</option>
                <option value="expert">전문가</option>
              </select>
            </div>
          )}

          <div className={styles.actions}>
            <Link className={styles.btn} to="/lemon-game">레몬 플레이</Link>
            <span className={styles.divider} aria-hidden>·</span>
            <Link className={styles.btn} to="/sudoku">스도쿠 플레이</Link>
          </div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 56 }}>순위</th>
              <th>닉네임</th>
              <th style={{ width: 140 }}>{gameTab === "sudoku" ? "기록(초)" : "점수"}</th>
              <th style={{ width: 220 }}>달성시간(KST)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className={styles.loadingCell}>불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className={styles.emptyCell}>랭킹 데이터가 없습니다.</td></tr>
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
                  <td>{row.__sudoku ? (Number(row.score) / 1000).toFixed(2) : row.score}</td>
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

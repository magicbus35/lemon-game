// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// 레몬: 시즌 기본 랭킹(현재 시즌) 상위 N
import { fetchRanking } from "../services/scoreStore";
// 스도쿠: 전체 베스트 시간 상위 N (limit, difficulty)
import { fetchSudokuAlltime } from "../services/sudokuStore";
// ✅ 수박: 전체 베스트 점수 상위 N
import { fetchWatermelonTop } from "../services/watermelonStore";

import styles from "../styles/HomePage.module.css";

function formatSec(ms) {
  const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  return `${s.toFixed(0)}초`;
}

export default function HomePage() {
  const [lemonTop, setLemonTop] = useState([]);
  const [sudokuTop, setSudokuTop] = useState([]);
  const [waterTop, setWaterTop] = useState([]);
  const [loading, setLoading] = useState(true);

  // 각 게임 TOP3 로드
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [lemon, sudoku, water] = await Promise.all([
          fetchRanking({ scope: "season", limit: 3 }),
          fetchSudokuAlltime(3, "super-easy"),
          fetchWatermelonTop(3),
        ]);
        setLemonTop(lemon || []);
        setSudokuTop(sudoku || []);
        setWaterTop(water || []);
      } catch (e) {
        console.error("[HomePage] load tops failed:", e);
        setLemonTop([]); setSudokuTop([]); setWaterTop([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>버디랜드 🎮</h1>
        <p className={styles.subtitle}>여러 캐주얼 게임을 즐기고 랭킹에 기록을 남겨보세요!</p>
        <div className={styles.nav}>
          <Link to="/lemon-game" className={styles.navBtn}>레몬</Link>
          <Link to="/sudoku" className={styles.navBtn}>스도쿠</Link>
          <Link to="/ranking" className={styles.navBtnGhost}>랭킹</Link>
        </div>
      </header>

      {/* 게임 카드 그리드 */}
      <section className={styles.grid}>
        {/* 레몬 카드 */}
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.emoji} aria-hidden>🍋</span>
            <h2 className={styles.cardTitle}>레몬 게임</h2>
          </div>
          <p className={styles.cardDesc}>
            제한 시간 안에 숫자를 골라 <b>합을 10</b>으로 맞추세요. 빠르게, 많이 만들수록 고득점!
          </p>
          <div className={styles.cardActions}>
            <Link to="/lemon-game" className={styles.primaryBtn}>플레이하기</Link>
            <Link to="/ranking?game=lemon" className={styles.linkBtn}>랭킹 보기</Link>
          </div>

          <div className={styles.topBox}>
            <div className={styles.topTitle}>이번 시즌 TOP 3</div>
            {loading ? (
              <div className={styles.skel}>불러오는 중...</div>
            ) : lemonTop.length === 0 ? (
              <div className={styles.empty}>아직 기록이 없어요.</div>
            ) : (
              <ol className={styles.topList}>
                {lemonTop.map((r, i) => (
                  <li key={`${r.nickname}-${i}`} className={styles.topItem}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.nick}>{r.nickname}</span>
                    <span className={styles.value}>{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>

        {/* 스도쿠 카드 */}
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.emoji} aria-hidden>🔢</span>
            <h2 className={styles.cardTitle}>스도쿠</h2>
          </div>
          <p className={styles.cardDesc}>
            9×9 격자를 채우는 퍼즐! 유일 해답 퍼즐로 생성되며, <b>최단 시간</b>을 랭킹에 기록하세요.
          </p>
          <div className={styles.cardActions}>
            <Link to="/sudoku?difficulty=super-easy" className={styles.primaryBtn}>
              플레이하기
            </Link>
            <Link to="/ranking?game=sudoku&difficulty=super-easy" className={styles.linkBtn}>
              랭킹 보기
            </Link>
          </div>

          <div className={styles.topBox}>
            <div className={styles.topTitle}>매우 쉬움 베스트 시간 TOP 3</div>
            {loading ? (
              <div className={styles.skel}>불러오는 중...</div>
            ) : sudokuTop.length === 0 ? (
              <div className={styles.empty}>아직 기록이 없어요.</div>
            ) : (
              <ol className={styles.topList}>
                {sudokuTop.map((r, i) => (
                  <li key={`${r.nickname}-${i}`} className={styles.topItem}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.nick}>{r.nickname}</span>
                    <span className={styles.value}>{formatSec(r.best_time_ms)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>

        {/* ✅ 수박(워터멜론) 카드 */}
        <article className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.emoji} aria-hidden>🍉</span>
            <h2 className={styles.cardTitle}>수박 게임</h2>
          </div>
          <p className={styles.cardDesc}>
            과일을 떨어뜨려 <b>같은 과일끼리 합치면</b> 더 큰 과일! 물리 퍼즐로 <b>최고 점수</b>에 도전해보세요.
          </p>
          <div className={styles.cardActions}>
            <Link to="/watermelon" className={styles.primaryBtn}>플레이하기</Link>
            <Link to="/ranking?game=watermelon" className={styles.linkBtn}>랭킹 보기</Link>
          </div>

          <div className={styles.topBox}>
            <div className={styles.topTitle}>전체 베스트 점수 TOP 3</div>
            {loading ? (
              <div className={styles.skel}>불러오는 중...</div>
            ) : waterTop.length === 0 ? (
              <div className={styles.empty}>아직 기록이 없어요.</div>
            ) : (
              <ol className={styles.topList}>
                {waterTop.map((r, i) => (
                  <li key={`${r.nickname}-${i}`} className={styles.topItem}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.nick}>{r.nickname}</span>
                    <span className={styles.value}>{r.best_score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Birdyland
      </footer>
    </div>
  );
}

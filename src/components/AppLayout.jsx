import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useBirdy } from "../context/BirdyMode";
import { useTheme } from "../theme/ThemeProvider";
import ThemeToggle from "../components/ThemeToggle";
import styles from "../styles/AppLayout.module.css";

export default function AppLayout() {
  const { active: birdy } = useBirdy();

  const gameLabel   = birdy ? "버디 게임" : "레몬 게임";
  const iconSrc     = birdy ? "/images/birdy.png" : "/images/lemon.png"; // ← 아이콘 공통 소스
  const headerLogo  = iconSrc;                                           // 헤더 좌상단 로고도 동일

  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.logo}>🦜</span>
          <span className={styles.brandTextKo}>버디랜드</span>
          <span className={styles.brandTextEn}>Birdyland</span>
        </NavLink>

        <nav className={styles.nav}>
          <NavLink to="/lemon-game" className={({isActive}) =>
            `${styles.navBtn} ${isActive ? styles.active : ""}`}>레몬</NavLink>
          <NavLink to="/sudoku" className={({isActive}) =>
            `${styles.navBtn} ${isActive ? styles.active : ""}`}>스도쿠</NavLink>
          <NavLink to="/ranking" className={({isActive}) =>
            `${styles.navBtn} ${isActive ? styles.active : ""}`}>랭킹</NavLink>
        </nav>

        <div className={styles.tools}>
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

/**
 * NavItem
 * - iconImgSrc가 있으면 이미지 아이콘 사용
 * - 아니면 iconEmoji 사용
 */
function NavItem({ to, iconImgSrc, iconEmoji, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "px-3 py-2 rounded-lg border transition " +
        (isActive
          ? "bg-[var(--accent-weak)] border-[var(--accent)]"
          : "bg-[var(--surface-2)] border-[var(--border)] hover:bg-[var(--cell-hover)]")
      }
    >
      {iconImgSrc ? (
        <img
          src={iconImgSrc}
          alt=""
          width={18}
          height={18}
          className="inline-block align-[-3px] mr-1"
          draggable="false"
        />
      ) : (
        <span className="mr-1">{iconEmoji}</span>
      )}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}

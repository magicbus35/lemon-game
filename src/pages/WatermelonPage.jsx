// src/pages/WatermelonPage.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as Matter from "matter-js";
import styles from "../styles/WatermelonPage.module.css";
import { saveWatermelonScore } from "../services/watermelonStore";

/** ===== 보드 사이즈 & 상단선 ===== */
const W = 360, H = 640;
const TOP_LINE    = 56; // 이 선 위로 과일이 올라오면 게임오버
const BASE_DROP_Y = 72; // 드랍 기본 높이(너무 낮아지지 않게 가드)
const DROP_MARGIN = 6;  // TOP_LINE 아래로 r + 여유만큼

/** ===== 실제 게임 비율에 맞춘 반지름 고정 테이블 =====
 * 스샷(폭~430px) 실측값을 W=360에 맞춰 스케일링 후 반올림
 * 단계: 체리→…→멜론(10)→수박(11)
 */
const FRUITS = [
  { name: "체리",      r: 13,  color: "#f43f5e", score: 10 },
  { name: "딸기",      r: 18,  color: "#fb7185", score: 20 },
  { name: "감귤",      r: 23,  color: "#fda55a", score: 35 },
  { name: "자두",      r: 30,  color: "#f97316", score: 55 },
  { name: "레몬",      r: 39,  color: "#facc15", score: 80 },
  { name: "키위",      r: 49,  color: "#84cc16", score: 110 },
  { name: "사과",      r: 61,  color: "#22c55e", score: 150 },
  { name: "복숭아",    r: 73,  color: "#a78bfa", score: 200 },
  { name: "멜론(직전)", r: 88,  color: "#34d399", score: 270 },
  { name: "멜론",      r: 103, color: "#34d399", score: 360 },
  { name: "수박",      r: 113, color: "#10b981", score: 480 },
];
const MAX_LEVEL = FRUITS.length - 1;

/** 낮은 레벨 가중 스폰 */
const randNextLevel = () => {
  const bag = [0,0,0,1,1,2,2,3,4];
  return bag[Math.floor(Math.random() * bag.length)];
};

export default function WatermelonPage(){
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const worldRef  = useRef(null);
  const pointerX  = useRef(W/2);
  const merging   = useRef(new Set());

  const [score, setScore] = useState(0);
  const [nextLevel, setNextLevel] = useState(randNextLevel());
  const [canDrop, setCanDrop] = useState(true);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [saved, setSaved] = useState(false);

  const renderRef = useRef(null);

  /** ===== 엔진 초기화 ===== */
  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    const world = engine.world;
    engineRef.current = engine;
    worldRef.current = world;

    // 벽/바닥
    const thickness = 30;
    const floor = Matter.Bodies.rectangle(W/2, H+thickness/2, W, thickness, { isStatic: true, label: "floor" });
    const left  = Matter.Bodies.rectangle(-thickness/2, H/2, thickness, H, { isStatic: true, label: "wall" });
    const right = Matter.Bodies.rectangle(W+thickness/2, H/2, thickness, H, { isStatic: true, label: "wall" });
    Matter.World.add(world, [floor, left, right]);

    // 충돌 → 같은 레벨 합치기
    const onCollide = (evt) => {
      for (const pair of evt.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (a.plugin?.fruit && b.plugin?.fruit) {
          const la = a.plugin.fruit.level;
          const lb = b.plugin.fruit.level;
          if (la === lb && la < MAX_LEVEL) {
            const keyA = a.id + ":m", keyB = b.id + ":m";
            if (merging.current.has(keyA) || merging.current.has(keyB)) continue;
            merging.current.add(keyA); merging.current.add(keyB);

            queueMicrotask(() => {
              try {
                const x = (a.position.x + b.position.x) / 2;
                const y = (a.position.y + b.position.y) / 2;
                Matter.World.remove(world, [a, b]);
                const next = la + 1;
                const nb = makeFruitBody(x, y, next);
                Matter.World.add(world, nb);
                setScore(s => s + FRUITS[next].score);
              } finally {
                merging.current.delete(keyA);
                merging.current.delete(keyB);
              }
            });
          }
        }
      }
    };
    Matter.Events.on(engine, "collisionStart", onCollide);

    // 러너
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // 렌더 루프
    const ctx = canvasRef.current.getContext("2d");
    const render = () => {
      const bodies = Matter.Composite.allBodies(world);
      ctx.clearRect(0,0,W,H);

      // 배경
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--c-surface") || "#ffffff";
      ctx.fillRect(0,0,W,H);

      // top 라인
      ctx.strokeStyle = "rgba(255,0,0,.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, TOP_LINE); ctx.lineTo(W, TOP_LINE); ctx.stroke();

      // 과일
      for (const b of bodies) {
        if (b.plugin?.fruit) {
          const lv = b.plugin.fruit.level;
          const { color, r } = FRUITS[lv];
          ctx.beginPath();
          ctx.arc(b.position.x, b.position.y, r, 0, Math.PI*2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(0,0,0,.15)";
          ctx.stroke();
        }
      }

      // 다음 과일 프리뷰(동적 Y)
      if (!over) {
        const r  = FRUITS[nextLevel].r;
        const py = Math.max(BASE_DROP_Y, TOP_LINE + r + DROP_MARGIN);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(pointerX.current, py, r, 0, Math.PI*2);
        ctx.fillStyle = FRUITS[nextLevel].color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      renderRef.current = requestAnimationFrame(render);
    };
    renderRef.current = requestAnimationFrame(render);

    // 게임오버 체크 + 스폰 0.3초 그레이스
    const checkOver = () => {
      if (over) return;
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
      const fruits = Matter.Composite.allBodies(world).filter(b => b.plugin?.fruit);
      for (const f of fruits) {
        const born = f.plugin?.bornAt ?? 0;
        if (now - born < 300) continue; // ✅ 스폰 0.3초는 무시
        const lv = f.plugin.fruit.level;
        const r = FRUITS[lv].r;
        if (f.position.y - r <= TOP_LINE) {
          setOver(true);
          setCanDrop(false);
          break;
        }
      }
    };
    const afterUpdate = () => checkOver();
    Matter.Events.on(engine, "afterUpdate", afterUpdate);

    // 정리
    return () => {
      cancelAnimationFrame(renderRef.current);
      Matter.Events.off(engine, "collisionStart", onCollide);
      Matter.Events.off(engine, "afterUpdate", afterUpdate);
      Matter.Runner.stop(runner);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [over]);

  /** ===== 입력 ===== */
  useEffect(() => {
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
    const onMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const margin = FRUITS[nextLevel].r + 6;
      pointerX.current = clamp(x, margin, W - margin);
    };
    const onDown = () => tryDrop();
    const onKey = (e) => { if (e.code === "Space") tryDrop(); };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [nextLevel, canDrop, over]);

  /** 드랍 */
  const tryDrop = () => {
    if (!canDrop || over) return;
    const x = pointerX.current;
    const r  = FRUITS[nextLevel].r;
    const y  = Math.max(BASE_DROP_Y, TOP_LINE + r + DROP_MARGIN); // ✅ 동적 드랍 Y
    const fruit = makeFruitBody(x, y, nextLevel); // bornAt 포함
    Matter.World.add(worldRef.current, fruit);
    setCanDrop(false);
    setTimeout(() => {
      setNextLevel(randNextLevel());
      setCanDrop(true);
    }, 280);
  };

  /** 과일 바디 생성 */
  const makeFruitBody = (x, y, level) => {
    const { r } = FRUITS[level];
    const body = Matter.Bodies.circle(x, y, r, {
      restitution: 0.2,
      friction: 0.15,
      frictionStatic: 0.5,
      frictionAir: 0.0005,
      density: 0.0015 * (1 + level*0.35),
      label: "fruit",
    });
    body.plugin = {
      fruit: { level },
      bornAt: (typeof performance !== "undefined" ? performance.now() : Date.now()) // ✅
    };
    return body;
  };

  /** 새 게임 */
  const reset = () => {
    const world = worldRef.current;
    const fruits = Matter.Composite.allBodies(world).filter(b => b.plugin?.fruit);
    Matter.World.remove(world, fruits);
    setScore(0);
    setNextLevel(randNextLevel());
    setSaved(false);
    setOver(false);
    setCanDrop(true);
  };

  /** 저장 */
  const handleSave = async () => {
    if (saved || !over) return;
    const nickname = name.trim();
    const password = pass.trim();
    if (!nickname || password.length < 4) {
      alert("닉네임 및 4자 이상 비밀번호를 입력하세요.");
      return;
    }
    const res = await saveWatermelonScore({ nickname, password, score });
    if (res?.ok) {
      setSaved(true);
      alert("저장되었습니다!");
    } else {
      const reason = res?.reason || "SERVER_ERROR";
      alert(
        reason==="PASSWORD_REQUIRED" ? "비밀번호가 필요합니다." :
        reason==="NICK_AUTH_FAILED"  ? "닉네임/비밀번호가 일치하지 않습니다." :
        "서버 오류로 저장에 실패했습니다."
      );
    }
  };

  const nextFruit = useMemo(() => FRUITS[nextLevel], [nextLevel]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>수박 게임</h1>
        <div className={styles.stats}>
          <span className={styles.badge}>점수 {score}</span>
          <div className={styles.next}>
            <span>다음</span>
            <span className={styles.nextDot} style={{ background: nextFruit.color }} />
            <small>{nextFruit.name}</small>
          </div>
          <button className={styles.btn} onClick={reset}>새 게임</button>
          <Link to="/ranking?game=watermelon" className={styles.linkBtn}>랭킹 보기</Link>
        </div>
      </div>

      <div className={styles.stageWrap}>
        <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />
      </div>

      {over && (
        <div className={styles.footer}>
          <div className={styles.savePanel}>
            <div className={styles.saveTitle}>게임 종료 · 기록 저장</div>
            <div className={styles.saveRow}>
              <input className={styles.input} placeholder="닉네임" value={name} onChange={e=> setName(e.target.value)} />
              <input className={styles.input} placeholder="비밀번호(4자 이상)" type="password" value={pass} onChange={e=> setPass(e.target.value)} />
              <button className={styles.btnPrimary} onClick={handleSave} disabled={saved}>{saved? "저장됨" : "저장하기"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

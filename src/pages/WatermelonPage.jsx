// src/pages/WatermelonPage.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import * as Matter from "matter-js";
import styles from "../styles/WatermelonPage.module.css";
import { saveWatermelonScore } from "../services/watermelonStore";

/** ================== 보드 사이즈 (좁은 보드) ================== */
const RATIO = 1.55;
const W = 300;
const H = Math.round(W * RATIO);

/** ===== 스케일 ===== */
const SCALE   = W / 360;
const SCALE_Y = H / 640;

/** 상단 라인/드랍 높이 */
const TOP_LINE    = Math.round(56 * SCALE_Y);
const BASE_DROP_Y = Math.round(72 * SCALE_Y);
const DROP_MARGIN = Math.max(4, Math.round(6 * SCALE_Y));

/** 벽에 ‘딱 붙이기’ 여유 */
const HUG_EPS = Math.max(0.5, 1 * SCALE);

/** 드랍 유예(연타 보호) */
const SPAWN_GRACE_MS = 500;

/** ===== 과일 크기(보드 폭 대비) ===== */
const DIAM_PCT = [
  0.075, 0.098, 0.128, 0.167, 0.214,
  0.275, 0.339, 0.408, 0.489, 0.572, 0.630
];
const NAMES  = ["체리","딸기","감귤","자두","레몬","키위","사과","복숭아","멜론(직전)","멜론","수박"];
const COLORS = ["#f43f5e","#fb7185","#fda55a","#f97316","#facc15","#84cc16","#22c55e","#a78bfa","#34d399","#34d399","#10b981"];

/** ===== 공식 합체 점수(삼각수) ===== */
const SCORES = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

const FRUITS = DIAM_PCT.map((p, i) => ({
  name:  NAMES[i],
  r:     Math.round((W * p) / 2),
  color: COLORS[i],
  score: SCORES[i],
}));
const MAX_LEVEL = FRUITS.length - 1;

const randNextLevel = () => {
  const bag = [0,0,0,1,1,2,2,3,4];
  return bag[Math.floor(Math.random() * bag.length)];
};

/** ==== Anti-jiggle(소프트 스톱) 파라미터 ==== */
const BASE_AIR       = 0.0035; // 기본 감쇠
const CALM_AIR       = 0.02;   // ‘정착’시 잠깐 강한 감쇠
const CALM_SPEED     = 0.08;   // 느린 선속도 임계
const CALM_ANG       = 0.05;   // 느린 각속도 임계
const CALM_FRAMES    = 14;     // 연속 프레임
const WAKE_SPEED     = CALM_SPEED * 2;
const CLAMP_EPS_LIN  = 0.005;
const CLAMP_EPS_ANG  = 0.004;

/** ==== Finish Pop(터뜨리기) ==== */
const POP_BONUS_MULT   = 0.5;   // 과일 점수의 50%를 보너스로
const POP_INTERVAL_MS  = 60;    // 한 개씩 터뜨리는 간격
const POP_FX_DUR       = 240;   // 이펙트 지속 시간(ms)

export default function WatermelonPage(){
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const runnerRef = useRef(null);
  const worldRef  = useRef(null);
  const pointerX  = useRef(W/2);
  const merging   = useRef(new Set());

  const [score, setScore]         = useState(0);
  const [nextLevel, setNextLevel] = useState(randNextLevel());
  const [canDrop, setCanDrop]     = useState(true);
  const [over, setOver]           = useState(false);
  const [name, setName]           = useState("");
  const [pass, setPass]           = useState("");
  const [saved, setSaved]         = useState(false);

  const nextLevelRef = useRef(nextLevel);
  const overRef      = useRef(over);
  useEffect(() => { nextLevelRef.current = nextLevel; }, [nextLevel]);
  useEffect(() => { overRef.current = over; }, [over]);

  const renderRef = useRef(null);

  /** pop 이펙트와 타이머 관리 */
  const fxRef          = useRef([]);      // {x,y,r,start}
  const popTimersRef   = useRef([]);      // setTimeout IDs
  const poppingRef     = useRef(false);   // 중복 실행 방지

  useEffect(() => {
    // DPR
    const cvs = canvasRef.current;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    cvs.style.width  = `${W}px`;
    cvs.style.height = `${H}px`;
    cvs.width  = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    const ctx = cvs.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Matter
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2 } }); // 중력 소폭 ↑
    const world  = engine.world;
    engineRef.current = engine;
    worldRef.current  = world;

    // 품질 & 슬리핑 OFF
    engine.positionIterations   = 12;
    engine.velocityIterations   = 10;
    engine.constraintIterations = 4;
    engine.enableSleeping       = false;

    // 경계
    const wallTh  = Math.round(24 * SCALE);
    const floorTh = Math.round(28 * SCALE);
    const EPS     = 0.5;

    const floorTop = H - EPS;
    const floor = Matter.Bodies.rectangle(
      W/2, floorTop + floorTh/2, W, floorTh,
      { isStatic: true, label: "floor", friction: 0.30, frictionStatic: 0.60 }
    );
    const left  = Matter.Bodies.rectangle(-wallTh/2, H/2, wallTh, H, { isStatic: true, label: "wall", friction: 0.30, frictionStatic: 0.60 });
    const right = Matter.Bodies.rectangle(W+wallTh/2, H/2, wallTh, H, { isStatic: true, label: "wall", friction: 0.30, frictionStatic: 0.60 });
    Matter.World.add(world, [floor, left, right]);

    // 합체
    const onCollide = (evt) => {
      for (const { bodyA:a, bodyB:b } of evt.pairs) {
        if (a.plugin?.fruit && b.plugin?.fruit) {
          const la = a.plugin.fruit.level, lb = b.plugin.fruit.level;
          if (la === lb && la < MAX_LEVEL) {
            const ka = a.id + ":m", kb = b.id + ":m";
            if (merging.current.has(ka) || merging.current.has(kb)) continue;
            merging.current.add(ka); merging.current.add(kb);
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
                merging.current.delete(ka);
                merging.current.delete(kb);
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

    // 렌더
    const render = () => {
      const bodies = Matter.Composite.allBodies(world);
      ctx.clearRect(0,0,W,H);
      const host = canvasRef.current;
      const rs = host ? getComputedStyle(host) : getComputedStyle(document.documentElement);
      ctx.fillStyle = (
        rs.getPropertyValue("--wm-stage").trim() ||
        rs.getPropertyValue("--c-surface").trim() ||
        "#fff"
)     ;
      ctx.fillRect(0,0,W,H);

      // 상단 라인
      ctx.strokeStyle = "rgba(255,0,0,.35)";
      ctx.lineWidth = Math.max(1, Math.round(2 * SCALE));
      ctx.beginPath();
      ctx.moveTo(0, TOP_LINE); ctx.lineTo(W, TOP_LINE); ctx.stroke();

      // 과일
      for (const b of bodies) {
        if (!b.plugin?.fruit) continue;
        const lv = b.plugin.fruit.level;
        const { color, r } = FRUITS[lv];
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, r, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = Math.max(1, Math.round(2 * SCALE));
        ctx.strokeStyle = "rgba(0,0,0,.15)";
        ctx.stroke();
      }

      // 프리뷰
      if (!overRef.current) {
        const nl = nextLevelRef.current;
        const r  = FRUITS[nl].r;
        const py = Math.max(BASE_DROP_Y, TOP_LINE + r + DROP_MARGIN);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(pointerX.current, py, r, 0, Math.PI*2);
        ctx.fillStyle = FRUITS[nl].color;
        ctx.globalAlpha = 1;
        ctx.fill();
      }

      // POP FX (터지는 링)
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
      fxRef.current = fxRef.current.filter(fx => {
        const t = Math.min(1, (now - fx.start) / POP_FX_DUR);
        const a = 1 - t;
        const rr = fx.r * (0.9 + 0.5 * t);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.lineWidth = 2 + 2 * t;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return t < 1;
      });

      renderRef.current = requestAnimationFrame(render);
    };
    renderRef.current = requestAnimationFrame(render);

    // afterUpdate: 게임오버 체크 + anti-jiggle
    const afterUpdate = () => {
      if (!world || overRef.current) return;

      const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
      const fruits = Matter.Composite.allBodies(world).filter(b => b.plugin?.fruit);

      for (const f of fruits) {
        // 1) 게임오버
        const born = f.plugin?.bornAt ?? 0;
        if (now - born >= SPAWN_GRACE_MS) {
          const lv = f.plugin.fruit.level;
          const r  = FRUITS[lv].r;
          if (f.position.y - r <= TOP_LINE) {
            // 게임 종료 + 남은 과일 터뜨리기 시작
            setOver(true);
            setCanDrop(false);
            overRef.current = true;
            popRemaining();  // ★ 여기서 즉시 터뜨리기
            break;
          }
        }

        // 2) anti-jiggle
        const v = f.velocity;
        const w = f.angularVelocity;

        const vx = Math.abs(v.x) < CLAMP_EPS_LIN ? 0 : v.x;
        const vy = Math.abs(v.y) < CLAMP_EPS_LIN ? 0 : v.y;
        const ww = Math.abs(w)   < CLAMP_EPS_ANG ? 0 : w;
        if (vx !== v.x || vy !== v.y) Matter.Body.setVelocity(f, { x: vx, y: vy });
        if (ww !== w) Matter.Body.setAngularVelocity(f, ww);

        const speed = Math.hypot(vx, vy);
        const ang   = Math.abs(ww);
        const calm  = (f.plugin.calmCounter ?? 0);

        if (speed < CALM_SPEED && ang < CALM_ANG) {
          const c2 = calm + 1;
          f.plugin.calmCounter = c2;
          if (c2 >= CALM_FRAMES) {
            f.frictionAir = CALM_AIR;
            Matter.Body.setVelocity(f, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(f, 0);
          }
        } else {
          f.plugin.calmCounter = 0;
          if (speed > WAKE_SPEED) {
            f.frictionAir = BASE_AIR;
          }
        }
      }
    };
    Matter.Events.on(engine, "afterUpdate", afterUpdate);

    // 정리
    return () => {
      cancelAnimationFrame(renderRef.current);
      Matter.Events.off(engine, "collisionStart", onCollide);
      Matter.Events.off(engine, "afterUpdate", afterUpdate);
      Matter.Runner.stop(runner);
      Matter.World.clear(world, false);
      Matter.Engine.clear(engine);
      // pop 타이머 정리
      popTimersRef.current.forEach(id => clearTimeout(id));
      popTimersRef.current = [];
      fxRef.current = [];
    };
  }, []);

  /** ===== 입력 ===== */
  useEffect(() => {
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
    const onMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const r = FRUITS[nextLevelRef.current].r;
      pointerX.current = clamp(x, r + HUG_EPS, W - r - HUG_EPS);
    };
    const onDown = () => tryDrop();
    const onKey  = (e) => { if (e.code === "Space") tryDrop(); };

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
  }, []);

  /** 드랍 */
  const tryDrop = () => {
    if (!canDrop || overRef.current) return;

    const current = nextLevelRef.current;
    const r  = FRUITS[current].r;
    const x  = Math.max(r + HUG_EPS, Math.min(W - r - HUG_EPS, pointerX.current));
    const y  = Math.max(BASE_DROP_Y, TOP_LINE + r + DROP_MARGIN);
    const fruit = makeFruitBody(x, y, current);
    Matter.World.add(worldRef.current, fruit);

    // 다음 미리보기 즉시 갱신
    const upcoming = randNextLevel();
    nextLevelRef.current = upcoming;
    setNextLevel(upcoming);

    setCanDrop(false);
    setTimeout(() => setCanDrop(true), 280);
  };

  /** 과일 바디 생성 */
  const makeFruitBody = (x, y, level) => {
    const { r } = FRUITS[level];
    const body = Matter.Bodies.circle(x, y, r, {
      restitution: 0.05,
      friction: 0.10,
      frictionStatic: 0.35,
      frictionAir: BASE_AIR,
      density: 0.0012 * (1 + level * 0.18),
      label: "fruit",
    });
    body.plugin = {
      fruit: { level },
      bornAt: (typeof performance !== "undefined" ? performance.now() : Date.now()),
      calmCounter: 0,
    };
    return body;
  };

  /** 남은 과일 터뜨리기 + 보너스 점수 */
  const popRemaining = () => {
    if (poppingRef.current) return;
    poppingRef.current = true;

    const world = worldRef.current;
    if (!world) return;

    // 드랍 금지 & 물리 영향 최소화
    setCanDrop(false);

    // 현재 과일 스냅샷(Top -> Bottom 순으로 터뜨리기)
    const fruits = Matter.Composite.allBodies(world)
      .filter(b => b.plugin?.fruit)
      .sort((a, b) => a.position.y - b.position.y);

    fruits.forEach((body, idx) => {
      const timer = setTimeout(() => {
        // 아직 월드에 남아있다면 처리
        if (!worldRef.current) return;
        const still = body; // 레퍼런스 유지
        if (!still || still.isSleeping === null) {
          // already removed
        }
        // 보너스 점수
        const lv = still?.plugin?.fruit?.level ?? 0;
        const add = Math.round((FRUITS[lv]?.score || 0) * POP_BONUS_MULT);
        if (add > 0) setScore(s => s + add);

        // 이펙트
        const pos = still?.position || { x: W/2, y: H/2 };
        const r   = FRUITS[lv]?.r || 12;
        fxRef.current.push({ x: pos.x, y: pos.y, r, start: (typeof performance !== "undefined" ? performance.now() : Date.now()) });

        // 제거
        try { Matter.World.remove(worldRef.current, still); } catch {}

      }, idx * POP_INTERVAL_MS);
      popTimersRef.current.push(timer);
    });
  };

  /** 새 게임 */
  const reset = () => {
    // pop 타이머 정리
    popTimersRef.current.forEach(id => clearTimeout(id));
    popTimersRef.current = [];
    fxRef.current = [];
    poppingRef.current = false;

    const world = worldRef.current;
    if (world) {
      const fruits = Matter.Composite.allBodies(world).filter(b => b.plugin?.fruit);
      Matter.World.remove(world, fruits);
    }
    setScore(0);
    const upcoming = randNextLevel();
    nextLevelRef.current = upcoming;
    setNextLevel(upcoming);
    setSaved(false);
    setOver(false);
    setCanDrop(true);
  };

  /** 저장 */
  const handleSave = async () => {
    if (saved || !overRef.current) return;
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
        <canvas ref={canvasRef} className={styles.canvas} />
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

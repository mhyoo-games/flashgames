// 막대 결투 그리기: 관절 각도로 졸라맨 자세를 만든다
import { ATTACKS, FLOOR, H, METER_MAX, ROUND_TIME, StickFight, W, type Fighter } from './engine.ts';

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

const COLORS = ['#1b1f3b', '#c0392b'];
const BAND = ['#3b82f6', '#f5b700'];

/** 각도: 0 = 아래, π/2 = 앞, π = 위. facing 방향 기준 */
function limb(from: P, angle: number, len: number, facing: number): P {
  return { x: from.x + Math.sin(angle) * len * facing, y: from.y + Math.cos(angle) * len };
}

interface Pose {
  hip: P;
  neck: P;
  head: P;
  lean: number;
  /** [위팔, 아래팔] 각도: 앞팔, 뒷팔 */
  armF: [number, number];
  armB: [number, number];
  legF: [number, number];
  legB: [number, number];
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function pose(f: Fighter, time: number): Pose {
  const s = f.facing;
  const t = f.t;
  let hipY = f.y - 62;
  let lean = 0.08;
  let armF: [number, number] = [0.9, 2.6];
  let armB: [number, number] = [0.5, 2.3];
  let legF: [number, number] = [0.32, 0.18];
  let legB: [number, number] = [-0.3, -0.12];
  const p = StickFight.progress(f);
  switch (f.action) {
    case 'idle': {
      const b = Math.sin(time * 5 + f.id) * 0.05;
      hipY += Math.sin(time * 5 + f.id) * 1.5;
      armF = [0.9 + b, 2.7];
      armB = [0.6 - b, 2.4];
      break;
    }
    case 'walk': {
      const w = Math.sin(t * 14);
      legF = [0.1 + w * 0.5, 0.1 + Math.max(0, w) * 0.4];
      legB = [0.1 - w * 0.5, 0.1 + Math.max(0, -w) * 0.4];
      armF = [0.9, 2.6];
      armB = [0.5 - w * 0.2, 2.3];
      lean = 0.14;
      break;
    }
    case 'jump':
      legF = [0.9, -0.4];
      legB = [0.2, -0.6];
      armF = [1.4, 2.2];
      armB = [-0.6, -0.2];
      hipY = f.y - 52;
      break;
    case 'block':
      hipY = f.y - 52;
      lean = -0.05;
      armF = [1.9, 2.9];
      armB = [1.7, 3.0];
      legF = [0.45, -0.1];
      legB = [-0.4, -0.5];
      break;
    case 'punch1':
    case 'punch2':
    case 'punch3': {
      const e = ease(p);
      const big = f.action === 'punch3';
      lean = 0.15 + e * (big ? 0.35 : 0.2);
      // 2타는 뒷손으로
      const front: [number, number] = [0.9 + e * 0.8, 2.6 - e * 1.0];
      if (f.action === 'punch2') {
        armB = front;
        armF = [0.7, 2.3];
      } else {
        armF = big ? [0.9 + e * 0.75, 2.6 - e * 1.15] : front;
        armB = [0.3, 2.1];
      }
      legF = [0.5 + e * 0.2, 0.1];
      legB = [-0.5, -0.2];
      break;
    }
    case 'kick': {
      const e = ease(p);
      lean = -0.3 * e;
      legF = [0.3 + e * 1.3, 0.3 + e * 1.25];
      legB = [-0.2, -0.05];
      armF = [0.4, 1.5];
      armB = [-0.6, -0.9];
      break;
    }
    case 'airkick': {
      const e = ease(p);
      legF = [0.6 + e * 0.6, 0.6 + e * 0.6];
      legB = [0.1, -0.8];
      armF = [1.6, 2.4];
      armB = [-0.9, -0.6];
      hipY = f.y - 55;
      break;
    }
    case 'special': {
      const e = ease(t / ATTACKS.special.startup);
      lean = 0.1;
      armF = [1.3 + e * 0.27, 1.6];
      armB = [1.2 + e * 0.3, 1.6];
      legF = [0.6, 0.2];
      legB = [-0.6, -0.3];
      hipY = f.y - 55;
      break;
    }
    case 'hit':
      lean = -0.45;
      armF = [-0.6, -0.3];
      armB = [-1.0, -0.5];
      legF = [0.3, 0.1];
      legB = [-0.3, -0.1];
      break;
    case 'win': {
      const w = Math.sin(time * 8) * 0.2;
      armF = [2.6 + w, 2.9];
      armB = [2.4 - w, 2.7];
      break;
    }
    case 'ko':
      break;
  }
  const hip = { x: f.x, y: hipY };
  const neck = limb(hip, Math.PI - lean, 55, s);
  const head = limb(neck, Math.PI - lean * 1.2, 17, s);
  return { hip, neck, head, lean, armF, armB, legF, legB };
}

function line(ctx: Ctx, a: P, b: P) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function drawFighter(ctx: Ctx, f: Fighter, time: number) {
  const s = f.facing;
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(f.x, FLOOR + 4, 34 * Math.max(0.4, 1 - (FLOOR - f.y) / 300), 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.action === 'ko') {
    // 누운 자세: 몸 전체를 돌려서 그린다
    const angle = Math.min(1, f.t * 2.5) * (Math.PI / 2) * -Math.sign(f.vx || -s);
    ctx.translate(f.x, f.y);
    ctx.rotate(angle);
    ctx.translate(-f.x, -f.y);
  }
  const p = pose(f, time);
  const flash = f.action === 'hit' && f.t < 0.08;
  ctx.strokeStyle = flash ? '#ffffff' : COLORS[f.id];
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawLimb = (from: P, [a1, a2]: [number, number], l1: number, l2: number) => {
    const mid = limb(from, a1, l1, s);
    const end = limb(mid, a2, l2, s);
    line(ctx, from, mid);
    line(ctx, mid, end);
    return end;
  };
  // 뒤쪽 팔다리는 조금 흐리게
  ctx.globalAlpha = 0.75;
  drawLimb(p.neck, p.armB, 26, 26);
  drawLimb(p.hip, p.legB, 32, 32);
  ctx.globalAlpha = 1;
  line(ctx, p.hip, p.neck);
  drawLimb(p.hip, p.legF, 32, 32);
  const fist = drawLimb(p.neck, p.armF, 26, 26);
  // 머리
  ctx.fillStyle = flash ? '#ffffff' : COLORS[f.id];
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 15, 0, Math.PI * 2);
  ctx.fill();
  // 머리띠
  ctx.strokeStyle = BAND[f.id];
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 15, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  const tail = Math.sin(time * 12 + f.id) * 4;
  line(ctx, { x: p.head.x - s * 13, y: p.head.y - 6 }, { x: p.head.x - s * 30, y: p.head.y - 2 + tail });
  // 눈 (바라보는 쪽)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(p.head.x + s * 6, p.head.y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  if (f.action === 'special' && f.t < ATTACKS.special.startup) {
    const g = ctx.createRadialGradient(fist.x, fist.y, 2, fist.x, fist.y, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, f.id === 0 ? 'rgba(80,160,255,0)' : 'rgba(255,120,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fist.x, fist.y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 배경: 해질녘 옥상 */
function drawStage(ctx: Ctx, time: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
  sky.addColorStop(0, '#ffb07a');
  sky.addColorStop(0.6, '#ffd9a0');
  sky.addColorStop(1, '#ffeccc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, FLOOR);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(780, 120, 46, 0, Math.PI * 2);
  ctx.fill();
  // 먼 건물들
  ctx.fillStyle = '#e8a07a';
  const bld = [[0, 300, 90], [80, 250, 70], [150, 320, 110], [270, 270, 80], [360, 230, 60], [430, 300, 120], [560, 260, 90], [660, 310, 70], [720, 240, 100], [830, 290, 130]];
  for (const [x, y, w] of bld) ctx.fillRect(x, y, w, FLOOR - y);
  ctx.fillStyle = '#f7c59f';
  for (const [x, y, w] of bld) for (let wy = y + 16; wy < FLOOR - 20; wy += 28) for (let wx = x + 10; wx < x + w - 12; wx += 22) ctx.fillRect(wx, wy, 10, 14);
  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 3; i++) {
    const x = ((time * (12 + i * 5) + i * 330) % (W + 200)) - 100;
    const y = 70 + i * 50;
    ctx.beginPath();
    ctx.ellipse(x, y, 60, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40, y - 8, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 옥상 바닥과 난간
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#795548';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x, FLOOR + 8, 56, 4);
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR - 70);
  ctx.lineTo(W, FLOOR - 70);
  ctx.stroke();
  for (let x = 20; x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR - 70);
    ctx.lineTo(x, FLOOR);
    ctx.stroke();
  }
}

function drawHud(ctx: Ctx, g: StickFight) {
  const [a, b] = g.fighters;
  const barW = 360;
  for (const f of [a, b]) {
    const left = f.id === 0;
    const x = left ? 30 : W - 30 - barW;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 3, 22, barW + 6, 24);
    const hp = Math.max(0, f.hp) / 100;
    ctx.fillStyle = hp > 0.5 ? '#5ee07a' : hp > 0.25 ? '#ffd24d' : '#ff5c5c';
    const w = barW * hp;
    ctx.fillRect(left ? x : x + barW - w, 25, w, 18);
    // 게이지
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, 50, barW * 0.6, 9);
    const m = f.meter / METER_MAX;
    ctx.fillStyle = m >= 1 ? (Math.floor(g.phaseTime * 8) % 2 ? '#7fd3ff' : '#ffffff') : '#4aa3ff';
    ctx.fillRect(left ? x : x + barW * 0.4 + barW * 0.6 * (1 - m), 50, barW * 0.6 * m, 9);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.name, left ? x : x + barW, 80);
    ctx.fillText(f.name, left ? x : x + barW, 80);
    // 이긴 라운드
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i < f.wins ? '#ffd24d' : 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(left ? x + barW - 10 - i * 22 : x + 10 + i * 22, 68, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W / 2 - 34, 14, 68, 46);
  ctx.fillStyle = g.timer < 10 ? '#ff7b7b' : '#fff';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(Math.min(ROUND_TIME, g.timer))), W / 2, 50);

  if (g.banner) {
    const big = g.banner === 'K.O.!' || g.banner === '싸워라!';
    ctx.font = `900 ${big ? 86 : 54}px system-ui, sans-serif`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2b1a12';
    ctx.strokeText(g.banner, W / 2, H / 2 - 30);
    ctx.fillStyle = g.banner === 'K.O.!' ? '#ff4d4d' : '#ffe066';
    ctx.fillText(g.banner, W / 2, H / 2 - 30);
  }
}

export function renderStick(ctx: Ctx, g: StickFight, time: number) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  drawStage(ctx, time);
  for (const p of g.projectiles) {
    const color = p.owner === 0 ? '80,170,255' : '255,140,60';
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 34);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, `rgba(${color},0.9)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 40, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${color},0.35)`;
    ctx.beginPath();
    ctx.ellipse(p.x - Math.sign(p.vx) * 40, p.y, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 뒤에 있는 사람(공격 중이 아닌 쪽)을 먼저
  const order = [...g.fighters].sort((a, b) => Number(a.action in ATTACKS) - Number(b.action in ATTACKS));
  for (const f of order) drawFighter(ctx, f, time);
  for (const s of g.sparks) {
    const k = s.t / 0.35;
    const r = (s.kind === 'big' ? 46 : s.kind === 'block' ? 24 : 32) * (0.4 + k);
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = s.kind === 'block' ? '#9fd8ff' : s.kind === 'big' ? '#ffcc33' : '#ffffff';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + s.x;
      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(a) * r * 0.4, s.y + Math.sin(a) * r * 0.4);
      ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHud(ctx, g);
}


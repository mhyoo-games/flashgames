// 막대 결투 그리기: 관절 각도로 졸라맨 자세를 만들고, 캐릭터마다 다른 무기를 쥐여 준다
import type { Weapon } from './chars.ts';
import { FLOOR, H, METER_MAX, SPECIALS, StickFight, W, type Fighter } from './engine.ts';
import type { StageBg } from './story.ts';

type Ctx = CanvasRenderingContext2D;
type P = { x: number; y: number };

/** 각도: 0 = 아래, π/2 = 앞, π = 위. facing 방향 기준 */
function limb(from: P, angle: number, len: number, facing: number): P {
  return { x: from.x + Math.sin(angle) * len * facing, y: from.y + Math.cos(angle) * len };
}

interface Pose {
  hip: P;
  neck: P;
  head: P;
  armF: [number, number];
  armB: [number, number];
  legF: [number, number];
  legB: [number, number];
  /** 무기를 쥔 손이 어느 쪽으로 기울었는지 (각도) */
  grip: number;
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function pose(f: Fighter, time: number): Pose {
  const s = f.facing;
  const k = f.char.scale;
  const t = f.t;
  let hipY = f.y - 62 * k;
  let lean = 0.08;
  let armF: [number, number] = [0.9, 2.6];
  let armB: [number, number] = [0.5, 2.3];
  let legF: [number, number] = [0.32, 0.18];
  let legB: [number, number] = [-0.3, -0.12];
  let grip = 2.4;
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
      armB = [0.5 - w * 0.2, 2.3];
      lean = 0.14;
      break;
    }
    case 'jump':
      legF = [0.9, -0.4];
      legB = [0.2, -0.6];
      armF = [1.4, 2.2];
      armB = [-0.6, -0.2];
      hipY = f.y - 52 * k;
      break;
    case 'block':
      hipY = f.y - 52 * k;
      lean = -0.05;
      armF = [1.9, 2.9];
      armB = [1.7, 3.0];
      legF = [0.45, -0.1];
      legB = [-0.4, -0.5];
      grip = 3.1;
      break;
    case 'punch1':
    case 'punch2':
    case 'punch3': {
      const e = ease(p);
      const big = f.action === 'punch3';
      lean = 0.15 + e * (big ? 0.35 : 0.2);
      const swing: [number, number] = big ? [0.9 + e * 0.75, 2.6 - e * 1.15] : [0.9 + e * 0.8, 2.6 - e * 1.0];
      if (f.action === 'punch2' && f.char.weapon === 'fist') {
        armB = swing;
        armF = [0.7, 2.3];
      } else {
        armF = swing;
        armB = [0.3, 2.1];
      }
      // 무기는 위에서 앞으로 내려친다
      grip = 2.9 - e * 1.4;
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
      grip = 1;
      break;
    }
    case 'throw': {
      const e = ease(p);
      armF = [2.6 - e * 1.1, 2.9 - e * 1.3];
      armB = [0.2, 1.2];
      lean = 0.2 * e;
      legF = [0.5, 0.1];
      legB = [-0.5, -0.2];
      break;
    }
    case 'airkick': {
      const e = ease(p);
      legF = [0.6 + e * 0.6, 0.6 + e * 0.6];
      legB = [0.1, -0.8];
      armF = [1.6, 2.4];
      armB = [-0.9, -0.6];
      hipY = f.y - 55 * k;
      break;
    }
    case 'special': {
      const sp = f.currentSpecial;
      const e = ease(t / SPECIALS[sp].startup);
      if (sp === 'spin') {
        const a = t * 26;
        armF = [1.6 + Math.sin(a) * 0.2, 1.6];
        armB = [1.6, 1.6];
        grip = a;
        legF = [0.5, 0.2];
        legB = [-0.5, -0.2];
      } else if (sp === 'slam') {
        const down = t > SPECIALS.slam.startup;
        armF = down ? [1.2, 0.9] : [2.9 - e * 0.1, 3.0];
        armB = down ? [1.0, 0.8] : [2.7, 2.9];
        grip = down ? 1.2 : 3.1;
        hipY = f.y - (down ? 48 : 62) * k;
        legF = [0.6, -0.1];
        legB = [-0.6, -0.4];
      } else if (sp === 'dash' || sp === 'teleport') {
        lean = 0.55;
        armF = [1.65, 1.6];
        armB = [-0.6, -0.4];
        grip = 1.6;
        legF = [0.9, 0.3];
        legB = [-0.8, -0.6];
      } else {
        lean = 0.1;
        armF = [1.3 + e * 0.27, 1.6];
        armB = [1.2 + e * 0.3, 1.6];
        legF = [0.6, 0.2];
        legB = [-0.6, -0.3];
        hipY = f.y - 55 * k;
      }
      break;
    }
    case 'hit':
      lean = -0.45;
      armF = [-0.6, -0.3];
      armB = [-1.0, -0.5];
      legF = [0.3, 0.1];
      legB = [-0.3, -0.1];
      grip = -0.5;
      break;
    case 'win': {
      const w = Math.sin(time * 8) * 0.2;
      armF = [2.6 + w, 2.9];
      armB = [2.4 - w, 2.7];
      grip = 3.1;
      break;
    }
    case 'ko':
      break;
  }
  const hip = { x: f.x, y: hipY };
  const neck = limb(hip, Math.PI - lean, 55 * k, s);
  const head = limb(neck, Math.PI - lean * 1.2, 17 * k, s);
  return { hip, neck, head, armF, armB, legF, legB, grip };
}

function line(ctx: Ctx, a: P, b: P) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

/** 손에 든 무기 */
function drawWeapon(ctx: Ctx, w: Weapon, hand: P, angle: number, facing: number, k: number, time: number, back: P) {
  const dir = (len: number, a = angle): P => limb(hand, a, len * k, facing);
  ctx.save();
  ctx.lineCap = 'round';
  switch (w) {
    case 'fist':
      ctx.fillStyle = '#facc15';
      for (const h of [hand, back]) {
        ctx.beginPath();
        ctx.arc(h.x, h.y, 7 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'hammer': {
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 6 * k;
      const end = dir(58);
      line(ctx, dir(-8), end);
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(Math.atan2(end.y - hand.y, end.x - hand.x));
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(-12 * k, -18 * k, 26 * k, 36 * k);
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(-12 * k, -18 * k, 6 * k, 36 * k);
      ctx.restore();
      break;
    }
    case 'staff': {
      ctx.strokeStyle = '#a3b84b';
      ctx.lineWidth = 6 * k;
      line(ctx, dir(-48), dir(78));
      ctx.strokeStyle = '#6b7f24';
      ctx.lineWidth = 7 * k;
      for (const d of [-20, 20, 50]) {
        const a = dir(d - 2);
        const b = dir(d + 2);
        line(ctx, a, b);
      }
      break;
    }
    case 'star': {
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(time * 6);
      drawStar(ctx, 9 * k, '#d1d5db');
      ctx.restore();
      break;
    }
    case 'sword':
    case 'greatsword': {
      const big = w === 'greatsword';
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 5 * k;
      line(ctx, dir(-10), dir(4));
      ctx.strokeStyle = big ? '#9ca3af' : '#e0e7ff';
      ctx.lineWidth = (big ? 11 : 5) * k;
      line(ctx, dir(6), dir(big ? 88 : 74));
      if (!big) {
        ctx.strokeStyle = 'rgba(196,181,253,0.5)';
        ctx.lineWidth = 10 * k;
        line(ctx, dir(10), dir(70));
      }
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4 * k;
      const g1 = limb(dir(5), angle + Math.PI / 2, 9 * k, facing);
      const g2 = limb(dir(5), angle - Math.PI / 2, 9 * k, facing);
      line(ctx, g1, g2);
      break;
    }
    case 'club':
      ctx.strokeStyle = '#c08a4a';
      ctx.lineWidth = 7 * k;
      line(ctx, dir(-6), dir(30));
      ctx.lineWidth = 12 * k;
      line(ctx, dir(30), dir(62));
      break;
    case 'blades':
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 4 * k;
      line(ctx, hand, dir(40));
      line(ctx, back, limb(back, angle - 0.6, 36 * k, facing));
      break;
    case 'claw':
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 3 * k;
      for (const off of [-0.25, 0, 0.25]) line(ctx, hand, dir(24, angle + off));
      break;
    case 'scythe': {
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 6 * k;
      const top = dir(80);
      line(ctx, dir(-30), top);
      // 낫날: 자루 끝에서 앞쪽으로 휘어 내려온다
      const ctrl = limb(top, angle + 1.2, 34 * k, facing);
      const tip = limb(top, angle + 2.2, 44 * k, facing);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 7 * k;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawStar(ctx: Ctx, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawFighter(ctx: Ctx, f: Fighter, time: number) {
  const s = f.facing;
  const k = f.char.scale;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(f.x, FLOOR + 4, 34 * k * Math.max(0.4, 1 - (FLOOR - f.y) / 300), 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.action === 'ko') {
    const angle = Math.min(1, f.t * 2.5) * (Math.PI / 2) * -Math.sign(f.vx || -s);
    ctx.translate(f.x, f.y);
    ctx.rotate(angle);
    ctx.translate(-f.x, -f.y);
  }
  // 분노한 대마왕은 붉은 기운
  if (f.enraged) {
    const g = ctx.createRadialGradient(f.x, f.y - 80 * k, 10, f.x, f.y - 80 * k, 110 * k);
    g.addColorStop(0, 'rgba(244,63,94,0.35)');
    g.addColorStop(1, 'rgba(244,63,94,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y - 80 * k, 110 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = pose(f, time);
  const flash = f.action === 'hit' && f.t < 0.08;
  const color = flash ? '#ffffff' : f.char.color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7 * k;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawLimb = (from: P, [a1, a2]: [number, number], l1: number, l2: number) => {
    const mid = limb(from, a1, l1 * k, s);
    const end = limb(mid, a2, l2 * k, s);
    line(ctx, from, mid);
    line(ctx, mid, end);
    return end;
  };
  // 밝은 색 캐릭터는 테두리를 그려 배경에 묻히지 않게
  const outline = f.char.color === '#e5e7eb';
  ctx.globalAlpha = 0.78;
  const backHand = drawLimb(p.neck, p.armB, 26, 26);
  drawLimb(p.hip, p.legB, 32, 32);
  ctx.globalAlpha = 1;
  if (outline) {
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 10 * k;
    line(ctx, p.hip, p.neck);
    ctx.strokeStyle = color;
    ctx.lineWidth = 7 * k;
  }
  line(ctx, p.hip, p.neck);
  drawLimb(p.hip, p.legF, 32, 32);
  const hand = drawLimb(p.neck, p.armF, 26, 26);
  // 머리
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 15 * k, 0, Math.PI * 2);
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // 머리띠 (보스는 뿔·가면)
  ctx.strokeStyle = f.char.band;
  ctx.lineWidth = 5 * k;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 15 * k, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  const tail = Math.sin(time * 12 + f.id) * 4;
  line(ctx, { x: p.head.x - s * 13 * k, y: p.head.y - 6 * k }, { x: p.head.x - s * 30 * k, y: p.head.y - 2 * k + tail });
  if (f.char.id === 'maou') {
    ctx.fillStyle = '#f43f5e';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(p.head.x + d * 8 * k, p.head.y - 12 * k);
      ctx.lineTo(p.head.x + d * 16 * k, p.head.y - 30 * k);
      ctx.lineTo(p.head.x + d * 2 * k, p.head.y - 14 * k);
      ctx.fill();
    }
  }
  if (f.char.id === 'titan') {
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(p.head.x - 2 * k + s * 2, p.head.y - 9 * k, 14 * k * s, 14 * k);
  }
  ctx.fillStyle = f.char.id === 'kage' || f.char.id === 'maou' ? '#f43f5e' : f.char.color === '#e5e7eb' ? '#4c1d95' : '#fff';
  ctx.beginPath();
  ctx.arc(p.head.x + s * 6 * k, p.head.y - 2 * k, 3 * k, 0, Math.PI * 2);
  ctx.fill();
  // 무기
  const showWeapon = !(f.char.weapon === 'star' && (f.action === 'throw' || (f.action === 'special' && f.t > SPECIALS.wave.startup)));
  if (showWeapon) drawWeapon(ctx, f.char.weapon, hand, p.grip, s, k, time, backHand);
  // 장풍 모으는 빛
  if (f.action === 'special' && f.currentSpecial === 'wave' && f.t < SPECIALS.wave.startup) {
    const g = ctx.createRadialGradient(hand.x, hand.y, 2, hand.x, hand.y, 34);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  // 돌진 잔상
  if (f.action === 'special' && (f.currentSpecial === 'dash' || f.currentSpecial === 'spin') && f.t > SPECIALS[f.currentSpecial].startup) {
    ctx.strokeStyle = f.currentSpecial === 'spin' ? 'rgba(52,211,153,0.5)' : 'rgba(250,204,21,0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const y = f.y - (30 + i * 28) * k;
      line(ctx, { x: f.x - s * (30 + i * 6), y }, { x: f.x - s * (80 + i * 14), y });
    }
    if (f.currentSpecial === 'spin') {
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 90 * k, 90 * k, 26 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- 배경 ----
function sky(ctx: Ctx, top: string, mid: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, top);
  g.addColorStop(0.6, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, FLOOR);
}

function clouds(ctx: Ctx, time: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const x = ((time * (12 + i * 5) + i * 330) % (W + 200)) - 100;
    const y = 70 + i * 50;
    ctx.beginPath();
    ctx.ellipse(x, y, 60, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 40, y - 8, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const BUILDINGS = [[0, 300, 90], [80, 250, 70], [150, 320, 110], [270, 270, 80], [360, 230, 60], [430, 300, 120], [560, 260, 90], [660, 310, 70], [720, 240, 100], [830, 290, 130]];

export function drawStage(ctx: Ctx, bg: StageBg, time: number) {
  switch (bg) {
    case 'alley': {
      sky(ctx, '#ffb07a', '#ffd9a0', '#ffeccc');
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(780, 120, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8a07a';
      for (const [x, y, w] of BUILDINGS) ctx.fillRect(x, y, w, FLOOR - y);
      ctx.fillStyle = '#f7c59f';
      for (const [x, y, w] of BUILDINGS) for (let wy = y + 16; wy < FLOOR - 20; wy += 28) for (let wx = x + 10; wx < x + w - 12; wx += 22) ctx.fillRect(wx, wy, 10, 14);
      clouds(ctx, time, 'rgba(255,255,255,0.6)');
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 4;
      line(ctx, { x: 0, y: FLOOR - 70 }, { x: W, y: FLOOR - 70 });
      for (let x = 20; x < W; x += 80) line(ctx, { x, y: FLOOR - 70 }, { x, y: FLOOR });
      break;
    }
    case 'bamboo': {
      sky(ctx, '#cfe8d0', '#e6f2e1', '#f2f7ee');
      for (let layer = 0; layer < 2; layer++) {
        ctx.strokeStyle = layer ? '#5f9e5a' : '#a6cf98';
        ctx.lineWidth = layer ? 16 : 10;
        for (let i = 0; i < 16; i++) {
          const x = ((i * 67 + layer * 31) % W) + Math.sin(time * 0.8 + i) * 3;
          line(ctx, { x, y: 0 }, { x, y: FLOOR });
          ctx.save();
          ctx.lineWidth = 2;
          for (let y = 40 + (i % 3) * 20; y < FLOOR; y += 70) line(ctx, { x: x - 8, y }, { x: x + 8, y });
          ctx.restore();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, FLOOR - 140, W, 140);
      ctx.fillStyle = '#7a8f5c';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      break;
    }
    case 'site': {
      sky(ctx, '#9db4c0', '#c9d6df', '#e3e9ed');
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 8;
      // 크레인
      line(ctx, { x: 150, y: FLOOR }, { x: 150, y: 80 });
      line(ctx, { x: 60, y: 90 }, { x: 520, y: 90 });
      ctx.lineWidth = 2;
      line(ctx, { x: 420, y: 90 }, { x: 420, y: 200 + Math.sin(time) * 10 });
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(400, 200 + Math.sin(time) * 10, 40, 24);
      // 철골
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 6;
      for (let x = 600; x <= 900; x += 100) line(ctx, { x, y: 150 }, { x, y: FLOOR });
      for (let y = 150; y < FLOOR; y += 80) line(ctx, { x: 600, y }, { x: 900, y });
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = '#facc15';
      for (let x = 0; x < W; x += 60) ctx.fillRect(x, FLOOR, 30, 8);
      break;
    }
    case 'roof': {
      sky(ctx, '#1e1b4b', '#312e81', '#4338ca');
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(760, 110, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 151) % W, (i * 73) % 260, 2, 2);
      ctx.fillStyle = '#1e1b3a';
      for (const [x, y, w] of BUILDINGS) ctx.fillRect(x, y + 30, w, FLOOR - y);
      ctx.fillStyle = '#fde68a';
      for (const [x, y, w] of BUILDINGS) for (let wy = y + 50; wy < FLOOR - 20; wy += 34) for (let wx = x + 10; wx < x + w - 12; wx += 26) if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 8, 12);
      // 기와 지붕
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = '#475569';
      for (let x = 0; x < W; x += 24) {
        ctx.beginPath();
        ctx.arc(x + 12, FLOOR, 12, Math.PI, 0);
        ctx.fill();
      }
      break;
    }
    case 'castle': {
      sky(ctx, '#2a0a12', '#4c0519', '#7f1d1d');
      ctx.fillStyle = '#1a0508';
      ctx.fillRect(60, 160, 120, FLOOR - 160);
      ctx.fillRect(780, 160, 120, FLOOR - 160);
      for (const x of [60, 780]) for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 32, 140, 20, 24);
      ctx.fillStyle = '#ff6b35';
      for (const x of [110, 830]) {
        const fl = 10 + Math.sin(time * 10 + x) * 3;
        ctx.beginPath();
        ctx.ellipse(x, 230, 8, fl, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,80,80,0.15)';
      for (let i = 0; i < 20; i++) {
        const y = (FLOOR - ((time * 30 + i * 47) % FLOOR));
        ctx.fillRect((i * 97) % W, y, 3, 3);
      }
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 80) line(ctx, { x, y: FLOOR }, { x: x - 40, y: H });
      break;
    }
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
    const hp = Math.max(0, f.hp) / f.maxHp;
    ctx.fillStyle = hp > 0.5 ? '#5ee07a' : hp > 0.25 ? '#ffd24d' : '#ff5c5c';
    const w = barW * hp;
    ctx.fillRect(left ? x : x + barW - w, 25, w, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(left ? x : x + barW * 0.4, 50, barW * 0.6, 9);
    const m = f.meter / METER_MAX;
    ctx.fillStyle = m >= 1 ? (Math.floor(g.phaseTime * 8) % 2 ? '#7fd3ff' : '#ffffff') : '#4aa3ff';
    ctx.fillRect(left ? x : x + barW * 0.4 + barW * 0.6 * (1 - m), 50, barW * 0.6 * m, 9);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const label = `${f.char.icon} ${f.name}`;
    ctx.strokeText(label, left ? x : x + barW, 80);
    ctx.fillText(label, left ? x : x + barW, 80);
    if (g.winsNeeded > 1) {
      for (let i = 0; i < g.winsNeeded; i++) {
        ctx.fillStyle = i < f.wins ? '#ffd24d' : 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(left ? x + barW - 10 - i * 22 : x + 10 + i * 22, 68, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(W / 2 - 34, 14, 68, 46);
  ctx.fillStyle = g.timer < 10 ? '#ff7b7b' : '#fff';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(Math.min(g.roundTime, g.timer))), W / 2, 50);

  if (g.banner) {
    const big = g.banner === 'K.O.!' || g.banner === '싸워라!';
    ctx.font = `900 ${big ? 86 : 50}px system-ui, sans-serif`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2b1a12';
    ctx.strokeText(g.banner, W / 2, H / 2 - 30);
    ctx.fillStyle = g.banner === 'K.O.!' || g.banner.includes('분노') ? '#ff4d4d' : '#ffe066';
    ctx.fillText(g.banner, W / 2, H / 2 - 30);
  }
}

export function renderStick(ctx: Ctx, g: StickFight, time: number, bg: StageBg = 'alley') {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  drawStage(ctx, bg, time);
  for (const p of g.projectiles) {
    if (p.kind === 'star') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(time * 20);
      drawStar(ctx, p.r + 2, '#e5e7eb');
      ctx.restore();
      continue;
    }
    if (p.kind === 'shock') {
      ctx.fillStyle = 'rgba(120,90,60,0.85)';
      for (let i = 0; i < 4; i++) {
        const x = p.x - Math.sign(p.vx) * i * 14;
        ctx.beginPath();
        ctx.moveTo(x - 10, FLOOR);
        ctx.lineTo(x, FLOOR - 26 + i * 5 + Math.sin(time * 30 + i) * 3);
        ctx.lineTo(x + 10, FLOOR);
        ctx.fill();
      }
      continue;
    }
    const owner = g.fighters[p.owner];
    const color = owner.char.id === 'maou' ? '190,40,90' : owner.char.id === 'kai' ? '255,120,40' : p.owner === 0 ? '80,170,255' : '255,140,60';
    const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r + 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, `rgba(${color},0.9)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r + 10, p.r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const order = [...g.fighters].sort((a, b) => Number(StickFight.isAttack(a.action)) - Number(StickFight.isAttack(b.action)));
  for (const f of order) drawFighter(ctx, f, time);
  for (const s of g.sparks) {
    const k = s.t / 0.4;
    if (s.kind === 'smoke') {
      ctx.fillStyle = `rgba(80,60,120,${0.6 * (1 - k)})`;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(i * 1.3) * 30 * k, s.y + Math.sin(i * 1.3) * 40 * k, 18 * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }
    const r = (s.kind === 'big' ? 46 : s.kind === 'block' ? 24 : 32) * (0.4 + k);
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.strokeStyle = s.kind === 'block' ? '#9fd8ff' : s.kind === 'big' ? '#ffcc33' : '#ffffff';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + s.x;
      line(ctx, { x: s.x + Math.cos(a) * r * 0.4, y: s.y + Math.sin(a) * r * 0.4 }, { x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r });
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  drawHud(ctx, g);
}

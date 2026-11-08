// 햄스터 다이노 파이트 그리기
// 햄스터는 둥근 몸·큰 머리·반짝이는 눈. 그라데이션 음영·외곽선·하이라이트로 입체감을 낸다.
// 변신하면 공룡 특징(뿔·프릴·등판·꼬리·날개·돛…)이 돋아난다.
import type { CharDef, Dino } from './chars.ts';
import { DinoFight, FLOOR, GAUGE_MAX, H, W, type Fighter, type Projectile } from './engine.ts';
import type { StageId } from './chars.ts';

type Ctx = CanvasRenderingContext2D;

interface Look {
  lean: number;
  squash: number;
  /** 몸 전체 위로 띄움 */
  lift: number;
  /** 앞발 위치 (몸 기준) */
  paw: [number, number];
  paw2: [number, number];
  foot: [number, number];
  foot2: [number, number];
  eyes: 'normal' | 'angry' | 'hurt' | 'ko' | 'happy';
  spin: number;
  glow?: string;
  /** 앞발이 길게 뻗었는지 (팔 그리기) */
  reachArm: boolean;
}

function lookOf(g: DinoFight, f: Fighter, time: number): Look {
  const L: Look = { lean: 0, squash: 1, lift: 0, paw: [28, -52], paw2: [12, -48], foot: [18, -3], foot2: [-12, -3], eyes: f.beast ? 'angry' : 'normal', spin: 0, reachArm: false };
  const p = g.progress(f);
  const e = 1 - Math.pow(1 - p, 3);
  const t = f.t;
  switch (f.action) {
    case 'idle':
      L.squash = 1 + Math.sin(time * 5 + f.id) * 0.025;
      L.paw = [26, -58 + Math.sin(time * 5) * 2];
      break;
    case 'walk':
    case 'back': {
      const w = Math.sin(t * 15);
      L.foot = [18 + w * 10, -3 - Math.max(0, w) * 6];
      L.foot2 = [-12 - w * 10, -3 - Math.max(0, -w) * 6];
      L.lift = Math.abs(w) * 3;
      L.lean = f.action === 'back' ? -0.08 : 0.06;
      break;
    }
    case 'jump':
      L.squash = f.vy < 0 ? 1.08 : 0.96;
      L.foot = [14, -14];
      L.foot2 = [-8, -12];
      L.paw = [24, -70];
      break;
    case 'crouch':
      L.squash = 0.72;
      L.paw = [26, -40];
      break;
    case 'block':
      L.squash = f.crouching ? 0.72 : 1;
      L.lean = -0.06;
      L.paw = [32, f.crouching ? -62 : -82];
      L.paw2 = [26, f.crouching ? -56 : -74];
      break;
    case 'punch1':
    case 'punch2':
    case 'punch3': {
      const big = f.action === 'punch3';
      L.lean = 0.06 + e * (big ? 0.18 : 0.1);
      L.paw = [28 + e * (big ? 40 : 32), -66 - (big ? e * 6 : 0)];
      L.reachArm = true;
      L.foot = [26, -3];
      break;
    }
    case 'kick':
      L.lean = -0.12 * e;
      L.foot = [20 + e * 42, -3 - e * 34];
      break;
    case 'lowkick':
      L.squash = 0.75;
      L.foot = [20 + e * 46, -6];
      break;
    case 'airpunch':
      L.paw = [28 + e * 30, -60 + e * 10];
      L.reachArm = true;
      L.foot = [10, -16];
      break;
    case 'airkick':
      L.lean = 0.2;
      L.foot = [22 + e * 34, -12 + e * 6];
      L.foot2 = [-6, -24];
      break;
    case 'transform':
      L.squash = 1 + Math.sin(t * 40) * 0.06;
      L.paw = [30, -96];
      L.paw2 = [-10, -96];
      L.glow = f.char.accent;
      L.eyes = 'angry';
      break;
    case 'move': {
      const mv = g.move(f)!;
      L.eyes = 'angry';
      if (mv.type === 'shot' || mv.type === 'meteor') {
        L.paw = [30 + e * 16, mv.type === 'meteor' ? -100 : -62];
        L.paw2 = [24 + e * 14, mv.type === 'meteor' ? -96 : -56];
        L.reachArm = true;
        L.glow = t < mv.startup ? f.char.accent : undefined;
      } else if (mv.type === 'rush') {
        L.lean = 0.35;
        L.paw = [52, -58];
        L.reachArm = true;
      } else if (mv.type === 'rising') {
        L.squash = 1.12;
        L.paw = [30, -118];
        L.reachArm = true;
        L.lean = -0.05;
      } else if (mv.type === 'spin') {
        L.spin = t * 22;
      } else if (mv.type === 'slam') {
        const down = t > mv.startup;
        L.squash = down ? 0.82 : 1.06;
        L.paw = down ? [38, -20] : [20, -110];
        L.paw2 = down ? [28, -18] : [0, -108];
      } else if (mv.type === 'dive') {
        L.lean = 0.7;
        L.foot = [40, -20];
      } else if (mv.type === 'counter') {
        L.paw = [34, -80];
        L.paw2 = [30, -70];
        L.glow = '#ffffff';
        L.lean = -0.08;
      }
      if (f.slot === 'super') L.glow = L.glow ?? f.char.accent;
      break;
    }
    case 'hit':
      L.lean = -0.3;
      L.eyes = 'hurt';
      L.squash = 0.92;
      L.paw = [10, -70];
      break;
    case 'ko':
      L.eyes = 'ko';
      break;
    case 'win':
      L.eyes = 'happy';
      L.lift = Math.abs(Math.sin(time * 6)) * 14;
      L.paw = [24, -112];
      break;
  }
  return L;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** 입체 털 칠하기: 왼쪽 위에서 빛이 오는 둥근 그라데이션 */
function furFill(ctx: Ctx, x: number, y: number, r: number, color: string): CanvasGradient {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.15);
  g.addColorStop(0, shade(color, 45));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -45));
  return g;
}

/** 뿔·가시: (x,y)에서 ang 방향으로 len만큼 뻗은 삼각형 */
function spike(ctx: Ctx, x: number, y: number, ang: number, len: number, w: number, color: string, line: string) {
  const nx = -Math.sin(ang) * w;
  const ny = Math.cos(ang) * w;
  ctx.fillStyle = color;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + nx, y + ny);
  ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + nx * 0.6, y + Math.sin(ang) * len * 0.5 + ny * 0.6, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
  ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 - nx * 0.6, y + Math.sin(ang) * len * 0.5 - ny * 0.6, x - nx, y - ny);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------- 공룡 특징 (뒤쪽) ----------
function backFeatures(ctx: Ctx, dino: Dino, c: CharDef, time: number) {
  const F = c.fur.feature;
  const S = c.fur.scale;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = c.fur.line;
  ctx.lineWidth = 3;
  switch (dino) {
    case 'trex':
    case 'brachio':
    case 'meteor': {
      // 굵은 꼬리
      const sway = Math.sin(time * 4) * 4;
      ctx.fillStyle = dino === 'meteor' ? '#2a2340' : S;
      ctx.beginPath();
      ctx.moveTo(-30, -50);
      ctx.quadraticCurveTo(-75, -40 + sway, dino === 'brachio' ? -112 : -96, -16 + sway);
      ctx.quadraticCurveTo(-60, -14, -26, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (dino === 'meteor') {
        // 불꽃 꼬리 끝
        ctx.fillStyle = '#ff6d2e';
        ellipse(ctx, -98, -18 + sway, 10 + Math.sin(time * 20) * 3, 7);
        ctx.fill();
      }
      break;
    }
    case 'stego': {
      // 등판
      // 등을 따라 바깥쪽으로 솟은 등판
      const plates: [number, number, number, number][] = [
        [-22, -112, -2.0, 30],
        [-36, -90, -2.35, 34],
        [-40, -64, -2.65, 32],
        [-38, -38, -2.9, 26],
      ];
      for (const [x, y, a, len] of plates) spike(ctx, x, y, a, len, 13, F, c.fur.line);
      // 가시 꼬리
      ctx.fillStyle = S;
      ctx.beginPath();
      ctx.moveTo(-30, -36);
      ctx.quadraticCurveTo(-70, -30, -88, -14);
      ctx.quadraticCurveTo(-56, -14, -26, -18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff1cf';
      for (const [x, y] of [[-78, -22], [-84, -16]]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y - 16);
        ctx.lineTo(x + 4, y - 3);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'ankylo': {
      // 곤봉 꼬리
      ctx.strokeStyle = S;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(-36, -30);
      ctx.quadraticCurveTo(-66, -26, -82, -18);
      ctx.stroke();
      ctx.fillStyle = shade(F, 10);
      ctx.strokeStyle = c.fur.line;
      ctx.lineWidth = 3;
      ellipse(ctx, -88, -18, 13, 10);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ptera': {
      // 날개 (뒤쪽)
      const flap = Math.sin(time * 10) * 0.15;
      ctx.fillStyle = shade(F, 20);
      ctx.beginPath();
      ctx.moveTo(-6, -70);
      ctx.lineTo(-70, -110 - flap * 60);
      ctx.lineTo(-54, -60);
      ctx.lineTo(-30, -40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'spino': {
      // 등 돛
      // 등 위로 크게 솟은 돛
      const sail = ctx.createLinearGradient(0, -150, 0, -40);
      sail.addColorStop(0, shade(F, 50));
      sail.addColorStop(1, shade(F, -20));
      ctx.fillStyle = sail;
      ctx.beginPath();
      ctx.moveTo(-40, -28);
      ctx.quadraticCurveTo(-96, -96, -54, -150);
      ctx.quadraticCurveTo(-24, -128, -14, -96);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = shade(F, -50);
      ctx.lineWidth = 2;
      for (const k of [0.2, 0.45, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(-40 + 22 * k, -28 - 60 * k);
        ctx.lineTo(-80 + 40 * k, -110 - 30 * k);
        ctx.stroke();
      }
      break;
    }
    case 'raptor':
      // 꼬리 깃털
      ctx.fillStyle = S;
      ctx.beginPath();
      ctx.moveTo(-30, -48);
      ctx.quadraticCurveTo(-70, -60, -92, -46);
      ctx.quadraticCurveTo(-60, -34, -28, -30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = F;
      for (const [x, y] of [[-88, -50], [-80, -56], [-90, -42]]) {
        ellipse(ctx, x, y, 8, 3, -0.4);
        ctx.fill();
      }
      break;
    case 'tricera':
      break;
  }
}

// ---------- 공룡 특징 (앞쪽, 머리 주변) ----------
function headFeatures(ctx: Ctx, dino: Dino, c: CharDef, hx: number, hy: number, time: number) {
  const F = c.fur.feature;
  ctx.strokeStyle = c.fur.line;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  switch (dino) {
    case 'tricera':
      // 이마의 긴 뿔 두 개와 코뿔
      spike(ctx, hx - 2, hy - 24, -1.05, 40, 6, '#fff6dc', c.fur.line);
      spike(ctx, hx + 18, hy - 24, -0.8, 36, 5.5, '#fff6dc', c.fur.line);
      spike(ctx, hx + 32, hy + 2, -0.75, 16, 4.5, '#fff6dc', c.fur.line);
      break;
    case 'trex': {
      // 날카로운 이빨이 보이는 큰 입
      ctx.fillStyle = '#7a1f2b';
      ctx.beginPath();
      ctx.moveTo(hx + 18, hy + 10);
      ctx.quadraticCurveTo(hx + 34, hy + 22, hx + 40, hy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      for (const dx of [22, 28, 34]) {
        ctx.beginPath();
        ctx.moveTo(hx + dx, hy + 9);
        ctx.lineTo(hx + dx + 3, hy + 15);
        ctx.lineTo(hx + dx + 6, hy + 9);
        ctx.fill();
      }
      // 이마 비늘 볏
      for (const [x, y, a] of [[-20, -22, -2.2], [-10, -30, -1.9], [2, -32, -1.6]]) spike(ctx, hx + x, hy + y, a, 16, 6, F, c.fur.line);
      break;
    }
    case 'ptera':
      // 뒤로 뻗은 볏
      ctx.fillStyle = F;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy - 26);
      ctx.lineTo(hx - 46, hy - 40);
      ctx.lineTo(hx - 8, hy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'raptor':
      // 머리 깃털 (크게)
      spike(ctx, hx - 4, hy - 28, -2.0, 30, 6, F, c.fur.line);
      spike(ctx, hx - 14, hy - 22, -2.35, 30, 6, '#ff7043', c.fur.line);
      spike(ctx, hx - 22, hy - 12, -2.7, 26, 5, '#29b6f6', c.fur.line);
      // 눈가 줄무늬
      ctx.strokeStyle = c.fur.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hx - 12, hy - 10);
      ctx.lineTo(hx - 2, hy - 6);
      ctx.stroke();
      break;
    case 'spino':
      // 악어 같은 긴 주둥이
      ctx.fillStyle = c.fur.scale;
      ctx.strokeStyle = c.fur.line;
      ctx.beginPath();
      ctx.moveTo(hx + 22, hy - 2);
      ctx.quadraticCurveTo(hx + 58, hy + 2, hx + 60, hy + 12);
      ctx.quadraticCurveTo(hx + 40, hy + 18, hx + 20, hy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const dx of [30, 38, 46]) {
        ctx.beginPath();
        ctx.moveTo(hx + dx, hy + 14);
        ctx.lineTo(hx + dx + 3, hy + 19);
        ctx.lineTo(hx + dx + 6, hy + 14);
        ctx.fill();
      }
      break;
    case 'meteor': {
      // 불타는 뿔
      for (const s of [-1, 1]) {
        const x = hx + s * 12 + 4;
        const fl = Math.sin(time * 18 + s) * 3;
        ctx.fillStyle = '#ff6d2e';
        ctx.beginPath();
        ctx.moveTo(x - 6, hy - 26);
        ctx.quadraticCurveTo(x + s * 8, hy - 52 + fl, x + s * 2, hy - 60 + fl);
        ctx.quadraticCurveTo(x + s * 2, hy - 40, x + 6, hy - 26);
        ctx.fill();
        ctx.fillStyle = '#ffd54a';
        ellipse(ctx, x + s * 1, hy - 40 + fl, 3, 7);
        ctx.fill();
      }
      break;
    }
    case 'stego':
    case 'ankylo':
    case 'brachio':
      break;
  }
}

/** 몸 위에 덮이는 특징 (안킬로 등껍질) */
function overBody(ctx: Ctx, dino: Dino, c: CharDef) {
  if (dino !== 'ankylo') return;
  const S = c.fur.scale;
  const g = ctx.createRadialGradient(-22, -76, 4, -14, -56, 52);
  g.addColorStop(0, shade(S, 45));
  g.addColorStop(1, shade(S, -35));
  ctx.fillStyle = g;
  ctx.strokeStyle = c.fur.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-10, -52, 44, 40, 0, Math.PI * 0.55, Math.PI * 1.62);
  ctx.quadraticCurveTo(4, -60, -6, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const [x, y] of [[-38, -64], [-28, -82], [-40, -42], [-24, -56], [-26, -32], [-14, -72]]) spike(ctx, x, y, Math.atan2(y + 52, x + 10), 12, 5, shade(c.fur.feature, 40), c.fur.line);
}

function frill(ctx: Ctx, c: CharDef, hx: number, hy: number) {
  const F = c.fur.scale;
  const g = ctx.createRadialGradient(hx - 10, hy - 6, 10, hx - 10, hy - 6, 56);
  g.addColorStop(0, shade(F, 30));
  g.addColorStop(1, shade(F, -30));
  ctx.fillStyle = g;
  ctx.strokeStyle = c.fur.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx - 12, hy - 4, 52, Math.PI * 0.55, Math.PI * 1.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e2653a';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.65 + i * 0.18);
    ellipse(ctx, hx - 12 + Math.cos(a) * 42, hy - 4 + Math.sin(a) * 42, 5, 5);
    ctx.fill();
  }
}

function accessory(ctx: Ctx, c: CharDef, hx: number, hy: number, time: number) {
  const L = c.fur.line;
  ctx.lineWidth = 3;
  ctx.strokeStyle = L;
  switch (c.accessory) {
    case 'glasses':
      ctx.strokeStyle = '#4a2a1a';
      ctx.lineWidth = 3;
      ellipse(ctx, hx + 8, hy - 4, 11, 11);
      ctx.stroke();
      ellipse(ctx, hx + 30, hy - 2, 10, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx + 19, hy - 4);
      ctx.lineTo(hx + 20, hy - 4);
      ctx.moveTo(hx - 3, hy - 6);
      ctx.lineTo(hx - 18, hy - 10);
      ctx.stroke();
      break;
    case 'headband': {
      ctx.fillStyle = '#e2453a';
      ctx.beginPath();
      ctx.ellipse(hx + 2, hy - 18, 33, 8, 0.12, Math.PI, 0);
      ctx.lineTo(hx + 34, hy - 12);
      ctx.ellipse(hx + 2, hy - 12, 33, 6, 0.12, 0, Math.PI, true);
      ctx.fill();
      const w = Math.sin(time * 10) * 4;
      ctx.beginPath();
      ctx.moveTo(hx - 28, hy - 16);
      ctx.lineTo(hx - 46, hy - 10 + w);
      ctx.lineTo(hx - 44, hy - 2 + w);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bandana':
      ctx.fillStyle = '#e2553f';
      ctx.beginPath();
      ctx.moveTo(hx - 16, hy + 22);
      ctx.lineTo(hx + 30, hy + 26);
      ctx.lineTo(hx + 8, hy + 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ellipse(ctx, hx + 8, hy + 30, 2, 2);
      ctx.fill();
      break;
    case 'cap':
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(hx + 2, hy - 14, 28, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff8f00';
      ellipse(ctx, hx + 30, hy - 16, 18, 5, 0.1);
      ctx.fill();
      ctx.stroke();
      break;
    case 'scarf': {
      ctx.fillStyle = '#f06292';
      ctx.beginPath();
      ctx.ellipse(hx + 2, hy + 28, 28, 9, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const w = Math.sin(time * 8) * 5;
      ctx.beginPath();
      ctx.moveTo(hx - 20, hy + 28);
      ctx.quadraticCurveTo(hx - 44, hy + 34 + w, hx - 52, hy + 48 + w);
      ctx.lineTo(hx - 38, hy + 46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'bow':
      ctx.fillStyle = '#ff4f8b';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + 22, hy - 34);
        ctx.lineTo(hx + 22 + s * 14, hy - 44);
        ctx.lineTo(hx + 22 + s * 14, hy - 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ellipse(ctx, hx + 22, hy - 34, 4, 4);
      ctx.fill();
      break;
    case 'goggles':
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(hx - 30, hy - 26, 62, 7);
      for (const dx of [2, 22]) {
        const g = ctx.createRadialGradient(hx + dx - 2, hy - 26, 1, hx + dx, hy - 24, 9);
        g.addColorStop(0, '#e1f5fe');
        g.addColorStop(1, '#4fc3f7');
        ctx.fillStyle = g;
        ellipse(ctx, hx + dx, hy - 24, 9, 8);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'beanie':
      ctx.fillStyle = '#5c6bc0';
      ctx.beginPath();
      ctx.arc(hx, hy - 10, 32, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8eaf6';
      ellipse(ctx, hx, hy - 44, 8, 8);
      ctx.fill();
      ctx.stroke();
      break;
    case 'crown':
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 28);
      ctx.lineTo(hx - 14, hy - 44);
      ctx.lineTo(hx - 6, hy - 36);
      ctx.lineTo(hx + 2, hy - 48);
      ctx.lineTo(hx + 10, hy - 36);
      ctx.lineTo(hx + 18, hy - 44);
      ctx.lineTo(hx + 18, hy - 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
  }
}

function eyesOf(ctx: Ctx, mood: Look['eyes'], hx: number, hy: number) {
  const pairs: [number, number, number][] = [
    [hx + 8, hy - 4, 1],
    [hx + 30, hy - 2, 0.86],
  ];
  ctx.lineCap = 'round';
  for (const [x, y, s] of pairs) {
    if (mood === 'ko') {
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, y - 5 * s);
      ctx.lineTo(x + 5 * s, y + 5 * s);
      ctx.moveTo(x + 5 * s, y - 5 * s);
      ctx.lineTo(x - 5 * s, y + 5 * s);
      ctx.stroke();
      continue;
    }
    if (mood === 'hurt' || mood === 'happy') {
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (mood === 'hurt') {
        ctx.moveTo(x - 5 * s, y - 4 * s);
        ctx.lineTo(x + 4 * s, y);
        ctx.lineTo(x - 5 * s, y + 4 * s);
      } else {
        ctx.arc(x, y + 2, 5 * s, Math.PI * 1.1, Math.PI * 1.9);
      }
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#1d1420';
    ellipse(ctx, x, y, 6.5 * s, 8 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ellipse(ctx, x - 2 * s, y - 3 * s, 2.6 * s, 2.8 * s);
    ctx.fill();
    ellipse(ctx, x + 2 * s, y + 3 * s, 1.2 * s, 1.2 * s);
    ctx.fill();
    if (mood === 'angry') {
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, y - 13 * s);
      ctx.lineTo(x + 6 * s, y - 9 * s);
      ctx.stroke();
    }
  }
}

/** 햄스터 한 마리 (발 위치가 기준점) */
export function drawHamster(ctx: Ctx, c: CharDef, opts: { x: number; y: number; facing: number; size: number; beast: boolean; look: Look; time: number; flash?: boolean; ko?: number }) {
  const { x, y, facing, size, beast, look: L, time } = opts;
  const fur = c.fur;
  const neckUp = beast && c.dino === 'brachio' ? 34 : 0;
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, x, FLOOR + 3, 44 * size * Math.max(0.45, 1 - (FLOOR - y) / 320), 8 * Math.min(1.4, size));
  ctx.fill();

  ctx.translate(x, y - L.lift);
  ctx.scale(facing * size, size);
  if (opts.ko !== undefined) ctx.rotate(-Math.min(1, opts.ko * 2.5) * (Math.PI / 2));
  ctx.rotate(L.lean);
  if (L.spin) {
    ctx.translate(0, -55);
    ctx.scale(Math.cos(L.spin), 1);
    ctx.translate(0, 55);
  }
  ctx.scale(1, L.squash);

  if (L.glow) {
    const g = ctx.createRadialGradient(0, -60, 10, 0, -60, 110);
    g.addColorStop(0, L.glow + 'aa');
    g.addColorStop(1, L.glow + '00');
    ctx.fillStyle = g;
    ellipse(ctx, 0, -60, 110, 110);
    ctx.fill();
  }
  if (beast) {
    // 변신 중 기운 (부드럽게 일렁임)
    const r = 78 + Math.sin(time * 9) * 5;
    const ag = ctx.createRadialGradient(0, -62, 30, 0, -62, r);
    ag.addColorStop(0, c.accent + '00');
    ag.addColorStop(0.7, c.accent + '33');
    ag.addColorStop(1, c.accent + '00');
    ctx.fillStyle = ag;
    ellipse(ctx, 0, -62, r, r * 1.05);
    ctx.fill();
  }

  const line = fur.line;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (beast) backFeatures(ctx, c.dino, c, time);
  // 꼬리 혹은 작은 엉덩이 털
  if (!beast) {
    ctx.fillStyle = fur.back;
    ellipse(ctx, -40, -28, 7, 6);
    ctx.fill();
  }
  const headX = 6;
  const headY = -88 - neckUp;
  if (beast && c.dino === 'tricera') frill(ctx, c, headX, headY);
  // 프테라 날개(앞쪽은 팔에)
  // 뒷발
  const footFill = '#ffb4b4';
  ctx.fillStyle = footFill;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ellipse(ctx, L.foot2[0], L.foot2[1], 12, 6);
  ctx.fill();
  ctx.stroke();
  // 뒷귀
  ctx.fillStyle = fur.back;
  ctx.lineWidth = 3;
  ellipse(ctx, headX - 18, headY - 26, 11, 11);
  ctx.fill();
  ctx.stroke();

  // 몸과 머리: 외곽선을 먼저 두껍게, 그 위에 채우기 → 하나로 이어진 몸
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ellipse(ctx, 0, -46, 42, 40);
  ctx.stroke();
  if (neckUp) {
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(4, -70);
    ctx.lineTo(headX, headY + 10);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ellipse(ctx, headX, headY, 34, 31);
  ctx.stroke();
  ctx.fillStyle = opts.flash ? '#ffffff' : furFill(ctx, 0, -46, 42, fur.back);
  ellipse(ctx, 0, -46, 42, 40);
  ctx.fill();
  if (neckUp) {
    ctx.strokeStyle = opts.flash ? '#fff' : fur.back;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(4, -70);
    ctx.lineTo(headX, headY + 10);
    ctx.stroke();
  }
  ctx.fillStyle = opts.flash ? '#ffffff' : furFill(ctx, headX, headY, 34, fur.back);
  ellipse(ctx, headX, headY, 34, 31);
  ctx.fill();

  if (!opts.flash) {
    // 배 털
    const bg = ctx.createRadialGradient(10, -46, 4, 10, -40, 34);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, fur.belly);
    ctx.fillStyle = bg;
    ellipse(ctx, 12, -40, 26, 28);
    ctx.fill();
    // 얼굴 아래 흰 털
    ctx.fillStyle = fur.belly;
    ellipse(ctx, headX + 16, headY + 10, 22, 15);
    ctx.fill();
    // 변신하면 비늘 무늬
    if (beast) {
      ctx.fillStyle = fur.scale;
      ctx.globalAlpha = 0.75;
      for (const [sx, sy, r] of [[-24, -62, 7], [-30, -44, 6], [-14, -76, 6], [-8, -112 - neckUp, 6], [-22, -100 - neckUp, 5], [-20, -28, 5]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, r, Math.PI, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (c.dino === 'meteor') {
        ctx.strokeStyle = '#ff6d2e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, -70);
        ctx.lineTo(-8, -54);
        ctx.lineTo(-18, -40);
        ctx.moveTo(-6, -104);
        ctx.lineTo(4, -96);
        ctx.stroke();
      }
    }
    if (beast) overBody(ctx, c.dino, c);
    // 머리 하이라이트 (입체감)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ellipse(ctx, headX - 12, headY - 16, 12, 7, -0.5);
    ctx.fill();
  }
  // 앞귀
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.fillStyle = fur.back;
  ellipse(ctx, headX + 18, headY - 28, 11, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffa8b8';
  ellipse(ctx, headX + 18, headY - 28, 6, 6);
  ctx.fill();
  ellipse(ctx, headX - 18, headY - 26, 5, 5);
  ctx.fill();

  if (beast) headFeatures(ctx, c.dino, c, headX, headY, time);
  // 볼 터치
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  ellipse(ctx, headX + 22, headY + 10, 7, 4.5);
  ctx.fill();
  ellipse(ctx, headX - 4, headY + 10, 5, 3.5);
  ctx.fill();
  eyesOf(ctx, L.eyes, headX, headY);
  // 코와 입
  ctx.fillStyle = '#ff8aa0';
  ellipse(ctx, headX + 32, headY + 6, 4, 3);
  ctx.fill();
  if (!(beast && c.dino === 'trex')) {
    ctx.strokeStyle = '#5a2a20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headX + 27, headY + 11, 3, 0, Math.PI);
    ctx.arc(headX + 33, headY + 11, 3, 0, Math.PI);
    ctx.stroke();
  }
  accessory(ctx, c, headX, headY, time);

  // 앞발 (팔을 뻗으면 털 색 팔을 그린다)
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  const arm = (px: number, py: number, back: boolean) => {
    if (L.reachArm && !back) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(14, -60);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.strokeStyle = fur.back;
      ctx.lineWidth = 12;
      ctx.stroke();
    }
    // 프테라는 앞발에 날개막
    if (beast && c.dino === 'ptera' && !back) {
      ctx.fillStyle = shade(c.fur.feature, 30);
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, -66);
      ctx.lineTo(px + 6, py - 4);
      ctx.lineTo(px - 18, py + 34);
      ctx.lineTo(-10, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#ffc4c4';
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ellipse(ctx, px, py, 9, 8);
    ctx.fill();
    ctx.stroke();
    if (beast && (c.dino === 'raptor' || c.dino === 'trex' || c.dino === 'meteor')) {
      ctx.fillStyle = '#fff6dc';
      for (const d of [-4, 2]) {
        ctx.beginPath();
        ctx.moveTo(px + 6, py + d);
        ctx.lineTo(px + 15, py + d + 3);
        ctx.lineTo(px + 6, py + d + 4);
        ctx.fill();
        ctx.stroke();
      }
    }
  };
  arm(L.paw2[0], L.paw2[1], true);
  // 앞발 발
  ctx.fillStyle = footFill;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ellipse(ctx, L.foot[0], L.foot[1], 13, 6.5);
  ctx.fill();
  ctx.stroke();
  if (beast && c.dino === 'raptor') {
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.moveTo(L.foot[0] + 4, L.foot[1] - 4);
    ctx.quadraticCurveTo(L.foot[0] + 16, L.foot[1] - 16, L.foot[0] + 18, L.foot[1] - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  arm(L.paw[0], L.paw[1], false);
  ctx.restore();
}

// ---------- 투사체 ----------
function drawShot(ctx: Ctx, p: Projectile, g: DinoFight, time: number) {
  const owner = g.fighters[p.owner];
  const dir = Math.sign(p.vx) || 1;
  ctx.save();
  ctx.translate(p.x, p.y);
  switch (p.kind) {
    case 'seed':
      ctx.rotate(time * 18);
      ctx.fillStyle = '#2b2b2b';
      ellipse(ctx, 0, 0, 12, 7);
      ctx.fill();
      ctx.strokeStyle = '#f5f5f5';
      ctx.lineWidth = 2;
      for (const yy of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(-9, yy);
        ctx.lineTo(9, yy);
        ctx.stroke();
      }
      break;
    case 'plate':
      ctx.rotate(time * 14);
      ctx.fillStyle = owner.char.fur.feature;
      ctx.strokeStyle = owner.char.fur.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(14, 4);
      ctx.lineTo(0, 14);
      ctx.lineTo(-14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'wind':
      ctx.strokeStyle = 'rgba(179,157,219,0.9)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-dir * i * 12, 0, 16 - i * 3, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.2 : Math.PI + 1.2);
        ctx.stroke();
      }
      break;
    case 'water': {
      const gr = ctx.createRadialGradient(-4, -4, 2, 0, 0, 18);
      gr.addColorStop(0, '#e1f5fe');
      gr.addColorStop(1, '#039be5');
      ctx.fillStyle = gr;
      ellipse(ctx, 0, 0, 18, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(79,195,247,0.7)';
      for (let i = 1; i <= 3; i++) {
        ellipse(ctx, -dir * i * 14, Math.sin(time * 20 + i) * 4, 6 - i, 5 - i);
        ctx.fill();
      }
      break;
    }
    case 'wave': {
      const col = owner.char.accent;
      const gr = ctx.createRadialGradient(0, 0, 6, 0, 0, p.r + 18);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.35, col);
      gr.addColorStop(1, col + '00');
      ctx.fillStyle = gr;
      ellipse(ctx, 0, 0, p.r + 18, p.r);
      ctx.fill();
      break;
    }
    case 'shock':
      ctx.fillStyle = 'rgba(140,100,60,0.9)';
      for (let i = 0; i < 4; i++) {
        const xx = -dir * i * 14;
        ctx.beginPath();
        ctx.moveTo(xx - 10, 14);
        ctx.lineTo(xx, -14 + i * 5 + Math.sin(time * 30 + i) * 3);
        ctx.lineTo(xx + 10, 14);
        ctx.fill();
      }
      break;
    case 'meteor': {
      ctx.rotate(Math.atan2(p.vy, p.vx));
      const tail = ctx.createLinearGradient(-80, 0, 0, 0);
      tail.addColorStop(0, 'rgba(255,109,46,0)');
      tail.addColorStop(1, 'rgba(255,170,60,0.9)');
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(-80, 0);
      ctx.lineTo(0, -18);
      ctx.lineTo(0, 18);
      ctx.fill();
      const gr = ctx.createRadialGradient(-4, -6, 2, 0, 0, 22);
      gr.addColorStop(0, '#ffd54a');
      gr.addColorStop(0.6, '#5d4037');
      gr.addColorStop(1, '#3e2723');
      ctx.fillStyle = gr;
      ellipse(ctx, 0, 0, 20, 18);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ---------- 배경 ----------
function sky(ctx: Ctx, stops: string[]) {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, FLOOR);
}

function ground(ctx: Ctx, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, FLOOR, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, FLOOR, W, H - FLOOR);
}

function hills(ctx: Ctx, color: string, base: number, amp: number, seed: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - Math.sin(x / 140 + seed) * amp - Math.sin(x / 57 + seed * 2) * amp * 0.3);
  ctx.lineTo(W, FLOOR);
  ctx.fill();
}

export function drawStage(ctx: Ctx, id: StageId, time: number) {
  switch (id) {
    case 'jungle':
      sky(ctx, ['#7fd1c7', '#c9f0d9']);
      hills(ctx, '#5aa469', 300, 30, 1);
      hills(ctx, '#3f8a4f', 360, 24, 2);
      for (let i = 0; i < 6; i++) {
        const x = i * 180 + 40;
        ctx.fillStyle = '#6d4c2e';
        ctx.fillRect(x, 220, 16, FLOOR - 220);
        ctx.fillStyle = '#2e7d32';
        for (let k = 0; k < 5; k++) {
          ellipse(ctx, x + 8 + Math.cos(k * 1.3) * 34, 220 + Math.sin(k * 1.3) * 12 + Math.sin(time + k) * 2, 40, 12, k * 0.6);
          ctx.fill();
        }
      }
      ground(ctx, '#7cb342', '#4e7a2a');
      break;
    case 'plains':
      sky(ctx, ['#8ecdf7', '#e3f4ff']);
      ctx.fillStyle = '#ffffffcc';
      for (let i = 0; i < 3; i++) {
        const x = ((time * 10 + i * 340) % (W + 200)) - 100;
        ellipse(ctx, x, 80 + i * 40, 70, 18);
        ctx.fill();
      }
      hills(ctx, '#a5d6a7', 330, 26, 3);
      hills(ctx, '#81c784', 380, 18, 4);
      ctx.fillStyle = '#fff59d';
      for (let i = 0; i < 30; i++) {
        ellipse(ctx, (i * 97) % W, 400 + ((i * 37) % 60), 3, 3);
        ctx.fill();
      }
      ground(ctx, '#9ccc65', '#689f38');
      break;
    case 'canyon':
      sky(ctx, ['#ffb47a', '#ffe0b2']);
      ctx.fillStyle = '#d0784a';
      ctx.beginPath();
      ctx.moveTo(0, FLOOR);
      ctx.lineTo(0, 180);
      ctx.lineTo(160, 200);
      ctx.lineTo(220, 300);
      ctx.lineTo(260, FLOOR);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W, FLOOR);
      ctx.lineTo(W, 160);
      ctx.lineTo(780, 190);
      ctx.lineTo(720, 320);
      ctx.lineTo(690, FLOOR);
      ctx.fill();
      ctx.fillStyle = '#b5603a';
      for (const [x, y] of [[40, 240], [820, 230], [110, 330], [760, 350]]) ctx.fillRect(x, y, 70, 6);
      ground(ctx, '#e0a26b', '#b97a47');
      break;
    case 'beach': {
      sky(ctx, ['#4fc3f7', '#b3e5fc']);
      ctx.fillStyle = '#fff59d';
      ellipse(ctx, 820, 90, 40, 40);
      ctx.fill();
      ctx.fillStyle = '#29b6f6';
      ctx.fillRect(0, 330, W, 70);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const x = ((time * 30 + i * 140) % (W + 100)) - 50;
        ctx.beginPath();
        ctx.arc(x, 360 + (i % 3) * 14, 18, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillStyle = '#fbe9a7';
      ctx.fillRect(0, 395, W, FLOOR - 395);
      ground(ctx, '#f5d98b', '#e0bb63');
      break;
    }
    case 'volcano':
      sky(ctx, ['#4a1c1c', '#a8442d', '#f08a4b']);
      ctx.fillStyle = '#3a1a14';
      ctx.beginPath();
      ctx.moveTo(250, FLOOR);
      ctx.lineTo(430, 170);
      ctx.lineTo(530, 170);
      ctx.lineTo(720, FLOOR);
      ctx.fill();
      ctx.fillStyle = '#ff6d2e';
      ellipse(ctx, 480, 172, 50, 10);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const t = (time * 0.6 + i * 0.37) % 1;
        ctx.fillStyle = `rgba(255,${120 + i * 8},40,${1 - t})`;
        ellipse(ctx, 480 + Math.sin(i * 7) * 60 * t, 170 - t * 140, 4, 4);
        ctx.fill();
      }
      ground(ctx, '#5d3a2e', '#2e1c16');
      break;
    case 'snow':
      sky(ctx, ['#90a4ae', '#eceff1']);
      hills(ctx, '#cfd8dc', 300, 50, 5);
      hills(ctx, '#ffffff', 370, 20, 6);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const y = (time * 40 + i * 53) % FLOOR;
        ellipse(ctx, (i * 131 + Math.sin(time + i) * 20) % W, y, 2.5, 2.5);
        ctx.fill();
      }
      ground(ctx, '#f5f9fb', '#cfdde5');
      break;
    case 'city':
      sky(ctx, ['#283593', '#5c6bc0', '#ffab91']);
      for (let i = 0; i < 12; i++) {
        const x = i * 84;
        const h = 120 + ((i * 53) % 140);
        ctx.fillStyle = '#1a237e';
        ctx.fillRect(x, FLOOR - h - 40, 70, h + 40);
        ctx.fillStyle = '#ffe082';
        for (let wy = FLOOR - h - 20; wy < FLOOR - 50; wy += 22) for (let wx = x + 8; wx < x + 62; wx += 18) if ((wx * wy) % 7 < 3) ctx.fillRect(wx, wy, 8, 10);
      }
      ground(ctx, '#546e7a', '#37474f');
      break;
    case 'crater': {
      sky(ctx, ['#0b0618', '#2a1248', '#5b2a5e']);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 70; i++) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i));
        ctx.fillRect((i * 173) % W, (i * 89) % 300, 2, 2);
      }
      ctx.globalAlpha = 1;
      // 떨어지는 별똥별
      const t = (time * 0.4) % 1;
      ctx.strokeStyle = `rgba(255,200,120,${1 - t})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100 + t * 500, 40 + t * 150);
      ctx.lineTo(40 + t * 500, 10 + t * 150);
      ctx.stroke();
      const planet = ctx.createRadialGradient(720, 120, 10, 740, 140, 80);
      planet.addColorStop(0, '#ffb74d');
      planet.addColorStop(1, '#6d2a1a');
      ctx.fillStyle = planet;
      ellipse(ctx, 740, 140, 70, 70);
      ctx.fill();
      ctx.fillStyle = '#2a1c2e';
      ctx.beginPath();
      ctx.moveTo(0, FLOOR);
      ctx.quadraticCurveTo(480, 340, W, FLOOR);
      ctx.fill();
      ground(ctx, '#3b2a40', '#1c1220');
      ctx.strokeStyle = 'rgba(255,109,46,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(300, FLOOR + 20);
      ctx.lineTo(360, FLOOR + 40);
      ctx.lineTo(420, FLOOR + 26);
      ctx.moveTo(600, FLOOR + 30);
      ctx.lineTo(660, FLOOR + 50);
      ctx.stroke();
      break;
    }
  }
}

function hud(ctx: Ctx, g: DinoFight) {
  const barW = 360;
  for (const f of g.fighters) {
    const left = f.id === 0;
    const x = left ? 30 : W - 30 - barW;
    // 체력
    ctx.fillStyle = 'rgba(20,10,30,0.6)';
    ctx.beginPath();
    ctx.roundRect(x - 4, 20, barW + 8, 26, 8);
    ctx.fill();
    const hp = Math.max(0, f.hp) / f.maxHp;
    const grad = ctx.createLinearGradient(0, 23, 0, 43);
    const base = hp > 0.5 ? '#5ee07a' : hp > 0.25 ? '#ffd24d' : '#ff5c5c';
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, base);
    grad.addColorStop(1, base);
    ctx.fillStyle = grad;
    const w = barW * hp;
    ctx.beginPath();
    ctx.roundRect(left ? x : x + barW - w, 23, Math.max(0, w), 20, 6);
    ctx.fill();
    // 변신 게이지
    const gw = barW * 0.62;
    const gx = left ? x : x + barW - gw;
    ctx.fillStyle = 'rgba(20,10,30,0.55)';
    ctx.beginPath();
    ctx.roundRect(gx - 2, 50, gw + 4, 14, 6);
    ctx.fill();
    const m = f.gauge / GAUGE_MAX;
    const full = m >= 1 && !f.beast;
    ctx.fillStyle = f.beast ? f.char.accent : full ? (Math.floor(g.phaseTime * 8) % 2 ? '#ffe066' : '#ffffff') : '#ffa94d';
    ctx.beginPath();
    ctx.roundRect(left ? gx : gx + gw * (1 - m), 52, Math.max(0, gw * m), 10, 4);
    ctx.fill();
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.fillStyle = '#fff';
    const label = f.beast ? `🦖 ${f.char.dinoName}` : full ? '변신 가능! 펀치+킥' : '변신 게이지';
    ctx.fillText(label, left ? gx + gw + 10 : gx - 10, 62);
    // 이름
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(f.char.name, left ? x : x + barW, 88);
    ctx.fillText(f.char.name, left ? x : x + barW, 88);
    if (g.winsNeeded > 1) {
      for (let i = 0; i < g.winsNeeded; i++) {
        ctx.fillStyle = i < f.wins ? '#ffd24d' : 'rgba(0,0,0,0.35)';
        ellipse(ctx, left ? x + barW - 10 - i * 22 : x + 10 + i * 22, 82, 7, 7);
        ctx.fill();
      }
    }
    // 콤보
    if (f.combo >= 2) {
      ctx.font = '900 30px system-ui, sans-serif';
      ctx.textAlign = left ? 'left' : 'right';
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = '#3b1f00';
      ctx.lineWidth = 5;
      const tx = left ? 30 : W - 30;
      ctx.strokeText(`${f.combo} HIT!`, tx, 150);
      ctx.fillText(`${f.combo} HIT!`, tx, 150);
    }
  }
  ctx.fillStyle = 'rgba(20,10,30,0.6)';
  ctx.beginPath();
  ctx.roundRect(W / 2 - 36, 12, 72, 50, 10);
  ctx.fill();
  ctx.fillStyle = g.timer < 10 ? '#ff7b7b' : '#fff';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(Math.min(g.roundTime, g.timer))), W / 2, 50);

  if (g.callout) {
    const f = g.fighters[g.callout.id];
    const a = Math.min(1, (1.2 - g.callout.t) * 3);
    ctx.globalAlpha = a;
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1a0f2b';
    ctx.fillStyle = f.char.accent;
    const y = f.y - 150 * g.size(f) - g.callout.t * 20;
    ctx.strokeText(g.callout.text, f.x, y);
    ctx.fillText(g.callout.text, f.x, y);
    ctx.globalAlpha = 1;
  }
  if (g.banner) {
    const big = g.banner === 'K.O.!' || g.banner === '싸워라!';
    ctx.font = `900 ${big ? 90 : 54}px system-ui, sans-serif`;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2b1a12';
    ctx.strokeText(g.banner, W / 2, H / 2 - 40);
    const gr = ctx.createLinearGradient(0, H / 2 - 110, 0, H / 2 - 30);
    gr.addColorStop(0, '#fff6b0');
    gr.addColorStop(1, g.banner === 'K.O.!' ? '#ff4d4d' : '#ffb300');
    ctx.fillStyle = gr;
    ctx.fillText(g.banner, W / 2, H / 2 - 40);
  }
}

export function fighterLook(g: DinoFight, f: Fighter, time: number) {
  return lookOf(g, f, time);
}

/** 화면 밖(카드 그림 등)에서 쓰는 기본 자세 */
export function fighterLookStatic(time: number, eyes: Look['eyes'] = 'normal'): Look {
  return { lean: 0.04, squash: 1 + Math.sin(time * 5) * 0.025, lift: 0, paw: [30, -60 + Math.sin(time * 5) * 2], paw2: [14, -54], foot: [18, -3], foot2: [-12, -3], eyes, spin: 0, reachArm: false };
}

export function renderFight(ctx: Ctx, g: DinoFight, time: number, stage: StageId) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  drawStage(ctx, stage, time);
  if (g.superFlash > 0) {
    ctx.fillStyle = `rgba(10,0,20,${Math.min(0.6, g.superFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }
  const order = [...g.fighters].sort((a, b) => Number(DinoFight.isAttack(a.action)) - Number(DinoFight.isAttack(b.action)));
  for (const f of order) {
    drawHamster(ctx, f.char, {
      x: f.x,
      y: f.y,
      facing: f.facing,
      size: g.size(f),
      beast: f.beast || (f.action === 'transform' && f.t > 0.35),
      look: lookOf(g, f, time),
      time,
      flash: (f.action === 'hit' && f.t < 0.07) || (f.action === 'transform' && Math.floor(f.t * 20) % 2 === 0 && f.t < 0.35),
      ko: f.action === 'ko' ? f.t : undefined,
    });
  }
  for (const p of g.projectiles) drawShot(ctx, p, g, time);
  for (const s of g.sparks) {
    const k = s.t / 0.5;
    if (s.kind === 'transform') {
      ctx.strokeStyle = `rgba(255,240,150,${1 - k})`;
      ctx.lineWidth = 6;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * 40 * k, s.y + Math.sin(a) * 40 * k);
        ctx.lineTo(s.x + Math.cos(a) * 160 * k, s.y + Math.sin(a) * 160 * k);
        ctx.stroke();
      }
      continue;
    }
    const r = (s.kind === 'big' ? 50 : s.kind === 'block' ? 24 : s.kind === 'counter' ? 60 : 34) * (0.4 + k);
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = s.kind === 'block' ? '#bfe9ff' : s.kind === 'counter' ? '#ffffff' : '#fff3b0';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  hud(ctx, g);
}

/** 선택 화면 등에서 쓰는 한 마리 그림 */
export function drawPortrait(ctx: Ctx, c: CharDef, beast: boolean, time: number, locked = false) {
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const k = ctx.canvas.width / 200;
  ctx.scale(k, k);
  ctx.translate(100, 186);
  ctx.translate(-100, -FLOOR);
  if (locked) ctx.filter = 'brightness(0) opacity(0.85)';
  const look: Look = { lean: 0, squash: 1 + Math.sin(time * 4) * 0.02, lift: 0, paw: [28, -60], paw2: [12, -52], foot: [18, -3], foot2: [-12, -3], eyes: beast ? 'angry' : 'normal', spin: 0, reachArm: false };
  drawHamster(ctx, c, { x: 100, y: FLOOR, facing: 1, size: beast && c.dino === 'brachio' ? 0.95 : 1.05, beast, look, time });
  ctx.restore();
}

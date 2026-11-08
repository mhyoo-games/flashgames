// 햄스터 다이노 파이트 그리기
// 햄스터는 둥근 몸·큰 머리·반짝이는 눈. 그라데이션 음영·외곽선·하이라이트로 입체감을 낸다.
// 변신하면 공룡 특징(뿔·프릴·등판·꼬리·날개·돛…)이 돋아난다.
import type { CharDef, Dino } from './chars.ts';
import { DinoFight, FLOOR, GAUGE_MAX, H, TRANSFORM_BURST, W, type Fighter, type Projectile } from './engine.ts';
import { basePose, blinking, easeOutBack, livePose, type Eyes, type Mouth, type Pose } from './pose.ts';
import type { StageId } from './chars.ts';

type Ctx = CanvasRenderingContext2D;

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

export interface HamsterOpts {
  x: number;
  y: number;
  facing: number;
  size: number;
  beast: boolean;
  pose: Pose;
  time: number;
  /** 하얗게 번쩍 (0~1) */
  flash?: number;
  /** 쓰러지는 진행 */
  ko?: number;
  /** 공룡 특징이 돋아난 정도 (0~1, 넘치면 살짝 커짐) */
  grow?: number;
  seed?: number;
  /** 그림자 생략 */
  noShadow?: boolean;
}

/** 두 마디 팔다리: 시작점에서 목표까지, 관절을 bend 쪽으로 굽힌다. 멀면 조금 늘어난다 */
function limb(ax: number, ay: number, tx: number, ty: number, l1: number, l2: number, bend: number, stretch: number) {
  let dx = tx - ax;
  let dy = ty - ay;
  let d = Math.hypot(dx, dy) || 0.001;
  const s = Math.min(stretch, Math.max(1, d / (l1 + l2)));
  const L1 = l1 * s;
  const L2 = l2 * s;
  if (d > L1 + L2) {
    dx *= (L1 + L2) / d;
    dy *= (L1 + L2) / d;
    d = L1 + L2;
  }
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  return { ex: ax + Math.cos(a + bend * b) * L1, ey: ay + Math.sin(a + bend * b) * L1, hx: ax + dx, hy: ay + dy };
}

/** 털 색 관절 (외곽선 → 채우기 → 윗면 밝게) */
function tube(ctx: Ctx, pts: [number, number][], w: number, fill: string, line: string) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = line;
  ctx.lineWidth = w + 5;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = w * 0.35;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] - 1, pts[0][1] - w * 0.2);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] - 1, pts[i][1] - w * 0.2);
  ctx.stroke();
}

function paw(ctx: Ctx, x: number, y: number, ang: number, fist: boolean, line: string, claws: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 10);
  g.addColorStop(0, '#ffe3e3');
  g.addColorStop(1, '#f7a9b0');
  ctx.fillStyle = g;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ellipse(ctx, 0, 0, fist ? 9 : 8, fist ? 8.5 : 7);
  ctx.fill();
  ctx.stroke();
  // 손가락 (주먹이면 접힌 금, 펴면 짧은 손가락)
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (fist) {
    ctx.moveTo(4, -5);
    ctx.lineTo(6, 0);
    ctx.moveTo(2, 1);
    ctx.lineTo(6, 4);
  } else {
    for (const a of [-0.6, 0, 0.6]) {
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
    }
  }
  ctx.stroke();
  if (claws) {
    ctx.fillStyle = '#fff6dc';
    ctx.lineWidth = 1.8;
    for (const d of [-4, 2]) {
      ctx.beginPath();
      ctx.moveTo(7, d);
      ctx.lineTo(16, d + 2);
      ctx.lineTo(7, d + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function footShape(ctx: Ctx, x: number, y: number, ang: number, line: string, back: boolean, talon: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = back ? '#e8939d' : '#ffb4bc';
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(5, -3, 14, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, 3, -6, 7, 2);
  ctx.fill();
  // 발가락
  ctx.fillStyle = back ? '#d97f8a' : '#f497a3';
  for (const dx of [12, 16]) {
    ellipse(ctx, dx, -4, 2.2, 2.2);
    ctx.fill();
  }
  if (talon) {
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.quadraticCurveTo(16, -22, 22, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function eyesOf(ctx: Ctx, mood: Eyes, hx: number, hy: number, glowColor?: string) {
  const pairs: [number, number, number][] = [
    [hx + 8, hy - 4, 1],
    [hx + 30, hy - 2, 0.86],
  ];
  ctx.lineCap = 'round';
  for (const [x, y, s] of pairs) {
    ctx.strokeStyle = '#2b1a12';
    ctx.lineWidth = 3;
    if (mood === 'ko') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, y - 5 * s);
      ctx.lineTo(x + 5 * s, y + 5 * s);
      ctx.moveTo(x + 5 * s, y - 5 * s);
      ctx.lineTo(x - 5 * s, y + 5 * s);
      ctx.stroke();
      continue;
    }
    if (mood === 'hurt' || mood === 'happy' || mood === 'closed') {
      ctx.beginPath();
      if (mood === 'hurt') {
        ctx.moveTo(x - 5 * s, y - 5 * s);
        ctx.lineTo(x + 4 * s, y);
        ctx.lineTo(x - 5 * s, y + 5 * s);
      } else if (mood === 'happy') ctx.arc(x, y + 3, 6 * s, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(x, y - 2, 6 * s, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    const narrow = mood === 'focus' || mood === 'angry' ? 0.82 : 1;
    if (glowColor) {
      ctx.fillStyle = glowColor + '66';
      ellipse(ctx, x, y, 11 * s, 12 * s * narrow);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(x - 2 * s, y - 3 * s, 1, x, y, 9 * s);
    g.addColorStop(0, '#5a3a4a');
    g.addColorStop(1, '#140c18');
    ctx.fillStyle = g;
    ellipse(ctx, x + 1 * s, y, 7 * s, 8.6 * s * narrow);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ellipse(ctx, x - 1.5 * s, y - 3.4 * s * narrow, 2.8 * s, 3 * s * narrow);
    ctx.fill();
    ellipse(ctx, x + 3 * s, y + 3 * s * narrow, 1.3 * s, 1.3 * s);
    ctx.fill();
    if (mood === 'angry' || mood === 'focus') {
      // 눈썹 (안쪽이 내려간 화난 눈썹)
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, y - 13 * s);
      ctx.lineTo(x + 7 * s, y - (mood === 'angry' ? 8 : 10) * s);
      ctx.stroke();
    }
  }
}

function mouthOf(ctx: Ctx, m: Mouth, hx: number, hy: number, beast: boolean, dino: Dino) {
  const x = hx + 30;
  const y = hy + 12;
  ctx.strokeStyle = '#5a2a20';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  switch (m) {
    case 'smile':
      if (beast && dino === 'trex') return;
      ctx.beginPath();
      ctx.arc(x - 3, y - 1, 3, 0, Math.PI);
      ctx.arc(x + 3, y - 1, 3, 0, Math.PI);
      ctx.stroke();
      break;
    case 'grit':
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 1, 12, 5, 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 1.5);
      ctx.lineTo(x + 6, y + 1.5);
      ctx.stroke();
      break;
    case 'open':
    case 'o':
    case 'roar': {
      const r = m === 'roar' ? 8 : m === 'open' ? 5 : 3.5;
      ctx.fillStyle = '#7a1f2b';
      ellipse(ctx, x, y + r * 0.5, r * (m === 'o' ? 0.9 : 1.1), r);
      ctx.fill();
      ctx.stroke();
      if (m !== 'o') {
        ctx.fillStyle = '#ff8fa3';
        ellipse(ctx, x, y + r * 1.0, r * 0.6, r * 0.4);
        ctx.fill();
        // 햄스터 앞니
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 3, y - r * 0.5, 6, Math.max(3, r * 0.45));
      }
      break;
    }
  }
}

/** 공룡 특징을 기준점에서 커지게 그리기 */
function grown(ctx: Ctx, grow: number, ax: number, ay: number, draw: () => void) {
  if (grow <= 0.01) return;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.scale(grow, grow);
  ctx.translate(-ax, -ay);
  draw();
  ctx.restore();
}

/** 햄스터 한 마리 (발 위치가 기준점) */
export function drawHamster(ctx: Ctx, c: CharDef, opts: HamsterOpts) {
  const flash = opts.flash ?? 0;
  if (flash > 0.01) {
    // 따로 그린 뒤 하얗게 덮어 붙인다 (모양 그대로 번쩍)
    const off = offscreen();
    if (off) {
      const o = off.getContext('2d')!;
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, off.width, off.height);
      if (!opts.noShadow) shadow(ctx, opts);
      drawHamsterRaw(o, c, { ...opts, x: OFF_X, y: OFF_Y, noShadow: true });
      o.globalCompositeOperation = 'source-atop';
      o.fillStyle = `rgba(255,255,255,${Math.min(1, flash)})`;
      o.fillRect(0, 0, off.width, off.height);
      o.globalCompositeOperation = 'source-over';
      ctx.drawImage(off, opts.x - OFF_X, opts.y - OFF_Y);
      return;
    }
  }
  drawHamsterRaw(ctx, c, opts);
}

const OFF_W = 640;
const OFF_H = 560;
const OFF_X = 320;
const OFF_Y = 440;
let offCanvas: HTMLCanvasElement | null | undefined;
function offscreen() {
  if (offCanvas === undefined) {
    offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (offCanvas) {
      offCanvas.width = OFF_W;
      offCanvas.height = OFF_H;
    }
  }
  return offCanvas;
}

function shadow(ctx: Ctx, o: HamsterOpts) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, o.x, FLOOR + 3, 46 * o.size * Math.max(0.45, 1 - (FLOOR - o.y) / 320), 8 * Math.min(1.4, o.size));
  ctx.fill();
}

function drawHamsterRaw(ctx: Ctx, c: CharDef, opts: HamsterOpts) {
  const { x, y, facing, size, beast, pose: P, time } = opts;
  const grow = beast ? (opts.grow ?? 1) : 0;
  const fur = c.fur;
  const line = fur.line;
  const seed = opts.seed ?? 0;
  ctx.save();
  if (!opts.noShadow) shadow(ctx, opts);

  ctx.translate(x, y - P.lift * size);
  ctx.scale(facing * size, size);
  if (opts.ko !== undefined) {
    ctx.translate(0, -20);
    ctx.rotate(-Math.min(1, opts.ko * 2.5) * (Math.PI / 2));
    ctx.translate(0, 20);
  }
  if (P.shake) ctx.translate(Math.sin(time * 71 + seed) * P.shake, Math.cos(time * 53) * P.shake * 0.4);
  if (P.spin) {
    ctx.translate(0, -55);
    ctx.scale(Math.cos(P.spin), 1);
    ctx.translate(0, 55);
  }

  // 빛 (기술 준비·초필살)
  if (P.glow) {
    const g = ctx.createRadialGradient(0, -60, 10, 0, -60, 110);
    g.addColorStop(0, P.glow + '99');
    g.addColorStop(1, P.glow + '00');
    ctx.fillStyle = g;
    ellipse(ctx, 0, -60, 110, 110);
    ctx.fill();
  }
  if (beast) beastAura(ctx, c, time, grow);

  // ----- 뼈대 위치 -----
  const sq = P.sq;
  const neckUp = c.dino === 'brachio' ? 34 * Math.min(1, grow) : 0;
  const bodyCY = -6 - 42 * sq;
  const bodyRX = 40 * (1 + (1 - sq) * 0.55);
  const bodyRY = 40 * sq;
  const tilt = P.tilt;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  // 몸통 좌표 → 바깥 좌표 (엉덩이 근처를 축으로 기울임)
  const tf = (px: number, py: number): [number, number] => {
    const rx = px;
    const ry = py + 14;
    return [P.bx + rx * cos - ry * sin, -14 + rx * sin + ry * cos];
  };
  const head = tf(8 + P.hx, bodyCY - 44 * (0.55 + 0.45 * sq) + P.hy - neckUp);
  const headRot = tilt * 0.55 + P.ht;
  const fShoulder = tf(16, bodyCY - 12 * sq);
  const bShoulder = tf(-6, bodyCY - 16 * sq);
  const fHip = tf(12, bodyCY + 24 * sq);
  const bHip = tf(-12, bodyCY + 24 * sq);

  const backFur = shade(fur.back, -28);
  // ----- 뒤쪽 다리·팔 -----
  const bl = limb(bHip[0], bHip[1], P.bfx, P.bfy - 3, 17, 17, -1, 1.9);
  tube(ctx, [bHip, [bl.ex, bl.ey], [bl.hx, bl.hy]], 13, backFur, line);
  footShape(ctx, bl.hx, bl.hy, P.bfy < -6 ? Math.atan2(bl.hy - bl.ey, bl.hx - bl.ex) - Math.PI / 2 : 0, line, true, false);
  const ba = limb(bShoulder[0], bShoulder[1], P.bhx, P.bhy, 19, 19, 1, 1.5);
  tube(ctx, [bShoulder, [ba.ex, ba.ey], [ba.hx, ba.hy]], 12, backFur, line);
  paw(ctx, ba.hx, ba.hy, Math.atan2(ba.hy - ba.ey, ba.hx - ba.ex), P.fist, line, false);

  // ----- 몸통 (기울인 좌표에서) -----
  ctx.save();
  ctx.translate(P.bx, -14);
  ctx.rotate(tilt);
  ctx.translate(0, 14);
  if (beast) grown(ctx, grow, -24, bodyCY, () => {
      ctx.translate(0, bodyCY + 46);
      backFeatures(ctx, c.dino, c, time);
    });
  // 작은 꼬리
  if (!beast || grow < 0.5) {
    ctx.fillStyle = shade(fur.back, -10);
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.5;
    ellipse(ctx, -bodyRX + 2, bodyCY + 18 * sq, 7, 5.5, Math.sin(time * 6) * 0.3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ellipse(ctx, 0, bodyCY, bodyRX, bodyRY);
  ctx.stroke();
  if (neckUp) {
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(4, bodyCY - 22);
    ctx.lineTo(8, bodyCY - 44 - neckUp + 10);
    ctx.stroke();
  }
  ctx.fillStyle = furFill(ctx, 0, bodyCY, Math.max(bodyRX, bodyRY), fur.back);
  ellipse(ctx, 0, bodyCY, bodyRX, bodyRY);
  ctx.fill();
  if (neckUp) {
    ctx.strokeStyle = fur.back;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(4, bodyCY - 22);
    ctx.lineTo(8, bodyCY - 44 - neckUp + 10);
    ctx.stroke();
  }
  // 배 털 (흰 털이 아래로 넓게)
  const bg = ctx.createRadialGradient(14, bodyCY + 4, 4, 12, bodyCY + 8, bodyRY);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(1, fur.belly);
  ctx.fillStyle = bg;
  ellipse(ctx, 13, bodyCY + 6 * sq, bodyRX * 0.66, bodyRY * 0.76);
  ctx.fill();
  // 털 결 (몸 옆 짧은 선)
  ctx.strokeStyle = shade(fur.back, -40);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const [sx, sy] of [[-26, -8], [-30, 8], [-22, 20]]) {
    ctx.moveTo(sx, bodyCY + sy * sq);
    ctx.lineTo(sx - 5, bodyCY + sy * sq + 3);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (beast && grow > 0.05) {
    // 공룡 비늘 무늬
    ctx.fillStyle = fur.scale;
    ctx.globalAlpha = 0.75 * Math.min(1, grow);
    for (const [sx, sy, r] of [[-24, -14, 7], [-30, 4, 6], [-14, -28, 6], [-20, 20, 5]]) {
      ctx.beginPath();
      ctx.arc(sx, bodyCY + sy * sq, r, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (c.dino === 'meteor') {
      ctx.strokeStyle = '#ff6d2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, bodyCY - 22);
      ctx.lineTo(-8, bodyCY - 6);
      ctx.lineTo(-18, bodyCY + 8);
      ctx.stroke();
    }
    grown(ctx, grow, -10, bodyCY, () => {
      ctx.translate(0, bodyCY + 46);
      overBody(ctx, c.dino, c);
    });
  }
  ctx.restore();

  // ----- 앞다리 -----
  const fl = limb(fHip[0], fHip[1], P.ffx, P.ffy - 3, 17, 17, -1, 1.9);
  tube(ctx, [fHip, [fl.ex, fl.ey], [fl.hx, fl.hy]], 14, fur.back, line);
  footShape(ctx, fl.hx, fl.hy, P.ffy < -6 ? Math.atan2(fl.hy - fl.ey, fl.hx - fl.ex) - Math.PI / 2 : 0, line, false, beast && grow > 0.5 && c.dino === 'raptor');

  // ----- 머리 -----
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(headRot);
  const hx = 0;
  const hy = 0;
  // 귀 (움직임에 따라 젖혀짐)
  const ear = (ex: number, ey: number, back: boolean) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(-0.5 * P.ear + (back ? -0.2 : 0.15));
    ctx.fillStyle = back ? backFur : fur.back;
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, -6, 11, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffa8b8';
    ellipse(ctx, 1, -6, 6, 7);
    ctx.fill();
    ctx.restore();
  };
  ear(-16, -22, true);
  if (beast && c.dino === 'tricera') grown(ctx, grow, hx - 10, hy, () => frill(ctx, c, hx, hy));
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ellipse(ctx, 0, 0, 34, 31);
  ctx.stroke();
  // 볼 주머니 (햄스터답게 볼록)
  ctx.lineWidth = 5;
  ellipse(ctx, 20, 12, 18, 14);
  ctx.stroke();
  ctx.fillStyle = furFill(ctx, 0, 0, 34, fur.back);
  ellipse(ctx, 0, 0, 34, 31);
  ctx.fill();
  const cheek = ctx.createRadialGradient(22, 8, 2, 20, 12, 18);
  cheek.addColorStop(0, '#ffffff');
  cheek.addColorStop(1, fur.belly);
  ctx.fillStyle = cheek;
  ellipse(ctx, 20, 12, 18, 14);
  ctx.fill();
  // 이마 줄무늬
  ctx.fillStyle = shade(fur.back, -22);
  ctx.globalAlpha = 0.5;
  ellipse(ctx, -2, -20, 6, 10, 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
  // 머리 윤기
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ellipse(ctx, -12, -16, 12, 7, -0.5);
  ctx.fill();
  ear(16, -26, false);
  if (beast) grown(ctx, grow, hx + 6, hy - 10, () => headFeatures(ctx, c.dino, c, hx, hy, time));
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,150,0.45)';
  ellipse(ctx, 24, 12, 7, 4.5);
  ctx.fill();
  ellipse(ctx, -4, 10, 5, 3.5);
  ctx.fill();
  const eyes: Eyes = (P.eyes === 'normal' || P.eyes === 'angry' || P.eyes === 'focus') && blinking(time, seed + c.hp) ? 'closed' : P.eyes;
  eyesOf(ctx, eyes, hx, hy, beast && grow > 0.6 ? c.accent : undefined);
  // 코
  ctx.fillStyle = '#ff8aa0';
  ctx.strokeStyle = '#c4536a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(29, 3);
  ctx.lineTo(36, 3);
  ctx.lineTo(32.5, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  mouthOf(ctx, P.mouth, hx, hy, beast && grow > 0.5, c.dino);
  // 수염 (조금씩 떨림)
  ctx.strokeStyle = 'rgba(60,40,30,0.55)';
  ctx.lineWidth = 1.2;
  const wv = Math.sin(time * 9 + seed) * 1.5;
  ctx.beginPath();
  for (const [dy, len] of [[-2, 20], [3, 22], [8, 18]]) {
    ctx.moveTo(34, 6 + dy * 0.3);
    ctx.quadraticCurveTo(44, 4 + dy + wv * 0.5, 34 + len, 2 + dy * 1.6 + wv);
  }
  ctx.stroke();
  accessory(ctx, c, hx, hy, time);
  ctx.restore();

  // ----- 앞팔 (몸 앞) -----
  const fa = limb(fShoulder[0], fShoulder[1], P.fhx, P.fhy, 19, 19, 1, 1.6);
  if (beast && grow > 0.05 && c.dino === 'ptera') {
    // 앞발에 날개막
    grown(ctx, grow, fShoulder[0], fShoulder[1], () => {
      ctx.fillStyle = shade(c.fur.feature, 30);
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fShoulder[0], fShoulder[1]);
      ctx.lineTo(fa.ex, fa.ey);
      ctx.lineTo(fa.hx + 6, fa.hy - 4);
      ctx.quadraticCurveTo(fa.hx - 20, fa.hy + 40, fShoulder[0] - 22, fShoulder[1] + 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  tube(ctx, [fShoulder, [fa.ex, fa.ey], [fa.hx, fa.hy]], 13, fur.back, line);
  paw(ctx, fa.hx, fa.hy, Math.atan2(fa.hy - fa.ey, fa.hx - fa.ex), P.fist, line, beast && grow > 0.5 && (c.dino === 'raptor' || c.dino === 'trex' || c.dino === 'meteor'));
  ctx.restore();
}

/** 변신 중 기운: 몸 주위로 피어오르는 불꽃 조각 */
function beastAura(ctx: Ctx, c: CharDef, time: number, grow: number) {
  const k = Math.min(1, grow);
  const r = 80 + Math.sin(time * 9) * 5;
  const ag = ctx.createRadialGradient(0, -62, 30, 0, -62, r);
  ag.addColorStop(0, c.accent + '00');
  ag.addColorStop(0.7, c.accent + '30');
  ag.addColorStop(1, c.accent + '00');
  ctx.fillStyle = ag;
  ctx.globalAlpha = k;
  ellipse(ctx, 0, -62, r, r * 1.05);
  ctx.fill();
  ctx.fillStyle = c.accent;
  for (let i = 0; i < 7; i++) {
    const u = (time * 0.9 + i / 7) % 1;
    const px = Math.sin(i * 2.3 + time * 2) * 40;
    ctx.globalAlpha = k * (1 - u) * 0.7;
    ellipse(ctx, px, -10 - u * 130, 4 * (1 - u) + 1.5, 7 * (1 - u) + 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** 기 모으기 연출: 발밑에서 솟는 불꽃과 빨려 드는 빛 알갱이 */
function chargeAura(ctx: Ctx, x: number, y: number, size: number, color: string, time: number, level: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  // 바닥 빛 고리
  ctx.strokeStyle = color + 'aa';
  ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const u = (time * 1.6 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - u;
    ellipse(ctx, 0, 0, 30 + u * 50, 6 + u * 9);
    ctx.stroke();
  }
  // 불꽃 기둥
  for (let i = 0; i < 9; i++) {
    const u = (time * 2.2 + i / 9) % 1;
    const px = Math.sin(i * 1.9) * 42 * (1 - u * 0.5);
    const g = ctx.createRadialGradient(px, -u * 140, 1, px, -u * 140, 16);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, color);
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g;
    ctx.globalAlpha = (1 - u) * (0.5 + level * 0.5);
    ellipse(ctx, px, -u * 140, 12 * (1 - u) + 4, 20 * (1 - u) + 6);
    ctx.fill();
  }
  // 빨려 드는 알갱이
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 10; i++) {
    const u = (time * 1.3 + i / 10) % 1;
    const a = i * 2.4 + time;
    const rr = (1 - u) * 110;
    ctx.globalAlpha = u;
    ellipse(ctx, Math.cos(a) * rr, -60 + Math.sin(a) * rr * 0.8, 2.5, 2.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 변신 연출 (몸 뒤): 모이는 빛 → 기둥 → 터짐 */
function transformBack(ctx: Ctx, f: Fighter, size: number, time: number) {
  const t = f.t;
  const col = f.char.accent;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(size, size);
  if (t < TRANSFORM_BURST) {
    const k = t / TRANSFORM_BURST;
    // 빛 기둥
    const pg = ctx.createLinearGradient(-50, 0, 50, 0);
    pg.addColorStop(0, col + '00');
    pg.addColorStop(0.5, col + 'cc');
    pg.addColorStop(1, col + '00');
    ctx.fillStyle = pg;
    ctx.globalAlpha = k;
    ctx.fillRect(-50 * (0.4 + k), -400, 100 * (0.4 + k), 410);
    // 소용돌이치며 모이는 빛
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) {
      const u = (k * 1.5 + i / 16) % 1;
      const a = i * 0.9 + time * 6;
      const rr = (1 - u) * 150;
      ctx.globalAlpha = u;
      ellipse(ctx, Math.cos(a) * rr, -60 + Math.sin(a) * rr, 3, 3);
      ctx.fill();
    }
  } else {
    const k = (t - TRANSFORM_BURST) / (1 - TRANSFORM_BURST);
    // 퍼지는 충격 고리 두 겹
    for (const [d, w] of [[0, 10], [0.15, 5]]) {
      const u = Math.max(0, k - d);
      ctx.strokeStyle = col;
      ctx.globalAlpha = Math.max(0, 1 - u * 1.4);
      ctx.lineWidth = w * (1 - u);
      ellipse(ctx, 0, -60, 30 + u * 220, 30 + u * 200);
      ctx.stroke();
    }
    // 바닥 먼지
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (const s of [-1, 1]) {
      ctx.globalAlpha = Math.max(0, 1 - k * 1.5);
      ellipse(ctx, s * (30 + k * 120), -6, 20 * (1 - k * 0.5), 8);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 변신 연출 (몸 앞): 터지며 튀는 비늘 조각 */
function transformFront(ctx: Ctx, f: Fighter, size: number) {
  const t = f.t;
  if (t < TRANSFORM_BURST) return;
  const k = (t - TRANSFORM_BURST) / (1 - TRANSFORM_BURST);
  ctx.save();
  ctx.translate(f.x, f.y - 60 * size);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const d = k * (120 + (i % 3) * 40) * size;
    ctx.save();
    ctx.translate(Math.cos(a) * d, Math.sin(a) * d * 0.8 + k * k * 60);
    ctx.rotate(a + k * 8);
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = i % 2 ? f.char.fur.scale : f.char.fur.feature;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(0, -8);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
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
    const label = f.beast ? `🦖 ${f.char.dinoName}` : full ? '변신 가능! 기 버튼' : f.action === 'charge' ? '기 모으는 중…' : '기 게이지';
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

export function fighterPose(g: DinoFight, f: Fighter, time: number) {
  return livePose(g, f, time);
}

/** 화면 밖(카드 그림 등)에서 쓰는 기본 자세 */
export function idlePose(time: number, eyes: Eyes = 'normal', seed = 0): Pose {
  const p = basePose(time, seed);
  p.eyes = eyes;
  if (eyes === 'angry') p.mouth = 'grit';
  return p;
}

/** 변신해서 공룡 특징이 돋아난 정도 */
function growOf(f: Fighter) {
  if (f.action !== 'transform') return 1;
  if (f.t < TRANSFORM_BURST) return 0;
  return easeOutBack((f.t - TRANSFORM_BURST) / 0.3);
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
    const size = g.size(f);
    const tr = f.action === 'transform';
    if (tr) transformBack(ctx, f, size, time);
    if (f.action === 'charge') chargeAura(ctx, f.x, f.y, size, f.char.accent, time, f.gauge / GAUGE_MAX);
    // 변신 직전엔 점점 하얗게 빛나다가 터지는 순간 가장 밝다
    let flash = f.action === 'hit' && f.t < 0.08 ? 0.85 : 0;
    if (tr) flash = f.t < TRANSFORM_BURST ? Math.pow(f.t / TRANSFORM_BURST, 1.6) * 0.9 : Math.max(0, 1 - (f.t - TRANSFORM_BURST) / 0.18);
    if (f.action === 'charge') flash = 0.12 + 0.1 * Math.sin(time * 18);
    drawHamster(ctx, f.char, {
      x: f.x,
      y: f.y,
      facing: f.facing,
      size,
      beast: f.beast,
      grow: growOf(f),
      pose: livePose(g, f, time),
      time,
      flash,
      seed: f.id * 7,
      ko: f.action === 'ko' ? f.t : undefined,
    });
    if (tr) transformFront(ctx, f, size);
  }
  // 변신이 터지는 순간 화면 번쩍
  for (const f of g.fighters) {
    if (f.action === 'transform' && f.t >= TRANSFORM_BURST && f.t < TRANSFORM_BURST + 0.15) {
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - (f.t - TRANSFORM_BURST) / 0.15)})`;
      ctx.fillRect(0, 0, W, H);
    }
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
  const pose = idlePose(time, beast ? 'angry' : 'normal', c.hp);
  drawHamster(ctx, c, { x: 100, y: FLOOR, facing: 1, size: beast && c.dino === 'brachio' ? 0.95 : 1.05, beast, pose, time, seed: c.hp });
  ctx.restore();
}

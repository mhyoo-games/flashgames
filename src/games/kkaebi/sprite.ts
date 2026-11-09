// 깨비 도트 생성기: 몸 형태 + 부품을 40×40 칸에 칠하고, 외곽선·3단 명암·하이라이트를 넣는다.
// 같은 계열은 색과 부품이 같고, 진화할수록 커지며 뿔·가시·날개·무늬가 늘어난다.
import type { Species } from './species.ts';
import { TYPE_COLOR, type Type } from './types.ts';

export const SG = 48;

type RGB = [number, number, number];
const hex = (c: string): RGB => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hueShift([r, g, b]: RGB, deg: number): RGB {
  // 간단한 색상 회전 (YIQ)
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const i = 0.596 * r - 0.274 * g - 0.322 * b;
  const q = 0.211 * r - 0.523 * g + 0.312 * b;
  const i2 = i * c - q * s;
  const q2 = i * s + q * c;
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  return [cl(y + 0.956 * i2 + 0.621 * q2), cl(y - 0.272 * i2 - 0.647 * q2), cl(y - 1.106 * i2 + 1.703 * q2)];
}

/** 한 속성뿐일 때 장식 색 */
const ACCENT: Partial<Record<Type, string>> = { fire: '#ffd23a', water: '#bfefff', grass: '#ff9ac0', electric: '#ff7a2a', ice: '#ffffff', fight: '#ffe07a', normal: '#a07850', poison: '#e0f060', ground: '#8a5a2a', mind: '#7ad0ff', rock: '#7a6a50', ghost: '#ff6ad0', dragon: '#ffd23a', dark: '#e83a3a', steel: '#5a7ad8', light: '#ffe8a0', bug: '#e8503a', wind: '#ffffff' };

/** 색 번호: 1 몸, 2 배, 3 장식, 4 진한 장식, 5 눈 흰자, 6 눈동자, 7 볼, 8 입속, 9 흰 반짝 */
class Grid {
  c = new Uint8Array(SG * SG);
  flat = new Uint8Array(SG * SG);
  set(x: number, y: number, v: number, flat = false) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= SG || y >= SG) return;
    this.c[y * SG + x] = v;
    this.flat[y * SG + x] = flat ? 1 : 0;
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= SG || y >= SG) return 0;
    return this.c[y * SG + x];
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number, rot = 0) {
    const R = Math.max(rx, ry) + 1;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * cs + dy * sn) / (rx + 0.4);
        const w = (-dx * sn + dy * cs) / (ry + 0.4);
        if (u * u + w * w <= 1) this.set(x, y, v);
      }
  }
  poly(pts: [number, number][], v: number) {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) this.set(x, y, v);
    }
  }
  line(x1: number, y1: number, x2: number, y2: number, w: number, v: number) {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.ellipse(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, w / 2, v);
    }
  }
}

interface Feat {
  ear: 'none' | 'pointy' | 'round' | 'long';
  tail: 'none' | 'thin' | 'fluffy' | 'flame' | 'leaf' | 'bolt' | 'club';
  pattern: 'none' | 'stripes' | 'spots' | 'belly';
  horn: 'none' | 'one' | 'two' | 'antenna';
  hue: number;
  /** 몸 비율·모양 갈래 */
  wide: number;
  tall: number;
  variant: number;
}

function rnd(seed: number) {
  let s = seed * 2654435761 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
const pickOne = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

function featuresOf(sp: Species): Feat {
  const r = rnd(sp.seed);
  const t = sp.types;
  const has = (x: Type) => t.includes(x);
  return {
    ear: sp.body === 'fish' || sp.body === 'serpent' || sp.body === 'rock' || sp.body === 'bug' || sp.body === 'plant' ? 'none' : sp.body === 'dragon' || sp.body === 'bird' ? pickOne(r, ['pointy', 'none']) : pickOne(r, ['pointy', 'round', 'long', 'pointy', 'none']),
    tail: has('fire') ? 'flame' : has('grass') && sp.body !== 'plant' ? 'leaf' : has('electric') ? 'bolt' : has('rock') || has('steel') ? 'club' : pickOne(r, ['thin', 'fluffy', 'thin', 'none']),
    pattern: pickOne(r, ['none', 'stripes', 'spots', 'belly', 'belly']),
    horn: has('dragon') || has('rock') ? 'two' : has('bug') ? 'antenna' : pickOne(r, ['none', 'none', 'one', 'two']),
    hue: (r() - 0.5) * 50,
    wide: 0.86 + r() * 0.28,
    tall: 0.86 + r() * 0.28,
    variant: Math.floor(r() * 3),
  };
}

function palette(sp: Species, f: Feat, back: boolean) {
  const main = hueShift(hex(TYPE_COLOR[sp.types[0]]), f.hue);
  const second = sp.types[1] ? hex(TYPE_COLOR[sp.types[1]]) : mix(main, [255, 250, 230], 0.6);
  const belly = mix(main, [255, 248, 228], 0.72);
  const pal: Record<number, RGB> = {
    1: back ? mix(main, [0, 0, 0], 0.12) : main,
    2: belly,
    3: sp.types[1] ? second : ACCENT[sp.types[0]] ? hex(ACCENT[sp.types[0]]!) : hueShift(main, 150),
    4: mix(sp.types[1] ? second : main, [20, 10, 30], 0.45),
    5: [255, 255, 255],
    6: [28, 20, 40],
    7: [255, 140, 160],
    8: [150, 40, 60],
    9: [255, 255, 255],
  };
  return pal;
}

/** 깨비 한 마리를 칸에 칠하기 */
function paint(sp: Species, back: boolean, frame: number): Grid {
  const g = new Grid();
  const f = featuresOf(sp);
  const st = sp.stage;
  const s = sp.legend ? 1.12 : [0.62, 0.82, 1.0][st - 1];
  const fl = sp.body === 'ghost' || sp.body === 'fish' || (sp.body === 'bird' && frame) ? -2 - frame : 0;
  const bob = frame && sp.body !== 'bird' ? 0.5 : 0;
  // 디자인 좌표(가운데 0, 바닥 0, 위가 음수) → 칸
  const X = (x: number) => 24 + x * s;
  const Y = (y: number) => 46 + (y + fl) * s + bob;
  const E = (x: number, y: number, rx: number, ry: number, v: number, rot = 0) => g.ellipse(X(x), Y(y), rx * s, ry * s, v, rot);
  /** 몸통: 계열마다 넓이·키가 조금씩 다르다 */
  const B = (x: number, y: number, rx: number, ry: number, v: number) => g.ellipse(X(x), Y(y * f.tall), rx * s * f.wide, ry * s * f.tall, v);
  const P = (pts: [number, number][], v: number) => g.poly(pts.map(([x, y]) => [X(x), Y(y)]), v);
  const Ln = (x1: number, y1: number, x2: number, y2: number, w: number, v: number) => g.line(X(x1), Y(y1), X(x2), Y(y2), Math.max(1, w * s), v);
  const has = (x: Type) => sp.types.includes(x);
  const big = st >= 2;
  const final = st === 3;

  // 머리 위치 (눈·귀·뿔 기준)
  let head: [number, number, number] = [0, -24, 8]; // x, y, r
  let faceDir = -1; // 왼쪽을 본다

  // ---- 뒤쪽 부품 (날개·꼬리) ----
  const wings = sp.body === 'bird' || (sp.body === 'dragon' && (final || has('wind'))) || (sp.body === 'bug' && (has('wind') || final)) || (sp.legend && sp.body !== 'serpent');
  if (wings) {
    const up = frame ? -4 : 0;
    const wv = sp.body === 'bug' ? 3 : 1;
    const span = sp.body === 'bird' ? 16 : 13;
    P([[2, -20], [span, -30 + up], [span + 3, -18 + up], [6, -10]], wv);
    P([[-2, -20], [-span + 2, -29 + up], [-span, -17 + up], [-4, -11]], wv);
    if (final) {
      Ln(span - 2, -28 + up, span + 2, -19 + up, 1.2, 4);
    }
  }
  const tailBase: [number, number] = sp.body === 'quad' ? [13, -13] : sp.body === 'dragon' ? [9, -8] : [8, -7];
  if (sp.body !== 'fish' && sp.body !== 'serpent' && sp.body !== 'plant' && sp.body !== 'ghost' && sp.body !== 'rock') {
    const [tx, ty] = tailBase;
    const L = sp.body === 'dragon' ? 12 : 8 + st;
    switch (f.tail) {
      case 'thin':
        Ln(tx, ty, tx + L * 0.7, ty - L * 0.9, 2, 1);
        E(tx + L * 0.7, ty - L * 0.9, 1.6, 1.6, 3);
        break;
      case 'fluffy':
        E(tx + 4, ty - 6, 5 + st, 7 + st, 1, 0.5);
        E(tx + 5, ty - 10, 3, 3, 2);
        break;
      case 'flame':
        Ln(tx, ty, tx + 5, ty - 6, 2.5, 1);
        P([[tx + 2, ty - 6], [tx + 6, ty - 18 - st * 2], [tx + 10, ty - 6]], 3);
        P([[tx + 4, ty - 7], [tx + 6, ty - 13 - st], [tx + 8, ty - 7]], 9);
        break;
      case 'leaf':
        Ln(tx, ty, tx + 5, ty - 5, 2, 1);
        E(tx + 8, ty - 9, 3 + st, 5 + st, 3, -0.6);
        Ln(tx + 6, ty - 6, tx + 10, ty - 12, 0.8, 4);
        break;
      case 'bolt':
        P([[tx, ty], [tx + 6, ty - 6], [tx + 3, ty - 7], [tx + 9, ty - 15 - st], [tx + 6, ty - 8], [tx + 9, ty - 7], [tx + 2, ty - 1]], 1);
        break;
      case 'club':
        Ln(tx, ty, tx + L * 0.8, ty - 3, 2.5, 1);
        E(tx + L * 0.8 + 1, ty - 4, 3 + st * 0.7, 3 + st * 0.7, 3);
        break;
    }
    if (sp.body === 'dragon') {
      P([[tx - 2, ty - 4], [tx + 14, ty + 2], [tx + 18, ty - 2], [tx + 2, ty - 10]], 1);
      if (final) for (let i = 0; i < 3; i++) P([[tx + 2 + i * 5, ty - 8 + i * 2], [tx + 5 + i * 5, ty - 13 + i * 2], [tx + 7 + i * 5, ty - 6 + i * 2]], 3);
    }
  }

  // ---- 몸 ----
  switch (sp.body) {
    case 'blob': {
      if (f.variant === 1) {
        // 물방울 모양
        P([[-3, -22 * f.tall], [0, -30 * f.tall], [3, -22 * f.tall]], 1);
        B(0, -12, 11, 12.5, 1);
      } else B(0, -12, f.variant === 2 ? 15 : 13, f.variant === 2 ? 9.5 : 11.5, 1);
      E(-6, -1.5, 3.5, 2, 1);
      E(6, -1.5, 3.5, 2, 1);
      head = [0, -15 * f.tall, 10];
      if (f.pattern !== 'none' || big) B(1, -8, 8, 5.5, 2);
      break;
    }
    case 'quad': {
      for (const lx of [-9, -3, 6, 11]) {
        const back2 = lx === -3 || lx === 11;
        E(lx, -4, 2.6, 4.5, back2 ? 4 : 1);
        E(lx - 0.5, -0.8, 3, 1.6, back2 ? 4 : 1);
      }
      B(2, -12, 13, 8, 1);
      B(0, -9, 9, 4, 2);
      head = [-10, -20, 8];
      E(-10, -20, 8, 7.5, 1);
      E(-15.5, -17, 3.5, 3, 2);
      g.set(X(-18), Y(-18), 6, true);
      break;
    }
    case 'biped': {
      E(-5, -2.5, 3.8, 3.2, 1);
      E(5, -2.5, 3.8, 3.2, 1);
      B(0, -12, 9.5, 10, 1);
      B(0, -10, 6.5, 7, 2);
      const arm = frame ? 1 : 0;
      E(-10, -14 + arm, 3, 5.5, 1, 0.4);
      E(10, -14 - arm, 3, 5.5, 1, -0.4);
      head = [0, -26, 9];
      E(0, -26, 9.5, 8.8, 1);
      break;
    }
    case 'bird': {
      Ln(-3, -6, -4, 0, 1, 3);
      Ln(3, -6, 4, 0, 1, 3);
      P([[8, -10], [18, -6], [16, -2], [6, -6]], 3);
      B(1, -13, 10, 9.5, 1);
      B(-1, -11, 6, 6, 2);
      head = [-6, -24, 7];
      E(-6, -24, 7.5, 7, 1);
      P([[-12, -25], [-18 - st, -23], [-12, -21]], 3);
      break;
    }
    case 'fish': {
      P([[12, -14], [21, -22], [19, -14], [21, -6]], 3);
      E(0, -14, 15, 9, 1);
      E(-2, -10, 10, 4.5, 2);
      P([[-4, -22], [4, -29 - st], [8, -21]], 3);
      P([[-2, -8], [4, -3], [5, -9]], 3);
      head = [-8, -16, 6];
      break;
    }
    case 'serpent': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([12 - t * 18 + Math.sin(t * Math.PI * 2) * 6, -2 - t * 26]);
      }
      pts.forEach(([x, y], i) => E(x, y, 3.2 + i * 0.25, 3.2 + i * 0.25, 1));
      pts.forEach(([x, y], i) => i % 3 === 0 && E(x + 1, y + 1, 1.5 + i * 0.1, 1.2, 2));
      head = [pts[12][0] - 1, pts[12][1] - 2, 7];
      E(head[0], head[1], 7.5, 6, 1);
      E(head[0] - 5, head[1] + 2, 3.5, 2.5, 2);
      if (has('dragon') || has('water')) {
        Ln(head[0] - 7, head[1] + 2, head[0] - 13, head[1] + 6, 0.8, 3);
        Ln(head[0] - 7, head[1] + 3, head[0] - 12, head[1] + 9, 0.8, 3);
      }
      break;
    }
    case 'bug': {
      for (const [lx, d] of [[-6, -1], [-1, 0], [4, 1]] as [number, number][]) {
        Ln(lx, -9, lx - 3 + d * 2, -1, 1, 4);
        Ln(lx + 1, -9, lx + 4 + d * 2, -1, 1, 4);
      }
      E(7, -10, 8, 6.5, 1);
      for (let i = 0; i < 3; i++) Ln(3 + i * 3, -15, 3 + i * 3, -5, 0.8, 2);
      E(-1, -11, 5, 5, 1);
      head = [-8, -15, 6];
      E(-8, -15, 6, 5.8, 1);
      break;
    }
    case 'plant': {
      Ln(-4, -4, -7, 0, 1.5, 4);
      Ln(4, -4, 7, 0, 1.5, 4);
      const lc = has('grass') ? 3 : 4;
      if (f.variant === 1) {
        // 버섯 갓
        B(0, -9, 8, 8, 2);
        E(0, -19, 14, 7, 3);
        for (const [dx, dy] of [[-7, -21], [2, -24], [8, -19]] as [number, number][]) E(dx, dy, 1.6, 1.4, 9);
      } else if (f.variant === 2) {
        // 선인장
        B(0, -14, 8, 14, 1);
        E(-10, -16, 3, 6, 1);
        E(10, -20, 3, 6, 1);
        for (let i = 0; i < 4; i++) g.set(X(-4 + i * 3), Y(-22 + (i % 2) * 6), 9, true);
      } else {
        B(0, -11, 11, 10, 1);
        B(0, -8, 7, 5, 2);
        // 잎
        P([[-2, -20], [-12, -30 - st * 2], [-4, -24]], lc);
        P([[2, -20], [12, -31 - st * 2], [5, -23]], lc);
      }
      if (final) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          E(Math.cos(a) * 4, -27 + Math.sin(a) * 4, 3, 3, has('poison') ? 3 : 7);
        }
        E(0, -27, 2.2, 2.2, 9);
      } else if (big) E(0, -24, 3, 4, 7);
      head = f.variant === 1 ? [0, -10, 8] : f.variant === 2 ? [0, -18, 8] : [0, -13, 9];
      break;
    }
    case 'rock': {
      const k = final ? 1.15 : 1;
      P([[-12 * k, -4], [-14 * k, -14], [-8 * k, -24 * k], [4 * k, -26 * k], [13 * k, -16], [12 * k, -3], [0, 0]], 1);
      P([[-6, -6], [-9, -13], [3, -10], [8, -5]], 2);
      if (big) {
        E(-15, -11, 3.5, 4, 1);
        E(15, -11, 3.5, 4, 1);
      }
      Ln(2, -24, 5, -18, 0.8, 4);
      Ln(-10, -18, -7, -14, 0.8, 4);
      head = [-1, -16, 8];
      break;
    }
    case 'ghost': {
      const w = frame ? 1 : -1;
      if (f.variant === 1) {
        // 불꽃 머리 구슬
        P([[-7, -24], [-3, -36 - st * 2 + w], [0, -27], [3, -38 - st * 2 - w], [7, -24]], 3);
        B(0, -16, 11, 11, 1);
      } else {
        P([[-11, -16], [-9, -4], [-6, -7 + w], [-3, -2], [0, -6 - w], [3, -2], [6, -7 + w], [9, -3], [11, -16]], 1);
        B(0, -18, 11, 11, 1);
        if (f.variant === 2) P([[-12, -18], [0, -34 - st], [12, -18], [8, -22], [-8, -22]], 4);
      }
      E(-12, -14 + w, 2.5, 4, 1, 0.6);
      E(12, -14 - w, 2.5, 4, 1, -0.6);
      head = [0, -19, 10];
      break;
    }
    case 'dragon': {
      E(-5, -2.5, 4, 3.4, 1);
      E(5, -2.5, 4, 3.4, 1);
      E(1, -13, 10, 11, 1);
      E(-1, -11, 6, 8, 2);
      for (let i = 0; i < 4; i++) Ln(-5, -18 + i * 3, 3, -18 + i * 3, 0.6, 1);
      E(-10, -15, 2.8, 5, 1, 0.5);
      head = [-5, -27, 8];
      E(-5, -27, 8, 7.5, 1);
      E(-11, -25, 5, 3.5, 1);
      E(-12, -24, 3, 2, 2);
      break;
    }
  }

  const [hx, hy, hr] = head;
  // ---- 무늬 ----
  if (f.pattern === 'stripes' && big) for (let i = -1; i <= 1; i++) Ln(i * 4 + 2, -16 - hr * 0.2, i * 4 + 4, -10, 1, 4);
  if (f.pattern === 'spots' && big)
    for (const [sx, sy] of [[5, -14], [-3, -7], [8, -9]] as [number, number][]) if (g.get(Math.round(X(sx)), Math.round(Y(sy))) === 1) E(sx, sy, 1.6, 1.6, 3);

  // ---- 귀 ----
  if (!back || true) {
    const ex = hx;
    const ey = hy - hr * 0.7;
    switch (f.ear) {
      case 'pointy':
        P([[ex - hr * 0.9, ey + 2], [ex - hr * 0.9, ey - 7 - st], [ex - hr * 0.2, ey]], 1);
        P([[ex + hr * 0.9, ey + 2], [ex + hr * 0.7, ey - 7 - st], [ex + hr * 0.1, ey]], 1);
        P([[ex - hr * 0.75, ey + 1], [ex - hr * 0.75, ey - 4 - st], [ex - hr * 0.35, ey]], 7);
        break;
      case 'round':
        E(ex - hr * 0.8, ey - 1, 3.2, 3.2, 1);
        E(ex + hr * 0.8, ey - 1, 3.2, 3.2, 1);
        E(ex - hr * 0.8, ey - 1, 1.6, 1.6, 7);
        break;
      case 'long':
        E(ex - hr * 0.5, ey - 6 - st, 2.4, 7 + st, 1, -0.25);
        E(ex + hr * 0.6, ey - 6 - st, 2.4, 7 + st, 1, 0.3);
        E(ex - hr * 0.5, ey - 5 - st, 1, 5 + st, 7, -0.25);
        break;
    }
  }
  // ---- 뿔 ----
  const hornOn = f.horn !== 'none' && (st >= 2 || f.horn === 'antenna');
  if (hornOn) {
    const top = hy - hr;
    if (f.horn === 'antenna') {
      Ln(hx - 2, top + 1, hx - 6, top - 6 - st, 0.8, 4);
      Ln(hx + 2, top + 1, hx + 5, top - 6 - st, 0.8, 4);
      E(hx - 6, top - 6 - st, 1.3, 1.3, 3);
      E(hx + 5, top - 6 - st, 1.3, 1.3, 3);
    } else if (f.horn === 'one') P([[hx - 2, top + 2], [hx - 1, top - 6 - st * 2], [hx + 2, top + 2]], 3);
    else {
      P([[hx - 5, top + 3], [hx - 7, top - 4 - st * 2], [hx - 2, top + 1]], 3);
      P([[hx + 3, top + 2], [hx + 6, top - 4 - st * 2], [hx + 5, top + 3]], 3);
    }
  }
  // ---- 속성 장식 ----
  if (has('ice') && big) for (let i = 0; i < st; i++) P([[-6 + i * 6, -22 - i], [-4 + i * 6, -30 - i * 2], [-2 + i * 6, -22 - i]], 9);
  if (has('steel') && big) for (const [bx, by] of [[-6, -12], [6, -12]] as [number, number][]) E(bx, by, 1.4, 1.4, 4);
  if (has('mind') && !back) E(hx, hy - hr * 0.55, 1.8, 1.8, 3);
  if (has('light') && !back) {
    const sx = hx + hr + 2;
    const sy = hy - hr;
    Ln(sx - 2, sy, sx + 2, sy, 0.8, 9);
    Ln(sx, sy - 2, sx, sy + 2, 0.8, 9);
  }
  if (has('fight') && final) Ln(hx - hr, hy - hr * 0.45, hx + hr, hy - hr * 0.45, 1.2, 3);
  if (has('dark') && !back && final) Ln(hx - hr * 0.9, hy - 1, hx + hr * 0.6, hy - 1, 2, 4);

  // ---- 얼굴 ----
  if (!back) {
    const eyeR = st === 1 ? 2.4 : st === 2 ? 2 : 1.7;
    const sep = hr * 0.42;
    const ey = hy - hr * 0.05;
    const fierce = final && (has('dragon') || has('dark') || has('fight') || sp.base[1] > sp.base[3]);
    for (const k of [-1, 1]) {
      const ex = hx + k * sep + faceDir * hr * 0.15;
      const far = k === 1; // 3/4 시점: 먼 쪽 눈은 조금 작게
      const r = eyeR * (far ? 0.85 : 1) * s;
      for (let y = -Math.ceil(r + 1); y <= Math.ceil(r + 1); y++)
        for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
          if ((x * x) / (r * r + 0.3) + (y * y) / ((r * 1.25) ** 2 + 0.3) > 1) continue;
          const gx = X(ex) + x;
          const gy = Y(ey) + y;
          if (fierce && y < -r * 0.3) continue;
          g.set(gx, gy, 6, true);
        }
      g.set(X(ex) - Math.max(1, r * 0.45), Y(ey) - r * 0.5, 5, true);
      if (st === 1) g.set(X(ex) + r * 0.4, Y(ey) + r * 0.6, 5, true);
      if (fierce) g.line(X(ex) - r - 0.5, Y(ey) - r * 0.9 - (k === -1 ? 0.6 : 0), X(ex) + r + 0.5, Y(ey) - r * 0.9 - (k === 1 ? 0.6 : 0), 1, 4);
    }
    // 볼
    if (st < 3 && sp.body !== 'rock' && sp.body !== 'fish') {
      g.set(X(hx - sep - 2), Y(ey + 3), 7, true);
      g.set(X(hx + sep + 2), Y(ey + 3), 7, true);
    }
    // 입
    const my = ey + hr * 0.42;
    if (final && (has('dragon') || has('dark') || sp.base[1] > 100)) {
      g.line(X(hx - 2.5), Y(my), X(hx + 2), Y(my), 1, 8);
      g.set(X(hx - 1.5), Y(my) - 1, 5, true);
      g.set(X(hx + 1), Y(my) - 1, 5, true);
    } else {
      g.set(X(hx - 1), Y(my), 8, true);
      g.set(X(hx), Y(my) + 1, 8, true);
      g.set(X(hx + 1), Y(my), 8, true);
    }
  }
  return g;
}

/** 칠한 칸 → 캔버스 (외곽선 + 명암) */
function bake(g: Grid, pal: Record<number, RGB>, outline: RGB): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SG;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(SG, SG);
  const filled = (x: number, y: number) => g.get(x, y) !== 0;
  // 몸 전체 경계 상자 (명암 방향 계산용)
  let minY = SG;
  let maxY = 0;
  for (let i = 0; i < SG * SG; i++) if (g.c[i]) {
    minY = Math.min(minY, Math.floor(i / SG));
    maxY = Math.max(maxY, Math.floor(i / SG));
  }
  for (let y = 0; y < SG; y++)
    for (let x = 0; x < SG; x++) {
      const i = y * SG + x;
      const v = g.c[i];
      let col: RGB | null = null;
      if (v) {
        col = pal[v];
        if (!g.flat[i] && v <= 4) {
          const tl = !filled(x - 1, y) || !filled(x, y - 1) || g.get(x, y - 1) !== v;
          const br = !filled(x + 1, y) || !filled(x, y + 1) || g.get(x, y + 1) !== v;
          const low = (y - minY) / Math.max(1, maxY - minY);
          if (tl && !br) col = mix(col, [255, 255, 240], 0.35);
          else if (br) col = mix(col, [20, 10, 40], 0.32);
          else if (v === 1 && low > 0.62 && (x + y) % 2 === 0) col = mix(col, [20, 10, 40], 0.14);
        }
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) col = outline;
      if (!col) continue;
      img.data[i * 4] = col[0];
      img.data[i * 4 + 1] = col[1];
      img.data[i * 4 + 2] = col[2];
      img.data[i * 4 + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return cv;
}

const cache = new Map<string, HTMLCanvasElement>();
/** 깨비 그림 (back = 내 깨비 뒷모습) */
export function kkaebiSprite(sp: Species, back = false, frame = 0, shiny = false): HTMLCanvasElement {
  const key = `${sp.no}:${back}:${frame}:${shiny}`;
  let cv = cache.get(key);
  if (!cv) {
    const g = paint(sp, back, frame);
    const f = featuresOf(sp);
    const pal = palette(sp, shiny ? { ...f, hue: f.hue + 140 } : f, back);
    cv = bake(g, pal, mix(pal[1], [16, 8, 24], 0.82));
    if (back) {
      // 뒷모습은 좌우를 뒤집는다
      const b = document.createElement('canvas');
      b.width = b.height = SG;
      const c = b.getContext('2d')!;
      c.scale(-1, 1);
      c.drawImage(cv, -SG, 0);
      cv = b;
    }
    cache.set(key, cv);
  }
  return cv;
}

/** 그림자 실루엣 (도감에서 아직 못 본 깨비) */
export function silhouette(sp: Species): HTMLCanvasElement {
  const key = `sil:${sp.no}`;
  let cv = cache.get(key);
  if (!cv) {
    const src = kkaebiSprite(sp);
    cv = document.createElement('canvas');
    cv.width = cv.height = SG;
    const c = cv.getContext('2d')!;
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#3a3a52';
    c.fillRect(0, 0, SG, SG);
    cache.set(key, cv);
  }
  return cv;
}

export function drawKkaebi(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, cx: number, bottom: number, scale: number, flip = false) {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(cv, Math.round((-SG / 2) * scale), Math.round(-(SG - 1) * scale), SG * scale, SG * scale);
  ctx.restore();
}

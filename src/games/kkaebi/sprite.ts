// 깨비 도트 생성기 (2판): 64×64 칸.
// 1) 몸 형태 + 계열마다 정한 「대표 특징」(뿔·볏·갈기·날개·꼬리·등·얼굴·무늬·소품)을 색 번호로 칠하고
// 2) 부위마다 거리 지도를 만들어 왼쪽 위에서 빛이 오는 5단 명암, 색 외곽선, 부위 경계선을 넣는다.
// 단계가 오를수록 비율이 바뀌고(아기 → 어른), 특징이 늘고 커지며, 3단계는 장식색과 반짝임이 붙는다.
import type { Species } from './species.ts';
import { TYPE_COLOR, type Type } from './types.ts';
import { sigFor } from './sigs.ts';

export const SG = 64;

type RGB = [number, number, number];
const hex = (c: string): RGB => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hueShift([r, g, b]: RGB, deg: number): RGB {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const i = 0.596 * r - 0.274 * g - 0.322 * b;
  const q = 0.211 * r - 0.523 * g + 0.312 * b;
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  const i2 = i * c - q * s;
  const q2 = i * s + q * c;
  return [cl(y + 0.956 * i2 + 0.621 * q2), cl(y - 0.272 * i2 - 0.647 * q2), cl(y - 1.106 * i2 + 1.703 * q2)];
}
/** 명암 5단: 가장 어두움 → 가장 밝음 (어두울수록 푸르게, 밝을수록 노랗게) */
function ramp(c: RGB): RGB[] {
  const cool: RGB = [40, 30, 90];
  const warm: RGB = [255, 250, 220];
  return [mix(c, cool, 0.55), mix(c, cool, 0.3), c, mix(c, warm, 0.28), mix(c, warm, 0.6)];
}

// 색 번호: 1 몸 2 배 3 장식 4 진한장식 5 흰자 6 눈동자 7 볼·속귀 8 입속 9 반짝(흰) 10 홍채 11 소품(나무) 12 소품(금속·금) 13 불꽃밝음
const FLAT = new Set([5, 6, 7, 8, 9, 10, 17]);

class Grid {
  c = new Uint8Array(SG * SG);
  set(x: number, y: number, v: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SG && y < SG) this.c[y * SG + x] = v;
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= SG || y >= SG ? 0 : this.c[y * SG + x];
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number, rot = 0, only?: number) {
    const R = Math.max(rx, ry) + 1;
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * cs + dy * sn) / (rx + 0.45);
        const w = (-dx * sn + dy * cs) / (ry + 0.45);
        if (u * u + w * w <= 1 && (only === undefined || this.get(x, y) === only)) this.set(x, y, v);
      }
  }
  poly(pts: [number, number][], v: number, only?: number) {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x <= Math.round(xs[k + 1]); x++) if (only === undefined || this.get(x, y) === only) this.set(x, y, v);
    }
  }
  line(x1: number, y1: number, x2: number, y2: number, w: number, v: number, only?: number) {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.ellipse(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, w / 2, v, 0, only);
    }
  }
  /** 굽은 선 (꼬리·덩굴) */
  curve(pts: [number, number][], w0: number, w1: number, v: number) {
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // 2차 베지어 연쇄
      const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
      const lt = t * (pts.length - 1) - seg;
      const a = pts[seg];
      const b = pts[seg + 1];
      const x = a[0] + (b[0] - a[0]) * lt;
      const y = a[1] + (b[1] - a[1]) * lt;
      const w = w0 + (w1 - w0) * t;
      this.ellipse(x, y, w / 2, w / 2, v);
    }
  }
}

// ---------------- 대표 특징 ----------------
export interface Sig {
  ear?: 'pointy' | 'round' | 'long' | 'fin' | 'none';
  horn?: 'oni' | 'goat' | 'antler' | 'unicorn' | 'twin' | 'crown' | 'none';
  crest?: 'fin' | 'flame' | 'leaf' | 'feather' | 'crystal' | 'spikes' | 'cloud';
  mane?: 'fur' | 'flame' | 'leaf' | 'feather' | 'cloud' | 'crystal';
  tail?: 'thin' | 'fluffy' | 'flame' | 'leaf' | 'bolt' | 'club' | 'fan' | 'whip' | 'scorpion' | 'fin' | 'none';
  back?: 'plates' | 'spikes' | 'shell' | 'sail' | 'fwing' | 'bwing' | 'iwing' | 'vines' | 'flowers' | 'crystals' | 'jets' | 'cloud';
  face?: 'whisker' | 'tusk' | 'fang' | 'mask' | 'beard' | 'beak';
  arm?: 'claw' | 'blade' | 'fist' | 'fin';
  mark?: 'stripe' | 'spot' | 'rune' | 'star' | 'ring' | 'zig' | 'belly';
  acc?: 'club' | 'scarf' | 'bell' | 'beads' | 'band' | 'gem' | 'lantern' | 'hat';
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

/** 계열마다 정한 특징이 없으면 속성으로 정한다 */
function sigOf(sp: Species): Sig {
  const base = sigFor(sp.line, sp.legend ? 3 : sp.stage);
  const t = sp.types;
  const has = (x: Type) => t.includes(x);
  const out: Sig = { ...base };
  if (!out.tail) out.tail = has('fire') ? 'flame' : has('grass') ? 'leaf' : has('electric') ? 'bolt' : has('rock') || has('steel') ? 'club' : 'thin';
  if (!out.horn) out.horn = has('dragon') ? 'twin' : 'none';
  if (!out.ear) out.ear = sp.body === 'fish' || sp.body === 'serpent' || sp.body === 'rock' || sp.body === 'bug' || sp.body === 'plant' ? 'none' : 'pointy';
  return out;
}

/** 홍채: 속성에 따라 또렷한 색 */
const IRIS: Partial<Record<Type, string>> = { fire: '#e8a020', water: '#2a6ad8', grass: '#3a8a2a', electric: '#d87a10', ice: '#3aa8d8', fight: '#c83a2a', poison: '#a02ab8', ground: '#8a5a20', wind: '#3a9ac8', mind: '#c03ab0', bug: '#6a9a20', rock: '#7a5a3a', ghost: '#8a3ad8', dragon: '#d8a020', dark: '#d82a3a', steel: '#3a6ab8', light: '#d8a020', normal: '#6a4a2a' };
const irisOf = (sp: Species): RGB => hex(IRIS[sp.types[sp.types.length - 1]] ?? IRIS[sp.types[0]] ?? '#5a3a2a');
interface Pal {
  [k: number]: RGB;
}
function palette(sp: Species, hue: number, back: boolean): Pal {
  const main = hueShift(hex(TYPE_COLOR[sp.types[0]]), hue);
  const second = sp.types[1] ? hex(TYPE_COLOR[sp.types[1]]) : hex(ACCENT[sp.types[0]] ?? '#ffd23a');
  return {
    1: back ? mix(main, [0, 0, 0], 0.08) : main,
    2: mix(main, [255, 248, 228], 0.72),
    3: second,
    4: mix(second, [30, 10, 40], 0.42),
    5: [255, 255, 255],
    6: [24, 16, 36],
    7: [255, 140, 165],
    8: [150, 36, 60],
    9: [255, 255, 255],
    10: irisOf(sp),
    17: mix(irisOf(sp), [255, 255, 255], 0.38),
    16: mix(main, [40, 20, 70], 0.32),
    11: [150, 96, 50],
    12: [240, 196, 70],
    13: [255, 236, 150],
    15: mix(second, [255, 255, 255], 0.62),
    14: sp.types[0] === 'grass' ? mix(main, [215, 235, 70], 0.5) : [96, 176, 72],
  };
}
const ACCENT: Partial<Record<Type, string>> = { fire: '#ffd23a', water: '#bfefff', grass: '#ff9ac0', electric: '#ff7a2a', ice: '#ffffff', fight: '#ffe07a', normal: '#a07850', poison: '#e0f060', ground: '#8a5a2a', mind: '#7ad0ff', rock: '#7a6a50', ghost: '#ff6ad0', dragon: '#ffd23a', dark: '#e83a3a', steel: '#5a7ad8', light: '#ffe8a0', bug: '#e8503a', wind: '#ffffff' };

/** 칠하기 */
function paint(sp: Species, back: boolean, frame: number, fit = 1): Grid {
  const g = new Grid();
  const sig = sigOf(sp);
  const r = rnd(sp.seed);
  const st = sp.legend ? 3 : sp.stage;
  const final = st === 3;
  const big = st >= 2;
  const legend = !!sp.legend;
  // 단계별 비율: 아기는 머리가 크고 몸이 짧다
  const s = (legend ? 1.3 : [0.86, 1.06, 1.26][st - 1]) * fit;
  const headK = [1.28, 1.08, 0.96][st - 1];
  const bodyK = [0.86, 1.0, 1.12][st - 1];
  const breathe = frame === 1 ? 0.6 : 0;
  const fl = sp.body === 'ghost' || sp.body === 'fish' || sp.body === 'bird' ? -3 - (frame === 1 ? 1 : 0) : 0;
  const X = (x: number) => 32 + x * s;
  const Y = (y: number) => 62 + (y + fl) * s;
  const E = (x: number, y: number, rx: number, ry: number, v: number, rot = 0, only?: number) => g.ellipse(X(x), Y(y), rx * s, ry * s, v, rot, only);
  const P = (pts: [number, number][], v: number, only?: number) => g.poly(pts.map(([x, y]) => [X(x), Y(y)]), v, only);
  const Ln = (x1: number, y1: number, x2: number, y2: number, w: number, v: number, only?: number) => g.line(X(x1), Y(y1), X(x2), Y(y2), Math.max(1, w * s), v, only);
  const Cv = (pts: [number, number][], w0: number, w1: number, v: number) => g.curve(pts.map(([x, y]) => [X(x), Y(y)]), w0 * s, w1 * s, v);
  const has = (x: Type) => sp.types.includes(x);
  const wide = 0.9 + r() * 0.2;
  const tall = (0.92 + r() * 0.16) * bodyK;
  const B = (x: number, y: number, rx: number, ry: number, v: number) => g.ellipse(X(x), Y(y * tall) - breathe * 0.5, rx * s * wide + breathe * 0.4, ry * s * tall + breathe * 0.5, v);

  // 몸통 기준점 (머리·어깨·꼬리 뿌리)
  let head: [number, number, number] = [0, -24, 8];
  let tailRoot: [number, number] = [8, -8];
  let neck: [number, number] = [0, -18];

  // ---------- 뒤에 그릴 것 1: 날개·등 ----------
  const up = frame === 1 ? -2 : 0;
  const backPart = () => {
    const k = st === 1 ? 0.55 : st === 2 ? 0.8 : 1.05;
    switch (sig.back) {
      case 'fwing': {
        // 깃털 날개: 겹겹이
        for (const side of [-1, 1]) {
          const span = 20 * k;
          for (let i = 0; i < (final ? 5 : 3); i++) {
            const a = -0.9 + i * 0.32;
            const len = span * (1 - i * 0.12);
            const bx = side * 5;
            const by = -20 * tall;
            P([[bx, by], [bx + side * Math.cos(a) * len, by + Math.sin(a) * len + up], [bx + side * Math.cos(a + 0.25) * len * 0.92, by + Math.sin(a + 0.25) * len * 0.92 + up]], i % 2 ? 3 : 1);
          }
          if (final) Ln(side * 5, -20 * tall, side * span * 0.8, -20 * tall - span * 0.62 + up, 1.4, 4);
        }
        break;
      }
      case 'bwing':
        for (const side of [-1, 1]) {
          const span = 20 * k;
          const tip: [number, number] = [side * span, -30 * tall + up];
          P([[side * 4, -22 * tall], tip, [side * span * 0.85, -14 * tall + up], [side * span * 0.55, -18 * tall + up], [side * span * 0.35, -12 * tall + up], [side * 5, -12 * tall]], 4);
          Ln(side * 4, -22 * tall, tip[0], tip[1], 1.3, 1);
          Ln(side * span * 0.6, -26 * tall + up, side * span * 0.55, -18 * tall + up, 0.8, 1);
        }
        break;
      case 'iwing':
        for (const side of [-1, 1]) {
          E(side * 11 * k, -24 * tall + up, 9 * k, 5 * k, 15, side * 0.5);
          E(side * 9 * k, -14 * tall + up, 7 * k, 3.6 * k, 15, side * -0.3);
          if (big) Ln(side * 4, -20 * tall, side * 18 * k, -27 * tall + up, 0.6, 3);
        }
        break;
      case 'plates':
        for (let i = 0; i < (final ? 5 : 3); i++) {
          const x = 8 - i * 4.5;
          const y = -24 * tall - Math.sin((i / 4) * Math.PI) * 4;
          P([[x - 2.6, y + 4], [x, y - 5 * k - (i === 2 ? 2 : 0)], [x + 2.6, y + 4]], i % 2 ? 4 : 3);
        }
        break;
      case 'spikes':
        for (let i = 0; i < (final ? 6 : 4); i++) {
          const x = 9 - i * 4;
          P([[x - 1.8, -22 * tall], [x + 0.5, -28 * tall - k * 2], [x + 1.8, -21 * tall]], 3);
        }
        break;
      case 'shell':
        E(3, -16 * tall, 13 * k + 3, 10 * k + 2, 4);
        E(3, -17 * tall, 11 * k + 2, 8.5 * k + 1.5, 3);
        for (const [dx, dy] of [[0, -3], [-5, 1], [6, 1]] as [number, number][]) E(3 + dx * k, -17 * tall + dy * k, 2.4 * k, 2 * k, 4);
        break;
      case 'sail':
        P([[-6, -20 * tall], [-2, -38 * tall * k], [6, -40 * tall * k], [11, -18 * tall]], 3);
        for (let i = 0; i < 4; i++) Ln(-4 + i * 4, -21 * tall, -1 + i * 3, -36 * tall * k, 0.8, 4);
        break;
      case 'vines':
        for (const side of [-1, 1]) Cv([[side * 6, -18], [side * 14, -26 + up], [side * 18 * k, -16]], 2, 1, 14);
        if (big) for (const side of [-1, 1]) E(side * 18 * k, -16, 3 * k, 2 * k, 3);
        break;
      case 'flowers':
        for (let i = 0; i < (final ? 4 : 2); i++) {
          const a = -2.4 + i * 0.6;
          const fx = Math.cos(a) * 14;
          const fy = -22 * tall + Math.sin(a) * 10;
          for (let p = 0; p < 5; p++) E(fx + Math.cos((p / 5) * 6.28) * 2.4 * k, fy + Math.sin((p / 5) * 6.28) * 2.4 * k, 2 * k, 2 * k, 7);
          E(fx, fy, 1.4 * k, 1.4 * k, 12);
        }
        break;
      case 'crystals':
        for (let i = 0; i < (final ? 5 : 3); i++) {
          const x = -8 + i * 4;
          const h = 8 + (i % 2) * 4;
          P([[x - 2, -20 * tall], [x, -20 * tall - h * k], [x + 2, -20 * tall]], i % 2 ? 9 : 3);
        }
        break;
      case 'jets':
        for (const side of [-1, 1]) {
          P([[side * 6, -20 * tall], [side * 16 * k, -30 * tall + up], [side * 10, -14 * tall]], 3);
          P([[side * 7, -19 * tall], [side * 13 * k, -26 * tall + up], [side * 9, -15 * tall]], 13);
        }
        break;
      case 'cloud':
        for (let i = 0; i < 4; i++) E(-10 + i * 7, -14 * tall + (i % 2) * -4, 5 * k + 1, 4 * k + 1, 2);
        break;
    }
  };

  // ---------- 뒤에 그릴 것 2: 꼬리 ----------
  const tailPart = () => {
    if (sp.body === 'fish' || sp.body === 'serpent' || sp.body === 'plant' || sp.body === 'ghost' || sp.body === 'rock' || sig.tail === 'none') return;
    const [tx, ty] = tailRoot;
    const L = (sp.body === 'dragon' ? 14 : 9) * (0.7 + st * 0.25);
    const sw = frame === 1 ? 1.2 : 0;
    switch (sig.tail) {
      case 'thin':
        Cv([[tx, ty], [tx + L * 0.6, ty - L * 0.3], [tx + L * 0.7 + sw, ty - L]], 2.4, 1.4, 1);
        E(tx + L * 0.7 + sw, ty - L, 2, 2, 3);
        break;
      case 'fluffy':
        E(tx + 5, ty - 7 - st, 5 + st * 1.6, 7 + st * 1.8, 1, 0.5);
        E(tx + 7, ty - 11 - st * 2, 3 + st, 3 + st, 2);
        break;
      case 'flame': {
        Cv([[tx, ty], [tx + 5, ty - 4], [tx + 7, ty - 8]], 3, 2, 1);
        const fh = 10 + st * 5;
        P([[tx + 2, ty - 8], [tx + 5 + sw, ty - 8 - fh], [tx + 8, ty - 13], [tx + 11, ty - 9 - fh * 0.7], [tx + 12, ty - 7]], 3);
        P([[tx + 4, ty - 8], [tx + 6 + sw, ty - 6 - fh * 0.6], [tx + 9, ty - 8]], 13);
        break;
      }
      case 'leaf':
        Cv([[tx, ty], [tx + 5, ty - 4], [tx + 7, ty - 7]], 2.4, 1.6, 1);
        E(tx + 10, ty - 11 - st, 3.2 + st * 1.2, 5.5 + st * 1.6, 14, -0.6);
        Ln(tx + 7, ty - 7, tx + 12, ty - 16 - st * 2, 0.7, 4);
        if (final) E(tx + 4, ty - 15, 2.4, 4, 14, 0.3);
        break;
      case 'bolt':
        P([[tx, ty], [tx + 7, ty - 6], [tx + 4, ty - 8], [tx + 10, ty - 17 - st * 2], [tx + 7, ty - 9], [tx + 10, ty - 8], [tx + 2, ty - 1]], 1);
        if (big) P([[tx + 6, ty - 9], [tx + 9, ty - 15 - st * 2], [tx + 8, ty - 9]], 3);
        break;
      case 'club':
        Cv([[tx, ty], [tx + L * 0.5, ty - 2], [tx + L * 0.9, ty - 4]], 3, 2.4, 1);
        E(tx + L * 0.9 + 1, ty - 5, 3 + st, 3 + st * 0.8, 3);
        if (final) for (const a of [0, 1.6, 3.2]) P([[tx + L * 0.9 + Math.cos(a) * 3, ty - 5 + Math.sin(a) * 3], [tx + L * 0.9 + Math.cos(a) * 7, ty - 5 + Math.sin(a) * 7], [tx + L * 0.9 + Math.cos(a + 0.6) * 3, ty - 5 + Math.sin(a + 0.6) * 3]], 4);
        break;
      case 'fan':
        for (let i = 0; i < (final ? 7 : 4); i++) {
          const a = -2.2 + i * (1.6 / (final ? 6 : 3));
          const len = 10 + st * 4;
          P([[tx, ty - 4], [tx + Math.cos(a) * len * -1, ty - 4 + Math.sin(a) * len], [tx + Math.cos(a + 0.2) * len * -1, ty - 4 + Math.sin(a + 0.2) * len]].map(([x, y]) => [2 * tx - x, y] as [number, number]), i % 2 ? 3 : 1);
          if (final) E(2 * tx - (tx + Math.cos(a + 0.1) * len * -0.9), ty - 4 + Math.sin(a + 0.1) * len * 0.9, 1.4, 1.4, 12);
        }
        break;
      case 'whip':
        Cv([[tx, ty], [tx + L * 0.7, ty + 2], [tx + L * 1.1, ty - L * 0.5], [tx + L * 0.8 + sw, ty - L * 1.1]], 2.6, 1, 1);
        E(tx + L * 0.8 + sw, ty - L * 1.1, 2.4 + st * 0.5, 3 + st * 0.5, 3);
        break;
      case 'scorpion':
        Cv([[tx, ty], [tx + 6, ty - 6], [tx + 6, ty - 14], [tx + 1, ty - 20 - st * 2]], 3.4, 2.2, 1);
        P([[tx - 1, ty - 19 - st * 2], [tx - 5, ty - 15 - st * 2], [tx + 2, ty - 22 - st * 2]], 3);
        break;
      case 'fin':
        P([[tx, ty - 2], [tx + 9 + st * 2, ty - 10 - st * 2], [tx + 6, ty - 2], [tx + 11 + st * 2, ty + 2]], 3);
        break;
    }
    if (sp.body === 'dragon') P([[tx - 2, ty - 5], [tx + 15, ty + 1], [tx + 19, ty - 3], [tx + 2, ty - 10]], 1);
  };

  if (sig.back && sig.back !== 'shell' && sig.back !== 'plates' && sig.back !== 'spikes' && sig.back !== 'cloud' && (st >= 2 || sig.back === 'fwing' || sig.back === 'iwing')) backPart();
  tailPart();
  if (sig.back === 'cloud' && st >= 2) backPart();

  // ---------- 몸 ----------
  switch (sp.body) {
    case 'blob':
      B(0, -13, 14, 12.5, 1);
      E(-6, -1.5, 4, 2.2, 1);
      E(6, -1.5, 4, 2.2, 1);
      head = [0, -16 * tall, 10 * headK];
      neck = [0, -6];
      tailRoot = [11, -6];
      break;
    case 'quad': {
      for (const lx of [-10, -4, 7, 12]) {
        const backLeg = lx === -4 || lx === 12;
        const lh = 4 + st * 0.8;
        E(lx, -lh, 2.8, lh, backLeg ? 16 : 1);
        E(lx - 0.6, -1, 3.2, 1.8, backLeg ? 16 : 1);
      }
      B(2, -13, 14, 8.5, 1);
      B(0, -10, 10, 4.5, 2);
      head = [-11, -22 * tall, 8.4 * headK];
      neck = [-9, -16];
      tailRoot = [14, -14];
      break;
    }
    case 'biped': {
      const lg = 3 + st;
      E(-5, -lg * 0.6, 4, lg * 0.7 + 1.5, 1);
      E(5, -lg * 0.6, 4, lg * 0.7 + 1.5, 1);
      E(-6, -0.8, 4.5, 1.8, 1);
      E(6, -0.8, 4.5, 1.8, 1);
      B(0, -13 - st, 9.5, 10.5, 1);
      B(0, -11 - st, 6.5, 7.5, 2);
      const arm = frame === 1 ? 1 : 0;
      const raise = final ? -4 : 0;
      E(-10.5, -15 - st + arm + raise, 3.2, 6, 1, 0.45 + (final ? 0.5 : 0));
      E(10.5, -15 - st - arm + raise, 3.2, 6, 1, -0.45 - (final ? 0.5 : 0));
      head = [0, -28 * tall - st, 9.5 * headK];
      neck = [0, -22];
      tailRoot = [8, -8];
      break;
    }
    case 'bird':
      Ln(-3, -6, -4, 0, 1, 12);
      Ln(3, -6, 4, 0, 1, 12);
      B(1, -14, 10.5, 10, 1);
      B(-1, -12, 6.5, 6.5, 2);
      if (sig.back !== 'fwing') for (const side of [-1, 1]) P([[side * 6, -18], [side * 16, -24 + up], [side * 12, -9]], 1);
      head = [-6, -25 * tall, 7.5 * headK];
      neck = [-4, -20];
      tailRoot = [9, -9];
      break;
    case 'fish':
      P([[13, -15], [23, -25], [21, -15], [23, -5]], 3);
      B(0, -15, 16, 9.5, 1);
      B(-2, -11, 10, 5, 2);
      P([[-4, -23], [4, -32 - st * 2], [9, -22]], 3);
      P([[-2, -8], [4, -2], [5, -9]], 3);
      head = [-8, -17, 6.5];
      tailRoot = [14, -14];
      break;
    case 'serpent': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        pts.push([13 - t * 20 + Math.sin(t * Math.PI * 2 + (frame ? 0.3 : 0)) * 7, -2 - t * 30]);
      }
      pts.forEach(([x, y], i) => E(x, y, 3.4 + i * 0.28, 3.4 + i * 0.28, 1));
      pts.forEach(([x, y], i) => i % 2 === 0 && E(x + 1, y + 1.5, 1.8 + i * 0.12, 1.3, 2));
      head = [pts[14][0] - 1, pts[14][1] - 3, 7.6 * headK];
      E(head[0], head[1], 8, 6.4, 1);
      E(head[0] - 5.5, head[1] + 2, 4, 2.8, 2);
      neck = [pts[12][0], pts[12][1]];
      break;
    }
    case 'bug':
      for (const [lx, d] of [[-6, -1], [-1, 0], [4, 1]] as [number, number][]) {
        Ln(lx, -9, lx - 3 + d * 2, -1, 1.1, 4);
        Ln(lx + 1, -9, lx + 4 + d * 2, -1, 1.1, 4);
      }
      E(8, -11, 9, 7, 1);
      for (let i = 0; i < 3; i++) Ln(4 + i * 3, -17, 4 + i * 3, -5, 0.9, 2, 1);
      E(-1, -12, 5.5, 5.5, 1);
      head = [-10, -16, 7.8 * headK];
      neck = [-5, -13];
      tailRoot = [16, -10];
      break;
    case 'plant': {
      Ln(-4, -4, -8, 0, 1.8, 4);
      Ln(4, -4, 8, 0, 1.8, 4);
      B(0, -12, 12, 11, 1);
      B(0, -9, 8, 5.5, 2);
      const lc = has('grass') ? 14 : 4;
      P([[-2, -22], [-13, -33 - st * 3], [-4, -26]], lc);
      P([[2, -22], [13, -34 - st * 3], [5, -25]], lc);
      Ln(-3, -24, -11, -31 - st * 3, 0.7, 4, lc);
      Ln(3, -24, 11, -32 - st * 3, 0.7, 4, lc);
      head = [0, -14, 9.6];
      neck = [0, -4];
      break;
    }
    case 'rock': {
      const k = final ? 1.15 : 1;
      P([[-13 * k, -4], [-15 * k, -15], [-9 * k, -26 * k], [4 * k, -28 * k], [14 * k, -17], [13 * k, -3], [0, 0]], 1);
      P([[-7, -6], [-10, -14], [3, -11], [9, -5]], 2);
      if (big) {
        E(-16, -12, 4, 4.5, 1);
        E(16, -12, 4, 4.5, 1);
      }
      Ln(2, -26, 5, -19, 0.9, 4, 1);
      Ln(-11, -19, -8, -15, 0.9, 4, 1);
      head = [-1, -17, 8.6];
      break;
    }
    case 'ghost': {
      const w = frame === 1 ? 1 : -1;
      P([[-12, -17], [-10, -4], [-6, -8 + w], [-3, -2], [0, -7 - w], [3, -2], [6, -8 + w], [10, -3], [12, -17]], 1);
      B(0, -19, 12, 12, 1);
      E(-13, -15 + w, 2.8, 4.5, 1, 0.6);
      E(13, -15 - w, 2.8, 4.5, 1, -0.6);
      head = [0, -20, 11];
      break;
    }
    case 'dragon': {
      const lg = 3 + st;
      E(-5, -lg * 0.6, 4.4, lg * 0.7 + 1.6, 1);
      E(5, -lg * 0.6, 4.4, lg * 0.7 + 1.6, 1);
      B(1, -14 - st, 11, 12, 1);
      B(-1, -12 - st, 6.5, 8.5, 2);
      for (let i = 0; i < 4; i++) Ln(-5, -19 - st + i * 3, 3, -19 - st + i * 3, 0.6, 1, 2);
      E(-11, -16 - st, 3, 5.4, 1, 0.5);
      head = [-5, -29 * tall - st, 8.4 * headK];
      E(-12, -27 * tall - st, 5.4, 3.8, 1);
      E(-13, -26 * tall - st, 3.2, 2.2, 2);
      neck = [-3, -22];
      tailRoot = [9, -9];
      break;
    }
  }
  if (sig.back === 'shell' || sig.back === 'plates' || sig.back === 'spikes') if (st >= 2 || sig.back !== 'spikes') backPart();

  let [hx, hy, hr] = head;
  // ---------- 갈기 (머리 뒤) ----------
  if (sig.mane && st >= 2) {
    const mr = hr + 3 + st;
    const n = final ? 12 : 8;
    for (let i = 0; i < n; i++) {
      // 머리 위쪽 반원 + 옆 (얼굴 아래로는 내리지 않는다)
      const a = Math.PI * (0.82 + (i / (n - 1)) * 1.36);
      const topness = Math.max(0, -Math.sin(a));
      const tuft = (sig.mane === 'flame' ? 3 + (i % 2) * 3 : 3) + topness * (final ? 3 : 1.5);
      const col = sig.mane === 'flame' ? (i % 2 ? 13 : 3) : sig.mane === 'leaf' ? 14 : sig.mane === 'crystal' ? 9 : sig.mane === 'cloud' ? 2 : i % 2 ? 3 : 1;
      if (sig.mane === 'crystal' || sig.mane === 'flame' || sig.mane === 'feather' || sig.mane === 'leaf')
        P([[hx + Math.cos(a - 0.25) * hr * 0.8, hy + 2 + Math.sin(a - 0.25) * hr * 0.8], [hx + Math.cos(a) * (mr + tuft), hy + 2 + Math.sin(a) * (mr + tuft)], [hx + Math.cos(a + 0.25) * hr * 0.8, hy + 2 + Math.sin(a + 0.25) * hr * 0.8]], col);
      else E(hx + Math.cos(a) * mr * 0.85, hy + 2 + Math.sin(a) * mr * 0.85, tuft, tuft, col);
    }
  }
  // 머리 그리기 (몸에 따라 이미 그린 경우 제외)
  if (sp.body === 'quad' || sp.body === 'biped' || sp.body === 'bird' || sp.body === 'dragon') E(hx, hy, hr, hr * 0.93, 1);
  if (sp.body === 'quad') {
    E(hx - hr * 0.62, hy + hr * 0.3, hr * 0.42, hr * 0.34, 2);
    g.set(X(hx - hr * 0.98), Y(hy + hr * 0.2), 6);
  }
  if (sp.body === 'bird' || sig.face === 'beak') P([[hx - hr * 0.7, hy - 1], [hx - hr * 1.6 - st, hy + 1], [hx - hr * 0.7, hy + 3]], 12);

  // ---------- 귀 ----------
  const ex = hx;
  const ey = hy - hr * 0.72;
  switch (sig.ear) {
    case 'pointy':
      P([[ex - hr * 0.95, ey + 3], [ex - hr * 1.05, ey - 7 - st * 2], [ex - hr * 0.2, ey + 1]], 1);
      P([[ex + hr * 0.95, ey + 3], [ex + hr * 0.8, ey - 7 - st * 2], [ex + hr * 0.15, ey + 1]], 1);
      P([[ex - hr * 0.8, ey + 2], [ex - hr * 0.88, ey - 4 - st * 2], [ex - hr * 0.4, ey + 1]], 7);
      if (final) P([[ex - hr * 1.02, ey - 4 - st * 2], [ex - hr * 1.05, ey - 7 - st * 2], [ex - hr * 0.85, ey - 5 - st * 2]], 3);
      break;
    case 'round':
      E(ex - hr * 0.85, ey - 1, 3.6, 3.6, 1);
      E(ex + hr * 0.85, ey - 1, 3.6, 3.6, 1);
      E(ex - hr * 0.85, ey - 1, 1.8, 1.8, 7);
      E(ex + hr * 0.85, ey - 1, 1.8, 1.8, 7);
      break;
    case 'long':
      E(ex - hr * 0.5, ey - 7 - st * 2, 2.6, 7.5 + st * 2, 1, -0.3);
      E(ex + hr * 0.6, ey - 7 - st * 2, 2.6, 7.5 + st * 2, 1, 0.35);
      E(ex - hr * 0.5, ey - 6 - st * 2, 1.1, 5.5 + st * 2, 7, -0.3);
      if (final) E(ex - hr * 0.5 - 1.5, ey - 13 - st * 3, 1.6, 2, 3);
      break;
    case 'fin':
      P([[ex - hr, ey + 4], [ex - hr - 6 - st * 2, ey - 3], [ex - hr + 1, ey - 1]], 3);
      P([[ex + hr, ey + 4], [ex + hr + 6 + st * 2, ey - 3], [ex + hr - 1, ey - 1]], 3);
      break;
  }

  // ---------- 볏 ----------
  if (sig.crest) {
    const top = hy - hr * 0.95;
    const k = st === 1 ? 0.6 : st === 2 ? 0.85 : 1.15;
    switch (sig.crest) {
      case 'fin':
        P([[hx - 3, top + 2], [hx + 2, top - 10 * k], [hx + 9 * k, top - 5 * k], [hx + 5, top + 3]], 3);
        break;
      case 'flame':
        P([[hx - 4, top + 3], [hx - 3, top - 9 * k], [hx, top - 3], [hx + 2, top - 13 * k], [hx + 4, top - 3], [hx + 7, top - 8 * k], [hx + 5, top + 3]], 3);
        P([[hx - 1, top + 2], [hx + 2, top - 7 * k], [hx + 3, top + 2]], 13);
        break;
      case 'leaf':
        E(hx - 3, top - 4 * k, 2.4 * k + 1, 5 * k, 14, -0.5);
        E(hx + 3, top - 5 * k, 2.4 * k + 1, 5.5 * k, 14, 0.5);
        Ln(hx, top + 2, hx, top - 3, 0.8, 4);
        break;
      case 'feather':
        for (let i = 0; i < (final ? 4 : 2); i++) Cv([[hx + 1, top + 2], [hx + 5 + i * 3, top - 6 * k - i * 2], [hx + 10 + i * 3, top - 4 * k - i * 3]], 1.8, 1, i % 2 ? 3 : 4);
        break;
      case 'crystal':
        P([[hx - 3, top + 2], [hx - 1, top - 12 * k], [hx + 2, top + 2]], 9);
        if (big) P([[hx + 1, top + 2], [hx + 5, top - 8 * k], [hx + 6, top + 3]], 3);
        break;
      case 'spikes':
        for (let i = 0; i < 3; i++) P([[hx - 4 + i * 4, top + 2], [hx - 3 + i * 4, top - 6 * k - (i === 1 ? 2 : 0)], [hx - 1 + i * 4, top + 2]], 3);
        break;
      case 'cloud':
        for (let i = 0; i < 3; i++) E(hx - 4 + i * 4, top - 2 - (i === 1 ? 2 : 0), 3 * k + 0.6, 2.6 * k + 0.6, 2);
        break;
    }
  }
  // ---------- 뿔 ----------
  if (sig.horn && sig.horn !== 'none' && (st >= 2 || sig.horn === 'oni')) {
    const top = hy - hr * 0.8;
    const k = st === 1 ? 0.5 : st === 2 ? 0.85 : 1.2;
    switch (sig.horn) {
      case 'oni':
        // 도깨비 뿔: 짧고 통통, 3단계는 고리 무늬
        for (const side of [-1, 1]) {
          P([[hx + side * 2.5, top + 2], [hx + side * 4.2, top - 7 * k], [hx + side * 6, top + 2]], 12);
          if (final) Ln(hx + side * 3, top - 1, hx + side * 5.6, top - 1, 0.8, 4);
        }
        break;
      case 'goat':
        for (const side of [-1, 1]) Cv([[hx + side * 3, top], [hx + side * 10 * k, top - 6 * k], [hx + side * 12 * k, top + 3], [hx + side * 8 * k, top + 5]], 2.6, 1.4, 12);
        break;
      case 'antler':
        for (const side of [-1, 1]) {
          Ln(hx + side * 3, top + 1, hx + side * 8 * k, top - 10 * k, 1.4, 11);
          Ln(hx + side * 6 * k, top - 6 * k, hx + side * 11 * k, top - 8 * k, 1.1, 11);
          if (final) Ln(hx + side * 7 * k, top - 9 * k, hx + side * 6 * k, top - 15 * k, 1, 11);
          if (final && has('grass')) E(hx + side * 11 * k, top - 9 * k, 1.8, 1.8, 7);
        }
        break;
      case 'unicorn':
        P([[hx - 2, top + 2], [hx - 1, top - 14 * k], [hx + 2, top + 2]], 12);
        for (let i = 0; i < 3; i++) g.set(X(hx - 1 + 0), Y(top - 2 - i * 3 * k), 4);
        break;
      case 'twin':
        for (const side of [-1, 1]) P([[hx + side * 2, top + 2], [hx + side * 6 + 4, top - 9 * k], [hx + side * 6, top + 3]], 12);
        break;
      case 'crown':
        P([[hx - 5, top + 2], [hx - 5, top - 4 * k], [hx - 2.5, top - 1], [hx, top - 6 * k], [hx + 2.5, top - 1], [hx + 5, top - 4 * k], [hx + 5, top + 2]], 12);
        E(hx, top - 1, 1.2, 1.2, 8);
        break;
    }
  }
  // 소품: 갓은 머리 위
  if (sig.acc === 'hat' && st >= 2) {
    const top = hy - hr * 0.85;
    E(hx, top + 1, hr + 5, 2.2, 6);
    E(hx, top - 3, hr * 0.5, 4, 6);
    Ln(hx - hr * 0.55, top + 1, hx - hr * 0.3, hy + hr * 0.5, 0.6, 12);
  }

  // ---------- 무늬 ----------
  const markOn = (v: number) => (x: number, y: number) => g.get(Math.round(X(x)), Math.round(Y(y))) === v;
  const onBody = markOn(1);
  if (sig.mark && st >= 2) {
    switch (sig.mark) {
      case 'stripe':
        for (let i = -1; i <= 1; i++) Ln(i * 4 + 2, -18 * tall, i * 4 + 4, -10 * tall, 1.1, 4, 1);
        break;
      case 'spot':
        for (const [sx, sy] of [[6, -14], [-3, -7], [9, -9], [-8, -16]] as [number, number][]) if (onBody(sx, sy)) E(sx, sy, 1.8, 1.8, 3, 0, 1);
        break;
      case 'rune':
        Ln(-2, -16 * tall, 2, -12 * tall, 0.8, 3, 1);
        Ln(2, -16 * tall, -2, -12 * tall, 0.8, 3, 1);
        E(0, -14 * tall, 3, 3, 3, 0, 1);
        E(0, -14 * tall, 2, 2, 1, 0, 3);
        break;
      case 'star': {
        const cx = 3;
        const cy = -12 * tall;
        P([[cx, cy - 3.5], [cx + 1, cy - 1], [cx + 3.5, cy - 1], [cx + 1.5, cy + 0.8], [cx + 2.3, cy + 3.4], [cx, cy + 1.8], [cx - 2.3, cy + 3.4], [cx - 1.5, cy + 0.8], [cx - 3.5, cy - 1], [cx - 1, cy - 1]], 12);
        break;
      }
      case 'ring':
        E(0, -13 * tall, 5, 5, 3, 0, 2);
        E(0, -13 * tall, 3.4, 3.4, 2, 0, 3);
        break;
      case 'zig':
        Ln(-6, -16 * tall, -2, -12 * tall, 1, 3, 1);
        Ln(-2, -12 * tall, -4, -10 * tall, 1, 3, 1);
        Ln(-4, -10 * tall, 1, -6 * tall, 1, 3, 1);
        break;
      case 'belly':
        break;
    }
  }
  // ---------- 팔 ----------
  if (sig.arm && st >= 2 && (sp.body === 'biped' || sp.body === 'dragon' || sp.body === 'bug')) {
    const ay = sp.body === 'bug' ? -9 : -11 - st + (final ? -5 : 0);
    for (const side of [-1, 1]) {
      const ax = side * (sp.body === 'bug' ? 3 : 12.5);
      if (sig.arm === 'claw') for (let i = 0; i < 3; i++) Ln(ax + side * (i - 1) * 1.2, ay, ax + side * (i - 1) * 1.6, ay + 2.6, 0.8, 9);
      else if (sig.arm === 'blade') P([[ax, ay - 2], [ax + side * 7 * (st - 1), ay - 10 - st * 2], [ax + side * 2, ay + 1]], 9);
      else if (sig.arm === 'fist') E(ax, ay + 1, 3.4 + st * 0.4, 3.4 + st * 0.4, 3);
      else if (sig.arm === 'fin') P([[ax, ay - 3], [ax + side * 7, ay - 6], [ax + side * 3, ay + 2]], 3);
    }
  }
  // ---------- 소품 (몸 앞) ----------
  if (sig.acc && sig.acc !== 'hat' && (st >= 2 || sig.acc === 'club' || sig.acc === 'bell')) {
    const nx = neck[0];
    const ny = neck[1];
    switch (sig.acc) {
      case 'club': {
        // 도깨비 방망이
        const cx = sp.body === 'quad' ? 16 : 13;
        const cy = sp.body === 'quad' ? -22 : -12 - st;
        const L = 6 + st * 2.4;
        Ln(cx, cy + 4, cx + 2, cy - L, 1.6 + st * 0.3, 11);
        E(cx + 2.4, cy - L - 1, 2.4 + st * 0.6, 3.4 + st * 0.7, 11);
        for (const [dx, dy] of [[-1, -1], [1.5, 0.5], [0, 2]] as [number, number][]) E(cx + 2.4 + dx * st * 0.6, cy - L - 1 + dy * st * 0.6, 0.7, 0.7, 12);
        break;
      }
      case 'scarf':
        E(nx, ny, hr * 0.85, 2.6, 3);
        P([[nx + 3, ny], [nx + 9 + st, ny + 7 + st], [nx + 6, ny + 9 + st], [nx + 1, ny + 2]], 3);
        Ln(nx - hr * 0.7, ny + 0.5, nx + hr * 0.7, ny + 0.5, 0.7, 4, 3);
        break;
      case 'bell':
        E(nx, ny + 1, hr * 0.7, 1.4, 4);
        E(nx, ny + 4, 2.6 + st * 0.3, 2.6 + st * 0.3, 12);
        g.set(X(nx), Y(ny + 5), 6);
        break;
      case 'beads':
        for (let i = -3; i <= 3; i++) E(nx + i * 2.2, ny + 1 + Math.abs(i) * -0.5 + 1.6, 1.2, 1.2, i % 2 ? 12 : 3);
        break;
      case 'band':
        E(hx, hy - hr * 0.42, hr * 1.02, 1.6, 3, 0, 1);
        P([[hx + hr * 0.9, hy - hr * 0.42], [hx + hr + 6, hy - hr * 0.2 + (frame ? 1 : 0)], [hx + hr + 5, hy + 2]], 3);
        break;
      case 'gem':
        E(hx, hy - hr * 0.52, 1.8 + st * 0.3, 1.8 + st * 0.3, 3);
        g.set(X(hx) - 1, Y(hy - hr * 0.52) - 1, 9);
        break;
      case 'lantern':
        Ln(hx + hr + 1, hy, hx + hr + 4, hy - 6, 0.6, 11);
        E(hx + hr + 4, hy + 2, 2.4 + st * 0.4, 3.2 + st * 0.5, 13);
        E(hx + hr + 4, hy + 2, 1.2, 1.6, 12);
        break;
    }
  }

  // ---------- 3단계 장식: 테두리색 줄과 반짝임 ----------
  if (final) {
    // 몸 아랫단에 장식색 테
    for (let x = 0; x < SG; x++)
      for (let y = SG - 1; y > 0; y--) {
        if (g.get(x, y) === 1 && g.get(x, y + 1) === 0 && g.get(x, y - 1) === 1 && (x + y) % 3 === 0) {
          g.set(x, y, 3);
          break;
        }
      }
  }
  if (legend) for (let i = 0; i < 6; i++) g.set(X(-18 + i * 7), Y(-40 + (i % 2) * 6), 9);

  // ---------- 얼굴 ----------
  hx = head[0];
  hy = head[1];
  hr = head[2];
  if (!back) {
    const eyeR = (st === 1 ? 3.3 : st === 2 ? 2.8 : 2.4) * (sp.body === 'ghost' || sp.body === 'blob' ? 1.2 : 1);
    const sep = hr * 0.45;
    const ey2 = hy + hr * 0.02;
    const fierce = final && (has('dragon') || has('dark') || has('fight') || sp.base[1] > sp.base[3] + 10);
    const blink = frame === 2;
    const fish = sp.body === 'fish';
    for (const k of fish ? [-1] : [-1, 1]) {
      const ex2 = fish ? hx - 0.5 : hx + k * sep - hr * 0.12;
      const far = k === 1;
      const rr = eyeR * (far ? 0.88 : 1) * s * (fish ? 1.25 : 1);
      const cx = X(ex2);
      const cy = Y(ey2);
      if (blink) {
        g.line(cx - rr, cy, cx + rr, cy, 1, 6);
        continue;
      }
      for (let y = -Math.ceil(rr * 1.3); y <= Math.ceil(rr * 1.3); y++)
        for (let x = -Math.ceil(rr); x <= Math.ceil(rr); x++) {
          const d = (x * x) / (rr * rr + 0.3) + (y * y) / ((rr * 1.28) ** 2 + 0.3);
          if (d > 1) continue;
          if (fierce && y < -rr * 0.95 + -x * k * 0.6) continue;
          // 흰자 → 홍채 → 눈동자
          const ix = x + 0.4;
          const iy = y + 0.6;
          const di = (ix * ix) / ((rr * 0.78) ** 2) + (iy * iy) / ((rr * 1.02) ** 2);
          g.set(cx + x, cy + y, di > 1 ? 5 : di > 0.3 ? (iy > rr * 0.25 ? 17 : 10) : 6);
        }
      g.set(cx - rr * 0.35, cy - rr * 0.55, 9);
      g.set(cx - rr * 0.35 + 1, cy - rr * 0.55, 9);
      g.set(cx + rr * 0.35, cy + rr * 0.5, 9);
      if (fierce) g.line(cx + k * rr * 1.05, cy - rr * 1.6, cx - k * rr * 0.9, cy - rr * 0.55, 1, 6);
    }
    // 볼
    if (st < 3 && sp.body !== 'rock' && sp.body !== 'fish') {
      g.ellipse(X(hx - sep - 2.6), Y(ey2 + 3.4), 1.5, 1, 7);
      g.ellipse(X(hx + sep + 2), Y(ey2 + 3.4), 1.3, 0.9, 7);
    }
    // 입 (만화풍: 웃는 입 / 송곳니)
    const my = ey2 + hr * (fish ? 0.55 : 0.46);
    const mx = fish ? hx - hr * 0.95 : hx - hr * 0.12;
    if (final && fierce) {
      g.line(X(mx - 3), Y(my), X(mx + 3), Y(my), 1.2, 8);
      g.set(X(mx - 2), Y(my) - 1, 5);
      g.set(X(mx + 2), Y(my) - 1, 5);
    } else if (st === 1 || r() < 0.5) {
      g.set(X(mx - 1.5), Y(my), 6);
      g.set(X(mx - 0.5), Y(my) + 1, 6);
      g.set(X(mx + 0.5), Y(my) + 1, 6);
      g.set(X(mx + 1.5), Y(my), 6);
      if (st === 1) g.set(X(mx), Y(my) + 1, 8);
    } else {
      g.ellipse(X(mx), Y(my + 0.6), 1.6, 1.1, 8);
    }
    switch (sig.face) {
      case 'whisker':
        if (fish) for (const d of [0, 2]) g.line(X(mx), Y(my), X(mx - 3 - d), Y(my + 4 + st + d), 0.8, 4);
        else for (const k of [-1, 1]) for (const dy of [-0.8, 0.8]) g.line(X(hx + k * hr * 0.72), Y(my - 1 + dy), X(hx + k * hr * 1.3), Y(my - 2 + dy * 2.2), 0.7, 6);
        break;
      case 'tusk':
        if (big) for (const k of [-1, 1]) P([[mx + k * 2, my], [mx + k * 3.5, my + 4 + st], [mx + k * 3.2, my]], 9);
        break;
      case 'fang':
        g.set(X(mx - 1.5), Y(my) + 1, 9);
        g.set(X(mx + 1.5), Y(my) + 1, 9);
        break;
      case 'mask':
        if (big) Ln(hx - hr * 0.95, ey2 - 0.5, hx + hr * 0.7, ey2 - 0.5, 0.9, 4, 1);
        break;
      case 'beard':
        if (big) P([[mx - 3, my + 1], [mx, my + 6 + st], [mx + 3, my + 1]], 2);
        break;
    }
  }
  return g;
}

/** 칸 → 캔버스: 부위별 둥근 명암 + 색 외곽선 */
function bake(g: Grid, pal: Pal): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SG;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(SG, SG);
  const N = SG * SG;
  // 부위마다 경계까지 거리 (다른 색도 경계로 친다)
  const dist = new Float32Array(N).fill(99);
  const qx: number[] = [];
  for (let i = 0; i < N; i++) {
    if (!g.c[i]) continue;
    const x = i % SG;
    const y = (i / SG) | 0;
    const v = g.c[i];
    if (g.get(x - 1, y) !== v || g.get(x + 1, y) !== v || g.get(x, y - 1) !== v || g.get(x, y + 1) !== v) {
      dist[i] = 1;
      qx.push(i);
    }
  }
  for (let h = 0; h < qx.length; h++) {
    const i = qx[h];
    const x = i % SG;
    const y = (i / SG) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SG || ny >= SG) continue;
      const j = ny * SG + nx;
      if (g.c[j] === g.c[i] && dist[j] > dist[i] + 1) {
        dist[j] = dist[i] + 1;
        qx.push(j);
      }
    }
  }
  // 부드러운 높이 → 기울기 = 면의 방향
  const hgt = new Float32Array(N);
  for (let i = 0; i < N; i++) hgt[i] = g.c[i] ? Math.min(dist[i], 6) : 0;
  const blur = (a: Float32Array) => {
    const o = new Float32Array(N);
    for (let y = 0; y < SG; y++)
      for (let x = 0; x < SG; x++) {
        let s = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= SG || ny >= SG) continue;
            s += a[ny * SG + nx];
            n++;
          }
        o[y * SG + x] = s / n;
      }
    return o;
  };
  const hs = blur(blur(hgt));
  const ramps: Record<number, RGB[]> = {};
  for (const k of Object.keys(pal)) ramps[+k] = ramp(pal[+k]);
  const put = (i: number, c: RGB) => {
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  };
  for (let y = 0; y < SG; y++)
    for (let x = 0; x < SG; x++) {
      const i = y * SG + x;
      const v = g.c[i];
      if (!v) {
        // 바깥 외곽선: 이웃한 색을 아주 어둡게
        const nb = [g.get(x - 1, y), g.get(x + 1, y), g.get(x, y - 1), g.get(x, y + 1)].find((n) => n);
        if (nb) put(i, mix(pal[nb] ?? [0, 0, 0], [12, 6, 24], 0.82));
        continue;
      }
      if (FLAT.has(v)) {
        put(i, pal[v]);
        continue;
      }
      const at = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= SG || yy >= SG ? 0 : hs[yy * SG + xx]);
      const gx = at(x + 1, y) - at(x - 1, y);
      const gy = at(x, y + 1) - at(x, y - 1);
      // 빛은 왼쪽 위에서
      let light = -(gx * -0.62 + gy * -0.78) * 0.9;
      light += (Math.min(dist[i], 4) - 2) * 0.1;
      // 아래쪽일수록 조금 어둡게
      light -= (y / SG) * 0.25;
      let tone = light > 0.55 ? 4 : light > 0.2 ? 3 : light > -0.22 ? 2 : light > -0.6 ? 1 : 0;
      // 경계 근처는 섞어 찍기
      if (tone === 2 && light < -0.12 && (x + y) % 2 === 0) tone = 1;
      if (tone === 3 && light < 0.26 && (x + y) % 2 === 0) tone = 2;
      // 다른 부위와 닿은 곳은 선을 그은 듯 어둡게 (앞에 있는 부위가 아니면)
      const up2 = g.get(x, y - 1);
      const left = g.get(x - 1, y);
      if ((up2 && up2 !== v && !FLAT.has(up2)) || (left && left !== v && !FLAT.has(left))) tone = Math.min(tone, 1);
      put(i, ramps[v][tone]);
    }
  ctx.putImageData(img, 0, 0);
  return cv;
}

const cache = new Map<string, HTMLCanvasElement>();
const fits = new Map<number, number>();
/** 칸 밖으로 넘치지 않는 크기 비율 (날개를 든 그림 기준) */
export function fitOf(sp: Species): number {
  let f = fits.get(sp.no);
  if (f !== undefined) return f;
  f = 1;
  for (const k of [1, 0.94, 0.88, 0.82, 0.76, 0.7]) {
    f = k;
    const g = paint(sp, false, 1, k);
    let edge = false;
    for (let i = 0; i < SG && !edge; i++) if (g.get(i, 0) || g.get(i, 1) || g.get(0, i) || g.get(1, i) || g.get(SG - 1, i) || g.get(SG - 2, i)) edge = true;
    if (!edge) break;
  }
  fits.set(sp.no, f);
  return f;
}
/** 깨비 그림. frame 0 보통 · 1 숨쉬기 · 2 눈 깜빡 */
export function kkaebiSprite(sp: Species, back = false, frame = 0, shiny = false): HTMLCanvasElement {
  const key = `${sp.no}:${back}:${frame}:${shiny}`;
  let cv = cache.get(key);
  if (!cv) {
    const r = rnd(sp.seed + 3);
    const hue = (r() - 0.5) * 40 + (shiny ? 150 : 0);
    const g = paint(sp, back, frame, fitOf(sp));
    cv = bake(g, palette(sp, hue, back));
    if (back) {
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

/** 한 가지 색으로 채운 모양 (진화 빛·등장 번쩍임) */
export function tinted(sp: Species, color: string, back = false): HTMLCanvasElement {
  const key = `tint:${sp.no}:${color}:${back}`;
  let cv = cache.get(key);
  if (!cv) {
    const src = kkaebiSprite(sp, back);
    cv = document.createElement('canvas');
    cv.width = cv.height = SG;
    const c = cv.getContext('2d')!;
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = color;
    c.fillRect(0, 0, SG, SG);
    cache.set(key, cv);
  }
  return cv;
}

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

/** 그리기: scale은 예전 48칸 기준 크기로 맞춰 준다 */
export function drawKkaebi(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, cx: number, bottom: number, scale: number, flip = false, squash = 1) {
  const raw = (scale * 48) / SG;
  const k = raw >= 1.5 ? Math.round(raw) : raw;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(bottom));
  if (flip) ctx.scale(-1, 1);
  ctx.scale(1 / squash, squash);
  ctx.drawImage(cv, Math.round((-SG / 2) * k), Math.round(-(SG - 1) * k), Math.round(SG * k), Math.round(SG * k));
  ctx.restore();
}

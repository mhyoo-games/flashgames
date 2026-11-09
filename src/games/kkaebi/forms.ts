// 계열마다 따로 디자인한 깨비 그림. 줄 번호(species.ts의 LINES 순서)마다 3단계를 그린다.
// 좌표: 발밑이 y=0, 위로 갈수록 음수. 얼굴은 왼쪽 앞을 본다. 한 칸 = 단계 배율(s)만큼의 도트.
// 색 번호: 1 몸 2 배 3 장식 4 진한장식 5 흰 6 검정 7 분홍 8 입속 9 반짝 11 나무 12 금 13 불꽃밝음
//          14 잎 15 옅은장식 16 몸그늘 18 주황불꽃 19 물 20 물밝음 21 줄무늬
import type { Body } from './species.ts';
import type { Face, Kind } from './sprite.ts';
import type { Type } from './types.ts';

type Pt = [number, number];
export interface Draw {
  E: (x: number, y: number, rx: number, ry: number, v: number, rot?: number, only?: number) => void;
  P: (pts: Pt[], v: number, only?: number) => void;
  Ln: (x1: number, y1: number, x2: number, y2: number, w: number, v: number, only?: number) => void;
  Cv: (pts: Pt[], w0: number, w1: number, v: number) => void;
  B: (x: number, y: number, rx: number, ry: number, v: number) => void;
  set: (x: number, y: number, v: number) => void;
  get: (x: number, y: number) => number;
  muzzle: (k: Kind | undefined, hx: number, hy: number, hr: number) => void;
  st: number;
  frame: number;
  /** 날개 등을 들어 올리는 양 (숨쉬기 그림) */
  up: number;
  has: (t: Type) => boolean;
  r: () => number;
  s: number;
}
export interface FormResult {
  head: [number, number, number];
  kind?: Kind;
  body?: Body;
  face?: Partial<Face>;
}
type Form = (d: Draw) => FormResult;

// ---------------- 자주 쓰는 부품 ----------------
/** 불꽃 한 덩이: 바깥 주황 → 노랑 → 밝은 속 */
function flame(d: Draw, x: number, y: number, h: number, w: number, lean = 0, cool = false) {
  const sway = d.frame === 1 ? 0.8 : 0;
  d.P([[x - w, y], [x - w * 0.7 + lean * 0.5, y - h * 0.55], [x - w * 0.15 + lean + sway, y - h], [x + w * 0.25 + lean * 0.7, y - h * 0.6], [x + w * 0.7 + lean * 0.4, y - h * 0.78], [x + w, y]], cool ? 19 : 18);
  d.P([[x - w * 0.62, y], [x - w * 0.2 + lean * 0.7 + sway, y - h * 0.72], [x + w * 0.5 + lean * 0.4, y - h * 0.35], [x + w * 0.62, y]], cool ? 20 : 3);
  d.E(x + lean * 0.2, y - h * 0.2, w * 0.32, h * 0.2, cool ? 5 : 13);
}
/** 불꽃 고리(갈기) */
function flameRing(d: Draw, hx: number, hy: number, r: number, n: number, len: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.78 + (i / (n - 1)) * 1.44);
    const top = Math.max(0, -Math.sin(a));
    const L = len * (0.7 + top * 0.6) + (i % 2) * 1.5;
    const bx = hx + Math.cos(a) * r * 0.85;
    const by = hy + Math.sin(a) * r * 0.85;
    const tx = hx + Math.cos(a) * (r + L);
    const ty = hy + Math.sin(a) * (r + L) - top * 2;
    const nx = -Math.sin(a) * 2.6;
    const ny = Math.cos(a) * 2.6;
    d.P([[bx - nx, by - ny], [tx, ty], [bx + nx, by + ny]], i % 2 ? 18 : 3);
    d.P([[bx - nx * 0.45, by - ny * 0.45], [hx + Math.cos(a) * (r + L * 0.55), hy + Math.sin(a) * (r + L * 0.55)], [bx + nx * 0.45, by + ny * 0.45]], 13);
  }
}
/** 잎사귀 하나 (잎맥 포함) */
function leaf(d: Draw, x: number, y: number, len: number, wid: number, rot: number, c = 14) {
  d.E(x, y, wid, len, c, rot);
  d.Ln(x + Math.sin(rot) * len * 0.8, y - Math.cos(rot) * len * 0.8, x - Math.sin(rot) * len * 0.8, y + Math.cos(rot) * len * 0.8, 0.5, 16, c);
}
/** 다섯 꽃잎 꽃 */
function blossom(d: Draw, x: number, y: number, r: number) {
  for (let p = 0; p < 5; p++) d.E(x + Math.cos((p / 5) * 6.28 - 1.57) * r, y + Math.sin((p / 5) * 6.28 - 1.57) * r, r * 0.8, r * 0.8, 7);
  d.E(x, y, r * 0.55, r * 0.55, 12);
}
/** 네 발 짐승 다리 */
function leg(d: Draw, x: number, top: number, len: number, w: number, c: number, hoof = 0) {
  d.E(x, top + len / 2, w, len / 2 + 0.6, c);
  d.E(x - 0.6, -1.2, w + 0.4, 1.5, hoof || c);
}
/** 물보라 기둥 */
function spout(d: Draw, x: number, y: number, h: number, w: number) {
  const k = d.frame === 1 ? 1.5 : 0;
  d.P([[x - w * 0.6, y], [x - w, y - h], [x + w, y - h], [x + w * 0.6, y]], 19);
  d.P([[x - w * 0.25, y], [x - w * 0.45, y - h], [x + w * 0.2, y - h], [x + w * 0.1, y]], 20);
  for (const [dx, dy, r] of [[-w * 1.1, -h - 1 - k, w * 0.75], [w * 0.2, -h - 2.5 + k, w * 0.9], [w * 1.2, -h - 0.5, w * 0.65]] as [number, number, number][]) {
    d.E(x + dx, y + dy, r, r * 0.8, 20);
    d.E(x + dx + 0.6, y + dy + r * 0.35, r * 0.6, r * 0.35, 19);
  }
  d.set(x - w * 1.8, y - h - 4, 9);
  d.set(x + w * 1.9, y - h - 3 - k, 9);
}
/** 개구리 머리: 넓적한 머리 + 머리 위로 솟은 두 눈 자리 */
function frogHead(d: Draw, h: [number, number, number]) {
  const [hx, hy, hr] = h;
  d.E(hx, hy + hr * 0.1, hr * 1.22, hr * 0.78, 1);
  for (const k of [-1, 1]) d.E(hx + k * hr * 0.5 - hr * 0.12, hy - hr * 0.55, hr * 0.44, hr * 0.4, 1);
  d.muzzle('frog', hx, hy, hr);
}
/** 소용돌이 무늬 */
function swirl(d: Draw, x: number, y: number, r: number, c: number, only = 2) {
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const a = t * Math.PI * 3.2;
    d.E(x + Math.cos(a) * r * t, y + Math.sin(a) * r * t * 0.9, 0.55, 0.55, c, 0, only);
  }
}

/** 복슬복슬한 털 덩이: 가장자리를 동글동글하게 */
function fluff(d: Draw, x: number, y: number, rx: number, ry: number, c: number, n = 12, bump = 2) {
  d.E(x, y, rx, ry, c);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    d.E(x + Math.cos(a) * rx * 0.92, y + Math.sin(a) * ry * 0.92, bump, bump, c);
  }
}
/** 투명한 벌레 날개 */
function bugWing(d: Draw, x: number, y: number, len: number, wid: number, rot: number, c = 15) {
  d.E(x, y, wid, len, c, rot);
  d.Ln(x, y, x + Math.sin(rot) * len * 0.85, y - Math.cos(rot) * len * 0.85, 0.5, 4, c);
}
/** 새 날개 (접은 모양): 어깨에서 뒤로 */
function foldWing(d: Draw, x: number, y: number, len: number, c: number, c2: number) {
  d.P([[x - 3, y - 3], [x + len, y + 2], [x + len * 0.85, y + 5], [x + len * 0.55, y + 4], [x + len * 0.3, y + 6], [x - 2, y + 4]], c);
  for (let i = 0; i < 3; i++) d.Ln(x + len * (0.35 + i * 0.2), y + 1.5, x + len * (0.3 + i * 0.2), y + 5, 0.7, c2, c);
}
/** 펼친 새 날개: 끝이 깃털로 갈라진다 */
function openWing(d: Draw, k: number, sx: number, sy: number, span: number, lift: number, c: number, c2: number) {
  const tip: Pt = [sx + k * span, sy - lift];
  const pts: Pt[] = [[sx, sy - 2], [sx + k * span * 0.5, sy - lift * 0.9], tip];
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    const x = tip[0] + (sx + k * 3 - tip[0]) * t;
    const y = tip[1] + (sy + 5 - tip[1]) * t + 4;
    pts.push([x + k * 1.4, y + 3.5], [x - k * 1.2, y]);
  }
  pts.push([sx, sy + 5]);
  d.P(pts, c);
  d.P([[sx, sy - 2], [sx + k * span * 0.5, sy - lift * 0.9], tip, [sx + k * span * 0.6, sy - lift * 0.45], [sx + k * 3, sy + 2]], c2);
}

// ---------------- 계열별 ----------------
export const FORMS: Record<number, Form> = {
  // 콩닢 → 넝쿨노루 → 고목사슴: 새싹 아기사슴 → 덩굴 감긴 젊은 사슴 → 꽃 핀 고목 뿔의 숲의 왕
  0: (d) => {
    const { E, P, Ln, B, st } = d;
    if (st === 1) {
      leg(d, -2, -6, 6, 2.2, 16, 11);
      leg(d, 8, -6, 6, 2.2, 16, 11);
      E(10.5, -12, 2.2, 2.4, 2);
      B(2, -9.5, 9.5, 6, 1);
      B(1, -6.5, 7, 2.4, 2);
      for (const [x, y] of [[3, -13], [7, -11], [0, -12], [5, -14.5]] as Pt[]) E(x, y, 1.1, 1, 5, 0, 1);
      leg(d, -6, -6, 6, 2.2, 1, 11);
      leg(d, 5, -6, 6, 2.2, 1, 11);
      const h: [number, number, number] = [-7, -17, 8.6];
      // 넓적한 사슴 귀
      for (const k of [-1, 1]) {
        P([[h[0] + k * 4, h[1] - 4], [h[0] + k * 13 - 2, h[1] - 8], [h[0] + k * 8, h[1] - 1]], 1);
        P([[h[0] + k * 5, h[1] - 3.6], [h[0] + k * 11 - 2, h[1] - 7], [h[0] + k * 7.5, h[1] - 1.8]], 7);
      }
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('deer', h[0], h[1], h[2] * 0.8);
      // 머리 위 새싹
      Ln(h[0] + 1, h[1] - h[2] + 1, h[0] + 1.5, h[1] - h[2] - 4, 1, 14);
      leaf(d, h[0] - 2.5, h[1] - h[2] - 5, 3.2, 1.7, -1.0);
      leaf(d, h[0] + 5, h[1] - h[2] - 5.5, 3.4, 1.8, 1.1);
      return { head: h, kind: 'deer', face: { mx: 0.62, my: 0.55, sep: 0.42, shift: 0.05 } };
    }
    if (st === 2) {
      leg(d, -3, -10, 10, 1.9, 16, 11);
      leg(d, 11, -10, 10, 1.9, 16, 11);
      leaf(d, 15, -19, 3.6, 1.6, 0.9);
      B(4, -14.5, 11.5, 5.6, 1);
      B(3, -11.5, 8.5, 2.4, 2);
      leg(d, -7, -10, 10, 2, 1, 11);
      leg(d, 8, -10, 10, 2, 1, 11);
      // 몸에 감긴 덩굴
      d.Cv([[-7, -18], [0, -11], [6, -18], [13, -12]], 1.3, 1, 14);
      for (const [x, y, r] of [[-3, -15, -0.6], [5, -16.5, 0.6], [11, -13, -0.4]] as [number, number, number][]) leaf(d, x, y - 1.5, 2.4, 1.2, r);
      E(-8.5, -21, 3.6, 6.5, 1, -0.45);
      const h: [number, number, number] = [-11.5, -28.5, 7];
      // 어린 나뭇가지 뿔
      for (const k of [-1, 1]) {
        const bx = h[0] + k * 2.5;
        Ln(bx, h[1] - 5, bx + k * 4, h[1] - 13, 1.3, 11);
        Ln(bx + k * 2.6, h[1] - 10, bx + k * 7, h[1] - 12, 1, 11);
        leaf(d, bx + k * 4, h[1] - 14.5, 2.2, 1.2, k * 0.5);
        leaf(d, bx + k * 7.6, h[1] - 12.5, 2, 1.1, k * 1.2);
      }
      for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 3], [h[0] + k * 10, h[1] - 6], [h[0] + k * 6, h[1]]], 1);
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('deer', h[0], h[1], h[2]);
      return { head: h, kind: 'deer' };
    }
    // 3단계: 숲의 왕
    leg(d, -3, -14, 14, 2.4, 16, 11);
    leg(d, 13, -14, 14, 2.4, 16, 11);
    d.Cv([[15, -22], [19, -24], [20, -19]], 2.5, 1.5, 14);
    B(5, -19, 13.5, 7.5, 1);
    B(4, -15, 10, 3, 2);
    leg(d, -8, -14, 14, 2.6, 1, 11);
    leg(d, 9, -14, 14, 2.6, 1, 11);
    // 다리 아래쪽은 나무껍질
    for (const x of [-8, 9]) for (let y = -7; y < -1; y += 2) Ln(x - 2, y, x + 2, y - 0.6, 0.6, 11, 1);
    // 목을 두른 이끼 갈기
    for (let i = 0; i < 9; i++) {
      const a = -2.6 + i * 0.32;
      E(-9 + Math.cos(a) * 5, -21 + Math.sin(a) * 6 + 4, 3, 3.6, 14);
    }
    E(-9.5, -26, 4.2, 7, 1, -0.4);
    for (let i = 0; i < 5; i++) E(-11 + i * 1.6, -19.5 + (i % 2) * 1.2, 2.4, 3, 14);
    const h: [number, number, number] = [-13, -34, 7.2];
    // 고목 뿔: 굵은 줄기 + 가지 + 잎 뭉치 + 꽃
    for (const k of [-1, 1]) {
      const bx = h[0] + k * 2.6;
      const by = h[1] - 5;
      d.Cv([[bx, by], [bx + k * 4, by - 7], [bx + k * 3, by - 14], [bx + k * 7, by - 19]], 2, 1.2, 11);
      Ln(bx + k * 3.6, by - 6, bx + k * 10, by - 9, 1.2, 11);
      Ln(bx + k * 3.4, by - 12, bx + k * 9, by - 15, 1, 11);
      for (const [lx, ly, r] of [[bx + k * 7.5, by - 20, 3.4], [bx + k * 10.5, by - 10, 2.8], [bx + k * 9.5, by - 16, 2.6], [bx + k * 2, by - 16, 2.4]] as [number, number, number][]) {
        E(lx, ly, r + 0.8, r, 14);
        E(lx - 0.6, ly - 0.6, r * 0.55, r * 0.45, 14);
      }
      blossom(d, bx + k * 8.5, by - 21.5, 1.3);
      blossom(d, bx + k * 11.5, by - 11, 1.1);
      blossom(d, bx + k * 1.5, by - 17.5, 1);
    }
    for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 3], [h[0] + k * 10, h[1] - 5], [h[0] + k * 6, h[1] + 0.5]], 1);
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('deer', h[0], h[1], h[2]);
    return { head: h, kind: 'deer' };
  },

  // 불씨쥐 → 화로담비 → 용광범: 꼬리 불씨 아기쥐 → 등에 불꽃 줄무늬 담비 → 불꽃 갈기의 두 발 범 무사
  1: (d) => {
    const { E, B, st } = d;
    if (st === 1) {
      d.Cv([[8, -6], [13, -9], [14, -15]], 1.6, 1.1, 1);
      flame(d, 14.2, -15, 8, 3, 0.6);
      E(-2, -2.2, 2.2, 2.2, 16);
      E(6, -2.2, 2.2, 2.2, 16);
      B(2, -8, 8, 6.2, 1);
      B(1, -6, 5.5, 3.4, 2);
      E(-5, -2, 2.3, 2, 1);
      E(3, -2, 2.3, 2, 1);
      const h: [number, number, number] = [-5, -14.5, 8.4];
      for (const k of [-1, 1]) {
        E(h[0] + k * 6, h[1] - 6.5, 4, 4, 1);
        E(h[0] + k * 6, h[1] - 6.3, 2.3, 2.3, 18);
      }
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('rodent', h[0], h[1], h[2]);
      return { head: h, kind: 'rodent' };
    }
    if (st === 2) {
      // 긴 꼬리 불꽃
      d.Cv([[12, -11], [17, -13], [19, -19]], 3, 2.2, 1);
      flame(d, 19, -19, 13, 4.5, 1);
      E(-4, -3.5, 2.2, 3, 16);
      E(10, -3.5, 2.2, 3, 16);
      B(3, -10, 12.5, 5, 1);
      B(2, -7.6, 9.5, 2.2, 2);
      // 등 위 불꽃 줄무늬
      for (const [x, h] of [[-2, 5], [3, 6.5], [8, 5]] as Pt[]) flame(d, x, -14, h, 2, 1.2);
      for (const x of [-1, 4, 9]) d.Ln(x - 1, -13.6, x + 1, -9.5, 0.9, 21, 1);
      E(-8, -3.5, 2.3, 3, 1);
      E(7, -3.5, 2.3, 3, 1);
      E(-9, -13, 4.6, 5, 1);
      const h: [number, number, number] = [-12, -18.5, 6.8];
      for (const k of [-1, 1]) d.P([[h[0] + k * 2.5, h[1] - 4], [h[0] + k * 6.5, h[1] - 11], [h[0] + k * 6.5, h[1] - 2]], 1);
      d.P([[h[0] - 4.5, h[1] - 4], [h[0] - 6, h[1] - 9], [h[0] - 5.8, h[1] - 3]], 18);
      E(h[0], h[1], h[2], h[2] * 0.88, 1);
      d.muzzle('cat', h[0], h[1], h[2]);
      return { head: h, kind: 'cat' };
    }
    // 3단계: 두 발로 선 불꽃 범 무사
    d.Cv([[7, -10], [14, -12], [17, -20]], 3, 2, 1);
    flame(d, 17, -20, 11, 4, 1);
    for (const k of [-1, 1]) {
      E(k * 5.5, -6, 4.6, 6, 1);
      E(k * 6 - 1.3, -1.2, 5.4, 2, 1);
      for (const t of [-2, 0, 2]) d.set(k * 6 - 1.3 + t - 1.5, -0.4, 16);
    }
    B(0, -17, 10.5, 10.5, 1);
    B(0, -24, 9, 6, 1);
    B(-0.5, -15.5, 6.5, 7.5, 2);
    // 범 줄무늬
    for (const [x1, y1, x2, y2] of [[-10, -22, -6, -20], [-10, -17, -6, -16], [9, -22, 6, -20], [9, -17, 6, -16]] as number[][]) d.Ln(x1, y1, x2, y2, 1.1, 21, 1);
    const fr = d.frame === 1 ? 0.8 : 0;
    // 팔: 불꽃 주먹 + 금 팔찌
    for (const k of [-1, 1]) {
      const ax = k * 12.5;
      E(ax, -19 - fr, 3.6, 6.2, 1, k * -0.35);
      E(ax + k * 1.2, -13 - fr, 3.9, 3.5, 1);
      E(ax + k * 0.9, -15.6 - fr, 3.7, 1.2, 12);
      flame(d, ax + k * 2.6, -14 - fr, 6, 2.6, k * 1.2);
      d.Ln(ax - 1.5, -22 - fr, ax + 1.5, -21 - fr, 1, 21, 1);
    }
    const h: [number, number, number] = [0, -36, 8.4];
    flameRing(d, h[0], h[1], h[2], 9, 4.5);
    for (const k of [-1, 1]) E(h[0] + k * 6.2, h[1] - 6, 2.6, 2.6, 1);
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    // 이마 줄무늬
    for (const dx of [-2.5, 0, 2.5]) d.Ln(h[0] + dx, h[1] - h[2] + 0.5, h[0] + dx * 0.8, h[1] - h[2] + 3.5, 1, 21, 1);
    d.muzzle('tiger', h[0], h[1], h[2]);
    return { head: h, kind: 'tiger', body: 'biped' };
  },

  // 물방울개구 → 개울두꺼 → 폭포두꺼비: 물방울 볏 아기개구리 → 물주머니 두꺼비 → 등에서 폭포를 뿜는 거대 두꺼비
  2: (d) => {
    const { E, P, B, st } = d;
    if (st === 1) {
      for (const k of [-1, 1]) {
        E(k * 6, -2.6, 3.8, 2.6, 1);
        E(k * 7.6 - 1, -0.8, 3, 1.2, 1);
      }
      B(0, -7.5, 8, 6.2, 1);
      B(-0.5, -6.5, 5.5, 4.4, 2);
      swirl(d, -0.5, -6.5, 3.6, 19);
      for (const k of [-1, 1]) E(k * 6.5, -6, 1.8, 2.6, 1, k * 0.4);
      const h: [number, number, number] = [0, -14.5, 7.4];
      // 물방울 볏
      E(h[0] + 0.5, h[1] - h[2] - 2.5, 3, 3, 19);
      P([[h[0] - 2, h[1] - h[2] - 3.5], [h[0] + 2.5, h[1] - h[2] - 10], [h[0] + 3, h[1] - h[2] - 3.5]], 19);
      E(h[0] - 0.5, h[1] - h[2] - 3.5, 1.1, 1.4, 20);
      frogHead(d, h);
      return { head: h, kind: 'frog', face: { ey: -0.5 } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) {
        E(k * 9, -4, 5, 3.6, 1);
        E(k * 10.5 - 1.5, -1, 4.2, 1.5, 1);
      }
      B(0, -10.5, 11, 8.5, 1);
      for (const [x, y] of [[5, -15], [8, -11], [2, -17], [9, -15.5]] as Pt[]) E(x, y, 1.3, 1.1, 16, 0, 1);
      B(-1, -9, 7.5, 6.2, 2);
      swirl(d, -1, -9, 5, 19);
      for (const k of [-1, 1]) {
        E(k * 9.5, -9.5, 2.6, 4.2, 1, k * 0.4);
        for (const t of [-1.6, 0, 1.6]) E(k * 10.5 + t, -5.6, 1.1, 1.1, 1);
      }
      const h: [number, number, number] = [-1, -20.5, 8];
      frogHead(d, h);
      P([[h[0] + 1, h[1] - h[2] + 2], [h[0] + 6, h[1] - h[2] - 6], [h[0] + 8, h[1] - h[2] + 3]], 19);
      d.Ln(h[0] + 3, h[1] - h[2], h[0] + 6, h[1] - h[2] - 4, 0.6, 20, 19);
      return { head: h, kind: 'frog', face: { ey: -0.52 } };
    }
    // 3단계: 폭포 두꺼비
    spout(d, -8, -24, 14, 3);
    spout(d, 9, -25, 16, 3.3);
    for (const k of [-1, 1]) {
      E(k * 11, -5, 6.2, 4.6, 1);
      E(k * 13 - 2, -1.2, 5.4, 1.8, 1);
    }
    B(0, -14, 14.5, 11, 1);
    for (const [x, y, r] of [[6, -20, 1.6], [10, -15, 1.3], [-8, -21, 1.4], [12, -20, 1.2], [3, -23, 1.2]] as [number, number, number][]) {
      E(x, y, r, r * 0.9, 16, 0, 1);
      d.set(x - 0.5, y - 0.5, 15);
    }
    B(-1, -12, 9.5, 8, 2);
    swirl(d, -1, -12, 6.6, 19);
    // 굵은 팔과 물갈퀴
    for (const k of [-1, 1]) {
      E(k * 13.5, -14, 3.8, 6.4, 1, k * 0.35);
      for (const t of [-2.2, 0, 2.2]) E(k * 14.5 + t, -8, 1.5, 1.4, 1);
    }
    const h: [number, number, number] = [-2, -28, 8.6];
    frogHead(d, h);
    return { head: h, kind: 'frog', face: { ey: -0.5 } };
  },

  // 아기용 → 비늘용 → 하늘용왕
  28: (d) => {
    const { E, P, B, Ln, st, up } = d;
    if (st === 1) {
      d.Cv([[6, -4], [12, -3], [15, -7]], 3, 1.4, 1);
      for (const k of [-1, 1]) P([[k * 4, -13], [k * 11, -19 + up], [k * 10, -12 + up], [k * 7, -10]], 4);
      for (const k of [-1, 1]) {
        E(k * 4.5, -2.8, 3.6, 3, 1);
        E(k * 5 - 1, -0.8, 3.8, 1.4, 1);
      }
      B(0, -8, 8, 7, 1);
      B(-0.5, -7, 5, 5.2, 2);
      for (let i = 0; i < 3; i++) Ln(-4, -9.5 + i * 2.5, 3, -9.5 + i * 2.5, 0.5, 16, 2);
      for (const k of [-1, 1]) E(k * 7, -8, 2, 3.4, 1, k * 0.5);
      const h: [number, number, number] = [-1.5, -17, 8.2];
      for (const k of [-1, 1]) P([[h[0] + k * 2.5, h[1] - h[2] + 1.5], [h[0] + k * 4, h[1] - h[2] - 3], [h[0] + k * 5, h[1] - h[2] + 2]], 12);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('lizard', h[0], h[1], h[2] * 0.75);
      return { head: h, kind: 'lizard', face: { mx: 0.45, my: 0.46, mouth: 'smile', blush: true } };
    }
    if (st === 2) {
      // 날렵한 몸, 긴 목과 꼬리
      d.Cv([[10, -10], [18, -8], [22, -14], [20, -20]], 3.2, 1.2, 1);
      P([[19, -21], [23, -24], [21, -18]], 3);
      for (const k of [-1, 1]) P([[k * 3 + 2, -18], [k * 13 + 2, -28 + up], [k * 15 + 2, -20 + up], [k * 9 + 2, -13]], 4);
      E(-3, -4.5, 2.6, 4, 16);
      E(9, -4.5, 2.6, 4, 16);
      B(3, -12, 10, 6.5, 1);
      B(2, -10, 7, 3, 2);
      for (let i = 0; i < 4; i++) P([[8 - i * 4, -17.5], [7 - i * 4, -21], [6 - i * 4, -17]], 3);
      E(-7, -4.5, 2.8, 4, 1);
      E(6, -4.5, 2.8, 4, 1);
      d.Cv([[-4, -14], [-8, -20], [-9, -25]], 4, 3.2, 1);
      const h: [number, number, number] = [-10, -28, 6.6];
      for (const k of [-1, 1]) d.Cv([[h[0] + k * 2, h[1] - 4], [h[0] + k * 5 + 3, h[1] - 9], [h[0] + k * 6 + 6, h[1] - 10]], 1.6, 0.8, 12);
      for (const k of [-1, 1]) P([[h[0] + k * 5, h[1]], [h[0] + k * 10, h[1] - 3], [h[0] + k * 6, h[1] + 2]], 3);
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    // 3단계: 하늘의 왕
    d.Cv([[8, -10], [17, -6], [22, -12], [21, -21]], 4.5, 1.6, 1);
    P([[20, -21], [25, -27], [23, -19], [26, -17]], 3);
    for (const k of [-1, 1]) {
      const bx = k * 6;
      const tip: Pt = [k * 25, -46 + up];
      P([[bx, -28], tip, [k * 23, -26 + up], [k * 17, -30 + up], [k * 14, -20 + up], [k * 9, -23], [bx, -18]], 4);
      Ln(bx, -28, tip[0], tip[1], 1.5, 1);
      Ln(k * 15, -38 + up, k * 17, -30 + up, 0.9, 1);
      Ln(k * 10, -33 + up, k * 14, -20 + up, 0.9, 1);
    }
    for (const k of [-1, 1]) {
      E(k * 6, -6.5, 5, 6.5, 1);
      E(k * 6.5 - 1.5, -1.2, 5.6, 2, 1);
      for (const t of [-2, 0, 2]) d.set(k * 6.5 - 1.5 + t - 1.6, -0.3, 9);
    }
    B(1, -18, 11.5, 12, 1);
    B(-1, -16, 7, 9.5, 2);
    for (let i = 0; i < 5; i++) Ln(-6, -22 + i * 3, 4, -22 + i * 3, 0.6, 16, 2);
    for (const k of [-1, 1]) {
      E(k * 12, -21, 3.4, 6, 1, k * -0.6);
      for (const t of [-1.5, 0, 1.5]) Ln(k * 14 + t, -16, k * 14.5 + t, -13.5, 0.7, 9);
    }
    const h: [number, number, number] = [-4, -36, 8];
    // 갈기
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + i * 0.15);
      P([[h[0] + Math.cos(a) * 5, h[1] + Math.sin(a) * 5 + 2], [h[0] + Math.cos(a) * 13 + 3, h[1] + Math.sin(a) * 11 + 2], [h[0] + Math.cos(a + 0.22) * 5, h[1] + Math.sin(a + 0.22) * 5 + 2]], 3);
    }
    for (const k of [-1, 1]) d.Cv([[h[0] + k * 2.5, h[1] - 5], [h[0] + k * 4 + 5, h[1] - 12], [h[0] + k * 5 + 11, h[1] - 13]], 2.2, 0.8, 12);
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    // 턱수염
    d.Cv([[h[0] - 8, h[1] + 5], [h[0] - 10, h[1] + 10], [h[0] - 8, h[1] + 14]], 1.2, 0.6, 3);
    return { head: h, kind: 'lizard' };
  },

  // 금빛봉황: 활짝 편 불꽃 날개, 깃털 왕관, 길게 늘어진 꼬리깃
  64: (d) => {
    const { E, P, B, Ln, up } = d;
    // 꼬리깃 세 가닥 (끝에 눈 무늬)
    for (const [ex, ey, w] of [[22, -4, 2], [18, 2, 1.8], [25, -12, 1.6]] as [number, number, number][]) {
      d.Cv([[5, -14], [12, -10], [ex, ey]], w, 1, 3);
      E(ex, ey, 2.8, 2.4, 12);
      E(ex, ey, 1.4, 1.2, 4);
    }
    // 날개: 넓은 날개판 + 끝이 갈라진 불꽃 깃
    for (const k of [-1, 1]) {
      const sh: Pt = [k * 4, -21];
      const tip: Pt = [k * 26, -40 + up];
      const pts: Pt[] = [sh, [k * 12, -33 + up * 0.6], tip];
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = tip[0] + (k * 6 - tip[0]) * t;
        const y = tip[1] + (-13 - tip[1]) * t + 6 + Math.sin(t * Math.PI) * 4;
        pts.push([x + k * 1.5, y + 3], [x - k * 1.5, y - 1]);
      }
      pts.push([k * 5, -14]);
      P(pts, 18);
      P([sh, [k * 12, -32 + up * 0.6], tip, [k * 18, -30 + up * 0.6], [k * 9, -22]], 1);
      P([sh, [k * 11, -30 + up * 0.6], [k * 15, -28 + up * 0.6], [k * 7, -20]], 3);
      for (let i = 0; i < 4; i++) d.set(k * (12 + i * 3.5), -26 + i * 2 + up * 0.6, 13);
    }
    Ln(-2, -6, -3, 0, 1, 12);
    Ln(2, -6, 3, 0, 1, 12);
    B(0, -13, 7.5, 8.5, 1);
    B(-1.5, -12, 4.6, 6, 2);
    d.Cv([[-1, -18], [-4, -24], [-6, -28]], 4, 3.2, 1);
    const h: [number, number, number] = [-6.5, -31, 5.8];
    // 왕관 깃 세 가닥
    for (const [dx, hh] of [[-2.5, 7], [0.5, 10], [3.5, 7.5]] as Pt[]) {
      d.Cv([[h[0] + dx * 0.4, h[1] - 4], [h[0] + dx, h[1] - 4 - hh * 0.6], [h[0] + dx * 1.4 + 1, h[1] - 4 - hh]], 1.2, 0.6, 12);
      E(h[0] + dx * 1.4 + 1, h[1] - 4 - hh, 1.5, 1.5, 3);
    }
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    P([[h[0] - 4.2, h[1] - 0.5], [h[0] - 10, h[1] + 1.5], [h[0] - 4.2, h[1] + 2.5]], 12);
    return { head: h, kind: undefined, body: 'bird', face: { mouth: 'beak', blush: false, eyeK: 0.95, calm: true } };
  },

  // 은빛해룡: 은빛 긴 몸, 지느러미 등, 금빛 뿔과 긴 수염, 구름
  65: (d) => {
    const { E, P, Ln } = d;
    const pts: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      pts.push([17 - t * 26 + Math.sin(t * Math.PI * 2.2 + (d.frame ? 0.35 : 0)) * 8, -3 - t * 34]);
    }
    // 등지느러미
    pts.forEach(([x, y], i) => i % 2 === 0 && i > 1 && i < 17 && P([[x - 1.5, y - 2.5], [x + 2.5, y - 7 - (i % 4) * 0.8], [x + 2.5, y - 1.5]], 3));
    pts.forEach(([x, y], i) => E(x, y, 3.2 + i * 0.22, 3.2 + i * 0.22, 1));
    pts.forEach(([x, y], i) => i % 2 === 0 && E(x - 0.5, y + 1.6, 1.6 + i * 0.1, 1.1, 2));
    P([[17, -3], [24, -7], [22, -1], [25, 3]], 3);
    // 앞발
    const [ax, ay] = pts[11];
    E(ax - 4, ay + 3, 2, 3.4, 1, 0.5);
    for (const t of [-1, 0, 1]) Ln(ax - 5 + t, ay + 6, ax - 5.5 + t, ay + 7.5, 0.6, 12);
    const h: [number, number, number] = [pts[18][0] - 2, pts[18][1] - 3, 7.4];
    for (const k of [-1, 1]) {
      d.Cv([[h[0] + k * 2, h[1] - 5], [h[0] + k * 3 + 3, h[1] - 12], [h[0] + k * 2 + 7, h[1] - 17]], 1.5, 0.8, 12);
      Ln(h[0] + k * 2.6 + 3, h[1] - 11, h[0] + k * 5 + 7, h[1] - 12, 0.9, 12);
    }
    for (const k of [-1, 1]) P([[h[0] + k * 5, h[1]], [h[0] + k * 10, h[1] - 3], [h[0] + k * 6.5, h[1] + 2.5]], 3);
    E(h[0], h[1], h[2], h[2] * 0.84, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    // 긴 수염 두 가닥
    d.Cv([[h[0] - 8, h[1] + 1], [h[0] - 14, h[1] + 4], [h[0] - 12, h[1] + 12]], 0.9, 0.6, 12);
    d.Cv([[h[0] - 7, h[1] + 3], [h[0] - 10, h[1] + 9], [h[0] - 15, h[1] + 13]], 0.9, 0.6, 12);
    // 구름
    for (const [cx, cy] of [[-14, -6], [16, -26]] as Pt[]) for (const [dx, dy, r] of [[0, 0, 3], [3.5, -1, 3.6], [7, 0, 2.8]] as [number, number, number][]) E(cx + dx, cy + dy, r, r * 0.8, 5);
    return { head: h, kind: 'lizard', face: { calm: true } };
  },

  // 달빛구미: 앉은 흰 여우, 부채처럼 펼친 아홉 꼬리, 이마의 초승달, 방울
  66: (d) => {
    const { E, P, B, Ln } = d;
    const sw = d.frame === 1 ? 1 : 0;
    // 아홉 꼬리: 엉덩이에서 위로 부채처럼
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.12 + i * 0.1);
      const L = 17 + Math.sin((i / 8) * Math.PI) * 5;
      const bx = 9;
      const by = -7;
      const ex = bx - Math.cos(a) * L * -1 + 4;
      const ey = by + Math.sin(a) * L;
      const mx = bx + (ex - bx) * 0.45 + sw * (i % 2 ? 1 : -1);
      const my = by + (ey - by) * 0.45 + 3;
      d.Cv([[bx, by], [mx, my], [ex, ey]], 2.4, 3.6, i % 2 ? 16 : 1);
      E(ex, ey, 2.2, 2.2, 15);
    }
    B(3, -8, 8.5, 7, 1);
    E(-4, -13, 6, 8.5, 1);
    E(-4.5, -12, 4, 6, 2);
    for (const x of [-7, -2]) {
      E(x, -5, 2, 5, 1);
      E(x - 0.8, -1.2, 2.6, 1.5, 1);
    }
    // 방울
    E(-5, -19, 4.5, 1.2, 4);
    E(-5.5, -17, 2.2, 2.2, 12);
    d.set(-5.5, -16, 6);
    const h: [number, number, number] = [-7, -25, 7.4];
    for (const k of [-1, 1]) {
      P([[h[0] + k * 2, h[1] - 4], [h[0] + k * 6.5, h[1] - 14], [h[0] + k * 7.5, h[1] - 2]], 1);
      P([[h[0] + k * 3, h[1] - 4], [h[0] + k * 6.2, h[1] - 11], [h[0] + k * 6.6, h[1] - 3]], 7);
    }
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('dog', h[0], h[1], h[2] * 0.9);
    // 이마의 초승달
    E(h[0] - 0.5, h[1] - h[2] + 2.6, 2.2, 2.2, 12);
    E(h[0] + 0.6, h[1] - h[2] + 2, 1.9, 1.9, 1, 0, 12);
    Ln(h[0] - 5, h[1] + 1, h[0] - 2, h[1] + 0.5, 0.6, 7, 1);
    return { head: h, kind: 'dog', face: { mx: 0.75, my: 0.6 } };
  },
  // 털뭉치 → 솜털곰 → 구름곰: 털 공 → 복슬곰 → 구름을 두른 하늘 곰
  3: (d) => {
    const { E, st } = d;
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 4.5, -1.5, 3, 1.8, 16);
      fluff(d, 0, -10, 10.5, 9, 1, 14, 2.4);
      const h: [number, number, number] = [-1, -11, 8];
      for (const k of [-1, 1]) {
        E(h[0] + k * 7, h[1] - 7.5, 2.8, 2.8, 1);
        E(h[0] + k * 7, h[1] - 7.5, 1.4, 1.4, 7);
      }
      E(h[0] - 1, h[1] + 2.5, 4.5, 3, 2);
      E(h[0] - 1.6, h[1] + 1, 1.3, 0.9, 6);
      return { head: h, face: { ey: -0.25, my: 0.5, mx: 0.18 } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) E(k * 6, -2.5, 4.5, 2.8, 1);
      fluff(d, 1, -12, 11, 10, 1, 14, 2.6);
      fluff(d, -1, -10, 6.5, 6.5, 2, 10, 1.6);
      for (const k of [-1, 1]) fluff(d, k * 11, -13, 3.2, 4.2, 1, 6, 1.6);
      const h: [number, number, number] = [-1, -25, 8.2];
      for (const k of [-1, 1]) {
        E(h[0] + k * 6.5, h[1] - 6.5, 3.2, 3.2, 1);
        E(h[0] + k * 6.5, h[1] - 6.3, 1.7, 1.7, 7);
      }
      fluff(d, h[0], h[1], h[2], h[2] * 0.92, 1, 12, 1.6);
      d.muzzle('bear', h[0], h[1], h[2]);
      return { head: h, kind: 'bear' };
    }
    // 3단계: 구름 위에 앉은 곰
    const bob = d.frame === 1 ? -0.6 : 0;
    for (const [x, y, r] of [[-14, -3, 5], [-6, -2, 6.5], [4, -2, 7], [13, -3, 5.5], [19, -6, 3.8], [-19, -6, 3.5]] as [number, number, number][]) E(x, y + bob, r, r * 0.75, 5);
    fluff(d, 2, -17 + bob, 13, 11.5, 1, 16, 3);
    fluff(d, 0, -14 + bob, 7.5, 7.5, 2, 12, 1.8);
    for (const k of [-1, 1]) fluff(d, k * 13.5, -18 + bob, 3.8, 5.4, 1, 7, 1.8);
    for (const [x, y] of [[-10, -28], [12, -30], [16, -16]] as Pt[]) for (const [dx, r] of [[0, 2.6], [2.8, 3], [5.4, 2.2]] as Pt[]) E(x + dx, y + bob, r, r * 0.8, 5);
    // 방울 목걸이
    E(-1, -24 + bob, 7, 1.2, 4);
    E(-1.5, -22 + bob, 2.3, 2.3, 12);
    d.set(-1.5, -21 + bob, 6);
    const h: [number, number, number] = [-1, -32 + bob, 8.6];
    for (const k of [-1, 1]) {
      E(h[0] + k * 7, h[1] - 7, 3.4, 3.4, 1);
      E(h[0] + k * 7, h[1] - 6.8, 1.8, 1.8, 7);
    }
    fluff(d, h[0], h[1], h[2], h[2] * 0.92, 1, 12, 1.8);
    d.muzzle('bear', h[0], h[1], h[2]);
    return { head: h, kind: 'bear', face: { calm: true } };
  },

  // 참새콩 → 바람까치 → 폭풍매
  4: (d) => {
    const { E, P, B, Ln, st, up } = d;
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      P([[6, -9], [13, -12], [12, -8], [14, -6], [7, -6]], 16);
      B(0, -10, 8.5, 7.5, 1);
      B(-1.5, -8, 5.2, 4.5, 2);
      foldWing(d, 0, -12, 9, 16, 21);
      const h: [number, number, number] = [-3, -17, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      // 볼 무늬와 머리 깃 한 가닥
      E(h[0] - 3.5, h[1] + 2.6, 2.2, 1.8, 2);
      d.Cv([[h[0] + 1, h[1] - h[2] + 1], [h[0] + 2, h[1] - h[2] - 3], [h[0] + 5, h[1] - h[2] - 4]], 1.3, 0.7, 16);
      P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.45, h[1] + 1.6], [h[0] - h[2] * 0.7, h[1] + 3]], 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) Ln(k * 2.5, -5, k * 3, 0, 1, 6);
      // 긴 꼬리
      P([[6, -12], [24, -20], [25, -17], [7, -8]], 21);
      Ln(8, -10, 23, -18.5, 0.8, 19, 21);
      B(1, -13, 9, 8, 21);
      B(-1.5, -11, 6, 5.5, 5);
      openWing(d, 1, 3, -15, 15, 10 - up, 21, 5);
      const h: [number, number, number] = [-5, -21, 6.2];
      E(h[0], h[1], h[2], h[2] * 0.95, 21);
      P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.6, h[1] + 1.4], [h[0] - h[2] * 0.7, h[1] + 2.8]], 6);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    // 3단계: 폭풍매 - 날개를 활짝, 갈고리 부리, 바람 소용돌이
    for (const k of [-1, 1]) {
      Ln(k * 3, -6, k * 4, -1, 1.4, 12);
      for (const t of [-1, 0, 1]) Ln(k * 4, -1, k * 4 + t * 1.6 - 1, 0.4, 0.7, 6);
    }
    for (const k of [-1, 1]) openWing(d, k, k * 5, -24, 24, 16 - up, 1, 16);
    P([[4, -12], [14, -4], [10, -2], [16, 1], [2, -6]], 16);
    B(0, -16, 9.5, 10, 1);
    B(-1.5, -14, 6, 7.5, 2);
    for (let i = 0; i < 4; i++) Ln(-5, -18 + i * 2.6, 2, -18 + i * 2.6, 0.5, 16, 2);
    const h: [number, number, number] = [-4, -29, 6.8];
    // 뒤로 젖힌 볏
    for (let i = 0; i < 3; i++) P([[h[0] + 2, h[1] - 4 + i * 2], [h[0] + 13 - i * 1.5, h[1] - 9 + i * 3], [h[0] + 4, h[1] - 1 + i * 2]], i === 1 ? 3 : 16);
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    P([[h[0] - h[2] * 0.6, h[1] - 0.5], [h[0] - h[2] * 1.55, h[1] + 0.5], [h[0] - h[2] * 1.3, h[1] + 3.6], [h[0] - h[2] * 0.6, h[1] + 2.8]], 12);
    for (const [x, y] of [[-20, -10], [19, -8]] as Pt[]) d.Cv([[x, y], [x + 3, y - 3], [x + 6, y], [x + 4, y + 2]], 0.8, 0.6, 15);
    return { head: h, body: 'bird', face: { mouth: 'beak', blush: false } };
  },

  // 애벌콩 → 고치둥 → 비단나방
  5: (d) => {
    const { E, Ln, st, up } = d;
    if (st === 1) {
      const seg: [number, number, number][] = [[12, -4, 3.4], [7.5, -5, 3.9], [3, -6, 4.3], [-2, -7.5, 4.7]];
      for (const [x, y, r] of seg) {
        E(x, y, r, r, 1);
        E(x - 0.5, y + r * 0.55, r * 0.7, r * 0.35, 2);
        E(x + 0.5, -1, 1.2, 1.2, 16);
        d.set(x + 0.5, y - r * 0.5, 12);
      }
      const h: [number, number, number] = [-6, -13, 7];
      for (const k of [-1, 1]) {
        Ln(h[0] + k * 2, h[1] - 5, h[0] + k * 4 - 1, h[1] - 11, 0.8, 21);
        E(h[0] + k * 4 - 1, h[1] - 11.5, 1.4, 1.4, 3);
      }
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      return { head: h };
    }
    if (st === 2) {
      // 매달린 고치: 실 + 비단 감은 몸 + 빼꼼 얼굴
      Ln(2, -48, 1, -36, 0.7, 5);
      E(1, -20, 9, 15, 2);
      for (let i = 0; i < 7; i++) Ln(-8, -31 + i * 4, 9, -29 + i * 4 - 2, 0.7, 15, 2);
      E(0, -22, 6, 6, 1);
      const h: [number, number, number] = [0, -22, 5.4];
      for (const k of [-1, 1]) E(k * 7, -10, 2.4, 3, 2);
      return { head: h, face: { calm: true, ey: -0.05 } };
    }
    // 3단계: 비단나방
    for (const k of [-1, 1]) {
      E(k * 13, -27 + up, 12, 9, 1, k * 0.35);
      E(k * 11, -12 + up * 0.5, 8, 6, 1, k * -0.25);
      E(k * 13.5, -28 + up, 4.5, 4, 3);
      E(k * 13.5, -28 + up, 2.2, 2, 4);
      d.set(k * 13 - 0.8, -29 + up, 9);
      E(k * 11, -12 + up * 0.5, 3, 2.4, 15);
      for (let i = 0; i < 4; i++) d.set(k * (7 + i * 4), -35 + up + i * 0.8, 15);
    }
    fluff(d, 0, -16, 6, 9, 2, 10, 1.6);
    for (let i = 0; i < 3; i++) Ln(-4, -12 + i * 3, 4, -12 + i * 3, 0.5, 15, 2);
    const h: [number, number, number] = [0, -27, 6];
    fluff(d, 0, -22, 5, 2.5, 5, 8, 1.4);
    // 깃털 더듬이
    for (const k of [-1, 1]) {
      d.Cv([[k * 2, -32], [k * 5, -38], [k * 9, -41]], 0.8, 0.6, 12);
      for (let i = 0; i < 4; i++) Ln(k * (3 + i * 1.6), -34 - i * 1.8, k * (5 + i * 1.6), -33 - i * 1.6, 0.5, 12);
    }
    E(h[0], h[1], h[2], h[2] * 0.95, 2);
    return { head: h, face: { calm: true } };
  },

  // 침벌레 → 독침벌 → 여왕침벌
  6: (d) => {
    const { E, P, Ln, st, up } = d;
    if (st === 1) {
      const seg: [number, number, number][] = [[12, -3.5, 3], [7.5, -4.5, 3.6], [3, -5.5, 4], [-1.5, -7, 4.4]];
      for (const [x, y, r] of seg) {
        E(x, y, r, r, 1);
        d.Ln(x - 1, y - r, x - 1, y + r, 1, 21, 1);
      }
      P([[16, -3], [13, -5], [13, -2]], 12);
      const h: [number, number, number] = [-5, -12, 6.6];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      // 머리 침
      P([[h[0] - 1.5, h[1] - h[2] + 1], [h[0] + 0.5, h[1] - h[2] - 7], [h[0] + 2.5, h[1] - h[2] + 1]], 3);
      return { head: h };
    }
    // 벌: 줄무늬 배, 침, 투명 날개
    const q = st === 3;
    for (const k of [-1, 1]) bugWing(d, k * (q ? 8 : 6) + 3, (q ? -30 : -22) + up, q ? 11 : 8, q ? 4.5 : 3.4, k * 0.5);
    if (q) for (const k of [-1, 1]) bugWing(d, k * 6 + 4, -22 + up, 7, 3, k * 1.1);
    const ax = q ? 9 : 7;
    const ay = q ? -13 : -10;
    const ar = q ? 8 : 6;
    E(ax, ay, ar * 1.1, ar * 0.85, 1, 0.5);
    for (let i = -1; i <= 1; i++) d.Ln(ax + i * ar * 0.5 - 2, ay - ar, ax + i * ar * 0.5 + 2, ay + ar, 1.4, 21, 1);
    P([[ax + ar * 0.9, ay + ar * 0.5], [ax + ar * 1.6 + 2, ay + ar * 1.3 + 2], [ax + ar * 0.5, ay + ar * 0.85]], 12);
    E(-1, ay - 3, 4.5, 4.5, 1);
    for (const k of [-1, 1]) for (const [dx, dy] of [[-3, 0], [0, 1], [3, 0]] as Pt[]) Ln(dx - 1, ay + dy, dx - 3 + k, ay + dy + 7, 0.7, 21);
    if (q) {
      // 여왕: 앞팔 창
      for (const k of [-1, 1]) {
        Ln(-3 + k * 3, ay - 4, -6 + k * 3, ay - 12, 1, 21);
        P([[-7 + k * 3, ay - 12], [-6 + k * 3, ay - 20], [-5 + k * 3, ay - 12]], 12);
      }
    }
    const h: [number, number, number] = [-4, ay - 11, q ? 7 : 6.6];
    for (const k of [-1, 1]) {
      Ln(h[0] + k * 2, h[1] - 5, h[0] + k * 5 - 2, h[1] - 11, 0.7, 21);
      E(h[0] + k * 5 - 2, h[1] - 11.5, 1.2, 1.2, 21);
    }
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    if (q) {
      P([[h[0] - 4.5, h[1] - h[2] + 2], [h[0] - 4.5, h[1] - h[2] - 3], [h[0] - 2, h[1] - h[2]], [h[0], h[1] - h[2] - 4], [h[0] + 2, h[1] - h[2]], [h[0] + 4.5, h[1] - h[2] - 3], [h[0] + 4.5, h[1] - h[2] + 2]], 12);
      E(h[0], h[1] - h[2] + 0.5, 1, 1, 8);
    }
    return { head: h };
  },

  // 다람콩 → 줄무늬람 → 대장다람
  7: (d) => {
    const { E, P, B, Ln, st } = d;
    const tail = (x: number, y: number, k: number) => {
      // 크게 말린 복슬 꼬리
      const pts: Pt[] = [[x, y], [x + 5 * k, y - 2 * k], [x + 8 * k, y - 7 * k], [x + 7 * k, y - 13 * k], [x + 3 * k, y - 16 * k], [x - 1 * k, y - 15 * k]];
      pts.forEach(([px, py], i) => fluff(d, px, py, (2.2 + i * 0.5) * k, (2.2 + i * 0.5) * k, 1, 6, 0.9 * k));
      d.Cv([[x + 3 * k, y - 3 * k], [x + 6.5 * k, y - 8 * k], [x + 5 * k, y - 13 * k]], 1.6 * k, 1.2 * k, 2);
    };
    if (st === 1) {
      tail(7, -5, 0.9);
      for (const k of [-1, 1]) E(k * 3.5 - 1, -1.5, 2.6, 1.8, 1);
      B(0, -8, 6.5, 6, 1);
      B(-1, -7, 4, 4, 2);
      // 도토리를 꼭 안고
      E(-3, -8, 2.4, 2.6, 11);
      E(-3, -10, 2.8, 1.4, 16);
      const h: [number, number, number] = [-2, -15, 7.6];
      for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 5], [h[0] + k * 5, h[1] - 11], [h[0] + k * 7, h[1] - 4]], 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('rodent', h[0], h[1], h[2]);
      return { head: h, kind: 'rodent', face: { blush: true } };
    }
    if (st === 2) {
      tail(9, -7, 1.1);
      for (const x of [-4, 6]) E(x, -2.5, 2.4, 2.8, 16);
      B(1, -9, 9, 6, 1);
      for (const y of [-12.5, -10]) Ln(-6, y, 8, y + 0.4, 0.8, 21, 1);
      Ln(-6, -11.3, 8, -10.9, 0.6, 5, 1);
      B(0, -7, 6, 2.6, 2);
      for (const x of [-7, 3]) E(x, -2.5, 2.4, 2.8, 1);
      const h: [number, number, number] = [-7, -16, 6.8];
      for (const k of [-1, 1]) P([[h[0] + k * 2.6, h[1] - 4], [h[0] + k * 4.6, h[1] - 10], [h[0] + k * 6.2, h[1] - 3]], 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      Ln(h[0] + 1, h[1] - h[2] + 1, h[0] + 1, h[1] - 2, 0.8, 21, 1);
      d.muzzle('rodent', h[0], h[1], h[2]);
      return { head: h, kind: 'rodent' };
    }
    // 대장다람: 두 발로 서서 도토리 투구 + 나뭇가지 창
    tail(8, -10, 1.45);
    for (const k of [-1, 1]) {
      E(k * 4.5, -4, 3.6, 4.6, 1);
      E(k * 5 - 1.4, -1, 4.2, 1.6, 1);
    }
    B(0, -13, 8.5, 9, 1);
    B(-0.5, -12, 5.4, 6.5, 2);
    for (const y of [-19, -16.5]) Ln(4, y, 8, y + 2, 0.8, 21, 1);
    Ln(-13, -2, -10, -34, 1.3, 11);
    d.P([[-11.5, -34], [-9.5, -40], [-8.5, -33.5]], 12);
    E(-10.5, -17, 2.6, 2.6, 1);
    E(9, -15, 2.6, 4.2, 1, -0.4);
    const h: [number, number, number] = [-1, -27, 7.6];
    for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 5], [h[0] + k * 5, h[1] - 12], [h[0] + k * 7, h[1] - 4]], 1);
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    // 도토리 투구
    E(h[0] + 0.5, h[1] - h[2] + 1.5, h[2] * 0.9, 3.4, 11);
    for (let i = -3; i <= 3; i++) d.set(h[0] + 0.5 + i * 2, h[1] - h[2] + 1, 16);
    Ln(h[0] + 0.5, h[1] - h[2] - 1.5, h[0] + 1.5, h[1] - h[2] - 4, 1, 11);
    d.muzzle('rodent', h[0], h[1], h[2]);
    return { head: h, kind: 'rodent', face: { ey: 0, calm: true } };
  },

  // 찌릿쥐 → 번개쥐 → 천둥족제비: 볼에 푸른 전기 → 가시털 번개쥐 → 먹구름 갈기의 천둥 족제비
  8: (d) => {
    const { E, P, B, Ln, st } = d;
    const bolt = (x: number, y: number, k: number, c = 12) => P([[x, y], [x + 4 * k, y - 5 * k], [x + 2 * k, y - 5.6 * k], [x + 6 * k, y - 12 * k], [x + 3.4 * k, y - 6.4 * k], [x + 5.6 * k, y - 6 * k], [x + 1.2 * k, y + 0.8 * k]], c);
    if (st === 1) {
      bolt(7, -6, 1);
      for (const k of [-1, 1]) E(k * 3.5, -1.6, 2.4, 1.8, 16);
      B(0.5, -7.5, 7.5, 6, 1);
      B(-0.5, -6, 4.6, 3.6, 2);
      const h: [number, number, number] = [-3, -14.5, 7.8];
      for (const k of [-1, 1]) {
        P([[h[0] + k * 2.5, h[1] - 5], [h[0] + k * 6, h[1] - 13], [h[0] + k * 7.5, h[1] - 3]], 1);
        P([[h[0] + k * 5.4, h[1] - 9.5], [h[0] + k * 6, h[1] - 13], [h[0] + k * 6.8, h[1] - 9]], 21);
      }
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('rodent', h[0], h[1], h[2]);
      for (const k of [-1, 1]) E(h[0] + k * 5.4 - 0.8, h[1] + 3, 1.7, 1.5, 19);
      return { head: h, kind: 'rodent', face: { blush: false } };
    }
    if (st === 2) {
      bolt(10, -9, 1.4);
      for (const x of [-4, 7]) E(x, -3, 2.3, 3, 16);
      B(1.5, -9.5, 10, 6, 1);
      for (let i = 0; i < 5; i++) P([[-4 + i * 3.4, -14], [-2.5 + i * 3.4, -19 - (i % 2) * 1.5], [-1 + i * 3.4, -14]], 1);
      B(0, -7.5, 7, 2.6, 2);
      for (const x of [-7, 4]) E(x, -3, 2.3, 3, 1);
      const h: [number, number, number] = [-9, -16, 6.6];
      for (const k of [-1, 1]) P([[h[0] + k * 2.5, h[1] - 4], [h[0] + k * 6.4, h[1] - 11], [h[0] + k * 7, h[1] - 2]], 1);
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('dog', h[0], h[1], h[2] * 0.85);
      E(h[0] + 2, h[1] + 3, 1.6, 1.4, 19);
      return { head: h, kind: 'dog', face: { blush: false } };
    }
    // 천둥족제비: 길고 날렵한 몸, 먹구름 갈기, 갈라진 번개 꼬리
    bolt(13, -12, 1.7);
    bolt(14, -10, -1.2, 19);
    for (const x of [-5, 10]) E(x, -4, 2.6, 4, 16);
    B(2.5, -12.5, 12.5, 6.4, 1);
    B(1, -10, 9.5, 2.6, 2);
    for (const x of [-1, 4, 9]) Ln(x, -18, x + 2.5, -13, 1, 21, 1);
    for (const x of [-9, 6]) E(x, -4, 2.6, 4, 1);
    const h: [number, number, number] = [-13, -21, 6.8];
    // 먹구름 갈기 + 번쩍
    for (const [x, y, r] of [[-7, -20, 4.5], [-4, -25, 4], [-10, -27, 4.2], [-2, -19, 3.4]] as [number, number, number][]) E(x, y, r, r * 0.85, 16);
    for (const [x, y] of [[-5, -29], [0, -24]] as Pt[]) bolt(x, y, 0.6, 12);
    for (const k of [-1, 1]) P([[h[0] + k * 2.5, h[1] - 4], [h[0] + k * 6.4, h[1] - 12], [h[0] + k * 7, h[1] - 2]], 1);
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('dog', h[0], h[1], h[2] * 0.9);
    return { head: h, kind: 'dog' };
  },

  // 꽃봉오리 → 독꽃방울 → 독장미왕
  9: (d) => {
    const { E, P, B, Ln, st } = d;
    if (st === 1) {
      for (const k of [-1, 1]) leaf(d, k * 5, -2, 2, 4, k * 1.25);
      B(0, -8, 6.5, 6, 1);
      const h: [number, number, number] = [0, -9, 6];
      // 머리 위 꽃봉오리
      E(0.5, -17.5, 4.2, 5.2, 3);
      P([[-3.4, -16], [-1.5, -24], [0.5, -16]], 4);
      P([[0.5, -16], [2.5, -24.5], [4.4, -16]], 15);
      for (const k of [-1, 1]) leaf(d, k * 4, -14, 1.4, 3.2, k * 0.9);
      return { head: h };
    }
    if (st === 2) {
      for (const k of [-1, 1]) leaf(d, k * 7, -3, 2.4, 5, k * 1.2);
      B(0, -10, 8.5, 8, 1);
      for (const k of [-1, 1]) leaf(d, k * 10, -12, 2, 4.4, k * 0.6);
      const h: [number, number, number] = [0, -12, 7];
      // 머리 위 늘어진 방울꽃 셋, 독 방울
      for (const [x, y, rot] of [[-7, -24, -0.4], [0, -27, 0], [7, -24, 0.4]] as [number, number, number][]) {
        Ln(0, -18, x, y - 3, 0.8, 14);
        E(x, y, 3.4, 3.6, 3, rot);
        P([[x - 3.4, y + 1], [x - 2, y + 4.5], [x, y + 2.5], [x + 2, y + 4.5], [x + 3.4, y + 1]], 3);
        E(x, y + 6.5, 0.9, 1.3, 15);
      }
      return { head: h };
    }
    // 독장미왕: 머리에 큰 장미, 가시 덩굴 망토, 가시 채찍
    for (const k of [-1, 1]) leaf(d, k * 8, -4, 3, 6, k * 1.2);
    d.P([[-12, -26], [-15, -4], [15, -4], [12, -26]], 14);
    for (let i = 0; i < 5; i++) P([[-13 + i * 6.5, -5], [-11 + i * 6.5, -1], [-9 + i * 6.5, -5]], 14);
    for (const [x, y] of [[-12, -16], [12, -12], [-11, -8], [13, -22]] as Pt[]) P([[x - 1, y], [x + (x < 0 ? -3 : 3), y - 1.5], [x - 1, y - 2]], 12);
    B(0, -15, 8.5, 10, 1);
    B(0, -13, 5, 6.5, 2);
    // 가시 채찍
    d.Cv([[-9, -16], [-17, -12], [-19, -22], [-14, -30]], 1.2, 0.8, 14);
    for (const [x, y] of [[-17, -14], [-19, -21], [-16, -28]] as Pt[]) d.set(x - 1, y, 12);
    E(9, -17, 2.6, 5, 1, -0.4);
    const h: [number, number, number] = [0, -28, 7.4];
    E(h[0], h[1], h[2], h[2] * 0.94, 1);
    // 장미 왕관
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.05 + i * 0.15);
      E(h[0] + Math.cos(a) * 7, h[1] - 5 + Math.sin(a) * 4.5, 3.6, 3, i % 2 ? 3 : 4);
    }
    E(h[0], h[1] - 9, 4.4, 3.4, 3);
    d.Cv([[h[0] - 2.5, h[1] - 9], [h[0], h[1] - 11.5], [h[0] + 2.5, h[1] - 9], [h[0], h[1] - 7.5]], 0.8, 0.8, 4);
    return { head: h };
  },

  // 보라젤리 → 독늪젤 → 독수렁
  10: (d) => {
    const { E, P, Ln, st } = d;
    const bub = (x: number, y: number, r: number) => {
      E(x, y, r, r, 15);
      d.set(x - r * 0.4, y - r * 0.4, 9);
    };
    if (st === 1) {
      E(0, -6.5, 9, 6.8, 1);
      P([[-4, -10], [0.5, -20], [4.5, -10]], 1);
      E(-3, -9.5, 2.2, 1.5, 15);
      bub(5, -13, 1.4);
      bub(7.5, -17, 0.9);
      return { head: [0, -7, 7], face: { ey: -0.1, my: 0.55 } };
    }
    if (st === 2) {
      E(0, -3, 14, 3.6, 16);
      E(0, -9.5, 11, 9, 1);
      for (const [x, l] of [[-7, 5], [-2, 7], [6, 4.5], [9.5, 6]] as Pt[]) {
        Ln(x, -4, x, -4 + l * 0.2 + 2, 1.6, 1);
        E(x, -1 + l * 0.15, 1.3, 1.6, 1);
      }
      for (const k of [-1, 1]) {
        E(k * 12, -10, 3, 4.5, 1, k * 0.6);
        E(k * 13.5, -5.5, 1.2, 1.8, 15);
      }
      bub(-5, -16, 1.6);
      bub(6, -18, 1.2);
      bub(3, -21, 0.9);
      return { head: [0, -10, 8], face: { ey: -0.15 } };
    }
    // 독수렁: 거대한 진흙 더미, 부글부글 거품, 흘러내리는 팔
    E(0, -3, 21, 4.5, 16);
    E(0, -14, 15, 13, 1);
    for (const [x, y, r] of [[-9, -26, 5], [2, -29, 6], [10, -25, 4.5]] as [number, number, number][]) E(x, y, r, r * 0.8, 1);
    for (const k of [-1, 1]) {
      d.Cv([[k * 13, -18], [k * 20, -14], [k * 21, -6]], 5, 3.6, 1);
      for (const t of [-1.5, 0, 1.5]) E(k * 21 + t, -3.5, 1.1, 1.8, 1);
    }
    for (const [x, y, r] of [[-9, -32, 2], [3, -36, 2.4], [10, -31, 1.6], [-3, -34, 1.2], [14, -28, 1.1]] as [number, number, number][]) bub(x, y, r);
    for (const [x, y] of [[-8, -12], [7, -8], [10, -17]] as Pt[]) E(x, y, 1.8, 1.4, 16, 0, 1);
    return { head: [-1, -18, 9.5] };
  },

  // 두더콩 → 굴파두더 → 땅울림두더
  11: (d) => {
    const { E, P, B, Ln, st } = d;
    const claw = (x: number, y: number, k: number, sz: number) => {
      E(x, y, sz, sz * 0.8, 1);
      for (const t of [-1, 0, 1]) P([[x - sz * 0.8 + t * sz * 0.5, y + sz * 0.4], [x - sz * 1.4 + t * sz * 0.6, y + sz * 1.4 * k], [x - sz * 0.4 + t * sz * 0.5, y + sz * 0.7]], 5);
    };
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 4, -1.5, 2.6, 1.6, 16);
      B(1, -8, 8.5, 7, 1);
      B(0, -6.5, 5.5, 4, 2);
      claw(-6, -7, 1, 2.6);
      const h: [number, number, number] = [-3, -12, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('mole', h[0], h[1], h[2]);
      return { head: h, kind: 'mole' };
    }
    if (st === 2) {
      for (const k of [-1, 1]) E(k * 5, -2.5, 3.2, 2.4, 16);
      B(2, -10, 10.5, 8.5, 1);
      B(0, -8, 7, 5, 2);
      claw(-9, -8, 1, 4);
      claw(9, -7, 1, 3.6);
      const h: [number, number, number] = [-5, -16, 7];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      // 바위 투구
      P([[h[0] - 6, h[1] - 2], [h[0] - 4, h[1] - 8], [h[0] + 3, h[1] - 9], [h[0] + 7, h[1] - 4], [h[0] + 6, h[1] - 1]], 11);
      Ln(h[0] - 1, h[1] - 8, h[0] + 1, h[1] - 3, 0.6, 16, 11);
      d.muzzle('mole', h[0], h[1], h[2]);
      return { head: h, kind: 'mole' };
    }
    // 땅울림두더: 코끝 드릴, 거대한 삽 발톱, 바위 어깨
    for (const k of [-1, 1]) {
      E(k * 6, -5, 4.6, 5, 1);
      E(k * 6.5 - 1.4, -1.2, 5, 1.8, 1);
    }
    B(1, -16, 12, 12, 1);
    B(-1, -14, 8, 8.5, 2);
    for (const k of [-1, 1]) {
      P([[k * 6, -27], [k * 13, -31], [k * 17, -24], [k * 11, -21]], 11);
      Ln(k * 10, -29, k * 13, -24, 0.6, 16, 11);
    }
    claw(-14, -15, 1, 5);
    claw(14, -14, 1, 4.6);
    const h: [number, number, number] = [-3, -29, 7.6];
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    // 드릴
    P([[h[0] - 5, h[1] - 1], [h[0] - 17, h[1] + 3], [h[0] - 5, h[1] + 6]], 12);
    for (let i = 0; i < 3; i++) Ln(h[0] - 7 - i * 3, h[1] - 0.2 + i * 0.6, h[0] - 6 - i * 3, h[1] + 5.5 - i * 0.6, 0.6, 4, 12);
    return { head: h, kind: 'mole', face: { mx: 0.2, my: 0.65 } };
  },

  // 조약돌이 → 바위둥이 → 산봉우리
  12: (d) => {
    const { E, P, Ln, st } = d;
    const crack = (x: number, y: number) => {
      Ln(x, y, x + 1.5, y + 3, 0.6, 16, 1);
      Ln(x + 1.5, y + 3, x + 0.5, y + 5, 0.6, 16, 1);
    };
    if (st === 1) {
      E(0, -7, 8.5, 7, 1);
      E(-2, -9.5, 3, 1.6, 2);
      crack(4, -11);
      for (const k of [-1, 1]) E(k * 8.5, -5, 2, 2, 1);
      return { head: [0, -7, 7], face: { ey: -0.2, my: 0.45 } };
    }
    if (st === 2) {
      P([[-12, -3], [-13, -13], [-7, -21], [5, -22], [12, -14], [12, -3], [0, 0]], 1);
      P([[-7, -18], [-3, -21], [3, -21], [-2, -17]], 2);
      crack(6, -18);
      crack(-9, -12);
      for (const [x, y] of [[4, -22], [8, -20]] as Pt[]) E(x, y, 2.2, 1.2, 14);
      for (const k of [-1, 1]) {
        E(k * 15, -10, 3.6, 4, 1);
        E(k * 16, -4, 3.2, 3, 1);
      }
      return { head: [-1, -12, 8.4], face: { ey: -0.1 } };
    }
    // 산봉우리: 눈 덮인 봉우리, 어깨 위 나무, 바위 팔
    for (const k of [-1, 1]) {
      E(k * 6, -4, 5, 4.5, 16);
    }
    P([[-16, -5], [-15, -18], [-8, -28], [-3, -40], [3, -42], [9, -30], [16, -18], [16, -5], [0, -1]], 1);
    P([[-6, -33], [-3, -40], [3, -42], [7, -34], [4, -31], [1, -34], [-2, -31]], 5);
    P([[-12, -12], [-8, -20], [-4, -14], [-8, -10]], 2);
    crack(8, -22);
    crack(-10, -18);
    // 어깨 위 작은 소나무
    for (const [x, y] of [[-14, -20], [14, -22], [11, -26]] as Pt[]) {
      Ln(x, y, x, y + 2, 0.7, 11);
      P([[x - 2.2, y], [x, y - 5], [x + 2.2, y]], 14);
    }
    for (const k of [-1, 1]) {
      E(k * 19, -13, 4.6, 5, 1);
      E(k * 20.5, -6, 4.4, 4, 1);
    }
    return { head: [-1, -17, 9], face: { ey: -0.05 } };
  },

  // 주먹콩 → 씨름꾼 → 천하장사
  13: (d) => {
    const { E, B, Ln, st } = d;
    const sash = (y: number, w: number, c: number) => {
      E(0, y, w, 2, c);
      E(-w * 0.3, y + 3, 2.4, 3, c, 0.4);
    };
    if (st === 1) {
      for (const k of [-1, 1]) {
        E(k * 3.5, -2.5, 2.6, 3, 1);
        E(k * 4 - 1, -0.8, 3.2, 1.3, 1);
      }
      B(0, -9, 6.5, 6, 1);
      B(0, -8.5, 4, 4, 2);
      // 권투 장갑
      for (const k of [-1, 1]) E(k * 8, -10, 3.2, 3, 3);
      const h: [number, number, number] = [0, -18, 7.8];
      for (const k of [-1, 1]) E(h[0] + k * 7.2, h[1] - 1, 2.4, 2.4, 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('ape', h[0], h[1], h[2]);
      // 머리띠
      E(h[0], h[1] - h[2] * 0.5, h[2] + 0.3, 1.2, 3, 0, 1);
      d.P([[h[0] + h[2], h[1] - h[2] * 0.5], [h[0] + h[2] + 5, h[1] - h[2] * 0.3], [h[0] + h[2] + 4, h[1] + 1]], 3);
      return { head: h, kind: 'ape' };
    }
    if (st === 2) {
      for (const k of [-1, 1]) {
        E(k * 6, -4.5, 4.4, 5, 1);
        E(k * 6.5 - 1.4, -1, 5, 1.8, 1);
      }
      B(0, -14, 11.5, 11, 1);
      B(0, -15, 7, 7, 2);
      sash(-9.5, 11, 3);
      E(4, -6, 3, 3, 3);
      for (const k of [-1, 1]) {
        E(k * 13, -16, 4, 6.5, 1, k * -0.3);
        E(k * 14, -10, 3.5, 3.2, 1);
      }
      const h: [number, number, number] = [0, -28, 7.4];
      for (const k of [-1, 1]) E(h[0] + k * 6.6, h[1] - 1, 2.4, 2.4, 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      // 상투
      E(h[0] + 1, h[1] - h[2] - 1.5, 2.4, 2.2, 21);
      d.muzzle('ape', h[0], h[1], h[2]);
      return { head: h, kind: 'ape' };
    }
    // 천하장사: 우람한 팔을 들어 힘자랑, 금 버클 샅바, 갈기 머리
    for (const k of [-1, 1]) {
      E(k * 6.5, -5, 4.8, 5.6, 1);
      E(k * 7 - 1.4, -1.2, 5.4, 2, 1);
    }
    B(0, -17, 12, 11.5, 1);
    B(0, -21, 10, 6.5, 1);
    for (const k of [-1, 1]) E(k * 4, -20, 4, 3.4, 2);
    for (let i = 0; i < 3; i++) Ln(-3, -14 + i * 2.6, 3, -14 + i * 2.6, 0.6, 16, 1);
    sash(-10, 12, 3);
    E(0, -10, 2.4, 2, 12);
    for (const k of [-1, 1]) {
      E(k * 14, -22, 4.4, 4.8, 1);
      E(k * 17, -28, 3.8, 5.2, 1, k * 0.3);
      E(k * 17.5, -34, 4, 3.8, 1);
      E(k * 15.5, -26, 2.6, 2, 2);
    }
    const h: [number, number, number] = [0, -32, 7.6];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.9 + i * 0.15);
      E(h[0] + Math.cos(a) * 8, h[1] + Math.sin(a) * 8, 3, 3, 21);
    }
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('ape', h[0], h[1], h[2]);
    return { head: h, kind: 'ape' };
  },

  // 송사리콩 → 은빛잉어 → 용문잉어
  14: (d) => {
    const { E, P, st } = d;
    const sw = d.frame === 1 ? 1 : 0;
    if (st === 1) {
      P([[6, -8], [13, -13 + sw], [12, -8], [13, -3 - sw]], 3);
      E(0, -8, 8, 5.5, 1);
      E(-1, -6, 5.5, 2.4, 2);
      P([[-2, -13], [2, -16], [4, -12]], 3);
      return { head: [-3, -9, 5.6], face: { eyeK: 1.1 } };
    }
    if (st === 2) {
      P([[11, -13], [22, -21 + sw], [19, -12], [22, -3 - sw]], 3);
      E(0, -12, 13, 8, 1);
      E(-2, -8.5, 9, 3.6, 2);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) d.Cv([[i * 4 - 4, -16 + j * 4], [i * 4 - 2.5, -14.5 + j * 4], [i * 4 - 4, -13 + j * 4]], 0.6, 0.6, 15);
      P([[-4, -19], [3, -25], [8, -18]], 3);
      P([[-1, -5], [3, -1], [5, -6]], 3);
      // 수염
      d.Cv([[-12, -10], [-15, -7], [-15, -3]], 0.7, 0.6, 12);
      return { head: [-7, -12, 6], face: { eyeK: 1.05 } };
    }
    // 용문잉어: 잉어 몸이 용처럼 휘고, 뿔·긴 수염·불꽃 같은 지느러미
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push([18 - t * 26, -6 - t * 24 + Math.sin(t * Math.PI) * -6]);
    }
    P([[16, -6], [26, -14 + sw], [22, -4], [27, 4 - sw]], 3);
    pts.forEach(([x, y], i) => E(x, y, 4.6 + i * 0.45, 4.6 + i * 0.4, 1));
    pts.forEach(([x, y], i) => i % 2 === 0 && E(x - 1, y + 2.5 + i * 0.2, 2.4 + i * 0.2, 1.4, 2));
    pts.forEach(([x, y], i) => i > 1 && i < 9 && P([[x - 2, y - 4 - i * 0.3], [x + 1, y - 9 - (i % 2) * 2], [x + 2.5, y - 3.5]], 3));
    const h: [number, number, number] = [pts[10][0] - 2, pts[10][1] - 2, 7.6];
    for (const k of [-1, 1]) {
      d.Cv([[h[0] + k * 2, h[1] - 5], [h[0] + k * 3 + 3, h[1] - 11], [h[0] + k * 2 + 6, h[1] - 14]], 1.4, 0.8, 12);
    }
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    d.Cv([[h[0] - 8, h[1] + 2], [h[0] - 14, h[1] + 6], [h[0] - 13, h[1] + 13]], 0.9, 0.6, 12);
    d.Cv([[h[0] - 7, h[1] + 4], [h[0] - 9, h[1] + 11], [h[0] - 15, h[1] + 14]], 0.9, 0.6, 12);
    return { head: h, kind: 'lizard' };
  },

  // 물개콩 → 얼음물개 → 빙산바다사자
  15: (d) => {
    const { E, P, B, st } = d;
    if (st === 1) {
      fluff(d, 3, -6.5, 9, 6, 5, 12, 1.8);
      for (const k of [-1, 1]) E(k * 6 + 2, -1.5, 3, 1.4, 2, k * 0.4);
      P([[11, -5], [16, -8], [15, -3]], 2);
      const h: [number, number, number] = [-5, -10, 7.4];
      E(h[0], h[1], h[2], h[2] * 0.92, 5);
      d.muzzle('seal', h[0], h[1], h[2]);
      return { head: h, kind: 'seal', body: 'quad' };
    }
    if (st === 2) {
      P([[10, -5], [20, -10], [18, -2]], 1);
      B(3, -8, 11, 7, 1);
      B(1, -6, 8, 3.4, 2);
      for (const k of [-1, 1]) E(k * 6, -2, 4, 1.6, 1, k * 0.5);
      const h: [number, number, number] = [-7, -15, 7];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      // 머리 위 얼음 결정
      P([[h[0] - 2, h[1] - h[2] + 1], [h[0] - 0.5, h[1] - h[2] - 6], [h[0] + 1.5, h[1] - h[2] + 1]], 20);
      P([[h[0] + 1, h[1] - h[2] + 1.5], [h[0] + 4, h[1] - h[2] - 3], [h[0] + 4, h[1] - h[2] + 2]], 20);
      d.muzzle('seal', h[0], h[1], h[2]);
      return { head: h, kind: 'seal', body: 'quad' };
    }
    // 빙산바다사자: 등에 솟은 빙산, 엄니, 갈기
    P([[0, -18], [4, -36], [9, -30], [13, -40], [18, -22], [12, -14]], 20);
    P([[4, -36], [6, -24], [9, -30]], 5);
    P([[13, -40], [13, -26], [18, -22]], 19);
    P([[13, -6], [24, -12], [22, -2]], 1);
    B(4, -11, 13.5, 9, 1);
    B(1, -8, 9.5, 4, 2);
    for (const k of [-1, 1]) E(k * 7, -2, 5, 2, 1, k * 0.5);
    fluff(d, -7, -18, 7, 6, 16, 9, 1.8);
    const h: [number, number, number] = [-9, -23, 7.4];
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('seal', h[0], h[1], h[2]);
    for (const k of [-1, 1]) P([[h[0] - 2.5 + k * 1.6, h[1] + 4], [h[0] - 2.5 + k * 2.4, h[1] + 11], [h[0] - 2 + k * 2.8, h[1] + 4]], 5);
    return { head: h, kind: 'seal', body: 'quad', face: { my: 0.55 } };
  },
  // 꿈꾸리 → 잠보 → 몽환술사: 잠꼬대 아기 맥 → 꿈구름을 진 맥 → 별 고깔의 꿈 술사
  16: (d) => {
    const { E, P, B, Ln, st } = d;
    const bubble = (x: number, y: number, r: number) => {
      E(x, y, r, r, 15);
      E(x, y, r - 0.8, r - 0.8, 20, 0, 15);
      d.set(x - r * 0.4, y - r * 0.4, 9);
    };
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 4, -2, 2.6, 2.2, 16);
      B(2, -7.5, 8.5, 5.5, 1);
      B(1, -5.5, 6, 2.6, 2);
      const h: [number, number, number] = [-4, -12, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('tapir', h[0], h[1], h[2]);
      // 잠꼬대 고깔
      P([[h[0] - 4, h[1] - h[2] + 2], [h[0] + 9, h[1] - h[2] - 6], [h[0] + 5, h[1] - h[2] + 3]], 3);
      E(h[0] + 9.5, h[1] - h[2] - 6.5, 1.6, 1.6, 5);
      bubble(h[0] - 10, h[1] - 6, 2.2);
      return { head: h, kind: 'tapir', face: { calm: true } };
    }
    if (st === 2) {
      for (const x of [-5, 8]) E(x, -3, 2.8, 3.4, 16);
      B(3, -10, 11, 7, 1);
      B(2, -7, 8, 3, 2);
      // 등에 진 꿈구름 + 초승달
      for (const [x, y, r] of [[-2, -19, 4], [3, -21, 5], [9, -19, 4.2], [5, -17, 3.6]] as [number, number, number][]) E(x, y, r, r * 0.8, 15);
      E(4, -21, 2.6, 2.6, 12);
      E(5.2, -22, 2.2, 2.2, 15, 0, 12);
      for (const x of [-8, 5]) E(x, -3, 2.8, 3.4, 1);
      const h: [number, number, number] = [-9, -15, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('tapir', h[0], h[1], h[2]);
      bubble(h[0] - 9, h[1] - 9, 1.8);
      return { head: h, kind: 'tapir', face: { calm: true } };
    }
    // 몽환술사: 두 발로 선 맥, 별 무늬 도포, 고깔, 달 지팡이, 떠다니는 꿈방울
    P([[-9, -26], [-12, -1], [12, -1], [9, -26]], 3);
    for (const [x, y] of [[-6, -8], [5, -14], [-2, -18], [7, -5]] as Pt[]) {
      d.set(x, y, 12);
      d.set(x + 1, y, 12);
      d.set(x, y + 1, 12);
    }
    E(0, -18, 5, 8, 2);
    Ln(14, -1, 13, -36, 1.2, 11);
    E(13, -38, 3, 3, 12);
    E(14.5, -39, 2.6, 2.6, 15, 0, 12);
    E(11, -21, 2.6, 2.4, 1);
    E(-11, -19, 2.6, 2.4, 1);
    const h: [number, number, number] = [-1, -30, 7.4];
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('tapir', h[0], h[1], h[2]);
    P([[h[0] - 9, h[1] - 5], [h[0] + 9, h[1] - 6], [h[0] + 4, h[1] - 9], [h[0] + 8, h[1] - 22], [h[0] - 3, h[1] - 9]], 4);
    E(h[0] + 8, h[1] - 22, 1.6, 1.6, 12);
    for (const [x, y, r] of [[-15, -30, 2], [-17, -22, 1.4], [17, -28, 1.6]] as [number, number, number][]) bubble(x, y, r);
    return { head: h, kind: 'tapir', face: { calm: true } };
  },

  // 그림자콩 → 도깨불 → 어둠망령
  17: (d) => {
    const { E, P, Ln, st, frame } = d;
    const w = frame === 1 ? 1 : -1;
    if (st === 1) {
      P([[-7, -10], [-5, -2], [-2, -5 + w], [0, -1], [2, -5 - w], [5, -2], [7, -10]], 1);
      E(0, -11, 7.5, 7.5, 1);
      P([[-1.5, -18], [0, -22], [1.5, -18]], 12);
      return { head: [0, -11, 7], face: { ey: -0.05 } };
    }
    if (st === 2) {
      // 푸른 도깨비불 머리 + 뿔 + 방망이
      for (let i = 0; i < 5; i++) {
        const x = -8 + i * 4;
        P([[x - 3, -20], [x + w * (i % 2 ? 1 : -1), -32 - (i % 3) * 3], [x + 3, -20]], i % 2 ? 3 : 15);
      }
      P([[-9, -15], [-7, -3], [-3, -7 + w], [0, -1], [3, -7 - w], [7, -3], [9, -15]], 1);
      E(0, -16, 9, 8.5, 1);
      for (const k of [-1, 1]) P([[k * 3, -23], [k * 5, -30], [k * 7, -22]], 12);
      Ln(9, -12, 15, -22, 1.4, 11);
      E(15.5, -24, 2.8, 3.6, 11);
      for (const [x, y] of [[14.5, -26], [16.5, -23]] as Pt[]) d.set(x, y, 12);
      return { head: [0, -16, 8], face: { ey: 0 } };
    }
    // 어둠망령: 두건 망토, 빛나는 눈, 갈퀴 손, 찢어진 자락
    P([[-14, -36], [-17, -2], [-12, -7 + w], [-8, 0], [-4, -6 - w], [0, 1], [4, -6 + w], [8, 0], [12, -7 - w], [17, -2], [14, -36]], 1);
    E(0, -34, 11, 10, 1);
    E(-1, -31, 7.5, 7, 21);
    for (const k of [-1, 1]) {
      d.Cv([[k * 13, -22], [k * 19, -18], [k * 21, -24]], 3, 2, 1);
      for (const t of [-1, 0, 1]) P([[k * 21 + t * 1.5, -25], [k * 23 + t * 2, -30], [k * 22 + t * 1.5, -24]], 9);
    }
    for (let i = 0; i < 4; i++) d.set(-8 + i * 5, -14 + (i % 2) * 4, 15);
    return { head: [-1, -31, 6.6], face: { ey: 0.05, blush: false, mouth: 'none' } };
  },

  // 연기콩 → 독안개 → 괴무
  18: (d) => {
    const { E, st, frame } = d;
    const f = frame === 1 ? 0.6 : 0;
    if (st === 1) {
      for (const [x, y, r] of [[0, -9, 6.5], [-5, -7, 4], [5, -7.5, 4.2], [0, -14, 4.5], [8, -12, 2.4], [10, -16, 1.6]] as [number, number, number][]) E(x, y - f, r, r, 1);
      return { head: [0, -9, 6.5] };
    }
    if (st === 2) {
      for (const [x, y, r] of [[0, -14, 9], [-8, -11, 6], [8, -12, 6.5], [-3, -21, 6], [5, -22, 5.5], [-12, -18, 3.6], [13, -19, 3.2], [16, -10, 2.4], [-15, -7, 2]] as [number, number, number][]) E(x, y - f, r, r, 1);
      for (const [x, y, r] of [[-6, -9, 2.4], [7, -10, 2], [-2, -24, 1.8]] as [number, number, number][]) E(x, y - f, r, r, 3, 0, 1);
      for (const k of [-1, 1]) d.Cv([[k * 10, -12], [k * 16, -8], [k * 18, -3]], 3, 1.6, 1);
      return { head: [0, -14, 8.5] };
    }
    // 괴무: 거대한 안개 괴물, 큰 입
    for (const [x, y, r] of [[0, -20, 13], [-11, -14, 8], [11, -15, 8.5], [-6, -30, 8], [7, -31, 7.5], [-16, -25, 5], [17, -25, 5], [0, -38, 5], [20, -12, 3.5], [-20, -10, 3]] as [number, number, number][]) E(x, y - f, r, r, 1);
    for (const [x, y, r] of [[-9, -12, 3], [9, -14, 2.4], [-4, -33, 2.2], [12, -26, 2]] as [number, number, number][]) E(x, y - f, r, r, 3, 0, 1);
    // 입
    E(-1, -13 - f, 7, 3.4, 8);
    for (let i = -3; i <= 3; i++) d.P([[-1 + i * 2 - 0.8, -16 - f], [-1 + i * 2, -13.5 - f], [-1 + i * 2 + 0.8, -16 - f]], 5);
    for (const k of [-1, 1]) d.Cv([[k * 15, -18], [k * 22, -14], [k * 24, -6]], 4, 2, 1);
    return { head: [0, -22, 9.5], face: { mouth: 'none', ey: -0.2 } };
  },

  // 성냥개비 → 횃불여우 → 구미불꽃
  19: (d) => {
    const { E, P, B, st } = d;
    const foxHead = (h: [number, number, number], ear: number) => {
      for (const k of [-1, 1]) {
        P([[h[0] + k * 2, h[1] - 4], [h[0] + k * 6, h[1] - 4 - ear], [h[0] + k * 7.5, h[1] - 2]], 1);
        P([[h[0] + k * 3, h[1] - 4], [h[0] + k * 5.8, h[1] - 2 - ear * 0.8], [h[0] + k * 6.6, h[1] - 3]], 21);
      }
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('dog', h[0], h[1], h[2] * 0.85);
    };
    if (st === 1) {
      d.Cv([[7, -6], [11, -8], [12, -12]], 1.8, 1.2, 1);
      flame(d, 12.2, -12, 5, 2, 0.4);
      for (const x of [-2, 6]) E(x, -2.5, 1.8, 2.6, 16);
      B(2, -7, 7, 4.6, 1);
      B(1, -5.4, 4.5, 2, 2);
      for (const x of [-5, 3]) E(x, -2.5, 1.8, 2.6, 1);
      const h: [number, number, number] = [-6, -12, 6.6];
      foxHead(h, 7);
      return { head: h, kind: 'dog' };
    }
    const n = st === 2 ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const a = -0.5 - i * (st === 2 ? 0.45 : 0.32);
      const L = st === 2 ? 11 : 15;
      const ex = 9 + Math.cos(a) * L;
      const ey = -9 + Math.sin(a) * L;
      d.Cv([[9, -9], [9 + Math.cos(a) * L * 0.5 + 2, -9 + Math.sin(a) * L * 0.5], [ex, ey]], 2.6, 2.4, i % 2 ? 16 : 1);
      flame(d, ex, ey + 1.5, st === 2 ? 6 : 8, 2.4, Math.cos(a) * 1.5);
    }
    const big = st === 3 ? 1.25 : 1;
    for (const x of [-3, 8]) E(x * big, -4 * big, 2.2 * big, 4 * big, 16);
    B(3 * big, -10 * big, 9 * big, 5.5 * big, 1);
    B(2 * big, -8 * big, 6 * big, 2.4 * big, 2);
    for (const x of [-6, 5]) E(x * big, -4 * big, 2.2 * big, 4 * big, 1);
    E(-6 * big, -14 * big, 4 * big, 5 * big, 2);
    const h: [number, number, number] = [-8 * big, -20 * big, 6.8 * big];
    foxHead(h, st === 2 ? 9 : 11);
    // 귀 끝 불꽃
    for (const k of [-1, 1]) flame(d, h[0] + k * 6, h[1] - 3 - (st === 2 ? 9 : 11), 4, 1.6, 0);
    return { head: h, kind: 'dog' };
  },

  // 숯덩이 → 용암두꺼 → 화산거북
  20: (d) => {
    const { E, P, Ln, st } = d;
    const glow = (x: number, y: number) => {
      Ln(x, y, x + 2, y + 2.5, 0.7, 18, 21);
      Ln(x + 2, y + 2.5, x + 1, y + 4.5, 0.7, 13, 21);
    };
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 5, -1.6, 2.4, 1.8, 16);
      E(1, -7, 9, 6.5, 21);
      for (const [x, y] of [[0, -11], [4, -8], [-3, -8]] as Pt[]) glow(x, y);
      const h: [number, number, number] = [-8, -7, 4.8];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('turtle', h[0], h[1], h[2]);
      return { head: h, kind: 'turtle' };
    }
    if (st === 2) {
      for (const k of [-1, 1]) E(k * 6.5, -3, 3.4, 3, 1);
      E(2, -11, 11, 8, 21);
      for (let i = 0; i < 4; i++) E(-4 + i * 4.5, -13 + (i % 2) * 2, 1.6, 1.3, 18, 0, 21);
      E(2, -5, 10, 2.5, 2);
      const h: [number, number, number] = [-10, -10, 6];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('turtle', h[0], h[1], h[2]);
      return { head: h, kind: 'turtle' };
    }
    // 화산거북: 등딱지가 화산, 분화구에서 용암
    for (const k of [-1, 1]) {
      E(k * 9, -5, 4.6, 5, 1);
      E(k * 9.5 - 1, -1.2, 5, 1.8, 1);
    }
    P([[-15, -8], [-11, -22], [-5, -30], [6, -31], [12, -22], [16, -8]], 21);
    P([[-6, -29], [-3, -34], [4, -35], [7, -30]], 16);
    E(0.5, -33, 4, 1.6, 18);
    for (const [x, y, h] of [[-1, -35, 6], [2, -35, 8], [4.5, -35, 5]] as [number, number, number][]) flame(d, x, y, h, 1.6, 0);
    for (const [x, y] of [[-8, -22], [5, -25], [9, -16], [-11, -13], [1, -18]] as Pt[]) glow(x, y);
    E(0, -6, 15, 2.6, 2);
    const h: [number, number, number] = [-17, -12, 7];
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('turtle', h[0], h[1], h[2]);
    return { head: h, kind: 'turtle' };
  },

  // 나사콩 → 자석돌 → 전자석탑
  21: (d) => {
    const { E, P, Ln, st } = d;
    const spark = (x: number, y: number) => {
      Ln(x, y, x + 1.5, y - 2, 0.6, 12);
      Ln(x + 1.5, y - 2, x + 0.5, y - 3, 0.6, 12);
      Ln(x + 0.5, y - 3, x + 2, y - 5, 0.6, 12);
    };
    if (st === 1) {
      E(0, -6.5, 7.5, 6.5, 1);
      for (const k of [-1, 1]) E(k * 4, -0.8, 2.2, 1.2, 16);
      // 머리 나사
      E(0, -14, 3, 1.2, 12);
      Ln(0, -14, 0, -18, 1.6, 12);
      for (let i = 0; i < 3; i++) Ln(-1, -15 - i, 1, -15.6 - i, 0.4, 4, 12);
      spark(6, -13);
      return { head: [0, -7, 6.5] };
    }
    if (st === 2) {
      E(0, -10, 9, 8.5, 1);
      // 말굽자석 팔
      for (const k of [-1, 1]) {
        d.Cv([[k * 8, -12], [k * 15, -14], [k * 15, -6]], 3, 3, 3);
        E(k * 15, -4.5, 1.6, 1.6, 15);
      }
      for (const k of [-1, 1]) E(k * 5, -1.5, 2.6, 1.4, 16);
      spark(-17, -6);
      spark(14, -18);
      return { head: [0, -10, 8] };
    }
    // 전자석탑: 쌓인 탑 몸, 감긴 코일, 안테나 번개
    P([[-10, -2], [-8, -22], [8, -22], [10, -2]], 1);
    for (let i = 0; i < 5; i++) E(0, -5 - i * 3.6, 9.5 - i * 0.4, 1.1, 12, 0, 1);
    P([[-6, -22], [-5, -34], [5, -34], [6, -22]], 16);
    E(0, -35, 6.5, 2, 1);
    Ln(0, -36, 0, -46, 1, 12);
    E(0, -47, 1.8, 1.8, 3);
    for (const k of [-1, 1]) {
      d.Cv([[k * 8, -15], [k * 16, -17], [k * 16, -8]], 3, 3, 3);
      E(k * 16, -6.5, 1.6, 1.6, 15);
    }
    spark(4, -46);
    spark(-7, -44);
    spark(17, -21);
    return { head: [0, -28, 6] };
  },

  // 도토리콩 → 다람참나무 → 천년목
  22: (d) => {
    const { E, P, Ln, st } = d;
    if (st === 1) {
      E(0, -7.5, 7, 7.5, 11);
      E(0, -13, 7.6, 3.4, 16);
      for (let i = -3; i <= 3; i++) d.set(i * 2, -13.5, 21);
      Ln(0, -16, 1, -19, 1, 11);
      leaf(d, 3.4, -19.5, 2, 1.1, 1.1);
      for (const k of [-1, 1]) E(k * 3, -0.8, 2, 1, 21);
      return { head: [0, -7, 6.2], face: { ey: 0.05 } };
    }
    if (st === 2) {
      P([[-5, -1], [-4, -20], [4, -20], [5, -1]], 11);
      for (const k of [-1, 1]) Ln(k * 4, -15, k * 11, -21, 1.3, 11);
      for (const [x, y, r] of [[0, -27, 8], [-8, -23, 5], [8, -24, 5.5], [-11, -21, 3], [11, -21, 3.2]] as [number, number, number][]) E(x, y, r, r * 0.85, 14);
      for (const [x, y] of [[-3, -31], [5, -29]] as Pt[]) {
        E(x, y, 1.4, 1.6, 11);
        E(x, y - 1.3, 1.6, 0.8, 16);
      }
      for (const k of [-1, 1]) E(k * 5, -1, 2.6, 1.2, 21);
      return { head: [0, -11, 5.6], face: { ey: 0 } };
    }
    // 천년목: 굵은 줄기, 넓은 잎 지붕, 이끼 수염, 새 둥지
    for (const k of [-1, 1]) d.Cv([[k * 5, -6], [k * 9, -3], [k * 13, -1]], 2.4, 1.4, 11);
    P([[-7, -1], [-6, -24], [6, -24], [7, -1]], 11);
    for (let i = 0; i < 4; i++) Ln(-4 + i * 2.6, -22, -4.5 + i * 2.6, -2, 0.5, 21, 11);
    for (const k of [-1, 1]) d.Cv([[k * 5, -20], [k * 12, -26], [k * 17, -24]], 2, 1.2, 11);
    for (const [x, y, r] of [[0, -35, 11], [-12, -30, 7], [12, -31, 7.5], [-6, -42, 6], [7, -42, 6], [-17, -26, 4], [17, -26, 4.4]] as [number, number, number][]) E(x, y, r, r * 0.8, 14);
    for (const [x, y] of [[-8, -34], [5, -38], [11, -30]] as Pt[]) E(x, y, 1.6, 1.2, 16, 0, 14);
    // 이끼 수염
    P([[-5, -9], [0, 0], [5, -9]], 14);
    // 둥지
    E(15, -27, 3.4, 1.6, 11);
    E(15, -28.5, 1.4, 1.2, 5);
    return { head: [0, -15, 6], face: { calm: true, ey: -0.05 } };
  },

  // 민들레솜 → 홀씨구름 → 바람꽃
  23: (d) => {
    const { E, Ln, st, frame } = d;
    const f = frame === 1 ? 0.5 : 0;
    const puff = (x: number, y: number, r: number) => {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        Ln(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.5, 15);
        E(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.3, 1.3, 5);
      }
      E(x, y, r * 0.55, r * 0.55, 5);
    };
    if (st === 1) {
      for (const k of [-1, 1]) leaf(d, k * 4.5, -2, 1.6, 3.6, k * 1.3);
      E(0, -6, 5.5, 5, 1);
      puff(0, -15 - f, 6);
      return { head: [0, -6, 5], face: { ey: 0.05 } };
    }
    if (st === 2) {
      for (const [x, y] of [[-8, -24], [6, -28], [12, -18], [-12, -14], [0, -34]] as Pt[]) {
        Ln(x, y + 2, x, y + 4, 0.4, 15);
        E(x, y + f, 2, 2, 5);
      }
      for (const [x, y, r] of [[0, -14, 8.5], [-7, -12, 5.5], [7, -12, 6], [-3, -20, 5], [4, -20, 5]] as [number, number, number][]) E(x, y - f, r, r * 0.85, 5);
      E(0, -14 - f, 6, 5.4, 1);
      return { head: [0, -14 - f, 5.6] };
    }
    // 바람꽃: 바람개비 같은 꽃잎 치마, 잎 팔, 홀씨 왕관
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (frame ? 0.25 : 0);
      E(Math.cos(a) * 9, -10 + Math.sin(a) * 5, 6, 3, i % 2 ? 3 : 15, a);
    }
    E(0, -10, 4, 3, 12);
    E(0, -19, 5, 6, 1);
    for (const k of [-1, 1]) leaf(d, k * 8, -21, 1.8, 5, k * 0.9);
    const h: [number, number, number] = [0, -29, 6.4];
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.08 + i * 0.14);
      Ln(h[0] + Math.cos(a) * 5, h[1] + Math.sin(a) * 5, h[0] + Math.cos(a) * 11, h[1] + Math.sin(a) * 11, 0.5, 15);
      E(h[0] + Math.cos(a) * 11, h[1] + Math.sin(a) * 11, 1.4, 1.4, 5);
    }
    return { head: h, face: { calm: true } };
  },

  // 이끼벌레 → 풀무당 → 사마귀검객
  24: (d) => {
    const { E, P, Ln, st, up } = d;
    if (st === 1) {
      for (const [x, y, r] of [[9, -3.5, 3], [5, -4.5, 3.6], [1, -5.5, 4]] as [number, number, number][]) {
        E(x, y, r, r, 1);
        E(x, y - r * 0.7, r * 0.7, r * 0.4, 14);
      }
      const h: [number, number, number] = [-4, -9, 5.6];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      leaf(d, h[0] + 1, h[1] - h[2] - 1.5, 2.4, 1.2, 0.7);
      return { head: h };
    }
    const sam = st === 3;
    const K = sam ? 1.3 : 1;
    // 가는 다리, 긴 몸, 낫 팔
    for (const [x, dx] of [[2, -3], [6, 1], [9, 4]] as Pt[]) Ln(x * K, -8 * K, (x + dx) * K, 0, 0.8, 16);
    E(8 * K, -10 * K, 8 * K, 3.4 * K, 1, -0.25);
    for (const k of [-1, 1]) bugWing(d, 9 * K, (-13 + up * 0.5) * K, 7 * K, 2.4 * K, 1.25 + k * 0.08, sam ? 14 : 15);
    E(0, -14 * K, 2.6 * K, 6 * K, 1, 0.3);
    for (const k of [-1, 1]) {
      const sx = (-2 + k) * K;
      const sy = -17 * K;
      Ln(sx, sy, sx - 5 * K, sy + 2 * K, 1 * K, 1);
      P([[sx - 5 * K, sy + 1 * K], [sx - (sam ? 6 : 4) * K, sy - (sam ? 11 : 6) * K], [sx - 3 * K, sy - (sam ? 9 : 5) * K], [sx - 4 * K, sy + 2.5 * K]], sam ? 9 : 2);
    }
    const h: [number, number, number] = [-2 * K, -24 * K, 5 * K];
    for (const k of [-1, 1]) Ln(h[0] + k, h[1] - 3, h[0] + k * 5 - 3, h[1] - 10 * K, 0.5, 21);
    d.P([[h[0] - h[2] * 1.1, h[1] - 1], [h[0], h[1] + h[2] * 1.2], [h[0] + h[2] * 1.1, h[1] - 1], [h[0], h[1] - h[2]]], 1);
    if (sam) {
      // 삿갓
      d.P([[h[0] - 9, h[1] - 3], [h[0], h[1] - 10], [h[0] + 9, h[1] - 3]], 11);
      Ln(h[0] - 9, h[1] - 3, h[0] + 9, h[1] - 3, 0.6, 16);
    }
    return { head: h, face: { eyeK: 0.9, blush: false } };
  },

  // 쇠똥구리 → 강철풍뎅 → 장수투구
  25: (d) => {
    const { E, P, Ln, st } = d;
    const legs = (y: number, K: number) => {
      for (const [x, dx] of [[-3, -3], [1, 0], [5, 3]] as Pt[]) Ln(x * K, y, (x + dx) * K, 0, 0.8 * K, 21);
    };
    if (st === 1) {
      // 굴리는 공
      E(11, -6, 6, 6, 11);
      for (const [x, y] of [[9, -8], [13, -4], [11, -9]] as Pt[]) d.set(x, y, 16);
      legs(-5, 1);
      E(0, -7, 6.5, 5, 1);
      Ln(0, -12, 0, -2, 0.5, 15, 1);
      const h: [number, number, number] = [-6, -7, 4.4];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      return { head: h };
    }
    const K = st === 2 ? 1.15 : 1.45;
    legs(-6 * K, K);
    E(2 * K, -9 * K, 9 * K, 6.5 * K, 1);
    Ln(2 * K, -15 * K, 2 * K, -3 * K, 0.6 * K, 16, 1);
    E(-1 * K, -12 * K, 3.6 * K, 1.6 * K, 15, -0.3, 1);
    E(-6 * K, -9 * K, 4.6 * K, 4.2 * K, 16);
    const h: [number, number, number] = [-9.5 * K, -9 * K, 4.6 * K];
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    if (st === 2) P([[h[0] - 1, h[1] - h[2] + 1], [h[0] - 3, h[1] - h[2] - 5], [h[0] + 1.5, h[1] - h[2] + 1]], 12);
    else {
      // 장수투구: 크게 휜 뿔 + 등 뿔
      d.Cv([[h[0], h[1] - h[2] + 1], [h[0] - 6, h[1] - h[2] - 6], [h[0] - 4, h[1] - h[2] - 15], [h[0] + 1, h[1] - h[2] - 17]], 3, 1.4, 12);
      P([[h[0] - 4.6, h[1] - h[2] - 12], [h[0] - 9, h[1] - h[2] - 13], [h[0] - 4.2, h[1] - h[2] - 9.5]], 12);
      d.Cv([[-4 * K, -14 * K], [-4 * K, -19 * K], [-8 * K, -21 * K]], 2, 1, 12);
    }
    return { head: h, face: { eyeK: 0.85, blush: false } };
  },

  // 눈송이 → 서리요정 → 설녀
  26: (d) => {
    const { E, P, Ln, st, up } = d;
    const flake = (x: number, y: number, r: number, c = 20) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        Ln(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, 0.7, c);
        Ln(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, x + Math.cos(a + 0.5) * r * 0.85, y + Math.sin(a + 0.5) * r * 0.85, 0.5, c);
      }
    };
    if (st === 1) {
      flake(0, -10, 10);
      E(0, -10, 5.5, 5.5, 1);
      return { head: [0, -10, 5.4], face: { eyeK: 1.1 } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) E(k * 8, -19 + up, 6, 3, 15, k * 0.7);
      P([[-6, -14], [-9, -2], [0, -4], [9, -2], [6, -14]], 1);
      E(0, -15, 5, 4, 1);
      const h: [number, number, number] = [0, -22, 6.4];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      flake(0, h[1] - h[2] - 2, 3.6, 5);
      return { head: h };
    }
    // 설녀: 얼음 왕관, 긴 머리, 길게 끌리는 옷자락, 눈꽃
    P([[-9, -32], [-14, -6], [-10, -1], [12, -1], [15, -6], [9, -32]], 4);
    P([[-7, -26], [-12, -2], [12, -2], [7, -26]], 1);
    P([[-2, -26], [-6, -2], [2, -2], [3, -26]], 15);
    for (const k of [-1, 1]) d.Cv([[k * 6, -24], [k * 12, -20], [k * 14, -14]], 2.4, 3.2, 1);
    const h: [number, number, number] = [0, -33, 6.4];
    E(h[0], h[1], h[2] + 1, h[2] + 1.5, 4);
    E(h[0] - 0.6, h[1] + 0.8, h[2] * 0.85, h[2] * 0.9, 2);
    for (const [x, hh] of [[-4, 4], [0, 7], [4, 4]] as Pt[]) P([[x - 1.6, h[1] - h[2] + 0.5], [x, h[1] - h[2] - hh], [x + 1.6, h[1] - h[2] + 0.5]], 20);
    for (const [x, y] of [[-17, -30], [16, -36], [18, -16]] as Pt[]) flake(x, y, 3, 20);
    return { head: h, face: { calm: true, blush: false } };
  },

  // 눈멧콩 → 털멧돼지 → 빙하멧돼지
  27: (d) => {
    const { E, P, B, Ln, st } = d;
    if (st === 1) {
      for (const x of [-3, 6]) E(x, -2.2, 1.8, 2.4, 16);
      B(1.5, -7, 8, 5, 1);
      for (const y of [-9.5, -7.5]) Ln(-3, y, 8, y, 0.6, 2, 1);
      for (const x of [-6, 3]) E(x, -2.2, 1.8, 2.4, 1);
      d.Cv([[9, -8], [11, -10], [10.5, -12]], 0.8, 0.6, 1);
      const h: [number, number, number] = [-7, -9, 5.6];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('boar', h[0], h[1], h[2]);
      return { head: h, kind: 'boar' };
    }
    const K = st === 2 ? 1 : 1.3;
    for (const x of [-4, 8]) E(x * K, -3 * K, 2.6 * K, 3.4 * K, 16);
    fluff(d, 3 * K, -10 * K, 11 * K, 6.5 * K, 1, 14, 1.8 * K);
    if (st === 3) for (let i = 0; i < 5; i++) P([[(-6 + i * 4) * K, -16 * K], [(-5 + i * 4) * K, (-22 - (i % 2) * 2) * K], [(-3.5 + i * 4) * K, -15.5 * K]], 20);
    for (const x of [-7, 5]) E(x * K, -3 * K, 2.6 * K, 3.4 * K, 1);
    const h: [number, number, number] = [-9 * K, -11 * K, 6.4 * K];
    fluff(d, h[0] + 2, h[1] - 1, h[2], h[2], 1, 10, 1.4 * K);
    d.muzzle('boar', h[0], h[1], h[2]);
    for (const k of [-1, 1]) d.Cv([[h[0] - h[2] * 0.75 + k * 0.5, h[1] + h[2] * 0.6], [h[0] - h[2] * 1.1 + k, h[1] + h[2] * 0.2], [h[0] - h[2] * 1.0 + k * 1.5, h[1] - h[2] * (st === 3 ? 0.6 : 0.15)]], 1.4 * K, 0.6 * K, st === 3 ? 20 : 5);
    return { head: h, kind: 'boar' };
  },

  // 모래상어 → 사막룡 → 사구룡: 땅을 헤엄치는 상어 → 지느러미 용 → 모래 언덕에서 솟구친 큰 용
  29: (d) => {
    const { E, P, B, st } = d;
    const fin = (x: number, y: number, h: number) => P([[x - h * 0.5, y], [x + h * 0.25, y - h], [x + h * 0.6, y]], 3);
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 4, -2, 2.6, 2, 16);
      d.Cv([[6, -6], [11, -7], [14, -10]], 2.6, 1.2, 1);
      P([[13, -10], [16, -14], [15, -8]], 3);
      B(0, -7, 8, 5, 1);
      B(-1, -5, 6, 2, 2);
      fin(2, -11, 5);
      const h: [number, number, number] = [-6, -10, 6];
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    if (st === 2) {
      d.Cv([[8, -9], [15, -8], [19, -13]], 3, 1.4, 1);
      P([[18, -13], [22, -18], [21, -10]], 3);
      for (const k of [-1, 1]) {
        E(k * 5, -4, 3.4, 4, 1);
        E(k * 5.5 - 1.2, -1, 4, 1.5, 1);
      }
      B(1, -12, 9, 8, 1);
      B(-0.5, -10, 6, 5, 2);
      fin(2, -19, 8);
      for (const k of [-1, 1]) P([[k * 8, -14], [k * 15, -10], [k * 9, -9]], 3);
      const h: [number, number, number] = [-6, -22, 6.6];
      for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 4], [h[0] + k * 6 + 3, h[1] - 9], [h[0] + k * 6, h[1] - 1]], 1);
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    // 사구룡: 모래 언덕에서 상반신이 솟구친다
    for (const [x, r] of [[-14, 6], [-4, 8], [8, 7.5], [17, 5.5]] as Pt[]) E(x, -2, r, r * 0.5, 11);
    for (const [x, y] of [[-10, -3], [4, -4], [14, -2]] as Pt[]) d.set(x, y, 16);
    B(1, -15, 10, 11, 1);
    B(-1, -13, 6.5, 8, 2);
    fin(4, -26, 13);
    for (const k of [-1, 1]) {
      P([[k * 8, -22], [k * 20, -20], [k * 22, -12], [k * 10, -14]], 3);
      for (const t of [0, 1, 2]) d.set(k * (19 + t), -12 - t * 3, 9);
    }
    const h: [number, number, number] = [-6, -30, 7.4];
    for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 4], [h[0] + k * 7 + 4, h[1] - 11], [h[0] + k * 7, h[1] - 1]], 1);
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    for (let i = 0; i < 4; i++) P([[h[0] - 9 + i * 2, h[1] + 3.5], [h[0] - 8 + i * 2, h[1] + 5.5], [h[0] - 7 + i * 2, h[1] + 3.5]], 5);
    return { head: h, kind: 'lizard' };
  },

  // 까마귀콩 → 밤까마귀 → 까마귀두목
  30: (d) => {
    const { E, P, B, Ln, st, up } = d;
    const beak = (h: [number, number, number], L: number) => P([[h[0] - h[2] * 0.6, h[1] - 0.5], [h[0] - h[2] * 0.6 - L, h[1] + 1.2], [h[0] - h[2] * 0.6, h[1] + 3]], 6);
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      fluff(d, 0, -9.5, 7.5, 7, 1, 12, 1.4);
      foldWing(d, 0, -11, 7, 16, 21);
      const h: [number, number, number] = [-3, -16, 6.4];
      fluff(d, h[0], h[1], h[2], h[2] * 0.95, 1, 9, 1.2);
      beak(h, 5);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) Ln(k * 2.5, -5, k * 3, 0, 1, 12);
      P([[6, -11], [18, -12], [17, -8], [19, -5], [7, -7]], 16);
      B(1, -12, 8.5, 8, 1);
      openWing(d, 1, 3, -15, 14, 8 - up, 1, 16);
      const h: [number, number, number] = [-4, -21, 6.2];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      beak(h, 7);
      // 빛나는 것을 문 부리
      E(h[0] - h[2] - 4, h[1] + 3, 1.4, 1.4, 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    // 까마귀두목: 갓을 쓰고 망토를 두른 두목, 엽전 한 닢
    for (const k of [-1, 1]) {
      Ln(k * 3, -6, k * 4, -1, 1.4, 12);
      for (const t of [-1, 0, 1]) Ln(k * 4, -1, k * 4 + t * 1.6 - 1, 0.4, 0.7, 6);
    }
    P([[-12, -26], [-15, -4], [0, -8], [15, -4], [12, -26]], 3);
    B(0, -16, 9.5, 10, 1);
    B(-1.5, -14, 5, 7, 16);
    // 망토 깃
    P([[-9, -26], [0, -20], [9, -26], [0, -23]], 4);
    const h: [number, number, number] = [-3, -30, 6.6];
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    beak(h, 8);
    // 갓
    E(h[0], h[1] - h[2] + 1, 11, 1.6, 6);
    P([[h[0] - 4, h[1] - h[2] + 1], [h[0] - 3.5, h[1] - h[2] - 6], [h[0] + 3.5, h[1] - h[2] - 6], [h[0] + 4, h[1] - h[2] + 1]], 6);
    Ln(h[0] - 4, h[1] - 1, h[0] - 3, h[1] + 6, 0.5, 12);
    // 엽전
    E(-12, -12, 2.6, 2.6, 12);
    E(-12, -12, 0.9, 0.9, 4);
    E(-10, -13, 2.2, 2.4, 1);
    return { head: h, body: 'bird', face: { mouth: 'beak', blush: false } };
  },

  // 들고양 → 그림자냥 → 밤표범
  31: (d) => {
    const { E, P, B, st } = d;
    const catHead = (h: [number, number, number], ear: number) => {
      for (const k of [-1, 1]) {
        P([[h[0] + k * 2, h[1] - 4], [h[0] + k * 6, h[1] - 4 - ear], [h[0] + k * 7.5, h[1] - 1]], 1);
        P([[h[0] + k * 3, h[1] - 4], [h[0] + k * 5.8, h[1] - 2.5 - ear * 0.75], [h[0] + k * 6.6, h[1] - 2]], 7);
      }
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('cat', h[0], h[1], h[2]);
    };
    if (st === 1) {
      d.Cv([[7, -6], [12, -9], [11, -15]], 1.6, 1.2, 1);
      for (const x of [-2, 6]) E(x, -2.2, 1.8, 2.4, 16);
      B(2, -7, 7, 4.6, 1);
      for (const x of [-5, 3]) E(x, -2.2, 1.8, 2.4, 1);
      const h: [number, number, number] = [-6, -12, 6.8];
      catHead(h, 6);
      return { head: h, kind: 'cat' };
    }
    if (st === 2) {
      // 연기 꼬리
      for (const [x, y, r] of [[12, -11, 2.4], [15, -14, 2.8], [16, -19, 3], [13, -23, 2.6], [10, -25, 2]] as [number, number, number][]) E(x, y, r, r, 16);
      for (const x of [-3, 8]) E(x, -3, 2.2, 3.4, 16);
      B(3, -9.5, 9.5, 5, 1);
      for (const x of [-6, 5]) E(x, -3, 2.2, 3.4, 1);
      const h: [number, number, number] = [-8, -16, 6.6];
      catHead(h, 7);
      return { head: h, kind: 'cat' };
    }
    // 밤표범: 길고 낮은 몸, 반점, 이마 초승달
    d.Cv([[14, -14], [21, -12], [23, -20], [19, -25]], 2.6, 1.6, 1);
    for (const x of [-4, 11]) E(x, -4.5, 3, 4.6, 16);
    B(4, -13, 13.5, 6.8, 1);
    B(3, -9.5, 10, 2.6, 2);
    for (const [x, y] of [[0, -16], [5, -17], [10, -15], [3, -13], [8, -12], [13, -13]] as Pt[]) {
      E(x, y, 1.6, 1.4, 21, 0, 1);
      d.set(x, y, 1);
    }
    for (const x of [-8, 7]) E(x, -4.5, 3, 4.6, 1);
    const h: [number, number, number] = [-11, -19, 7];
    catHead(h, 6);
    E(h[0], h[1] - h[2] + 2.4, 2, 2, 12);
    E(h[0] + 1, h[1] - h[2] + 1.8, 1.7, 1.7, 1, 0, 12);
    return { head: h, kind: 'cat' };
  },
  // 철갑콩 → 쇠비늘 → 강철요새
  32: (d) => {
    const { E, P, B, Ln, st } = d;
    const plates = (x0: number, y: number, n: number, w: number, h: number) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * w;
        E(x, y, w * 0.62, h, i % 2 ? 16 : 3, 0, 1);
        Ln(x - w * 0.5, y - h, x - w * 0.5, y + h, 0.5, 21, 1);
      }
    };
    if (st === 1) {
      for (const x of [-3, 6]) E(x, -2, 2.4, 2.2, 16);
      B(2, -7.5, 8.5, 5.6, 1);
      plates(-3, -9, 4, 3.2, 3);
      for (const x of [-6, 3]) E(x, -2, 2.4, 2.2, 1);
      const h: [number, number, number] = [-7, -9, 5.4];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('rhino', h[0], h[1], h[2]);
      return { head: h, kind: 'rhino' };
    }
    const K = st === 2 ? 1 : 1.3;
    for (const x of [-4, 9]) E(x * K, -4 * K, 3 * K, 4 * K, 16);
    B(3 * K, -11 * K, 11.5 * K, 7.4 * K, 1);
    plates(-5 * K, -14 * K, 5, 4 * K, 4 * K);
    if (st === 3) {
      // 등 위 성벽과 깃발
      P([[-6, -24], [-6, -30], [-3, -30], [-3, -27], [0, -27], [0, -30], [3, -30], [3, -27], [6, -27], [6, -30], [9, -30], [9, -24]], 16);
      for (const x of [-4, 2, 8]) E(x, -26, 0.8, 1.2, 6);
      Ln(9, -30, 9, -40, 0.6, 11);
      P([[9, -40], [15, -38], [9, -36]], 3);
    }
    for (const x of [-8, 6]) E(x * K, -4 * K, 3 * K, 4 * K, 1);
    const h: [number, number, number] = [-11 * K, -12 * K, 6.4 * K];
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('rhino', h[0], h[1], h[2]);
    if (st === 3) P([[h[0] - 2, h[1] - h[2] + 1], [h[0], h[1] - h[2] - 6], [h[0] + 2, h[1] - h[2] + 1]], 12);
    return { head: h, kind: 'rhino' };
  },

  // 반짝이 → 별빛요정 → 은하공주
  33: (d) => {
    const { E, P, Ln, st, up } = d;
    const star = (x: number, y: number, r: number, c: number) => {
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? r * 0.48 : r;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      P(pts, c);
    };
    if (st === 1) {
      star(0, -9, 10, 1);
      E(0, -8, 5, 4.5, 1);
      return { head: [0, -8.5, 5.4], face: { eyeK: 1.05 } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) E(k * 8, -18 + up, 5.5, 3.4, 15, k * 0.6);
      P([[-6, -12], [-8, -2], [8, -2], [6, -12]], 1);
      E(0, -13, 4.4, 4, 1);
      Ln(8, -12, 13, -20, 0.7, 12);
      star(13.5, -21, 3, 12);
      const h: [number, number, number] = [0, -21, 6.4];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      star(h[0], h[1] - h[2] - 1.5, 3, 12);
      return { head: h };
    }
    // 은하공주: 별이 박힌 긴 드레스, 별 왕관, 띠 같은 은하
    d.Cv([[-18, -10], [-8, -30], [8, -36], [18, -24]], 2.4, 1.6, 15);
    P([[-7, -24], [-15, -2], [15, -2], [7, -24]], 1);
    P([[-4, -24], [-8, -2], [8, -2], [4, -24]], 3);
    for (const [x, y] of [[-8, -8], [5, -12], [-2, -16], [9, -5], [0, -6]] as Pt[]) d.set(x, y, 9);
    E(0, -25, 5, 4, 1);
    for (const k of [-1, 1]) {
      E(k * 7, -22, 2, 4.6, 1, k * -0.5);
      E(k * 8.5, -17.5, 1.6, 1.6, 2);
    }
    const h: [number, number, number] = [0, -32, 6.4];
    E(h[0], h[1], h[2] + 1, h[2] + 1.4, 4);
    E(h[0] - 0.5, h[1] + 0.8, h[2] * 0.85, h[2] * 0.9, 2);
    for (const [x, r] of [[-4, 2], [0, 3.2], [4, 2]] as Pt[]) star(h[0] + x, h[1] - h[2] - 1 - (x === 0 ? 1.5 : 0), r, 12);
    for (const [x, y] of [[-16, -32], [17, -14], [-17, -18]] as Pt[]) star(x, y, 1.8, 12);
    return { head: h, face: { calm: true } };
  },

  // 솜사탕양 → 구름양 → 꿈양털
  34: (d) => {
    const { E, st } = d;
    const horn = (h: [number, number, number], k: number, sz: number) => {
      for (const sgn of [-1, 1]) d.Cv([[h[0] + sgn * 3, h[1] - 3], [h[0] + sgn * (5 + sz), h[1] - 4 - sz], [h[0] + sgn * (6 + sz), h[1] + 1], [h[0] + sgn * (3.5 + sz * 0.4), h[1] + 1.5]], 1.6 * k, 1 * k, 12);
    };
    if (st === 1) {
      for (const x of [-3, 5]) E(x, -2.2, 1.4, 2.4, 6);
      fluff(d, 1, -8, 8, 5.5, 1, 12, 1.8);
      const h: [number, number, number] = [-5, -12, 5.6];
      fluff(d, h[0] + 1, h[1] - 2, 5, 3, 1, 8, 1.4);
      E(h[0], h[1], h[2] * 0.8, h[2], 2);
      return { head: h, kind: 'sheep' };
    }
    const K = st === 2 ? 1.25 : 1.6;
    for (const x of [-4, 6]) E(x * K, -2.6 * K, 1.6 * K, 2.8 * K, 6);
    fluff(d, 1 * K, -9 * K, 9 * K, 6 * K, 1, 14, 2.2 * K);
    if (st === 3) for (const [x, y] of [[-12, -26], [0, -30], [12, -27]] as Pt[]) fluff(d, x, y, 4, 3, 15, 8, 1.4);
    const h: [number, number, number] = [-7 * K, -13 * K, 5.4 * K];
    fluff(d, h[0] + 1, h[1] - 2.5, 5 * K, 3 * K, 1, 8, 1.4 * K);
    E(h[0], h[1], h[2] * 0.78, h[2], 2);
    horn(h, K, st === 2 ? 2 : 4);
    return { head: h, kind: 'sheep', face: { calm: st === 3 } };
  },

  // 연잎동동 → 연꽃갓 → 연못신령
  35: (d) => {
    const { E, P, Ln, st } = d;
    const pad = (x: number, y: number, r: number) => {
      E(x, y, r, r * 0.35, 14);
      P([[x, y], [x - r * 0.25, y + r * 0.35], [x + r * 0.25, y + r * 0.35]], 1);
      Ln(x, y, x - r * 0.8, y - r * 0.1, 0.5, 16, 14);
    };
    const lotus = (x: number, y: number, r: number) => {
      for (const [dx, rot] of [[-r * 0.6, -0.5], [r * 0.6, 0.5], [0, 0]] as Pt[]) E(x + dx, y - r * 0.6, r * 0.38, r * 0.8, 7, rot);
      E(x, y - r * 0.2, r * 0.3, r * 0.2, 12);
    };
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 4, -1.6, 2.6, 1.6, 1);
      E(0, -7, 7, 6, 1);
      E(-0.5, -5.5, 4.6, 3.4, 2);
      pad(0, -13.5, 8);
      return { head: [0, -7.5, 6.4] };
    }
    if (st === 2) {
      for (const k of [-1, 1]) {
        E(k * 5.5, -3, 3.4, 2.6, 1);
        E(k * 6.5 - 1, -0.8, 3.6, 1.2, 1);
      }
      E(0, -10, 8, 7, 1);
      E(-0.5, -8.5, 5.4, 4.4, 2);
      for (const k of [-1, 1]) E(k * 8, -10, 2, 3.4, 1, k * 0.5);
      const h: [number, number, number] = [0, -18, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      pad(0, h[1] - h[2] + 0.5, 10);
      lotus(0, h[1] - h[2] - 1, 4.4);
      return { head: h };
    }
    // 연못신령: 연잎 갓, 긴 흰 수염, 갈대 지팡이, 물결 도포
    P([[-8, -24], [-12, -2], [12, -2], [8, -24]], 1);
    for (let i = 0; i < 3; i++) d.Cv([[-10 + i * 1.5, -6 - i * 5], [-4, -8 - i * 5], [3, -6 - i * 5], [10 - i * 1.5, -8 - i * 5]], 0.6, 0.6, 20);
    Ln(14, -1, 14, -36, 1, 11);
    E(14, -38, 1.4, 3.4, 11);
    E(11, -20, 2.6, 2.4, 1);
    const h: [number, number, number] = [0, -30, 6.8];
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    P([[h[0] - 5, h[1] + 3.5], [h[0] - 1, h[1] + 16], [h[0] + 3, h[1] + 3.5]], 5);
    pad(0, h[1] - h[2] + 0.5, 14);
    lotus(0, h[1] - h[2] - 1, 5.4);
    return { head: h, face: { calm: true, blush: false } };
  },

  // 해파리콩 → 독해파리 → 대왕해파리
  36: (d) => {
    const { E, P, st, frame } = d;
    const w = frame === 1 ? 1 : -1;
    const tent = (x: number, y: number, len: number, c: number, ph: number) => d.Cv([[x, y], [x + w * ph, y + len * 0.5], [x - w * ph, y + len]], 1.4, 0.7, c);
    if (st === 1) {
      for (let i = 0; i < 3; i++) tent(-3 + i * 3, -6, 6, 15, 1);
      E(0, -11, 7, 5.6, 1);
      E(0, -7, 7.4, 1.4, 15);
      return { head: [0, -11, 6.2] };
    }
    if (st === 2) {
      for (let i = 0; i < 5; i++) tent(-6 + i * 3, -10, 10 + (i % 2) * 3, i % 2 ? 3 : 15, 1.6);
      E(0, -18, 9, 7, 1);
      E(0, -12.5, 9.5, 1.8, 15);
      for (const [x, y] of [[-4, -21], [3, -22], [6, -18]] as Pt[]) E(x, y, 1.2, 1.2, 3, 0, 1);
      return { head: [0, -17, 7.8] };
    }
    // 대왕해파리: 왕관을 쓴 큰 갓, 수많은 촉수
    for (let i = 0; i < 9; i++) tent(-12 + i * 3, -17, 16 + (i % 3) * 3, i % 2 ? 3 : 15, 2.4);
    E(0, -27, 14, 11, 1);
    E(0, -18, 14.5, 2.6, 15);
    for (let i = 0; i < 7; i++) E(-12 + i * 4, -16, 2, 1.6, 15);
    for (const [x, y] of [[-7, -31], [5, -33], [9, -26], [-10, -24]] as Pt[]) E(x, y, 1.6, 1.6, 3, 0, 1);
    P([[-5, -37], [-5, -42], [-2.5, -39], [0, -43], [2.5, -39], [5, -42], [5, -37]], 12);
    return { head: [0, -26, 9.5] };
  },

  // 조개콩 → 진주조개 → 용궁소라
  37: (d) => {
    const { E, P, Ln, st } = d;
    if (st === 1) {
      E(0, -5, 9, 4.6, 1);
      E(0, -9, 9, 4.6, 16);
      for (let i = -2; i <= 2; i++) Ln(i * 3, -13, i * 2.4, -6, 0.5, 21, 16);
      E(0, -6.5, 6, 2, 21);
      return { head: [0, -6.5, 4.6], face: { ey: -0.1, mouth: 'none', blush: false } };
    }
    if (st === 2) {
      // 위 껍데기를 열고 진주를 품은 조개
      P([[-12, -12], [-8, -24], [0, -27], [8, -24], [12, -12]], 16);
      for (let i = -2; i <= 2; i++) Ln(i * 4.5, -26, i * 3.6, -13, 0.6, 21, 16);
      E(0, -6, 12, 6, 1);
      for (let i = -2; i <= 2; i++) Ln(i * 4.5, -1, i * 3.6, -7, 0.6, 21, 1);
      E(0, -11, 9, 2.6, 7);
      E(0, -13, 3.4, 3.4, 5);
      d.set(-1, -14.5, 9);
      return { head: [0, -6, 6], face: { ey: 0, my: 0.5 } };
    }
    // 용궁소라: 커다란 나선 소라를 진 집게 깨비
    const cx = 5;
    const cy = -22;
    for (let i = 0; i < 4; i++) E(cx + i * 1.5, cy - i * 3.6, 12 - i * 2.8, 9 - i * 2, i % 2 ? 16 : 1);
    P([[cx + 6, cy - 14], [cx + 8, cy - 22], [cx + 9, cy - 13]], 12);
    for (let i = 0; i < 4; i++) P([[cx - 10 + i * 6, cy + 4], [cx - 8 + i * 6, cy - 6 - (i % 2) * 2], [cx - 6 + i * 6, cy + 4]], 2);
    E(cx - 2, cy + 6, 9, 3, 7);
    for (const [x, dx] of [[-6, -3], [-2, -1], [2, 1]] as Pt[]) Ln(x, -11, x + dx, 0, 1, 3);
    // 집게
    for (const k of [0, 1]) {
      const x = -12 + k * 3;
      E(x, -13 + k * 3, 4, 3, 3);
      P([[x - 4, -15 + k * 3], [x - 8, -17 + k * 3], [x - 4, -12 + k * 3]], 3);
    }
    const h: [number, number, number] = [-6, -18, 5];
    E(h[0], h[1], h[2], h[2] * 0.9, 3);
    for (const k of [-1, 1]) Ln(h[0] + k * 2, h[1] - 3, h[0] + k * 3, h[1] - 8, 0.6, 4);
    return { head: h, face: { blush: false } };
  },

  // 쇠주먹 → 무쇠권법사 → 강철무사
  38: (d) => {
    const { E, P, B, Ln, st } = d;
    const gaunt = (x: number, y: number, r: number) => {
      E(x, y, r, r * 0.95, 12);
      Ln(x - r * 0.6, y - r * 0.3, x + r * 0.6, y - r * 0.3, 0.5, 4, 12);
      d.set(x - r * 0.3, y - r * 0.5, 9);
    };
    if (st === 1) {
      for (const k of [-1, 1]) {
        E(k * 3.5, -2.5, 2.6, 3, 1);
        E(k * 4 - 1, -0.8, 3.2, 1.3, 16);
      }
      B(0, -9, 6.5, 6, 1);
      B(0, -8.5, 4, 4, 2);
      for (const k of [-1, 1]) gaunt(k * 8.5, -10, 3.4);
      const h: [number, number, number] = [0, -18, 7.6];
      for (const k of [-1, 1]) P([[h[0] + k * 2.5, h[1] - 4], [h[0] + k * 6, h[1] - 10], [h[0] + k * 7.5, h[1] - 2]], 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      return { head: h };
    }
    if (st === 2) {
      for (const k of [-1, 1]) {
        E(k * 6, -4.5, 3.8, 5, 1);
        E(k * 7 - 1.4, -1, 4.6, 1.8, 16);
      }
      B(0, -14, 9, 10, 1);
      B(0, -13, 5.6, 6.5, 2);
      E(0, -8, 9.5, 1.6, 3);
      // 권법 자세: 앞으로 뻗은 주먹
      E(-10, -17, 3.4, 3, 1);
      gaunt(-15, -18, 4);
      E(10, -15, 3, 5, 1, -0.3);
      gaunt(11, -10, 3.4);
      const h: [number, number, number] = [0, -28, 7.2];
      for (const k of [-1, 1]) P([[h[0] + k * 2.5, h[1] - 4], [h[0] + k * 6, h[1] - 10], [h[0] + k * 7.5, h[1] - 2]], 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      E(h[0], h[1] - h[2] * 0.4, h[2] + 0.2, 1.1, 3, 0, 1);
      return { head: h };
    }
    // 강철무사: 투구, 갑옷, 칼날 팔
    for (const k of [-1, 1]) {
      E(k * 6, -5.5, 4.4, 6, 12);
      E(k * 7 - 1.4, -1.2, 5, 2, 16);
    }
    B(0, -17, 10.5, 11, 1);
    P([[-9, -26], [9, -26], [7, -10], [-7, -10]], 12);
    Ln(0, -26, 0, -10, 0.6, 4, 12);
    for (const k of [-1, 1]) E(k * 11, -25, 4.6, 3.2, 12);
    E(-13, -19, 3.2, 5, 1, 0.4);
    P([[-15, -15], [-24, -36], [-21, -37], [-13, -16]], 9);
    E(12, -19, 3.2, 5, 1, -0.4);
    gaunt(13, -13, 3.6);
    const h: [number, number, number] = [0, -33, 7];
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    // 투구
    P([[h[0] - 8, h[1] - 1], [h[0] - 7, h[1] - 7], [h[0], h[1] - 10], [h[0] + 7, h[1] - 7], [h[0] + 8, h[1] - 1], [h[0] + 6, h[1] - 2], [h[0] - 6, h[1] - 2]], 12);
    P([[h[0] - 1.5, h[1] - 9], [h[0], h[1] - 17], [h[0] + 1.5, h[1] - 9]], 3);
    return { head: h };
  },

  // 명상콩 → 수도승 → 도인
  39: (d) => {
    const { E, P, B, Ln, st, frame } = d;
    const f = frame === 1 ? -0.6 : 0;
    const beads = (y: number, w: number) => {
      for (let i = -4; i <= 4; i++) E(i * w * 0.24, y + Math.abs(i) * -0.5 + 2, 0.9, 0.9, i % 2 ? 11 : 12);
    };
    if (st === 1) {
      E(0, -2, 9, 2.6, 3);
      for (const k of [-1, 1]) E(k * 4, -4, 4.4, 2.2, 1);
      B(0, -9, 6, 5.5, 1);
      B(0, -8.5, 3.8, 3.8, 2);
      for (const k of [-1, 1]) E(k * 2.4, -5.5, 2, 1.6, 1);
      const h: [number, number, number] = [0, -17, 7];
      for (const k of [-1, 1]) E(h[0] + k * 6.4, h[1] - 0.5, 2.2, 2.2, 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('ape', h[0], h[1], h[2]);
      return { head: h, kind: 'ape', face: { calm: true } };
    }
    if (st === 2) {
      E(0, -3, 12, 3.4, 3);
      for (const k of [-1, 1]) E(k * 5.5, -5.5, 6, 3, 4);
      P([[-8, -20], [-10, -5], [10, -5], [8, -20]], 4);
      P([[-2, -20], [6, -6], [9, -8], [3, -20]], 3);
      beads(-21, 11);
      for (const k of [-1, 1]) E(k * 3, -11, 2.4, 2, 1);
      const h: [number, number, number] = [0, -27, 7.4];
      for (const k of [-1, 1]) E(h[0] + k * 6.8, h[1] - 0.5, 2.3, 2.3, 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('ape', h[0], h[1], h[2]);
      return { head: h, kind: 'ape', face: { calm: true } };
    }
    // 도인: 구름 타고 둥실, 긴 수염과 눈썹, 깃털 부채
    for (const [x, y, r] of [[-11, -3, 5], [-2, -2, 6.5], [9, -3, 5.6], [16, -5, 3.4]] as [number, number, number][]) E(x, y + f, r, r * 0.7, 5);
    P([[-9, -26], [-12, -6], [12, -6], [9, -26]], 4);
    P([[-3, -26], [5, -8], [9, -10], [3, -26]], 3);
    E(0, -8 + f, 11, 2.6, 4);
    // 부채
    for (let i = 0; i < 5; i++) {
      const a = -2.2 + i * 0.35;
      P([[13, -18 + f], [13 + Math.cos(a) * 10, -18 + Math.sin(a) * 10 + f], [13 + Math.cos(a + 0.3) * 10, -18 + Math.sin(a + 0.3) * 10 + f]], i % 2 ? 5 : 15);
    }
    Ln(13, -18 + f, 12, -14 + f, 0.8, 11);
    E(11, -17 + f, 2.4, 2.2, 1);
    const h: [number, number, number] = [0, -32 + f, 7.2];
    for (const k of [-1, 1]) E(h[0] + k * 6.6, h[1] - 0.5, 2.3, 2.3, 1);
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('ape', h[0], h[1], h[2]);
    P([[h[0] - 5, h[1] + 4], [h[0] - 2, h[1] + 19], [h[0] + 2, h[1] + 4]], 5);
    for (const k of [-1, 1]) d.Cv([[h[0] + k * 1.5 - 1, h[1] - 3.2], [h[0] + k * 5, h[1] - 4], [h[0] + k * 8, h[1] - 1]], 0.9, 0.6, 5);
    // 상투와 비녀
    E(h[0] + 1, h[1] - h[2] - 1, 2.4, 2.2, 21);
    Ln(h[0] - 3, h[1] - h[2] - 1, h[0] + 5, h[1] - h[2] - 1.5, 0.6, 12);
    return { head: h, kind: 'ape', face: { calm: true } };
  },

  // 솔개콩 → 회오리솔개 → 태풍수리
  40: (d) => {
    const { E, P, B, Ln, st, up, frame } = d;
    const twister = (x: number, y: number, h: number, w: number) => {
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        E(x + Math.sin(t * 6 + frame) * 1.2, y - t * h, w * (0.3 + t * 0.7), 1.2, i % 2 ? 15 : 5);
      }
    };
    const hook = (h: [number, number, number], L: number) => P([[h[0] - h[2] * 0.6, h[1] - 0.5], [h[0] - h[2] * 0.6 - L, h[1] + 0.5], [h[0] - h[2] * 0.6 - L * 0.8, h[1] + 3], [h[0] - h[2] * 0.6, h[1] + 2.6]], 12);
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      B(0, -9.5, 7.5, 7, 1);
      B(-1.5, -8, 4.5, 4.5, 2);
      foldWing(d, 0, -11, 8, 16, 2);
      const h: [number, number, number] = [-3, -16, 6.2];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      hook(h, 4);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    if (st === 2) {
      twister(0, -1, 8, 6);
      for (const k of [-1, 1]) openWing(d, k, k * 3, -18, 15, 7 - up, 1, 16);
      // 회오리 깃털 꼬리
      d.Cv([[4, -12], [11, -10], [12, -15], [8, -16]], 1.6, 1, 2);
      B(0, -15, 7, 7.5, 1);
      B(-1.5, -14, 4, 5, 2);
      const h: [number, number, number] = [-3, -24, 6];
      P([[h[0] + 2, h[1] - 3], [h[0] + 10, h[1] - 6], [h[0] + 4, h[1]]], 16);
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      hook(h, 5);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    // 태풍수리: 발밑에 태풍, 큰 날개, 흰 머리
    twister(0, 0, 14, 10);
    for (const k of [-1, 1]) openWing(d, k, k * 5, -26, 24, 12 - up, 1, 16);
    for (const k of [-1, 1]) for (const t of [-1, 0, 1]) Ln(k * 3, -13, k * 3 + t * 1.5 - 1, -10, 0.8, 12);
    B(0, -19, 8.5, 8.5, 1);
    B(-1, -18, 5, 6, 16);
    const h: [number, number, number] = [-3, -30, 6.8];
    E(h[0] + 1, h[1] + 3, 6, 3.4, 5);
    E(h[0], h[1], h[2], h[2] * 0.95, 5);
    hook(h, 6);
    return { head: h, body: 'bird', face: { mouth: 'beak', blush: false } };
  },

  // 번개새콩 → 천둥까치 → 뇌조
  41: (d) => {
    const { E, P, B, Ln, st, up } = d;
    const zz = (x: number, y: number, k: number, L: number) => P([[x, y], [x + k * L * 0.45, y - L * 0.3], [x + k * L * 0.35, y - L * 0.15], [x + k * L, y - L * 0.55], [x + k * L * 0.55, y + L * 0.1], [x + k * L * 0.65, y - L * 0.02], [x + k * 2, y + 3]], 3);
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      B(0, -9.5, 7.5, 7, 1);
      B(-1.5, -8, 4.5, 4.5, 2);
      zz(3, -12, 1, 9);
      const h: [number, number, number] = [-3, -16, 6.2];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      P([[h[0] - 1, h[1] - h[2] + 1], [h[0] + 1, h[1] - h[2] - 5], [h[0], h[1] - h[2] - 2.5], [h[0] + 3, h[1] - h[2] - 6], [h[0] + 2, h[1] - h[2] + 1]], 3);
      P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.45, h[1] + 1.6], [h[0] - h[2] * 0.7, h[1] + 3]], 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    const K = st === 2 ? 1 : 1.3;
    for (const k of [-1, 1]) Ln(k * 2.5 * K, -5 * K, k * 3 * K, 0, 1, 12);
    for (const k of [-1, 1]) {
      zz(k * 4 * K, -18 * K, k, 18 * K - up);
      if (st === 3) zz(k * 4 * K, -14 * K, k, 13 * K);
    }
    P([[5 * K, -11 * K], [16 * K, -6 * K], [13 * K, -4 * K], [17 * K, -1 * K], [5 * K, -6 * K]], 3);
    B(0, -13 * K, 7.5 * K, 7.5 * K, 1);
    B(-1.5 * K, -12 * K, 4.5 * K, 5 * K, 2);
    const h: [number, number, number] = [-3 * K, -21 * K, 6.2 * K];
    for (let i = 0; i < (st === 3 ? 3 : 2); i++) P([[h[0] + i * 2, h[1] - h[2] + 1], [h[0] + 3 + i * 3, h[1] - h[2] - 6 - i], [h[0] + 3 + i * 2, h[1] - h[2] + 1]], 3);
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.5, h[1] + 1.6], [h[0] - h[2] * 0.7, h[1] + 3]], 12);
    return { head: h, body: 'bird', face: { mouth: 'beak' } };
  },

  // 미꾸리 → 진흙메기 → 늪지왕메기
  42: (d) => {
    const { E, P, st, frame } = d;
    const sw = frame === 1 ? 1 : 0;
    if (st === 1) {
      d.Cv([[12, -4], [6, -6 + sw], [0, -5], [-6, -6]], 2.4, 4, 1);
      P([[11, -4], [15, -7], [15, -1]], 3);
      const h: [number, number, number] = [-6, -6, 4.4];
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.Cv([[h[0] - 4, h[1] + 1], [h[0] - 6, h[1] + 3], [h[0] - 6, h[1] + 5]], 0.6, 0.5, 4);
      return { head: h, body: 'fish' };
    }
    const K = st === 2 ? 1 : 1.35;
    P([[11 * K, -8 * K], [20 * K, -14 * K + sw], [18 * K, -7 * K], [20 * K, -1 * K - sw]], 3);
    E(0, -8 * K, 13 * K, 7 * K, 1);
    E(-1 * K, -4.5 * K, 10 * K, 2.6 * K, 2);
    for (const [x, y] of [[2, -11], [6, -9], [-2, -12], [9, -11]] as Pt[]) E(x * K, y * K, 1.3, 1.1, 16, 0, 1);
    P([[-2 * K, -14 * K], [3 * K, -19 * K], [7 * K, -13 * K]], 3);
    // 메기 수염
    for (const [ex, ey] of [[-20, -2], [-17, 3], [-14, -12]] as Pt[]) d.Cv([[-11 * K, -7 * K], [ex * K * 0.9, (ey - 2) * K], [ex * K, ey * K]], 1, 0.6, 4);
    if (st === 3) P([[-9, -15], [-9, -20], [-6.5, -17], [-4, -21], [-1.5, -17], [1, -20], [1, -15]], 12);
    return { head: [-7 * K, -9 * K, 6 * K], body: 'fish', face: { eyeK: 0.9 } };
  },

  // 화석벌레 → 삼엽투구 → 고대투구
  43: (d) => {
    const { E, P, Ln, st } = d;
    const K = [1, 1.3, 1.6][st - 1];
    for (const [x, dx] of [[-4, -3], [0, 0], [4, 3]] as Pt[]) Ln(x * K, -3 * K, (x + dx) * K, 0, 0.7, 16);
    E(2 * K, -6 * K, 10 * K, 5 * K, 1);
    for (let i = 0; i < 5; i++) Ln((-4 + i * 3.4) * K, -10.5 * K, (-4 + i * 3.4) * K, -2 * K, 0.6, 16, 1);
    Ln(-6 * K, -6.5 * K, 11 * K, -6.5 * K, 0.6, 2, 1);
    P([[11 * K, -6 * K], [16 * K, -9 * K], [15 * K, -3 * K]], 1);
    const h: [number, number, number] = [-8 * K, -7 * K, 4.8 * K];
    E(h[0], h[1], h[2] * 1.2, h[2], 1);
    if (st >= 2) {
      // 투구 가시
      for (let i = 0; i < 4; i++) P([[(-4 + i * 4) * K, -10 * K], [(-3 + i * 4) * K, (-14 - (i % 2) * 2) * K], [(-2 + i * 4) * K, -10 * K]], 3);
      P([[h[0] - h[2], h[1] - 1], [h[0] - h[2] - 4, h[1] - 5], [h[0] - h[2] + 1, h[1] - 3]], 3);
    }
    if (st === 3) for (const k of [-1, 1]) P([[h[0] + 2, h[1] + 2 * k], [h[0] - 9, h[1] + 6 * k + 2], [h[0] - 1, h[1] + 3 * k + 1]], 9);
    return { head: h, face: { eyeK: 0.9, blush: false, mouth: 'none' } };
  },

  // 화석알 → 뼈도마뱀 → 고대용
  44: (d) => {
    const { E, P, B, Ln, st, up } = d;
    const bone = (x1: number, y1: number, x2: number, y2: number) => {
      Ln(x1, y1, x2, y2, 1.2, 5);
      for (const [x, y] of [[x1, y1], [x2, y2]] as Pt[]) E(x, y, 1.2, 1.2, 5);
    };
    if (st === 1) {
      E(0, -9, 7.5, 9, 2);
      P([[-7.5, -11], [-4, -8], [-1, -12], [2, -8], [5, -12], [7.5, -9], [7.5, -20], [-7.5, -20]], 11);
      E(0, -15, 6.5, 5.5, 11);
      for (const [x, y] of [[-3, -4], [3, -6], [-1, -15]] as Pt[]) d.set(x, y, 16);
      return { head: [0, -9, 5.4], face: { ey: -0.1 } };
    }
    if (st === 2) {
      d.Cv([[6, -6], [13, -5], [17, -9]], 2.4, 1, 1);
      for (const k of [-1, 1]) {
        E(k * 4.5, -3, 3, 3.4, 1);
        E(k * 5 - 1, -1, 3.6, 1.3, 1);
      }
      B(0, -10, 7.5, 7, 1);
      for (let i = 0; i < 3; i++) d.Cv([[-6, -13 + i * 3], [0, -12 + i * 3], [6, -13 + i * 3]], 0.7, 0.7, 5);
      const h: [number, number, number] = [-3, -20, 6.8];
      E(h[0], h[1], h[2], h[2] * 0.88, 1);
      // 머리뼈 투구
      P([[h[0] - 8, h[1] - 1], [h[0] - 5, h[1] - 7], [h[0] + 5, h[1] - 8], [h[0] + 8, h[1] - 3], [h[0] + 5, h[1] - 1]], 5);
      for (const k of [-1, 1]) E(h[0] + k * 3, h[1] - 4.6, 1.4, 1, 16);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    // 고대용: 뼈 갑옷, 화석 날개, 큰 턱
    for (const k of [-1, 1]) {
      bone(k * 6, -30, k * 20, -40 + up);
      bone(k * 20, -40 + up, k * 24, -24 + up);
      P([[k * 6, -30], [k * 20, -40 + up], [k * 24, -24 + up], [k * 10, -20]], 15);
      bone(k * 14, -36 + up, k * 16, -22 + up);
    }
    d.Cv([[8, -8], [17, -5], [22, -11]], 4, 1.6, 1);
    for (const k of [-1, 1]) {
      E(k * 6, -6, 4.8, 6, 1);
      E(k * 6.5 - 1.4, -1.2, 5.4, 2, 1);
    }
    B(1, -18, 11, 11.5, 1);
    for (let i = 0; i < 4; i++) d.Cv([[-8, -24 + i * 3.6], [0, -22 + i * 3.6], [8, -24 + i * 3.6]], 1, 1, 5);
    for (let i = 0; i < 4; i++) P([[6 - i * 2, -29 + i * 0.5], [10 - i * 2, -36 + i], [9 - i * 2, -28 + i * 0.5]], 5);
    const h: [number, number, number] = [-5, -34, 7.6];
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    P([[h[0] - 9, h[1] - 1], [h[0] - 6, h[1] - 8], [h[0] + 5, h[1] - 9], [h[0] + 9, h[1] - 3], [h[0] + 5, h[1] - 1]], 5);
    for (const k of [-1, 1]) P([[h[0] + k * 3, h[1] - 7], [h[0] + k * 6 + 4, h[1] - 14], [h[0] + k * 5 + 1, h[1] - 6]], 5);
    d.muzzle('lizard', h[0], h[1], h[2]);
    for (let i = 0; i < 4; i++) P([[h[0] - 10 + i * 2.2, h[1] + 3.4], [h[0] - 9 + i * 2.2, h[1] + 5.6], [h[0] - 8 + i * 2.2, h[1] + 3.4]], 5);
    return { head: h, kind: 'lizard' };
  },

  // 독쥐 → 하수구쥐 → 독두목쥐
  45: (d) => {
    const { E, P, B, st } = d;
    if (st === 1) {
      d.Cv([[7, -4], [13, -3], [16, -8]], 1, 0.6, 3);
      for (const x of [-2, 5]) E(x, -1.8, 1.8, 1.8, 16);
      B(1.5, -6, 7, 4.6, 1);
      B(0.5, -4.5, 4.5, 2, 2);
      const h: [number, number, number] = [-5, -9, 5.8];
      for (const k of [-1, 1]) E(h[0] + k * 4.6, h[1] - 4.6, 2.8, 2.8, 1);
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      d.muzzle('rodent', h[0], h[1], h[2]);
      return { head: h, kind: 'rodent' };
    }
    const K = st === 2 ? 1.2 : 1.5;
    d.Cv([[9 * K, -6 * K], [16 * K, -4 * K], [21 * K, -11 * K]], 1.4 * K, 0.7 * K, 3);
    for (const x of [-3, 7]) E(x * K, -2.6 * K, 2.2 * K, 2.6 * K, 16);
    B(2 * K, -8 * K, 9 * K, 6 * K, 1);
    if (st === 3) {
      // 망토
      P([[-6, -18], [-2, -12], [18, -5], [16, -16]], 3);
      E(-5, -16, 2, 2, 12);
    }
    B(1 * K, -6 * K, 6 * K, 2.4 * K, 2);
    for (const x of [-6, 4]) E(x * K, -2.6 * K, 2.2 * K, 2.6 * K, 1);
    const h: [number, number, number] = [-6 * K, -12 * K, 6 * K];
    for (const k of [-1, 1]) E(h[0] + k * 4.8 * K, h[1] - 4.6 * K, 2.8 * K, 2.8 * K, 1);
    E(h[0], h[1], h[2], h[2] * 0.9, 1);
    d.muzzle('rodent', h[0], h[1], h[2]);
    // 상처 자국
    d.Ln(h[0] + 2, h[1] - 3, h[0] + 4, h[1] + 1, 0.6, 21, 1);
    if (st === 3) P([[h[0] - 4, h[1] - h[2] + 1], [h[0] - 4, h[1] - h[2] - 4], [h[0] - 1.5, h[1] - h[2] - 1.5], [h[0] + 1, h[1] - h[2] - 5], [h[0] + 3.5, h[1] - h[2] - 1.5], [h[0] + 6, h[1] - h[2] - 4], [h[0] + 6, h[1] - h[2] + 1]], 12);
    return { head: h, kind: 'rodent' };
  },

  // 방울콩 → 풍경방울 → 신령종
  46: (d) => {
    const { E, P, Ln, st, frame } = d;
    const sw = frame === 1 ? 1 : 0;
    const bell = (x: number, y: number, r: number, c: number) => {
      P([[x - r * 0.55, y - r * 1.1], [x - r, y], [x + r, y], [x + r * 0.55, y - r * 1.1]], c);
      E(x, y - r * 1.1, r * 0.55, r * 0.45, c);
      E(x, y, r * 1.05, r * 0.22, c);
    };
    if (st === 1) {
      bell(0, -3, 7.5, 1);
      E(0, -12.5, 1.6, 1.4, 12);
      E(0, -1, 1.8, 1.8, 12);
      return { head: [0, -6, 6], face: { ey: -0.15 } };
    }
    if (st === 2) {
      Ln(0, -36, 0, -28, 0.7, 11);
      E(0, -27, 6, 2.2, 3);
      for (const [x, L] of [[-4, 6], [0, 8], [4, 6]] as Pt[]) Ln(x, -26, x + sw * 0.5, -26 + L, 0.5, 12);
      bell(0, -12, 8, 1);
      // 종이 띠
      Ln(0, -12, sw, -2, 0.6, 11);
      P([[-2 + sw, -2], [2 + sw, -2], [2.5 + sw * 1.5, 6], [-1.5 + sw * 1.5, 6]], 5);
      return { head: [0, -16, 6.4], face: { calm: true } };
    }
    // 신령종: 용 고리를 얹은 큰 범종, 은은한 빛무리
    for (let i = 0; i < 3; i++) E(0, -18, 18 - i * 1.5, 18 - i * 1.5, i === 0 ? 15 : i === 1 ? 20 : 15, 0);
    bell(0, -4, 13, 1);
    for (const y of [-12, -18]) E(0, y, 9, 0.8, 16, 0, 1);
    for (const [x, y] of [[-7, -16], [7, -16], [-6, -10], [6, -10]] as Pt[]) E(x, y, 1, 1, 12, 0, 1);
    // 용 고리
    d.Cv([[-6, -19], [-4, -25], [2, -26], [5, -22], [3, -19]], 2.2, 1.6, 12);
    E(-6, -21, 2.4, 2, 12);
    return { head: [0, -9, 7.4], face: { calm: true, blush: false } };
  },

  // 초롱콩 → 그믐초롱 → 저승초롱
  47: (d) => {
    const { E, P, Ln, st, frame } = d;
    const sw = frame === 1 ? 1 : 0;
    const lantern = (x: number, y: number, rx: number, ry: number) => {
      E(x, y, rx, ry, 1);
      for (let i = -2; i <= 2; i++) E(x, y + i * ry * 0.38, rx * (1 - Math.abs(i) * 0.12), 0.5, 16, 0, 1);
      E(x, y - ry - 0.6, rx * 0.5, 1.4, 21);
      E(x, y + ry + 0.6, rx * 0.5, 1.4, 21);
    };
    if (st === 1) {
      lantern(0, -10, 6.5, 8);
      Ln(0, -19, 0, -24, 0.6, 11);
      E(0, -2, 1.6, 1.6, 13);
      return { head: [0, -9, 6], face: { ey: -0.1 } };
    }
    if (st === 2) {
      Ln(0, -36, 1, -27, 0.6, 11);
      lantern(0, -16, 8.5, 10);
      // 불쑥 내민 혀와 꼬리불
      d.P([[-3, -9], [-1, -2], [1, -9]], 7);
      for (const k of [-1, 1]) d.Cv([[k * 8, -14], [k * 13, -12 + sw], [k * 14, -7]], 1.4, 0.8, 1);
      flame(d, 0, -4, 4, 1.6, 0, true);
      return { head: [0, -16, 7.4], face: { mouth: 'none' } };
    }
    // 저승초롱: 그림자 손이 든 큰 초롱, 푸른 혼불
    P([[-4, -28], [-8, -2], [-4, -6 + sw], [0, -1], [4, -6 - sw], [8, -2], [4, -28]], 21);
    E(0, -30, 5, 5, 21);
    for (const k of [-1, 1]) E(k * 2, -30.5, 1, 1.2, 3);
    Ln(4, -22, 14, -24, 1.4, 21);
    Ln(14, -24, 14, -30, 0.6, 11);
    lantern(14, -20, 8, 10);
    for (const [x, y] of [[-12, -30], [-15, -18], [24, -30]] as Pt[]) {
      E(x, y, 2.6, 2.6, 3);
      E(x, y, 1.4, 1.4, 15);
    }
    return { head: [14, -20, 7.4], face: { mouth: 'wide' } };
  },
  // 아기반달 → 반달곰 → 장수곰
  48: (d) => {
    const { E, B, P, st } = d;
    const moon = (x: number, y: number, r: number) => {
      E(x, y, r, r * 0.55, 5, 0, 1);
      E(x, y - r * 0.35, r * 0.9, r * 0.5, 1, 0, 5);
    };
    if (st === 1) {
      for (const k of [-1, 1]) E(k * 3.5, -2, 2.8, 2.4, 1);
      B(0, -8, 7, 6, 1);
      moon(0, -10, 4.4);
      const h: [number, number, number] = [0, -16, 7.4];
      for (const k of [-1, 1]) E(h[0] + k * 6.4, h[1] - 6, 2.6, 2.6, 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('bear', h[0], h[1], h[2]);
      return { head: h, kind: 'bear' };
    }
    const K = st === 2 ? 1 : 1.25;
    for (const k of [-1, 1]) {
      E(k * 6 * K, -5 * K, 4.4 * K, 5 * K, 1);
      E(k * 6.6 * K - 1.4, -1.2, 5 * K, 1.9 * K, 1);
    }
    B(0, -16 * K, 11 * K, 11 * K, 1);
    moon(0, -21 * K, 7.4 * K);
    for (const k of [-1, 1]) {
      E(k * 12 * K, -18 * K, 3.6 * K, 6.6 * K, 1, k * -0.3);
      for (const t of [-1, 0, 1]) P([[k * 13 * K + t * 1.4, -12 * K], [k * 13.5 * K + t * 1.6, -9 * K], [k * 12.4 * K + t * 1.4, -11.5 * K]], 5);
    }
    const h: [number, number, number] = [0, -31 * K, 7.6 * K];
    for (const k of [-1, 1]) E(h[0] + k * 6.6 * K, h[1] - 6 * K, 2.8 * K, 2.8 * K, 1);
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('bear', h[0], h[1], h[2]);
    if (st === 3) {
      // 흉터와 꿀단지
      d.Ln(h[0] + 3, h[1] - 5, h[0] + 5.5, h[1] + 1, 0.6, 7, 1);
      E(13, -5, 3.6, 3.4, 11);
      E(13, -8.4, 2.6, 0.9, 12);
    }
    return { head: h, kind: 'bear' };
  },

  // 토끼콩 → 달토끼 → 옥토끼
  49: (d) => {
    const { E, P, B, Ln, st } = d;
    const ears = (h: [number, number, number], L: number) => {
      for (const k of [-1, 1]) {
        E(h[0] + k * 2.6, h[1] - h[2] - L * 0.45, 2.2, L * 0.55, 1, k * 0.2);
        E(h[0] + k * 2.6, h[1] - h[2] - L * 0.42, 1, L * 0.42, 7, k * 0.2);
      }
    };
    if (st === 1) {
      E(6, -6, 2.4, 2.4, 2);
      for (const x of [-3, 4]) E(x, -1.8, 2.6, 1.8, 1);
      B(1, -6.5, 6.5, 5.2, 1);
      const h: [number, number, number] = [-3, -11, 6.4];
      ears(h, 9);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('rabbit', h[0], h[1], h[2]);
      return { head: h, kind: 'rabbit' };
    }
    if (st === 2) {
      // 방아 찧는 달토끼
      E(10, -4, 4.6, 3.6, 11);
      E(10, -7.4, 4, 1, 16);
      Ln(4, -22, 10, -8, 1.2, 11);
      E(3, -24, 2.2, 3.2, 11, -0.4);
      E(7, -10, 3, 2.4, 2);
      for (const k of [-1, 1]) {
        E(k * 4, -3.6, 3.4, 3.6, 1);
        E(k * 4.6 - 1.2, -1, 4, 1.4, 1);
      }
      B(0, -11, 7, 7, 1);
      B(-0.5, -10, 4.4, 4.6, 2);
      E(5, -15, 2, 3.6, 1, -0.6);
      const h: [number, number, number] = [-1, -20, 6.6];
      ears(h, 12);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('rabbit', h[0], h[1], h[2]);
      return { head: h, kind: 'rabbit' };
    }
    // 옥토끼: 등 뒤 보름달, 긴 귀에 옥 장식, 방아 지팡이
    E(4, -30, 15, 15, 15);
    E(4, -30, 13, 13, 20);
    for (const k of [-1, 1]) {
      E(k * 4.5, -4.6, 3.8, 4.4, 1);
      E(k * 5.2 - 1.4, -1.2, 4.6, 1.6, 1);
    }
    P([[-7, -22], [-9, -3], [9, -3], [7, -22]], 1);
    P([[-3, -22], [-5, -3], [5, -3], [3, -22]], 2);
    Ln(-12, -1, -9, -36, 1.2, 11);
    E(-9, -37, 2.6, 2, 11);
    E(-9, -19, 2.4, 2.4, 1);
    const h: [number, number, number] = [0, -28, 6.6];
    ears(h, 15);
    for (const k of [-1, 1]) E(h[0] + k * 2.6, h[1] - h[2] - 12, 1.2, 1.6, 15);
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    d.muzzle('rabbit', h[0], h[1], h[2]);
    return { head: h, kind: 'rabbit', face: { calm: true } };
  },

  // 죽순콩 → 대나무판다 → 무술판다
  50: (d) => {
    const { E, P, B, Ln, st } = d;
    const patch = (h: [number, number, number]) => {
      for (const k of [-1, 1]) E(h[0] + k * h[2] * 0.45 - h[2] * 0.12, h[1] + h[2] * 0.02, h[2] * 0.28, h[2] * 0.34, 21, k * 0.4, 1);
      for (const k of [-1, 1]) E(h[0] + k * h[2] * 0.8, h[1] - h[2] * 0.8, h[2] * 0.36, h[2] * 0.36, 21);
    };
    if (st === 1) {
      // 죽순 껍질 속 아기
      P([[-7, -1], [-6, -14], [0, -20], [6, -14], [7, -1]], 14);
      for (let i = 0; i < 3; i++) Ln(-6 + i * 1.5, -2 - i * 5, 6 - i * 1.5, -2 - i * 5, 0.6, 16, 14);
      const h: [number, number, number] = [0, -12, 6];
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      patch(h);
      d.muzzle('bear', h[0], h[1], h[2]);
      return { head: h, kind: 'bear' };
    }
    const K = st === 2 ? 1 : 1.2;
    for (const k of [-1, 1]) {
      E(k * 5.5 * K, -4.6 * K, 4 * K, 4.8 * K, 21);
      E(k * 6 * K - 1.4, -1.2, 4.6 * K, 1.8 * K, 21);
    }
    B(0, -14 * K, 10 * K, 10 * K, 1);
    E(0, -20 * K, 10 * K, 3.6 * K, 21);
    if (st === 2) {
      // 대나무를 우물우물
      Ln(-12, -4, -6, -30, 1.4, 14);
      for (const y of [-10, -18, -25]) Ln(-12 + (y + 4) * -0.23 - 1, y, -12 + (y + 4) * -0.23 + 1, y, 0.6, 16);
      leaf(d, -5, -31, 3, 1.2, 0.6);
      E(-8, -16, 3, 3, 21);
    } else {
      E(0, -12, 11, 1.6, 3);
      // 곤봉
      Ln(-16, -4, 14, -32, 1.3, 11);
      for (const k of [-1, 1]) E(k * 10, -18 + k * 2, 3.2, 3, 21);
    }
    const h: [number, number, number] = [0, -28 * K, 7.6 * K];
    E(h[0], h[1], h[2], h[2] * 0.92, 1);
    patch(h);
    d.muzzle('bear', h[0], h[1], h[2]);
    if (st === 3) {
      E(h[0], h[1] - h[2] * 0.5, h[2] + 0.3, 1.2, 3, 0, 1);
      P([[h[0] + h[2], h[1] - h[2] * 0.5], [h[0] + h[2] + 6, h[1] - h[2] * 0.2], [h[0] + h[2] + 5, h[1] + 2]], 3);
    }
    return { head: h, kind: 'bear' };
  },

  // 가시콩 → 엉겅퀴 → 가시마왕
  51: (d) => {
    const { E, P, B, st } = d;
    const spikes = (x: number, y: number, r: number, n: number, len: number, c: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        P([[x + Math.cos(a - 0.2) * r, y + Math.sin(a - 0.2) * r], [x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len)], [x + Math.cos(a + 0.2) * r, y + Math.sin(a + 0.2) * r]], c);
      }
    };
    if (st === 1) {
      spikes(0, -8, 6.5, 14, 3, 14);
      E(0, -8, 7, 7, 1);
      return { head: [0, -8, 6.4] };
    }
    if (st === 2) {
      for (const k of [-1, 1]) leaf(d, k * 7, -3, 2.4, 5, k * 1.2);
      B(0, -9, 7.5, 7.5, 1);
      for (let i = 0; i < 6; i++) P([[-6 + i * 2.4, -16], [-6.5 + i * 2.6, -26 - (i % 2) * 3], [-4.5 + i * 2.4, -16]], 3);
      E(0, -17, 7.5, 3, 14);
      return { head: [0, -9, 6.6] };
    }
    // 가시마왕: 가시 덩굴 몸, 가시 왕관, 빛나는 눈
    for (const k of [-1, 1]) d.Cv([[k * 6, -6], [k * 12, -2], [k * 16, -1]], 2.6, 1.4, 16);
    spikes(0, -18, 12, 16, 4, 16);
    E(0, -18, 12.5, 12, 1);
    for (const k of [-1, 1]) {
      d.Cv([[k * 11, -18], [k * 18, -22], [k * 20, -30]], 2.4, 1.4, 16);
      for (const t of [0, 1, 2]) P([[k * (14 + t * 2), -21 - t * 3], [k * (16 + t * 2), -23 - t * 3], [k * (15 + t * 2), -20 - t * 3]], 12);
    }
    for (let i = 0; i < 7; i++) P([[-9 + i * 3, -29], [-8 + i * 3, -36 - (i % 2) * 3], [-7 + i * 3, -29]], 3);
    E(0, -30, 9, 2.4, 14);
    return { head: [0, -17, 9], face: { blush: false } };
  },

  // 불새콩 → 화염매 → 주홍봉새 (긴 꼬리깃의 불꽃 꿩)
  52: (d) => {
    const { E, P, B, Ln, st, up } = d;
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      fluff(d, 0, -9, 7, 6.5, 1, 12, 1.4);
      flame(d, 5, -10, 6, 2.2, 1.5);
      const h: [number, number, number] = [-2.5, -15, 6.2];
      flame(d, h[0] + 1, h[1] - h[2] + 1.5, 5, 1.8, 0.5);
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.45, h[1] + 1.6], [h[0] - h[2] * 0.7, h[1] + 3]], 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    if (st === 2) {
      for (const k of [-1, 1]) Ln(k * 2.5, -5, k * 3, 0, 1, 12);
      for (const k of [-1, 1]) openWing(d, k, k * 3, -17, 15, 8 - up, 18, 1);
      B(0, -12, 7.5, 8, 1);
      B(-1.5, -11, 4.5, 5, 2);
      flame(d, 6, -9, 8, 2.6, 4);
      const h: [number, number, number] = [-3, -21, 6];
      for (let i = 0; i < 3; i++) flame(d, h[0] + i * 2.4, h[1] - h[2] + 2, 6 - i, 1.4, 2);
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      P([[h[0] - h[2] * 0.6, h[1] - 0.5], [h[0] - h[2] * 1.5, h[1] + 0.5], [h[0] - h[2] * 1.3, h[1] + 3], [h[0] - h[2] * 0.6, h[1] + 2.6]], 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    // 주홍봉새: 땅까지 끌리는 긴 불꽃 꼬리깃, 접은 날개, 볏
    for (const [ex, ey, c] of [[24, -2, 18], [20, 0, 3], [26, -8, 1]] as [number, number, number][]) d.Cv([[4, -14], [14, -12], [ex, ey]], 3, 1.6, c);
    for (const [x, y] of [[23, -2], [20, 0]] as Pt[]) E(x, y, 1.6, 1.4, 13);
    for (const k of [-1, 1]) Ln(k * 2.5, -6, k * 3, 0, 1.1, 12);
    B(0, -16, 8, 9, 1);
    B(-1.5, -15, 4.6, 6.5, 2);
    foldWing(d, 0, -18, 13, 18, 3);
    d.Cv([[-2, -22], [-4, -28], [-5, -31]], 3.4, 2.8, 1);
    const h: [number, number, number] = [-5, -33, 5.8];
    flameRing(d, h[0] + 1, h[1] - 1, h[2] - 1, 5, 4);
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    E(h[0] - 1.5, h[1] + 1.4, 2.4, 1.6, 18);
    P([[h[0] - h[2] * 0.7, h[1] - 0.5], [h[0] - h[2] * 1.5, h[1] + 0.8], [h[0] - h[2] * 0.7, h[1] + 2.4]], 12);
    return { head: h, body: 'bird', face: { mouth: 'beak', blush: false } };
  },

  // 혼불콩 → 도깨비불 → 염라불꽃
  53: (d) => {
    const { E, P, st, frame } = d;
    const f = frame === 1 ? -0.6 : 0;
    if (st === 1) {
      flame(d, 0, -3 + f, 18, 6.5, 1, true);
      E(0, -7 + f, 5.6, 5, 3);
      return { head: [0, -8 + f, 5.4], face: { blush: false } };
    }
    if (st === 2) {
      // 짝 지은 도깨비불 둘
      flame(d, 8, -10 + f, 12, 4, -1, true);
      E(8, -13 + f, 3, 3, 3);
      for (const [x, y] of [[6.8, -14], [9.2, -14]] as Pt[]) d.set(x, y + f, 6);
      flame(d, -2, -2 + f, 24, 8, 1.5, true);
      E(-2, -9 + f, 6.4, 6, 3);
      for (const k of [-1, 1]) P([[-2 + k * 2, -16 + f], [-2 + k * 4, -22 + f], [-2 + k * 5, -15 + f]], 12);
      return { head: [-2, -9 + f, 6], face: { blush: false } };
    }
    // 염라불꽃: 불꽃 도포, 판관 관모, 명부 홀
    flame(d, 0, -1 + f, 34, 13, 0, true);
    P([[-9, -26 + f], [-11, -3 + f], [11, -3 + f], [9, -26 + f]], 1);
    P([[-2, -26 + f], [-4, -3 + f], [4, -3 + f], [2, -26 + f]], 21);
    E(0, -10 + f, 10, 1.6, 12);
    // 홀
    d.Ln(-12, -8 + f, -10, -26 + f, 1.4, 5);
    E(-11, -16 + f, 2.4, 2.2, 1);
    const h: [number, number, number] = [0, -31 + f, 6.6];
    E(h[0], h[1], h[2], h[2] * 0.92, 3);
    // 관모
    P([[h[0] - 6, h[1] - 4], [h[0] - 5, h[1] - 11], [h[0] + 5, h[1] - 11], [h[0] + 6, h[1] - 4]], 21);
    for (const k of [-1, 1]) E(h[0] + k * 9, h[1] - 8, 3.4, 1.2, 21);
    return { head: h, face: { blush: false } };
  },

  // 찌릿장어 → 번개장어 → 뇌룡장어
  54: (d) => {
    const { E, P, Ln, st, frame } = d;
    const n = [8, 12, 16][st - 1];
    const L = [16, 26, 34][st - 1];
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([12 - t * 22 + Math.sin(t * Math.PI * 2 + (frame ? 0.4 : 0)) * (st + 2), -3 - t * L]);
    }
    const r0 = [2.4, 3, 3.6][st - 1];
    pts.forEach(([x, y], i) => E(x, y, r0 + i * 0.12, r0 + i * 0.12, 1));
    pts.forEach(([x, y], i) => i % 3 === 0 && E(x, y, r0 * 0.8, 0.8, 3, 0.4, 1));
    P([[pts[0][0], pts[0][1]], [pts[0][0] + 6, pts[0][1] - 3], [pts[0][0] + 5, pts[0][1] + 3]], 3);
    if (st >= 2) pts.forEach(([x, y], i) => i % 2 === 0 && i > 0 && i < n && P([[x - 1, y - r0], [x + 1, y - r0 - 3], [x + 2, y - r0 + 0.5]], 3));
    const [hx, hy] = pts[n];
    const h: [number, number, number] = [hx - 1, hy - 1, [5, 6, 7][st - 1]];
    if (st === 3) for (const k of [-1, 1]) d.Cv([[h[0] + k * 2, h[1] - 4], [h[0] + k * 3 + 3, h[1] - 10], [h[0] + k * 2 + 7, h[1] - 12]], 1.4, 0.8, 12);
    E(h[0], h[1], h[2] * 1.1, h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    for (const [x, y] of [[h[0] - 10, h[1] - 6], [h[0] + 8, h[1] + 6]] as Pt[]) {
      Ln(x, y, x + 2, y - 2, 0.6, 12);
      Ln(x + 2, y - 2, x + 1, y - 3.5, 0.6, 12);
    }
    return { head: h, kind: 'lizard' };
  },

  // 눈새콩 → 서리두루미 → 빙설학
  55: (d) => {
    const { E, P, B, Ln, st, up } = d;
    if (st === 1) {
      for (const k of [-1, 1]) Ln(k * 2, -4, k * 2.6, 0, 0.9, 12);
      fluff(d, 0, -9, 7, 6.5, 1, 12, 1.4);
      const h: [number, number, number] = [-2, -15, 6];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      E(h[0] + 0.5, h[1] - h[2] + 1, 2, 1.4, 18);
      P([[h[0] - h[2] * 0.7, h[1] + 0.5], [h[0] - h[2] * 1.45, h[1] + 1.6], [h[0] - h[2] * 0.7, h[1] + 3]], 12);
      return { head: h, body: 'bird', face: { mouth: 'beak' } };
    }
    const K = st === 2 ? 1 : 1.2;
    // 긴 다리 (한 발로 서기)
    Ln(1, -14 * K, 0, 0, 0.9, 21);
    Ln(3, -14 * K, 8, -10 * K, 0.9, 21);
    Ln(8, -10 * K, 6, -8 * K, 0.9, 21);
    if (st === 3) for (const k of [-1, 1]) {
      openWing(d, k, k * 3, -26, 22, 10 - up, 1, 5);
      for (let i = 0; i < 4; i++) P([[k * (10 + i * 3.5), -24 + i * 1.5 + up], [k * (11 + i * 3.5), -30 + i * 1.5 + up], [k * (12.5 + i * 3.5), -24 + i * 1.5 + up]], 20);
    }
    P([[6, -18 * K], [14, -14 * K], [6, -14 * K]], 21);
    B(1, -19 * K, 7.5 * K, 5.5 * K, 1);
    if (st === 2) foldWing(d, 0, -21, 11, 5, 15);
    d.Cv([[-4, -22 * K], [-7, -28 * K], [-5, -34 * K]], 2.4, 2, 1);
    const h: [number, number, number] = [-6, -37 * K, 4.6];
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    E(h[0] + 0.5, h[1] - h[2] + 1, 2.2, 1.4, 18);
    P([[h[0] - h[2] * 0.7, h[1]], [h[0] - h[2] * 2.2, h[1] + 1.4], [h[0] - h[2] * 0.7, h[1] + 2.4]], 12);
    if (st === 3) for (let i = 0; i < 3; i++) P([[h[0] + 1 + i * 1.5, h[1] - h[2] + 0.5], [h[0] + 4 + i * 2.5, h[1] - h[2] - 5 + i], [h[0] + 3 + i * 1.5, h[1] - h[2] + 1]], 20);
    return { head: h, body: 'bird', face: { mouth: 'beak', calm: true } };
  },

  // 동전콩 → 엽전도사 → 금전신선
  56: (d) => {
    const { E, P, Ln, st, frame } = d;
    const coin = (x: number, y: number, r: number) => {
      E(x, y, r, r, 12);
      E(x, y, r * 0.78, r * 0.78, 1, 0, 12);
      E(x, y, r * 0.66, r * 0.66, 12, 0, 1);
      P([[x - r * 0.22, y - r * 0.22], [x + r * 0.22, y - r * 0.22], [x + r * 0.22, y + r * 0.22], [x - r * 0.22, y + r * 0.22]], 4);
    };
    if (st === 1) {
      coin(0, -9, 8.5);
      for (const k of [-1, 1]) E(k * 4, -0.8, 2, 1, 16);
      return { head: [0, -8.6, 6.2], face: { ey: 0.02 } };
    }
    if (st === 2) {
      // 엽전 꾸러미 몸 + 도사 모자
      for (let i = 0; i < 5; i++) E(0, -3 - i * 3.2, 7 - Math.abs(i - 2) * 0.4, 1.8, i % 2 ? 1 : 12);
      Ln(0, -20, 0, -2, 0.6, 11);
      coin(0, -24, 7);
      P([[-6, -30], [6, -30], [0, -37]], 21);
      E(0, -30, 7.5, 1, 21);
      return { head: [0, -23.6, 5], face: { ey: 0.05, calm: true } };
    }
    // 금전신선: 엽전 후광, 구름 위, 긴 수염, 큰 엽전 몸
    const f = frame === 1 ? -0.6 : 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (frame ? 0.2 : 0);
      coin(Math.cos(a) * 17, -24 + Math.sin(a) * 15 + f, 2.6);
    }
    for (const [x, y, r] of [[-9, -3, 5], [0, -2, 6], [9, -3, 5]] as [number, number, number][]) E(x, y + f, r, r * 0.7, 5);
    coin(0, -16 + f, 10);
    for (const k of [-1, 1]) E(k * 10, -17 + f, 2.4, 2.4, 2);
    const h: [number, number, number] = [0, -30 + f, 6.4];
    E(h[0], h[1], h[2], h[2] * 0.92, 2);
    P([[h[0] - 3.4, h[1] + 3.5], [h[0] - 0.5, h[1] + 13], [h[0] + 2.4, h[1] + 3.5]], 5);
    E(h[0] + 1, h[1] - h[2] - 1, 2.4, 2.2, 21);
    return { head: h, face: { calm: true } };
  },

  // 고드름니 → 설원이리 → 빙하늑대
  57: (d) => {
    const { E, P, B, st } = d;
    const wolfHead = (h: [number, number, number]) => {
      for (const k of [-1, 1]) P([[h[0] + k * 2.4, h[1] - 4], [h[0] + k * 5.6, h[1] - 12], [h[0] + k * 7, h[1] - 2]], 1);
      E(h[0], h[1], h[2], h[2] * 0.88, 1);
      d.muzzle('dog', h[0], h[1], h[2]);
      for (const k of [0, 1]) P([[h[0] - h[2] * 1.05 + k * 1.6, h[1] + h[2] * 0.55], [h[0] - h[2] * 0.95 + k * 1.6, h[1] + h[2] * 0.95], [h[0] - h[2] * 0.8 + k * 1.6, h[1] + h[2] * 0.55]], 20);
    };
    if (st === 1) {
      d.Cv([[7, -6], [11, -9], [12, -13]], 2.4, 1.6, 1);
      for (const x of [-2, 6]) E(x, -2.4, 1.9, 2.6, 16);
      B(2, -7, 7, 4.6, 1);
      for (const x of [-5, 3]) E(x, -2.4, 1.9, 2.6, 1);
      const h: [number, number, number] = [-6, -12, 6.4];
      wolfHead(h);
      return { head: h, kind: 'dog' };
    }
    const K = st === 2 ? 1 : 1.25;
    fluff(d, 14 * K, -13 * K, 3 * K, 6 * K, 1, 6, 1.4);
    for (const x of [-3, 9]) E(x * K, -4 * K, 2.6 * K, 4.4 * K, 16);
    B(3 * K, -11 * K, 11 * K, 6 * K, 1);
    B(2 * K, -8 * K, 8 * K, 2.4 * K, 2);
    for (const x of [-7, 6]) E(x * K, -4 * K, 2.6 * K, 4.4 * K, 1);
    if (st === 3) {
      // 얼음 갈기
      for (let i = 0; i < 6; i++) P([[-9 + i * 3, -17 * K], [-8 + i * 3, (-25 - (i % 2) * 3) * K], [-6 + i * 3, -17 * K]], 20);
      fluff(d, -9 * K, -16 * K, 6 * K, 5.5 * K, 5, 9, 1.6);
    }
    // 고개를 들고 울부짖기
    const h: [number, number, number] = [-11 * K, -21 * K, 6.6 * K];
    wolfHead(h);
    return { head: h, kind: 'dog' };
  },

  // 물뱀콩 → 이무기 → 청룡 (여의주를 쥔 푸른 용)
  58: (d) => {
    const { E, P, Ln, st, frame } = d;
    const n = [8, 12, 16][st - 1];
    const L = [14, 24, 32][st - 1];
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([14 - t * 24 + Math.sin(t * Math.PI * 1.6 + (frame ? 0.4 : 0)) * (st * 2 + 2), -3 - t * L]);
    }
    const r0 = [2.6, 3.2, 3.6][st - 1];
    if (st === 3) pts.forEach(([x, y], i) => i % 2 === 1 && i < n - 1 && P([[x - 1.5, y - r0], [x + 1.5, y - r0 - 5], [x + 2.5, y - r0 + 1]], 3));
    pts.forEach(([x, y], i) => E(x, y, r0 + i * 0.14, r0 + i * 0.14, 1));
    pts.forEach(([x, y], i) => i % 2 === 0 && E(x - 0.6, y + 1.4, 1.5 + i * 0.08, 1, 2));
    const [hx, hy] = pts[n];
    const h: [number, number, number] = [hx - 1, hy - 1, [5.4, 6.4, 7.2][st - 1]];
    if (st >= 2) for (const k of [-1, 1]) P([[h[0] + k * 2, h[1] - h[2] + 1], [h[0] + k * 3 + 1, h[1] - h[2] - (st === 2 ? 3 : 4)], [h[0] + k * 4, h[1] - h[2] + 1.5]], 12);
    if (st === 3) {
      for (const k of [-1, 1]) {
        d.Cv([[h[0] + k * 2, h[1] - 4], [h[0] + k * 3 + 3, h[1] - 10], [h[0] + k * 2 + 7, h[1] - 14]], 1.5, 0.8, 12);
        Ln(h[0] + k * 2.5 + 3, h[1] - 9, h[0] + k * 5 + 7, h[1] - 10, 0.8, 12);
      }
      // 여의주
      const [ax, ay] = pts[9];
      E(ax - 4, ay + 2, 2, 3, 1, 0.5);
      E(ax - 7, ay + 4, 3.4, 3.4, 15);
      E(ax - 7.6, ay + 3.2, 1.4, 1.4, 20);
    }
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    if (st === 3) d.Cv([[h[0] - 8, h[1] + 1], [h[0] - 13, h[1] + 4], [h[0] - 12, h[1] + 11]], 0.9, 0.6, 3);
    return { head: h, kind: 'lizard' };
  },

  // 전갈콩 → 모래전갈 → 사막전갈왕
  59: (d) => {
    const { E, P, Ln, st } = d;
    const K = [0.9, 1.15, 1.45][st - 1];
    for (const [x, dx] of [[-1, -3], [2, -1], [5, 1], [8, 3]] as Pt[]) for (const k of [-1, 1]) Ln(x * K, -4 * K, (x + dx + k) * K, 0, 0.6, 16);
    E(4 * K, -6 * K, 7 * K, 3.6 * K, 1);
    for (let i = 0; i < 3; i++) Ln((1 + i * 2.6) * K, -9.5 * K, (1 + i * 2.6) * K, -2.5 * K, 0.6, 16, 1);
    // 치켜든 꼬리 + 독침
    d.Cv([[10 * K, -6 * K], [15 * K, -10 * K], [15 * K, -18 * K], [10 * K, -23 * K]], 2.4 * K, 1.6 * K, 1);
    P([[10 * K, -22 * K], [6 * K, -20 * K], [9 * K, -26 * K]], 3);
    // 집게
    const cl = [2.6, 3.6, 5][st - 1];
    for (const k of [0, 1]) {
      const x = (-6 - k * 1.5) * K;
      const y = (-7 + k * 2) * K;
      Ln(-2 * K, -6 * K, x, y, 1, 1);
      E(x - cl * 0.4, y, cl, cl * 0.7, 1);
      P([[x - cl, y - cl * 0.5], [x - cl * 2.2, y - cl * 0.8], [x - cl * 1.2, y]], 1);
      P([[x - cl, y + cl * 0.3], [x - cl * 2, y + cl * 0.8], [x - cl * 1.1, y + cl * 0.6]], 1);
    }
    const h: [number, number, number] = [-1 * K, -8 * K, 3.8 * K];
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    if (st === 3) P([[h[0] - 3.5, h[1] - h[2] + 1], [h[0] - 3.5, h[1] - h[2] - 3], [h[0] - 1, h[1] - h[2] - 1], [h[0] + 1, h[1] - h[2] - 4], [h[0] + 3, h[1] - h[2] - 1], [h[0] + 5, h[1] - h[2] - 3], [h[0] + 5, h[1] - h[2] + 1]], 12);
    return { head: h, face: { eyeK: 0.85, blush: false, mouth: 'none' } };
  },

  // 별가루 → 빛의기사 → 성기사
  60: (d) => {
    const { E, P, B, Ln, st, up } = d;
    const catHead = (h: [number, number, number]) => {
      for (const k of [-1, 1]) P([[h[0] + k * 2, h[1] - 4], [h[0] + k * 5.4, h[1] - 10], [h[0] + k * 7, h[1] - 2]], 1);
      E(h[0], h[1], h[2], h[2] * 0.92, 1);
      d.muzzle('cat', h[0], h[1], h[2]);
    };
    if (st === 1) {
      for (const [x, y] of [[-8, -16], [8, -12], [6, -20], [-6, -6]] as Pt[]) d.set(x, y, 12);
      for (const k of [-1, 1]) E(k * 3.4, -2, 2.4, 2, 1);
      B(0, -7.5, 6, 5.5, 1);
      const h: [number, number, number] = [0, -14.5, 7];
      catHead(h);
      E(h[0], h[1] - h[2] + 2, 1.8, 1.8, 12);
      return { head: h, kind: 'cat' };
    }
    const K = st === 2 ? 1 : 1.2;
    if (st === 3) {
      for (const k of [-1, 1]) openWing(d, k, k * 4, -24, 18, 10 - up, 5, 15);
      P([[-8, -26], [-12, -2], [12, -2], [8, -26]], 3);
    }
    for (const k of [-1, 1]) {
      E(k * 4.5 * K, -4 * K, 3.2 * K, 4 * K, 1);
      E(k * 5 * K - 1.2, -1, 3.8 * K, 1.5 * K, 12);
    }
    B(0, -13 * K, 7.5 * K, 8 * K, 1);
    P([[-6 * K, -19 * K], [6 * K, -19 * K], [5 * K, -8 * K], [-5 * K, -8 * K]], 12);
    E(0, -14 * K, 1.6, 1.6, 4);
    // 칼과 방패
    if (st === 2) {
      Ln(-9, -10, -14, -28, 1.2, 11);
      leaf(d, -14.5, -29, 1.6, 1, -0.3);
    } else {
      Ln(-10, -10, -16, -34, 1.3, 9);
      E(-10, -11, 3, 0.9, 12, -0.4);
      E(10, -15, 4.6, 6, 12);
      E(10, -15, 3.4, 4.8, 5, 0, 12);
      // 방패: 해 무늬
      E(10, -15, 1.8, 1.8, 3);
      for (let i = 0; i < 8; i++) d.set(10 + Math.cos((i / 8) * 6.28) * 3, -15 + Math.sin((i / 8) * 6.28) * 3.6, 3);
    }
    const h: [number, number, number] = [0, -25 * K, 7 * K];
    catHead(h);
    if (st === 3) P([[h[0] - 2, h[1] - h[2] + 1], [h[0] - 0.5, h[1] - h[2] - 8], [h[0] + 1.5, h[1] - h[2] + 1]], 12);
    return { head: h, kind: 'cat' };
  },

  // 매미허물 → 허물귀신 → 망령매미
  61: (d) => {
    const { E, P, Ln, st, up, frame } = d;
    const w = frame === 1 ? 1 : -1;
    if (st === 1) {
      for (const [x, dx] of [[-3, -2], [0, 0], [3, 2]] as Pt[]) Ln(x, -4, x + dx, 0, 0.7, 16);
      E(1, -7, 6, 4.6, 1);
      Ln(1, -11, 1, -3, 0.6, 21, 1);
      const h: [number, number, number] = [-4, -9, 4.6];
      E(h[0], h[1], h[2], h[2] * 0.9, 1);
      return { head: h, face: { calm: true } };
    }
    if (st === 2) {
      // 허물에서 빠져나온 유령: 아랫단이 흐릿
      P([[-7, -14], [-6, -3], [-3, -6 + w], [0, -1], [3, -6 - w], [6, -3], [7, -14]], 15);
      E(1, -16, 7, 6, 1);
      Ln(1, -21, 1, -11, 0.7, 21, 1);
      for (const k of [-1, 1]) bugWing(d, k * 7 + 2, -20 + up, 6, 2.6, k * 0.9);
      return { head: [0, -17, 5.6] };
    }
    // 망령매미: 투명한 큰 날개, 혼 자락, 빛나는 눈
    for (const k of [-1, 1]) {
      bugWing(d, k * 11, -26 + up, 12, 4.4, k * 1.1, 15);
      bugWing(d, k * 9, -18 + up, 8, 3, k * 1.4, 15);
    }
    P([[-8, -18], [-10, -2], [-6, -6 + w], [-2, 0], [2, -6 - w], [6, 0], [10, -2], [8, -18]], 15);
    E(0, -20, 8, 7, 1);
    for (let i = 0; i < 3; i++) Ln(-6, -18 + i * 2.6, 6, -18 + i * 2.6, 0.6, 21, 1);
    const h: [number, number, number] = [0, -28, 6.6];
    E(h[0], h[1], h[2] * 1.15, h[2], 1);
    return { head: h, face: { blush: false } };
  },

  // 도마콩 → 목도리도마 → 왕도마뱀
  62: (d) => {
    const { E, P, B, st } = d;
    if (st === 1) {
      d.Cv([[6, -4], [12, -3], [15, -6]], 2, 0.8, 1);
      for (const x of [-3, 5]) E(x, -2, 2, 2, 16);
      B(1, -6, 7, 4, 1);
      for (const x of [-5, 3]) E(x, -2, 2, 2, 1);
      const h: [number, number, number] = [-6, -9, 5.4];
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    if (st === 2) {
      // 두 발로 뛰며 목도리를 활짝
      d.Cv([[5, -8], [13, -6], [18, -10]], 2.4, 1, 1);
      for (const k of [-1, 1]) {
        E(k * 3.5, -3.4, 2.6, 3.4, 1);
        E(k * 4 - 1.4, -0.8, 3.6, 1.2, 1);
      }
      B(0, -10, 5.5, 6.4, 1);
      const h: [number, number, number] = [-2, -19, 5.4];
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.65 + i * 0.2);
        P([[h[0], h[1] + 1], [h[0] + Math.cos(a) * 11, h[1] + Math.sin(a) * 11], [h[0] + Math.cos(a + 0.2) * 11, h[1] + Math.sin(a + 0.2) * 11]], i % 2 ? 3 : 4);
      }
      E(h[0], h[1], h[2], h[2] * 0.85, 1);
      d.muzzle('lizard', h[0], h[1], h[2]);
      return { head: h, kind: 'lizard' };
    }
    // 왕도마뱀: 큰 몸, 등 돛, 긴 꼬리, 갈퀴 발
    d.Cv([[10, -8], [19, -5], [24, -12], [22, -18]], 4, 1.4, 1);
    for (const x of [-6, 10]) E(x, -4, 3.4, 4, 16);
    P([[-6, -16], [-3, -27], [3, -29], [9, -25], [12, -15]], 3);
    for (let i = 0; i < 4; i++) d.Ln(-3 + i * 4, -17, -2 + i * 3.6, -26 + Math.abs(i - 1.5) * 1.5, 0.6, 4, 3);
    B(3, -11, 12, 7, 1);
    B(2, -8, 9, 3, 2);
    for (const x of [-9, 7]) {
      E(x, -4, 3.4, 4, 1);
      for (const t of [-1, 0, 1]) d.set(x - 2 + t * 1.5, -0.4, 9);
    }
    const h: [number, number, number] = [-12, -14, 6.6];
    E(h[0], h[1], h[2], h[2] * 0.85, 1);
    d.muzzle('lizard', h[0], h[1], h[2]);
    return { head: h, kind: 'lizard' };
  },

  // 반디콩 → 반딧불이 → 은하반디
  63: (d) => {
    const { E, Ln, st, up, frame } = d;
    const glowB = (x: number, y: number, r: number) => {
      E(x, y, r * 1.6, r * 1.5, 15);
      E(x, y, r, r * 0.9, 13);
      E(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.35, 9);
    };
    if (st === 1) {
      for (const [x, y, r] of [[8, -3.5, 2.6], [4.5, -4, 3], [1, -5, 3.4]] as [number, number, number][]) E(x, y, r, r, 1);
      glowB(11, -3.6, 1.8);
      const h: [number, number, number] = [-3.5, -8, 5.2];
      E(h[0], h[1], h[2], h[2] * 0.95, 1);
      for (const k of [-1, 1]) Ln(h[0] + k * 1.6, h[1] - 4, h[0] + k * 3, h[1] - 8, 0.5, 21);
      return { head: h };
    }
    const K = st === 2 ? 1 : 1.3;
    if (st === 3) {
      // 별자리 날개
      for (const k of [-1, 1]) {
        E(k * 12, -24 + up, 10, 6.5, 4, k * 0.4);
        for (const [x, y] of [[8, -27], [13, -24], [16, -28], [11, -21]] as Pt[]) d.set(k * x, y + up, 9);
        Ln(k * 8, -27 + up, k * 13, -24 + up, 0.4, 15, 4);
        Ln(k * 13, -24 + up, k * 16, -28 + up, 0.4, 15, 4);
      }
    } else for (const k of [-1, 1]) bugWing(d, k * 6 + 3, -15 + up, 6, 2.4, k * 0.9);
    for (const [x, dx] of [[-1, -2], [2, 0], [5, 2]] as Pt[]) Ln(x * K, -6 * K, (x + dx) * K, 0, 0.7, 16);
    E(5 * K, -9 * K, 6 * K, 4 * K, 1, 0.3);
    glowB(11 * K, -6 * K, 3 * K * (frame === 1 ? 1.1 : 1));
    const h: [number, number, number] = [-3 * K, -12 * K, 5.4 * K];
    E(h[0], h[1], h[2], h[2] * 0.95, 1);
    for (const k of [-1, 1]) {
      d.Cv([[h[0] + k * 1.6, h[1] - 4], [h[0] + k * 3, h[1] - 9 * K], [h[0] + k * 5, h[1] - 10 * K]], 0.6, 0.5, 21);
      E(h[0] + k * 5, h[1] - 10 * K, 1, 1, 13);
    }
    return { head: h };
  },
};

/** 계열별 색 바꾸기 (단계별, 없으면 1단계 것) */
export const FORM_PAL: Record<number, { main?: string; accent?: string; belly?: string }[]> = {
  0: [{ main: '#b08a58', accent: '#ffffff', belly: '#f6eed8' }, { main: '#9a7448', accent: '#ffffff', belly: '#f0e4c8' }, { main: '#8a6440', accent: '#ffffff', belly: '#efe0c0' }],
  1: [{ main: '#f08a3a', accent: '#ffd23a', belly: '#fff0d0' }, { main: '#e8743a', accent: '#ffd23a', belly: '#ffecc8' }, { main: '#f07a2a', accent: '#ffd23a', belly: '#fff2d8' }],
  2: [{ main: '#58a8f0', belly: '#e8f6ff' }, { main: '#4a90d8', belly: '#e4f2ff' }, { main: '#3a78c0', belly: '#dceeff' }],
  28: [{ main: '#7a8ae8', belly: '#fff0c0', accent: '#e8606a' }, { main: '#5a70d8', belly: '#ffe8b0', accent: '#e8606a' }, { main: '#4a5ac8', belly: '#ffe8a8', accent: '#e8606a' }],
  3: [{ main: '#d8c4a0', belly: '#fff8ec' }, { main: '#c8a878', belly: '#fff4e0' }, { main: '#e8dcc8', belly: '#ffffff' }],
  4: [{ main: '#b07a4a', belly: '#f8ecd8' }, { main: '#3a3a52', belly: '#ffffff', accent: '#58a8f0' }, { main: '#7a6a9a', belly: '#f0ecff', accent: '#e8f4ff' }],
  5: [{ main: '#8ad05a', accent: '#ffd23a', belly: '#f4ffd8' }, { main: '#e8e0c8', belly: '#fffaf0' }, { main: '#f4ecdc', accent: '#c08ae8', belly: '#ffffff' }],
  6: [{ main: '#f0c83a', accent: '#c040d0', belly: '#fff4c0' }, { main: '#f0c030', accent: '#b040d0', belly: '#fff0b0' }, { main: '#e8b028', accent: '#a030c0', belly: '#fff0b0' }],
  7: [{ main: '#c07a48', belly: '#fff0d8' }, { main: '#b8703c', belly: '#fff0d8' }, { main: '#a8622e', belly: '#ffecd0' }],
  8: [{ main: '#f2c440', accent: '#7ab8ff', belly: '#fff6d0' }, { main: '#e8b030', accent: '#7ab8ff', belly: '#fff2c8' }, { main: '#d8a028', accent: '#7ab8ff', belly: '#fff0c0' }],
  9: [{ main: '#58b048', accent: '#e85a9a', belly: '#e8ffd0' }, { main: '#4aa040', accent: '#a050e0', belly: '#e0f8c8' }, { main: '#3a9038', accent: '#d8304a', belly: '#e8f8d0' }],
  10: [{ main: '#a060d0', belly: '#e8d0ff' }, { main: '#9050c0', belly: '#e0c8f8' }, { main: '#7a40b0', belly: '#d8c0f0' }],
  11: [{ main: '#8a6a58', belly: '#e8d8c8' }, { main: '#7a5a48', belly: '#e0d0c0' }, { main: '#6a4a3a', belly: '#d8c8b8' }],
  12: [{ main: '#a89880', belly: '#d8d0c0' }, { main: '#988870', belly: '#d0c8b8' }, { main: '#8a7a68', belly: '#c8c0b0' }],
  13: [{ main: '#d89060', accent: '#3a6ad8', belly: '#ffe8d0' }, { main: '#d08858', accent: '#d83a3a', belly: '#ffe0c8' }, { main: '#c87a48', accent: '#d83a3a', belly: '#ffd8b8' }],
  14: [{ main: '#f0a050', accent: '#ff7a3a', belly: '#fff0d8' }, { main: '#c8d4e4', accent: '#ff8a4a', belly: '#ffffff' }, { main: '#e84a3a', accent: '#ffd23a', belly: '#fff0c8' }],
  15: [{ main: '#e8f0f8', belly: '#ffffff' }, { main: '#8ab0d0', belly: '#e8f4ff' }, { main: '#6a90b8', belly: '#e0f0ff' }],
  16: [{ main: '#9a8ad8', accent: '#5a4ab0', belly: '#f0e8ff' }, { main: '#8a7ac8', belly: '#ece4ff' }, { main: '#7a6ab8', accent: '#3a3a8a', belly: '#f0e8ff' }],
  17: [{ main: '#5a4a7a' }, { main: '#4a5a9a', accent: '#5ad0ff' }, { main: '#2a2040', accent: '#8a3ad8' }],
  18: [{ main: '#b8a0c8', accent: '#a05ad0' }, { main: '#a088b8', accent: '#9a3ad0' }, { main: '#8a70a8', accent: '#9a2ad0' }],
  19: [{ main: '#f0a040', belly: '#fff4e0' }, { main: '#e88a30', belly: '#fff0d8' }, { main: '#e87a28', belly: '#fff0d0' }],
  20: [{ main: '#6a5a58', belly: '#c8b8a8' }, { main: '#7a5a48', belly: '#d8c0a8' }, { main: '#6a5048', belly: '#d8b898' }],
  21: [{ main: '#a8b0c0', accent: '#e84a4a' }, { main: '#9aa4b8', accent: '#e84a4a' }, { main: '#8a96ac', accent: '#e84a4a' }],
  22: [{ main: '#c08850' }, { main: '#7a5a3a' }, { main: '#6a4a30' }],
  23: [{ main: '#78c858', accent: '#ffe070' }, { main: '#88d068' }, { main: '#78c060', accent: '#ffd23a' }],
  24: [{ main: '#78b048' }, { main: '#68b850', belly: '#e8ffd0' }, { main: '#4a9a40', belly: '#e0f8c8' }],
  25: [{ main: '#5a4a6a' }, { main: '#6a7a98' }, { main: '#4a5a80' }],
  26: [{ main: '#c8ecff' }, { main: '#d8f0ff', accent: '#a8d8ff' }, { main: '#eef8ff', accent: '#5aa8e8', belly: '#ffffff' }],
  27: [{ main: '#a88a6a', belly: '#e8dccc' }, { main: '#9a7a5a' }, { main: '#c8d8e8', accent: '#88c8f0' }],
  29: [{ main: '#c8a060', accent: '#e05a3a', belly: '#fff0d0' }, { main: '#b88a48', accent: '#e05a3a', belly: '#ffe8c0' }, { main: '#a87838', accent: '#e05a3a', belly: '#ffe8c0' }],
  30: [{ main: '#3a3a5a', belly: '#6a6a8a' }, { main: '#2a2a48', belly: '#5a5a7a' }, { main: '#22223a', accent: '#c83a3a', belly: '#4a4a6a' }],
  31: [{ main: '#6a6a8a', belly: '#d8d8e8' }, { main: '#4a4a6a', belly: '#c8c8d8' }, { main: '#2e2e48', belly: '#b8b8d0' }],
  32: [{ main: '#9aa4b4', accent: '#c8a060' }, { main: '#8a94a8', accent: '#c8a060' }, { main: '#7a849c', accent: '#d84a3a' }],
  33: [{ main: '#ffe070', belly: '#fffbe0' }, { main: '#ffd8f0', accent: '#a8d8ff', belly: '#ffffff' }, { main: '#3a3a8a', accent: '#c8a8ff', belly: '#fff4fc' }],
  34: [{ main: '#ffc8e0', belly: '#f8e8d8' }, { main: '#f8e8f8', accent: '#c8c8ff', belly: '#e8d8c8' }, { main: '#fff4fc', accent: '#ffd8a8', belly: '#e0d0c0' }],
  35: [{ main: '#68b0e0', belly: '#e0f4ff' }, { main: '#58a0d8', belly: '#e0f0ff' }, { main: '#4a90c8', belly: '#ffffff' }],
  36: [{ main: '#c8a8f0', accent: '#ff7ac8' }, { main: '#b088e8', accent: '#d050d0' }, { main: '#9a70e0', accent: '#d040c0' }],
  37: [{ main: '#e8b898', belly: '#fff4ec' }, { main: '#e8a8a8', belly: '#fff0f0' }, { main: '#f0c8a0', accent: '#e85a4a', belly: '#fff4e8' }],
  38: [{ main: '#e0a070', accent: '#c83a3a', belly: '#fff0e0' }, { main: '#d89060', accent: '#c83a3a', belly: '#ffe8d8' }, { main: '#c88050', accent: '#d83a3a', belly: '#ffe0c8' }],
  39: [{ main: '#d8a878', accent: '#e8a030', belly: '#fff0e0' }, { main: '#d0a070', accent: '#e89030', belly: '#ffe8d8' }, { main: '#c89868', accent: '#e8a040', belly: '#ffe8d8' }],
  40: [{ main: '#a87850', belly: '#f8ead8' }, { main: '#987048', belly: '#f0e0c8' }, { main: '#7a5a3a', belly: '#f8f0e8' }],
  41: [{ main: '#f0d040', accent: '#5a8af0', belly: '#fff8d8' }, { main: '#3a4a7a', accent: '#ffd23a', belly: '#f0f4ff' }, { main: '#2a3a6a', accent: '#ffd23a', belly: '#e8ecff' }],
  42: [{ main: '#a8946a', belly: '#e8dcc0' }, { main: '#8a7a5a', belly: '#e0d4b8' }, { main: '#6a6048', belly: '#d8cca8' }],
  43: [{ main: '#a8987a' }, { main: '#988868' }, { main: '#8a7858' }],
  44: [{ main: '#c8b898', belly: '#fff8e8' }, { main: '#8a7a6a', belly: '#e8dcc8' }, { main: '#6a5a50', accent: '#c8a878', belly: '#e0d4c0' }],
  45: [{ main: '#8a7aa0', accent: '#a0e050', belly: '#e0d8ec' }, { main: '#7a6a90', accent: '#a0e050', belly: '#d8d0e4' }, { main: '#5a4a78', accent: '#8a3ad8', belly: '#d0c8e0' }],
  46: [{ main: '#e8c050' }, { main: '#a8d8f0', accent: '#e85a5a' }, { main: '#c89838', accent: '#fff4b0' }],
  47: [{ main: '#f8b858', accent: '#5ad0ff' }, { main: '#f0a848', accent: '#5ad0ff' }, { main: '#e89838', accent: '#5ad0ff' }],
  48: [{ main: '#3a3440', belly: '#8a7a70' }, { main: '#322c38', belly: '#7a6a60' }, { main: '#2a2430', belly: '#6a5a50' }],
  49: [{ main: '#f4ece4', belly: '#ffffff' }, { main: '#f0e8f4', accent: '#ffe090', belly: '#ffffff' }, { main: '#f8f4ff', accent: '#80e0b0', belly: '#ffffff' }],
  50: [{ main: '#f4f0e8', accent: '#e84a4a', belly: '#ffffff' }, { main: '#f4f0e8', accent: '#e84a4a', belly: '#ffffff' }, { main: '#f4f0e8', accent: '#e84a4a', belly: '#ffffff' }],
  51: [{ main: '#7a5a38', accent: '#c060e0' }, { main: '#4a8a40', accent: '#c060e0' }, { main: '#2e4a2e', accent: '#b040d8' }],
  52: [{ main: '#e85a3a', accent: '#ffd23a', belly: '#fff0d8' }, { main: '#e84a30', accent: '#ffd23a', belly: '#ffe8c8' }, { main: '#d83a3a', accent: '#ffd23a', belly: '#ffe8c0' }],
  53: [{ main: '#7a8af0', accent: '#a0e8ff' }, { main: '#6a7ae8', accent: '#a0e8ff' }, { main: '#3a2a5a', accent: '#c8f0ff' }],
  54: [{ main: '#5a6ad8', accent: '#ffd23a' }, { main: '#4a5ac8', accent: '#ffd23a' }, { main: '#3a4ab8', accent: '#ffd23a' }],
  55: [{ main: '#f4f8ff', belly: '#ffffff' }, { main: '#f0f4ff', belly: '#ffffff' }, { main: '#e8f4ff', accent: '#5aa8e8', belly: '#ffffff' }],
  56: [{ main: '#b89848' }, { main: '#a88838', belly: '#fff4d8' }, { main: '#c8a038', belly: '#ffe8c8' }],
  57: [{ main: '#b8c8e0', belly: '#ffffff' }, { main: '#a8b8d8', belly: '#ffffff' }, { main: '#98a8cc', belly: '#ffffff' }],
  58: [{ main: '#58a0e0', accent: '#e8d070', belly: '#e8f4ff' }, { main: '#3a88d0', accent: '#e8d070', belly: '#e8f4ff' }, { main: '#2a78c8', accent: '#6ae0f0', belly: '#f0f8ff' }],
  59: [{ main: '#c8a058', accent: '#a040c0' }, { main: '#b88a48', accent: '#a040c0' }, { main: '#a07038', accent: '#9a30c0' }],
  60: [{ main: '#f8e8a0', accent: '#ffffff', belly: '#fffbe8' }, { main: '#f0e0a0', accent: '#ffffff', belly: '#fffbe8' }, { main: '#f8f0d0', accent: '#5a8af0', belly: '#ffffff' }],
  61: [{ main: '#c8a868', accent: '#c8f0ff' }, { main: '#a89878', accent: '#c8f0ff' }, { main: '#7a7090', accent: '#c8f0ff' }],
  62: [{ main: '#88a860', accent: '#e87a3a', belly: '#f0f8d8' }, { main: '#78a050', accent: '#e87a3a', belly: '#eef8d0' }, { main: '#688a48', accent: '#e86a2a', belly: '#e8f0c8' }],
  63: [{ main: '#4a5a3a', accent: '#ffe870' }, { main: '#3a4a3a', accent: '#ffe870' }, { main: '#2a2a4a', accent: '#a8c8ff' }],
  64: [{ main: '#f8b030', accent: '#ff5a2a', belly: '#fff4c8' }],
  65: [{ main: '#c4d0e4', accent: '#58a8f0', belly: '#f4f8ff' }],
  66: [{ main: '#f4f0fc', accent: '#c8a8f0', belly: '#ffffff' }],
};

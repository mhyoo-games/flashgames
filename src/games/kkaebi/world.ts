// 필드 규칙: 지도 만들기 도구, 진행 상태, 걷기·풀숲·물·비전 기술·트레이너 시야
import type { Rng } from '../../core/rng.ts';
import type { Look } from '../quest/pixel.ts';
import { makeMon, type Mon } from './mon.ts';
import { HMS } from './moves.ts';
import { byNo } from './species.ts';

export type Dir = 'down' | 'up' | 'left' | 'right';
export const DIRS: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export type TimeOfDay = 'morning' | 'day' | 'night';
export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  return h >= 4 && h < 10 ? 'morning' : h >= 10 && h < 18 ? 'day' : 'night';
}
export const TIME_NAME: Record<TimeOfDay, string> = { morning: '아침', day: '낮', night: '밤' };

// ---------------- 지도 ----------------
// 타일: . 풀밭 , 꽃 " 수풀(깨비) T 나무 t 작은나무(베기) ~ 물 w 폭포 = 길 # 바위벽 _ 동굴바닥 s 모래 m 눈밭
//       R 빨간지붕 r 파란지붕(쉼터) y 노란지붕(가게) g 회색지붕(체육관) H 벽 D 문 O 큰돌(괴력) < 턱(아래로만)
//       S 팻말 F 울타리 B 다리 Z 동굴입구 E 사다리 f 실내바닥 x 실내벽 c 계산대 p 보관함 k 책장 u 석상 a 양탄자 l 용암 i 얼음바닥
export type Terrain = 'town' | 'route' | 'forest' | 'cave' | 'snow' | 'sand' | 'indoor' | 'tower';
export type Song = 'ktown' | 'kroute' | 'kcave' | 'kcenter' | 'kgym' | 'ksea';

export interface EncEntry {
  no: number;
  min: number;
  max: number;
  w: number;
  time?: TimeOfDay;
}

export type Step =
  | { say: string; who?: string }
  | { battle: string }
  | { give: string; n?: number }
  | { giveMon: number; lv: number }
  | { set: string }
  | { unset: string }
  | { heal: true }
  | { shop: string[] }
  | { pc: true }
  | { starter: true }
  | { badge: number }
  | { hm: string }
  | { tm: string }
  | { money: number }
  | { wild: number; lv: number; flag?: string }
  | { warp: [string, number, number] }
  | { ending: true }
  | { home: true };

export interface TrainerDef {
  name: string;
  team: [number, number][];
  prize: number;
  smart: 0 | 1 | 2;
  items?: string[];
  before: string;
  after: string;
  /** 시야 칸 수 (0 = 말을 걸어야 싸움) */
  sight: number;
  gym?: number;
  rival?: boolean;
  /** 져도 괜찮은 승부 (첫 라이벌전) */
  soft?: boolean;
}

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  look: string | Look;
  name: string;
  dir?: Dir;
  /** 고개를 이리저리 돌린다 */
  turn?: boolean;
  hidden?: (s: GameState) => boolean;
  talk?: (s: GameState) => Step[];
  trainer?: TrainerDef;
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  dir?: Dir;
  need?: (s: GameState) => string | undefined;
}

export interface MapDef {
  id: string;
  name: string;
  terrain: Terrain;
  song: Song;
  rows: string[];
  dark?: boolean;
  land?: EncEntry[];
  water?: EncEntry[];
  rate?: number;
  npcs: NpcDef[];
  warps: Warp[];
  signs: { x: number; y: number; text: string }[];
  items: { x: number; y: number; item: string; n?: number; tm?: string }[];
  /** 날기로 올 수 있는 곳 */
  fly?: [number, number];
  /** 이 마을의 쉼터 앞 (쓰러지면 여기로) */
  heal?: [number, number];
}

/** 지도 만들기 도구 */
export class Builder {
  g: string[][];
  readonly def: MapDef;
  constructor(id: string, name: string, w: number, h: number, terrain: Terrain, song: Song, fill = '.') {
    this.g = Array.from({ length: h }, () => Array(w).fill(fill));
    this.def = { id, name, terrain, song, rows: [], npcs: [], warps: [], signs: [], items: [] };
  }
  get w() {
    return this.g[0].length;
  }
  get h() {
    return this.g.length;
  }
  set(x: number, y: number, t: string) {
    if (y >= 0 && y < this.h && x >= 0 && x < this.w) this.g[y][x] = t;
    return this;
  }
  at(x: number, y: number) {
    return this.g[y]?.[x] ?? '#';
  }
  rect(x: number, y: number, w: number, h: number, t: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t);
    return this;
  }
  border(t = 'T', thick = 1) {
    for (let k = 0; k < thick; k++) {
      this.rect(0, k, this.w, 1, t).rect(0, this.h - 1 - k, this.w, 1, t);
      this.rect(k, 0, 1, this.h, t).rect(this.w - 1 - k, 0, 1, this.h, t);
    }
    return this;
  }
  /** 길: 점들을 가로·세로로 잇는다 */
  path(pts: [number, number][], t = '=', width = 1) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let k = 0; k < width; k++) this.set(x, y1 + k, t);
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let k = 0; k < width; k++) this.set(x2 + k, y, t);
    }
    return this;
  }
  /** 둥근 덩어리 (호수·수풀·숲) */
  blob(cx: number, cy: number, rx: number, ry: number, t: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.3);
        const dy = (y - cy) / (ry + 0.3);
        if (dx * dx + dy * dy <= 1) this.set(x, y, t);
      }
    return this;
  }
  /** 집: 지붕 2줄 + 벽 1줄, 문은 가운데. roof r=쉼터 y=가게 g=체육관 */
  house(x: number, y: number, w: number, roof = 'R', door?: { to: string; tx: number; ty: number }) {
    this.rect(x, y, w, 2, roof).rect(x, y + 2, w, 1, 'H');
    const dx = x + Math.floor(w / 2);
    this.set(dx, y + 2, 'D');
    if (door) this.def.warps.push({ x: dx, y: y + 2, to: door.to, tx: door.tx, ty: door.ty, dir: 'up' });
    return [dx, y + 3] as [number, number];
  }
  warp(x: number, y: number, to: string, tx: number, ty: number, dir?: Dir, need?: Warp['need']) {
    this.def.warps.push({ x, y, to, tx, ty, dir, need });
    return this;
  }
  npc(n: NpcDef) {
    this.def.npcs.push(n);
    return this;
  }
  sign(x: number, y: number, text: string) {
    this.set(x, y, 'S');
    this.def.signs.push({ x, y, text });
    return this;
  }
  item(x: number, y: number, item: string, n = 1) {
    this.def.items.push({ x, y, item, n });
    return this;
  }
  tm(x: number, y: number, tm: string) {
    this.def.items.push({ x, y, item: 'tm', tm });
    return this;
  }
  /** 흩어진 나무 */
  scatter(t: string, n: number, seed: number, avoid = '=DHRrygSO<"~') {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(r() * (this.w - 4));
      const y = 2 + Math.floor(r() * (this.h - 4));
      if (!avoid.includes(this.at(x, y))) this.set(x, y, t);
    }
    return this;
  }
  build(): MapDef {
    this.def.rows = this.g.map((r) => r.join(''));
    return this.def;
  }
}

/** 두 지도의 가장자리를 잇는다 (a의 side 쪽 pos 칸 ↔ b의 반대쪽 bpos 칸, 폭 width) */
export function link(a: Builder, side: 'north' | 'south' | 'east' | 'west', pos: number, b: Builder, bpos: number, width = 2, t = '=') {
  for (let k = 0; k < width; k++) {
    if (side === 'north') {
      a.set(pos + k, 0, t);
      b.set(bpos + k, b.h - 1, t);
      a.warp(pos + k, -1, b.def.id, bpos + k, b.h - 1, 'up');
      b.warp(bpos + k, b.h, a.def.id, pos + k, 0, 'down');
    } else if (side === 'south') link(b, 'north', bpos, a, pos, width, t);
    else if (side === 'west') {
      a.set(0, pos + k, t);
      b.set(b.w - 1, bpos + k, t);
      a.warp(-1, pos + k, b.def.id, b.w - 1, bpos + k, 'left');
      b.warp(b.w, bpos + k, a.def.id, 0, pos + k, 'right');
    } else link(b, 'west', bpos, a, pos, width, t);
  }
}

// ---------------- 상태 ----------------
export interface GameState {
  map: string;
  x: number;
  y: number;
  dir: Dir;
  flags: Record<string, boolean>;
  party: Mon[];
  box: Mon[];
  bag: Record<string, number>;
  /** 가진 기술 부적·비전 부적 (기술 id) */
  tms: string[];
  money: number;
  badges: number;
  seen: number[];
  caught: number[];
  surfing: boolean;
  /** 두바퀴(자전거)를 타고 있다 */
  biking?: boolean;
  repel: number;
  steps: number;
  home: [string, number, number];
  /** 날기로 갈 수 있는 마을 */
  visited: string[];
  /** 라이벌이 고른 깨비 번호 */
  rival?: number;
  playSec: number;
  /** 플레이어 이름·성별 */
  name: string;
  /** 시간 고정 (시험용) */
  forceTime?: TimeOfDay;
}

export function newGame(name = '하랑'): GameState {
  return {
    map: 'home',
    x: 4,
    y: 4,
    dir: 'down',
    flags: {},
    party: [],
    box: [],
    bag: {},
    tms: [],
    money: 3000,
    badges: 0,
    seen: [],
    caught: [],
    surfing: false,
    repel: 0,
    steps: 0,
    home: ['saessak', 9, 8],
    visited: ['saessak'],
    playSec: 0,
    name,
  };
}

export function addItem(s: GameState, id: string, n = 1) {
  s.bag[id] = (s.bag[id] ?? 0) + n;
  if (s.bag[id] <= 0) delete s.bag[id];
}

/** 새 깨비를 얻음: 파티가 꽉 차면 보관함으로 */
export function receive(s: GameState, m: Mon): 'party' | 'box' {
  if (!s.seen.includes(m.no)) s.seen.push(m.no);
  if (!s.caught.includes(m.no)) s.caught.push(m.no);
  if (s.party.length < 6) {
    s.party.push(m);
    return 'party';
  }
  s.box.push(m);
  return 'box';
}

export function giveMon(s: GameState, no: number, lv: number, rng: Rng) {
  return receive(s, makeMon(no, lv, rng));
}

/** 비전 기술을 쓸 수 있는 깨비 (인장 + 부적 + 배울 수 있는 깨비) */
export function hmUser(s: GameState, move: string): Mon | undefined {
  const hm = HMS.find((h) => h.move === move);
  if (!hm || s.badges < hm.badge || !s.tms.includes(move)) return undefined;
  return s.party.find((m) => m.hp >= 0 && (m.moves.some((x) => x.id === move) || byTm(m, move)));
}
const byTm = (m: Mon, move: string) => byNo(m.no).tm.includes(move);

export function bump(s: GameState) {
  s.steps++;
  if (s.repel > 0) s.repel--;
}

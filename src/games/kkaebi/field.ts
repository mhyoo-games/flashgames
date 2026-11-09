// 걷기·말 걸기·비전 기술 (그리기와 분리)
import type { Rng } from '../../core/rng.ts';
import { MOVES } from './moves.ts';
import { nameOf } from './mon.ts';
import { bump, DIRS, hmUser, timeOfDay, type Dir, type EncEntry, type GameState, type MapDef, type NpcDef, type Step } from './world.ts';

export const SOLID = new Set(['T', 't', '~', 'w', '#', 'R', 'r', 'y', 'g', 'H', 'F', 'S', 'x', 'c', 'p', 'k', 'u', 'l', 'O', 'D']);

/** 지도 안에서 잠깐 바뀐 칸 (베어낸 나무·민 돌). 지도를 떠나면 원래대로 */
const temp = new Map<string, string>();
export function resetTemp() {
  temp.clear();
}
export function tile(m: MapDef, x: number, y: number): string {
  const k = `${m.id}:${x}:${y}`;
  const t = temp.get(k);
  if (t) return t;
  if (y < 0 || y >= m.rows.length || x < 0 || x >= m.rows[0].length) return '#';
  return m.rows[y][x];
}
function setTemp(m: MapDef, x: number, y: number, t: string) {
  temp.set(`${m.id}:${x}:${y}`, t);
}

export const trainerFlag = (map: string, id: string) => `t:${map}:${id}`;
export const itemFlag = (map: string, x: number, y: number) => `i:${map}:${x}:${y}`;

export function npcsOf(s: GameState, m: MapDef): NpcDef[] {
  return m.npcs.filter((n) => !n.hidden?.(s));
}
function itemAt(s: GameState, m: MapDef, x: number, y: number) {
  return m.items.find((i) => i.x === x && i.y === y && !s.flags[itemFlag(m.id, x, y)]);
}

export function walkable(s: GameState, m: MapDef, x: number, y: number): boolean {
  const t = tile(m, x, y);
  if (t === '~') return s.surfing;
  if (SOLID.has(t)) return false;
  if (npcsOf(s, m).some((n) => n.x === x && n.y === y)) return false;
  return !itemAt(s, m, x, y);
}

export type Ask = 'cut' | 'surf' | 'climb' | 'strength' | 'flash';
export interface StepResult {
  moved: boolean;
  /** 턱을 뛰어넘음 (2칸) */
  jump?: boolean;
  warp?: boolean;
  encounter?: { no: number; lv: number };
  trainer?: NpcDef;
  steps?: Step[];
  surfEnd?: boolean;
}

/** 한 칸 걷기 */
export function walk(s: GameState, maps: Record<string, MapDef>, dir: Dir, rng: Rng): StepResult {
  const m = maps[s.map];
  s.dir = dir;
  const [dx, dy] = DIRS[dir];
  const nx = s.x + dx;
  const ny = s.y + dy;
  // 문·지도 끝·사다리
  const w = m.warps.find((p) => p.x === nx && p.y === ny);
  if (w) {
    const why = w.need?.(s);
    if (why) return { moved: false, steps: [{ who: '', say: why }] };
    s.map = w.to;
    s.x = w.tx;
    s.y = w.ty;
    if (w.dir) s.dir = w.dir;
    // 실내로 들어가면 파도타기 끝
    if (maps[w.to].terrain === 'indoor') s.surfing = false;
    else if (s.surfing && tile(maps[w.to], s.x, s.y) !== '~') s.surfing = false;
    resetTemp();
    return { moved: true, warp: true };
  }
  // 턱: 아래로만 뛰어내린다
  if (tile(m, nx, ny) === '<') {
    if (dir !== 'down' || !walkable(s, m, nx, ny + 1)) return { moved: false };
    s.y = ny + 1;
    bump(s);
    return { moved: true, jump: true, ...afterStep(s, m, rng) };
  }
  if (!walkable(s, m, nx, ny)) return { moved: false };
  let surfEnd = false;
  if (s.surfing && tile(m, nx, ny) !== '~') {
    s.surfing = false;
    surfEnd = true;
  }
  s.x = nx;
  s.y = ny;
  bump(s);
  return { moved: true, surfEnd, ...afterStep(s, m, rng) };
}

function afterStep(s: GameState, m: MapDef, rng: Rng): Partial<StepResult> {
  const t = tile(m, s.x, s.y);
  // 트레이너 시야
  const tr = spotted(s, m);
  if (tr) return { trainer: tr };
  // 깨비 만남
  let table: EncEntry[] | undefined;
  if (s.surfing && t === '~') table = m.water;
  else if (t === '"' || (m.terrain === 'cave' && (t === '_' || t === '=')) || (m.terrain === 'forest' && t === '"')) table = m.land;
  if (!table?.length) return {};
  const rate = m.rate ?? (m.terrain === 'cave' ? 0.08 : 0.11);
  if (rng() >= rate) return {};
  const now = s.forceTime ?? timeOfDay();
  const list = table.filter((e) => !e.time || e.time === now);
  if (!list.length) return {};
  const total = list.reduce((a, e) => a + e.w, 0);
  let r = rng() * total;
  const e = list.find((x) => (r -= x.w) < 0) ?? list[0];
  const lv = e.min + Math.floor(rng() * (e.max - e.min + 1));
  // 쑥향: 맨 앞 깨비보다 약하면 안 나온다
  const lead = s.party.find((p) => p.hp > 0);
  if (s.repel > 0 && lead && lv < lead.lv) return {};
  return { encounter: { no: e.no, lv } };
}

/** 나를 본 트레이너 */
export function spotted(s: GameState, m: MapDef): NpcDef | undefined {
  for (const n of npcsOf(s, m)) {
    const tr = n.trainer;
    if (!tr || tr.sight <= 0 || s.flags[trainerFlag(m.id, n.id)]) continue;
    const d = n.dir ?? 'down';
    const [dx, dy] = DIRS[d];
    for (let k = 1; k <= tr.sight; k++) {
      const x = n.x + dx * k;
      const y = n.y + dy * k;
      if (x === s.x && y === s.y) return n;
      if (SOLID.has(tile(m, x, y)) || npcsOf(s, m).some((o) => o.x === x && o.y === y)) break;
    }
  }
  return undefined;
}

export type Interaction = { steps: Step[] } | { ask: Ask; text: string } | { trainer: NpcDef } | undefined;

/** 앞을 조사하기·말 걸기 */
export function interact(s: GameState, m: MapDef): Interaction {
  const [dx, dy] = DIRS[s.dir];
  let x = s.x + dx;
  let y = s.y + dy;
  if (tile(m, x, y) === 'c') {
    x += dx;
    y += dy;
  }
  const npc = npcsOf(s, m).find((n) => n.x === x && n.y === y);
  if (npc) {
    if (npc.trainer && !s.flags[trainerFlag(m.id, npc.id)]) return { trainer: npc };
    if (npc.trainer && !npc.talk) return { steps: [{ who: npc.name, say: npc.trainer.after }] };
    return { steps: npc.talk?.(s) ?? [] };
  }
  const it = itemAt(s, m, x, y);
  if (it) {
    s.flags[itemFlag(m.id, x, y)] = true;
    if (it.tm) {
      if (!s.tms.includes(it.tm)) s.tms.push(it.tm);
      return { steps: [{ who: '', say: `기술 부적 「${MOVES[it.tm].name}」을(를) 주웠다!` }] };
    }
    s.bag[it.item] = (s.bag[it.item] ?? 0) + (it.n ?? 1);
    return { steps: [{ who: '', say: `ITEM:${it.item}:${it.n ?? 1}` }] };
  }
  const sign = m.signs.find((g) => g.x === x && g.y === y);
  if (sign) return { steps: [{ who: '', say: sign.text }] };
  const t = tile(m, x, y);
  if (t === 'p') return { steps: [{ pc: true }] };
  if (t === 'k') return { steps: [{ who: '', say: '책이 빽빽하다. 『깨비와 친해지는 법』, 『호리병 고르는 법』……' }] };
  if (t === 't') return hmUser(s, 'cut') ? { ask: 'cut', text: '작은 나무가 길을 막고 있다. 베어낼까?' } : { steps: [{ who: '', say: '작은 나무가 길을 막고 있다. 베어낼 수 있을 것 같은데……' }] };
  if (t === '~' && !s.surfing) return hmUser(s, 'surf') ? { ask: 'surf', text: '물이 맑다. 파도타기를 할까?' } : { steps: [{ who: '', say: '물이 깊어 들어갈 수 없다.' }] };
  if (t === 'w') return hmUser(s, 'waterfall') && s.surfing ? { ask: 'climb', text: '커다란 폭포다. 거슬러 오를까?' } : { steps: [{ who: '', say: '물살이 세찬 폭포다.' }] };
  if (t === 'O') return s.flags[`str:${m.id}`] ? { steps: [{ who: '', say: '돌을 밀 수 있다! 그쪽으로 걸어 보자.' }] } : hmUser(s, 'strength') ? { ask: 'strength', text: '커다란 돌이다. 장사의힘을 쓸까?' } : { steps: [{ who: '', say: '커다란 돌이다. 꿈쩍도 하지 않는다.' }] };
  return undefined;
}

/** 비전 기술 쓰기 (예를 눌렀을 때) */
export function useField(s: GameState, m: MapDef, kind: Ask): Step[] {
  const move = kind === 'climb' ? 'waterfall' : kind === 'cut' ? 'cut' : kind;
  const user = hmUser(s, move === 'flash' ? 'flash' : move);
  if (!user) return [{ who: '', say: '쓸 수 있는 깨비가 없다.' }];
  const said: Step = { who: '', say: `${nameOf(user)}은(는) ${MOVES[move].name}을(를) 썼다!` };
  const [dx, dy] = DIRS[s.dir];
  const x = s.x + dx;
  const y = s.y + dy;
  if (kind === 'cut') setTemp(m, x, y, '.');
  else if (kind === 'surf') {
    s.surfing = true;
    s.x = x;
    s.y = y;
  } else if (kind === 'climb') {
    let ny = y;
    while (tile(m, s.x, ny) === 'w') ny--;
    s.y = ny;
  } else if (kind === 'strength') s.flags[`str:${m.id}`] = true;
  else if (kind === 'flash') s.flags[`flash:${m.id}`] = true;
  return [said];
}

/** 괴력을 쓴 뒤 돌 밀기: 밀었으면 true */
export function push(s: GameState, m: MapDef, dir: Dir): boolean {
  if (!s.flags[`str:${m.id}`]) return false;
  const [dx, dy] = DIRS[dir];
  const bx = s.x + dx;
  const by = s.y + dy;
  if (tile(m, bx, by) !== 'O') return false;
  const tx = bx + dx;
  const ty = by + dy;
  const t = tile(m, tx, ty);
  if (SOLID.has(t) || t === '<' || npcsOf(s, m).some((n) => n.x === tx && n.y === ty)) return false;
  setTemp(m, bx, by, m.terrain === 'cave' ? '_' : '.');
  setTemp(m, tx, ty, 'O');
  return true;
}

// 필드 이동 규칙: 걷기·부딪힘·말 걸기·상자·지도 이동·적 만남 (그리기와 분리)
import type { Rng } from '../../core/rng.ts';
import { CHESTS, EQUIPS, expFor, HEROES, ITEMS, MAPS, NPCS, SIGNS, TRIGGERS, WARPS, type Flags, type NpcDef, type Slot, type Step } from './data.ts';

export type Dir = 'down' | 'up' | 'left' | 'right';
export const DIRS: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export interface Member {
  id: string;
  lv: number;
  exp: number;
  hp: number;
  mp: number;
  /** 장착한 장비 */
  equip?: Partial<Record<Slot, string>>;
}

export interface WorldState {
  map: string;
  x: number;
  y: number;
  dir: Dir;
  flags: Flags;
  party: Member[];
  gold: number;
  items: Record<string, number>;
  /** 가방 속 장비 (장착하지 않은 것) */
  bag?: Record<string, number>;
  /** 열어 본 상자 "지도:x:y" */
  opened: string[];
  steps: number;
  /** 마지막으로 쉰 곳 (쓰러지면 여기로) */
  home: [string, number, number];
}

export function newWorld(): WorldState {
  return {
    map: 'village',
    x: 12,
    y: 5,
    dir: 'up',
    flags: {},
    party: [newMember('haru')],
    gold: 0,
    items: {},
    bag: {},
    opened: [],
    steps: 0,
    home: ['village', 5, 8],
  };
}

export function newMember(id: string, lv = 1): Member {
  const m: Member = { id, lv: 1, exp: 0, hp: 0, mp: 0 };
  while (m.lv < lv) {
    m.exp = expFor(m.lv);
    m.lv++;
  }
  const s = stats(m);
  m.hp = s.hp;
  m.mp = s.mp;
  return m;
}

/** 레벨에 따른 능력치 */
export function stats(m: Member) {
  const h = HEROES[m.id];
  const k = m.lv - 1;
  const s = {
    hp: Math.round(h.base.hp + h.grow.hp * k),
    mp: Math.round(h.base.mp + h.grow.mp * k),
    atk: Math.round(h.base.atk + h.grow.atk * k),
    mag: Math.round(h.base.mag + h.grow.mag * k),
    def: Math.round(h.base.def + h.grow.def * k),
    spd: Math.round(h.base.spd + h.grow.spd * k),
    mv: h.base.mv,
  };
  for (const id of Object.values(m.equip ?? {})) {
    const e = id ? EQUIPS[id] : undefined;
    if (!e) continue;
    s.atk += e.atk ?? 0;
    s.mag += e.mag ?? 0;
    s.def += e.def ?? 0;
    s.spd += e.spd ?? 0;
    s.hp += e.hp ?? 0;
  }
  return s;
}

export function skillsOf(m: Member) {
  const own = HEROES[m.id].skills.filter(([lv]) => m.lv >= lv).map(([, id]) => id);
  for (const id of Object.values(m.equip ?? {})) {
    const sk = id ? EQUIPS[id]?.skill : undefined;
    if (sk && !own.includes(sk)) own.push(sk);
  }
  return own;
}

/** 경험치를 받고 오른 레벨들을 돌려준다 */
export function gainExp(m: Member, n: number): number[] {
  m.exp += n;
  const ups: number[] = [];
  while (m.exp >= expFor(m.lv) && m.lv < 50) {
    const before = stats(m);
    m.lv++;
    const after = stats(m);
    m.hp += after.hp - before.hp;
    m.mp += after.mp - before.mp;
    ups.push(m.lv);
  }
  return ups;
}

export function tileAt(map: string, x: number, y: number): string {
  const rows = MAPS[map].rows;
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return 'T';
  return rows[y][x];
}

const SOLID = new Set(['T', '~', '#', 'R', 'H', 'D', 'G', 'C', 'S', 'F', 'M', 'L', 'b']);

export function npcsOn(w: WorldState): NpcDef[] {
  return NPCS.filter((n) => n.map === w.map && !n.hidden?.(w.flags));
}

export function walkable(w: WorldState, x: number, y: number): boolean {
  const t = tileAt(w.map, x, y);
  if (t === 'V') return !!w.flags.vines;
  if (SOLID.has(t)) return false;
  if (CHESTS.some((c) => c.map === w.map && c.x === x && c.y === y)) return false;
  return !npcsOn(w).some((n) => n.x === x && n.y === y);
}

export type MoveResult = { kind: 'blocked' } | { kind: 'moved'; warp?: boolean; encounter?: string[]; steps?: Step[]; message?: string };

/** 한 칸 걷기 */
export function step(w: WorldState, dir: Dir, rng: Rng): MoveResult {
  w.dir = dir;
  const [dx, dy] = DIRS[dir];
  const nx = w.x + dx;
  const ny = w.y + dy;
  // 지도 끝·입구에서 이동
  const warp = WARPS.find((p) => p.from === w.map && p.x === nx && p.y === ny);
  if (warp) {
    if (warp.need && !w.flags[warp.need]) return { kind: 'moved', message: warp.blocked };
    w.map = warp.to;
    w.x = warp.tx;
    w.y = warp.ty;
    w.dir = warp.dir;
    w.steps = 0;
    return { kind: 'moved', warp: true };
  }
  if (!walkable(w, nx, ny)) return { kind: 'blocked' };
  w.x = nx;
  w.y = ny;
  w.steps++;
  const trig = TRIGGERS.find((t) => t.map === w.map && t.x === nx && t.y === ny && !w.flags[t.once] && (!t.when || t.when(w.flags)));
  if (trig) {
    w.flags[trig.once] = true;
    return { kind: 'moved', steps: trig.steps };
  }
  const m = MAPS[w.map];
  const t = tileAt(w.map, nx, ny);
  // 길 위에서는 덜 만나고, 처음 몇 걸음은 안 만난다
  if (m.encounters && w.steps > 4) {
    const rate = (m.rate ?? 0.06) * (t === '=' ? 0.55 : t === ',' ? 1.4 : 1);
    if (rng() < rate) {
      w.steps = 0;
      return { kind: 'moved', encounter: m.encounters[Math.floor(rng() * m.encounters.length)] };
    }
  }
  return { kind: 'moved' };
}

/** 앞에 있는 것에 말 걸기·조사하기 */
export function interact(w: WorldState): Step[] | 'BELL' | undefined {
  const [dx, dy] = DIRS[w.dir];
  let x = w.x + dx;
  let y = w.y + dy;
  // 가게 판대 너머 주인에게도 말을 건다
  if (tileAt(w.map, x, y) === 'M') {
    x += dx;
    y += dy;
  }
  const npc = npcsOn(w).find((n) => n.x === x && n.y === y);
  if (npc) {
    npc.dir = ({ down: 'up', up: 'down', left: 'right', right: 'left' } as const)[w.dir];
    return npc.talk(w.flags);
  }
  const chest = CHESTS.find((c) => c.map === w.map && c.x === x && c.y === y);
  if (chest) {
    const key = `${chest.map}:${chest.x}:${chest.y}`;
    if (w.opened.includes(key)) return [{ who: '', say: '상자는 비어 있다.' }];
    w.opened.push(key);
    if (chest.equip) {
      addEquip(w, chest.equip, 1);
      return [{ who: '', say: `상자를 열었다! 장비 「${EQUIPS[chest.equip].name}」을(를) 얻었다. ${EQUIPS[chest.equip].desc} (메뉴 → 장비)` }];
    }
    if (chest.item) {
      addItem(w, chest.item, 1);
      return [{ who: '', say: `상자를 열었다! ${ITEMS[chest.item].name}을(를) 얻었다.` }];
    }
    w.gold += chest.gold ?? 0;
    return [{ who: '', say: `상자를 열었다! ${chest.gold}G를 얻었다.` }];
  }
  const sign = SIGNS.find((s) => s.map === w.map && s.x === x && s.y === y);
  if (sign) return [{ who: '팻말', say: sign.text }];
  const t = tileAt(w.map, x, y);
  if (t === 'G') {
    if (w.flags.clear1) return [{ who: '', say: '종이 바람에 흔들려 맑은 소리를 낸다.' }];
    if (w.flags.bell) return 'BELL';
    return [{ who: '', say: '텅 빈 종탑. 종을 매달던 밧줄만 흔들린다.' }];
  }
  if (t === 'D') return [{ who: '', say: '문이 잠겨 있다. 다들 종 이야기로 밖에 나와 있는 모양이다.' }];
  if (t === '~') return [{ who: '', say: '맑은 물이다. 오리가 꽥 하고 운다.' }];
  return undefined;
}

export function addEquip(w: WorldState, id: string, n: number) {
  w.bag = w.bag ?? {};
  w.bag[id] = (w.bag[id] ?? 0) + n;
  if (w.bag[id] <= 0) delete w.bag[id];
}

export function canEquip(memberId: string, equipId: string) {
  const e = EQUIPS[equipId];
  return !!e && (!e.who || e.who.includes(memberId));
}

/** 장비 바꾸기 (id 없으면 벗기). HP·MP는 최대치를 넘지 않게 */
export function equip(w: WorldState, who: number, slot: Slot, id?: string): boolean {
  const m = w.party[who];
  if (!m || (id && (!canEquip(m.id, id) || EQUIPS[id].slot !== slot || !w.bag?.[id]))) return false;
  m.equip = m.equip ?? {};
  const old = m.equip[slot];
  if (old) addEquip(w, old, 1);
  if (id) {
    addEquip(w, id, -1);
    m.equip[slot] = id;
  } else delete m.equip[slot];
  const s = stats(m);
  m.hp = Math.min(m.hp, s.hp);
  m.mp = Math.min(m.mp, s.mp);
  return true;
}

/** 옛 기록 불러오기 */
export function migrate(w: WorldState): WorldState {
  w.bag = w.bag ?? {};
  for (const m of w.party) m.equip = m.equip ?? {};
  return w;
}

export function addItem(w: WorldState, id: string, n: number) {
  w.items[id] = (w.items[id] ?? 0) + n;
  if (w.items[id] <= 0) delete w.items[id];
}

/** 도구 쓰기 (필드). 쓸 수 있으면 메시지 */
export function useItem(w: WorldState, id: string, who: number): string | undefined {
  const it = ITEMS[id];
  const m = w.party[who];
  if (!it || !m || !w.items[id]) return undefined;
  const s = stats(m);
  if (it.hp && m.hp >= s.hp && !it.mp) return `${HEROES[m.id].name}은(는) 배가 부르다.`;
  if (it.hp) m.hp = Math.min(s.hp, m.hp + it.hp);
  if (it.mp) m.mp = Math.min(s.mp, m.mp + it.mp);
  addItem(w, id, -1);
  return `${HEROES[m.id].name}이(가) ${it.name}을(를) 먹었다!`;
}

export function healAll(w: WorldState) {
  for (const m of w.party) {
    const s = stats(m);
    m.hp = s.hp;
    m.mp = s.mp;
  }
}

/** 전멸: 마지막으로 쉰 곳에서 깨어나고 돈 절반을 잃는다 */
export function wipeOut(w: WorldState) {
  w.gold = Math.floor(w.gold / 2);
  [w.map, w.x, w.y] = w.home;
  w.dir = 'down';
  healAll(w);
}

/** 사건 한 단계의 효과 (대사·전투·가게는 화면 쪽에서) */
export function applyStep(w: WorldState, s: Step): string | undefined {
  if ('join' in s) {
    if (!w.party.some((m) => m.id === s.join)) w.party.push(newMember(s.join, Math.max(1, w.party[0].lv - 1)));
  } else if ('set' in s) w.flags[s.set] = true;
  else if ('give' in s) addItem(w, s.give, s.n ?? 1);
  else if ('equip' in s) addEquip(w, s.equip, 1);
  else if ('gold' in s) w.gold += s.gold;
  else if ('healAll' in s) healAll(w);
  else if ('warp' in s) [w.map, w.x, w.y] = s.warp;
  return undefined;
}

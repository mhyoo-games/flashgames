// 깨비 한 마리 (잡은 것·상대): 능력치·경험치·기술·진화
import type { Rng } from '../../core/rng.ts';
import { MOVES, type Status } from './moves.ts';
import { byNo, type Species } from './species.ts';

export const MAX_LV = 100;

export interface MoveSlot {
  id: string;
  pp: number;
}
export interface Mon {
  no: number;
  nick?: string;
  lv: number;
  exp: number;
  /** 개체값 0~15 (HP 공격 방어 특공 특방 스피드) */
  iv: number[];
  hp: number;
  status?: Status;
  /** 잠든 남은 차례 */
  sleep?: number;
  moves: MoveSlot[];
  shiny?: boolean;
  /** 잡은 호리병 */
  ball?: string;
}

export const sp = (m: Mon): Species => byNo(m.no);
export const nameOf = (m: Mon) => m.nick ?? sp(m).name;

/** 레벨³ 경험치 곡선 */
export const expAt = (lv: number) => (lv <= 1 ? 0 : lv * lv * lv);

export function statOf(m: Mon, i: number): number {
  const b = sp(m).base[i];
  const core = Math.floor(((b + m.iv[i]) * 2 * m.lv) / 100);
  return i === 0 ? core + m.lv + 10 : core + 5;
}
export const maxHp = (m: Mon) => statOf(m, 0);

/** 이 레벨까지 배우는 기술 중 마지막 4개 */
export function movesAt(no: number, lv: number): MoveSlot[] {
  const learn = byNo(no).learn.filter(([l]) => l <= lv).map(([, id]) => id);
  const uniq = [...new Set(learn)];
  return uniq.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }));
}

export function makeMon(no: number, lv: number, rng: Rng): Mon {
  const iv = Array.from({ length: 6 }, () => Math.floor(rng() * 16));
  const m: Mon = { no, lv, exp: expAt(lv), iv, hp: 0, moves: movesAt(no, lv), shiny: rng() < 1 / 512 };
  m.hp = maxHp(m);
  return m;
}

export function healMon(m: Mon) {
  m.hp = maxHp(m);
  m.status = undefined;
  m.sleep = undefined;
  for (const s of m.moves) s.pp = MOVES[s.id].pp;
}

export interface LevelResult {
  levels: number[];
  /** 자리가 남아 바로 배운 기술 */
  learned: string[];
  /** 4개가 꽉 차서 물어봐야 하는 기술 */
  ask: string[];
}

/** 경험치를 받고 레벨업·기술을 처리한다 */
export function gainExp(m: Mon, n: number): LevelResult {
  const res: LevelResult = { levels: [], learned: [], ask: [] };
  if (m.lv >= MAX_LV) return res;
  m.exp += n;
  while (m.lv < MAX_LV && m.exp >= expAt(m.lv + 1)) {
    const before = maxHp(m);
    m.lv++;
    if (m.hp > 0) m.hp += maxHp(m) - before;
    res.levels.push(m.lv);
    for (const [l, id] of sp(m).learn) {
      if (l !== m.lv || m.moves.some((s) => s.id === id)) continue;
      if (m.moves.length < 4) {
        m.moves.push({ id, pp: MOVES[id].pp });
        res.learned.push(id);
      } else res.ask.push(id);
    }
  }
  if (m.lv >= MAX_LV) m.exp = expAt(MAX_LV);
  return res;
}

/** 진화할 수 있으면 다음 번호 */
export function canEvolve(m: Mon): number | undefined {
  const s = sp(m);
  return s.evolveAt && s.evolveTo && m.lv >= s.evolveAt ? s.evolveTo : undefined;
}

export function evolve(m: Mon) {
  const to = canEvolve(m);
  if (!to) return false;
  const before = maxHp(m);
  m.no = to;
  m.hp = Math.max(1, m.hp + maxHp(m) - before);
  // 진화한 레벨에 배우는 기술
  for (const [l, id] of sp(m).learn) if (l === m.lv && !m.moves.some((s) => s.id === id) && m.moves.length < 4) m.moves.push({ id, pp: MOVES[id].pp });
  return true;
}

/** 기술 바꾸기 (idx 자리를 잊고 새 기술) */
export function teach(m: Mon, move: string, forget?: number): boolean {
  if (m.moves.some((s) => s.id === move)) return false;
  const slot = { id: move, pp: MOVES[move].pp };
  if (m.moves.length < 4) m.moves.push(slot);
  else if (forget !== undefined && forget >= 0 && forget < 4) m.moves[forget] = slot;
  else return false;
  return true;
}

export function canLearnTm(m: Mon, move: string) {
  return sp(m).tm.includes(move);
}

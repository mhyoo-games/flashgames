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
  /** 트레이너와의 유대 0~255 */
  bond?: number;
  /** 숨은 유대 진화를 했다 (능력치 15% 상승) */
  bondForm?: boolean;
}

export const sp = (m: Mon): Species => byNo(m.no);
export const nameOf = (m: Mon) => m.nick ?? (m.bondForm ? '유대 ' : '') + sp(m).name;

/** 레벨³ 경험치 곡선 */
export const expAt = (lv: number) => (lv <= 1 ? 0 : lv * lv * lv);

export function statOf(m: Mon, i: number): number {
  const b = sp(m).base[i];
  const core = Math.floor(((b + m.iv[i]) * 2 * m.lv) / 100);
  const v = i === 0 ? core + m.lv + 10 : core + 5;
  return m.bondForm && i > 0 ? Math.floor(v * 1.15) : v;
}

export const BOND_MAX = 255;
/** 유대가 이만큼이면 한 전투에 한 번 트레이너가 쓰러질 공격을 막아 준다 */
export const BOND_GUARD = 150;
/** 유대 진화: 처음 고른 세 마리의 마지막 모습이 유대 220 이상, 레벨 40 이상에서 전투에 이기면 */
export const BOND_EVO = 220;
export const BOND_SPECIES = [3, 6, 9];
export function addBond(m: Mon, n: number) {
  m.bond = Math.max(0, Math.min(BOND_MAX, (m.bond ?? 70) + n));
}
export const canBondEvolve = (m: Mon) => !m.bondForm && BOND_SPECIES.includes(m.no) && (m.bond ?? 0) >= BOND_EVO && m.lv >= 40 && m.hp > 0;
export const bondLabel = (b = 70) => (b >= 220 ? '♥♥♥♥♥ 마음이 하나' : b >= 150 ? '♥♥♥♥ 굳게 믿고 있다' : b >= 100 ? '♥♥♥ 잘 따른다' : b >= 60 ? '♥♥ 조금 친해졌다' : '♥ 아직 서먹하다');
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
    addBond(m, 3);
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

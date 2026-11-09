// 깨비 전투 규칙 (1:1 교대). 화면과 분리되어 있어 Node로 시험할 수 있다.
import type { Rng } from '../../core/rng.ts';
import { ITEMS } from './items.ts';
import { BOND_GUARD, gainExp, maxHp, nameOf, sp, statOf, type Mon } from './mon.ts';
import { MOVES, STAT_NAME, STATUS_NAME, type MoveDef, type Stat, type Status } from './moves.ts';
import { effectiveness, type Type } from './types.ts';

export type Side = 'p' | 'f';
export type Ev =
  | { t: 'msg'; s: string }
  | { t: 'hp'; side: Side; hp: number; max: number }
  | { t: 'anim'; side: Side; kind: 'atk' | 'hit' | 'faint' | 'stat' | 'status' | 'send' | 'recall' | 'throw' | 'shake' | 'caught' | 'escape'; move?: string; up?: boolean }
  | { t: 'swap'; side: Side; idx: number; hp: number }
  | { t: 'exp'; idx: number; exp: number; lv: number }
  | { t: 'level'; idx: number; lv: number };

export type Action = { kind: 'move'; slot: number } | { kind: 'switch'; idx: number } | { kind: 'item'; id: string; target?: number; moveSlot?: number } | { kind: 'run' };

interface Vol {
  stages: Record<Stat, number>;
  cnf: number;
  flinch: boolean;
}
const freshVol = (): Vol => ({ stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }, cnf: 0, flinch: false });
const STAT_IDX: Record<'atk' | 'def' | 'spa' | 'spd' | 'spe', number> = { atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };
const stageMul = (n: number) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const accMul = (n: number) => (n >= 0 ? (3 + n) / 3 : 3 / (3 - n));

export interface TrainerInfo {
  name: string;
  /** 똑똑함: 0 아무거나, 1 상성 따짐, 2 회복약도 씀 */
  smart: 0 | 1 | 2;
  items?: string[];
  prize: number;
}

export class Fight {
  party: Mon[];
  foes: Mon[];
  p = 0;
  f = 0;
  pv = freshVol();
  fv = freshVol();
  outcome: 'win' | 'lose' | 'run' | 'caught' | null = null;
  /** 내 깨비가 쓰러져 바꿔야 함 */
  needSwitch = false;
  /** 기술이 꽉 차서 물어봐야 하는 것 */
  pendingLearn: { idx: number; move: string }[] = [];
  /** 지금 상대와 싸운 내 깨비들 (경험치 나눔) */
  private fought = new Set<number>();
  private runs = 0;
  readonly wild: boolean;
  readonly trainer?: TrainerInfo;
  private readonly rng: Rng;
  turnNo = 0;

  /** 유대로 한 번 지켜 준 깨비 */
  guarded = new Set<Mon>();
  heroName = '트레이너';
  constructor(party: Mon[], foes: Mon[], rng: Rng, trainer?: TrainerInfo) {
    this.party = party;
    this.foes = foes;
    this.rng = rng;
    this.trainer = trainer;
    this.wild = !trainer;
    this.p = Math.max(0, party.findIndex((m) => m.hp > 0));
    this.fought.add(this.p);
    this.trainerItems = [...(trainer?.items ?? [])];
  }
  private trainerItems: string[];

  get me() {
    return this.party[this.p];
  }
  get foe() {
    return this.foes[this.f];
  }

  /** 능력치 (단계·화상·마비 반영) */
  private eff(m: Mon, v: Vol, s: 'atk' | 'def' | 'spa' | 'spd' | 'spe') {
    let x = statOf(m, STAT_IDX[s]) * stageMul(v.stages[s]);
    if (s === 'spe' && m.status === 'par') x *= 0.25;
    return x;
  }

  // ---------------- 한 차례 ----------------
  turn(a: Action): Ev[] {
    const ev: Ev[] = [];
    if (this.outcome || this.needSwitch) return ev;
    this.turnNo++;
    this.pv.flinch = false;
    this.fv.flinch = false;
    // 1) 도망·교체·도구 (기술보다 먼저)
    if (a.kind === 'run') {
      if (!this.wild) {
        ev.push({ t: 'msg', s: '안 돼! 승부에서 등을 보일 순 없어!' });
        return ev;
      }
      this.runs++;
      const chance = 0.45 + (0.3 * this.eff(this.me, this.pv, 'spe')) / Math.max(1, this.eff(this.foe, this.fv, 'spe')) + this.runs * 0.12;
      if (this.rng() < chance) {
        ev.push({ t: 'msg', s: '무사히 도망쳤다!' });
        this.outcome = 'run';
        return ev;
      }
      ev.push({ t: 'msg', s: '도망칠 수 없었다!' });
    } else if (a.kind === 'switch') {
      this.switchIn('p', a.idx, ev);
    } else if (a.kind === 'item') {
      if (this.useItem(a, ev)) return ev;
    }
    const foeAct = this.foeChoice(ev);
    if (this.outcome) return ev;
    // 2) 기술 순서: 선제 → 스피드
    const mine = a.kind === 'move' ? this.me.moves[a.slot] : undefined;
    const theirs = foeAct;
    const order: Side[] = [];
    if (mine && theirs) {
      const pp = this.prio(MOVES[mine.id]);
      const fp = this.prio(MOVES[theirs.id]);
      const ps = this.eff(this.me, this.pv, 'spe');
      const fs = this.eff(this.foe, this.fv, 'spe');
      order.push(pp > fp || (pp === fp && (ps > fs || (ps === fs && this.rng() < 0.5))) ? 'p' : 'f');
      order.push(order[0] === 'p' ? 'f' : 'p');
    } else if (mine) order.push('p');
    else if (theirs) order.push('f');
    for (const side of order) {
      if (this.outcome || this.needSwitch) break;
      const user = side === 'p' ? this.me : this.foe;
      if (user.hp <= 0) continue;
      const slot = side === 'p' ? mine! : theirs!;
      this.useMove(side, slot, ev);
      if (this.checkFaints(ev)) break;
    }
    // 3) 차례 끝: 화상·독
    if (!this.outcome) {
      for (const side of ['p', 'f'] as Side[]) {
        const m = side === 'p' ? this.me : this.foe;
        if (m.hp <= 0 || (m.status !== 'brn' && m.status !== 'psn')) continue;
        const d = Math.max(1, Math.floor(maxHp(m) / 8));
        m.hp = Math.max(0, m.hp - d);
        ev.push({ t: 'msg', s: `${this.label(side)}은(는) ${m.status === 'brn' ? '화상' : '독'} 때문에 괴롭다!` }, { t: 'hp', side, hp: m.hp, max: maxHp(m) });
      }
      this.checkFaints(ev);
    }
    return ev;
  }

  private prio(m: MoveDef) {
    return m.effects.some((e) => e.kind === 'prio') ? 1 : 0;
  }

  label(side: Side) {
    return side === 'p' ? nameOf(this.me) : `${this.wild ? '야생의 ' : '상대 '}${nameOf(this.foe)}`;
  }

  // ---------------- 기술 쓰기 ----------------
  private useMove(side: Side, slot: { id: string; pp: number }, ev: Ev[]) {
    const user = side === 'p' ? this.me : this.foe;
    const target = side === 'p' ? this.foe : this.me;
    const uv = side === 'p' ? this.pv : this.fv;
    const tv = side === 'p' ? this.fv : this.pv;
    const tside: Side = side === 'p' ? 'f' : 'p';
    const who = this.label(side);
    // 행동 전 상태 확인
    if (uv.flinch) {
      ev.push({ t: 'msg', s: `${who}은(는) 풀이 죽어 움직이지 못했다!` });
      return;
    }
    if (user.status === 'slp') {
      user.sleep = (user.sleep ?? 1) - 1;
      if (user.sleep > 0) {
        ev.push({ t: 'msg', s: `${who}은(는) 쿨쿨 자고 있다.` });
        return;
      }
      user.status = undefined;
      ev.push({ t: 'msg', s: `${who}은(는) 잠에서 깼다!` });
    }
    if (user.status === 'frz') {
      if (this.rng() < 0.2) {
        user.status = undefined;
        ev.push({ t: 'msg', s: `${who}의 얼음이 녹았다!` });
      } else {
        ev.push({ t: 'msg', s: `${who}은(는) 꽁꽁 얼어 움직일 수 없다!` });
        return;
      }
    }
    if (user.status === 'par' && this.rng() < 0.25) {
      ev.push({ t: 'msg', s: `${who}은(는) 몸이 저려 움직일 수 없다!` });
      return;
    }
    if (uv.cnf > 0) {
      uv.cnf--;
      if (uv.cnf === 0) ev.push({ t: 'msg', s: `${who}의 혼란이 풀렸다!` });
      else {
        ev.push({ t: 'msg', s: `${who}은(는) 혼란에 빠져 있다!` });
        if (this.rng() < 0.4) {
          const d = this.calc(user, uv, user, uv, 40, 'phys', null, false).dmg;
          user.hp = Math.max(0, user.hp - d);
          ev.push({ t: 'msg', s: '영문도 모른 채 자기를 공격했다!' }, { t: 'anim', side, kind: 'hit' }, { t: 'hp', side, hp: user.hp, max: maxHp(user) });
          return;
        }
      }
    }
    const mv = MOVES[slot.id];
    if (slot.pp > 0) slot.pp--;
    ev.push({ t: 'msg', s: `${who}의 ${mv.name}!` }, { t: 'anim', side, kind: 'atk', move: mv.id });
    // 명중
    const sure = mv.effects.some((e) => e.kind === 'sure');
    const selfOnly = mv.cat === 'status' && mv.effects.every((e) => e.self || e.kind === 'heal' || e.kind === 'rest');
    if (!sure && !selfOnly) {
      const hit = (mv.acc / 100) * (accMul(uv.stages.acc) / accMul(tv.stages.eva));
      if (this.rng() >= hit) {
        ev.push({ t: 'msg', s: '그러나 빗나갔다!' });
        return;
      }
    }
    // 피해
    if (mv.cat !== 'status') {
      const eff = effectiveness(mv.type, sp(target).types);
      if (eff === 0) {
        ev.push({ t: 'msg', s: `${this.label(tside)}에게는 효과가 없는 것 같다…` });
        return;
      }
      const hits = mv.effects.some((e) => e.kind === 'multi') ? [2, 2, 3, 3, 4, 5][Math.floor(this.rng() * 6)] : mv.effects.some((e) => e.kind === 'twice') ? 2 : 1;
      let total = 0;
      let crit = false;
      for (let h = 0; h < hits && target.hp > 0; h++) {
        let dmg: number;
        if (mv.effects.some((e) => e.kind === 'level')) dmg = user.lv;
        else {
          const r = this.calc(user, uv, target, tv, mv.power, mv.cat, mv.type, mv.effects.some((e) => e.kind === 'crit'));
          dmg = r.dmg;
          crit ||= r.crit;
        }
        dmg = Math.min(dmg, target.hp);
        // 유대: 쓰러질 공격을 한 전투에 한 번 트레이너가 막아 준다
        if (tside === 'p' && dmg >= target.hp && target.hp > 1 && (target.bond ?? 0) >= BOND_GUARD && !this.guarded.has(target)) {
          this.guarded.add(target);
          dmg = target.hp - 1;
          ev.push({ t: 'msg', s: `${this.heroName}이(가) 몸을 던져 ${nameOf(target)}을(를) 감쌌다! (유대)` });
        }
        target.hp -= dmg;
        total += dmg;
        ev.push({ t: 'anim', side: tside, kind: 'hit' }, { t: 'hp', side: tside, hp: target.hp, max: maxHp(target) });
      }
      if (crit) ev.push({ t: 'msg', s: '급소에 맞았다!' });
      if (eff > 1) ev.push({ t: 'msg', s: '효과가 굉장했다!' });
      else if (eff < 1) ev.push({ t: 'msg', s: '효과가 별로인 듯하다…' });
      if (hits > 1) ev.push({ t: 'msg', s: `${hits}번 맞았다!` });
      // 흡수·반동
      if (mv.effects.some((e) => e.kind === 'drain') && total > 0) {
        const n = Math.min(maxHp(user) - user.hp, Math.max(1, Math.floor(total / 2)));
        user.hp += n;
        ev.push({ t: 'msg', s: `${this.label(tside)}의 기운을 빨아들였다!` }, { t: 'hp', side, hp: user.hp, max: maxHp(user) });
      }
      if (mv.effects.some((e) => e.kind === 'recoil') && total > 0) {
        user.hp = Math.max(0, user.hp - Math.max(1, Math.floor(total / 4)));
        ev.push({ t: 'msg', s: `${who}은(는) 반동으로 피해를 입었다!` }, { t: 'hp', side, hp: user.hp, max: maxHp(user) });
      }
      if (target.hp <= 0) return;
    }
    // 추가 효과
    for (const e of mv.effects) {
      if (this.rng() * 100 >= e.chance) continue;
      if (e.kind === 'status' && e.status) this.inflict(tside, e.status, ev, mv.cat === 'status');
      else if (e.kind === 'cnf') {
        const v = mv.cat === 'status' || mv.id !== 'outrage' ? tv : uv;
        const s2: Side = v === tv ? tside : side;
        if (v.cnf > 0) {
          if (mv.cat === 'status') ev.push({ t: 'msg', s: `${this.label(s2)}은(는) 이미 혼란에 빠져 있다.` });
        } else {
          v.cnf = 2 + Math.floor(this.rng() * 4);
          ev.push({ t: 'msg', s: `${this.label(s2)}은(는) 혼란에 빠졌다!` });
        }
      } else if (e.kind === 'flinch') tv.flinch = true;
      else if (e.kind === 'stat' && e.stats) {
        const v = e.self ? uv : tv;
        const s2: Side = e.self ? side : tside;
        for (const [st, n] of e.stats) {
          const before = v.stages[st];
          v.stages[st] = Math.max(-6, Math.min(6, before + n));
          if (v.stages[st] === before) ev.push({ t: 'msg', s: `${this.label(s2)}의 ${STAT_NAME[st]}은(는) 더 ${n > 0 ? '오르지' : '떨어지지'} 않는다!` });
          else ev.push({ t: 'anim', side: s2, kind: 'stat', up: n > 0 }, { t: 'msg', s: `${this.label(s2)}의 ${STAT_NAME[st]}이(가) ${Math.abs(n) >= 2 ? '크게 ' : ''}${n > 0 ? '올랐다' : '떨어졌다'}!` });
        }
      } else if (e.kind === 'heal') {
        const n = Math.min(maxHp(user) - user.hp, Math.ceil(maxHp(user) / 2));
        user.hp += n;
        ev.push(n > 0 ? { t: 'msg', s: `${who}은(는) 기운을 되찾았다!` } : { t: 'msg', s: '그러나 HP가 가득 차 있다!' }, { t: 'hp', side, hp: user.hp, max: maxHp(user) });
      } else if (e.kind === 'rest') {
        user.hp = maxHp(user);
        user.status = 'slp';
        user.sleep = 3;
        ev.push({ t: 'msg', s: `${who}은(는) 꿀잠에 빠져 기운을 되찾았다!` }, { t: 'hp', side, hp: user.hp, max: maxHp(user) });
      }
    }
  }

  private inflict(side: Side, st: Status, ev: Ev[], loud: boolean) {
    const m = side === 'p' ? this.me : this.foe;
    const types = sp(m).types;
    const immune = (st === 'brn' && types.includes('fire')) || (st === 'psn' && (types.includes('poison') || types.includes('steel'))) || (st === 'frz' && types.includes('ice')) || (st === 'par' && types.includes('electric'));
    if (m.status || m.hp <= 0 || immune) {
      if (loud) ev.push({ t: 'msg', s: '그러나 아무 일도 일어나지 않았다!' });
      return;
    }
    m.status = st;
    if (st === 'slp') m.sleep = 1 + Math.floor(this.rng() * 3) + 1;
    const txt: Record<Status, string> = { brn: '화상을 입었다', psn: '독에 걸렸다', par: '마비되어 기술이 나오기 어려워졌다', slp: '잠들어 버렸다', frz: '꽁꽁 얼어붙었다' };
    ev.push({ t: 'anim', side, kind: 'status' }, { t: 'msg', s: `${this.label(side)}은(는) ${txt[st]}!` });
  }

  /** 피해 계산 */
  calc(user: Mon, uv: Vol, target: Mon, tv: Vol, power: number, cat: 'phys' | 'spec' | 'status', type: Type | null, highCrit: boolean) {
    const crit = this.rng() < (highCrit ? 1 / 8 : 1 / 16);
    const atkS = cat === 'phys' ? 'atk' : 'spa';
    const defS = cat === 'phys' ? 'def' : 'spd';
    // 급소면 불리한 능력 변화를 무시
    const A = crit ? statOf(user, STAT_IDX[atkS]) * stageMul(Math.max(0, uv.stages[atkS])) : this.eff(user, uv, atkS);
    const D = crit ? statOf(target, STAT_IDX[defS]) * stageMul(Math.min(0, tv.stages[defS])) : this.eff(target, tv, defS);
    let dmg = Math.floor(Math.floor(((2 * user.lv) / 5 + 2) * power * (A / Math.max(1, D))) / 50) + 2;
    if (cat === 'phys' && user.status === 'brn') dmg = Math.floor(dmg / 2);
    if (type) {
      if (sp(user).types.includes(type)) dmg = Math.floor(dmg * 1.5);
      dmg = Math.floor(dmg * effectiveness(type, sp(target).types));
    }
    if (crit) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor((dmg * (85 + Math.floor(this.rng() * 16))) / 100);
    return { dmg: Math.max(1, dmg), crit };
  }

  // ---------------- 상대 ----------------
  private foeChoice(ev: Ev[]): { id: string; pp: number } | undefined {
    const m = this.foe;
    if (m.hp <= 0) return undefined;
    // 똑똑한 트레이너는 위험하면 회복약
    if (this.trainer && this.trainer.smart >= 2 && m.hp < maxHp(m) * 0.25 && this.trainerItems.length) {
      const id = this.trainerItems.shift()!;
      const it = ITEMS[id];
      m.hp = Math.min(maxHp(m), m.hp + (it.hp ?? 0));
      ev.push({ t: 'msg', s: `${this.trainer.name}은(는) ${it.name}을(를) 사용했다!` }, { t: 'hp', side: 'f', hp: m.hp, max: maxHp(m) });
      return undefined;
    }
    const usable = m.moves.filter((s) => s.pp > 0);
    if (!usable.length) return { id: 'tackle', pp: 1 };
    if (!this.trainer || this.trainer.smart === 0 || this.rng() < 0.15) return usable[Math.floor(this.rng() * usable.length)];
    let best = usable[0];
    let bestScore = -1;
    for (const s of usable) {
      const mv = MOVES[s.id];
      let sc: number;
      if (mv.cat === 'status') {
        const inflicts = mv.effects.find((e) => e.kind === 'status' || e.kind === 'cnf');
        const boosts = mv.effects.find((e) => e.kind === 'stat' && e.self);
        sc = inflicts ? (this.me.status || this.pv.cnf ? 0 : 45) : boosts ? (this.fv.stages.atk + this.fv.stages.spa < 2 ? 35 : 5) : mv.effects.some((e) => e.kind === 'heal') ? (m.hp < maxHp(m) * 0.5 ? 60 : 0) : 15;
      } else {
        const stab = sp(m).types.includes(mv.type) ? 1.5 : 1;
        sc = mv.power * stab * effectiveness(mv.type, sp(this.me).types) * (mv.acc / 100);
      }
      sc *= 0.85 + this.rng() * 0.3;
      if (sc > bestScore) {
        bestScore = sc;
        best = s;
      }
    }
    return best;
  }

  // ---------------- 교체·쓰러짐 ----------------
  private switchIn(side: Side, idx: number, ev: Ev[]) {
    if (side === 'p') {
      ev.push({ t: 'msg', s: `돌아와, ${nameOf(this.me)}!` }, { t: 'anim', side: 'p', kind: 'recall' });
      this.p = idx;
      this.pv = freshVol();
      this.fought.add(idx);
      ev.push({ t: 'swap', side: 'p', idx, hp: this.me.hp }, { t: 'msg', s: `가랏, ${nameOf(this.me)}!` }, { t: 'anim', side: 'p', kind: 'send' });
    } else {
      this.f = idx;
      this.fv = freshVol();
      this.fought = new Set([this.p]);
      ev.push({ t: 'swap', side: 'f', idx, hp: this.foe.hp }, { t: 'msg', s: `${this.trainer!.name}은(는) ${nameOf(this.foe)}을(를) 내보냈다!` }, { t: 'anim', side: 'f', kind: 'send' });
    }
  }

  /** 쓰러진 깨비 처리. 전투가 멈춰야 하면 true */
  private checkFaints(ev: Ev[]): boolean {
    let stop = false;
    if (this.foe.hp <= 0 && !this.outcome) {
      ev.push({ t: 'anim', side: 'f', kind: 'faint' }, { t: 'msg', s: `${this.label('f')}은(는) 쓰러졌다!` });
      this.giveExp(ev);
      const next = this.foes.findIndex((m) => m.hp > 0);
      if (next < 0) {
        this.outcome = 'win';
        if (this.trainer) ev.push({ t: 'msg', s: `${this.trainer.name}과(와)의 승부에서 이겼다!` });
      } else this.switchIn('f', next, ev);
      stop = true;
    }
    if (this.me.hp <= 0 && !this.outcome) {
      ev.push({ t: 'anim', side: 'p', kind: 'faint' }, { t: 'msg', s: `${nameOf(this.me)}은(는) 쓰러졌다!` });
      this.fought.delete(this.p);
      if (this.party.some((m) => m.hp > 0)) this.needSwitch = true;
      else {
        this.outcome = 'lose';
        ev.push({ t: 'msg', s: '싸울 수 있는 깨비가 없다……' }, { t: 'msg', s: '눈앞이 캄캄해졌다!' });
      }
      stop = true;
    }
    return stop;
  }

  /** 쓰러진 뒤 다음 깨비 내보내기 */
  forceSwitch(idx: number): Ev[] {
    const ev: Ev[] = [];
    if (!this.needSwitch || this.party[idx]?.hp <= 0) return ev;
    this.needSwitch = false;
    this.p = idx;
    this.pv = freshVol();
    this.fought.add(idx);
    ev.push({ t: 'swap', side: 'p', idx, hp: this.me.hp }, { t: 'msg', s: `가랏, ${nameOf(this.me)}!` }, { t: 'anim', side: 'p', kind: 'send' });
    return ev;
  }

  private giveExp(ev: Ev[]) {
    const f = this.foe;
    const share = [...this.fought].filter((i) => this.party[i].hp > 0);
    if (!share.length) return;
    const total = Math.floor((sp(f).expYield * f.lv * (this.trainer ? 1.5 : 1)) / 7);
    const each = Math.max(1, Math.floor(total / share.length));
    for (const i of share) {
      const m = this.party[i];
      const res = gainExp(m, each);
      ev.push({ t: 'msg', s: `${nameOf(m)}은(는) 경험치 ${each}을(를) 얻었다!` }, { t: 'exp', idx: i, exp: m.exp, lv: m.lv });
      for (const lv of res.levels) ev.push({ t: 'level', idx: i, lv }, { t: 'msg', s: `${nameOf(m)}은(는) 레벨 ${lv}이(가) 되었다!` });
      if (i === this.p && res.levels.length) ev.push({ t: 'hp', side: 'p', hp: m.hp, max: maxHp(m) });
      for (const id of res.learned) ev.push({ t: 'msg', s: `${nameOf(m)}은(는) ${MOVES[id].name}을(를) 배웠다!` });
      for (const id of res.ask) this.pendingLearn.push({ idx: i, move: id });
    }
  }

  // ---------------- 도구·포획 ----------------
  /** true면 이번 차례가 그걸로 끝 (잡았거나 도구 사용 실패) */
  private useItem(a: { id: string; target?: number; moveSlot?: number }, ev: Ev[]): boolean {
    const it = ITEMS[a.id];
    if (!it) return true;
    if (it.kind === 'ball') {
      if (!this.wild) {
        ev.push({ t: 'msg', s: '남의 깨비는 잡을 수 없다!' });
        return true;
      }
      ev.push({ t: 'msg', s: `${it.name}을(를) 던졌다!` }, { t: 'anim', side: 'f', kind: 'throw' });
      const shakes = this.catchShakes(it.ball ?? 1);
      for (let i = 0; i < Math.min(shakes, 3); i++) ev.push({ t: 'anim', side: 'f', kind: 'shake' });
      if (shakes >= 4) {
        this.foe.ball = a.id;
        this.outcome = 'caught';
        ev.push({ t: 'anim', side: 'f', kind: 'caught' }, { t: 'msg', s: `좋아! ${nameOf(this.foe)}을(를) 잡았다!` });
        return true;
      }
      ev.push({ t: 'anim', side: 'f', kind: 'escape' }, { t: 'msg', s: ['앗! 빠져나와 버렸다!', '아까워! 조금만 더였는데!', '으악! 잡은 줄 알았는데!'][Math.min(2, shakes)] });
      return false;
    }
    const m = this.party[a.target ?? this.p];
    if (!m) return true;
    if (it.kind === 'heal' && m.hp > 0) {
      m.hp = Math.min(maxHp(m), m.hp + (it.hp ?? 0));
      ev.push({ t: 'msg', s: `${nameOf(m)}의 HP가 회복되었다!` });
      if (m === this.me) ev.push({ t: 'hp', side: 'p', hp: m.hp, max: maxHp(m) });
    } else if (it.kind === 'cure' && m.status && (it.cures === 'all' || it.cures?.includes(m.status))) {
      ev.push({ t: 'msg', s: `${nameOf(m)}의 ${STATUS_NAME[m.status]}이(가) 나았다!` });
      m.status = undefined;
      if (m === this.me) this.pv.cnf = it.cures === 'all' ? 0 : this.pv.cnf;
    } else if (it.kind === 'revive' && m.hp <= 0) {
      m.hp = Math.floor(maxHp(m) / 2);
      m.status = undefined;
      ev.push({ t: 'msg', s: `${nameOf(m)}이(가) 기운을 차렸다!` });
    } else if (it.kind === 'pp' && a.moveSlot !== undefined && m.moves[a.moveSlot]) {
      const s = m.moves[a.moveSlot];
      s.pp = Math.min(MOVES[s.id].pp, s.pp + 10);
      ev.push({ t: 'msg', s: `${MOVES[s.id].name}의 PP가 회복되었다!` });
    } else {
      ev.push({ t: 'msg', s: '써도 효과가 없을 것 같다.' });
      return true;
    }
    return false;
  }

  /** 흔들림 수 (4 = 잡힘) */
  catchShakes(ball: number): number {
    const m = this.foe;
    if (ball >= 255) return 4;
    const max = maxHp(m);
    const status = m.status === 'slp' || m.status === 'frz' ? 2 : m.status ? 1.5 : 1;
    const a = (((3 * max - 2 * m.hp) * sp(m).catchRate * ball) / (3 * max)) * status;
    const p = Math.min(1, a / 255);
    const each = Math.pow(p, 0.25);
    let n = 0;
    while (n < 4 && this.rng() < each) n++;
    return n;
  }
}

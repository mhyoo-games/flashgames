// 칸 전투: 8×5 칸 위에서 빠른 순서대로 움직이고 때린다 (그리기와 분리)
import type { Rng } from '../../core/rng.ts';
import { FOES, HEROES, ITEMS, MISFIRES, SKILLS, type SkillDef } from './data.ts';
import type { Look, MonsterShape } from './pixel.ts';
import { addItem, skillsOf, stats, type WorldState } from './world.ts';

export const BW = 8;
export const BH = 5;

export interface Unit {
  uid: number;
  name: string;
  side: 'hero' | 'foe';
  /** 동료면 파티 번호 */
  member?: number;
  defId: string;
  look?: Look;
  shape?: MonsterShape;
  colors?: [string, string];
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
  mv: number;
  fly: boolean;
  boss: boolean;
  skills: string[];
  /** 꿀 먹기 같은 횟수 제한 */
  uses: number;
}

export type Action = { kind: 'attack' } | { kind: 'skill'; id: string } | { kind: 'item'; id: string } | { kind: 'wait' } | { kind: 'flee' };

export type BEvent =
  | { t: 'act'; uid: number; tx: number; ty: number; name?: string }
  | { t: 'hit'; uid: number; dmg: number; crit?: boolean }
  | { t: 'heal'; uid: number; n: number; mp?: boolean }
  | { t: 'miss'; uid: number }
  | { t: 'die'; uid: number }
  | { t: 'msg'; text: string };

export interface Reward {
  exp: number;
  gold: number;
  drops: string[];
}

export class Battle {
  units: Unit[] = [];
  rocks: [number, number][] = [];
  order: number[] = [];
  turn = 0;
  round = 1;
  outcome: 'win' | 'lose' | 'fled' | null = null;
  readonly noFlee: boolean;
  readonly boss: boolean;
  private origin?: [number, number];
  private readonly rng: Rng;

  constructor(w: WorldState, foes: string[], rng: Rng, opts: { noFlee?: boolean; boss?: boolean } = {}) {
    this.rng = rng;
    this.noFlee = !!opts.noFlee || !!opts.boss;
    this.boss = !!opts.boss;
    let uid = 0;
    w.party.forEach((m, i) => {
      const s = stats(m);
      this.units.push({ uid: uid++, name: HEROES[m.id].name, side: 'hero', member: i, defId: m.id, look: HEROES[m.id].look, x: 1, y: [2, 1, 3][i] ?? i, hp: m.hp, maxHp: s.hp, mp: m.mp, maxMp: s.mp, atk: s.atk, mag: s.mag, def: s.def, spd: s.spd, mv: s.mv, fly: false, boss: false, skills: skillsOf(m), uses: 0 });
    });
    const spots: [number, number][] = foes.length === 1 ? [[6, 2]] : [[6, 1], [6, 3], [7, 2], [5, 2], [7, 0], [7, 4]];
    // 같은 이름이 여럿이면 A·B·C
    const count: Record<string, number> = {};
    foes.forEach((id, i) => {
      const f = FOES[id];
      count[id] = (count[id] ?? 0) + 1;
      const many = foes.filter((x) => x === id).length > 1;
      const [x, y] = f.boss ? [6, 2] : spots[i] ?? [7, i % BH];
      this.units.push({ uid: uid++, name: many ? `${f.name} ${'ABCDEF'[count[id] - 1]}` : f.name, side: 'foe', defId: id, look: f.look, shape: f.shape, colors: f.colors, x, y, hp: f.hp, maxHp: f.hp, mp: 0, maxMp: 0, atk: f.atk, mag: f.mag, def: f.def, spd: f.spd, mv: f.mv, fly: !!f.fly, boss: !!f.boss, skills: f.skills ?? [], uses: 0 });
    });
    // 보스가 있으면 다른 적이 겹치지 않게
    if (this.boss) {
      const others = this.units.filter((u) => u.side === 'foe' && !u.boss);
      others.forEach((u, i) => ([u.x, u.y] = [[5, 0], [5, 4], [7, 0], [7, 4]][i]));
    }
    // 가운데 장애물 (나무·바위) 몇 개
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const x = 3 + Math.floor(rng() * 2);
      const y = Math.floor(rng() * BH);
      if (!this.rocks.some(([a, b]) => a === x && b === y)) this.rocks.push([x, y]);
    }
    this.newRound();
  }

  private newRound() {
    this.order = this.alive()
      .map((u) => ({ u, k: u.spd + this.rng() * 3 }))
      .sort((a, b) => b.k - a.k)
      .map((o) => o.u.uid);
    this.turn = 0;
  }

  alive(side?: 'hero' | 'foe') {
    return this.units.filter((u) => u.hp > 0 && (!side || u.side === side));
  }

  unit(uid: number) {
    return this.units.find((u) => u.uid === uid)!;
  }

  get current(): Unit {
    return this.unit(this.order[this.turn]);
  }

  unitAt(x: number, y: number) {
    return this.alive().find((u) => u.x === x && u.y === y);
  }

  blocked(x: number, y: number, u: Unit) {
    if (x < 0 || y < 0 || x >= BW || y >= BH) return true;
    if (!u.fly && this.rocks.some(([a, b]) => a === x && b === y)) return true;
    const o = this.unitAt(x, y);
    return !!o && o !== u;
  }

  /** 갈 수 있는 칸 (제자리 포함) */
  reachable(u: Unit): [number, number][] {
    const seen = new Map<string, number>([[`${u.x},${u.y}`, 0]]);
    const q: [number, number, number][] = [[u.x, u.y, 0]];
    const out: [number, number][] = [[u.x, u.y]];
    while (q.length) {
      const [x, y, d] = q.shift()!;
      if (d >= u.mv) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        // 날지 못하면 다른 유닛을 지나갈 수 없다 (같은 편은 지나감)
        const o = this.unitAt(nx, ny);
        if (nx < 0 || ny < 0 || nx >= BW || ny >= BH) continue;
        if (!u.fly && this.rocks.some(([a, b]) => a === nx && b === ny)) continue;
        if (o && o.side !== u.side && !u.fly) continue;
        seen.set(k, d + 1);
        q.push([nx, ny, d + 1]);
        if (!o) out.push([nx, ny]);
      }
    }
    return out;
  }

  moveTo(u: Unit, x: number, y: number) {
    this.origin = [u.x, u.y];
    u.x = x;
    u.y = y;
  }

  /** 이동 취소 */
  undoMove(u: Unit) {
    if (this.origin) [u.x, u.y] = this.origin;
    this.origin = undefined;
  }

  skill(id: string): SkillDef {
    return SKILLS[id];
  }

  rangeOf(a: Action): number {
    if (a.kind === 'attack') return 1;
    if (a.kind === 'skill') return SKILLS[a.id].range;
    return a.kind === 'item' ? 1 : 0;
  }

  /** 이 행동으로 노릴 수 있는 대상 */
  targets(u: Unit, a: Action): Unit[] {
    const r = this.rangeOf(a);
    const foeSide = u.side === 'hero' ? 'foe' : 'hero';
    const wantAlly = (a.kind === 'skill' && SKILLS[a.id].target === 'ally') || a.kind === 'item';
    return this.alive(wantAlly ? u.side : foeSide).filter((o) => Math.abs(o.x - u.x) + Math.abs(o.y - u.y) <= r);
  }

  canUse(u: Unit, a: Action, w?: WorldState): boolean {
    if (a.kind === 'skill') return u.mp >= SKILLS[a.id].mp && this.targets(u, a).length > 0;
    if (a.kind === 'item') return !!w?.items[a.id] && this.targets(u, a).length > 0;
    if (a.kind === 'attack') return this.targets(u, a).length > 0;
    if (a.kind === 'flee') return !this.noFlee;
    return true;
  }

  private damage(src: Unit, dst: Unit, power: number, stat: 'atk' | 'mag', canCrit: boolean): BEvent[] {
    const ev: BEvent[] = [];
    if (canCrit && this.rng() < 0.04) return [{ t: 'miss', uid: dst.uid }];
    const crit = canCrit && this.rng() < 1 / 14;
    const base = src[stat] * power * (0.9 + this.rng() * 0.2);
    const dmg = Math.max(1, Math.round(crit ? base * 1.6 : base - dst.def * 0.55));
    dst.hp = Math.max(0, dst.hp - dmg);
    ev.push({ t: 'hit', uid: dst.uid, dmg, crit });
    if (dst.hp <= 0) ev.push({ t: 'die', uid: dst.uid });
    return ev;
  }

  /** 행동하기 → 일어난 일 */
  act(u: Unit, a: Action, target?: Unit, w?: WorldState): BEvent[] {
    this.origin = undefined;
    const ev: BEvent[] = [];
    switch (a.kind) {
      case 'wait':
        break;
      case 'flee': {
        if (this.rng() < 0.65) {
          this.outcome = 'fled';
          ev.push({ t: 'msg', text: '무사히 도망쳤다!' });
        } else ev.push({ t: 'msg', text: '도망치지 못했다!' });
        break;
      }
      case 'attack': {
        if (!target) break;
        ev.push({ t: 'act', uid: u.uid, tx: target.x, ty: target.y });
        const d = this.damage(u, target, 1, 'atk', true);
        if (d[0].t === 'hit' && d[0].crit) ev.push({ t: 'msg', text: '회심의 일격!' });
        ev.push(...d);
        break;
      }
      case 'item': {
        if (!target || !w) break;
        const it = ITEMS[a.id];
        addItem(w, a.id, -1);
        ev.push({ t: 'act', uid: u.uid, tx: target.x, ty: target.y, name: it.name });
        if (it.hp) {
          const n = Math.min(target.maxHp - target.hp, it.hp);
          target.hp += n;
          ev.push({ t: 'heal', uid: target.uid, n });
        }
        if (it.mp) {
          const n = Math.min(target.maxMp - target.mp, it.mp);
          target.mp += n;
          ev.push({ t: 'heal', uid: target.uid, n, mp: true });
        }
        break;
      }
      case 'skill': {
        const s = SKILLS[a.id];
        if (!target || u.mp < s.mp) break;
        u.mp -= s.mp;
        ev.push({ t: 'act', uid: u.uid, tx: target.x, ty: target.y, name: s.name });
        if (s.misfire && this.rng() < s.misfire) {
          ev.push({ t: 'msg', text: MISFIRES[Math.floor(this.rng() * MISFIRES.length)] });
          break;
        }
        const hitList = this.alive(target.side).filter((o) => Math.abs(o.x - target.x) + Math.abs(o.y - target.y) <= s.area);
        for (const o of hitList) {
          if (s.kind === 'heal') {
            const n = Math.min(o.maxHp - o.hp, Math.round(u[s.stat] * s.power * (0.9 + this.rng() * 0.2) + 4));
            o.hp += n;
            ev.push({ t: 'heal', uid: o.uid, n });
          } else ev.push(...this.damage(u, o, s.power, s.stat, false));
        }
        if (a.id === 'honeyTime') u.uses++;
        break;
      }
    }
    this.checkEnd();
    return ev;
  }

  private checkEnd() {
    if (this.outcome) return;
    if (!this.alive('foe').length) this.outcome = 'win';
    else if (!this.alive('hero').length) this.outcome = 'lose';
  }

  /** 다음 차례로 */
  endTurn() {
    if (this.outcome) return;
    do {
      this.turn++;
      if (this.turn >= this.order.length) {
        this.round++;
        this.newRound();
      }
    } while (this.current.hp <= 0);
  }

  // ---------------- 컴퓨터 ----------------
  /** 적 차례: 움직이고 행동한다 */
  aiTurn(): { path: [number, number]; events: BEvent[] } {
    const u = this.current;
    const heroes = this.alive('hero');
    let best: { score: number; pos: [number, number]; a: Action; t?: Unit } = { score: -1, pos: [u.x, u.y], a: { kind: 'wait' } };
    const ox = u.x;
    const oy = u.y;
    const options: Action[] = [{ kind: 'attack' }, ...u.skills.map((id) => ({ kind: 'skill', id }) as Action)];
    for (const [x, y] of this.reachable(u)) {
      u.x = x;
      u.y = y;
      for (const a of options) {
        if (a.kind === 'skill') {
          const s = SKILLS[a.id];
          if (a.id === 'honeyTime') {
            if (u.hp < u.maxHp * 0.4 && u.uses < 2 && x === ox && y === oy) {
              const sc = 60;
              if (sc > best.score) best = { score: sc, pos: [x, y], a, t: u };
            }
            continue;
          }
          if (s.kind !== 'dmg') continue;
        }
        for (const t of this.targets(u, a)) {
          const power = a.kind === 'skill' ? SKILLS[a.id].power : 1;
          const area = a.kind === 'skill' ? SKILLS[a.id].area : 0;
          const hits = heroes.filter((h) => Math.abs(h.x - t.x) + Math.abs(h.y - t.y) <= area).length;
          const dmg = Math.max(1, u.atk * power - t.def * 0.55) * hits;
          let sc = dmg + (dmg >= t.hp ? 25 : 0) + (1 - t.hp / t.maxHp) * 6 + this.rng() * 4;
          // 강한 기술은 가끔 쓴다
          if (a.kind === 'skill' && this.rng() < 0.4) sc *= 0.5;
          if (sc > best.score) best = { score: sc, pos: [x, y], a, t };
        }
      }
    }
    u.x = ox;
    u.y = oy;
    if (best.score < 0) {
      // 아무도 못 때리면 가장 가까운 동료에게 다가간다
      const near = (x: number, y: number) => Math.min(...heroes.map((h) => Math.abs(h.x - x) + Math.abs(h.y - y)));
      let pos: [number, number] = [u.x, u.y];
      for (const p of this.reachable(u)) if (near(p[0], p[1]) < near(pos[0], pos[1])) pos = p;
      best.pos = pos;
    }
    u.x = best.pos[0];
    u.y = best.pos[1];
    const events = best.score >= 0 ? this.act(u, best.a, best.t) : [];
    return { path: best.pos, events };
  }

  /** 이긴 뒤 보상 */
  reward(): Reward {
    const foes = this.units.filter((u) => u.side === 'foe');
    const drops: string[] = [];
    for (const f of foes) {
      const d = FOES[f.defId].drop;
      if (d && (f.boss || this.rng() < 0.22)) drops.push(d);
    }
    return { exp: foes.reduce((s, f) => s + FOES[f.defId].exp, 0), gold: foes.reduce((s, f) => s + FOES[f.defId].gold, 0), drops };
  }

  /** 전투가 끝나면 HP·MP를 파티에 돌려 준다 */
  writeBack(w: WorldState) {
    for (const u of this.units) {
      if (u.member === undefined) continue;
      const m = w.party[u.member];
      m.hp = Math.max(u.hp, this.outcome === 'win' || this.outcome === 'fled' ? (u.hp > 0 ? u.hp : 1) : 0);
      m.mp = u.mp;
    }
  }
}

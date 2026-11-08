// 막대 결투: 1:1 격투 규칙 (그리기와 분리 → 테스트 가능)
import { HEROES, type CharDef, type SpecialKind } from './chars.ts';

export const W = 960;
export const H = 540;
export const FLOOR = 470;
const GRAVITY = 1900;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  special: boolean;
}

export const NO_INPUT: Input = { left: false, right: false, up: false, down: false, punch: false, kick: false, special: false };

export type AttackKind = 'punch1' | 'punch2' | 'punch3' | 'kick' | 'throw' | 'airkick' | 'special';
export type Action = 'idle' | 'walk' | 'jump' | 'block' | AttackKind | 'hit' | 'ko' | 'win';

interface AttackDef {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  /** 발 기준 앞쪽으로 닿는 거리 */
  reach: number;
  /** 발 기준 높이 (음수 = 위) */
  height: number;
  knock: number;
  stun: number;
}

/** 기본값. 캐릭터의 속도·힘·리치로 바뀐다 */
export const BASE_ATTACKS: Record<Exclude<AttackKind, 'special'>, AttackDef> = {
  punch1: { startup: 0.07, active: 0.08, recovery: 0.13, damage: 5, reach: 62, height: -100, knock: 90, stun: 0.24 },
  punch2: { startup: 0.07, active: 0.08, recovery: 0.15, damage: 6, reach: 64, height: -100, knock: 110, stun: 0.26 },
  punch3: { startup: 0.11, active: 0.1, recovery: 0.3, damage: 10, reach: 70, height: -95, knock: 420, stun: 0.45 },
  kick: { startup: 0.13, active: 0.1, recovery: 0.26, damage: 11, reach: 80, height: -62, knock: 300, stun: 0.38 },
  throw: { startup: 0.12, active: 0.04, recovery: 0.3, damage: 5, reach: 0, height: -100, knock: 120, stun: 0.25 },
  airkick: { startup: 0.05, active: 0.3, recovery: 0.08, damage: 9, reach: 64, height: -55, knock: 240, stun: 0.32 },
};

/** 기술마다 걸리는 시간 */
export const SPECIALS: Record<SpecialKind, { startup: number; active: number; recovery: number }> = {
  wave: { startup: 0.28, active: 0.05, recovery: 0.35 },
  dash: { startup: 0.18, active: 0.34, recovery: 0.3 },
  slam: { startup: 0.35, active: 0.08, recovery: 0.4 },
  spin: { startup: 0.12, active: 0.75, recovery: 0.3 },
  teleport: { startup: 0.22, active: 0.12, recovery: 0.3 },
};

export const METER_MAX = 100;

export interface Fighter {
  id: 0 | 1;
  char: CharDef;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  meter: number;
  action: Action;
  t: number;
  stun: number;
  hitDone: boolean;
  /** 회오리처럼 여러 번 때리는 기술의 다음 타격 시각 */
  nextTick: number;
  comboWindow: number;
  comboStep: number;
  wins: number;
  /** 대마왕 분노 */
  enraged: boolean;
  /** 이번 판에 쓴 기술 종류 */
  currentSpecial: SpecialKind;
}

export type ShotKind = 'wave' | 'star' | 'shock';

export interface Projectile {
  owner: 0 | 1;
  kind: ShotKind;
  x: number;
  y: number;
  vx: number;
  r: number;
  damage: number;
  knock: number;
  stun: number;
  life: number;
  /** 땅을 타고 오는 충격파: 공중에 있으면 안 맞는다 */
  low: boolean;
}

export interface Spark {
  x: number;
  y: number;
  t: number;
  kind: 'hit' | 'block' | 'big' | 'smoke';
}

export type GameEvent = 'hit' | 'bighit' | 'block' | 'swing' | 'jump' | 'special' | 'ko' | 'round' | 'fight' | 'timeup' | 'win' | 'lose' | 'rage' | 'throw' | 'slam';

export type Phase = 'intro' | 'fight' | 'ko' | 'over';

export interface FightOptions {
  chars?: [CharDef, CharDef];
  names?: [string, string];
  /** 이겨야 하는 판 수 */
  winsNeeded?: number;
  roundTime?: number;
  /** 보스 체력 배율 */
  hpScale?: [number, number];
}

export class StickFight {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  sparks: Spark[] = [];
  events: GameEvent[] = [];
  phase: Phase = 'intro';
  phaseTime = 0;
  round = 1;
  readonly roundTime: number;
  readonly winsNeeded: number;
  timer: number;
  hitstop = 0;
  shake = 0;
  banner = '';
  winner?: 0 | 1;
  /** 잠깐 보여주는 글자가 사라질 시각 */
  private bannerUntil = 0;
  private prev: [Input, Input] = [NO_INPUT, NO_INPUT];
  private readonly hpScale: [number, number];

  constructor(opts: FightOptions = {}) {
    const chars = opts.chars ?? [HEROES[0], HEROES[1]];
    const names = opts.names ?? [chars[0].name, chars[1].name];
    this.winsNeeded = opts.winsNeeded ?? 2;
    this.roundTime = opts.roundTime ?? 60;
    this.timer = this.roundTime;
    this.hpScale = opts.hpScale ?? [1, 1];
    this.fighters = [this.makeFighter(0, chars[0], names[0]), this.makeFighter(1, chars[1], names[1])];
    this.startRound();
  }

  private makeFighter(id: 0 | 1, char: CharDef, name: string): Fighter {
    const maxHp = Math.round(char.hp * this.hpScale[id]);
    return { id, char, name, x: 0, y: FLOOR, vx: 0, vy: 0, facing: id === 0 ? 1 : -1, hp: maxHp, maxHp, meter: 0, action: 'idle', t: 0, stun: 0, hitDone: false, nextTick: 0, comboWindow: 0, comboStep: 0, wins: 0, enraged: false, currentSpecial: char.special };
  }

  private startRound() {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      f.hp = f.maxHp;
      f.y = FLOOR;
      f.vx = f.vy = 0;
      f.action = 'idle';
      f.t = 0;
      f.stun = 0;
      f.comboStep = 0;
      f.enraged = false;
      f.meter = Math.min(f.meter, 50);
    }
    a.x = W * 0.3;
    b.x = W * 0.7;
    a.facing = 1;
    b.facing = -1;
    this.projectiles = [];
    this.timer = this.roundTime;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.banner = this.winsNeeded > 1 ? `${this.round}라운드` : '결투!';
    this.events.push('round');
  }

  get over(): boolean {
    return this.phase === 'over';
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** 캐릭터에 맞춘 공격 수치 */
  attack(f: Fighter, kind: Exclude<AttackKind, 'special'>): AttackDef {
    const b = BASE_ATTACKS[kind];
    const c = f.char;
    const tempo = c.tempo * (f.enraged ? 0.8 : 1);
    return {
      startup: b.startup * tempo,
      active: b.active,
      recovery: b.recovery * tempo,
      damage: Math.round(b.damage * c.power),
      reach: (b.reach + (kind === 'throw' ? 0 : c.reach)) * c.scale,
      height: b.height * c.scale,
      knock: b.knock * (0.8 + c.power * 0.2),
      stun: b.stun,
    };
  }

  /** 지금 동작 전체 시간 (그리기용 진행률) */
  static progress(f: Fighter): number {
    if (f.action === 'special') {
      const s = SPECIALS[f.currentSpecial];
      return Math.min(1, f.t / (s.startup + s.active));
    }
    if (!(f.action in BASE_ATTACKS)) return 0;
    const b = BASE_ATTACKS[f.action as Exclude<AttackKind, 'special'>];
    const tempo = f.char.tempo;
    return Math.min(1, f.t / (b.startup * tempo + b.active));
  }

  static isAttack(a: Action): boolean {
    return a in BASE_ATTACKS || a === 'special';
  }

  step(dt: number, inputs: [Input, Input]): void {
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < 0.4);

    if (this.phase === 'intro') {
      if (this.phaseTime > 1.6 && this.banner !== '싸워라!') {
        this.banner = '싸워라!';
        this.events.push('fight');
      }
      if (this.phaseTime > 2.2) {
        this.phase = 'fight';
        this.banner = '';
      }
      this.physics(dt, [NO_INPUT, NO_INPUT], false);
      return;
    }
    if (this.phase === 'over') {
      this.physics(dt, [NO_INPUT, NO_INPUT], false);
      return;
    }
    if (this.phase === 'ko') {
      this.physics(dt * (this.phaseTime < 1 ? 0.35 : 1), [NO_INPUT, NO_INPUT], false);
      if (this.phaseTime > 3) this.nextRound();
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    this.timer -= dt;
    if (this.bannerUntil && this.phaseTime > this.bannerUntil) {
      this.banner = '';
      this.bannerUntil = 0;
    }
    this.physics(dt, inputs, true);
    this.prev = [{ ...inputs[0] }, { ...inputs[1] }];
    if (this.timer <= 0) this.timeUp();
  }

  private physics(dt: number, inputs: [Input, Input], control: boolean) {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      const o = f === a ? b : a;
      this.updateFighter(f, o, inputs[f.id], this.prev[f.id], dt, control);
    }
    const dx = b.x - a.x;
    const minGap = 22 * (a.char.scale + b.char.scale);
    if (Math.abs(dx) < minGap && Math.abs(a.y - b.y) < 100 && a.action !== 'ko' && b.action !== 'ko') {
      const push = (minGap - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= push * s;
      b.x += push * s;
    }
    for (const f of this.fighters) f.x = Math.max(36, Math.min(W - 36, f.x));
    this.updateProjectiles(dt);
  }

  private grounded(f: Fighter) {
    return f.y >= FLOOR - 0.5;
  }

  private setAction(f: Fighter, action: Action) {
    f.action = action;
    f.t = 0;
    f.hitDone = false;
    f.nextTick = 0;
  }

  private updateFighter(f: Fighter, o: Fighter, inp: Input, prev: Input, dt: number, control: boolean) {
    f.t += dt;
    f.comboWindow -= dt;
    const pressed = (k: keyof Input) => inp[k] && !prev[k];
    const ground = this.grounded(f);
    const c = f.char;

    // 대마왕: 체력이 반 아래면 분노
    if (c.id === 'maou' && !f.enraged && f.hp < f.maxHp / 2 && f.hp > 0) {
      f.enraged = true;
      f.meter = METER_MAX;
      this.banner = '대마왕이 분노했다!';
      this.bannerUntil = this.phaseTime + 1.6;
      this.events.push('rage');
    }

    if (f.action === 'ko' || f.action === 'win') {
      // 아무것도 못 함
    } else if (f.action === 'hit') {
      f.stun -= dt;
      if (f.stun <= 0 && ground) this.setAction(f, 'idle');
    } else if (f.action === 'special') {
      this.updateSpecial(f, o, dt);
    } else if (f.action in BASE_ATTACKS) {
      const kind = f.action as Exclude<AttackKind, 'special'>;
      const def = this.attack(f, kind);
      if (kind === 'throw') {
        if (f.t >= def.startup && !f.hitDone) {
          f.hitDone = true;
          this.projectiles.push({ owner: f.id, kind: 'star', x: f.x + f.facing * 30, y: f.y - 100 * c.scale, vx: f.facing * 720, r: 10, damage: def.damage, knock: def.knock, stun: def.stun, life: 1.6, low: false });
        }
      } else if (f.t >= def.startup && f.t < def.startup + def.active && !f.hitDone) {
        this.tryHit(f, o, def.reach, def.height, def.damage, def.knock, def.stun, kind === 'punch3' || kind === 'kick', 22);
      }
      const done = f.t >= def.startup + def.active + def.recovery || (kind === 'airkick' && ground && f.t > 0.05);
      if (done) {
        if (kind === 'punch1' || kind === 'punch2') {
          f.comboWindow = 0.32;
          f.comboStep = kind === 'punch1' ? 1 : 2;
        } else f.comboStep = 0;
        this.setAction(f, ground ? 'idle' : 'jump');
      }
      if (control && (kind === 'punch1' || kind === 'punch2') && pressed('punch') && f.t > def.startup + def.active * 0.5) {
        this.setAction(f, kind === 'punch1' ? 'punch2' : 'punch3');
        this.events.push('swing');
      }
    } else if (control) {
      if (ground) f.facing = o.x >= f.x ? 1 : -1;
      if (pressed('special') && f.meter >= METER_MAX && ground) {
        f.meter = f.enraged ? 50 : 0;
        f.currentSpecial = f.enraged ? (['wave', 'dash', 'slam'] as const)[Math.floor(Math.abs(Math.sin(f.t * 97 + f.x)) * 3)] : c.special;
        this.setAction(f, 'special');
        this.events.push('special');
      } else if (pressed('punch')) {
        if (!ground) this.setAction(f, 'airkick');
        else this.setAction(f, f.comboWindow > 0 && f.comboStep === 1 ? 'punch2' : f.comboWindow > 0 && f.comboStep === 2 ? 'punch3' : 'punch1');
        this.events.push('swing');
      } else if (pressed('kick')) {
        if (c.kick === 'throw') {
          this.setAction(f, 'throw');
          this.events.push('throw');
        } else {
          this.setAction(f, ground ? 'kick' : 'airkick');
          this.events.push('swing');
        }
      } else if (ground && inp.down) {
        if (f.action !== 'block') this.setAction(f, 'block');
        f.vx = 0;
      } else if (ground && pressed('up')) {
        f.vy = -c.jump;
        f.vx = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * c.walk * 1.1;
        this.setAction(f, 'jump');
        this.events.push('jump');
      } else if (ground) {
        const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        f.vx = dir * c.walk * (dir === f.facing ? 1 : 0.75) * (f.enraged ? 1.2 : 1);
        const want: Action = dir ? 'walk' : 'idle';
        if (f.action !== want) this.setAction(f, want);
      }
    } else if (ground && f.action !== 'idle' && f.action !== 'block') {
      this.setAction(f, 'idle');
    }

    const dashing = f.action === 'special' && f.currentSpecial === 'dash' && f.t >= SPECIALS.dash.startup && f.t < SPECIALS.dash.startup + SPECIALS.dash.active;
    if (ground && !dashing && (StickFight.isAttack(f.action) || f.action === 'block' || f.action === 'hit' || f.action === 'ko' || !control)) {
      f.vx *= Math.pow(0.0005, dt);
    }
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y >= FLOOR) {
      f.y = FLOOR;
      f.vy = 0;
      if (f.action === 'jump') this.setAction(f, 'idle');
    }
  }

  private updateSpecial(f: Fighter, o: Fighter, dt: number) {
    void dt;
    const kind = f.currentSpecial;
    const s = SPECIALS[kind];
    const c = f.char;
    const p = c.power;
    const activeNow = f.t >= s.startup && f.t < s.startup + s.active;
    switch (kind) {
      case 'wave':
        if (f.t >= s.startup && !f.hitDone) {
          f.hitDone = true;
          const big = c.id === 'kai';
          this.projectiles.push({ owner: f.id, kind: 'wave', x: f.x + f.facing * 40, y: f.y - 100 * c.scale, vx: f.facing * (big ? 520 : 580), r: big ? 40 : 30, damage: Math.round((big ? 22 : 18) * p), knock: 380, stun: 0.5, life: 2.5, low: false });
        }
        break;
      case 'dash':
        if (activeNow) {
          f.vx = f.facing * 900;
          if (!f.hitDone) this.tryHit(f, o, 40 + c.reach * 0.5, -90 * c.scale, Math.round(15 * p), 420, 0.5, true, 34);
        }
        break;
      case 'slam':
        if (f.t >= s.startup && !f.hitDone) {
          f.hitDone = true;
          this.shake = 12;
          this.events.push('slam');
          for (const dir of [-1, 1]) {
            this.projectiles.push({ owner: f.id, kind: 'shock', x: f.x + dir * 50, y: FLOOR - 14, vx: dir * 430, r: 18, damage: Math.round(13 * p), knock: 300, stun: 0.5, life: 1.6, low: true });
          }
          // 바로 옆은 직접 맞는다
          const d = Math.abs(o.x - f.x);
          if (d < 90 * c.scale && this.grounded(o)) this.applyHit(f, o, Math.round(10 * p), 260 * Math.sign(o.x - f.x || 1), 0.45, o.x, FLOOR - 30, true);
        }
        break;
      case 'spin':
        if (activeNow && f.t >= f.nextTick) {
          f.nextTick = f.t + 0.14;
          const last = f.t + 0.14 >= s.startup + s.active;
          const reach = 70 + c.reach;
          const d = Math.abs(o.x - f.x);
          if (d < reach && Math.abs(o.y - f.y) < 120) {
            const dir = Math.sign(o.x - f.x) || f.facing;
            this.applyHit(f, o, Math.round((last ? 8 : 4) * p), (last ? 380 : 80) * dir, last ? 0.45 : 0.2, o.x, o.y - 90, last);
          }
          this.events.push('swing');
        }
        break;
      case 'teleport':
        if (f.t >= s.startup && !f.hitDone && f.nextTick === 0) {
          // 상대 등 뒤로 순간이동
          f.nextTick = 1;
          this.sparks.push({ x: f.x, y: f.y - 70, t: 0, kind: 'smoke' });
          const behind = o.x - o.facing * 70;
          f.x = Math.max(40, Math.min(W - 40, behind));
          f.y = FLOOR;
          f.vy = 0;
          f.facing = o.x >= f.x ? 1 : -1;
          this.sparks.push({ x: f.x, y: f.y - 70, t: 0, kind: 'smoke' });
        }
        if (activeNow && !f.hitDone) this.tryHit(f, o, 70 + c.reach, -95 * c.scale, Math.round(16 * p), 400, 0.5, true, 32, true);
        break;
    }
    if (f.t >= s.startup + s.active + s.recovery) {
      f.vx *= 0.3;
      this.setAction(f, this.grounded(f) ? 'idle' : 'jump');
    }
  }

  /** 판정: 무기 끝 원과 상대 몸통 상자가 겹치는지 */
  private tryHit(f: Fighter, o: Fighter, reach: number, height: number, damage: number, knock: number, stun: number, big: boolean, r: number, unblockable = false) {
    if (o.action === 'ko') return;
    const hx = f.x + f.facing * reach;
    const hy = f.y + height;
    const half = 18 * o.char.scale;
    const inX = Math.abs(hx - o.x) < half + r;
    const inY = hy > o.y - 150 * o.char.scale - r && hy < o.y + r;
    if (!inX || !inY) return;
    f.hitDone = true;
    this.applyHit(f, o, damage, knock * f.facing, stun, hx, hy, big, unblockable);
  }

  private applyHit(f: Fighter, o: Fighter, damage: number, knock: number, stun: number, x: number, y: number, big: boolean, unblockable = false) {
    if (o.action === 'ko') return;
    const facingAttacker = o.facing === -Math.sign(knock);
    const blocked = !unblockable && o.action === 'block' && facingAttacker;
    const gain = (n: number, who: Fighter) => (who.meter = Math.min(METER_MAX, who.meter + n * who.char.meterGain));
    if (blocked) {
      o.hp -= Math.max(1, Math.round(damage * 0.15));
      o.vx = knock * 0.5;
      gain(damage * 0.8, o);
      gain(damage * 0.4, f);
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('block');
      this.hitstop = 0.04;
    } else if (o.char.armor >= damage && !big && o.action !== 'hit') {
      // 슈퍼아머: 아프긴 하지만 밀리지 않는다
      o.hp -= damage;
      o.vx += knock * 0.15;
      gain(damage * 1.1, o);
      gain(damage * 1.6, f);
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('hit');
      this.hitstop = 0.03;
    } else {
      o.hp -= damage;
      o.vx = knock;
      if (big || !this.grounded(o)) o.vy = -260;
      o.stun = stun;
      this.setAction(o, 'hit');
      gain(damage * 1.1, o);
      gain(damage * 1.6, f);
      this.sparks.push({ x, y, t: 0, kind: big ? 'big' : 'hit' });
      this.events.push(big ? 'bighit' : 'hit');
      this.hitstop = big ? 0.09 : 0.05;
      this.shake = Math.max(this.shake, big ? 9 : 4);
    }
    if (o.hp <= 0) this.knockOut(f, o);
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.life -= dt;
      const o = this.fighters[p.owner === 0 ? 1 : 0];
      const f = this.fighters[p.owner];
      if (p.life <= 0 || o.action === 'ko') continue;
      // 충격파는 공중에 뜬 상대는 못 맞힌다
      if (p.low && !this.grounded(o)) continue;
      const half = 18 * o.char.scale;
      if (Math.abs(p.x - o.x) < half + p.r && p.y > o.y - 150 * o.char.scale - p.r && p.y < o.y + p.r) {
        p.life = 0;
        this.applyHit(f, o, p.damage, p.knock * Math.sign(p.vx), p.stun, p.x, p.y, p.kind !== 'star');
      }
    }
    // 서로 다른 편 투사체가 부딪히면 사라짐 (충격파는 땅을 타서 안 부딪힘)
    for (const p of this.projectiles) {
      if (p.life <= 0 || p.low) continue;
      for (const q of this.projectiles) {
        if (q.owner === p.owner || q.life <= 0 || q.low) continue;
        if (Math.abs(p.x - q.x) < p.r + q.r && Math.abs(p.y - q.y) < p.r + q.r) {
          const stronger = p.kind === 'wave' && q.kind === 'star' ? p : q.kind === 'wave' && p.kind === 'star' ? q : null;
          if (stronger !== p) p.life = 0;
          if (stronger !== q) q.life = 0;
          this.sparks.push({ x: (p.x + q.x) / 2, y: p.y, t: 0, kind: 'big' });
          this.events.push('block');
        }
      }
    }
    this.projectiles = this.projectiles.filter((x) => x.life > 0 && x.x > -60 && x.x < W + 60);
  }

  private knockOut(winner: Fighter, loser: Fighter) {
    if (this.phase !== 'fight') return;
    loser.hp = 0;
    loser.action = 'ko';
    loser.t = 0;
    loser.vx = Math.sign(loser.x - winner.x || 1) * 360;
    loser.vy = -420;
    winner.wins++;
    this.phase = 'ko';
    this.phaseTime = 0;
    this.banner = 'K.O.!';
    this.shake = 14;
    this.events.push('ko');
  }

  private timeUp() {
    const [a, b] = this.fighters;
    this.timer = 0;
    this.phase = 'ko';
    this.phaseTime = 0;
    this.events.push('timeup');
    const ra = a.hp / a.maxHp;
    const rb = b.hp / b.maxHp;
    if (Math.abs(ra - rb) < 1e-9) {
      this.banner = '시간 종료 · 무승부';
      return;
    }
    const w = ra > rb ? a : b;
    w.wins++;
    this.banner = `시간 종료 · ${w.name} 승`;
  }

  private nextRound() {
    const done = this.fighters.find((f) => f.wins >= this.winsNeeded);
    if (done) {
      this.phase = 'over';
      this.winner = done.id;
      done.action = 'win';
      this.banner = `${done.name} 승리!`;
      this.events.push(done.id === 0 ? 'win' : 'lose');
      return;
    }
    this.round++;
    this.startRound();
  }
}

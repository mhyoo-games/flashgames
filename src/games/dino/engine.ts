// 햄스터 다이노 파이트: 1:1 격투 규칙 (그리기와 분리 → 테스트 가능)
import { PLAYABLE, type CharDef, type MoveDef, type Slot } from './chars.ts';
import type { Command } from './input.ts';

export const W = 960;
export const H = 540;
export const FLOOR = 465;
const GRAVITY = 1950;
/** 몸통 판정 (크기 1 기준) */
export const BODY_W = 34;
export const BODY_H = 118;
/** 화면에 맞춘 전체 크기 배율 */
export const SCALE = 1.32;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  /** 커맨드로 완성된 기술 (사람은 CommandReader가, 컴퓨터는 직접 넣는다) */
  cmd?: Command;
}

export const NO_INPUT: Input = { left: false, right: false, up: false, down: false, punch: false, kick: false };

type Normal = 'punch1' | 'punch2' | 'punch3' | 'kick' | 'airpunch' | 'airkick' | 'lowkick';
export type Action = 'idle' | 'walk' | 'back' | 'jump' | 'crouch' | 'block' | Normal | 'move' | 'transform' | 'hit' | 'ko' | 'win';

interface Hit {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
  /** 발 기준 높이 (음수 = 위) */
  height: number;
  knock: number;
  stun: number;
  /** 앉아서 막아야 하는 공격 */
  low?: boolean;
}

export const NORMALS: Record<Normal, Hit> = {
  punch1: { startup: 0.06, active: 0.08, recovery: 0.12, damage: 5, reach: 52, height: -70, knock: 90, stun: 0.24 },
  punch2: { startup: 0.06, active: 0.08, recovery: 0.14, damage: 6, reach: 54, height: -70, knock: 110, stun: 0.26 },
  punch3: { startup: 0.1, active: 0.1, recovery: 0.28, damage: 10, reach: 60, height: -65, knock: 420, stun: 0.45 },
  kick: { startup: 0.12, active: 0.1, recovery: 0.24, damage: 10, reach: 66, height: -40, knock: 300, stun: 0.38 },
  lowkick: { startup: 0.1, active: 0.1, recovery: 0.22, damage: 7, reach: 64, height: -14, knock: 160, stun: 0.32, low: true },
  airpunch: { startup: 0.05, active: 0.22, recovery: 0.08, damage: 7, reach: 50, height: -60, knock: 200, stun: 0.3 },
  airkick: { startup: 0.06, active: 0.28, recovery: 0.08, damage: 9, reach: 58, height: -30, knock: 240, stun: 0.32 },
};

export const GAUGE_MAX = 100;
/** 변신 중 게이지가 줄어드는 속도 (초당) */
const GAUGE_DRAIN = 5.5;
const SUPER_COST = 50;

export interface Fighter {
  id: 0 | 1;
  char: CharDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  /** 변신 게이지 */
  gauge: number;
  beast: boolean;
  action: Action;
  t: number;
  stun: number;
  hitDone: boolean;
  hitCount: number;
  nextTick: number;
  comboWindow: number;
  comboStep: number;
  wins: number;
  /** 지금 쓰는 기술 */
  slot?: Slot;
  /** 연속으로 맞은 수 (콤보 표시) */
  combo: number;
  comboTimer: number;
  /** 받아치기 성공 */
  countered: boolean;
  /** 아래를 누르고 있는지 (앉아 막기) */
  crouching: boolean;
}

export type ShotKind = 'seed' | 'plate' | 'wind' | 'water' | 'wave' | 'shock' | 'meteor';

export interface Projectile {
  owner: 0 | 1;
  kind: ShotKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  knock: number;
  life: number;
  /** 땅을 타고 오는 충격파 (공중이면 안 맞음) */
  ground: boolean;
  /** 남은 타격 수 */
  hits: number;
  delay: number;
}

export interface Spark {
  x: number;
  y: number;
  t: number;
  kind: 'hit' | 'block' | 'big' | 'transform' | 'counter';
}

export type GameEvent = 'hit' | 'bighit' | 'block' | 'swing' | 'jump' | 'special' | 'super' | 'transform' | 'revert' | 'counter' | 'ko' | 'round' | 'fight' | 'timeup' | 'win' | 'lose';
export type Phase = 'intro' | 'fight' | 'ko' | 'over';

export interface FightOptions {
  chars?: [CharDef, CharDef];
  winsNeeded?: number;
  roundTime?: number;
  hpScale?: [number, number];
}

export class DinoFight {
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
  /** 초필살기 연출: 화면이 잠깐 어두워짐 */
  superFlash = 0;
  banner = '';
  /** 화면에 잠깐 뜨는 기술 이름 */
  callout?: { id: 0 | 1; text: string; t: number };
  winner?: 0 | 1;
  private prev: [Input, Input] = [NO_INPUT, NO_INPUT];
  private readonly hpScale: [number, number];

  constructor(opts: FightOptions = {}) {
    const chars = opts.chars ?? [PLAYABLE[0], PLAYABLE[1]];
    this.winsNeeded = opts.winsNeeded ?? 2;
    this.roundTime = opts.roundTime ?? 60;
    this.timer = this.roundTime;
    this.hpScale = opts.hpScale ?? [1, 1];
    this.fighters = [this.make(0, chars[0]), this.make(1, chars[1])];
    this.startRound();
  }

  private make(id: 0 | 1, char: CharDef): Fighter {
    const maxHp = Math.round(char.hp * this.hpScale[id]);
    return { id, char, x: 0, y: FLOOR, vx: 0, vy: 0, facing: id === 0 ? 1 : -1, hp: maxHp, maxHp, gauge: 0, beast: false, action: 'idle', t: 0, stun: 0, hitDone: false, hitCount: 0, nextTick: 0, comboWindow: 0, comboStep: 0, wins: 0, combo: 0, comboTimer: 0, countered: false, crouching: false };
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
      f.beast = false;
      f.gauge = Math.min(f.gauge, 60);
      f.combo = 0;
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

  get over() {
    return this.phase === 'over';
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** 변신하면 강해진다 */
  power(f: Fighter) {
    return f.char.power * (f.beast ? 1.25 : 1);
  }

  size(f: Fighter) {
    return f.char.size * (f.beast ? 1.12 : 1) * SCALE;
  }

  normal(f: Fighter, kind: Normal): Hit {
    const b = NORMALS[kind];
    const tempo = f.char.tempo * (f.beast ? 0.92 : 1);
    return {
      ...b,
      startup: b.startup * tempo,
      recovery: b.recovery * tempo,
      damage: Math.round(b.damage * this.power(f)),
      reach: (b.reach + f.char.reach + (f.beast ? 8 : 0)) * this.size(f),
      height: b.height * this.size(f),
    };
  }

  move(f: Fighter): MoveDef | undefined {
    return f.slot ? f.char.moves[f.slot] : undefined;
  }

  static isAttack(a: Action) {
    return a in NORMALS || a === 'move';
  }

  /** 그리기용: 동작이 몇 % 진행됐는지 */
  progress(f: Fighter): number {
    if (f.action === 'move') {
      const mv = this.move(f)!;
      return Math.min(1, f.t / (mv.startup + mv.active));
    }
    if (!(f.action in NORMALS)) return 0;
    const h = this.normal(f, f.action as Normal);
    return Math.min(1, f.t / (h.startup + h.active));
  }

  step(dt: number, inputs: [Input, Input]) {
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.superFlash = Math.max(0, this.superFlash - dt);
    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < 0.5);
    if (this.callout) {
      this.callout.t += dt;
      if (this.callout.t > 1.2) this.callout = undefined;
    }
    for (const f of this.fighters) {
      f.comboTimer -= dt;
      if (f.comboTimer <= 0) f.combo = 0;
    }

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
    for (const f of this.fighters) {
      if (f.beast && f.action !== 'transform') {
        f.gauge -= GAUGE_DRAIN * dt;
        if (f.gauge <= 0) {
          f.gauge = 0;
          f.beast = false;
          this.events.push('revert');
        }
      }
    }
    this.physics(dt, inputs, true);
    this.prev = [{ ...inputs[0] }, { ...inputs[1] }];
    if (this.timer <= 0) this.timeUp();
  }

  private physics(dt: number, inputs: [Input, Input], control: boolean) {
    const [a, b] = this.fighters;
    for (const f of this.fighters) this.update(f, f === a ? b : a, inputs[f.id], this.prev[f.id], dt, control);
    const dx = b.x - a.x;
    const gap = BODY_W * 1.1 * (this.size(a) + this.size(b));
    if (Math.abs(dx) < gap && Math.abs(a.y - b.y) < 90 && a.action !== 'ko' && b.action !== 'ko') {
      const push = (gap - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= push * s;
      b.x += push * s;
    }
    for (const f of this.fighters) f.x = Math.max(40, Math.min(W - 40, f.x));
    this.updateShots(dt);
  }

  grounded(f: Fighter) {
    return f.y >= FLOOR - 0.5;
  }

  private set(f: Fighter, a: Action) {
    f.action = a;
    f.t = 0;
    f.hitDone = false;
    f.hitCount = 0;
    f.nextTick = 0;
    f.countered = false;
  }

  /** 상대가 나를 향해 공격 중인지 (뒤로 누르면 막기) */
  private threatened(f: Fighter, o: Fighter) {
    if (DinoFight.isAttack(o.action) && Math.abs(o.x - f.x) < 260) return true;
    return this.projectiles.some((p) => p.owner === o.id && Math.sign(f.x - p.x) === Math.sign(p.vx || f.x - p.x) && Math.abs(p.x - f.x) < 220);
  }

  private update(f: Fighter, o: Fighter, inp: Input, prev: Input, dt: number, control: boolean) {
    f.t += dt;
    f.comboWindow -= dt;
    const pressed = (k: 'punch' | 'kick' | 'up') => inp[k] && !prev[k];
    const ground = this.grounded(f);
    const c = f.char;
    const fwd = f.facing > 0 ? inp.right : inp.left;
    const back = f.facing > 0 ? inp.left : inp.right;
    f.crouching = control && ground && inp.down;

    if (f.action === 'ko' || f.action === 'win') {
      // 끝
    } else if (f.action === 'hit') {
      f.stun -= dt;
      if (f.stun <= 0 && ground) this.set(f, 'idle');
    } else if (f.action === 'transform') {
      if (f.t > 0.7) this.set(f, 'idle');
    } else if (f.action === 'move') {
      this.updateMove(f, o, dt);
    } else if (f.action in NORMALS) {
      const kind = f.action as Normal;
      const h = this.normal(f, kind);
      if (f.t >= h.startup && f.t < h.startup + h.active && !f.hitDone) this.tryHit(f, o, h.reach, h.height, h.damage, h.knock, h.stun, kind === 'punch3' || kind === 'kick', 22, false, h.low);
      const done = f.t >= h.startup + h.active + h.recovery || ((kind === 'airkick' || kind === 'airpunch') && ground && f.t > 0.05);
      if (done) {
        if (kind === 'punch1' || kind === 'punch2') {
          f.comboWindow = 0.32;
          f.comboStep = kind === 'punch1' ? 1 : 2;
        } else f.comboStep = 0;
        this.set(f, ground ? 'idle' : 'jump');
      } else if (control && (kind === 'punch1' || kind === 'punch2') && pressed('punch') && !inp.cmd && f.t > h.startup + h.active * 0.5) {
        this.set(f, kind === 'punch1' ? 'punch2' : 'punch3');
        this.events.push('swing');
      }
      // 펀치를 막 누르자마자 킥도 누르면 변신으로 바꿔 준다
      if (control && inp.cmd === 'beast' && f.t < 0.12) this.tryCommand(f, o, 'beast');
    } else if (control) {
      if (ground) f.facing = o.x >= f.x ? 1 : -1;
      if (inp.cmd && this.tryCommand(f, o, inp.cmd)) {
        // 기술 시작
      } else if (pressed('punch')) {
        if (!ground) this.set(f, 'airpunch');
        else this.set(f, f.comboWindow > 0 && f.comboStep === 1 ? 'punch2' : f.comboWindow > 0 && f.comboStep === 2 ? 'punch3' : 'punch1');
        this.events.push('swing');
      } else if (pressed('kick')) {
        this.set(f, !ground ? 'airkick' : inp.down ? 'lowkick' : 'kick');
        this.events.push('swing');
      } else if (ground && back && this.threatened(f, o)) {
        if (f.action !== 'block') this.set(f, 'block');
        f.vx = 0;
      } else if (ground && inp.down) {
        if (f.action !== 'crouch' && f.action !== 'block') this.set(f, 'crouch');
        f.vx = 0;
        if (back && this.threatened(f, o)) this.set(f, 'block');
      } else if (ground && pressed('up')) {
        f.vy = -c.jump * (f.beast && c.dino === 'ptera' ? 1.15 : 1);
        f.vx = (fwd ? 1 : back ? -1 : 0) * f.facing * c.walk * 1.1;
        this.set(f, 'jump');
        this.events.push('jump');
      } else if (ground) {
        const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        const toward = dir === f.facing;
        f.vx = dir * c.walk * (toward ? 1 : 0.7) * (f.beast ? 1.12 : 1);
        const want: Action = dir ? (toward ? 'walk' : 'back') : 'idle';
        if (f.action !== want) this.set(f, want);
      } else if (!ground && inp.cmd) {
        this.tryCommand(f, o, inp.cmd);
      }
    } else if (ground && f.action !== 'idle') {
      this.set(f, 'idle');
    }

    const mv = this.move(f);
    const moving = f.action === 'move' && mv && (mv.type === 'rush' || mv.type === 'dive' || mv.type === 'rising') && f.t >= mv.startup;
    if (ground && !moving && (DinoFight.isAttack(f.action) || f.action === 'block' || f.action === 'crouch' || f.action === 'hit' || f.action === 'ko' || f.action === 'transform' || !control)) {
      f.vx *= Math.pow(0.0005, dt);
    }
    // 프테라는 변신하면 천천히 떨어진다 (활공)
    const glide = f.beast && c.dino === 'ptera' && f.vy > 0 && f.action === 'jump' ? 0.45 : 1;
    if (!(f.action === 'move' && mv?.type === 'rising' && f.t >= mv.startup && f.t < mv.startup + mv.active * 0.6)) f.vy += GRAVITY * dt * glide;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y >= FLOOR) {
      f.y = FLOOR;
      f.vy = 0;
      if (f.action === 'jump') this.set(f, 'idle');
    }
  }

  /** 커맨드 기술 시작. 쓸 수 없으면 false */
  tryCommand(f: Fighter, o: Fighter, cmd: Command): boolean {
    if (cmd === 'beast') {
      if (f.beast || f.gauge < GAUGE_MAX || !this.grounded(f)) return false;
      f.beast = true;
      this.set(f, 'transform');
      f.vx = 0;
      // 변신 충격으로 상대를 밀어낸다
      if (Math.abs(o.x - f.x) < 120) o.vx = Math.sign(o.x - f.x || 1) * 420;
      this.sparks.push({ x: f.x, y: f.y - 60, t: 0, kind: 'transform' });
      this.callout = { id: f.id, text: `${f.char.dinoName} 변신!`, t: 0 };
      this.events.push('transform');
      this.shake = 8;
      return true;
    }
    if (cmd === 'super') {
      if (!f.beast || f.gauge < SUPER_COST) return false;
      f.gauge -= SUPER_COST;
      this.superFlash = 0.6;
      this.hitstop = 0.35;
      this.events.push('super');
    } else this.events.push('special');
    const mv = f.char.moves[cmd];
    // 공중에서는 급강하만
    if (!this.grounded(f) && mv.type !== 'dive') return false;
    f.slot = cmd;
    this.set(f, 'move');
    this.callout = { id: f.id, text: mv.name, t: 0 };
    return true;
  }

  private updateMove(f: Fighter, o: Fighter, dt: number) {
    const mv = this.move(f)!;
    const p = this.power(f);
    const k = this.size(f);
    const dmg = Math.round(mv.damage * p);
    const t = f.t;
    const active = t >= mv.startup && t < mv.startup + mv.active;
    const multi = (every: number) => {
      if (f.hitCount >= mv.hits || t < f.nextTick) return false;
      f.nextTick = t + every;
      return true;
    };
    switch (mv.type) {
      case 'shot': {
        if (t >= mv.startup && !f.hitDone) {
          f.hitDone = true;
          const kind: ShotKind = f.slot === 'super' ? 'wave' : (({ stego: 'plate', ptera: 'wind', spino: 'water' }) as Record<string, ShotKind>)[f.char.dino] ?? 'seed';
          const big = f.slot === 'super';
          this.projectiles.push({ owner: f.id, kind, x: f.x + f.facing * 46 * k, y: f.y - 66 * k, vx: f.facing * mv.speed, vy: 0, r: big ? 42 : 16, damage: dmg, knock: big ? 460 : 260, life: 2.4, ground: false, hits: 1, delay: 0 });
        }
        break;
      }
      case 'rush': {
        if (active) {
          f.vx = f.facing * mv.speed;
          if (multi(mv.active / Math.max(1, mv.hits))) {
            const last = f.hitCount === mv.hits - 1;
            if (this.tryHit(f, o, (44 + f.char.reach * 0.5) * k, -60 * k, dmg, last ? mv.knock : 40, last ? 0.5 : 0.25, last || mv.hits === 1, 34, false, false, true)) f.hitCount++;
            else f.nextTick = t; // 아직 안 닿았으면 다음 프레임에 다시
          }
        }
        break;
      }
      case 'rising': {
        if (t >= mv.startup && f.nextTick === 0 && f.hitCount === 0 && !f.hitDone) {
          f.vy = -620;
          f.vx = f.facing * 160;
          f.nextTick = t;
        }
        if (active && multi(mv.active / Math.max(1, mv.hits))) {
          if (this.tryHit(f, o, (40 + f.char.reach * 0.4) * k, -100 * k, dmg, f.hitCount === mv.hits - 1 ? mv.knock : 60, 0.45, true, 40, false, false, true)) f.hitCount++;
          else f.nextTick = t;
        }
        break;
      }
      case 'spin': {
        if (active && multi(mv.active / mv.hits)) {
          const last = f.hitCount >= mv.hits - 1;
          const reach = 80 + f.char.reach;
          if (Math.abs(o.x - f.x) < reach * k && Math.abs(o.y - f.y) < 110) {
            const dir = Math.sign(o.x - f.x) || f.facing;
            this.applyHit(f, o, dmg, (last ? mv.knock : 70) * dir, last ? 0.45 : 0.22, o.x, o.y - 60, last);
          }
          f.hitCount++;
          this.events.push('swing');
        }
        break;
      }
      case 'slam': {
        if (t >= mv.startup && f.hitCount < mv.hits && t >= f.nextTick) {
          f.hitCount++;
          f.nextTick = t + 0.3;
          this.shake = 12;
          for (const dir of [-1, 1]) {
            this.projectiles.push({ owner: f.id, kind: 'shock', x: f.x + dir * 50, y: FLOOR - 14, vx: dir * mv.speed, vy: 0, r: 20, damage: dmg, knock: 300, life: 1.5, ground: true, hits: 1, delay: 0 });
          }
          if (Math.abs(o.x - f.x) < 90 * k && this.grounded(o)) this.applyHit(f, o, Math.round(dmg * 0.7), 260 * Math.sign(o.x - f.x || 1), 0.45, o.x, FLOOR - 30, true);
        }
        break;
      }
      case 'dive': {
        if (t >= mv.startup && f.nextTick === 0) {
          f.nextTick = t;
          if (this.grounded(f)) f.vy = -520;
          f.vx = f.facing * mv.speed;
        }
        if (t >= mv.startup) {
          if (f.vy < 900) f.vy += 2600 * dt;
          if (multi(0.08)) {
            if (this.tryHit(f, o, 40 * k, -40 * k, dmg, f.hitCount === mv.hits - 1 ? mv.knock : 80, 0.4, true, 36, false, false, true)) f.hitCount++;
            else f.nextTick = t;
          }
          if (this.grounded(f) && t > mv.startup + 0.1) {
            this.set(f, 'idle');
            return;
          }
        }
        break;
      }
      case 'counter':
        // 자세를 잡는 동안 맞으면 받아친다 (applyHit에서 처리)
        if (f.countered && !f.hitDone) {
          f.hitDone = true;
          this.applyHit(f, o, dmg, mv.knock * f.facing, 0.6, o.x, o.y - 70, true, true);
        }
        break;
      case 'meteor': {
        if (t >= mv.startup && f.hitCount < mv.hits && t >= f.nextTick) {
          f.hitCount++;
          f.nextTick = t + 0.25;
          const tx = o.x + (f.hitCount - 1) * 50 * (f.hitCount % 2 ? 1 : -1);
          this.projectiles.push({ owner: f.id, kind: 'meteor', x: tx - 120 * f.facing, y: -40, vx: 120 * f.facing, vy: mv.speed, r: 22, damage: dmg, knock: 320, life: 2, ground: false, hits: 1, delay: 0 });
        }
        break;
      }
    }
    const end = mv.type === 'dive' ? mv.startup + 1.2 : mv.startup + mv.active + mv.recovery;
    if (t >= end || (f.countered && t > mv.startup + 0.4)) {
      f.vx *= 0.3;
      this.set(f, this.grounded(f) ? 'idle' : 'jump');
    }
  }

  /** 맞으면 true */
  private tryHit(f: Fighter, o: Fighter, reach: number, height: number, damage: number, knock: number, stun: number, big: boolean, r: number, unblockable = false, low = false, fromMove = false): boolean {
    if (o.action === 'ko') return false;
    const hx = f.x + f.facing * reach;
    const hy = f.y + height;
    const k = this.size(o);
    const half = (BODY_W / 2) * k;
    const top = o.action === 'crouch' || (o.action === 'block' && o.crouching) ? BODY_H * 0.6 : BODY_H;
    const inX = Math.abs(hx - o.x) < half + r;
    const inY = hy > o.y - top * k - r && hy < o.y + r;
    if (!inX || !inY) return false;
    if (!fromMove) f.hitDone = true;
    this.applyHit(f, o, damage, knock * f.facing, stun, hx, hy, big, unblockable, low);
    return true;
  }

  private applyHit(f: Fighter, o: Fighter, damage: number, knock: number, stun: number, x: number, y: number, big: boolean, unblockable = false, low = false) {
    if (o.action === 'ko') return;
    const gain = (who: Fighter, n: number) => {
      if (!who.beast) who.gauge = Math.min(GAUGE_MAX, who.gauge + n);
    };
    // 받아치기 자세
    const omv = this.move(o);
    if (o.action === 'move' && omv?.type === 'counter' && o.t >= omv.startup && o.t < omv.startup + omv.active && !o.countered && !unblockable) {
      o.countered = true;
      this.sparks.push({ x, y, t: 0, kind: 'counter' });
      this.events.push('counter');
      this.hitstop = 0.15;
      return;
    }
    // 대공기 무적
    if (o.action === 'move' && omv?.invuln && o.t < omv.startup + 0.12) return;
    const facingAttacker = o.facing === -Math.sign(knock || f.facing);
    // 서서 막으면 낮은 공격은 못 막는다 (앉아서 막아야 함)
    const blocked = !unblockable && o.action === 'block' && facingAttacker && !(low && !o.crouching);
    if (blocked) {
      o.hp -= Math.max(1, Math.round(damage * 0.12));
      o.vx = knock * 0.5;
      gain(o, damage * 0.6);
      gain(f, damage * 0.3);
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('block');
      this.hitstop = 0.04;
    } else if (o.action === 'move' && omv?.armor && o.t >= omv.startup && !big) {
      // 돌격 중 슈퍼아머
      o.hp -= damage;
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('hit');
    } else {
      o.hp -= damage;
      o.vx = knock;
      if (big || !this.grounded(o)) o.vy = -280;
      o.stun = stun;
      this.set(o, 'hit');
      gain(o, damage * 1.3);
      gain(f, damage * 1.1);
      f.combo++;
      f.comboTimer = 1;
      this.sparks.push({ x, y, t: 0, kind: big ? 'big' : 'hit' });
      this.events.push(big ? 'bighit' : 'hit');
      this.hitstop = Math.max(this.hitstop, big ? 0.09 : 0.05);
      this.shake = Math.max(this.shake, big ? 9 : 4);
    }
    if (o.hp <= 0) this.knockOut(f, o);
  }

  private updateShots(dt: number) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const o = this.fighters[p.owner === 0 ? 1 : 0];
      const f = this.fighters[p.owner];
      if (p.kind === 'meteor' && p.y >= FLOOR - 10) {
        p.life = 0;
        this.shake = 6;
        this.sparks.push({ x: p.x, y: FLOOR - 10, t: 0, kind: 'big' });
        if (Math.abs(o.x - p.x) < 50 && this.grounded(o)) this.applyHit(f, o, p.damage, p.knock * Math.sign(o.x - p.x || 1), 0.45, o.x, FLOOR - 40, true);
        continue;
      }
      if (p.life <= 0 || o.action === 'ko') continue;
      if (p.ground && !this.grounded(o)) continue;
      const k = this.size(o);
      const top = o.action === 'crouch' ? BODY_H * 0.6 : BODY_H;
      if (Math.abs(p.x - o.x) < (BODY_W / 2) * k + p.r && p.y > o.y - top * k - p.r && p.y < o.y + p.r) {
        p.life = 0;
        this.applyHit(f, o, p.damage, p.knock * (Math.sign(p.vx) || 1), 0.4, p.x, p.y, p.kind === 'wave' || p.kind === 'shock');
      }
    }
    // 서로 부딪히면 사라짐 (큰 파도가 작은 것을 이김)
    for (const p of this.projectiles) {
      if (p.life <= 0 || p.ground || p.kind === 'meteor') continue;
      for (const q of this.projectiles) {
        if (q.owner === p.owner || q.life <= 0 || q.ground || q.kind === 'meteor') continue;
        if (Math.abs(p.x - q.x) < p.r + q.r && Math.abs(p.y - q.y) < p.r + q.r) {
          if (p.r <= q.r) p.life = 0;
          if (q.r <= p.r) q.life = 0;
          this.sparks.push({ x: (p.x + q.x) / 2, y: p.y, t: 0, kind: 'block' });
          this.events.push('block');
        }
      }
    }
    this.projectiles = this.projectiles.filter((x) => x.life > 0 && x.x > -80 && x.x < W + 80);
  }

  private knockOut(winner: Fighter, loser: Fighter) {
    if (this.phase !== 'fight') return;
    loser.hp = 0;
    loser.action = 'ko';
    loser.t = 0;
    loser.vx = Math.sign(loser.x - winner.x || 1) * 380;
    loser.vy = -460;
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
    this.banner = `시간 종료 · ${w.char.name} 승`;
  }

  private nextRound() {
    const done = this.fighters.find((f) => f.wins >= this.winsNeeded);
    if (done) {
      this.phase = 'over';
      this.winner = done.id;
      done.action = 'win';
      this.banner = `${done.char.name} 승리!`;
      this.events.push(done.id === 0 ? 'win' : 'lose');
      return;
    }
    this.round++;
    this.startRound();
  }
}

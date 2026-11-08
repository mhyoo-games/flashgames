// 햄스터 다이노 파이트: 1:1 격투 규칙 (그리기와 분리 → 테스트 가능)
import { PLAYABLE, type CharDef, type MoveDef, type Slot } from './chars.ts';
import type { Button, Command } from './input.ts';

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
  /** 약펀치 · 강펀치 · 약킥 · 강킥 */
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
  /** 기 모으기 (누르고 있기). 게이지가 가득일 때 누르면 변신 */
  charge: boolean;
  /** 커맨드로 완성된 기술 (사람은 CommandReader가, 컴퓨터는 직접 넣는다) */
  cmd?: Command;
}

export const NO_INPUT: Input = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, charge: false };

export type Normal = 'lp' | 'hp' | 'lk' | 'hk' | 'clp' | 'upper' | 'lowkick' | 'sweep' | 'airpunch' | 'airkick';
export type Action = 'idle' | 'walk' | 'back' | 'jump' | 'crouch' | 'block' | 'charge' | Normal | 'move' | 'transform' | 'hit' | 'ko' | 'win';

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
  /** 맞으면 띄운다 */
  big?: boolean;
  /** 연계 순서: 낮은 쪽에서 높은 쪽으로 이어진다 (약펀치 1 → 약킥 2 → 강펀치 3 → 강킥 4) */
  order: number;
}

export const NORMALS: Record<Normal, Hit> = {
  lp: { startup: 0.05, active: 0.07, recovery: 0.11, damage: 4, reach: 50, height: -72, knock: 70, stun: 0.32, order: 1 },
  lk: { startup: 0.07, active: 0.08, recovery: 0.14, damage: 5, reach: 62, height: -44, knock: 90, stun: 0.32, order: 2 },
  hp: { startup: 0.1, active: 0.09, recovery: 0.24, damage: 9, reach: 60, height: -70, knock: 200, stun: 0.42, order: 3 },
  hk: { startup: 0.13, active: 0.1, recovery: 0.3, damage: 11, reach: 74, height: -50, knock: 380, stun: 0.46, order: 4, big: true },
  clp: { startup: 0.05, active: 0.07, recovery: 0.11, damage: 4, reach: 50, height: -40, knock: 60, stun: 0.3, order: 1 },
  lowkick: { startup: 0.07, active: 0.08, recovery: 0.15, damage: 5, reach: 64, height: -12, knock: 80, stun: 0.3, low: true, order: 2 },
  upper: { startup: 0.09, active: 0.12, recovery: 0.28, damage: 9, reach: 46, height: -108, knock: 160, stun: 0.45, order: 3, big: true },
  sweep: { startup: 0.12, active: 0.1, recovery: 0.32, damage: 10, reach: 76, height: -12, knock: 260, stun: 0.5, low: true, order: 4, big: true },
  airpunch: { startup: 0.05, active: 0.22, recovery: 0.08, damage: 7, reach: 50, height: -60, knock: 200, stun: 0.34, order: 9 },
  airkick: { startup: 0.07, active: 0.28, recovery: 0.08, damage: 9, reach: 58, height: -30, knock: 240, stun: 0.36, order: 9 },
};

/** 버튼과 자세로 고르는 기본기 */
export function normalFor(btn: Button, ground: boolean, down: boolean): Normal {
  if (!ground) return btn === 'lp' || btn === 'hp' ? 'airpunch' : 'airkick';
  if (down) return ({ lp: 'clp', hp: 'upper', lk: 'lowkick', hk: 'sweep' } as const)[btn];
  return btn;
}

export const GAUGE_MAX = 100;
/** 변신 중 게이지가 줄어드는 속도 (초당) */
const GAUGE_DRAIN = 5.5;
export const SUPER_COST = 50;
/** 기 모으기: 초당 차는 양 */
export const CHARGE_RATE = 24;
/** 때리고 맞을 때 차는 양 (피해 1당) — 때린 쪽이 더 많이 찬다 */
export const GAIN = { hitter: 0.5, hurt: 0.25, blocker: 0.12, blocked: 0.2 };
/** 변신 동작 시간과 터지는 순간 */
export const TRANSFORM_TIME = 1.0;
export const TRANSFORM_BURST = 0.55;
/** 한 번 이어 치기에서 약공격은 3번까지 */
const LIGHT_CHAIN = 3;

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
  /** 이어 치기에서 약공격을 쓴 수 */
  chain: number;
  /** 미리 누른 버튼·커맨드 (경직 중에 눌러도 놓치지 않게) */
  buf?: Button;
  bufT: number;
  bufCmd?: Command;
  bufCmdT: number;
  bufCharge: number;
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

export type GameEvent = 'charge' | 'full' | 'burst' | 'hit' | 'bighit' | 'block' | 'swing' | 'jump' | 'special' | 'super' | 'transform' | 'revert' | 'counter' | 'ko' | 'round' | 'fight' | 'timeup' | 'win' | 'lose';
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
  /** 버튼을 누른 순간을 알기 위한 지난 입력 (경직 중에도 갱신) */
  private prevRaw: [Input, Input] = [NO_INPUT, NO_INPUT];
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
    return { id, char, x: 0, y: FLOOR, vx: 0, vy: 0, facing: id === 0 ? 1 : -1, hp: maxHp, maxHp, gauge: 0, beast: false, action: 'idle', t: 0, stun: 0, hitDone: false, hitCount: 0, nextTick: 0, comboWindow: 0, comboStep: 0, wins: 0, combo: 0, comboTimer: 0, countered: false, crouching: false, chain: 0, bufT: 0, bufCmdT: 0, bufCharge: 0 };
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
      f.gauge = Math.min(f.gauge, 50);
      f.bufT = f.bufCmdT = f.bufCharge = 0;
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

  /** 맞히거나 막혀서 다음 공격으로 끊을 수 있는 때인지 (그리기·AI용) */
  canChain(f: Fighter) {
    return f.action in NORMALS && f.hitDone && f.action !== 'airpunch' && f.action !== 'airkick';
  }

  /** 그리기용: 동작이 몇 % 진행됐는지 */
  progress(f: Fighter): number {
    if (f.action === 'move') {
      const mv = this.move(f)!;
      return Math.min(1, f.t / (mv.startup + mv.active));
    }
    if (f.action === 'transform') return Math.min(1, f.t / TRANSFORM_TIME);
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
    this.bufferInputs(inputs);
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

  /** 누른 순간을 기억해 둔다 (멈춤 중에 눌러도 다음 동작으로 이어지게) */
  private bufferInputs(inputs: [Input, Input]) {
    for (const f of this.fighters) {
      const i = inputs[f.id];
      const p = this.prevRaw[f.id];
      // 같은 프레임에 여러 개면 센 공격을 고른다
      for (const b of ['lp', 'lk', 'hp', 'hk'] as Button[]) {
        if (i[b] && !p[b]) {
          f.buf = b;
          f.bufT = 0.15;
        }
      }
      if (i.cmd) {
        f.bufCmd = i.cmd;
        f.bufCmdT = 0.2;
      }
      if (i.charge && !p.charge) f.bufCharge = 0.15;
    }
    this.prevRaw = [{ ...inputs[0] }, { ...inputs[1] }];
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
    f.bufT -= dt;
    f.bufCmdT -= dt;
    f.bufCharge -= dt;
    const ground = this.grounded(f);
    const c = f.char;
    const fwd = f.facing > 0 ? inp.right : inp.left;
    const back = f.facing > 0 ? inp.left : inp.right;
    f.crouching = control && ground && inp.down;
    const btn = control && f.bufT > 0 ? f.buf : undefined;
    const cmd = control && f.bufCmdT > 0 ? f.bufCmd : undefined;
    const useBtn = () => (f.bufT = 0);
    const useCmd = () => (f.bufCmdT = 0);
    const wantBeast = control && (f.bufCharge > 0 || cmd === 'beast') && f.gauge >= GAUGE_MAX && !f.beast;

    if (f.action === 'ko' || f.action === 'win') {
      // 끝
    } else if (f.action === 'hit') {
      f.stun -= dt;
      if (f.stun <= 0 && ground) this.set(f, 'idle');
    } else if (f.action === 'transform') {
      if (f.t >= TRANSFORM_BURST && !f.hitDone) this.burst(f, o);
      if (f.t > TRANSFORM_TIME) this.set(f, 'idle');
    } else if (f.action === 'move') {
      // 연계 중 초필살기로 이어 쓰기
      if (cmd === 'super' && f.slot !== 'super' && f.hitCount > 0 && this.tryCommand(f, 'super')) useCmd();
      else this.updateMove(f, o, dt);
    } else if (f.action in NORMALS) {
      const kind = f.action as Normal;
      const h = this.normal(f, kind);
      if (f.t >= h.startup && f.t < h.startup + h.active && !f.hitDone) this.tryHit(f, o, h.reach, h.height, h.damage, h.knock, h.stun, !!h.big, 22, false, h.low);
      const air = kind === 'airkick' || kind === 'airpunch';
      // 맞히거나 막히면 다음 공격·기술로 끊고 이어 칠 수 있다
      if (f.hitDone && !air && control) {
        if (cmd && cmd !== 'beast' && this.tryCommand(f, cmd)) {
          useCmd();
          useBtn();
          return this.integrate(f, dt);
        }
        if (btn) {
          const next = normalFor(btn, true, inp.down);
          const no = NORMALS[next].order;
          const light = no <= 2;
          if ((no > h.order || (light && no === h.order && f.chain < LIGHT_CHAIN)) && (!light || f.chain < LIGHT_CHAIN)) {
            useBtn();
            if (light) f.chain++;
            this.set(f, next);
            this.events.push('swing');
            return this.integrate(f, dt);
          }
        }
      }
      if (f.t >= h.startup + h.active + h.recovery || (air && ground && f.t > 0.05)) this.set(f, ground ? 'idle' : 'jump');
    } else if (control) {
      if (ground) f.facing = o.x >= f.x ? 1 : -1;
      if (f.action !== 'charge') f.chain = 0;
      if (wantBeast && ground) {
        f.bufCharge = 0;
        useCmd();
        this.tryCommand(f, 'beast');
      } else if (cmd && cmd !== 'beast' && this.tryCommand(f, cmd)) {
        useCmd();
        useBtn();
      } else if (btn) {
        useBtn();
        const n = normalFor(btn, ground, inp.down);
        f.chain = NORMALS[n].order <= 2 ? 1 : 0;
        this.set(f, n);
        this.events.push('swing');
      } else if (ground && inp.charge && !f.beast && f.gauge < GAUGE_MAX) {
        // 기 모으기: 그 자리에 서서 게이지를 채운다 (그동안 무방비)
        if (f.action !== 'charge') {
          this.set(f, 'charge');
          this.events.push('charge');
        }
        f.vx = 0;
        f.gauge = Math.min(GAUGE_MAX, f.gauge + CHARGE_RATE * dt);
        if (f.gauge >= GAUGE_MAX) this.events.push('full');
      } else if (ground && back && this.threatened(f, o)) {
        if (f.action !== 'block') this.set(f, 'block');
        f.vx = 0;
      } else if (ground && inp.down) {
        if (f.action !== 'crouch' && f.action !== 'block') this.set(f, 'crouch');
        f.vx = 0;
        if (back && this.threatened(f, o)) this.set(f, 'block');
      } else if (ground && inp.up && !prev.up) {
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
      }
    } else if (ground && f.action !== 'idle') {
      this.set(f, 'idle');
    }
    this.integrate(f, dt);
  }

  /** 변신이 터지는 순간: 가까운 상대를 밀어낸다 */
  private burst(f: Fighter, o: Fighter) {
    f.hitDone = true;
    if (Math.abs(o.x - f.x) < 170 && o.action !== 'ko') {
      o.vx = Math.sign(o.x - f.x || 1) * 520;
      if (o.action !== 'transform') {
        o.stun = 0.3;
        this.set(o, 'hit');
      }
    }
    this.sparks.push({ x: f.x, y: f.y - 70, t: 0, kind: 'transform' });
    this.events.push('burst');
    this.shake = 12;
  }

  private integrate(f: Fighter, dt: number) {
    const c = f.char;
    const ground = this.grounded(f);
    const mv = this.move(f);
    const moving = f.action === 'move' && mv && (mv.type === 'rush' || mv.type === 'dive' || mv.type === 'rising') && f.t >= mv.startup;
    if (ground && !moving && (DinoFight.isAttack(f.action) || f.action === 'block' || f.action === 'crouch' || f.action === 'charge' || f.action === 'hit' || f.action === 'ko' || f.action === 'transform' || f.action === 'idle')) {
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
  tryCommand(f: Fighter, cmd: Command): boolean {
    if (cmd === 'beast') {
      if (f.beast || f.gauge < GAUGE_MAX || !this.grounded(f)) return false;
      f.beast = true;
      this.set(f, 'transform');
      f.vx = 0;
      this.callout = { id: f.id, text: `${f.char.dinoName} 변신!`, t: 0 };
      this.events.push('transform');
      this.superFlash = 0.35;
      return true;
    }
    const mv0 = f.char.moves[cmd];
    if (!this.grounded(f) && mv0.type !== 'dive') return false;
    if (cmd === 'super') {
      if (!f.beast || f.gauge < SUPER_COST) return false;
      f.gauge -= SUPER_COST;
      this.superFlash = 0.6;
      this.hitstop = 0.35;
      this.events.push('super');
    } else this.events.push('special');
    const mv = mv0;
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
      if (who.beast || who.gauge >= GAUGE_MAX) return;
      who.gauge = Math.min(GAUGE_MAX, who.gauge + n);
      if (who.gauge >= GAUGE_MAX) this.events.push('full');
    };
    // 변신하는 동안은 무적
    if (o.action === 'transform') return;
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
      gain(o, damage * GAIN.blocker);
      gain(f, damage * GAIN.blocked);
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('block');
      this.hitstop = 0.04;
    } else if (o.action === 'move' && omv?.armor && o.t >= omv.startup && !big) {
      // 돌격 중 슈퍼아머
      o.hp -= damage;
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('hit');
    } else {
      // 이어 맞을수록 피해가 줄어든다 · 기 모으는 중에 맞으면 더 아프다
      const inCombo = o.action === 'hit';
      if (!inCombo) f.combo = 0;
      const scaled = Math.max(1, Math.round(damage * (inCombo ? Math.max(0.5, 1 - 0.1 * f.combo) : o.action === 'charge' ? 1.2 : 1)));
      o.hp -= scaled;
      o.vx = knock;
      if (big || !this.grounded(o)) o.vy = -280;
      o.stun = stun;
      this.set(o, 'hit');
      gain(o, scaled * GAIN.hurt);
      gain(f, scaled * GAIN.hitter);
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

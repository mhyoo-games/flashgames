// 막대 결투: 2인 격투 게임 규칙 (그리기와 분리 → 테스트 가능)

export const W = 960;
export const H = 540;
export const FLOOR = 470;
const GRAVITY = 1900;
const WALK = 240;
const JUMP = 680;
export const ROUND_TIME = 60;
export const WINS_NEEDED = 2;

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

export type AttackKind = 'punch1' | 'punch2' | 'punch3' | 'kick' | 'airkick' | 'special';
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

export const ATTACKS: Record<AttackKind, AttackDef> = {
  punch1: { startup: 0.06, active: 0.08, recovery: 0.13, damage: 5, reach: 62, height: -100, knock: 90, stun: 0.24 },
  punch2: { startup: 0.06, active: 0.08, recovery: 0.15, damage: 6, reach: 64, height: -100, knock: 110, stun: 0.26 },
  punch3: { startup: 0.1, active: 0.1, recovery: 0.3, damage: 10, reach: 70, height: -95, knock: 420, stun: 0.45 },
  kick: { startup: 0.13, active: 0.1, recovery: 0.26, damage: 11, reach: 80, height: -62, knock: 300, stun: 0.38 },
  airkick: { startup: 0.05, active: 0.3, recovery: 0.08, damage: 9, reach: 64, height: -55, knock: 240, stun: 0.32 },
  special: { startup: 0.28, active: 0.05, recovery: 0.35, damage: 18, reach: 0, height: -100, knock: 360, stun: 0.5 },
};

export const METER_MAX = 100;

export interface Fighter {
  id: 0 | 1;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  meter: number;
  action: Action;
  /** 지금 동작을 한 지 지난 시간 */
  t: number;
  stun: number;
  /** 이번 공격이 이미 맞혔는지 */
  hitDone: boolean;
  /** 다음 펀치를 이어 칠 수 있는 남은 시간 */
  comboWindow: number;
  comboStep: number;
  wins: number;
  /** 이번 판에서 낸 피해 (기록용) */
  dealt: number;
}

export interface Projectile {
  owner: 0 | 1;
  x: number;
  y: number;
  vx: number;
  life: number;
}

export interface Spark {
  x: number;
  y: number;
  t: number;
  kind: 'hit' | 'block' | 'big';
}

export type GameEvent = 'hit' | 'bighit' | 'block' | 'swing' | 'jump' | 'special' | 'ko' | 'round' | 'fight' | 'timeup' | 'win' | 'lose';

export type Phase = 'intro' | 'fight' | 'ko' | 'over';

export class StickFight {
  fighters: [Fighter, Fighter];
  projectiles: Projectile[] = [];
  sparks: Spark[] = [];
  events: GameEvent[] = [];
  phase: Phase = 'intro';
  phaseTime = 0;
  round = 1;
  timer = ROUND_TIME;
  hitstop = 0;
  shake = 0;
  /** 이번 판 결과 메시지 */
  banner = '';
  /** 시합 승자 (0, 1) */
  winner?: 0 | 1;
  private prev: [Input, Input] = [NO_INPUT, NO_INPUT];

  constructor(names: [string, string] = ['플레이어', '컴퓨터']) {
    this.fighters = [this.makeFighter(0, names[0]), this.makeFighter(1, names[1])];
    this.startRound();
  }

  private makeFighter(id: 0 | 1, name: string): Fighter {
    return { id, name, x: 0, y: FLOOR, vx: 0, vy: 0, facing: id === 0 ? 1 : -1, hp: 100, meter: 0, action: 'idle', t: 0, stun: 0, hitDone: false, comboWindow: 0, comboStep: 0, wins: 0, dealt: 0 };
  }

  private startRound() {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      f.hp = 100;
      f.y = FLOOR;
      f.vx = f.vy = 0;
      f.action = 'idle';
      f.t = 0;
      f.stun = 0;
      f.comboStep = 0;
      f.dealt = 0;
      f.meter = Math.min(f.meter, 50);
    }
    a.x = W * 0.3;
    b.x = W * 0.7;
    a.facing = 1;
    b.facing = -1;
    this.projectiles = [];
    this.timer = ROUND_TIME;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.banner = `${this.round}라운드`;
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

  step(dt: number, inputs: [Input, Input]): void {
    dt = Math.min(dt, 0.05);
    this.phaseTime += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < 0.35);

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
      // 쓰러지는 장면은 느리게
      this.physics(dt * (this.phaseTime < 1 ? 0.35 : 1), [NO_INPUT, NO_INPUT], false);
      if (this.phaseTime > 3) this.nextRound();
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    this.timer -= dt;
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
    // 서로 겹치지 않게 밀기
    const dx = b.x - a.x;
    const minGap = 44;
    if (Math.abs(dx) < minGap && Math.abs(a.y - b.y) < 100) {
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
  }

  private isAttack(a: Action): a is AttackKind {
    return a in ATTACKS;
  }

  private updateFighter(f: Fighter, o: Fighter, inp: Input, prev: Input, dt: number, control: boolean) {
    f.t += dt;
    f.comboWindow -= dt;
    const pressed = (k: keyof Input) => inp[k] && !prev[k];
    const ground = this.grounded(f);

    // 동작별 진행
    if (f.action === 'ko' || f.action === 'win') {
      // 아무것도 못 함
    } else if (f.action === 'hit') {
      f.stun -= dt;
      if (f.stun <= 0 && ground) this.setAction(f, 'idle');
    } else if (this.isAttack(f.action)) {
      const def = ATTACKS[f.action];
      if (f.action === 'special' && f.t >= def.startup && !f.hitDone) {
        f.hitDone = true;
        this.projectiles.push({ owner: f.id, x: f.x + f.facing * 40, y: f.y - 100, vx: f.facing * 560, life: 2.5 });
      } else if (f.t >= def.startup && f.t < def.startup + def.active && !f.hitDone) {
        this.tryHit(f, o, def);
      }
      // 공중 발차기는 땅에 닿으면 끝
      const done = f.t >= def.startup + def.active + def.recovery || (f.action === 'airkick' && ground && f.t > 0.05);
      if (done) {
        if (f.action === 'punch1' || f.action === 'punch2') {
          f.comboWindow = 0.32;
          f.comboStep = f.action === 'punch1' ? 1 : 2;
        } else f.comboStep = 0;
        this.setAction(f, ground ? 'idle' : 'jump');
      }
      // 펀치 도중 다음 펀치를 누르면 이어서
      if (control && (f.action === 'punch1' || f.action === 'punch2') && pressed('punch') && f.t > def.startup + def.active * 0.5) {
        this.setAction(f, f.action === 'punch1' ? 'punch2' : 'punch3');
        this.events.push('swing');
      }
    } else if (control) {
      // 자유롭게 움직일 수 있는 상태
      if (ground) f.facing = o.x >= f.x ? 1 : -1;
      if (pressed('special') && f.meter >= METER_MAX && ground) {
        f.meter = 0;
        this.setAction(f, 'special');
        this.events.push('special');
      } else if (pressed('punch')) {
        if (!ground) this.setAction(f, 'airkick');
        else this.setAction(f, f.comboWindow > 0 && f.comboStep === 1 ? 'punch2' : f.comboWindow > 0 && f.comboStep === 2 ? 'punch3' : 'punch1');
        this.events.push('swing');
      } else if (pressed('kick')) {
        this.setAction(f, ground ? 'kick' : 'airkick');
        this.events.push('swing');
      } else if (ground && inp.down) {
        if (f.action !== 'block') this.setAction(f, 'block');
        f.vx = 0;
      } else if (ground && pressed('up')) {
        f.vy = -JUMP;
        f.vx = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * WALK * 1.1;
        this.setAction(f, 'jump');
        this.events.push('jump');
      } else if (ground) {
        const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        f.vx = dir * WALK * (dir === f.facing ? 1 : 0.75);
        const want: Action = dir ? 'walk' : 'idle';
        if (f.action !== want) this.setAction(f, want);
      }
    } else if (ground && f.action !== 'idle' && f.action !== 'block') {
      this.setAction(f, 'idle');
    }

    // 땅에서 공격·막기 중엔 미끄러짐만
    if (ground && (this.isAttack(f.action) || f.action === 'block' || f.action === 'hit' || f.action === 'ko' || !control)) {
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

  /** 공격 판정: 주먹·발 끝 원과 상대 몸통 상자가 겹치는지 */
  private tryHit(f: Fighter, o: Fighter, def: AttackDef) {
    if (o.action === 'ko') return;
    const hx = f.x + f.facing * def.reach;
    const hy = f.y + def.height;
    const r = 22;
    const inX = Math.abs(hx - o.x) < 18 + r;
    const inY = hy > o.y - 150 - r && hy < o.y + r;
    if (!inX || !inY) return;
    f.hitDone = true;
    this.applyHit(f, o, def.damage, def.knock * f.facing, def.stun, hx, hy, f.action === 'punch3' || f.action === 'kick');
  }

  private applyHit(f: Fighter, o: Fighter, damage: number, knock: number, stun: number, x: number, y: number, big: boolean) {
    const facingAttacker = o.facing === -Math.sign(knock);
    const blocked = o.action === 'block' && facingAttacker;
    if (blocked) {
      o.hp -= Math.max(1, Math.round(damage * 0.15));
      o.vx = knock * 0.5;
      o.meter = Math.min(METER_MAX, o.meter + damage * 0.8);
      f.meter = Math.min(METER_MAX, f.meter + damage * 0.4);
      this.sparks.push({ x, y, t: 0, kind: 'block' });
      this.events.push('block');
      this.hitstop = 0.04;
    } else {
      o.hp -= damage;
      f.dealt += damage;
      o.vx = knock;
      if (big || !this.grounded(o)) o.vy = -260;
      o.stun = stun;
      this.setAction(o, 'hit');
      o.meter = Math.min(METER_MAX, o.meter + damage * 1.1);
      f.meter = Math.min(METER_MAX, f.meter + damage * 1.6);
      this.sparks.push({ x, y, t: 0, kind: big ? 'big' : 'hit' });
      this.events.push(big ? 'bighit' : 'hit');
      this.hitstop = big ? 0.09 : 0.05;
      this.shake = big ? 9 : 4;
    }
    if (o.hp <= 0) this.knockOut(f, o);
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.life -= dt;
      const o = this.fighters[p.owner === 0 ? 1 : 0];
      const f = this.fighters[p.owner];
      if (p.life > 0 && o.action !== 'ko' && Math.abs(p.x - o.x) < 34 && p.y > o.y - 150 && p.y < o.y + 10) {
        p.life = 0;
        const def = ATTACKS.special;
        this.applyHit(f, o, def.damage, def.knock * Math.sign(p.vx), def.stun, p.x, p.y, true);
      }
    }
    // 기공파끼리 부딪히면 둘 다 사라짐
    const [p, q] = [this.projectiles.find((x) => x.owner === 0 && x.life > 0), this.projectiles.find((x) => x.owner === 1 && x.life > 0)];
    if (p && q && Math.abs(p.x - q.x) < 30) {
      p.life = q.life = 0;
      this.sparks.push({ x: (p.x + q.x) / 2, y: p.y, t: 0, kind: 'big' });
      this.events.push('block');
    }
    this.projectiles = this.projectiles.filter((x) => x.life > 0 && x.x > -40 && x.x < W + 40);
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
    if (a.hp === b.hp) {
      this.banner = '시간 종료 · 무승부';
      return;
    }
    const w = a.hp > b.hp ? a : b;
    w.wins++;
    this.banner = `시간 종료 · ${w.name} 승`;
  }

  private nextRound() {
    const done = this.fighters.find((f) => f.wins >= WINS_NEEDED);
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

  /** 공격 동작이 지금 몇 % 진행됐는지 (그리기용) */
  static progress(f: Fighter): number {
    if (!(f.action in ATTACKS)) return 0;
    const d = ATTACKS[f.action as AttackKind];
    return Math.min(1, f.t / (d.startup + d.active));
  }
}

// 컴퓨터 상대: 거리·상대 동작·게이지를 보고 기술을 고른다 (커맨드는 직접 넣는다)
import type { Rng } from '../../core/rng.ts';
import type { Slot } from './chars.ts';
import { DinoFight, GAUGE_MAX, NO_INPUT, type Input } from './engine.ts';

export type Level = 'easy' | 'normal' | 'hard' | 'master';

export const LEVELS: Record<Level, { name: string; think: number; block: number; aggression: number; combo: number; special: number }> = {
  easy: { name: '쉬움', think: 0.45, block: 0.15, aggression: 0.45, combo: 0.2, special: 0.15 },
  normal: { name: '보통', think: 0.26, block: 0.45, aggression: 0.62, combo: 0.55, special: 0.3 },
  hard: { name: '어려움', think: 0.15, block: 0.7, aggression: 0.75, combo: 0.85, special: 0.45 },
  master: { name: '최강', think: 0.1, block: 0.8, aggression: 0.82, combo: 0.95, special: 0.55 },
};

export class DinoAI {
  private wait = 0;
  private hold: Input = { ...NO_INPUT };
  private tap: Partial<Input> = {};
  private readonly id: 0 | 1;
  private readonly level: Level;
  private readonly rng: Rng;

  constructor(id: 0 | 1, level: Level, rng: Rng) {
    this.id = id;
    this.level = level;
    this.rng = rng;
  }

  input(g: DinoFight, dt: number): Input {
    const me = g.fighters[this.id];
    const op = g.fighters[this.id === 0 ? 1 : 0];
    const L = LEVELS[this.level];
    const out: Input = { ...this.hold, ...this.tap };
    this.tap = {};
    this.wait -= dt;
    if (g.phase !== 'fight') return { ...NO_INPUT };
    if ((me.action === 'punch1' || me.action === 'punch2') && this.rng() < L.combo * dt * 12) out.punch = true;
    if (this.wait > 0) return out;
    this.wait = L.think * (0.6 + this.rng() * 0.8);
    this.hold = { ...NO_INPUT };

    const dx = op.x - me.x;
    const dist = Math.abs(dx);
    const toward: Partial<Input> = dx > 0 ? { right: true } : { left: true };
    const away: Partial<Input> = dx > 0 ? { left: true } : { right: true };
    const c = me.char;
    const range = 80 + c.reach;
    const go = (p: Partial<Input>) => {
      Object.assign(this.tap, p);
      return { ...this.hold, ...this.tap };
    };
    const use = (slot: Slot) => go({ cmd: slot });

    // 변신할 수 있으면 변신
    if (!me.beast && me.gauge >= GAUGE_MAX && dist > 120 && this.rng() < 0.8) return go({ cmd: 'beast' });
    // 초필살기
    if (me.beast && me.gauge >= 50 && this.rng() < L.special * 1.4) {
      const sup = c.moves.super;
      const ok = sup.type === 'shot' || sup.type === 'meteor' ? dist > 200 : sup.type === 'slam' ? dist < 400 : dist < 300;
      if (ok) return use('super');
    }

    const incoming = g.projectiles.find((p) => p.owner !== this.id && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 280);
    if (incoming) {
      if (incoming.ground) {
        if (Math.abs(me.x - incoming.x) < 200 && this.rng() < L.block + 0.1) return go({ up: true });
      } else if (this.rng() < L.block) {
        Object.assign(this.hold, away);
        return { ...this.hold };
      } else if (this.rng() < 0.4) return go({ up: true, ...toward });
    }
    // 뛰어드는 상대는 대공기로
    if (!g.grounded(op) && dist < 150 && op.vy > -200 && this.rng() < L.special + 0.2) return use('move2');
    if (DinoFight.isAttack(op.action) && dist < 140 && this.rng() < L.block) {
      Object.assign(this.hold, away);
      if (op.action === 'lowkick') this.hold.down = true;
      // 받아치기가 있는 캐릭터는 받아친다
      if (c.moves.move3.type === 'counter' && this.rng() < L.special) return use('move3');
      return { ...this.hold };
    }
    // 기술
    if (this.rng() < L.special) {
      const options: Slot[] = [];
      for (const s of ['move1', 'move3'] as Slot[]) {
        const t = c.moves[s].type;
        if ((t === 'shot' || t === 'meteor') && dist > 220) options.push(s);
        if ((t === 'rush' || t === 'dive') && dist > 100 && dist < 380) options.push(s);
        if ((t === 'spin' || t === 'slam') && dist < range + 40) options.push(s);
      }
      if (options.length) return use(options[Math.floor(this.rng() * options.length)]);
    }
    if (dist > range) {
      if (this.rng() < L.aggression) {
        Object.assign(this.hold, toward);
        if (dist < 260 && this.rng() < 0.15) return go({ up: true });
      } else if (this.rng() < 0.3) Object.assign(this.hold, away);
      return { ...this.hold, ...this.tap };
    }
    const r = this.rng();
    if (r < L.aggression * 0.55) return go({ punch: true });
    if (r < L.aggression * 0.8) return go({ kick: true, down: this.rng() < 0.3 });
    if (r < L.aggression + 0.1) Object.assign(this.hold, away);
    else Object.assign(this.hold, away, { down: true });
    return { ...this.hold, ...this.tap };
  }
}

// 컴퓨터 상대: 거리와 상대 동작을 보고 버튼을 누른다 (난이도별 반응 속도·실수)
import type { Rng } from '../../core/rng.ts';
import { ATTACKS, METER_MAX, NO_INPUT, type Input, type StickFight } from './engine.ts';

export type Level = 'easy' | 'normal' | 'hard';

export const LEVELS: Record<Level, { name: string; think: number; block: number; aggression: number; combo: number }> = {
  easy: { name: '쉬움', think: 0.42, block: 0.15, aggression: 0.45, combo: 0.2 },
  normal: { name: '보통', think: 0.24, block: 0.45, aggression: 0.65, combo: 0.55 },
  hard: { name: '어려움', think: 0.12, block: 0.75, aggression: 0.8, combo: 0.9 },
};

export class StickAI {
  private wait = 0;
  private hold: Input = { ...NO_INPUT };
  private tap: Partial<Input> = {};
  /** 뛰어오른 뒤 발차기까지 남은 시간 */
  private airKick = 0;
  private readonly id: 0 | 1;
  private readonly level: Level;
  private readonly rng: Rng;

  constructor(id: 0 | 1, level: Level, rng: Rng) {
    this.id = id;
    this.level = level;
    this.rng = rng;
  }

  input(game: StickFight, dt: number): Input {
    const me = game.fighters[this.id];
    const op = game.fighters[this.id === 0 ? 1 : 0];
    const L = LEVELS[this.level];
    const out: Input = { ...this.hold, ...this.tap };
    this.tap = {};
    this.wait -= dt;
    if (game.phase !== 'fight') return { ...NO_INPUT };
    if (this.airKick > 0) {
      this.airKick -= dt;
      if (this.airKick <= 0) out.kick = true;
    }

    // 콤보 이어 치기 (생각할 시간 없이)
    if ((me.action === 'punch1' || me.action === 'punch2') && this.rng() < L.combo * dt * 12) out.punch = true;

    if (this.wait > 0) return out;
    this.wait = L.think * (0.6 + this.rng() * 0.8);
    this.hold = { ...NO_INPUT };

    const dx = op.x - me.x;
    const dist = Math.abs(dx);
    const toward: Partial<Input> = dx > 0 ? { right: true } : { left: true };
    const away: Partial<Input> = dx > 0 ? { left: true } : { right: true };
    const opAttacking = op.action in ATTACKS && op.action !== 'special';
    const incoming = game.projectiles.find((p) => p.owner !== this.id && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 320);

    if (incoming) {
      if (this.rng() < L.block) this.hold.down = true;
      else if (this.rng() < 0.5) this.tap.up = true;
      return { ...this.hold, ...this.tap };
    }
    if (opAttacking && dist < 120 && this.rng() < L.block) {
      this.hold.down = true;
      return { ...this.hold };
    }
    if (me.meter >= METER_MAX && dist > 260 && this.rng() < 0.7) {
      this.tap.special = true;
      return { ...this.hold, ...this.tap };
    }
    if (dist > 95) {
      if (this.rng() < L.aggression) {
        Object.assign(this.hold, toward);
        // 가끔 뛰어들며 발차기
        if (dist < 260 && this.rng() < 0.18) {
          this.tap.up = true;
          this.airKick = 0.2;
        }
      } else if (this.rng() < 0.3) Object.assign(this.hold, away);
      return { ...this.hold, ...this.tap };
    }
    // 가까움: 때리거나 물러나기
    const r = this.rng();
    if (r < L.aggression * 0.6) this.tap.punch = true;
    else if (r < L.aggression) this.tap.kick = true;
    else if (r < L.aggression + 0.15) Object.assign(this.hold, away);
    else this.hold.down = true;
    return { ...this.hold, ...this.tap };
  }
}

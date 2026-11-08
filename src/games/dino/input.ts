// 커맨드 입력 읽기: 방향 입력 기록을 보고 ↓↘→ + 펀치 같은 기술을 알아낸다.
// 방향은 숫자패드 표기 (바라보는 쪽 기준): 7 8 9 / 4 5 6 / 1 2 3, 6 = 앞, 4 = 뒤, 2 = 아래
import type { Slot } from './chars.ts';

export interface RawInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
}

export type Command = Slot | 'beast';

const WINDOW = 0.55;
const SUPER_WINDOW = 1.0;
/** 펀치·킥 동시 누르기로 보는 시간차 */
const CHORD = 0.07;

export function numpad(r: RawInput, facing: 1 | -1): number {
  const fwd = facing > 0 ? r.right : r.left;
  const back = facing > 0 ? r.left : r.right;
  const h = fwd && !back ? 1 : back && !fwd ? -1 : 0;
  const v = r.up && !r.down ? 1 : r.down && !r.up ? -1 : 0;
  return 5 + h + v * 3;
}

const MOTIONS: { cmd: Command; seq: number[]; button: 'punch' | 'kick'; window: number }[] = [
  { cmd: 'super', seq: [2, 3, 6, 2, 3, 6], button: 'punch', window: SUPER_WINDOW },
  { cmd: 'move2', seq: [6, 2, 3], button: 'punch', window: WINDOW },
  { cmd: 'move1', seq: [2, 3, 6], button: 'punch', window: WINDOW },
  { cmd: 'move3', seq: [2, 1, 4], button: 'kick', window: WINDOW },
];

export class CommandReader {
  private history: { dir: number; t: number }[] = [];
  private prev: RawInput = { left: false, right: false, up: false, down: false, punch: false, kick: false };
  private lastPunch = -1;
  private lastKick = -1;
  private time = 0;

  /** 한 프레임 입력을 넣고, 이번에 완성된 커맨드를 돌려준다 */
  feed(r: RawInput, facing: 1 | -1, dt: number): Command | undefined {
    this.time += dt;
    const t = this.time;
    const dir = numpad(r, facing);
    const last = this.history[this.history.length - 1];
    if (!last || last.dir !== dir) this.history.push({ dir, t });
    this.history = this.history.filter((h) => t - h.t < SUPER_WINDOW + 0.2);

    const punch = r.punch && !this.prev.punch;
    const kick = r.kick && !this.prev.kick;
    this.prev = { ...r };
    if (punch) this.lastPunch = t;
    if (kick) this.lastKick = t;

    // 펀치 + 킥 동시
    if ((punch || kick) && this.lastPunch >= 0 && this.lastKick >= 0 && Math.abs(this.lastPunch - this.lastKick) <= CHORD) {
      this.lastPunch = this.lastKick = -1;
      return 'beast';
    }
    for (const mo of MOTIONS) {
      if ((mo.button === 'punch' && !punch) || (mo.button === 'kick' && !kick)) continue;
      if (this.matches(mo.seq, mo.window)) {
        this.history = [{ dir, t }];
        return mo.cmd;
      }
    }
    return undefined;
  }

  /** 방향 기록 안에 seq가 순서대로 들어 있고, 마지막 방향이 방금 입력됐는지 */
  private matches(seq: number[], window: number): boolean {
    const t = this.time;
    const recent = this.history.filter((h) => t - h.t <= window);
    let i = 0;
    let lastAt = -1;
    for (const h of recent) {
      if (h.dir === seq[i]) {
        i++;
        lastAt = h.t;
        if (i === seq.length) break;
      }
    }
    if (i < seq.length) return false;
    // 마지막 방향을 누르고 너무 오래 지나지 않았어야 한다
    const cur = this.history[this.history.length - 1];
    return cur.dir === seq[seq.length - 1] || t - lastAt < 0.18;
  }
}

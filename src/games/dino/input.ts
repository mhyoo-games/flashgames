// 커맨드 입력 읽기: 방향키를 순서대로 누른 기록을 보고 ↓→ + 펀치 같은 기술을 알아낸다.
// 대각선(두 키 동시)은 필요 없다. 대각선으로 굴려도 같이 인정한다.
// 방향은 숫자패드 표기 (바라보는 쪽 기준): 7 8 9 / 4 5 6 / 1 2 3, 6 = 앞, 4 = 뒤, 2 = 아래
import type { Slot } from './chars.ts';

export type Button = 'lp' | 'hp' | 'lk' | 'hk';
export const BUTTONS: Button[] = ['lp', 'hp', 'lk', 'hk'];

export interface RawInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** 약펀치 · 강펀치 · 약킥 · 강킥 */
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
  /** 기 모으기 (누르고 있기) · 게이지가 가득이면 변신 */
  charge: boolean;
}

export const NO_RAW: RawInput = { left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, charge: false };

export type Command = Slot | 'beast';

const WINDOW = 0.5;
const SUPER_WINDOW = 1.0;

export function numpad(r: Pick<RawInput, 'left' | 'right' | 'up' | 'down'>, facing: 1 | -1): number {
  const fwd = facing > 0 ? r.right : r.left;
  const back = facing > 0 ? r.left : r.right;
  const h = fwd && !back ? 1 : back && !fwd ? -1 : 0;
  const v = r.up && !r.down ? 1 : r.down && !r.up ? -1 : 0;
  return 5 + h + v * 3;
}

/** 순서 한 칸: 아래(↘↙ 포함), 앞, 뒤 */
type Step = 'D' | 'F' | 'B';
const fits = (step: Step, dir: number) => (step === 'D' ? dir === 1 || dir === 2 || dir === 3 : step === 'F' ? dir === 6 || dir === 9 : dir === 4 || dir === 7);

const MOTIONS: { cmd: Slot; seq: Step[]; buttons: 'punch' | 'kick'; window: number }[] = [
  { cmd: 'super', seq: ['D', 'F', 'D', 'F'], buttons: 'punch', window: SUPER_WINDOW },
  { cmd: 'move2', seq: ['F', 'D', 'F'], buttons: 'punch', window: WINDOW },
  { cmd: 'move1', seq: ['D', 'F'], buttons: 'punch', window: WINDOW },
  { cmd: 'move3', seq: ['D', 'B'], buttons: 'kick', window: WINDOW },
];

export class CommandReader {
  private history: { dir: number; t: number }[] = [];
  private prev: RawInput = { ...NO_RAW };
  private time = 0;

  /** 한 프레임 입력을 넣고, 이번에 완성된 커맨드를 돌려준다 */
  feed(r: RawInput, facing: 1 | -1, dt: number): Command | undefined {
    this.time += dt;
    const t = this.time;
    const dir = numpad(r, facing);
    const last = this.history[this.history.length - 1];
    if (!last || last.dir !== dir) this.history.push({ dir, t });
    this.history = this.history.filter((h) => t - h.t < SUPER_WINDOW + 0.2);

    const punch = (r.lp && !this.prev.lp) || (r.hp && !this.prev.hp);
    const kick = (r.lk && !this.prev.lk) || (r.hk && !this.prev.hk);
    this.prev = { ...r };
    for (const mo of MOTIONS) {
      if ((mo.buttons === 'punch' && !punch) || (mo.buttons === 'kick' && !kick)) continue;
      if (this.matches(mo.seq, mo.window)) {
        this.history = [{ dir, t }];
        return mo.cmd;
      }
    }
    return undefined;
  }

  /** 방향 기록 안에 seq가 순서대로 들어 있고, 마지막 방향이 방금 입력됐는지 */
  private matches(seq: Step[], window: number): boolean {
    const t = this.time;
    // 창 안에서 시작한 방향만 본다 (오래 누르고 있던 방향은 새 입력이 아님)
    const recent = this.history.filter((h) => t - h.t <= window);
    let i = 0;
    let lastAt = -1;
    for (const h of recent) {
      if (fits(seq[i], h.dir)) {
        i++;
        lastAt = h.t;
        if (i === seq.length) break;
      }
    }
    if (i < seq.length) return false;
    // 마지막 방향을 누르고 있거나 방금 뗐어야 한다
    const cur = this.history[this.history.length - 1];
    return fits(seq[seq.length - 1], cur.dir) || t - lastAt < 0.2;
  }
}

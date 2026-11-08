// 햄스터 자세: 동작마다 목표 자세(몸 기울기·찌그러짐·머리·양팔·양발 위치)를 정하고,
// 그리는 쪽에서는 지난 자세에서 목표 자세로 부드럽게 옮겨 간다 (뚝뚝 끊기지 않게).
// 좌표는 오른쪽을 보는 기준, 발 가운데가 (0,0), 위가 음수.
import { DinoFight, TRANSFORM_BURST, type Fighter, type Normal } from './engine.ts';

export type Eyes = 'normal' | 'angry' | 'hurt' | 'ko' | 'happy' | 'closed' | 'focus';
export type Mouth = 'smile' | 'open' | 'grit' | 'o' | 'roar';

export interface Pose {
  /** 몸 앞뒤 기울기 (+ = 앞으로) */
  tilt: number;
  /** 세로 눌림 (1 = 보통, 작으면 납작하고 넓게) */
  sq: number;
  /** 몸 전체를 들어 올림 */
  lift: number;
  /** 몸통을 앞뒤로 밀기 */
  bx: number;
  /** 머리 기울기와 위치 */
  ht: number;
  hx: number;
  hy: number;
  /** 앞발(손) · 뒷발(손) 목표 */
  fhx: number;
  fhy: number;
  bhx: number;
  bhy: number;
  /** 앞다리 · 뒷다리 발끝 */
  ffx: number;
  ffy: number;
  bfx: number;
  bfy: number;
  /** 귀 젖힘 (0~1), 꼬리 흔들림 */
  ear: number;
  /** 몸 떨림 세기 */
  shake: number;
  /** 빙글 도는 각 (팽이 기술) */
  spin: number;
  eyes: Eyes;
  mouth: Mouth;
  /** 주먹을 쥐었는지 */
  fist: boolean;
  glow?: string;
}

const NUM_KEYS = ['tilt', 'sq', 'lift', 'bx', 'ht', 'hx', 'hy', 'fhx', 'fhy', 'bhx', 'bhy', 'ffx', 'ffy', 'bfx', 'bfy', 'ear', 'shake'] as const;

export function basePose(time = 0, id = 0): Pose {
  const b = Math.sin(time * 4.2 + id * 1.7);
  return {
    tilt: 0.06,
    sq: 1 + b * 0.022,
    lift: 0,
    bx: 0,
    ht: 0.02 + b * 0.02,
    hx: 0,
    hy: b * 1.2,
    fhx: 40,
    fhy: -52 + b * 2,
    bhx: 26,
    bhy: -50 + b * 1.5,
    ffx: 16,
    ffy: 0,
    bfx: -14,
    bfy: 0,
    ear: 0,
    shake: 0,
    spin: 0,
    eyes: 'normal',
    mouth: 'smile',
    fist: true,
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
const easeIn = (v: number) => clamp01(v) * clamp01(v);
/** 살짝 넘쳤다가 돌아오는 곡선 (뿔이 '뽕' 하고 나올 때) */
export const easeOutBack = (v: number) => {
  const x = clamp01(v);
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

/** 공격 단계: a = 준비(뒤로 당김) 0→1, e = 뻗기 0→1→0 */
function phases(t: number, startup: number, active: number, recovery: number) {
  if (t < startup) return { a: easeOut(t / startup), e: easeIn(t / startup) * 0.25 };
  if (t < startup + active) return { a: 0, e: 1 };
  return { a: 0, e: 1 - easeOut((t - startup - active) / recovery) };
}

/** 지금 동작에 맞는 목표 자세 */
export function targetPose(g: DinoFight, f: Fighter, time: number): Pose {
  const P = basePose(time, f.id);
  const t = f.t;
  if (f.beast) {
    P.eyes = 'angry';
    P.mouth = 'grit';
  }
  switch (f.action) {
    case 'idle':
      break;
    case 'walk':
    case 'back': {
      const fwd = f.action === 'walk';
      const ph = time * (fwd ? 13 : 10) + f.id;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      P.ffx = 16 + s * 13;
      P.ffy = -Math.max(0, c) * 9;
      P.bfx = -14 - s * 13;
      P.bfy = -Math.max(0, -c) * 9;
      P.lift = Math.abs(c) * 3;
      P.tilt = fwd ? 0.14 : -0.06;
      P.fhx = 40 - s * 6;
      P.bhx = 26 + s * 6;
      P.ht = fwd ? 0.04 : -0.06;
      P.ear = fwd ? 0.25 : 0;
      break;
    }
    case 'jump': {
      const up = f.vy < 0;
      P.sq = up ? 1.1 : 0.97;
      P.ffx = 12;
      P.ffy = up ? -20 : -6;
      P.bfx = -10;
      P.bfy = up ? -16 : -2;
      P.fhx = 44;
      P.fhy = up ? -64 : -56;
      P.bhx = 4;
      P.bhy = up ? -96 : -72;
      P.ear = up ? 0.9 : -0.3;
      P.tilt = 0.1;
      break;
    }
    case 'crouch':
      P.sq = 0.72;
      P.ffx = 22;
      P.bfx = -20;
      P.fhx = 40;
      P.fhy = -40;
      P.bhx = 28;
      P.bhy = -34;
      P.hy = 6;
      P.tilt = 0.1;
      break;
    case 'block':
      P.sq = f.crouching ? 0.72 : 1;
      P.tilt = -0.12;
      P.ht = 0.12;
      P.hy = 4;
      P.fhx = 42;
      P.fhy = f.crouching ? -54 : -80;
      P.bhx = 36;
      P.bhy = f.crouching ? -46 : -66;
      P.eyes = 'focus';
      P.mouth = 'grit';
      P.ear = 0.6;
      P.ffx = 12;
      P.bfx = -20;
      break;
    case 'charge': {
      // 다리를 벌리고 주먹을 허리에 당겨 힘을 모은다
      P.sq = 0.86 + Math.sin(time * 30) * 0.015;
      P.tilt = 0;
      P.ffx = 26;
      P.bfx = -26;
      P.fhx = 6;
      P.fhy = -44;
      P.bhx = -6;
      P.bhy = -42;
      P.ht = 0.12;
      P.hy = 2;
      P.eyes = 'angry';
      P.mouth = 'grit';
      P.shake = 1.6;
      P.ear = 0.7;
      P.glow = f.char.accent;
      break;
    }
    case 'transform': {
      if (t < TRANSFORM_BURST) {
        // 웅크리고 힘을 모은다
        const k = t / TRANSFORM_BURST;
        P.sq = 1 - 0.2 * easeOut(k);
        P.tilt = 0.05;
        P.ffx = 24;
        P.bfx = -24;
        P.fhx = 10;
        P.fhy = -40;
        P.bhx = -4;
        P.bhy = -40;
        P.ht = 0.25 * k;
        P.hy = 6 * k;
        P.eyes = k < 0.5 ? 'angry' : 'closed';
        P.mouth = 'grit';
        P.shake = 1 + k * 3;
        P.ear = 1;
      } else {
        // 팍! 하고 펼친다
        const k = (t - TRANSFORM_BURST) / (1 - TRANSFORM_BURST);
        const pop = easeOutBack(k * 2.2);
        P.sq = 0.8 + 0.3 * pop - 0.1 * clamp01(k * 2 - 1);
        P.tilt = -0.15 * (1 - k);
        P.ffx = 24;
        P.bfx = -24;
        P.fhx = 40 + 14 * pop;
        P.fhy = -70 - 12 * pop;
        P.bhx = -16 - 10 * pop;
        P.bhy = -100;
        P.ht = -0.3 * (1 - k * 0.6);
        P.eyes = 'angry';
        P.mouth = 'roar';
        P.ear = -0.4;
        P.lift = 6 * Math.sin(Math.min(1, k * 2) * Math.PI);
      }
      P.fist = true;
      break;
    }
    case 'hit': {
      const k = clamp01(t / 0.12);
      P.tilt = -0.32 * (1 - clamp01((t - 0.15) / 0.3) * 0.6);
      P.ht = -0.35 * k;
      P.hx = -4;
      P.sq = 0.92;
      P.fhx = 30;
      P.fhy = -36;
      P.bhx = -20;
      P.bhy = -88;
      P.ffx = 22;
      P.bfx = -20;
      P.eyes = 'hurt';
      P.mouth = 'o';
      P.ear = -0.8;
      P.fist = false;
      if (!g.grounded(f)) {
        P.ffy = -10;
        P.bfy = -14;
      }
      break;
    }
    case 'ko':
      P.eyes = 'ko';
      P.mouth = 'o';
      P.fhx = 0;
      P.fhy = -90;
      P.bhx = -12;
      P.bhy = -86;
      P.ffx = 24;
      P.ffy = -10;
      P.fist = false;
      P.ear = -1;
      break;
    case 'win': {
      const hop = Math.abs(Math.sin(time * 6));
      P.lift = hop * 16;
      P.sq = 1 + (hop - 0.5) * 0.1;
      P.fhx = 50;
      P.fhy = -118;
      P.bhx = 30;
      P.bhy = -48;
      P.eyes = 'happy';
      P.mouth = 'open';
      P.ffy = -hop * 4;
      P.ear = hop - 0.5;
      break;
    }
    case 'move':
      movePose(g, f, P);
      break;
    default:
      normalPose(g, f, f.action as Normal, P);
  }
  return P;
}

function normalPose(g: DinoFight, f: Fighter, kind: Normal, P: Pose) {
  const h = g.normal(f, kind);
  const { a, e } = phases(f.t, h.startup, h.active, h.recovery);
  P.mouth = e > 0.6 ? 'open' : 'grit';
  P.eyes = f.beast ? 'angry' : 'focus';
  P.ear = 0.4 * e;
  switch (kind) {
    case 'lp':
      // 앞손 잽: 살짝 당겼다가 쭉
      P.tilt = 0.08 + 0.1 * e;
      P.bx = 5 * e;
      P.fhx = 40 - 10 * a + 36 * e;
      P.fhy = -56 - 12 * e;
      P.bhx = 28;
      P.bhy = -52;
      P.hx = 3 * e;
      break;
    case 'hp':
      // 크게 당겨서 몸통을 비틀며 내지르기
      P.tilt = -0.08 * a + 0.3 * e;
      P.bx = -6 * a + 12 * e;
      P.fhx = 40 - 34 * a + 58 * e;
      P.fhy = -54 + 4 * a - 14 * e;
      P.bhx = 28 - 14 * e;
      P.bhy = -50 + 4 * e;
      P.ffx = 16 + 14 * e;
      P.ht = 0.1 * e;
      P.hx = 6 * e;
      break;
    case 'lk':
      // 앞발 앞차기
      P.tilt = -0.18 * e;
      P.ffx = 16 + 48 * e;
      P.ffy = -10 * a - 38 * e;
      P.fhx = 36;
      P.fhy = -60;
      P.bhx = -6;
      P.bhy = -76;
      P.bfx = -18;
      break;
    case 'hk': {
      // 높은 돌려차기: 다리가 둥글게 올라간다
      const arc = Math.sin(e * Math.PI * 0.5);
      P.tilt = -0.12 * a - 0.38 * e;
      P.bx = -4 * e;
      P.ffx = 16 - 12 * a + 64 * arc;
      P.ffy = -8 * a - 70 * arc;
      P.bfx = -10;
      P.fhx = 34;
      P.fhy = -58;
      P.bhx = -24;
      P.bhy = -80;
      P.ht = -0.12 * e;
      break;
    }
    case 'clp':
      P.sq = 0.74;
      P.tilt = 0.14;
      P.fhx = 30 + 40 * e;
      P.fhy = -42;
      P.bhx = 18;
      P.bhy = -40;
      P.ffx = 22;
      P.bfx = -20;
      break;
    case 'upper':
      // 웅크렸다가 솟구치는 올려치기
      P.sq = 0.72 + 0.42 * e;
      P.tilt = 0.18 * a - 0.12 * e;
      P.lift = 8 * e;
      P.fhx = 40 + 8 * e;
      P.fhy = -42 - 90 * e;
      P.bhx = 10;
      P.bhy = -52;
      P.ht = -0.2 * e;
      P.ffx = 22;
      P.bfx = -18;
      P.ffy = -6 * e;
      break;
    case 'lowkick':
      P.sq = 0.74;
      P.tilt = -0.12 * e;
      P.ffx = 20 + 52 * e;
      P.ffy = -4;
      P.fhx = 30;
      P.fhy = -46;
      P.bhx = 16;
      P.bhy = -42;
      P.bfx = -20;
      break;
    case 'sweep':
      // 몸을 낮추고 다리를 쓸기
      P.sq = 0.66;
      P.tilt = 0.26 * e;
      P.ffx = 18 + 64 * e;
      P.ffy = -3;
      P.bfx = -24;
      P.fhx = 10 + 14 * e;
      P.fhy = -18;
      P.bhx = -6;
      P.bhy = -26;
      break;
    case 'airpunch':
      P.tilt = 0.25;
      P.fhx = 30 + 30 * e;
      P.fhy = -62 + 18 * e;
      P.bhx = 10;
      P.bhy = -72;
      P.ffx = 12;
      P.ffy = -18;
      P.bfx = -10;
      P.bfy = -14;
      break;
    case 'airkick':
      P.tilt = 0.35;
      P.ffx = 18 + 40 * e;
      P.ffy = -14 + 4 * e;
      P.bfx = -8;
      P.bfy = -24;
      P.fhx = 20;
      P.fhy = -84;
      P.bhx = 0;
      P.bhy = -80;
      break;
  }
}

function movePose(g: DinoFight, f: Fighter, P: Pose) {
  const mv = g.move(f)!;
  const t = f.t;
  const { a, e } = phases(t, mv.startup, mv.active, mv.recovery);
  P.eyes = 'angry';
  P.mouth = e > 0.5 ? 'roar' : 'grit';
  P.ear = 0.6;
  if (f.slot === 'super' || t < mv.startup) P.glow = f.char.accent;
  switch (mv.type) {
    case 'shot':
    case 'meteor': {
      const sky = mv.type === 'meteor';
      // 두 손을 허리로 모았다가 앞으로 쭉
      P.tilt = -0.1 * a + 0.16 * e;
      P.fhx = sky ? 26 : 2 + 54 * e;
      P.fhy = sky ? -60 - 74 * Math.max(a, e) : -54 - 12 * e;
      P.bhx = sky ? 6 : -8 + 56 * e;
      P.bhy = sky ? -60 - 70 * Math.max(a, e) : -50 - 8 * e;
      P.ffx = 24;
      P.bfx = -22;
      P.fist = false;
      P.ht = sky ? -0.25 * Math.max(a, e) : 0;
      break;
    }
    case 'rush': {
      const ph = t * 26;
      P.tilt = 0.12 * a + 0.48 * e;
      P.bx = 8 * e;
      P.hx = 8 * e;
      P.fhx = 48;
      P.fhy = -54;
      P.bhx = 34;
      P.bhy = -48;
      if (e > 0.5) {
        P.ffx = 18 + Math.sin(ph) * 16;
        P.ffy = -Math.max(0, Math.cos(ph)) * 10;
        P.bfx = -16 - Math.sin(ph) * 16;
        P.bfy = -Math.max(0, -Math.cos(ph)) * 10;
      }
      P.ear = 1;
      break;
    }
    case 'rising':
      P.sq = 0.75 + 0.4 * e;
      P.tilt = 0.15 * a - 0.12 * e;
      P.fhx = 28;
      P.fhy = -44 - 92 * e;
      P.bhx = 8;
      P.bhy = -60 - 20 * e;
      P.ffy = -10 * e;
      P.bfy = -16 * e;
      P.ht = -0.25 * e;
      break;
    case 'spin':
      P.spin = t * 22;
      P.fhx = 50;
      P.fhy = -60;
      P.bhx = -30;
      P.bhy = -60;
      P.ffx = 20;
      P.bfx = -20;
      P.sq = 0.92;
      break;
    case 'slam': {
      const down = t >= mv.startup;
      P.sq = down ? 0.78 : 1 + 0.08 * a;
      P.lift = down ? 0 : 10 * a;
      P.tilt = down ? 0.35 : -0.18 * a;
      P.fhx = down ? 46 : 18;
      P.fhy = down ? -14 : -128;
      P.bhx = down ? 34 : 2;
      P.bhy = down ? -12 : -124;
      P.ht = down ? 0.2 : -0.25;
      P.ffx = 24;
      P.bfx = -24;
      break;
    }
    case 'dive':
      P.tilt = 0.8;
      P.ffx = 44;
      P.ffy = -18;
      P.bfx = 20;
      P.bfy = -34;
      P.fhx = 4;
      P.fhy = -84;
      P.bhx = -12;
      P.bhy = -78;
      break;
    case 'counter':
      P.tilt = -0.1;
      P.fhx = 34;
      P.fhy = -82;
      P.bhx = 30;
      P.bhy = -70;
      P.eyes = 'focus';
      P.glow = '#ffffff';
      if (f.countered) {
        P.tilt = 0.3;
        P.fhx = 74;
        P.fhy = -70;
        P.mouth = 'roar';
      }
      break;
  }
}

/** 지난 자세 → 목표 자세로 부드럽게 (k가 클수록 빠르게) */
export function blendPose(cur: Pose, target: Pose, dt: number, k: number): Pose {
  const w = 1 - Math.exp(-k * dt);
  const out: Pose = { ...target };
  for (const key of NUM_KEYS) out[key] = cur[key] + (target[key] - cur[key]) * w;
  // 도는 각은 그대로 (돌다가 멈추면 바로 정면)
  out.spin = target.spin;
  return out;
}

const memory = new WeakMap<Fighter, { pose: Pose; time: number; action: string }>();

/** 싸우는 화면용: 캐릭터마다 지난 자세를 기억해 부드럽게 이어 준다 */
export function livePose(g: DinoFight, f: Fighter, time: number): Pose {
  const target = targetPose(g, f, time);
  const m = memory.get(f);
  if (!m) {
    memory.set(f, { pose: target, time, action: f.action });
    return target;
  }
  const dt = Math.max(0, Math.min(0.1, time - m.time));
  // 공격은 빠르게 따라가고, 나머지는 부드럽게
  const fast = DinoFight.isAttack(f.action) || f.action === 'hit' || f.action === 'transform';
  const pose = blendPose(m.pose, target, dt, fast ? 38 : 16);
  m.pose = pose;
  m.time = time;
  m.action = f.action;
  return pose;
}

/** 눈 깜빡임: 몇 초마다 잠깐 감는다 */
export function blinking(time: number, seed: number) {
  const period = 3.1 + (seed % 3) * 0.7;
  return (time + seed * 1.37) % period < 0.12;
}

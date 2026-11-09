// 깨비 도감 그리기: 필드 타일·사람·전투 화면
import { blit, cached, person, type Dir as PDir, type Look } from '../quest/pixel.ts';
import { tile as tileAt, npcsOf, itemFlag } from './field.ts';
import { LOOKS } from './maps.ts';
import { maxHp, nameOf, sp, type Mon } from './mon.ts';
import { MOVES, STATUS_NAME } from './moves.ts';
import { byNo, type Species } from './species.ts';
import { drawKkaebi, kkaebiSprite, silhouette, tinted } from './sprite.ts';
import { TYPE_COLOR, type Type } from './types.ts';
import type { Dir, GameState, MapDef, TimeOfDay } from './world.ts';

export const W = 960;
export const H = 540;
export const T = 48;
type Ctx = CanvasRenderingContext2D;
type Px = (x: number, y: number, w: number, h: number, c: string) => void;

export const FONT = '"DungGeunMo", "Galmuri11", ui-monospace, "Malgun Gothic", monospace';
export function text(ctx: Ctx, s: string, x: number, y: number, size = 22, color = '#202030', align: CanvasTextAlign = 'left', shadow = false) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(s, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}
/** 옛날 휴대용 게임기 같은 흰 창 (두 줄 테두리) */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#f8f8f0';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#303048';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#8888a8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
}

const hash = (x: number, y: number) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};
const tiles = new Map<string, HTMLCanvasElement>();
function tc(key: string, draw: (p: Px) => void) {
  let cv = tiles.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    const c = cv.getContext('2d')!;
    draw((x, y, w, h, col) => {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
    });
    tiles.set(key, cv);
  }
  return cv;
}
function speckle(p: Px, base: string, dots: string[], v: number, n = 6) {
  p(0, 0, 16, 16, base);
  for (let i = 0; i < n; i++) p(Math.floor(hash(i * 13 + v, v * 7 + i) * 15), Math.floor(hash(v * 11 + i, i * 5) * 15), i % 3 ? 1 : 2, 1, dots[i % dots.length]);
}

const GROUND: Record<string, [string, string[]]> = {
  grass: ['#78c850', ['#60a840', '#98e070']],
  sand: ['#e8d090', ['#d0b070', '#f8e8b0']],
  snow: ['#f0f4ff', ['#c8d8f0', '#ffffff']],
  cave: ['#8a7060', ['#705848', '#a08878']],
  floor: ['#e0c890', ['#c8a870']],
};

function drawTile(ctx: Ctx, m: MapDef, t: string, x: number, y: number, sx: number, sy: number, time: number) {
  const v = Math.floor(hash(x, y) * 4);
  const baseKey = m.terrain === 'cave' ? 'cave' : m.terrain === 'snow' ? 'snow' : m.terrain === 'indoor' || m.terrain === 'tower' ? 'floor' : 'grass';
  const ground = () => {
    const [b, d] = GROUND[baseKey];
    return tc(`g${baseKey}${v}`, (p) => speckle(p, b, d, v));
  };
  const put = (c: HTMLCanvasElement) => ctx.drawImage(c, sx, sy, T, T);
  const f2 = Math.floor(time * 2 + (x + y) * 0.3) % 2;
  switch (t) {
    case '.':
      return put(ground());
    case ',':
      put(ground());
      return put(
        tc(`fl${v}`, (p) => {
          const cols = ['#ffffff', '#f8d030', '#f878a0'];
          for (let i = 0; i < 3; i++) {
            const fx = 2 + Math.floor(hash(i, v) * 11);
            const fy = 2 + Math.floor(hash(v, i + 3) * 11);
            p(fx, fy, 2, 2, cols[(i + v) % 3]);
            p(fx, fy + 2, 1, 1, '#408830');
          }
        }),
      );
    case '"': {
      put(ground());
      const sway = Math.floor(time * 2.5 + x * 0.7) % 2;
      return put(
        tc(`tg${m.terrain}${sway}`, (p) => {
          const dark = m.terrain === 'forest' ? '#286828' : '#388838';
          const mid = m.terrain === 'forest' ? '#40883a' : '#50a848';
          for (const [gx, gy] of [[1, 2], [6, 0], [11, 2], [3, 8], [9, 8], [14, 7]]) {
            p(gx + sway, gy, 2, 6, mid);
            p(gx + 2 + sway, gy + 1, 1, 5, dark);
            p(gx - 1, gy + 3, 1, 3, dark);
          }
          p(0, 14, 16, 2, dark);
        }),
      );
    }
    case 'T':
    case 't': {
      put(t === 't' ? ground() : m.terrain === 'snow' ? tc('gsnow0', (p) => speckle(p, GROUND.snow[0], GROUND.snow[1], 0)) : ground());
      return put(
        tc(`tree${t}${m.terrain}`, (p) => {
          const snow = m.terrain === 'snow';
          const c1 = snow ? '#3a7a5a' : '#307838';
          const c2 = snow ? '#2a5a48' : '#205828';
          const c3 = snow ? '#ffffff' : '#50a848';
          if (t === 't') {
            p(7, 11, 2, 4, '#7a4a2a');
            p(3, 4, 10, 8, c1);
            p(4, 3, 8, 1, c1);
            p(4, 4, 3, 2, c3);
            p(3, 10, 10, 2, c2);
            return;
          }
          p(6, 12, 4, 4, '#6a4022');
          p(2, 2, 12, 10, c1);
          p(4, 0, 8, 2, c1);
          p(0, 4, 16, 6, c1);
          p(1, 10, 14, 2, c2);
          p(3, 1, 4, 3, c3);
          p(1, 5, 3, 2, c3);
          p(9, 4, 3, 1, c3);
          p(6, 7, 3, 1, c2);
        }),
      );
    }
    case '~':
      return put(
        tc(`water${f2}`, (p) => {
          p(0, 0, 16, 16, '#4880e8');
          for (const [wx, wy] of [[1 + f2 * 2, 3], [8 - f2, 8], [3, 12 - f2], [11, 1 + f2]]) {
            p(wx, wy, 4, 1, '#88b8f8');
            p(wx + 1, wy - 1, 2, 1, '#c8e0ff');
          }
        }),
      );
    case 'w':
      return put(
        tc(`fall${f2}`, (p) => {
          p(0, 0, 16, 16, '#5890f0');
          for (let i = 0; i < 5; i++) p(1 + i * 3, ((i * 5 + f2 * 8) % 16) - 4, 1, 8, '#e8f4ff');
        }),
      );
    case '=':
    case 'B':
      if (t === 'B')
        return put(
          tc('bridge', (p) => {
            p(0, 0, 16, 16, '#4880e8');
            p(0, 2, 16, 12, '#b88040');
            for (let i = 0; i < 4; i++) p(i * 4, 2, 1, 12, '#8a5a28');
          }),
        );
      if (m.terrain === 'cave' || m.terrain === 'tower') return put(tc(`cpath${v}`, (p) => speckle(p, '#a08870', ['#887058', '#b8a088'], v)));
      if (m.terrain === 'indoor') return put(ground());
      return put(tc(`path${m.terrain}${v}`, (p) => speckle(p, m.terrain === 'snow' ? '#d8d8e8' : '#e0c080', m.terrain === 'snow' ? ['#c0c0d8'] : ['#c8a060', '#f0d8a0'], v)));
    case '_':
      return put(tc(`gcave${v}`, (p) => speckle(p, GROUND.cave[0], GROUND.cave[1], v)));
    case 's':
      return put(tc(`gsand${v}`, (p) => speckle(p, GROUND.sand[0], GROUND.sand[1], v)));
    case 'm':
      return put(tc(`gsnow${v}`, (p) => speckle(p, GROUND.snow[0], GROUND.snow[1], v)));
    case 'l': {
      const f = Math.floor(time * 3 + x) % 2;
      return put(
        tc(`lava${f}`, (p) => {
          p(0, 0, 16, 16, '#e84818');
          p(2 + f * 4, 3, 5, 2, '#f8a828');
          p(9 - f * 3, 10, 4, 2, '#f8d048');
          p(0, 0, 16, 1, '#a83010');
        }),
      );
    }
    case '#':
      return put(
        tc(`rock${m.terrain}${v}`, (p) => {
          const c = m.terrain === 'cave' ? ['#5a4848', '#3e3030', '#7a6464'] : m.terrain === 'snow' ? ['#a0a8c0', '#788098', '#d0d8f0'] : ['#a08060', '#786040', '#c0a080'];
          p(0, 0, 16, 16, c[0]);
          for (let i = 0; i < 4; i++) {
            const bx = (i % 2) * 8 + (v % 2) * 2 - 1;
            const by = Math.floor(i / 2) * 8;
            p(bx, by, 8, 1, c[2]);
            p(bx, by + 7, 8, 1, c[1]);
            p(bx + 7, by, 1, 8, c[1]);
          }
        }),
      );
    case 'R':
    case 'r':
    case 'y':
    case 'g': {
      const col = { R: ['#d84838', '#a83028', '#f07060'], r: ['#3870d8', '#2850a8', '#68a0f0'], y: ['#e8b830', '#b88818', '#f8d870'], g: ['#8888a0', '#606078', '#b0b0c8'] }[t]!;
      return put(
        tc(`roof${t}${y % 2}`, (p) => {
          p(0, 0, 16, 16, col[0]);
          for (let r = 0; r < 4; r++) {
            p(0, r * 4 + 3, 16, 1, col[1]);
            p(0, r * 4, 16, 1, col[2]);
            for (let k = 0; k < 4; k++) p(k * 4 + ((r + y) % 2) * 2, r * 4 + 1, 1, 2, col[1]);
          }
        }),
      );
    }
    case 'H':
    case 'D':
      return put(
        tc(`wall${t}${x % 3}`, (p) => {
          p(0, 0, 16, 16, '#f0e0c0');
          p(0, 14, 16, 2, '#a08060');
          p(0, 0, 16, 1, '#c8b090');
          if (t === 'D') {
            p(4, 2, 8, 14, '#784020');
            p(5, 3, 6, 12, '#a05830');
            p(9, 9, 1, 2, '#f8d048');
          } else if (x % 3 === 1) {
            p(3, 3, 10, 8, '#584030');
            p(4, 4, 8, 6, '#90c8f8');
            p(4, 4, 4, 2, '#d8f0ff');
            p(8, 3, 1, 8, '#584030');
          }
        }),
      );
    case 'O':
      put(m.terrain === 'cave' ? tc(`gcave${v}`, (p) => speckle(p, GROUND.cave[0], GROUND.cave[1], v)) : ground());
      return put(
        tc('boulder', (p) => {
          p(2, 3, 12, 12, '#888890');
          p(3, 2, 10, 1, '#888890');
          p(3, 3, 5, 3, '#b8b8c0');
          p(2, 13, 12, 2, '#585868');
          p(10, 6, 2, 2, '#686878');
        }),
      );
    case '<':
      put(ground());
      return put(
        tc('ledge', (p) => {
          p(0, 9, 16, 3, '#588838');
          p(0, 12, 16, 2, '#386020');
          for (let i = 0; i < 4; i++) p(i * 4 + 1, 10, 2, 1, '#78b050');
        }),
      );
    case 'S':
      put(m.terrain === 'town' || m.terrain === 'route' ? tc(`path${m.terrain}${v}`, (p) => speckle(p, '#e0c080', ['#c8a060'], v)) : ground());
      return put(
        tc('sign', (p) => {
          p(7, 9, 2, 7, '#7a4a2a');
          p(2, 3, 12, 7, '#c89058');
          p(2, 3, 12, 1, '#e8b880');
          p(4, 5, 8, 1, '#6a3a1a');
          p(4, 7, 6, 1, '#6a3a1a');
        }),
      );
    case 'F':
      put(ground());
      return put(
        tc('fence', (p) => {
          for (const fx of [1, 7, 13]) p(fx, 4, 2, 11, '#f8f8f8');
          p(0, 6, 16, 2, '#e0e0e0');
          p(0, 11, 16, 2, '#e0e0e0');
        }),
      );
    case 'Z':
      return put(
        tc('cavehole', (p) => {
          p(0, 0, 16, 16, '#786050');
          p(2, 4, 12, 12, '#181018');
          p(4, 2, 8, 2, '#181018');
        }),
      );
    case 'E':
      put(ground());
      return put(
        tc('ladder', (p) => {
          p(3, 0, 2, 16, '#8a5a28');
          p(11, 0, 2, 16, '#8a5a28');
          for (let i = 0; i < 4; i++) p(3, i * 4 + 2, 10, 2, '#b07838');
        }),
      );
    case 'f':
      return put(
        tc(`floor${y % 2}`, (p) => {
          p(0, 0, 16, 16, '#e8d098');
          for (let i = 0; i < 4; i++) p(0, i * 4 + 3, 16, 1, '#c8a870');
          p(((y % 2) * 8 + 4) % 16, 0, 1, 16, '#d0b880');
        }),
      );
    case 'x':
      return put(
        tc(`iwall${y}`, (p) => {
          p(0, 0, 16, 16, y === 0 ? '#c8b8a0' : '#f0e8d8');
          if (y > 0) {
            p(0, 13, 16, 3, '#a89070');
            for (let i = 0; i < 4; i++) p(i * 4, 0, 1, 13, '#e0d8c8');
          }
        }),
      );
    case 'a':
      return put(
        tc('rug', (p) => {
          p(0, 0, 16, 16, '#d84848');
          p(1, 1, 14, 14, '#f06868');
          p(3, 3, 10, 10, '#d84848');
        }),
      );
    case 'c':
      return put(
        tc('counter', (p) => {
          p(0, 0, 16, 16, '#e8d098');
          p(0, 3, 16, 11, '#b07840');
          p(0, 3, 16, 3, '#d8a060');
          p(0, 13, 16, 1, '#704820');
        }),
      );
    case 'p':
      return put(
        tc('pc', (p) => {
          p(0, 0, 16, 16, '#f0e8d8');
          p(2, 1, 12, 14, '#909098');
          p(3, 2, 10, 7, '#283848');
          p(4, 3, 4, 2, '#58c8f8');
          p(4, 11, 8, 2, '#d0d0d8');
        }),
      );
    case 'k':
      return put(
        tc('shelf', (p) => {
          p(0, 0, 16, 16, '#8a5a28');
          for (let r = 0; r < 3; r++) {
            p(1, 1 + r * 5, 14, 4, '#583818');
            for (let i = 0; i < 6; i++) p(2 + i * 2, 1 + r * 5, 2, 4, ['#d84848', '#3870d8', '#e8b830', '#58a848'][(i + r) % 4]);
          }
        }),
      );
    case 'u':
      put(tc(`floor${y % 2}`, (p) => p(0, 0, 16, 16, '#e8d098')));
      return put(
        tc('statue', (p) => {
          p(3, 12, 10, 4, '#787888');
          p(5, 3, 6, 9, '#a8a8b8');
          p(4, 1, 8, 4, '#a8a8b8');
          p(5, 2, 2, 2, '#d0d0e0');
        }),
      );
  }
  put(ground());
}

// ---------------- 사람 ----------------
function personCv(look: string | Look, dir: Dir, frame: number) {
  const L = typeof look === 'string' ? LOOKS[look] : look;
  const key = typeof look === 'string' ? look : JSON.stringify(look);
  const d: PDir = dir === 'left' ? 'right' : dir;
  return { cv: cached(`k:${key}:${d}:${frame}`, () => person(L, d, frame)), flip: dir === 'left' };
}
export function personSprite(look: string, dir: Dir, frame: number) {
  return personCv(look, dir, frame);
}

export interface FieldView {
  px: number;
  py: number;
  dir: Dir;
  /** 걷는 중 (발 움직임) */
  moving: boolean;
  /** 턱을 뛰어넘는 높이 */
  hop: number;
  /** 트레이너 머리 위 느낌표 */
  alert?: string;
  /** 주인공 머리 위 느낌표 (뜬 지 몇 초) */
  alertMe?: number;
}

/** 말풍선 느낌표: 톡 튀어 오른다 */
function alertMark(ctx: Ctx, x: number, y: number, t: number) {
  const k = Math.min(1, t / 0.16);
  const s = k < 1 ? k * 1.35 : 1 + Math.max(0, 0.35 - (t - 0.16) * 3) * Math.sin((t - 0.16) * 30) * 0.4;
  const lift = (1 - k) * 10;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - lift));
  ctx.scale(s, s);
  ctx.fillStyle = '#202030';
  ctx.fillRect(-15, -17, 30, 32);
  ctx.fillRect(-4, 15, 8, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-13, -15, 26, 28);
  ctx.fillRect(-2, 13, 4, 4);
  ctx.fillStyle = '#e83838';
  ctx.fillRect(-3, -11, 6, 14);
  ctx.fillRect(-3, 6, 6, 5);
  ctx.restore();
}

export function renderField(ctx: Ctx, s: GameState, m: MapDef, v: FieldView, time: number, tod: TimeOfDay) {
  const cols = m.rows[0].length;
  const rows = m.rows.length;
  let cx = v.px * T + T / 2 - W / 2;
  let cy = v.py * T + T / 2 - H / 2;
  cx = cols * T <= W ? (cols * T - W) / 2 : Math.max(0, Math.min(cols * T - W, cx));
  cy = rows * T <= H ? (rows * T - H) / 2 : Math.max(0, Math.min(rows * T - H, cy));
  ctx.fillStyle = m.terrain === 'indoor' || m.terrain === 'tower' ? '#101018' : '#183018';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const x0 = Math.floor(cx / T);
  const y0 = Math.floor(cy / T);
  for (let y = y0; y <= y0 + Math.ceil(H / T) + 1; y++)
    for (let x = x0; x <= x0 + Math.ceil(W / T) + 1; x++) {
      if (y < 0 || x < 0 || y >= rows || x >= cols) continue;
      drawTile(ctx, m, tileAt(m, x, y), x, y, Math.round(x * T - cx), Math.round(y * T - cy), time);
    }
  // 땅에 떨어진 도구
  for (const it of m.items) {
    if (s.flags[itemFlag(m.id, it.x, it.y)]) continue;
    const sx = it.x * T - cx;
    const sy = it.y * T - cy;
    ctx.drawImage(
      tc(it.tm ? 'tmball' : 'itemball', (p) => {
        p(4, 5, 8, 9, it.tm ? '#f8d048' : '#e85838');
        p(6, 2, 4, 3, it.tm ? '#f8d048' : '#e85838');
        p(5, 9, 6, 1, '#ffffff');
        p(5, 6, 2, 2, '#ffffff');
        p(4, 13, 8, 1, '#702818');
      }),
      sx,
      sy,
      T,
      T,
    );
  }
  // 사람들
  const frame = Math.floor(time * 3.2) % 2;
  const list: { y: number; draw: () => void }[] = [];
  for (const n of npcsOf(s, m)) {
    const sx = n.x * T - cx + T / 2;
    const sy = n.y * T - cy + T + 2;
    if (n.id.startsWith('legend')) {
      const no = byNo(n.id === 'legend1' ? 193 : n.id === 'legend2' ? 194 : 195);
      list.push({ y: n.y, draw: () => drawKkaebi(ctx, kkaebiSprite(no, false, frame), sx, sy + Math.sin(time * 3) * 3, 1.6) });
      continue;
    }
    const dir = n.turn ? (['down', 'left', 'down', 'right'] as Dir[])[Math.floor(time / 2.1 + n.x) % 4] : (n.dir ?? 'down');
    list.push({
      y: n.y,
      draw: () => {
        shadow(ctx, sx, sy);
        const { cv, flip } = personCv(n.look, dir, n.look === 'gourd' ? 0 : frame);
        blit(ctx, cv, sx, sy, n.look === 'gourd' ? 2 : 3, flip);
        if (v.alert === n.id) alertMark(ctx, sx, sy - 78, time % 10);
      },
    });
  }
  const hx = v.px * T - cx + T / 2;
  const hy = v.py * T - cy + T + 2 - v.hop;
  list.push({
    y: v.py,
    draw: () => {
      if (s.surfing) {
        // 물 위: 큰 연잎을 타고
        ctx.fillStyle = '#48a040';
        ctx.beginPath();
        ctx.ellipse(hx, hy - 8, 24, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#68c050';
        ctx.beginPath();
        ctx.ellipse(hx - 4, hy - 11, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else shadow(ctx, hx, hy + v.hop);
      // 한 칸 걷는 동안 가운데쯤에서 발을 내딛고 살짝 들썩인다
      const frac = Math.abs((v.px % 1) + (v.py % 1)) % 1;
      const stepping = frac > 0.2 && frac < 0.8;
      const stepFrame = stepping ? 1 : 0;
      const bobY = stepping && !s.surfing ? 2 : 0;
      const { cv, flip } = personCv('hero', v.dir, v.moving || stepping ? stepFrame : 0);
      blit(ctx, cv, hx, hy - (s.surfing ? 10 + Math.sin(time * 3) * 2 : 0) - bobY, 3, flip);
      // 풀숲 안: 발목이 풀에 가려지고, 걸으면 잎이 흩날린다
      const gx = Math.round(v.px);
      const gy = Math.round(v.py);
      if (!s.surfing && tileAt(m, gx, gy) === '"') {
        const sway = Math.floor(time * 2.5 + gx * 0.7) % 2;
        for (const [ox, h] of [[-16, 12], [-9, 16], [-2, 13], [5, 16], [12, 12]] as [number, number][]) {
          ctx.fillStyle = m.terrain === 'forest' ? '#40883a' : '#50a848';
          ctx.fillRect(hx + ox + sway, hy - h + 2, 4, h);
          ctx.fillStyle = m.terrain === 'forest' ? '#286828' : '#388838';
          ctx.fillRect(hx + ox + 4 + sway, hy - h + 5, 2, h - 3);
        }
        if (stepping) {
          for (let i = 0; i < 4; i++) {
            const k = (frac - 0.2) / 0.6;
            const lx = hx - 18 + i * 12 + Math.sin(i * 2.1 + k * 4) * 6;
            const ly = hy - 10 - k * (18 + i * 5);
            ctx.fillStyle = i % 2 ? '#78c858' : '#3a8a30';
            ctx.fillRect(Math.round(lx), Math.round(ly), 5, 3);
          }
        }
      }
      if (v.alertMe !== undefined) alertMark(ctx, hx, hy - 78 - (s.surfing ? 10 : 0), v.alertMe);
    },
  });
  list.sort((a, b) => a.y - b.y).forEach((p) => p.draw());

  // 밤: 푸르게 어둡게, 아침: 살짝 주황
  if (m.terrain !== 'indoor' && m.terrain !== 'cave' && m.terrain !== 'tower') {
    if (tod === 'night') {
      ctx.fillStyle = 'rgba(20,30,90,0.42)';
      ctx.fillRect(0, 0, W, H);
    } else if (tod === 'morning') {
      ctx.fillStyle = 'rgba(255,170,90,0.10)';
      ctx.fillRect(0, 0, W, H);
    }
  }
  // 어두운 동굴: 빛내기 없으면 주변만 보인다
  if (m.dark && !s.flags[`flash:${m.id}`]) {
    const g = ctx.createRadialGradient(hx, hy - 24, 40, hx, hy - 24, 120);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
function shadow(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 대화창 (글자가 한 자씩) */
export function dialog(ctx: Ctx, who: string, msg: string, shown: number, time: number) {
  box(ctx, 24, H - 150, W - 48, 136);
  let y = H - 128;
  if (who) {
    text(ctx, who, 52, y, 22, '#c83838');
    y += 32;
  }
  wrapText(ctx, msg.slice(0, Math.floor(shown)), 52, y, W - 130, 30, 22, 3);
  if (shown >= msg.length && Math.floor(time * 3) % 2) text(ctx, '▼', W - 70, H - 46, 20, '#303048');
}
export function wrapText(ctx: Ctx, s: string, x: number, y: number, maxW: number, lh: number, size: number, maxLines = 9, color = '#202030') {
  ctx.font = `bold ${size}px ${FONT}`;
  const lines: string[] = [];
  for (const para of s.split('\n')) {
    let cur = '';
    for (const ch of para) {
      if (ctx.measureText(cur + ch).width > maxW) {
        lines.push(cur);
        cur = '';
      }
      cur += ch;
    }
    lines.push(cur);
  }
  lines.slice(-maxLines).forEach((l, i) => text(ctx, l, x, y + i * lh, size, color));
}

export function banner(ctx: Ctx, name: string, t: number) {
  if (t > 2.2) return;
  ctx.globalAlpha = Math.min(1, (2.2 - t) * 2);
  box(ctx, 16, 16, 300, 58);
  text(ctx, name, 166, 34, 22, '#202030', 'center');
  ctx.globalAlpha = 1;
}

// ---------------- 전투 ----------------
export interface BattleAnim {
  /** 화면에 보이는 HP (줄어드는 애니메이션) */
  php: number;
  fhp: number;
  /** 내 깨비·상대 깨비 보임 정도 (0~1, 등장·퇴장) */
  pin: number;
  fin: number;
  /** 호리병에서 나온 지 (0 → 1, 톡 튀어나오기) */
  psend: number;
  fsend: number;
  /** 흔들림·깜빡임 */
  pshake: number;
  fshake: number;
  pflash: number;
  fflash: number;
  /** 공격 몸짓 */
  plunge: number;
  flunge: number;
  /** 호리병 */
  ball?: { t: number; shakes: number; caught: boolean; done?: boolean };
  /** 기술 이펙트 */
  fx?: { type: Type; t: number; to: 'p' | 'f'; status: boolean };
  stat?: { side: 'p' | 'f'; up: boolean; t: number };
  /** 내 깨비 경험치 막대 (0~1) */
  exp: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** 톡 튀어나오는 크기: 작게 → 조금 크게 → 제 크기 */
function popScale(t: number) {
  if (t >= 1) return 1;
  const c = 2.2;
  const u = t - 1;
  return Math.max(0.05, 1 + (c + 1) * u * u * u + c * u * u);
}
/** 숨쉬기·깜빡임 */
const frameAt = (time: number, off: number) => ((time + off) % 3.4 < 0.13 ? 2 : Math.floor((time + off) * 1.6) % 2);
function whiteOver(ctx: Ctx, s: Species, x: number, y: number, scale: number, alpha: number, squash: number, back = false) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  drawKkaebi(ctx, tinted(s, '#ffffff', back), x, y, scale, false, squash);
  ctx.restore();
}
/** 호리병에서 나올 때 퍼지는 빛 조각 */
function burst(ctx: Ctx, x: number, y: number, t: number) {
  const k = t / 0.7;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = 20 + k * 110;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.75;
    ctx.fillStyle = i % 2 ? '#fff6b0' : '#ffffff';
    const sz = 10 * (1 - k) + 3;
    ctx.fillRect(Math.round(px - sz / 2), Math.round(py - 1), Math.round(sz), 3);
    ctx.fillRect(Math.round(px - 1), Math.round(py - sz / 2), 3, Math.round(sz));
  }
  ctx.restore();
}

const PX = 220;
const PY = 404;
const FX = 700;
const FY = 230;

export function renderBattle(ctx: Ctx, me: Mon | undefined, foe: Mon, a: BattleAnim, terrain: string, time: number, trainerLook?: string, introT = 1, wild = false) {
  const slide = easeOut(Math.min(1, introT));
  const fOff = -(1 - slide) * W * 0.85;
  const pOff = (1 - slide) * W * 0.85;
  ctx.imageSmoothingEnabled = false;
  // 배경
  const sky: Record<string, [string, string]> = { cave: ['#382838', '#5a4858'], forest: ['#3a7848', '#88c070'], snow: ['#c8d8f0', '#f0f4ff'], sand: ['#f8d890', '#f8f0c8'], indoor: ['#d8c8a8', '#f0e8d0'], tower: ['#584878', '#a898c8'], sea: ['#58a0f0', '#a8d8ff'] };
  const [c1, c2] = sky[terrain] ?? ['#90c8f8', '#e0f4ff'];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1);
  g.addColorStop(0.6, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 바닥 발판
  const plat = terrain === 'cave' ? '#7a6858' : terrain === 'snow' ? '#e0e8f8' : terrain === 'sea' ? '#68a8f0' : terrain === 'sand' ? '#e8c880' : '#88c868';
  for (const [x, y, rx] of [[FX + fOff, FY + 6, 150], [PX + 10 + pOff, PY + 18, 190]] as [number, number, number][]) {
    ctx.fillStyle = plat;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, rx * 0.92, rx * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 등장 전 트레이너 그림
  if (trainerLook && a.fin < 1) {
    const { cv } = personCv(trainerLook, 'down', 0);
    blit(ctx, cv, FX + fOff + a.fin * 260, FY + 4, 7);
  }
  // 상대 깨비
  if (a.fin > 0 && foe.hp >= 0) {
    const s = sp(foe);
    const sh = a.fshake > 0 ? Math.sin(a.fshake * 60) * 8 : 0;
    const vis = !(a.fflash > 0 && Math.floor(a.fflash * 18) % 2 === 0);
    const lunge = Math.sin(Math.min(1, a.flunge) * Math.PI) * -40;
    const pop = popScale(a.fsend);
    const scale = 4.2 * (a.ball && !a.ball.done ? 0 : a.fin) * pop;
    const bob = Math.sin(time * 2.6) * 0.025;
    if (vis && scale > 0 && !(a.ball && a.ball.t > 0.4 && !a.ball.done)) {
      const x = FX + sh + lunge + fOff;
      // 야생: 미끄러져 들어오는 동안은 그림자, 멈추면 번쩍하며 색이 돌아온다
      const cv = wild && introT < 1 ? silhouette(s) : kkaebiSprite(s, false, frameAt(time, 0.3), foe.shiny);
      drawKkaebi(ctx, cv, x, FY + 10, scale, false, 1 + bob);
      const glow = wild ? Math.max(0, 1 - Math.abs(introT - 1.05) / 0.12) * (introT >= 1 ? 1 : 0) : 0;
      if (glow > 0 || a.fsend < 0.5) whiteOver(ctx, s, x, FY + 10, scale, Math.max(glow, 1 - a.fsend * 2), 1 + bob);
      if (a.fsend < 0.7) burst(ctx, x, FY - 60, a.fsend);
    }
  }
  // 내 깨비 (뒷모습)
  if (me && a.pin > 0) {
    const s = sp(me);
    const sh = a.pshake > 0 ? Math.sin(a.pshake * 60) * 8 : 0;
    const vis = !(a.pflash > 0 && Math.floor(a.pflash * 18) % 2 === 0);
    const lunge = Math.sin(Math.min(1, a.plunge) * Math.PI) * 40;
    const sc = 5.4 * Math.max(0.2, a.pin) * popScale(a.psend);
    const bob = Math.sin(time * 2.6 + 1.7) * 0.022;
    const x = PX + sh + lunge + pOff;
    const y = PY + 28 + (1 - a.pin) * 120;
    if (vis) drawKkaebi(ctx, kkaebiSprite(s, true, frameAt(time, 1.1), me.shiny), x, y, sc, false, 1 + bob);
    if (vis && a.psend < 0.5) whiteOver(ctx, s, x, y, sc, 1 - a.psend * 2, 1 + bob, true);
    if (a.psend < 0.7) burst(ctx, x, y - 120, a.psend);
  }
  // 호리병
  if (a.ball) {
    const t = a.ball.t;
    let bx = FX;
    let by = FY - 20;
    if (t < 0.5) {
      const k = t / 0.5;
      bx = PX + (FX - PX) * k;
      by = PY - 100 + (FY - 40 - (PY - 100)) * k - Math.sin(k * Math.PI) * 160;
    }
    const shakeT = t - 0.9;
    const rot = shakeT > 0 && Math.floor(shakeT / 0.6) < a.ball.shakes ? Math.sin(((shakeT % 0.6) / 0.6) * Math.PI * 2) * 0.5 : 0;
    gourd(ctx, bx, by, rot, a.ball.caught && shakeT > a.ball.shakes * 0.6);
    if (t >= 0.5 && t < 0.9) {
      ctx.fillStyle = `rgba(255,255,255,${0.9 - (t - 0.5) * 2})`;
      ctx.beginPath();
      ctx.arc(FX, FY - 40, 60 * (t - 0.5) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 기술 이펙트
  if (a.fx) drawMoveFx(ctx, a.fx, time);
  if (a.stat) {
    const x = a.stat.side === 'p' ? PX : FX;
    const y = a.stat.side === 'p' ? PY - 60 : FY - 60;
    for (let i = 0; i < 8; i++) {
      const k = (a.stat.t * 1.5 + i / 8) % 1;
      ctx.fillStyle = a.stat.up ? '#f8d048' : '#5878f8';
      ctx.fillRect(x - 60 + i * 16, y + (a.stat.up ? 60 - k * 120 : -60 + k * 120), 6, 14);
    }
  }
  // 상태 창
  if (introT >= 1) hud(ctx, foe, 40 - Math.max(0, 1.2 - introT) * 2000, 30, a.fhp, false, 0, a.fin > 0);
  if (me) hud(ctx, me, W - 430, 300, a.php, true, a.exp, a.pin > 0);
}

function gourd(ctx: Ctx, x: number, y: number, rot: number, caught: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#d88838';
  ctx.strokeStyle = '#583010';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 8, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a03828';
  ctx.fillRect(-6, -3, 12, 4);
  ctx.fillStyle = '#7a4a1a';
  ctx.fillRect(-3, -21, 6, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-7, 2, 4, 6);
  ctx.restore();
  if (caught)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#f8e048';
      const a = (i / 5) * Math.PI * 2;
      ctx.fillRect(x + Math.cos(a) * 28 - 3, y + Math.sin(a) * 28 - 3, 6, 6);
    }
}

function drawMoveFx(ctx: Ctx, fx: NonNullable<BattleAnim['fx']>, time: number) {
  const tx = fx.to === 'f' ? FX : PX;
  const ty = fx.to === 'f' ? FY - 60 : PY - 50;
  const sx = fx.to === 'f' ? PX : FX;
  const sy = fx.to === 'f' ? PY - 60 : FY - 60;
  const k = fx.t;
  const col = TYPE_COLOR[fx.type];
  ctx.save();
  if (fx.status) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + time * 4;
      ctx.fillStyle = col;
      ctx.globalAlpha = 1 - k;
      ctx.fillRect(tx + Math.cos(a) * (60 - k * 40) - 4, ty + Math.sin(a) * (40 - k * 20) - 4, 8, 8);
    }
    ctx.restore();
    return;
  }
  // 날아가는 덩어리 → 맞는 곳에서 터짐
  if (k < 0.45) {
    const u = k / 0.45;
    for (let i = 0; i < 6; i++) {
      const v = Math.max(0, u - i * 0.04);
      ctx.fillStyle = i < 2 ? '#ffffff' : col;
      const s = 18 - i * 2;
      ctx.fillRect(sx + (tx - sx) * v - s / 2, sy + (ty - sy) * v - Math.sin(v * Math.PI) * 50 - s / 2, s, s);
    }
  } else {
    const b = (k - 0.45) / 0.55;
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      const d = b * (30 + (i % 4) * 16);
      ctx.globalAlpha = 1 - b;
      ctx.fillStyle = i % 3 ? col : '#ffffff';
      const s = 12 * (1 - b) + 4;
      ctx.fillRect(tx + Math.cos(a) * d - s / 2, ty + Math.sin(a) * d - s / 2, s, s);
    }
  }
  ctx.restore();
}

function hud(ctx: Ctx, m: Mon, x: number, y: number, shownHp: number, mine: boolean, exp: number, visible: boolean) {
  if (!visible) return;
  const w = 390;
  const h = mine ? 128 : 92;
  box(ctx, x, y, w, h);
  text(ctx, nameOf(m), x + 24, y + 18, 24);
  text(ctx, `Lv${m.lv}`, x + w - 24, y + 18, 22, '#202030', 'right');
  if (m.status) {
    const sc: Record<string, string> = { brn: '#e85838', psn: '#a050b0', par: '#d8b020', slp: '#8888a0', frz: '#58b8e8' };
    ctx.fillStyle = sc[m.status];
    ctx.fillRect(x + 220, y + 18, 56, 26);
    text(ctx, STATUS_NAME[m.status], x + 248, y + 20, 18, '#ffffff', 'center');
  }
  const max = maxHp(m);
  const frac = Math.max(0, Math.min(1, shownHp / max));
  text(ctx, 'HP', x + 24, y + 54, 18, '#d08020');
  ctx.fillStyle = '#303048';
  ctx.fillRect(x + 64, y + 54, 290, 18);
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x + 67, y + 57, 284, 12);
  ctx.fillStyle = frac > 0.5 ? '#40c860' : frac > 0.2 ? '#e8c030' : '#e84838';
  ctx.fillRect(x + 67, y + 57, 284 * frac, 12);
  if (mine) {
    text(ctx, `${Math.max(0, Math.round(shownHp))} / ${max}`, x + w - 30, y + 80, 22, '#202030', 'right');
    ctx.fillStyle = '#303048';
    ctx.fillRect(x + 64, y + 108, 290, 8);
    ctx.fillStyle = '#48a8f8';
    ctx.fillRect(x + 66, y + 110, 286 * Math.max(0, Math.min(1, exp)), 4);
  }
}

/** 기술 속성 꼬리표 색 */
export const typeColor = (t: Type) => TYPE_COLOR[t];
export const moveType = (id: string) => MOVES[id].type;

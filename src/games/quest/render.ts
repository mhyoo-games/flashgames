// 주먹밥 용사전 그리기: 16×16 도트 타일을 3배로, 인물도 도트로.
import { BW, BH, type Battle, type Unit } from './battle.ts';
import { LOOKS, MAPS, NPCS, type Terrain } from './data.ts';
import { blit, cached, monster, person, type Dir, type Look } from './pixel.ts';
import { tileAt, type WorldState } from './world.ts';

export const W = 960;
export const H = 540;
export const T = 48; // 화면에서 한 칸
type Ctx = CanvasRenderingContext2D;

// ---------------- 타일 ----------------
const hash = (x: number, y: number) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

const tiles = new Map<string, HTMLCanvasElement>();
function cachedTile(key: string, draw: (p: (x: number, y: number, w: number, h: number, c: string) => void) => void) {
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

const PAL = {
  grass: ['#6cc24a', '#58a83a', '#8ad860'],
  forest: ['#4a9a3c', '#3a7a2e', '#6ab84e'],
  path: ['#dcbc7c', '#c4a060', '#ecd49a'],
  cave: ['#7a6a62', '#62544e', '#948478'],
};

function ground(p: (x: number, y: number, w: number, h: number, c: string) => void, pal: string[], v: number) {
  p(0, 0, 16, 16, pal[0]);
  for (let i = 0; i < 7; i++) {
    const a = hash(i * 31 + v * 7, v * 13 + i);
    const b = hash(v * 17 + i, i * 7 + 3);
    p(Math.floor(a * 15), Math.floor(b * 15), 1, 1, i % 2 ? pal[1] : pal[2]);
    if (i % 3 === 0) p(Math.floor(a * 14), Math.floor(b * 14) + 1, 2, 1, pal[1]);
  }
}

function tree(p: (x: number, y: number, w: number, h: number, c: string) => void, dark: boolean) {
  const c1 = dark ? '#2e6a30' : '#3a8a3a';
  const c2 = dark ? '#1e4a22' : '#286a2c';
  const c3 = dark ? '#4a9a44' : '#5ab84c';
  p(6, 11, 4, 5, '#7a4a2a');
  p(6, 11, 1, 5, '#9a6a3a');
  p(2, 3, 12, 9, c1);
  p(3, 1, 10, 2, c1);
  p(1, 5, 14, 5, c1);
  p(3, 10, 10, 2, c2);
  p(1, 9, 2, 1, c2);
  p(13, 9, 2, 1, c2);
  p(4, 2, 4, 2, c3);
  p(3, 4, 2, 2, c3);
  p(9, 5, 2, 1, c3);
  p(5, 7, 2, 1, c2);
  p(10, 3, 1, 1, c3);
}

function drawTile(ctx: Ctx, t: string, x: number, y: number, terrain: Terrain, time: number, w: WorldState, sx: number, sy: number) {
  const v = Math.floor(hash(x, y) * 4);
  const base = terrain === 'cave' ? 'cave' : terrain === 'forest' ? 'forest' : 'grass';
  const g = (k: string) => cachedTile(`${base}${k}${v}`, (p) => ground(p, PAL[base], v));
  let cv: HTMLCanvasElement;
  const put = (c: HTMLCanvasElement) => ctx.drawImage(c, sx, sy, T, T);
  switch (t) {
    case '.':
    case 'C':
    case 'S':
    case 'b':
    case 'F':
      put(g(''));
      if (t === 'b') put(cachedTile('bush', (p) => {
        p(2, 6, 12, 8, '#3a8a3a');
        p(3, 5, 10, 2, '#3a8a3a');
        p(3, 6, 4, 2, '#5ab84c');
        p(2, 12, 12, 2, '#286a2c');
        p(9, 8, 2, 2, '#e84a5a');
      }));
      if (t === 'F') put(cachedTile('fence', (p) => {
        for (const fx of [1, 7, 13]) p(fx, 5, 2, 10, '#a8743a');
        p(0, 7, 16, 2, '#c8945a');
        p(0, 11, 16, 2, '#c8945a');
      }));
      if (t === 'S') put(cachedTile('sign', (p) => {
        p(7, 9, 2, 7, '#7a4a2a');
        p(2, 3, 12, 7, '#c8945a');
        p(2, 3, 12, 1, '#e8b47a');
        p(4, 5, 8, 1, '#6a3a1a');
        p(4, 7, 6, 1, '#6a3a1a');
      }));
      if (t === 'C') {
        const open = w.opened.includes(`${w.map}:${x}:${y}`);
        put(cachedTile(`chest${open}`, (p) => {
          p(2, 6, 12, 9, '#8a4a1a');
          p(2, open ? 4 : 5, 12, open ? 2 : 4, open ? '#3a1a0a' : '#b0602a');
          p(2, 9, 12, 1, '#ffd24a');
          p(7, 8, 2, 3, '#ffd24a');
          p(2, 14, 12, 1, '#5a2a0a');
        }));
      }
      return;
    case ',':
      put(g(''));
      put(cachedTile(`flower${v}`, (p) => {
        const cols = ['#ffffff', '#ffe04a', '#ff8ab0'];
        for (let i = 0; i < 4; i++) {
          const fx = Math.floor(hash(i, v) * 13) + 1;
          const fy = Math.floor(hash(v, i + 9) * 13) + 1;
          p(fx, fy, 2, 2, cols[(i + v) % 3]);
          p(fx, fy + 2, 1, 1, '#3a8a3a');
        }
      }));
      return;
    case 'T':
      put(g(''));
      put(cachedTile(`tree${terrain}`, (p) => tree(p, terrain === 'forest')));
      return;
    case '~': {
      const f = Math.floor(time * 2 + (x + y) * 0.5) % 2;
      put(cachedTile(`water${f}`, (p) => {
        p(0, 0, 16, 16, '#3a8ae0');
        p(0, 0, 16, 1, '#5aa8f0');
        for (const [wx, wy] of [[2 + f * 2, 4], [9 - f * 2, 10], [11, 3 + f]]) p(wx, wy, 4, 1, '#a8d8ff');
      }));
      return;
    }
    case '=':
    case 'B':
      if (terrain === 'cave') {
        put(cachedTile(`cavepath${v}`, (p) => ground(p, ['#a08a6a', '#8a765a', '#b8a080'], v)));
        return;
      }
      put(cachedTile(`path${v}`, (p) => ground(p, PAL.path, v)));
      return;
    case '_':
    case 'V':
    case 'L':
      put(g(''));
      if (t === 'V' && !w.flags.vines)
        put(cachedTile('vines', (p) => {
          for (let i = 0; i < 6; i++) p(i * 3, 0, 2, 16, i % 2 ? '#2e7a2e' : '#4a9a3a');
          for (let i = 0; i < 5; i++) p(1 + i * 3, 3 + (i % 3) * 4, 3, 2, '#6ac85a');
        }));
      if (t === 'L') {
        put(cachedTile('altar', (p) => {
          p(1, 10, 14, 6, '#8a8090');
          p(1, 10, 14, 1, '#b0a8b8');
        }));
        if (!w.flags.bell) put(bellCanvas());
      }
      return;
    case '#':
      cv = cachedTile(`rock${terrain}${v}`, (p) => {
        const c = terrain === 'cave' ? ['#4a3e48', '#3a2e38', '#6a5a66'] : ['#8a8a8a', '#6a6a6a', '#aaaaaa'];
        p(0, 0, 16, 16, c[0]);
        for (let i = 0; i < 4; i++) {
          const bx = (i % 2) * 8 + (v % 2) * 2;
          const by = Math.floor(i / 2) * 8;
          p(bx, by, 7, 7, c[0]);
          p(bx, by, 7, 1, c[2]);
          p(bx, by + 6, 7, 1, c[1]);
          p(bx + 6, by, 1, 7, c[1]);
        }
      });
      put(cv);
      return;
    case 'X':
      put(cachedTile('cavehole', (p) => {
        p(0, 0, 16, 16, '#4a3e48');
        p(2, 3, 12, 13, '#120a10');
        p(3, 2, 10, 1, '#120a10');
        p(2, 3, 1, 13, '#6a5a66');
      }));
      return;
    case 'R':
      put(cachedTile(`roof${y % 2}`, (p) => {
        p(0, 0, 16, 16, '#c8483a');
        for (let r = 0; r < 4; r++) {
          p(0, r * 4 + 3, 16, 1, '#8a2a24');
          for (let k = 0; k < 4; k++) p(k * 4 + ((r + y) % 2) * 2, r * 4, 1, 3, '#a8382e');
          p(0, r * 4, 16, 1, '#e06a5a');
        }
      }));
      return;
    case 'H':
    case 'D':
      put(cachedTile(`wall${t}${x % 2}`, (p) => {
        p(0, 0, 16, 16, '#ecdcb4');
        p(0, 0, 16, 2, '#8a5a32');
        p(0, 14, 16, 2, '#8a5a32');
        p(0, 0, 2, 16, '#a8743a');
        if (t === 'D') {
          p(4, 3, 8, 13, '#7a4422');
          p(5, 4, 6, 12, '#9a5a2e');
          p(10, 9, 1, 2, '#ffd24a');
        } else if (x % 2) {
          p(4, 4, 8, 7, '#5a3a22');
          p(5, 5, 6, 5, '#8ad0ff');
          p(5, 5, 3, 2, '#d8f0ff');
          p(8, 4, 1, 7, '#5a3a22');
        }
      }));
      return;
    case 'G':
      put(g(''));
      put(cachedTile('tower', (p) => {
        p(1, 1, 2, 15, '#8a5a32');
        p(13, 1, 2, 15, '#8a5a32');
        p(0, 0, 16, 3, '#a03a2e');
        p(0, 0, 16, 1, '#d05a4a');
        p(3, 13, 10, 3, '#9a9aa8');
        p(7, 3, 2, 2, '#c8b080');
      }));
      if (w.flags.clear1) put(bellCanvas(Math.sin(time * 3) > 0 ? 1 : 0));
      return;
    case 'M':
      put(cachedTile('market', (p) => {
        p(0, 0, 16, 16, PAL.path[0]);
        p(0, 6, 16, 10, '#a8743a');
        p(0, 6, 16, 2, '#d8a46a');
        for (const [ax, c] of [[2, '#e84a4a'], [6, '#ffd24a'], [10, '#7ad84a']] as [number, string][]) {
          p(ax, 3, 3, 3, c);
          p(ax, 3, 1, 1, '#ffffff');
        }
      }));
      return;
  }
  put(g(''));
}

function bellCanvas(swing = 0) {
  return cachedTile(`bell${swing}`, (p) => {
    const o = swing;
    p(7, 3, 2, 1, '#8a6a1a');
    p(5 + o, 4, 6, 2, '#ffd24a');
    p(4 + o, 6, 8, 3, '#ffd24a');
    p(3 + o, 9, 10, 2, '#e8b030');
    p(5 + o, 5, 1, 4, '#fff2a8');
    p(7 + o, 11, 2, 1, '#8a6a1a');
  });
}

// ---------------- 인물 ----------------
export function personSprite(lookId: string | Look, dir: Dir, frame: number) {
  const look = typeof lookId === 'string' ? LOOKS[lookId] : lookId;
  const key = typeof lookId === 'string' ? lookId : JSON.stringify(lookId);
  const d = dir === 'left' ? 'right' : dir;
  return { cv: cached(`p:${key}:${d}:${frame}`, () => person(look, d, frame)), flip: dir === 'left' };
}

// ---------------- 필드 ----------------
export interface View {
  /** 화면에 그릴 주인공 위치 (칸, 소수 = 걷는 중) */
  px: number;
  py: number;
  dir: Dir;
  /** 따라오는 동료 위치 */
  trail: { x: number; y: number; dir: Dir }[];
}

export function renderWorld(ctx: Ctx, w: WorldState, view: View, time: number) {
  const m = MAPS[w.map];
  const cols = m.rows[0].length;
  const rows = m.rows.length;
  // 카메라: 주인공을 가운데 두되 지도 밖은 안 보이게
  let cx = view.px * T + T / 2 - W / 2;
  let cy = view.py * T + T / 2 - H / 2;
  cx = Math.max(0, Math.min(cols * T - W, cx));
  cy = Math.max(0, Math.min(rows * T - H, cy));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const x0 = Math.floor(cx / T);
  const y0 = Math.floor(cy / T);
  for (let y = y0; y <= y0 + Math.ceil(H / T); y++)
    for (let x = x0; x <= x0 + Math.ceil(W / T); x++) {
      if (y >= rows || x >= cols) continue;
      drawTile(ctx, tileAt(w.map, x, y), x, y, m.terrain, time, w, Math.round(x * T - cx), Math.round(y * T - cy));
    }
  // 사람들 (위쪽부터 그려야 겹침이 자연스럽다)
  const frame = Math.floor(time * 3.2) % 2;
  const people: { x: number; y: number; draw: () => void }[] = [];
  for (const n of NPCS) {
    if (n.map !== w.map || n.hidden?.(w.flags)) continue;
    // 가만히 있는 사람도 가끔 고개를 돌린다
    const look = n.dir ?? (['down', 'left', 'down', 'right'] as Dir[])[Math.floor(time / 2.3 + n.x) % 4];
    people.push({ x: n.x, y: n.y, draw: () => sprite(ctx, n.look, look, n.id === 'master' ? 0 : frame, n.x * T - cx, n.y * T - cy, n.look === 'bear' ? 3.6 : 3) });
  }
  w.party.slice(1).forEach((mem, i) => {
    const t = view.trail[i] ?? { x: view.px, y: view.py, dir: view.dir };
    people.push({ x: t.x, y: t.y - 0.01, draw: () => sprite(ctx, mem.id, t.dir, frame, t.x * T - cx, t.y * T - cy, 3) });
  });
  people.push({ x: view.px, y: view.py, draw: () => sprite(ctx, 'haru', view.dir, frame, view.px * T - cx, view.py * T - cy, 3) });
  people.sort((a, b) => a.y - b.y);
  for (const p of people) p.draw();
}

function sprite(ctx: Ctx, look: string, dir: Dir, frame: number, sx: number, sy: number, scale: number) {
  const { cv, flip } = personSprite(look, dir, frame);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx + T / 2, sy + T - 4, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  blit(ctx, cv, sx + T / 2, sy + T + 2, scale, flip);
}

/** 옛날 게임 같은 검은 창 (흰 테두리) */
export function windowBox(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(8,8,24,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  ctx.strokeStyle = '#7a7a9a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 9, y + 9, w - 18, h - 18);
}

export const FONT = '"DungGeunMo", "Galmuri11", "NeoDunggeunmo", ui-monospace, "Malgun Gothic", monospace';

export function text(ctx: Ctx, s: string, x: number, y: number, size = 22, color = '#ffffff', align: CanvasTextAlign = 'left') {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(s, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** 대화창: 글자가 한 자씩 나온다 */
export function dialogBox(ctx: Ctx, who: string, say: string, shown: number, time: number) {
  const bx = 40;
  const by = H - 170;
  windowBox(ctx, bx, by, W - 80, 150);
  let y = by + 24;
  if (who) {
    text(ctx, who, bx + 30, y, 22, '#ffd24a');
    y += 32;
  }
  const visible = say.slice(0, Math.floor(shown));
  // 줄바꿈 (폭에 맞게)
  ctx.font = `bold 22px ${FONT}`;
  const lines: string[] = [];
  let cur = '';
  for (const ch of visible) {
    if (ctx.measureText(cur + ch).width > W - 160) {
      lines.push(cur);
      cur = '';
    }
    cur += ch;
  }
  lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => text(ctx, l, bx + 30, y + i * 30));
  if (shown >= say.length && Math.floor(time * 3) % 2) text(ctx, '▼', W - 90, H - 52, 20);
}

export function mapBanner(ctx: Ctx, name: string, t: number) {
  if (t > 2) return;
  ctx.globalAlpha = Math.min(1, (2 - t) * 2);
  windowBox(ctx, W / 2 - 150, 24, 300, 60);
  text(ctx, name, W / 2, 42, 24, '#ffffff', 'center');
  ctx.globalAlpha = 1;
}

// ---------------- 전투 ----------------
export const BT = 64; // 전투 한 칸
export const BOX = (W - BW * BT) / 2;
export const BOY = 134;

export interface Fx {
  uid: number;
  text: string;
  color: string;
  t: number;
}
export interface BattleView {
  /** 화면 위치 (칸, 부드럽게) */
  pos: Map<number, { x: number; y: number }>;
  /** 공격할 때 앞으로 내딛기 */
  lunge: Map<number, { dx: number; dy: number; t: number }>;
  flash: Map<number, number>;
  fx: Fx[];
  highlight: [number, number][];
  hlColor: string;
  cursor?: [number, number];
  message: string;
}

export function renderBattle(ctx: Ctx, b: Battle, v: BattleView, terrain: Terrain, time: number, active?: Unit) {
  // 배경
  const sky = terrain === 'cave' ? ['#1a1220', '#3a2a3a'] : terrain === 'forest' ? ['#2a5a3a', '#4a8a4a'] : ['#5ab0f0', '#a8e0ff'];
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, sky[0]);
  gr.addColorStop(0.45, sky[1]);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  // 먼 산·나무 실루엣
  ctx.fillStyle = terrain === 'cave' ? '#2a1e2a' : terrain === 'forest' ? '#1e4a2a' : '#6aa860';
  for (let x = 0; x < W; x += 24) {
    const h = 40 + Math.floor(hash(x, 3) * 50);
    ctx.fillRect(x, BOY - h + 10, 24, h);
  }
  // 칸
  const base = terrain === 'cave' ? 'cave' : terrain === 'forest' ? 'forest' : 'grass';
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      const vv = Math.floor(hash(x + 40, y) * 4);
      ctx.drawImage(cachedTile(`${base}${vv}b`, (p) => ground(p, PAL[base], vv)), BOX + x * BT, BOY + y * BT, BT, BT);
      if ((x + y) % 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(BOX + x * BT, BOY + y * BT, BT, BT);
      }
    }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= BW; x++) {
    ctx.beginPath();
    ctx.moveTo(BOX + x * BT, BOY);
    ctx.lineTo(BOX + x * BT, BOY + BH * BT);
    ctx.stroke();
  }
  for (let y = 0; y <= BH; y++) {
    ctx.beginPath();
    ctx.moveTo(BOX, BOY + y * BT);
    ctx.lineTo(BOX + BW * BT, BOY + y * BT);
    ctx.stroke();
  }
  // 갈 수 있는 칸·노릴 수 있는 칸
  for (const [x, y] of v.highlight) {
    ctx.fillStyle = v.hlColor;
    ctx.fillRect(BOX + x * BT + 3, BOY + y * BT + 3, BT - 6, BT - 6);
  }
  // 장애물
  for (const [x, y] of b.rocks) {
    const cv = cachedTile(terrain === 'grass' ? 'treegrass' : terrain === 'forest' ? 'treeforest' : 'boulder', (p) => {
      if (terrain === 'cave') {
        p(2, 5, 12, 10, '#6a5a66');
        p(3, 4, 9, 2, '#8a7a86');
        p(2, 13, 12, 2, '#3a2e38');
      } else tree(p, terrain === 'forest');
    });
    ctx.drawImage(cv, BOX + x * BT, BOY + y * BT - 8, BT, BT);
  }
  // 유닛 (위 칸부터)
  const list = [...b.units].sort((a, c) => (v.pos.get(a.uid)?.y ?? a.y) - (v.pos.get(c.uid)?.y ?? c.y));
  for (const u of list) {
    const p = v.pos.get(u.uid) ?? { x: u.x, y: u.y };
    const fl = v.flash.get(u.uid) ?? 0;
    if (u.hp <= 0 && fl <= 0) continue;
    if (fl > 0 && Math.floor(fl * 20) % 2 === 0) continue;
    const ln = v.lunge.get(u.uid);
    const k = ln ? Math.sin(Math.min(1, ln.t / 0.28) * Math.PI) * 0.35 : 0;
    const sx = BOX + (p.x + (ln ? ln.dx * k : 0)) * BT + BT / 2;
    const sy = BOY + (p.y + (ln ? ln.dy * k : 0)) * BT + BT - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2, u.boss ? 30 : 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    const frame = Math.floor(time * 3 + u.uid) % 2;
    const scale = u.boss ? 5 : 3.6;
    const bob = u.fly ? Math.sin(time * 6 + u.uid) * 6 - 10 : 0;
    if (u.look) {
      const { cv } = personSprite(u.look, u.side === 'hero' ? 'right' : 'right', frame);
      blit(ctx, cv, sx, sy + bob, scale, u.side === 'foe');
    } else if (u.shape && u.colors) {
      const cv = cached(`m:${u.defId}:${frame}`, () => monster(u.shape!, u.colors![0], u.colors![1], frame));
      blit(ctx, cv, sx, sy + bob, scale);
    }
    if (u.hp <= 0) continue;
    // 작은 체력 막대
    const bw = 44;
    ctx.fillStyle = '#000';
    ctx.fillRect(sx - bw / 2 - 1, sy + 2, bw + 2, 6);
    ctx.fillStyle = u.side === 'hero' ? '#5ae07a' : '#ff6a5a';
    ctx.fillRect(sx - bw / 2, sy + 3, (bw * u.hp) / u.maxHp, 4);
  }
  // 지금 차례 표시
  if (active && active.hp > 0) {
    const p = v.pos.get(active.uid) ?? active;
    const sx = BOX + p.x * BT + BT / 2;
    const sy = BOY + p.y * BT - (active.boss ? 34 : 12) + Math.sin(time * 8) * 4;
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(sx - 9, sy - 10);
    ctx.lineTo(sx + 9, sy - 10);
    ctx.lineTo(sx, sy);
    ctx.fill();
  }
  // 커서
  if (v.cursor) {
    const [x, y] = v.cursor;
    ctx.strokeStyle = Math.floor(time * 4) % 2 ? '#ffffff' : '#ffd24a';
    ctx.lineWidth = 4;
    ctx.strokeRect(BOX + x * BT + 2, BOY + y * BT + 2, BT - 4, BT - 4);
  }
  // 숫자 튀어오르기
  for (const f of v.fx) {
    const p = v.pos.get(f.uid);
    if (!p) continue;
    const sx = BOX + p.x * BT + BT / 2;
    const sy = BOY + p.y * BT - 4 - Math.min(f.t, 0.4) * 60;
    ctx.globalAlpha = Math.max(0, Math.min(1, (1.2 - f.t) * 3));
    text(ctx, f.text, sx, sy, 28, f.color, 'center');
    ctx.globalAlpha = 1;
  }
  // 위: 동료 상태 창
  const heroes = b.units.filter((u) => u.side === 'hero');
  heroes.forEach((u, i) => {
    const x = 20 + i * 250;
    windowBox(ctx, x, 12, 240, 112);
    text(ctx, u.name, x + 22, 26, 22, u === active ? '#ffd24a' : '#ffffff');
    text(ctx, `HP ${String(u.hp).padStart(3)}/${u.maxHp}`, x + 22, 56, 20, u.hp < u.maxHp * 0.3 ? '#ff7a6a' : '#ffffff');
    text(ctx, `MP ${String(u.mp).padStart(3)}/${u.maxMp}`, x + 22, 84, 20, '#9ad0ff');
  });
  const foes = b.alive('foe');
  windowBox(ctx, W - 290, 12, 270, 112);
  foes.slice(0, 3).forEach((u, i) => text(ctx, u.name, W - 266, 26 + i * 28, 20, u === active ? '#ffd24a' : '#ffffff'));
  if (foes.length > 3) text(ctx, `외 ${foes.length - 3}`, W - 80, 82, 18);
  // 아래: 메시지
  windowBox(ctx, 20, H - 76, W - 40, 64);
  if (v.message) text(ctx, v.message, 46, H - 56, 22);
}

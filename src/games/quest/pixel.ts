// 도트 그림: 16×16 칸에 부품(머리·모자·옷·소품)을 칠하고, 자동으로 외곽선과 명암을 넣는다.
// 한 번 만든 그림은 캔버스로 보관해 두고 크게 늘려 그린다 (픽셀이 흐려지지 않게).

export const GRID = 18; // 외곽선 자리까지 18칸
export type Dir = 'down' | 'up' | 'left' | 'right';

export class Pix {
  readonly c: (string | null)[] = new Array(GRID * GRID).fill(null);
  /** 명암을 넣지 않는 칸 (눈·입 같은 것) */
  readonly flat = new Set<number>();
  set(x: number, y: number, col: string | null, flat = false) {
    x = Math.round(x) + 1;
    y = Math.round(y) + 1;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    this.c[y * GRID + x] = col;
    if (flat) this.flat.add(y * GRID + x);
    else this.flat.delete(y * GRID + x);
  }
  get(x: number, y: number) {
    x += 1;
    y += 1;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
    return this.c[y * GRID + x];
  }
  rect(x: number, y: number, w: number, h: number, col: string, flat = false) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col, flat);
  }
  /** 둥근 덩어리 */
  disc(cx: number, cy: number, rx: number, ry: number, col: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, col);
      }
  }
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function tone(c: string, amt: number) {
  const [r, g, b] = hex(c);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** 외곽선 + 위쪽 밝게 · 아래쪽 어둡게 → 캔버스 */
export function bake(p: Pix, outline = '#22141c'): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = GRID;
  const ctx = cv.getContext('2d')!;
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID && y < GRID && p.c[y * GRID + x] !== null;
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      const col = p.c[i];
      if (col) {
        let out = col;
        if (!p.flat.has(i)) {
          if (!filled(x, y - 1) || !filled(x - 1, y)) out = tone(col, 34);
          else if (!filled(x, y + 1) || !filled(x + 1, y)) out = tone(col, -38);
        }
        ctx.fillStyle = out;
        ctx.fillRect(x, y, 1, 1);
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        ctx.fillStyle = outline;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  return cv;
}

// ---------------- 사람(꼬마 머리 큰 체형) ----------------
export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'spiky' | 'twin' | 'bald' | 'short' | 'long' | 'bun' | 'none';
  eyes?: 'dot' | 'sleepy' | 'mask' | 'glow';
  top: string;
  trim?: string;
  pants: string;
  hat?: 'headband' | 'witch' | 'bandana' | 'hood' | 'cap' | 'crown';
  hatColor?: string;
  beard?: string;
  prop?: 'staff' | 'abacus' | 'club' | 'ladle';
  ears?: 'raccoon' | 'bear' | 'cat';
  /** 치마·도포처럼 긴 옷 */
  robe?: boolean;
  belt?: string;
}

export function person(L: Look, dir: Dir, frame: number): Pix {
  const p = new Pix();
  const side = dir === 'left' || dir === 'right';
  const back = dir === 'up';
  const step = frame % 2 === 1;
  // 다리
  if (!L.robe) {
    const lift = (a: boolean) => (step === a ? 1 : 0);
    if (side) {
      p.rect(step ? 5 : 7, 13, 2, 3 - (step ? 1 : 0), L.pants);
      p.rect(step ? 8 : 6, 13, 2, 3, L.pants);
      p.rect(step ? 8 : 6, 15, 3, 1, '#4a3428');
    } else {
      p.rect(5, 13, 2, 3 - lift(true), L.pants);
      p.rect(9, 13, 2, 3 - lift(false), L.pants);
      p.rect(5, 15 - lift(true), 2, 1, '#4a3428');
      p.rect(9, 15 - lift(false), 2, 1, '#4a3428');
    }
  } else {
    p.rect(4, 12, 8, 3, L.top);
    p.rect(3, 14, 10, 1, L.top);
    p.rect(step ? 4 : 9, 15, 3, 1, '#4a3428');
  }
  // 몸통
  p.rect(4, 10, 8, 3, L.top);
  if (L.trim && !back) {
    p.set(7, 10, L.trim);
    p.set(8, 10, L.trim);
    p.set(7, 11, L.trim);
    p.set(8, 11, L.trim);
  }
  if (L.belt) p.rect(4, 12, 8, 1, L.belt);
  // 팔 (걸을 때 흔들기)
  const sw = step ? 1 : 0;
  if (side) {
    p.rect(7 - sw, 10, 2, 3, L.top);
    p.set(7 - sw, 13, L.skin);
  } else {
    p.rect(3, 10 + sw, 1, 2, L.top);
    p.rect(12, 11 - sw, 1, 2, L.top);
    p.set(3, 12 + sw, L.skin);
    p.set(12, 13 - sw, L.skin);
  }
  // 귀 (동물 종족)
  if (L.ears) {
    const ec = L.ears === 'raccoon' ? L.hair : L.hair;
    p.disc(4, 1.5, 1.4, 1.4, ec);
    p.disc(11, 1.5, 1.4, 1.4, ec);
    if (L.ears === 'cat') {
      p.set(3, 0, ec);
      p.set(12, 0, ec);
    }
  }
  // 머리
  p.disc(7.5, 5.5, 5, 4.6, L.skin);
  // 머리카락
  const H = L.hair;
  switch (L.hairStyle) {
    case 'spiky':
      p.rect(3, 1, 10, 3, H);
      for (const x of [3, 6, 9, 12]) p.set(x, 0, H);
      p.set(2, 3, H);
      p.set(13, 3, H);
      break;
    case 'twin':
      p.rect(3, 1, 10, 3, H);
      p.disc(1.5, 7, 1.3, 2.5, H);
      p.disc(13.5, 7, 1.3, 2.5, H);
      break;
    case 'bald':
      p.rect(3, 4, 1, 3, H);
      p.rect(12, 4, 1, 3, H);
      break;
    case 'short':
      p.rect(3, 1, 10, 3, H);
      p.rect(3, 4, 1, 2, H);
      p.rect(12, 4, 1, 2, H);
      break;
    case 'long':
      p.rect(3, 1, 10, 3, H);
      p.rect(2, 3, 2, 7, H);
      p.rect(12, 3, 2, 7, H);
      break;
    case 'bun':
      p.rect(3, 1, 10, 3, H);
      p.disc(7.5, 0, 2, 1.2, H);
      break;
    case 'none':
      break;
  }
  if (back) {
    // 뒤통수
    if (L.hairStyle !== 'bald') p.disc(7.5, 5, 5, 4.2, H);
  } else {
    // 얼굴
    const ex = side ? (dir === 'right' ? [9, 12] : [3, 6]) : [5, 10];
    const eyes = L.eyes ?? 'dot';
    for (const x of side ? [ex[1] - (dir === 'right' ? 0 : 3)] : ex) {
      if (eyes === 'sleepy') p.set(x, 7, '#3a2028', true);
      else if (eyes === 'glow') {
        p.set(x, 6, '#ffe14a', true);
        p.set(x, 7, '#ff8a1a', true);
      } else {
        p.set(x, 6, '#1a1020', true);
        p.set(x, 7, '#1a1020', true);
        p.set(x, 6 - 0, '#1a1020', true);
      }
    }
    if (eyes === 'mask') {
      for (let x = 3; x <= 12; x++) if (!side || (dir === 'right' ? x > 6 : x < 9)) p.set(x, 6, '#3a2a30', true);
      for (const x of side ? [dir === 'right' ? 11 : 4] : [5, 10]) p.set(x, 6, '#ffffff', true);
    }
    // 볼
    if (!side) {
      p.set(4, 8, '#ff9aa8', true);
      p.set(11, 8, '#ff9aa8', true);
    }
    if (L.beard) {
      p.rect(side ? (dir === 'right' ? 6 : 4) : 4, 8, side ? 6 : 8, 2, L.beard);
      p.rect(side ? (dir === 'right' ? 7 : 5) : 6, 10, 4, 2, L.beard);
      if (!side) {
        p.rect(4, 4, 3, 1, L.beard);
        p.rect(9, 4, 3, 1, L.beard);
      }
    }
  }
  // 모자
  const HC = L.hatColor ?? '#d23a3a';
  switch (L.hat) {
    case 'headband':
      p.rect(3, 3, 10, 1, HC);
      if (back || side) {
        const tx = dir === 'left' ? 13 : 1;
        p.rect(back ? 9 : tx, 4, 2, 1, HC);
        p.set(back ? 10 : tx + (dir === 'left' ? 1 : -1), 5, HC);
      }
      break;
    case 'witch':
      p.rect(1, 3, 14, 1, HC);
      p.rect(4, 1, 8, 2, HC);
      p.rect(6, -1, 4, 2, HC);
      p.set(10, -2, HC);
      p.set(11, -2, HC);
      p.set(7, 2, '#ffd94a', true);
      break;
    case 'bandana':
      p.rect(3, 1, 10, 3, HC);
      p.set(4, 2, '#ffffff', true);
      p.set(10, 1, '#ffffff', true);
      break;
    case 'hood':
      p.disc(7.5, 4.5, 5.6, 5, HC);
      if (!back) p.disc(7.5, 6.5, 3.8, 3.2, L.skin);
      if (!back) {
        p.set(6, 6, L.eyes === 'glow' ? '#ffe14a' : '#1a1020', true);
        p.set(9, 6, L.eyes === 'glow' ? '#ffe14a' : '#1a1020', true);
      }
      p.rect(3, 10, 10, 5, HC);
      break;
    case 'cap':
      p.rect(3, 1, 10, 2, HC);
      if (!back) p.rect(side ? (dir === 'right' ? 9 : 1) : 4, 3, side ? 6 : 8, 1, HC);
      break;
    case 'crown':
      p.rect(4, 1, 8, 2, HC);
      for (const x of [4, 7, 8, 11]) p.set(x, 0, HC);
      break;
  }
  // 소품
  if (L.prop && !back) {
    const px = dir === 'left' ? 1 : 14;
    if (L.prop === 'staff') {
      p.rect(px, 6, 1, 10, '#8a5a2a');
      p.disc(px, 5, 1, 1, '#7ad8ff');
    } else if (L.prop === 'club') {
      p.rect(px, 9, 1, 6, '#7a4a22');
      p.disc(px, 8, 1.4, 1.8, '#8a5a2a');
    } else if (L.prop === 'abacus') {
      p.rect(px - 1, 10, 3, 4, '#a0703a');
      p.set(px, 11, '#ffd94a', true);
      p.set(px, 13, '#ffd94a', true);
    } else if (L.prop === 'ladle') {
      p.rect(px, 7, 1, 7, '#b0b0b8');
      p.disc(px, 6, 1.2, 1, '#c8c8d0');
    }
  }
  return p;
}

// ---------------- 몬스터 ----------------
export type MonsterShape = 'jelly' | 'shroom' | 'bat' | 'rock' | 'bird';

export function monster(shape: MonsterShape, col: string, col2: string, frame: number): Pix {
  const p = new Pix();
  const b = frame % 2;
  const eye = (x: number, y: number) => {
    p.set(x, y, '#ffffff', true);
    p.set(x, y + 1, '#1a1020', true);
  };
  switch (shape) {
    case 'jelly': {
      // 물방울 모양 젤리: 출렁출렁
      const sq = b ? 0.6 : 0;
      p.disc(7.5, 10.5 + sq * 0.5, 6 + sq, 4.5 - sq, col);
      p.disc(7.5, 6.5 + sq, 3.5, 3.5, col);
      p.set(7, 2 + b, col);
      p.set(8, 3 + b, col);
      p.set(5, 7 + b, '#ffffff', true);
      eye(5, 9);
      eye(10, 9);
      p.rect(7, 12, 2, 1, col2, true);
      break;
    }
    case 'shroom':
      p.disc(7.5, 5, 7, 4, col);
      for (const [x, y] of [[4, 3], [9, 2], [11, 5], [6, 6]]) p.disc(x, y, 0.8, 0.8, '#fff3e0');
      p.rect(4, 8, 8, 6, '#fff0d8');
      eye(5, 9);
      eye(10, 9);
      p.rect(6, 12, 4, 1, '#c24a5a', true);
      p.rect(b ? 4 : 5, 14, 3, 2, col2);
      p.rect(b ? 10 : 9, 14, 3, 2, col2);
      break;
    case 'bat':
      p.disc(7.5, 8, 3.5, 3.2, col);
      p.set(5, 4, col);
      p.set(10, 4, col);
      for (let i = 0; i < 6; i++) {
        const y = b ? 6 + i * 0.6 : 9 - i * 0.6;
        p.rect(3 - i, Math.round(y), 1, 3, col2);
        p.rect(12 + i, Math.round(y), 1, 3, col2);
      }
      eye(6, 7);
      eye(9, 7);
      p.set(7, 10, '#ffffff', true);
      p.set(9, 10, '#ffffff', true);
      break;
    case 'rock':
      p.disc(7.5, 9, 6.5, 5.5, col);
      p.disc(4, 5, 2, 2, col);
      p.rect(2, 9, 2, 2, col2);
      p.rect(12, 9, 2, 2, col2);
      p.set(6, 6, col2);
      p.set(10, 12, col2);
      eye(5, 8);
      eye(10, 8);
      p.rect(6, 11, 4, 1, '#3a2a2a', true);
      break;
    case 'bird':
      p.disc(7.5, 8, 4.5, 5, col);
      p.disc(7.5, 4, 3, 2.6, col);
      p.rect(9, 4, 3, 1, '#ffb02a');
      p.rect(9, 5, 2, 1, '#ffb02a');
      p.set(8, 3, '#ffe14a', true);
      for (let i = 0; i < 5; i++) {
        p.rect(2 - (b ? 0 : 1), 6 + i, 2, 1, col2);
        p.rect(13 + (b ? 0 : 1), 6 + i, 2, 1, col2);
      }
      p.rect(5, 13, 1, 3, '#ffb02a');
      p.rect(9, 13, 1, 3, '#ffb02a');
      break;
  }
  return p;
}

// ---------------- 보관 ----------------
const cache = new Map<string, HTMLCanvasElement>();
export function cached(key: string, make: () => Pix): HTMLCanvasElement {
  let cv = cache.get(key);
  if (!cv) {
    cv = bake(make());
    cache.set(key, cv);
  }
  return cv;
}

/** (x,y)를 발 가운데로 두고 scale배로 그리기 */
export function blit(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, scale: number, flip = false) {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(cv, Math.round((-GRID / 2) * scale), Math.round(-(GRID - 1) * scale), GRID * scale, GRID * scale);
  ctx.restore();
}

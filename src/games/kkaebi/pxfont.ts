// 도트 글씨: 도트 글꼴 「갈무리」(SIL OFL)를 원래 크기(8·10·12·15px)로 찍고 칸 단위(×1~3)로 키운다.
// 가장자리 흐림을 없애 옛 휴대용 게임기 화면처럼 또박또박하게 보인다.
// 글꼴을 아직 못 불러왔으면 보통 글씨로 쓴다.

/** [글꼴 이름, 원래 크기] */
const FACES: [string, number][] = [
  ['Galmuri7', 8],
  ['Galmuri9', 10],
  ['Galmuri11', 12],
  ['Galmuri14', 15],
];
const FALLBACK = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export interface PxStyle {
  /** 화면에서의 글자 크기 (px) */
  size: number;
  color: string;
  /** 오른쪽 아래 그림자 색 */
  shadow?: string;
  /** 둘레 외곽선 색 */
  outline?: string;
}

let ready = false;
const cache = new Map<string, HTMLCanvasElement>();
if (typeof document !== 'undefined' && document.fonts) {
  Promise.all([...FACES.map(([f, b]) => document.fonts.load(`${b}px ${f}`, '가A')), document.fonts.load('bold 12px Galmuri11', '가A')])
    .then(() => {
      ready = FACES.every(([f, b]) => document.fonts.check(`${b}px ${f}`, '가'));
      cache.clear();
    })
    .catch(() => undefined);
}
export const pxReady = () => ready;

/** 화면 크기에 맞는 (글꼴, 원래 크기, 배율). 큰 글씨는 굵은 갈무리11을 두 배·세 배로 */
function pick(size: number): { face: string; base: number; cell: number } {
  if (size >= 30) return { face: 'bold Galmuri11', base: 12, cell: Math.max(3, Math.round(size / 12)) };
  if (size >= 22) return { face: 'bold Galmuri11', base: 12, cell: 2 };
  if (size >= 18) return { face: 'Galmuri9', base: 10, cell: 2 };
  if (size >= 15) return { face: 'Galmuri7', base: 8, cell: 2 };
  if (size >= 12) return { face: 'Galmuri11', base: 12, cell: 1 };
  return { face: 'Galmuri9', base: 10, cell: 1 };
}

const fontOf = (face: string, base: number) => (face.startsWith('bold ') ? `bold ${base}px ${face.slice(5)}` : `${base}px ${face}`);
let measure: CanvasRenderingContext2D | null = null;
const mctx = () => (measure ??= document.createElement('canvas').getContext('2d')!);

/** 화면에서의 글자 폭 */
export function pxWidth(s: string, size: number): number {
  const m = mctx();
  if (!ready) {
    m.font = `bold ${size}px ${FALLBACK}`;
    return m.measureText(s).width;
  }
  const p = pick(size);
  m.font = fontOf(p.face, p.base);
  return Math.ceil(m.measureText(s).width) * p.cell;
}

function rgb(col: string) {
  const n = parseInt(col.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 글자 한 줄을 작은 칸 그림으로 (키우기 전) */
function pxLine(s: string, st: PxStyle, face: string, base: number): HTMLCanvasElement {
  const key = `${s}|${face}|${st.color}|${st.shadow ?? ''}|${st.outline ?? ''}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const font = fontOf(face, base);
  const m = mctx();
  m.font = font;
  const w = Math.max(1, Math.ceil(m.measureText(s).width) + 2);
  const h = Math.ceil(base * 1.3) + 2;
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mc = mask.getContext('2d')!;
  mc.font = font;
  mc.textBaseline = 'top';
  mc.fillStyle = '#000';
  mc.fillText(s, 1, 1);
  const src = mc.getImageData(0, 0, w, h).data;
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = src[i * 4 + 3] > 127 ? 1 : 0;
  // 외곽선·그림자 자리 1칸씩 더
  const W2 = w + 2;
  const H2 = h + 2;
  cv = document.createElement('canvas');
  cv.width = W2;
  cv.height = H2;
  const c = cv.getContext('2d')!;
  const img = c.createImageData(W2, H2);
  const put = (x: number, y: number, col: number[]) => {
    const i = (y * W2 + x) * 4;
    img.data[i] = col[0];
    img.data[i + 1] = col[1];
    img.data[i + 2] = col[2];
    img.data[i + 3] = 255;
  };
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : on[y * w + x]);
  if (st.outline) {
    const o = rgb(st.outline);
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) if (!at(x, y) && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || at(x - 1, y - 1) || at(x + 1, y + 1) || at(x - 1, y + 1) || at(x + 1, y - 1))) put(x + 1, y + 1, o);
  } else if (st.shadow) {
    const o = rgb(st.shadow);
    for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) if (!at(x, y) && at(x - 1, y - 1)) put(x + 1, y + 1, o);
  }
  const f = rgb(st.color);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on[y * w + x]) put(x + 1, y + 1, f);
  c.putImageData(img, 0, 0);
  if (cache.size > 4000) cache.clear();
  cache.set(key, cv);
  return cv;
}

/** 캔버스에 도트 글씨 쓰기 (y는 글자 윗변) */
export function pxText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, st: PxStyle, align: CanvasTextAlign = 'left') {
  if (!s) return;
  if (!ready) {
    ctx.font = `bold ${st.size}px ${FALLBACK}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    if (st.outline || st.shadow) {
      ctx.fillStyle = st.outline ?? st.shadow!;
      ctx.fillText(s, x + 2, y + 2);
    }
    ctx.fillStyle = st.color;
    ctx.fillText(s, x, y);
    return;
  }
  const p = pick(st.size);
  const cv = pxLine(s, st, p.face, p.base);
  const k = p.cell;
  const w = (cv.width - 4) * k;
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right' || align === 'end') dx = x - w;
  // 원래 크기와 화면 크기가 조금 달라도 줄 위치가 맞도록 세로 가운데 맞춤
  const dy = y + (st.size - p.base * k) / 2;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(dx) - 2 * k, Math.round(dy) - 2 * k, cv.width * k, cv.height * k);
  ctx.imageSmoothingEnabled = smooth;
}

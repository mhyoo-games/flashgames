// 도토리 미로 그리기: 밤의 숲, 다람쥐, 고양이 네 마리
import { AcornMaze, COLS, DOOR, ROWS, type Cat, type Dir } from './engine.ts';

type Ctx = CanvasRenderingContext2D;
export const TILE = 30;
export const OX = 18;
export const OY = 15;
export const VIEW_W = 960;
export const VIEW_H = 540;

const px = (x: number) => OX + x * TILE + TILE / 2;
const py = (y: number) => OY + y * TILE + TILE / 2;

const ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2, none: 0 };

function drawWalls(ctx: Ctx, g: AcornMaze, flash: boolean) {
  const wall = (x: number, y: number) => y >= 0 && y < ROWS && x >= 0 && x < COLS && g.grid[y][x] === '#';
  ctx.fillStyle = flash ? '#e8f7d4' : '#2f6b3a';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!wall(x, y)) continue;
      const X = OX + x * TILE;
      const Y = OY + y * TILE;
      // 이웃한 벽과는 이어 붙여서 덤불처럼
      const l = wall(x - 1, y) ? 0 : 4;
      const r = wall(x + 1, y) ? 0 : 4;
      const t = wall(x, y - 1) ? 0 : 4;
      const b = wall(x, y + 1) ? 0 : 4;
      ctx.beginPath();
      ctx.roundRect(X + l, Y + t, TILE - l - r, TILE - t - b, [t && l ? 9 : 0, t && r ? 9 : 0, b && r ? 9 : 0, b && l ? 9 : 0]);
      ctx.fill();
    }
  }
  // 덤불 위 잎 무늬
  if (!flash) {
    ctx.fillStyle = '#3f8a4b';
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!wall(x, y) || (x * 7 + y * 3) % 4) continue;
      ctx.beginPath();
      ctx.ellipse(px(x) - 4, py(y) - 3, 6, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 고양이 집 문 (나무 울타리)
  ctx.fillStyle = '#c89a5b';
  ctx.fillRect(OX + DOOR.x * TILE, py(DOOR.y) - 3, TILE, 6);
}

function drawAcorn(ctx: Ctx, x: number, y: number, s: number, gold: boolean) {
  ctx.fillStyle = gold ? '#ffd54a' : '#c8864a';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.15, s * 0.42, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold ? '#e0a400' : '#7a4f2a';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.2, s * 0.5, s * 0.28, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - s * 0.06, y - s * 0.62, s * 0.12, s * 0.2);
}

function drawSquirrel(ctx: Ctx, g: AcornMaze) {
  const p = g.player;
  const x = px(p.x);
  const y = py(p.y);
  const dying = g.state === 'dying';
  const k = dying ? Math.min(1, g.stateTime / 1.2) : 0;
  const a = ANGLE[p.dir === 'none' ? 'right' : p.dir];
  const faceLeft = p.dir === 'left';
  ctx.save();
  ctx.translate(x, y);
  if (dying) {
    ctx.rotate(k * Math.PI * 4);
    ctx.scale(1 - k, 1 - k);
  }
  // 꼬리: 가는 방향 반대쪽에 크게 말린 꼬리
  ctx.fillStyle = '#b5652d';
  ctx.beginPath();
  const tx = -Math.cos(a) * 9;
  const ty = -Math.sin(a) * 9;
  ctx.ellipse(tx, ty - 4, 8, 11, a + Math.PI / 2 + Math.sin(g.time * 8) * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8a46b';
  ctx.beginPath();
  ctx.ellipse(tx, ty - 5, 4, 6, a + Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();
  // 몸
  ctx.fillStyle = '#d17a3a';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // 귀
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.lineTo(-6, -15);
  ctx.lineTo(-2, -9);
  ctx.moveTo(8, -6);
  ctx.lineTo(6, -15);
  ctx.lineTo(2, -9);
  ctx.fill();
  // 배
  ctx.fillStyle = '#f5d6b0';
  ctx.beginPath();
  ctx.ellipse(0, 4, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 눈 (가는 쪽)
  const ex = p.dir === 'left' ? -3 : p.dir === 'right' ? 3 : 0;
  const ey = p.dir === 'up' ? -3 : p.dir === 'down' ? 1 : -1;
  ctx.fillStyle = '#2b1a12';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(ex + s * 4, ey - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // 오물오물 볼
  const chew = Math.abs(Math.sin(p.mouth)) * 1.5;
  ctx.fillStyle = 'rgba(255,140,140,0.5)';
  ctx.beginPath();
  ctx.arc(ex + (faceLeft ? -7 : 7) * (p.dir === 'up' || p.dir === 'down' ? 0.6 : 1), ey + 3, 2.5 + chew, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCat(ctx: Ctx, c: Cat, g: AcornMaze) {
  const x = px(c.x);
  const y = py(c.y);
  const look: [number, number] = c.dir === 'left' ? [-2, 0] : c.dir === 'right' ? [2, 0] : c.dir === 'up' ? [0, -2] : [0, 1.5];
  if (c.mode === 'eyes') {
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 5, y - 2, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#334';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * 5 + look[0], y - 2 + look[1], 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const scared = c.mode === 'scared';
  const ending = scared && g.scared < 2 && Math.floor(g.time * 6) % 2 === 0;
  const body = scared ? (ending ? '#ffffff' : '#9fb7ff') : c.color;
  const bob = Math.sin(g.time * 10 + c.id) * 1;
  ctx.fillStyle = body;
  // 머리
  ctx.beginPath();
  ctx.ellipse(x, y + bob, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // 귀
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 3 + bob);
  ctx.lineTo(x - 9, y - 15 + bob);
  ctx.lineTo(x - 3, y - 9 + bob);
  ctx.moveTo(x + 11, y - 3 + bob);
  ctx.lineTo(x + 9, y - 15 + bob);
  ctx.lineTo(x + 3, y - 9 + bob);
  ctx.fill();
  // 무늬
  if (!scared && c.id === 1) {
    ctx.strokeStyle = '#5c6b7a';
    ctx.lineWidth = 2;
    for (const dx of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y - 10 + bob);
      ctx.lineTo(x + dx, y - 5 + bob);
      ctx.stroke();
    }
  }
  if (!scared && c.id === 3) {
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.ellipse(x + 5, y - 5 + bob, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (scared) {
    // 어지러운 눈
    ctx.strokeStyle = ending ? '#e33' : '#334';
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * 5, y - 1 + bob, 3, g.time * 8, g.time * 8 + Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 5; i++) ctx.lineTo(x - 6 + i * 3, y + 6 + bob + (i % 2 ? -1.5 : 1.5));
    ctx.stroke();
  } else {
    ctx.fillStyle = c.id === 2 ? '#ffe066' : '#fff';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 5, y - 1 + bob, 3.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#222';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 5 + look[0], y - 1 + bob + look[1], 1.3, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.arc(x, y + 4 + bob, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // 수염
    ctx.strokeStyle = c.id === 2 ? '#aaa' : 'rgba(60,40,30,0.6)';
    ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * 4, y + 5 + bob);
      ctx.lineTo(x + s * 15, y + 3 + bob);
      ctx.moveTo(x + s * 4, y + 6 + bob);
      ctx.lineTo(x + s * 15, y + 8 + bob);
      ctx.stroke();
    }
  }
}

function drawBonus(ctx: Ctx, g: AcornMaze) {
  const b = g.bonus;
  if (!b) return;
  const x = px(b.x);
  const y = py(b.y) + Math.sin(g.time * 5) * 2;
  if (b.kind === 'berry') {
    ctx.fillStyle = '#e8344e';
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.bezierCurveTo(x - 12, y, x - 8, y - 8, x, y - 6);
    ctx.bezierCurveTo(x + 8, y - 8, x + 12, y, x, y + 10);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(x - 5, y - 9, 10, 3);
  } else if (b.kind === 'mushroom') {
    ctx.fillStyle = '#f4e3c8';
    ctx.fillRect(x - 3, y - 1, 6, 10);
    ctx.fillStyle = '#e04b3a';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 11, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 4, y - 5, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 4, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#c5e36b';
    ctx.beginPath();
    ctx.arc(x, y + 4, 8, 0, Math.PI * 2);
    ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d4c2e';
    ctx.fillRect(x - 1, y - 11, 2, 5);
  }
}

export function renderMaze(ctx: Ctx, g: AcornMaze, best: number) {
  ctx.fillStyle = '#10251a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // 반딧불 배경
  for (let i = 0; i < 25; i++) {
    const fx = (i * 137 + Math.sin(g.time * 0.5 + i) * 20) % VIEW_W;
    const fy = (i * 89 + Math.cos(g.time * 0.4 + i) * 15) % VIEW_H;
    ctx.fillStyle = `rgba(220,255,150,${0.15 + 0.15 * Math.sin(g.time * 2 + i)})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1a3a27';
  ctx.fillRect(OX, OY, COLS * TILE, ROWS * TILE);
  const flash = g.state === 'clear' && Math.floor(g.stateTime * 6) % 2 === 0;
  drawWalls(ctx, g, flash);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = g.grid[y][x];
      if (c === '.') drawAcorn(ctx, px(x), py(y), 9, false);
      else if (c === 'o') drawAcorn(ctx, px(x), py(y), 17 + Math.sin(g.time * 6) * 2, true);
    }
  }
  drawBonus(ctx, g);
  if (g.state !== 'dying' || g.stateTime < 0.3) for (const c of g.cats) drawCat(ctx, c, g);
  if (g.state !== 'over') drawSquirrel(ctx, g);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const p of g.popups) {
    ctx.fillStyle = `rgba(150,230,255,${1 - p.t})`;
    ctx.fillText(p.text, px(p.x), py(p.y) - p.t * 20);
  }

  // 오른쪽 정보판
  const X = OX + COLS * TILE + 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe8c4';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillText('도토리 미로', X, 60);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#8fb59a';
  ctx.fillText('점수', X, 110);
  ctx.fillText('최고 기록', X, 180);
  ctx.fillText('단계', X, 250);
  ctx.fillText('목숨', X, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText(g.score.toLocaleString(), X, 145);
  ctx.fillText(Math.max(best, g.score).toLocaleString(), X, 215);
  ctx.fillText(String(g.level), X, 285);
  for (let i = 0; i < g.lives; i++) {
    ctx.fillStyle = '#d17a3a';
    ctx.beginPath();
    ctx.arc(X + 14 + i * 30, 345, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b5652d';
    ctx.beginPath();
    ctx.ellipse(X + 4 + i * 30, 340, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#8fb59a';
  const help = ['방향키 / WASD 로 이동', '황금 도토리를 먹으면', '고양이들이 졸려서 잡을 수 있어요', `남은 도토리 ${g.acornsLeft}`];
  help.forEach((h, i) => ctx.fillText(h, X, 400 + i * 22));

  if (g.state === 'ready' || g.state === 'over' || g.state === 'clear') {
    const text = g.state === 'ready' ? (g.level > 1 ? `${g.level}단계 시작!` : '준비!') : g.state === 'clear' ? '단계 완료!' : '게임 끝';
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#10251a';
    ctx.strokeText(text, px(10), py(11) + 12);
    ctx.fillStyle = g.state === 'over' ? '#ff7b7b' : '#ffe066';
    ctx.fillText(text, px(10), py(11) + 12);
  }
}

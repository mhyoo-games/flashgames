// 도토리 미로: 미로를 돌며 도토리를 모으고 고양이를 피하는 게임 (그리기와 분리)
import type { Rng } from '../../core/rng.ts';

// 새로 그린 미로 (좌우 대칭). # 벽, . 도토리, o 황금 도토리, - 고양이 집 문, C 고양이 집, P 시작 위치, 빈칸 = 길
export const MAZE = [
  '#####################',
  '#o...#.........#...o#',
  '#.##.#.###.###.#.##.#',
  '#.#.......#.......#.#',
  '#.#.###.#.#.#.###.#.#',
  '#.....#.#...#.#.....#',
  '###.#.#.##-##.#.#.###',
  '   .#...#CCC#...#.   ',
  '###.#.#.#####.#.#.###',
  '#.....#...P...#.....#',
  '#.###.###.#.###.###.#',
  '#...#.....#.....#...#',
  '##.#.#.#######.#.#.##',
  '#o.#.#....#....#.#.o#',
  '#.##.####.#.####.##.#',
  '#...................#',
  '#####################',
];

export const COLS = MAZE[0].length;
export const ROWS = MAZE.length;

export type Dir = 'up' | 'down' | 'left' | 'right' | 'none';
const VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], none: [0, 0] };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left', none: 'none' };
// 같은 거리면 이 순서로 고른다
const ORDER: Dir[] = ['up', 'left', 'down', 'right'];

export const DOOR = { x: 10, y: 6 };
/** 고양이가 집을 나와 서는 곳 */
const OUTSIDE = { x: 10, y: 5 };
const HOME = { x: 10, y: 7 };

export type CatMode = 'home' | 'leaving' | 'active' | 'scared' | 'eyes';

export interface Cat {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  dir: Dir;
  mode: CatMode;
  /** 집에서 나오기까지 남은 시간 */
  release: number;
  /** 흩어질 때 가는 구석 */
  corner: { x: number; y: number };
}

export interface Bonus {
  x: number;
  y: number;
  kind: 'mushroom' | 'berry' | 'pear';
  points: number;
  life: number;
}

export type MazeEvent = 'acorn' | 'power' | 'catch' | 'bonus' | 'death' | 'clear' | 'start' | 'extra' | 'over';

export interface Popup {
  x: number;
  y: number;
  text: string;
  t: number;
}

export class AcornMaze {
  grid: string[][];
  player = { x: 10, y: 9, dir: 'none' as Dir, next: 'none' as Dir, mouth: 0 };
  cats: Cat[] = [];
  bonus?: Bonus;
  popups: Popup[] = [];
  events: MazeEvent[] = [];
  score = 0;
  lives = 3;
  level = 1;
  acornsLeft = 0;
  eatenThisLevel = 0;
  /** 겁먹은 시간 */
  scared = 0;
  /** 이번 황금 도토리로 잡은 수 */
  combo = 0;
  modeTime = 0;
  modeIndex = 0;
  state: 'ready' | 'play' | 'dying' | 'clear' | 'over' = 'ready';
  stateTime = 0;
  time = 0;
  private extraGiven = false;
  private readonly rng: Rng;

  constructor(rng: Rng) {
    this.rng = rng;
    this.grid = MAZE.map((r) => r.split(''));
    this.resetLevel();
  }

  private resetLevel() {
    this.grid = MAZE.map((r) => r.split('').map((c) => (c === 'P' || c === 'C' ? ' ' : c)));
    this.acornsLeft = this.grid.flat().filter((c) => c === '.' || c === 'o').length;
    this.eatenThisLevel = 0;
    this.resetPositions();
  }

  private resetPositions() {
    this.player = { x: 10, y: 9, dir: 'none', next: 'none', mouth: 0 };
    const lv = this.level;
    this.cats = [
      { id: 0, name: '치즈', color: '#ff9f43', x: OUTSIDE.x, y: OUTSIDE.y, dir: 'left', mode: 'active', release: 0, corner: { x: COLS - 2, y: -2 } },
      { id: 1, name: '고등어', color: '#8fa3b8', x: 10, y: 7, dir: 'up', mode: 'home', release: 0.5, corner: { x: 1, y: -2 } },
      { id: 2, name: '까망', color: '#3d3d4e', x: 9, y: 7, dir: 'up', mode: 'home', release: Math.max(1, 5 - lv), corner: { x: COLS - 1, y: ROWS + 1 } },
      { id: 3, name: '코코', color: '#d9a066', x: 11, y: 7, dir: 'up', mode: 'home', release: Math.max(2, 9 - lv * 1.5), corner: { x: 0, y: ROWS + 1 } },
    ];
    this.scared = 0;
    this.modeTime = 0;
    this.modeIndex = 0;
    this.state = 'ready';
    this.stateTime = 0;
    this.bonus = undefined;
    this.events.push('start');
  }

  drainEvents(): MazeEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get over() {
    return this.state === 'over';
  }

  /** 가고 싶은 방향 (키를 누르면) */
  steer(d: Dir) {
    if (d === 'none') return;
    this.player.next = d;
    // 반대 방향은 칸 가운데가 아니어도 바로 돌 수 있다
    if (this.player.dir !== 'none' && d === OPP[this.player.dir]) this.player.dir = d;
  }

  cell(x: number, y: number): string {
    if (y < 0 || y >= ROWS) return '#';
    const xx = ((x % COLS) + COLS) % COLS;
    return this.grid[y][xx];
  }

  /** (x,y) 칸에서 d로 갈 수 있나. 고양이 문은 고양이만 (나가거나 돌아갈 때) */
  open(x: number, y: number, d: Dir, door: boolean): boolean {
    const [dx, dy] = VEC[d];
    const c = this.cell(x + dx, y + dy);
    if (c === '#') return false;
    if (c === '-') return door;
    return true;
  }

  // ---- 속도 (칸/초) ----
  private playerSpeed() {
    return Math.min(9.5, 7.2 + (this.level - 1) * 0.35);
  }

  private catSpeed(c: Cat) {
    const base = Math.min(9, 6.6 + (this.level - 1) * 0.4);
    if (c.mode === 'eyes') return 15;
    if (c.mode === 'scared') return base * 0.55;
    if (c.mode === 'home' || c.mode === 'leaving') return 4;
    // 굴(양 끝 통로)에서는 느리게
    if (Math.round(c.y) === 7 && (c.x < 3 || c.x > COLS - 4)) return base * 0.5;
    // 도토리가 얼마 안 남으면 치즈가 빨라진다
    if (c.id === 0 && this.acornsLeft < 20) return base * 1.08;
    return base;
  }

  scaredDuration() {
    return Math.max(2, 8 - (this.level - 1) * 1);
  }

  /** 흩어지기 ↔ 쫓기 시간표 */
  private chaseMode(): boolean {
    const plan = [7, 20, 7, 20, 5, 20, 5];
    let t = this.modeTime;
    for (let i = 0; i < plan.length; i++) {
      if (t < plan[i]) return i % 2 === 1;
      t -= plan[i];
    }
    return true;
  }

  step(dt: number) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.stateTime += dt;
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 1);
    if (this.state === 'ready') {
      if (this.stateTime > 1.8) {
        this.state = 'play';
        this.stateTime = 0;
      }
      return;
    }
    if (this.state === 'dying') {
      if (this.stateTime > 1.6) {
        if (this.lives <= 0) {
          this.state = 'over';
          this.events.push('over');
        } else this.resetPositions();
      }
      return;
    }
    if (this.state === 'clear') {
      if (this.stateTime > 2) {
        this.level++;
        this.resetLevel();
      }
      return;
    }
    if (this.state === 'over') return;

    if (this.scared > 0) {
      this.scared -= dt;
      if (this.scared <= 0) for (const c of this.cats) if (c.mode === 'scared') c.mode = 'active';
    } else {
      const before = this.chaseMode();
      this.modeTime += dt;
      // 모드가 바뀌면 고양이들이 뒤돌아선다
      if (before !== this.chaseMode()) for (const c of this.cats) if (c.mode === 'active') c.dir = OPP[c.dir];
    }

    this.movePlayer(dt);
    this.eat();
    for (const c of this.cats) this.moveCat(c, dt);
    this.collide();
    if (this.bonus) {
      this.bonus.life -= dt;
      if (this.bonus.life <= 0) this.bonus = undefined;
    }
    if (!this.extraGiven && this.score >= 10000) {
      this.extraGiven = true;
      this.lives++;
      this.events.push('extra');
    }
  }

  /** 칸 가운데를 지날 때마다 방향을 정하며 움직인다 */
  private moveAlong(e: { x: number; y: number; dir: Dir }, speed: number, dt: number, decide: (cx: number, cy: number) => Dir) {
    let move = speed * dt;
    for (let guard = 0; guard < 12 && move > 1e-9; guard++) {
      const cx = Math.round(e.x);
      const cy = Math.round(e.y);
      const atCenter = Math.abs(e.x - cx) < 1e-6 && Math.abs(e.y - cy) < 1e-6;
      if (atCenter) {
        e.x = cx;
        e.y = cy;
        const nd = decide(cx, cy);
        e.dir = nd;
        if (nd === 'none') return;
      }
      if (e.dir === 'none') return;
      const [dx, dy] = VEC[e.dir];
      const cur = dx ? e.x : e.y;
      const sign = dx || dy;
      const target = atCenter ? cur + sign : sign > 0 ? Math.floor(cur) + 1 : Math.ceil(cur) - 1;
      const dist = Math.abs(target - cur);
      const len = Math.min(move, dist);
      if (len >= dist) {
        if (dx) e.x = target;
        else e.y = target;
      } else {
        e.x += dx * len;
        e.y += dy * len;
      }
      move -= len;
      this.wrap(e);
    }
  }

  private wrap(e: { x: number; y: number }) {
    if (e.x < -0.5) e.x += COLS;
    if (e.x > COLS - 0.5) e.x -= COLS;
  }

  private movePlayer(dt: number) {
    const p = this.player;
    p.mouth += dt * 10;
    this.moveAlong(p, this.playerSpeed(), dt, (cx, cy) => {
      if (p.next !== 'none' && this.open(cx, cy, p.next, false)) return p.next;
      if (p.dir !== 'none' && this.open(cx, cy, p.dir, false)) return p.dir;
      return 'none';
    });
  }

  private eat() {
    const p = this.player;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    if (Math.abs(p.x - cx) > 0.3 || Math.abs(p.y - cy) > 0.3) return;
    const xx = ((cx % COLS) + COLS) % COLS;
    const c = this.cell(xx, cy);
    if (c === '.' || c === 'o') {
      this.grid[cy][xx] = ' ';
      this.acornsLeft--;
      this.eatenThisLevel++;
      if (c === '.') {
        this.score += 10;
        this.events.push('acorn');
      } else {
        this.score += 50;
        this.scared = this.scaredDuration();
        this.combo = 0;
        for (const cat of this.cats) {
          if (cat.mode === 'active' || cat.mode === 'scared') {
            if (cat.mode === 'active') cat.dir = OPP[cat.dir];
            cat.mode = 'scared';
          }
        }
        this.events.push('power');
      }
      // 보너스 열매
      if (this.eatenThisLevel === 50 || this.eatenThisLevel === 120) {
        const kinds: Bonus['kind'][] = ['berry', 'mushroom', 'pear'];
        const kind = kinds[(this.level - 1) % kinds.length];
        this.bonus = { x: 10, y: 11, kind, points: 100 * Math.min(10, this.level + 1), life: 9 };
      }
      if (this.acornsLeft <= 0) {
        this.state = 'clear';
        this.stateTime = 0;
        this.events.push('clear');
      }
    }
    if (this.bonus && Math.abs(p.x - this.bonus.x) < 0.6 && Math.abs(p.y - this.bonus.y) < 0.6) {
      this.score += this.bonus.points;
      this.popups.push({ x: this.bonus.x, y: this.bonus.y, text: String(this.bonus.points), t: 0 });
      this.bonus = undefined;
      this.events.push('bonus');
    }
  }

  /** 고양이마다 노리는 칸이 다르다 */
  catTarget(c: Cat): { x: number; y: number } {
    const p = this.player;
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (c.mode === 'eyes') return OUTSIDE;
    if (!this.chaseMode()) return c.corner;
    const [dx, dy] = VEC[p.dir === 'none' ? 'left' : p.dir];
    switch (c.id) {
      case 0: // 치즈: 곧장 쫓아온다
        return { x: px, y: py };
      case 1: // 고등어: 앞질러 길목을 막는다
        return { x: px + dx * 4, y: py + dy * 4 };
      case 2: {
        // 까망: 치즈와 함께 양쪽에서 조인다
        const cheese = this.cats[0];
        const ax = px + dx * 2;
        const ay = py + dy * 2;
        return { x: ax * 2 - Math.round(cheese.x), y: ay * 2 - Math.round(cheese.y) };
      }
      default: {
        // 코코: 멀면 쫓고 가까우면 겁나서 구석으로
        const d = Math.hypot(px - c.x, py - c.y);
        return d > 7 ? { x: px, y: py } : c.corner;
      }
    }
  }

  private moveCat(c: Cat, dt: number) {
    if (c.mode === 'home') {
      c.release -= dt;
      c.y = HOME.y + Math.sin(this.time * 6 + c.id) * 0.25;
      if (c.release <= 0) c.mode = 'leaving';
      return;
    }
    const speed = this.catSpeed(c) * dt;
    if (c.mode === 'leaving') {
      // 집 가운데로 가서 문을 지나 위로
      if (Math.abs(c.x - HOME.x) > 0.01) c.x += Math.sign(HOME.x - c.x) * Math.min(speed, Math.abs(HOME.x - c.x));
      else if (c.y > OUTSIDE.y) c.y = Math.max(OUTSIDE.y, c.y - speed);
      else {
        c.y = OUTSIDE.y;
        c.x = OUTSIDE.x;
        c.mode = this.scared > 0 ? 'scared' : 'active';
        c.dir = this.rng() < 0.5 ? 'left' : 'right';
      }
      return;
    }
    if (c.mode === 'eyes' && Math.abs(c.x - OUTSIDE.x) < 0.05 && Math.abs(c.y - OUTSIDE.y) < 0.05) {
      // 집으로 들어가 잠깐 쉬고 다시 나온다
      c.x = HOME.x;
      c.y = HOME.y;
      c.mode = 'home';
      c.release = 1;
      return;
    }
    this.moveAlong(c, this.catSpeed(c), dt, (cx, cy) => {
      const options = ORDER.filter((d) => d !== OPP[c.dir] && this.open(cx, cy, d, false));
      if (!options.length) return OPP[c.dir];
      if (c.mode === 'scared') return options[Math.floor(this.rng() * options.length)];
      const t = this.catTarget(c);
      let best = options[0];
      let bestD = Infinity;
      for (const d of options) {
        const [dx, dy] = VEC[d];
        const dist = (cx + dx - t.x) ** 2 + (cy + dy - t.y) ** 2;
        if (dist < bestD) {
          bestD = dist;
          best = d;
        }
      }
      return best;
    });
  }

  private collide() {
    const p = this.player;
    for (const c of this.cats) {
      if (c.mode === 'home' || c.mode === 'leaving' || c.mode === 'eyes') continue;
      let dx = Math.abs(c.x - p.x);
      dx = Math.min(dx, COLS - dx);
      if (dx < 0.6 && Math.abs(c.y - p.y) < 0.6) {
        if (c.mode === 'scared') {
          this.combo++;
          const pts = 200 * 2 ** (this.combo - 1);
          this.score += pts;
          c.mode = 'eyes';
          this.popups.push({ x: c.x, y: c.y, text: String(pts), t: 0 });
          this.events.push('catch');
        } else {
          this.lives--;
          this.state = 'dying';
          this.stateTime = 0;
          this.events.push('death');
          return;
        }
      }
    }
  }
}


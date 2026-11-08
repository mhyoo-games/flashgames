import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { AcornMaze, COLS, MAZE, ROWS } from '../src/games/maze/engine.ts';

const DT = 1 / 60;

test('미로: 크기가 맞고 좌우 대칭, 모든 도토리에 갈 수 있다', () => {
  for (const row of MAZE) {
    assert.equal(row.length, COLS);
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const a = MAZE[y][x] === 'P' ? '.' : MAZE[y][x];
    const b = MAZE[y][COLS - 1 - x] === 'P' ? '.' : MAZE[y][COLS - 1 - x];
    assert.equal(a === '#', b === '#', `대칭 아님 (${x},${y})`);
  }
  // 시작 위치에서 모든 도토리에 닿는지 (BFS, 양끝 굴 포함)
  const seen = new Set<string>();
  const q: [number, number][] = [[10, 9]];
  while (q.length) {
    const [x, y] = q.shift()!;
    const k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (x + dx + COLS) % COLS;
      const ny = y + dy;
      if (ny < 0 || ny >= ROWS) continue;
      const c = MAZE[ny][nx];
      if (c !== '#' && c !== '-' && c !== 'C') q.push([nx, ny]);
    }
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ('.o'.includes(MAZE[y][x])) assert.ok(seen.has(`${x},${y}`), `못 가는 도토리 (${x},${y})`);
});

test('방향키대로 움직이고 벽에서 멈추며 도토리를 먹는다', () => {
  const g = new AcornMaze(seeded(1));
  for (let i = 0; i < 120; i++) g.step(DT); // 준비 시간
  g.steer('left');
  for (let i = 0; i < 60; i++) g.step(DT);
  assert.ok(g.player.x < 10, `x=${g.player.x}`);
  assert.ok(g.score >= 10, '도토리를 먹어야 함');
  // (7,9)까지 가면 왼쪽은 벽 (6,9)
  for (let i = 0; i < 120; i++) g.step(DT);
  assert.equal(Math.round(g.player.x), 7);
  assert.equal(g.player.dir, 'none');
});

test('황금 도토리를 먹으면 고양이가 겁먹고, 잡으면 점수', () => {
  const g = new AcornMaze(seeded(2));
  for (let i = 0; i < 120; i++) g.step(DT);
  g.player.x = 1;
  g.player.y = 2;
  g.player.dir = 'up';
  g.player.next = 'up';
  for (let i = 0; i < 20; i++) g.step(DT);
  assert.ok(g.scared > 0, '겁먹은 상태가 되어야 함');
  const cat = g.cats.find((c) => c.mode === 'scared')!;
  assert.ok(cat);
  cat.x = g.player.x;
  cat.y = g.player.y;
  const before = g.score;
  g.step(DT);
  assert.equal(cat.mode, 'eyes');
  assert.ok(g.score >= before + 200);
});

test('고양이에게 닿으면 목숨이 줄고, 다 잃으면 끝', () => {
  const g = new AcornMaze(seeded(3));
  for (let i = 0; i < 120; i++) g.step(DT);
  for (let life = 3; life > 0; life--) {
    const cat = g.cats[0];
    cat.mode = 'active';
    cat.x = g.player.x;
    cat.y = g.player.y;
    g.step(DT);
    assert.equal(g.lives, life - 1);
    for (let i = 0; i < 60 * 4; i++) g.step(DT);
  }
  assert.ok(g.over);
});

test('가만히 있으면 고양이들이 집에서 나와 결국 잡으러 온다', () => {
  const g = new AcornMaze(seeded(4));
  let died = false;
  for (let i = 0; i < 60 * 60 && !died; i++) {
    g.step(DT);
    if (g.drainEvents().includes('death')) died = true;
  }
  assert.ok(died, '60초 안에 잡혀야 함');
});

test('도토리를 다 먹으면 다음 단계', () => {
  const g = new AcornMaze(seeded(5));
  for (let i = 0; i < 120; i++) g.step(DT);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ('.o'.includes(g.grid[y][x]) && !(x === 9 && y === 9)) g.grid[y][x] = ' ';
  g.acornsLeft = 1;
  for (const c of g.cats) c.mode = 'home';
  g.steer('left');
  for (let i = 0; i < 30; i++) g.step(DT);
  assert.equal(g.state, 'clear');
  for (let i = 0; i < 60 * 3; i++) g.step(DT);
  assert.equal(g.level, 2);
  assert.ok(g.acornsLeft > 100);
});

test('양 끝 굴로 나가면 반대편으로 나온다', () => {
  const g = new AcornMaze(seeded(6));
  for (let i = 0; i < 120; i++) g.step(DT);
  for (const c of g.cats) c.mode = 'home';
  g.player.x = 3;
  g.player.y = 7;
  g.player.dir = 'left';
  g.player.next = 'left';
  let crossed = false;
  for (let i = 0; i < 60; i++) {
    g.step(DT);
    if (g.player.x > 15) crossed = true;
  }
  assert.ok(crossed, `x=${g.player.x}`);
  // 반대편 벽(16,7) 앞에서 멈춘다
  assert.equal(Math.round(g.player.x), 17);
});

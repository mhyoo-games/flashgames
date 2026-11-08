import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { StickAI } from '../src/games/stick/ai.ts';
import { FLOOR, NO_INPUT, StickFight, type Input } from '../src/games/stick/engine.ts';

const DT = 1 / 60;
function run(g: StickFight, seconds: number, inputs: (t: number) => [Input, Input]) {
  for (let i = 0; i < seconds * 60 && !g.over; i++) g.step(DT, inputs(i * DT));
}

test('시작하면 라운드 안내 후 싸움이 시작된다', () => {
  const g = new StickFight();
  assert.equal(g.phase, 'intro');
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  assert.equal(g.phase, 'fight');
  assert.ok(g.drainEvents().includes('fight'));
});

test('붙어서 펀치를 연타하면 3단 콤보로 상대 체력이 깎인다', () => {
  const g = new StickFight();
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 450;
  let frame = 0;
  run(g, 1.2, () => {
    frame++;
    return [{ ...NO_INPUT, punch: frame % 6 < 3 }, NO_INPUT];
  });
  assert.ok(b.hp < 100 - 15, `체력 ${b.hp}`);
  assert.ok(a.meter > 0, '게이지가 차야 함');
});

test('막으면 피해가 아주 적다', () => {
  const g = new StickFight();
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 455;
  let frame = 0;
  run(g, 1, () => {
    frame++;
    return [{ ...NO_INPUT, kick: frame % 30 === 1 }, { ...NO_INPUT, down: true }];
  });
  assert.ok(b.hp >= 95, `막았는데 체력 ${b.hp}`);
  assert.ok(g.drainEvents().includes('block'));
});

test('점프하면 떴다가 땅으로 돌아온다', () => {
  const g = new StickFight();
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  const a = g.fighters[0];
  let minY = FLOOR;
  let frame = 0;
  run(g, 1.2, () => {
    frame++;
    minY = Math.min(minY, a.y);
    return [{ ...NO_INPUT, up: frame === 1 }, NO_INPUT];
  });
  assert.ok(minY < FLOOR - 80, `높이 ${FLOOR - minY}`);
  assert.equal(a.y, FLOOR);
});

test('게이지가 차면 기공파를 쏘고 맞으면 큰 피해', () => {
  const g = new StickFight();
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  const [a, b] = g.fighters;
  a.meter = 100;
  let frame = 0;
  run(g, 1.5, () => {
    frame++;
    return [{ ...NO_INPUT, special: frame === 1 }, NO_INPUT];
  });
  assert.equal(a.meter < 100, true);
  assert.ok(b.hp <= 100 - 18, `체력 ${b.hp}`);
});

test('컴퓨터끼리 붙이면 시합이 끝나고 승자가 나온다', () => {
  for (const level of ['easy', 'normal', 'hard'] as const) {
    const g = new StickFight(['A', 'B']);
    const ais = [new StickAI(0, level, seeded(1)), new StickAI(1, level, seeded(2))];
    run(g, 60 * 4, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    assert.ok(g.over, `${level}: 시합이 안 끝남 (라운드 ${g.round})`);
    assert.ok(g.winner === 0 || g.winner === 1);
  }
});

test('어려운 컴퓨터는 쉬운 컴퓨터를 대체로 이긴다', () => {
  let hardWins = 0;
  for (let seed = 0; seed < 6; seed++) {
    const g = new StickFight(['쉬움', '어려움']);
    const ais = [new StickAI(0, 'easy', seeded(seed * 2 + 1)), new StickAI(1, 'hard', seeded(seed * 2 + 2))];
    run(g, 60 * 4, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    if (g.winner === 1) hardWins++;
  }
  assert.ok(hardWins >= 4, `어려움 승리 ${hardWins}/6`);
});

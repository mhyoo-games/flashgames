import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { DinoAI } from '../src/games/dino/ai.ts';
import { BOSS, charById, PLAYABLE, ROSTER } from '../src/games/dino/chars.ts';
import { DinoFight, FLOOR, GAUGE_MAX, NO_INPUT, type Input } from '../src/games/dino/engine.ts';
import { CommandReader, type RawInput } from '../src/games/dino/input.ts';
import { newStory, selectable, stageResult } from '../src/games/dino/story.ts';

const DT = 1 / 60;
const run = (g: DinoFight, sec: number, fn: (i: number) => [Input, Input]) => {
  for (let i = 0; i < sec * 60 && !g.over; i++) g.step(DT, fn(i));
};
const ready = (a = 'rex', b = 'triko') => {
  const g = new DinoFight({ chars: [charById(a), charById(b)] });
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  return g;
};
const raw = (p: Partial<RawInput> = {}): RawInput => ({ left: false, right: false, up: false, down: false, punch: false, kick: false, ...p });

/** 방향 순서를 몇 프레임씩 누르고 마지막에 버튼 */
function motion(r: CommandReader, dirs: Partial<RawInput>[], button: 'punch' | 'kick', facing: 1 | -1 = 1) {
  let cmd;
  for (const d of dirs) for (let i = 0; i < 3; i++) cmd = r.feed(raw(d), facing, DT) ?? cmd;
  cmd = r.feed(raw({ ...dirs[dirs.length - 1], [button]: true }), facing, DT) ?? cmd;
  return cmd;
}

const D = { down: true };
const DF = { down: true, right: true };
const F = { right: true };
const DB = { down: true, left: true };
const B = { left: true };

test('커맨드: ↓↘→+펀치, →↓↘+펀치, ↓↙←+킥, 두 번 돌리기, 펀치+킥', () => {
  assert.equal(motion(new CommandReader(), [D, DF, F], 'punch'), 'move1');
  assert.equal(motion(new CommandReader(), [F, D, DF], 'punch'), 'move2');
  assert.equal(motion(new CommandReader(), [D, DB, B], 'kick'), 'move3');
  assert.equal(motion(new CommandReader(), [D, DF, F, D, DF, F], 'punch'), 'super');
  // 왼쪽을 볼 때는 방향이 뒤집힌다
  assert.equal(motion(new CommandReader(), [D, DB, B], 'punch', -1), 'move1');
  // 그냥 누르면 커맨드 아님
  assert.equal(motion(new CommandReader(), [F], 'punch'), undefined);
  const r = new CommandReader();
  r.feed(raw({ punch: true }), 1, DT);
  assert.equal(r.feed(raw({ punch: true, kick: true }), 1, DT), 'beast');
  // 너무 천천히 돌리면 안 됨
  const slow = new CommandReader();
  for (const d of [D, DF]) for (let i = 0; i < 40; i++) slow.feed(raw(d), 1, DT);
  assert.equal(slow.feed(raw({ ...F, punch: true }), 1, DT), undefined);
});

test('주먹 3단 콤보와 콤보 수', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 450;
  run(g, 1.2, (i) => [{ ...NO_INPUT, punch: i % 6 < 3 }, NO_INPUT]);
  assert.ok(b.hp < b.maxHp - 12, `체력 ${b.hp}`);
});

test('뒤로 누르면 막고, 아래 공격은 앉아서 막아야 한다', () => {
  for (const [crouch, expectSmall] of [[false, false], [true, true]] as const) {
    const g = ready();
    const [a, b] = g.fighters;
    a.x = 400;
    b.x = 455;
    run(g, 0.8, (i) => [{ ...NO_INPUT, kick: i % 30 === 1, down: true }, { ...NO_INPUT, right: true, down: crouch }]);
    const lost = b.maxHp - b.hp;
    if (expectSmall) assert.ok(lost <= 3, `앉아 막기 피해 ${lost}`);
    else assert.ok(lost >= 6, `서서 막으면 다리 공격에 맞아야 함 ${lost}`);
  }
});

test('게이지가 차면 펀치+킥으로 변신하고, 변신하면 강해지며 게이지가 줄어든다', () => {
  const g = ready();
  const a = g.fighters[0];
  a.gauge = GAUGE_MAX;
  run(g, 0.1, (i) => [{ ...NO_INPUT, cmd: i === 1 ? 'beast' : undefined }, NO_INPUT]);
  assert.equal(a.beast, true);
  assert.ok(g.drainEvents().includes('transform'));
  assert.ok(g.power(a) > a.char.power);
  run(g, 2, () => [NO_INPUT, NO_INPUT]);
  assert.ok(a.gauge < GAUGE_MAX);
  a.gauge = 0.1;
  run(g, 0.2, () => [NO_INPUT, NO_INPUT]);
  assert.equal(a.beast, false, '게이지가 다 닳으면 햄스터로 돌아옴');
});

test('초필살기는 변신 중에만, 게이지 절반을 쓴다', () => {
  const g = ready('raptor', 'anky');
  const [a, b] = g.fighters;
  a.x = 300;
  b.x = 420;
  a.gauge = 100;
  run(g, 0.05, () => [{ ...NO_INPUT, cmd: 'super' }, NO_INPUT]);
  assert.notEqual(a.action, 'move', '변신 전엔 못 씀');
  run(g, 0.1, (i) => [{ ...NO_INPUT, cmd: i === 1 ? 'beast' : undefined }, NO_INPUT]);
  run(g, 0.8, () => [NO_INPUT, NO_INPUT]);
  const before = b.hp;
  run(g, 1.5, (i) => [{ ...NO_INPUT, cmd: i === 1 ? 'super' : undefined }, NO_INPUT]);
  assert.ok(before - b.hp >= 20, `초필살 피해 ${before - b.hp}`);
});

test('모든 캐릭터의 기술 1·2·3이 상대에게 닿는다', () => {
  for (const c of ROSTER) {
    for (const slot of ['move1', 'move2', 'move3'] as const) {
      const mv = c.moves[slot];
      const g = new DinoFight({ chars: [c, charById('rex')] });
      run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
      const [a, b] = g.fighters;
      const dist = mv.type === 'shot' || mv.type === 'meteor' ? 380 : mv.type === 'rush' || mv.type === 'dive' ? 200 : mv.type === 'slam' ? 260 : 70;
      a.x = 300;
      b.x = 300 + dist;
      // 받아치기는 상대가 때려야 발동
      const counter = mv.type === 'counter';
      if (counter) b.x = 355;
      run(g, 2, (i) => [{ ...NO_INPUT, cmd: i === 1 ? slot : undefined }, { ...NO_INPUT, punch: counter && i === 6 }]);
      assert.ok(b.hp < b.maxHp, `${c.name} ${mv.name} (${mv.type}) 이 안 맞음`);
    }
  }
});

test('대공기는 뛰어드는 상대를 떨어뜨린다', () => {
  const g = ready('rex', 'raptor');
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 470;
  b.y = FLOOR - 90;
  b.vy = 0;
  b.action = 'jump';
  run(g, 1, (i) => [{ ...NO_INPUT, cmd: i === 1 ? 'move2' : undefined }, NO_INPUT]);
  assert.ok(b.hp < b.maxHp);
});

test('땅을 타는 충격파는 점프로 피한다', () => {
  for (const jump of [false, true]) {
    const g = ready('anky', 'rex');
    const [a, b] = g.fighters;
    a.x = 200;
    b.x = 600;
    run(g, 1.6, (i) => {
      const shock = g.projectiles.find((p) => p.ground && p.vx > 0);
      return [{ ...NO_INPUT, cmd: i === 1 ? 'move1' : undefined }, { ...NO_INPUT, up: jump && !!shock && Math.abs(shock.x - b.x) < 130 }];
    });
    if (jump) assert.equal(b.hp, b.maxHp);
    else assert.ok(b.hp < b.maxHp);
  }
});

test('컴퓨터끼리 붙이면 모든 캐릭터가 시합을 끝낸다', () => {
  for (let i = 0; i < ROSTER.length; i++) {
    const g = new DinoFight({ chars: [ROSTER[i], ROSTER[(i + 3) % ROSTER.length]], winsNeeded: 1, roundTime: 99 });
    const ais = [new DinoAI(0, 'normal', seeded(i + 1)), new DinoAI(1, 'normal', seeded(i + 40))];
    run(g, 150, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    assert.ok(g.over, `${ROSTER[i].name}: 안 끝남`);
  }
});

test('어려운 컴퓨터는 쉬운 컴퓨터를 대체로 이긴다', () => {
  let hard = 0;
  for (let s = 0; s < 6; s++) {
    const g = new DinoFight({ chars: [PLAYABLE[0], PLAYABLE[0]] });
    const ais = [new DinoAI(0, 'easy', seeded(s * 2 + 1)), new DinoAI(1, 'hard', seeded(s * 2 + 2))];
    run(g, 240, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    if (g.winner === 1) hard++;
  }
  assert.ok(hard >= 4, `어려움 ${hard}/6`);
});

test('스토리: 나머지 7마리 + 마지막은 히든 보스, 지면 같은 판 다시', () => {
  const s = newStory('rex', 1);
  assert.equal(s.stages.length, 8);
  assert.equal(s.stages[7].rival.id, BOSS.id);
  assert.ok(!s.stages.some((x) => x.rival.id === 'rex'));
  assert.equal(new Set(s.stages.map((x) => x.rival.id)).size, 8);
  assert.equal(stageResult(s, false), 'retry');
  assert.equal(s.index, 0);
  for (let i = 0; i < 7; i++) assert.equal(stageResult(s, true), 'next');
  assert.equal(stageResult(s, true), 'clear');
  assert.equal(selectable(false).length, 8);
  assert.equal(selectable(true).length, 9);
});

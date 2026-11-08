import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { DinoAI } from '../src/games/dino/ai.ts';
import { BOSS, charById, PLAYABLE, ROSTER } from '../src/games/dino/chars.ts';
import { CHARGE_RATE, DinoFight, FLOOR, GAUGE_MAX, NO_INPUT, type Input } from '../src/games/dino/engine.ts';
import { CommandReader, NO_RAW, type Button, type RawInput } from '../src/games/dino/input.ts';
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
const raw = (p: Partial<RawInput> = {}): RawInput => ({ ...NO_RAW, ...p });

/** 방향을 하나씩 순서대로 몇 프레임 누르고 (사이에 손을 뗌) 마지막에 버튼 */
function motion(r: CommandReader, dirs: Partial<RawInput>[], button: Button, facing: 1 | -1 = 1) {
  let cmd;
  for (const d of dirs) {
    for (let i = 0; i < 3; i++) cmd = r.feed(raw(d), facing, DT) ?? cmd;
    if (d !== dirs[dirs.length - 1]) cmd = r.feed(raw(), facing, DT) ?? cmd;
  }
  cmd = r.feed(raw({ ...dirs[dirs.length - 1], [button]: true }), facing, DT) ?? cmd;
  return cmd;
}

const D = { down: true };
const DF = { down: true, right: true };
const F = { right: true };
const DB = { down: true, left: true };
const B = { left: true };

test('커맨드: 방향키를 하나씩 순서대로 (↓→ 펀치, →↓→ 펀치, ↓← 킥, ↓→↓→ 펀치)', () => {
  assert.equal(motion(new CommandReader(), [D, F], 'lp'), 'move1');
  assert.equal(motion(new CommandReader(), [D, F], 'hp'), 'move1');
  assert.equal(motion(new CommandReader(), [F, D, F], 'lp'), 'move2');
  assert.equal(motion(new CommandReader(), [D, B], 'lk'), 'move3');
  assert.equal(motion(new CommandReader(), [D, B], 'hk'), 'move3');
  assert.equal(motion(new CommandReader(), [D, F, D, F], 'hp'), 'super');
  // 대각선으로 굴려도 된다
  assert.equal(motion(new CommandReader(), [D, DF, F], 'lp'), 'move1');
  assert.equal(motion(new CommandReader(), [D, DB, B], 'lk'), 'move3');
  // 왼쪽을 볼 때는 방향이 뒤집힌다
  assert.equal(motion(new CommandReader(), [D, B], 'lp', -1), 'move1');
  // 그냥 누르면 커맨드 아님, 버튼이 틀려도 아님
  assert.equal(motion(new CommandReader(), [F], 'lp'), undefined);
  assert.equal(motion(new CommandReader(), [D, F], 'lk'), undefined);
  // 오래 걷다가 펀치는 기술이 아님
  const walk = new CommandReader();
  for (let i = 0; i < 60; i++) walk.feed(raw(F), 1, DT);
  assert.equal(walk.feed(raw({ ...F, lp: true }), 1, DT), undefined);
  // 너무 천천히 누르면 안 됨
  const slow = new CommandReader();
  for (let i = 0; i < 40; i++) slow.feed(raw(D), 1, DT);
  for (let i = 0; i < 40; i++) slow.feed(raw(), 1, DT);
  assert.equal(slow.feed(raw({ ...F, lp: true }), 1, DT), undefined);
});

/** 버튼을 차례로 (앞 공격이 맞은 뒤에) 누른다 */
function chain(g: DinoFight, buttons: Button[], gap = 9) {
  run(g, (buttons.length * gap + 40) / 60, (i) => {
    const k = Math.floor(i / gap);
    const b = i % gap === 0 ? buttons[k] : undefined;
    return [{ ...NO_INPUT, ...(b ? { [b]: true } : {}) }, NO_INPUT];
  });
}

test('약펀치 → 약킥 → 강펀치 → 강킥으로 이어 치면 상대는 계속 맞는다', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 455;
  let maxCombo = 0;
  const seq: Button[] = ['lp', 'lk', 'hp', 'hk'];
  run(g, 1.2, (i) => {
    maxCombo = Math.max(maxCombo, a.combo);
    const k = Math.floor(i / 9);
    const btn = i % 9 === 0 ? seq[k] : undefined;
    return [{ ...NO_INPUT, ...(btn ? { [btn]: true } : {}) }, NO_INPUT];
  });
  assert.equal(maxCombo, 4, `콤보 ${maxCombo}`);
  assert.ok(b.maxHp - b.hp >= 22, `피해 ${b.maxHp - b.hp}`);
});

test('강공격 다음에 기술 커맨드를 넣으면 기술로 끊어 이어진다', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 455;
  run(g, 1.2, (i) => [{ ...NO_INPUT, hp: i === 0, cmd: i === 9 ? 'move2' : undefined }, NO_INPUT]);
  assert.ok(a.combo >= 2 || b.hp <= b.maxHp - 9 - 12, `콤보 ${a.combo}, 체력 ${b.hp}`);
  // 헛치면 끊을 수 없다
  const w = ready();
  w.fighters[0].x = 200;
  w.fighters[1].x = 700;
  let started = false;
  run(w, 0.3, (i) => {
    if (i === 9) started = w.fighters[0].action === 'move';
    return [{ ...NO_INPUT, hp: i === 0, cmd: i === 8 ? 'move1' : undefined }, NO_INPUT];
  });
  assert.equal(started, false);
  // 강킥 다음 약펀치는 이어지지 않는다 (약 → 강 순서)
  const r = ready();
  r.fighters[0].x = 400;
  r.fighters[1].x = 455;
  chain(r, ['hk', 'lp']);
  assert.ok(r.fighters[0].combo <= 1);
  void chain;
});

test('기 모으기: 누르고 있으면 게이지가 차고, 가득 찬 뒤 누르면 변신 (변신 중엔 무적)', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 200;
  b.x = 700;
  run(g, 1, () => [{ ...NO_INPUT, charge: true }, NO_INPUT]);
  assert.equal(a.action, 'charge');
  assert.ok(Math.abs(a.gauge - CHARGE_RATE) < 3, `게이지 ${a.gauge}`);
  run(g, 4, () => [{ ...NO_INPUT, charge: true }, NO_INPUT]);
  assert.equal(a.gauge, GAUGE_MAX);
  assert.equal(a.beast, false, '누르고만 있으면 변신하지 않음');
  run(g, 0.1, (i) => [{ ...NO_INPUT, charge: i > 1 }, NO_INPUT]);
  assert.equal(a.beast, true);
  assert.equal(a.action, 'transform');
  // 변신 중 맞지 않는다, 터질 때 가까운 상대는 밀려난다
  b.x = a.x + 60;
  const hp = a.hp;
  run(g, 0.9, (i) => [NO_INPUT, { ...NO_INPUT, lp: i % 4 === 0 }]);
  assert.equal(a.hp, hp);
  assert.ok(Math.abs(b.x - a.x) > 120, `거리 ${Math.abs(b.x - a.x)}`);
});

test('게이지는 때린 쪽이 더 많이 차고, 한 번에 많이 차지 않는다', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 455;
  chain(g, ['lp', 'lk', 'hp', 'hk']);
  assert.ok(a.gauge > b.gauge, `때린 쪽 ${a.gauge} 맞은 쪽 ${b.gauge}`);
  assert.ok(a.gauge < 20, `콤보 한 번에 ${a.gauge}`);
});

test('뒤로 누르면 막고, 아래 공격은 앉아서 막아야 한다', () => {
  for (const [crouch, expectSmall] of [[false, false], [true, true]] as const) {
    const g = ready();
    const [a, b] = g.fighters;
    a.x = 400;
    b.x = 455;
    run(g, 0.8, (i) => [{ ...NO_INPUT, lk: i % 30 === 1, down: true }, { ...NO_INPUT, right: true, down: crouch }]);
    const lost = b.maxHp - b.hp;
    if (expectSmall) assert.ok(lost <= 3, `앉아 막기 피해 ${lost}`);
    else assert.ok(lost >= 6, `서서 막으면 다리 공격에 맞아야 함 ${lost}`);
  }
});

test('게이지가 차면 변신하고, 변신하면 강해지며 게이지가 줄어든다', () => {
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
  run(g, 1.1, () => [NO_INPUT, NO_INPUT]);
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
      run(g, 2, (i) => [{ ...NO_INPUT, cmd: i === 1 ? slot : undefined }, { ...NO_INPUT, hp: counter && i === 6 }]);
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

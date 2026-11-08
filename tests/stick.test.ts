import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { StickAI } from '../src/games/stick/ai.ts';
import { BOSSES, charById, HEROES } from '../src/games/stick/chars.ts';
import { FLOOR, NO_INPUT, StickFight, type Input } from '../src/games/stick/engine.ts';
import { newStory, selectable, stageResult, STAGES } from '../src/games/stick/story.ts';

const DT = 1 / 60;
function run(g: StickFight, seconds: number, inputs: (t: number) => [Input, Input]) {
  for (let i = 0; i < seconds * 60 && !g.over; i++) g.step(DT, inputs(i * DT));
}
function ready(a = 'rai', b = 'sora') {
  const g = new StickFight({ chars: [charById(a), charById(b)] });
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  return g;
}
const tap = (k: keyof Input, every = 6) => {
  let f = 0;
  return () => [{ ...NO_INPUT, [k]: f++ % every < 3 }, NO_INPUT] as [Input, Input];
};

test('시작하면 라운드 안내 후 싸움이 시작된다', () => {
  const g = new StickFight();
  assert.equal(g.phase, 'intro');
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  assert.equal(g.phase, 'fight');
  assert.ok(g.drainEvents().includes('fight'));
});

test('붙어서 펀치를 연타하면 3단 콤보로 체력이 깎인다', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 450;
  run(g, 1.2, tap('punch'));
  assert.ok(b.hp < b.maxHp - 12, `체력 ${b.hp}`);
  assert.ok(a.meter > 0);
});

test('막으면 피해가 아주 적다', () => {
  const g = ready();
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 455;
  let f = 0;
  run(g, 1, () => [{ ...NO_INPUT, kick: f++ % 30 === 1 }, { ...NO_INPUT, down: true }]);
  assert.ok(b.hp >= b.maxHp - 5, `막았는데 체력 ${b.hp}`);
});

test('점프하면 떴다가 땅으로 돌아온다 (봉은 더 높이)', () => {
  const heights: Record<string, number> = {};
  for (const id of ['rai', 'sora']) {
    const g = ready(id, 'gom');
    const a = g.fighters[0];
    let minY = FLOOR;
    let f = 0;
    run(g, 1.3, () => {
      minY = Math.min(minY, a.y);
      return [{ ...NO_INPUT, up: f++ === 1 }, NO_INPUT];
    });
    heights[id] = FLOOR - minY;
    assert.equal(a.y, FLOOR);
  }
  assert.ok(heights.sora > heights.rai, JSON.stringify(heights));
});

test('봉은 너클보다 멀리서 닿는다', () => {
  const hitAt = (id: string) => {
    const g = ready(id, 'rai');
    const [a, b] = g.fighters;
    a.x = 300;
    b.x = 300 + 125;
    run(g, 0.5, tap('punch', 40));
    return b.hp < b.maxHp;
  };
  assert.equal(hitAt('sora'), true, '봉은 닿아야 함');
  assert.equal(hitAt('rai'), false, '너클은 안 닿아야 함');
});

test('곰돌은 약한 주먹에 밀리지 않는다 (슈퍼아머)', () => {
  const g = ready('rai', 'gom');
  const [a, b] = g.fighters;
  a.x = 400;
  b.x = 450;
  let f = 0;
  let wasHit = false;
  run(g, 0.4, () => {
    if (b.action === 'hit') wasHit = true;
    return [{ ...NO_INPUT, punch: f++ === 1 }, NO_INPUT];
  });
  assert.ok(b.hp < b.maxHp, '피해는 받는다');
  assert.equal(wasHit, false, '움찔하지 않는다');
});

test('카이는 발차기 버튼으로 표창을 던진다', () => {
  const g = ready('kai', 'rai');
  const [a, b] = g.fighters;
  a.x = 200;
  b.x = 700;
  run(g, 1.2, tap('kick', 40));
  assert.ok(b.hp < b.maxHp, `멀리서 맞혀야 함 ${b.hp}`);
});

test('곰돌의 지진은 점프로 피할 수 있다', () => {
  for (const jump of [false, true]) {
    const g = ready('gom', 'rai');
    const [a, b] = g.fighters;
    a.x = 200;
    b.x = 600;
    a.meter = 100;
    let f = 0;
    run(g, 1.6, () => {
      f++;
      const shock = g.projectiles.find((p) => p.low && p.vx > 0);
      const near = !!shock && Math.abs(shock.x - b.x) < 120;
      return [{ ...NO_INPUT, special: f === 1 }, { ...NO_INPUT, up: jump && near }];
    });
    if (jump) assert.equal(b.hp, b.maxHp, '점프하면 안 맞아야 함');
    else assert.ok(b.hp < b.maxHp, '가만히 있으면 맞아야 함');
  }
});

test('기술: 돌진·회오리·그림자 베기·장풍 모두 맞힌다', () => {
  for (const [id, dist] of [['rai', 260], ['sora', 70], ['harang', 300], ['kai', 400]] as const) {
    const g = ready(id, 'sora');
    const [a, b] = g.fighters;
    a.x = 300;
    b.x = 300 + dist;
    a.meter = 100;
    let f = 0;
    run(g, 1.5, () => [{ ...NO_INPUT, special: f++ === 1 }, NO_INPUT]);
    assert.ok(b.hp < b.maxHp - 10, `${id} 기술 피해 ${b.maxHp - b.hp}`);
  }
});

test('대마왕은 체력이 반 아래로 떨어지면 분노한다', () => {
  const g = new StickFight({ chars: [HEROES[0], BOSSES[4]], winsNeeded: 1 });
  run(g, 2.5, () => [NO_INPUT, NO_INPUT]);
  const boss = g.fighters[1];
  boss.hp = boss.maxHp * 0.4;
  g.step(DT, [NO_INPUT, NO_INPUT]);
  assert.equal(boss.enraged, true);
  assert.ok(g.drainEvents().includes('rage'));
});

test('컴퓨터끼리 붙이면 시합이 끝난다 (모든 캐릭터·보스)', () => {
  const all = [...HEROES, ...BOSSES];
  for (let i = 0; i < all.length; i++) {
    const g = new StickFight({ chars: [all[i], all[(i + 3) % all.length]], winsNeeded: 1, roundTime: 99 });
    const ais = [new StickAI(0, 'normal', seeded(i + 1)), new StickAI(1, 'normal', seeded(i + 50))];
    run(g, 200, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    assert.ok(g.over, `${all[i].id}: 안 끝남`);
  }
});

test('어려운 컴퓨터는 쉬운 컴퓨터를 대체로 이긴다', () => {
  let hardWins = 0;
  for (let seed = 0; seed < 6; seed++) {
    const g = new StickFight({ chars: [HEROES[0], HEROES[0]] });
    const ais = [new StickAI(0, 'easy', seeded(seed * 2 + 1)), new StickAI(1, 'hard', seeded(seed * 2 + 2))];
    run(g, 240, () => [ais[0].input(g, DT), ais[1].input(g, DT)]);
    if (g.winner === 1) hardWins++;
  }
  assert.ok(hardWins >= 4, `어려움 승리 ${hardWins}/6`);
});

test('스토리: 5스테이지, 이기면 다음, 지면 이어하기 3번', () => {
  assert.equal(STAGES.length, 5);
  assert.ok(STAGES[4].final);
  const s = newStory('rai');
  assert.equal(stageResult(s, true, 30), 'next');
  assert.equal(s.stage, 1);
  for (let i = 0; i < 3; i++) assert.equal(stageResult(s, false, 10), 'retry');
  assert.equal(stageResult(s, false, 10), 'gameover');
  const t = newStory('gom');
  for (let i = 0; i < 4; i++) stageResult(t, true, 20);
  assert.equal(stageResult(t, true, 20), 'clear');
  assert.ok(t.cleared);
});

test('히든 캐릭터는 스토리를 깨야 고를 수 있다', () => {
  assert.equal(selectable(false).some((c) => c.hidden), false);
  assert.equal(selectable(false).length, 4);
  assert.ok(selectable(true).some((c) => c.id === 'harang'));
});

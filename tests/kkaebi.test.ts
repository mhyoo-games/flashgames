import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { Fight } from '../src/games/kkaebi/battle.ts';
import { canEvolve, evolve, expAt, gainExp, makeMon, maxHp, MAX_LV, statOf, teach, type Mon } from '../src/games/kkaebi/mon.ts';
import { HMS, MOVES, TMS } from '../src/games/kkaebi/moves.ts';
import { LEGEND_NOS, SPECIES } from '../src/games/kkaebi/species.ts';
import { effectiveness } from '../src/games/kkaebi/types.ts';

test('깨비 195종: 3단 진화 64계열 + 숨은 깨비 3, 기술은 모두 있는 것', () => {
  assert.equal(SPECIES.length, 195);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 195, '이름 중복');
  assert.equal(LEGEND_NOS.length, 3);
  for (const s of SPECIES) {
    for (const [, id] of s.learn) assert.ok(MOVES[id], `${s.name}: ${id}`);
    for (const id of s.tm) assert.ok(MOVES[id]);
    if (s.stage < 3) {
      const next = SPECIES[s.evolveTo! - 1];
      assert.equal(next.line, s.line);
      assert.equal(next.stage, s.stage + 1);
      assert.ok(s.evolveAt! >= 5 && s.evolveAt! <= 60);
    }
    if (s.stage === 2) assert.ok(SPECIES[s.no - 2].evolveAt! < s.evolveAt!, `${s.name} 진화 레벨 순서`);
  }
  assert.equal(TMS.length, 30);
  assert.equal(HMS.length, 6);
});

test('상성', () => {
  assert.equal(effectiveness('fire', ['grass']), 2);
  assert.equal(effectiveness('fire', ['grass', 'bug']), 4);
  assert.equal(effectiveness('water', ['water', 'dragon']), 0.25);
  assert.equal(effectiveness('ground', ['wind']), 0);
  assert.equal(effectiveness('normal', ['ghost']), 0);
  assert.equal(effectiveness('electric', ['water', 'wind']), 4);
});

test('레벨업·기술 배우기·진화·레벨 100 제한', () => {
  const rng = seeded(1);
  const m = makeMon(1, 5, rng);
  assert.equal(m.lv, 5);
  assert.equal(m.hp, maxHp(m));
  const atk = statOf(m, 1);
  const r = gainExp(m, expAt(16) - m.exp);
  assert.equal(m.lv, 16);
  assert.ok(r.levels.length === 11 && statOf(m, 1) > atk);
  assert.equal(canEvolve(m), 2);
  assert.ok(evolve(m));
  assert.equal(m.no, 2);
  gainExp(m, 10_000_000);
  assert.equal(m.lv, MAX_LV);
  assert.equal(canEvolve(m), 3);
  evolve(m);
  assert.equal(canEvolve(m), undefined, '3단계는 더 진화하지 않음');
  // 기술은 4개까지, 바꿔 배우기
  while (m.moves.length < 4) teach(m, ['swords', 'headbutt', 'nap', 'bond'].find((x) => !m.moves.some((s) => s.id === x))!);
  assert.equal(teach(m, 'quake'), false);
  assert.equal(teach(m, 'quake', 0), true);
  assert.equal(m.moves[0].id, 'quake');
});

const auto = (f: Fight) => {
  for (let i = 0; i < 200 && !f.outcome; i++) {
    if (f.needSwitch) {
      f.forceSwitch(f.party.findIndex((m) => m.hp > 0));
      continue;
    }
    const slot = f.me.moves.reduce((b, s, j) => (s.pp > 0 && MOVES[s.id].power > MOVES[f.me.moves[b].id].power ? j : b), 0);
    f.turn({ kind: 'move', slot });
  }
  return f;
};

test('전투: 레벨이 높으면 이기고 경험치를 받는다, 효과 굉장함', () => {
  let wins = 0;
  for (let s = 0; s < 20; s++) {
    const rng = seeded(s);
    const me = makeMon(4, 10, rng);
    const foe = makeMon(10, 6, rng);
    const exp = me.exp;
    const f = auto(new Fight([me], [foe], rng));
    if (f.outcome === 'win') {
      wins++;
      assert.ok(me.exp > exp);
    }
  }
  assert.ok(wins >= 17, `승리 ${wins}/20`);
  // 불(용광범 계열) → 풀은 피해가 크다
  const rng = seeded(3);
  const a = makeMon(5, 30, rng);
  const grass = makeMon(2, 30, rng);
  const water = makeMon(8, 30, rng);
  const f = new Fight([a], [grass], rng);
  const dg = f.calc(a, f.pv, grass, f.fv, 90, 'spec', 'fire', false).dmg;
  const dw = f.calc(a, f.pv, water, f.fv, 90, 'spec', 'fire', false).dmg;
  assert.ok(dg > dw * 2.5, `풀 ${dg} 물 ${dw}`);
});

test('포획: 금빛 호리병은 반드시, HP가 적을수록 잘 잡힌다, 트레이너 깨비는 못 잡는다', () => {
  const rng = seeded(9);
  const me = makeMon(1, 20, rng);
  const wild = () => makeMon(SPECIES.findIndex((s) => s.name === '털뭉치') + 1, 8, rng);
  const f = new Fight([me], [wild()], rng);
  f.turn({ kind: 'item', id: 'golden' });
  assert.equal(f.outcome, 'caught');
  const rate = (hpFrac: number) => {
    let n = 0;
    for (let i = 0; i < 300; i++) {
      const w = wild();
      w.hp = Math.max(1, Math.floor(maxHp(w) * hpFrac));
      if (new Fight([makeMon(1, 20, rng)], [w], rng).catchShakes(1) >= 4) n++;
    }
    return n;
  };
  assert.ok(rate(0.05) > rate(1) + 40, `${rate(0.05)} vs ${rate(1)}`);
  // 전설은 잘 안 잡힌다
  const leg = makeMon(LEGEND_NOS[0], 50, rng);
  let caught = 0;
  for (let i = 0; i < 200; i++) if (new Fight([me], [leg], rng).catchShakes(1) >= 4) caught++;
  assert.ok(caught < 10, `전설 ${caught}/200`);
  const t = new Fight([me], [wild()], rng, { name: '꼬마', smart: 1, prize: 100 });
  t.turn({ kind: 'item', id: 'gourd' });
  assert.equal(t.outcome, null);
  t.turn({ kind: 'run' });
  assert.equal(t.outcome, null, '트레이너와는 도망 못 감');
});

test('상태 이상: 화상은 물리 피해 절반, 마비는 스피드 1/4, 잠들면 행동 못 함', () => {
  const rng = seeded(4);
  const a = makeMon(40, 30, rng);
  const b = makeMon(40, 30, rng);
  const f = new Fight([a], [b], rng);
  let n = 0;
  let burned = 0;
  for (let i = 0; i < 40; i++) n += f.calc(a, f.pv, b, f.fv, 80, 'phys', 'fight', false).dmg;
  a.status = 'brn';
  for (let i = 0; i < 40; i++) burned += f.calc(a, f.pv, b, f.fv, 80, 'phys', 'fight', false).dmg;
  assert.ok(burned < n * 0.62);
  b.status = 'slp';
  b.sleep = 3;
  const hp = a.hp;
  a.status = undefined;
  f.turn({ kind: 'move', slot: 0 });
  assert.equal(a.hp, hp, '자는 상대는 공격 못 함');
});

test('트레이너: 깨비를 차례로 내보내고, 상성 좋은 기술을 고른다', () => {
  const rng = seeded(11);
  const me = makeMon(7, 40, rng); // 물방울개구 계열
  const foes: Mon[] = [makeMon(2, 12, rng), makeMon(5, 12, rng)];
  const f = auto(new Fight([me], foes, rng, { name: '관장', smart: 1, prize: 1000 }));
  assert.equal(f.outcome, 'win');
  assert.ok(foes.every((m) => m.hp === 0));
});

test('밸런스: 처음 깨비(레벨 5)는 1번길 야생(레벨 2~4)을 대체로 이긴다', () => {
  for (const starter of [1, 4, 7]) {
    let wins = 0;
    for (let s = 0; s < 30; s++) {
      const rng = seeded(s * 7 + starter);
      const me = makeMon(starter, 5, rng);
      const wild = makeMon([10, 13, 22, 25][s % 4], 2 + (s % 3), rng);
      if (auto(new Fight([me], [wild], rng)).outcome === 'win') wins++;
    }
    assert.ok(wins >= 26, `${SPECIES[starter - 1].name} ${wins}/30`);
  }
});

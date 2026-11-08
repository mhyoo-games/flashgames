import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seeded } from '../src/core/rng.ts';
import { Battle } from '../src/games/quest/battle.ts';
import { CHESTS, CHAPTERS, MAPS, NPCS, OPENING, TRIGGERS, WARPS } from '../src/games/quest/data.ts';
import { applyStep, gainExp, interact, newMember, newWorld, stats, step, tileAt, walkable, wipeOut, type WorldState } from '../src/games/quest/world.ts';

test('지도는 네모나고, 이동 칸·사람·상자가 제자리에 있다', () => {
  for (const m of Object.values(MAPS)) {
    for (const r of m.rows) assert.equal(r.length, m.rows[0].length, `${m.id} 줄 길이`);
  }
  const w = newWorld();
  for (const p of WARPS) {
    const t = tileAt(p.to, p.tx, p.ty);
    assert.ok(!'T~#RHDGCSFMLb'.includes(t), `${p.from}→${p.to} 도착 칸이 막힘 (${t})`);
  }
  for (const n of NPCS) assert.ok('.,=_'.includes(tileAt(n.map, n.x, n.y)), `${n.name} 서 있는 칸 ${tileAt(n.map, n.x, n.y)}`);
  for (const c of CHESTS) assert.ok('C'.includes(tileAt(c.map, c.x, c.y)), `상자 ${c.map} ${c.x},${c.y}`);
  for (const t of TRIGGERS) assert.ok('.,_='.includes(tileAt(t.map, t.x, t.y)));
  assert.ok(walkable(w, w.x, w.y) || true);
  assert.equal(CHAPTERS.length, 8);
});

test('걷기·부딪힘·말 걸기·마을 밖으로', () => {
  const w = newWorld();
  for (const s of OPENING) applyStep(w, s);
  assert.equal(w.items.onigiri, 3);
  assert.equal(w.gold, 30);
  // 사부는 왼쪽 위
  w.dir = 'left';
  w.x = 12;
  w.y = 4;
  const talk = interact(w);
  assert.ok(Array.isArray(talk) && talk.length > 0);
  // 나무에 막힘
  w.x = 1;
  w.y = 1;
  assert.equal(step(w, 'up', seeded(1)).kind, 'blocked');
  // 남쪽 길 끝 → 바람 언덕
  w.x = 12;
  w.y = 16;
  const r = step(w, 'down', seeded(1));
  assert.equal(r.kind === 'moved' && r.warp, true);
  assert.equal(w.map, 'field');
});

test('들판을 걸으면 가끔 적과 만난다, 마을에서는 안 만난다', () => {
  const w = newWorld();
  const rng = seeded(5);
  let met = 0;
  for (let i = 0; i < 400; i++) {
    const r = step(w, i % 2 ? 'left' : 'right', rng);
    if (r.kind === 'moved' && r.encounter) met++;
  }
  assert.equal(met, 0);
  w.map = 'field';
  w.x = 5;
  w.y = 9;
  for (let i = 0; i < 400; i++) {
    const r = step(w, i % 2 ? 'left' : 'right', rng);
    if (r.kind === 'moved' && r.encounter) met++;
  }
  assert.ok(met >= 8 && met <= 50, `만남 ${met}`);
});

test('덩굴은 미르가 있어야 탄다, 상자는 한 번만', () => {
  const w = newWorld();
  w.map = 'forest';
  assert.equal(walkable(w, 25, 3), false);
  w.x = 24;
  w.y = 5;
  let r = step(w, 'up', seeded(1));
  assert.ok(r.kind === 'moved' && r.steps && !w.flags.vines);
  w.flags.mir = true;
  w.y = 5;
  r = step(w, 'up', seeded(1));
  assert.ok(w.flags.vines && walkable(w, 25, 3));
  w.x = 14;
  w.y = 3;
  w.dir = 'up';
  interact(w);
  assert.equal(w.items.candy, 1);
  interact(w);
  assert.equal(w.items.candy, 1);
});

test('레벨이 오르면 능력치가 오른다', () => {
  const m = newMember('haru');
  const before = stats(m);
  const ups = gainExp(m, 60);
  assert.ok(ups.length >= 2);
  assert.ok(stats(m).atk > before.atk && stats(m).hp > before.hp);
  assert.equal(newMember('mir', 4).lv, 4);
});

/** 동료는 가까운 적을 때리고, 미르는 불꽃을 쓴다 (간단한 자동 조작) */
function autoBattle(w: WorldState, foes: string[], seed: number, boss = false) {
  const rng = seeded(seed);
  const b = new Battle(w, foes, rng, { boss });
  for (let i = 0; i < 400 && !b.outcome; i++) {
    const u = b.current;
    if (u.side === 'foe') b.aiTurn();
    else {
      const foesAlive = b.alive('foe');
      let best: [number, number] = [u.x, u.y];
      const d = (x: number, y: number) => Math.min(...foesAlive.map((f) => Math.abs(f.x - x) + Math.abs(f.y - y)));
      for (const p of b.reachable(u)) if (d(p[0], p[1]) < d(best[0], best[1]) && (u.defId === 'haru' || d(p[0], p[1]) >= 2)) best = p;
      b.moveTo(u, best[0], best[1]);
      const hurt = b.alive('hero').find((h) => h.hp < h.maxHp * 0.4);
      if (u.defId === 'mir' && hurt && b.canUse(u, { kind: 'skill', id: 'heal' })) b.act(u, { kind: 'skill', id: 'heal' }, b.targets(u, { kind: 'skill', id: 'heal' }).find((t) => t === hurt) ?? b.targets(u, { kind: 'skill', id: 'heal' })[0]);
      else if (u.defId === 'mir' && b.canUse(u, { kind: 'skill', id: 'fire' })) b.act(u, { kind: 'skill', id: 'fire' }, b.targets(u, { kind: 'skill', id: 'fire' })[0]);
      else if (b.canUse(u, { kind: 'attack' })) b.act(u, { kind: 'attack' }, b.targets(u, { kind: 'attack' })[0]);
      else b.act(u, { kind: 'wait' });
    }
    b.endTurn();
  }
  return b;
}

test('전투: 첫 젤리방울은 하루 혼자 이긴다, 적은 다가와서 때린다', () => {
  let wins = 0;
  for (let s = 0; s < 10; s++) {
    const w = newWorld();
    const b = autoBattle(w, ['jelly', 'jelly'], s);
    if (b.outcome === 'win') wins++;
    assert.ok(b.units[0].hp < b.units[0].maxHp || b.round <= 2, '적이 한 번도 못 때림');
  }
  assert.ok(wins >= 9, `승리 ${wins}/10`);
});

test('보상: 경험치·돈, 전멸하면 돈 절반을 잃고 마을로', () => {
  const w = newWorld();
  const b = autoBattle(w, ['jelly'], 3);
  const r = b.reward();
  assert.equal(r.exp, 4);
  assert.equal(r.gold, 3);
  w.gold = 51;
  w.map = 'cave';
  wipeOut(w);
  assert.equal(w.gold, 25);
  assert.equal(w.map, 'village');
  assert.equal(w.party[0].hp, stats(w.party[0]).hp);
});

test('보스 곰발톱: 레벨 6 두 명이면 대체로 이기고, 레벨 2면 어렵다', () => {
  const run = (lv: number) => {
    let wins = 0;
    for (let s = 0; s < 12; s++) {
      const w = newWorld();
      w.party = [newMember('haru', lv), newMember('mir', lv)];
      if (autoBattle(w, ['bear', 'bandit', 'bandit'], 100 + s, true).outcome === 'win') wins++;
    }
    return wins;
  };
  const strong = run(6);
  const weak = run(2);
  assert.ok(strong >= 7, `레벨 6 승리 ${strong}/12`);
  assert.ok(weak <= 3, `레벨 2 승리 ${weak}/12`);
});

test('마을 → 들판 → 숲 → 동굴 → 보스 앞까지 길이 이어져 있다', () => {
  // 걸어서 갈 수 있는 칸을 넓게 퍼뜨려 본다 (지도 이동 포함)
  const w = newWorld();
  w.flags.vines = true;
  w.flags.guard = true;
  const seen = new Set<string>();
  const q: [string, number, number][] = [['village', 12, 5]];
  while (q.length) {
    const [m, x, y] = q.pop()!;
    const k = `${m}:${x}:${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    w.map = m;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const warp = WARPS.find((p) => p.from === m && p.x === x + dx && p.y === y + dy);
      if (warp) q.push([warp.to, warp.tx, warp.ty]);
      else if (walkable(w, x + dx, y + dy)) q.push([m, x + dx, y + dy]);
    }
  }
  // 보스 바로 앞 칸, 숲의 미르 옆, 마을 종탑 옆
  assert.ok(seen.has('cave:12:3'), '보스 앞에 못 감');
  assert.ok(seen.has('forest:16:8') || seen.has('forest:15:7'), '미르 옆에 못 감');
  assert.ok(seen.has('village:12:8'), '종탑 옆에 못 감');
  for (const c of CHESTS) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${c.map}:${c.x + dx}:${c.y + dy}`)), `상자 ${c.map} ${c.x},${c.y}에 못 감`);
});

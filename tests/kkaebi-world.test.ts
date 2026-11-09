import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOLID, trainerFlag } from '../src/games/kkaebi/field.ts';
import { MAPS } from '../src/games/kkaebi/maps.ts';
import { SPECIES } from '../src/games/kkaebi/species.ts';
import { newGame, type GameState } from '../src/games/kkaebi/world.ts';

test('지도: 네모나고 문·이동 칸이 지도 안을 가리킨다', () => {
  for (const m of Object.values(MAPS)) {
    for (const r of m.rows) assert.equal(r.length, m.rows[0].length, `${m.id} 줄 길이`);
    for (const w of m.warps) {
      const to = MAPS[w.to];
      assert.ok(to, `${m.id} → ${w.to} 없음`);
      const t = to.rows[w.ty]?.[w.tx];
      assert.ok(t !== undefined, `${m.id} → ${w.to} (${w.tx},${w.ty}) 지도 밖`);
      assert.ok(!SOLID.has(t) || t === '~', `${m.id} → ${w.to} (${w.tx},${w.ty}) 도착 칸이 막힘 ${t}`);
    }
  }
});

/** 인장 수에 따라 지나갈 수 있는 곳을 넓게 퍼뜨린다 */
function reach(s: GameState) {
  const seen = new Set<string>();
  const q: [string, number, number][] = [[s.map, s.x, s.y]];
  const can = (m: string, x: number, y: number, dy: number) => {
    const map = MAPS[m];
    const t = map.rows[y]?.[x];
    if (t === undefined) return false;
    if (t === 't') return s.badges >= 1;
    if (t === 'O') return s.badges >= 3;
    if (t === '~') return s.badges >= 4;
    if (t === 'w') return s.badges >= 6;
    if (t === '<') return dy > 0;
    if (SOLID.has(t)) return false;
    return !map.npcs.some((n) => n.x === x && n.y === y && !n.hidden?.(s) && !(n.trainer && s.flags[trainerFlag(m, n.id)] && false));
  };
  while (q.length) {
    const [m, x, y] = q.pop()!;
    const k = `${m}:${x}:${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const w = MAPS[m].warps.find((p) => p.x === x + dx && p.y === y + dy);
      if (w) {
        if (!w.need?.(s)) q.push([w.to, w.tx, w.ty]);
        continue;
      }
      if (can(m, x + dx, y + dy, dy)) q.push([m, x + dx, y + dy]);
    }
  }
  return seen;
}
const nextTo = (seen: Set<string>, m: string, x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 2]].some(([dx, dy]) => seen.has(`${m}:${x + dx}:${y + dy}`));
const npcPos = (m: string, id: string) => {
  const n = MAPS[m].npcs.find((x) => x.id === id)!;
  return [n.x, n.y] as const;
};

test('진행 순서대로 모든 관장·흑연단·전설·깨비 왕에게 갈 수 있다', () => {
  const s = newGame();
  s.party = [{ no: 1, lv: 5, exp: 0, iv: [0, 0, 0, 0, 0, 0], hp: 10, moves: [] }];
  s.flags.dex = true;
  s.map = 'saessak';
  s.x = 9;
  s.y = 10;
  const towns = ['ikki', 'beongae', 'bawi', 'mul', 'geum', 'bul', 'nun', 'yong'];
  for (let b = 0; b < 8; b++) {
    if (b === 2) s.flags.ware = true;
    if (b === 4) s.flags.gang = true;
    const seen = reach(s);
    const [lx, ly] = npcPos(`${towns[b]}-g`, `leader${b + 1}`);
    assert.ok(nextTo(seen, `${towns[b]}-g`, lx, ly), `${b + 1}번째 관장에게 못 감 (인장 ${s.badges})`);
    if (b === 1) assert.ok(nextTo(seen, 'ware', ...npcPos('ware', 'admin1')), '창고 간부');
    if (b === 4) assert.ok(nextTo(seen, 'hideout', ...npcPos('hideout', 'gangboss')), '흑연단 두목');
    s.badges = b + 1;
    s.tms = ['cut', 'flash', 'strength', 'surf', 'fly', 'waterfall'];
  }
  s.flags.moonbell = true;
  const seen = reach(s);
  assert.ok(nextTo(seen, 'tower3', ...npcPos('tower3', 'legend1')), '금빛봉황');
  assert.ok(nextTo(seen, 'whirl', ...npcPos('whirl', 'legend2')), '은빛해룡');
  assert.ok(nextTo(seen, 'gforest', ...npcPos('gforest', 'legend3')), '달빛구미');
  assert.ok(nextTo(seen, 'league1', ...npcPos('league1', 'elite0')), '사천왕');
});

test('도감: 64계열 모두 야생·선물로 첫 단계(또는 다음 단계)를 만날 수 있다', () => {
  const found = new Set<number>();
  for (const m of Object.values(MAPS)) for (const e of [...(m.land ?? []), ...(m.water ?? [])]) found.add(SPECIES[e.no - 1].line);
  for (const st of [0, 1, 2]) found.add(st); // 처음 고르는 세 계열
  const missing = [...new Set(SPECIES.filter((s) => !s.legend).map((s) => s.line))].filter((l) => !found.has(l)).map((l) => SPECIES.find((s) => s.line === l)!.name);
  assert.deepEqual(missing, []);
  // 밤에만 나오는 깨비가 있다
  assert.ok(Object.values(MAPS).some((m) => m.land?.some((e) => e.time === 'night')));
});

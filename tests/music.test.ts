import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeBar, newComposer, SONGS } from '../src/core/music.ts';
import { seeded } from '../src/core/rng.ts';
import { GAMES } from '../src/games/registry.ts';

test('곡마다 마디가 만들어지고 음이 알맞은 범위에 있다', () => {
  for (const song of Object.values(SONGS)) {
    const c = newComposer(song);
    const rng = seeded(7);
    let lead = 0;
    for (let bar = 0; bar < 24; bar++) {
      for (const e of composeBar(c, rng)) {
        assert.ok(e.beat >= 0 && e.beat < 4 && e.dur > 0 && e.vel > 0 && e.vel <= 1, `${song.id} 이상한 음표`);
        if (e.inst === 'lead') {
          lead++;
          assert.ok(e.midi >= song.range[0] && e.midi <= song.range[1]);
          assert.ok(song.scale.includes(e.midi % 12), `${song.id} 음계 밖 ${e.midi}`);
        }
      }
    }
    assert.ok(lead > 20, `${song.id} 멜로디가 너무 적음`);
  }
});

test('4·5마디째는 첫 두 마디 멜로디를 되풀이한다 (곡처럼 들리게)', () => {
  const c = newComposer(SONGS.maze);
  const rng = seeded(3);
  const bars = Array.from({ length: 6 }, () => composeBar(c, rng).filter((e) => e.inst === 'lead'));
  assert.deepEqual(bars[4], bars[0]);
  assert.deepEqual(bars[5], bars[1]);
});

test('게임 목록: 모든 게임이 있는 곡을 쓰고 id가 겹치지 않는다', () => {
  const ids = new Set<string>();
  for (const g of GAMES) {
    assert.ok(!ids.has(g.id));
    ids.add(g.id);
    assert.ok(SONGS[g.song], `${g.id}: 없는 곡`);
  }
});

// 배경음악 작곡 (8비트 오락실 느낌). 화음 진행 위에서 마디마다 멜로디를 새로 만든다.
// 소리는 내지 않는 순수 계산 → 테스트 가능. 연주는 audio.ts
import type { Rng } from './rng.ts';

export type Inst = 'lead' | 'bass' | 'arp' | 'kick' | 'snare' | 'hat';
export type SongId = 'lobby' | 'fight' | 'boss' | 'maze';

export interface NoteEvent {
  beat: number;
  dur: number;
  midi: number;
  inst: Inst;
  vel: number;
}

interface Chord {
  root: number;
  tones: number[];
}

export interface Song {
  id: SongId;
  name: string;
  bpm: number;
  swing: number;
  chords: Chord[];
  scale: number[];
  /** 멜로디 음역 */
  range: [number, number];
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];
const MAJ7 = [0, 4, 7, 11];
const MIN7 = [0, 3, 7, 10];

export const SONGS: Record<SongId, Song> = {
  // 첫 화면: 느긋한 오락실 대기 음악 (F장조)
  lobby: {
    id: 'lobby',
    name: '동전 넣고 기다리기',
    bpm: 96,
    swing: 0.22,
    chords: [
      { root: 41, tones: MAJ7 },
      { root: 38, tones: MIN7 },
      { root: 34, tones: MAJ7 },
      { root: 36, tones: [0, 4, 7, 10] },
    ],
    scale: [5, 7, 9, 0, 2],
    range: [69, 84],
  },
  // 막대 결투: 빠르고 긴장감 있는 (E단조)
  fight: {
    id: 'fight',
    name: '옥상 위의 결투',
    bpm: 152,
    swing: 0,
    chords: [
      { root: 40, tones: MIN },
      { root: 40, tones: MIN },
      { root: 36, tones: MAJ },
      { root: 38, tones: MAJ },
      { root: 40, tones: MIN },
      { root: 43, tones: MAJ },
      { root: 45, tones: MIN },
      { root: 35, tones: [0, 4, 7, 10] },
    ],
    scale: [4, 7, 9, 11, 2],
    range: [64, 83],
  },
  // 최종 보스: 어둡고 급박한 (D단조, 화성단음계)
  boss: {
    id: 'boss',
    name: '어둠의 성',
    bpm: 164,
    swing: 0,
    chords: [
      { root: 38, tones: MIN },
      { root: 38, tones: MIN },
      { root: 34, tones: MAJ },
      { root: 33, tones: [0, 4, 7, 10] },
      { root: 38, tones: MIN },
      { root: 43, tones: MIN },
      { root: 34, tones: MAJ },
      { root: 33, tones: [0, 4, 7, 10] },
    ],
    scale: [2, 4, 5, 9, 10, 1],
    range: [62, 81],
  },
  // 도토리 미로: 통통 튀는 (C장조, 살짝 셔플)
  maze: {
    id: 'maze',
    name: '한밤의 도토리 줍기',
    bpm: 132,
    swing: 0.18,
    chords: [
      { root: 36, tones: MAJ },
      { root: 45, tones: MIN },
      { root: 41, tones: MAJ },
      { root: 43, tones: MAJ },
      { root: 36, tones: MAJ },
      { root: 40, tones: MIN },
      { root: 41, tones: MAJ },
      { root: 43, tones: [0, 4, 7, 10] },
    ],
    scale: [0, 2, 4, 7, 9],
    range: [67, 86],
  },
};

const RHYTHMS: Record<SongId, number[][]> = {
  lobby: [
    [0, 1, 1.5, 2.5],
    [0.5, 1, 2, 3],
    [0, 1.5, 2, 3, 3.5],
  ],
  fight: [
    [0, 0.5, 1, 1.5, 2, 3],
    [0, 0.75, 1.5, 2, 2.5, 3, 3.5],
    [0, 1, 1.5, 2.5, 3],
  ],
  boss: [
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    [0, 1, 1.5, 2, 3, 3.5],
    [0, 0.75, 1.5, 2.25, 3],
  ],
  maze: [
    [0, 0.5, 1, 2, 2.5, 3],
    [0, 1, 1.5, 2, 3, 3.5],
    [0.5, 1, 1.5, 2.5, 3],
  ],
};

export interface Composer {
  song: Song;
  bar: number;
  last: number;
  /** 첫 두 마디 멜로디를 기억했다가 되풀이 (곡처럼 들리게) */
  motif: NoteEvent[][];
}

export function newComposer(song: Song): Composer {
  return { song, bar: 0, last: Math.round((song.range[0] + song.range[1]) / 2), motif: [] };
}

function pickNote(song: Song, chord: Chord, prev: number, strong: boolean, rng: Rng): number {
  const pcs = chord.tones.map((t) => (chord.root + t) % 12);
  let total = 0;
  const opts: [number, number][] = [];
  for (let n = song.range[0]; n <= song.range[1]; n++) {
    if (!song.scale.includes(n % 12)) continue;
    const d = Math.abs(n - prev);
    if (d > 7) continue;
    let w = 1 / (1 + d * 0.5);
    if (pcs.includes(n % 12)) w *= strong ? 3.5 : 1.3;
    if (d === 0) w *= 0.5;
    opts.push([n, w]);
    total += w;
  }
  let r = rng() * total;
  for (const [n, w] of opts) if ((r -= w) <= 0) return n;
  return opts.length ? opts[opts.length - 1][0] : prev;
}

export function composeBar(c: Composer, rng: Rng): NoteEvent[] {
  const { song } = c;
  const chord = song.chords[c.bar % song.chords.length];
  const ev: NoteEvent[] = [];
  const pos = c.bar % 8;

  // 북: 곡마다 다른 박자
  if (song.id === 'fight' || song.id === 'boss') {
    for (const b of [0, 1.5, 2, 3.5]) ev.push({ beat: b, dur: 0.2, midi: 0, inst: 'kick', vel: 0.9 });
    for (const b of [1, 3]) ev.push({ beat: b, dur: 0.2, midi: 0, inst: 'snare', vel: 0.7 });
    for (let b = 0; b < 4; b += 0.5) ev.push({ beat: b, dur: 0.05, midi: 0, inst: 'hat', vel: b % 1 ? 0.35 : 0.5 });
    // 베이스: 8분음표 질주
    for (let b = 0; b < 4; b += 0.5) ev.push({ beat: b, dur: 0.4, midi: chord.root + (b === 1.5 || b === 3.5 ? 12 : 0), inst: 'bass', vel: 0.8 });
  } else if (song.id === 'maze') {
    for (const b of [0, 2]) ev.push({ beat: b, dur: 0.2, midi: 0, inst: 'kick', vel: 0.8 });
    for (const b of [1, 3]) ev.push({ beat: b, dur: 0.2, midi: 0, inst: 'snare', vel: 0.5 });
    for (let b = 0.5; b < 4; b += 1) ev.push({ beat: b, dur: 0.05, midi: 0, inst: 'hat', vel: 0.4 });
    // 베이스: 근음-5도 통통
    for (const [b, iv] of [[0, 0], [1, 7], [2, 12], [3, 7]] as const) ev.push({ beat: b, dur: 0.7, midi: chord.root + iv, inst: 'bass', vel: 0.75 });
  } else {
    ev.push({ beat: 0, dur: 0.2, midi: 0, inst: 'kick', vel: 0.5 });
    ev.push({ beat: 2, dur: 0.2, midi: 0, inst: 'snare', vel: 0.3 });
    for (let b = 0; b < 4; b += 1) ev.push({ beat: b + 0.5, dur: 0.05, midi: 0, inst: 'hat', vel: 0.25 });
    ev.push({ beat: 0, dur: 1.8, midi: chord.root, inst: 'bass', vel: 0.65 });
    ev.push({ beat: 2, dur: 1.8, midi: chord.root + 7, inst: 'bass', vel: 0.5 });
  }

  // 아르페지오 (화음을 빠르게 굴림)
  const arpNotes = chord.tones.map((t) => chord.root + 24 + t);
  const arpStep = song.id === 'lobby' ? 0.5 : 0.25;
  if (song.id !== 'fight' || pos >= 4) {
    for (let b = 0, i = 0; b < 4; b += arpStep, i++) ev.push({ beat: b, dur: arpStep * 0.8, midi: arpNotes[i % arpNotes.length], inst: 'arp', vel: 0.3 });
  }

  // 멜로디: 첫 두 마디를 동기로 삼아 4·5마디째에 다시 쓴다
  let melody: NoteEvent[];
  if ((pos === 4 || pos === 5) && c.motif[pos - 4]) {
    melody = c.motif[pos - 4].map((n) => ({ ...n }));
  } else if (pos === 7 && rng() < 0.5) {
    melody = []; // 숨 쉬는 마디
  } else {
    const rhythm = RHYTHMS[song.id][Math.floor(rng() * RHYTHMS[song.id].length)];
    melody = [];
    let prev = c.last;
    rhythm.forEach((b, i) => {
      prev = pickNote(song, chord, prev, b % 1 === 0, rng);
      const next = rhythm[i + 1] ?? 4;
      melody.push({ beat: b, dur: Math.min(next - b, 1) * 0.85, midi: prev, inst: 'lead', vel: 0.55 + rng() * 0.2 });
    });
    c.last = prev;
    if (pos < 2) c.motif[pos] = melody;
  }
  ev.push(...melody);
  c.bar++;
  return ev;
}

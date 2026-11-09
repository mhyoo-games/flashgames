// 기술 목록 (새로 지은 이름). 효과 표기:
//  brn10 = 10% 화상, par/psn/slp/frz/cnf/flinch 도 같은 식 (숫자 없으면 반드시)
//  u:atk+1 = 내 능력 변화, f:def-1:30 = 상대 능력 변화 (30% 확률)
//  drain 흡수 · recoil 반동 · multi 2~5번 · twice 2번 · prio 선제 · crit 급소 잘 맞음
//  heal 절반 회복 · rest 잠들며 모두 회복 · level 레벨만큼 고정 피해 · sure 반드시 맞음
import type { Type } from './types.ts';

export type Category = 'phys' | 'spec' | 'status';
export type Stat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type Status = 'brn' | 'psn' | 'par' | 'slp' | 'frz';

export interface Effect {
  kind: 'status' | 'cnf' | 'flinch' | 'stat' | 'drain' | 'recoil' | 'multi' | 'twice' | 'prio' | 'crit' | 'heal' | 'rest' | 'level' | 'sure';
  status?: Status;
  chance: number;
  self?: boolean;
  stats?: [Stat, number][];
}

export interface MoveDef {
  id: string;
  name: string;
  type: Type;
  cat: Category;
  power: number;
  acc: number;
  pp: number;
  effects: Effect[];
  /** 필드에서 쓰는 비전 기술 */
  field?: 'cut' | 'flash' | 'strength' | 'surf' | 'fly' | 'climb';
}

type Row = [string, string, Type, 'P' | 'S' | 'X', number, number, number, string?];
const C = { P: 'phys', S: 'spec', X: 'status' } as const;

const ROWS: Row[] = [
  // 보통
  ['tackle', '몸통박기', 'normal', 'P', 40, 100, 35],
  ['scratch', '긁기', 'normal', 'P', 40, 100, 35],
  ['quick', '번개걸음', 'normal', 'P', 40, 100, 30, 'prio'],
  ['headbutt', '머리찧기', 'normal', 'P', 70, 100, 15, 'flinch30'],
  ['stomp', '쿵쿵밟기', 'normal', 'P', 65, 100, 20, 'flinch30'],
  ['bodypress', '깔아뭉개기', 'normal', 'P', 85, 100, 15, 'par30'],
  ['rush', '막무가내돌진', 'normal', 'P', 90, 85, 20, 'recoil'],
  ['hyper', '온힘광선', 'normal', 'S', 150, 90, 5],
  ['slaps', '찰싹찰싹', 'normal', 'P', 15, 85, 10, 'multi'],
  ['growl', '으르렁', 'normal', 'X', 0, 100, 40, 'f:atk-1'],
  ['tailwhip', '꼬리살랑', 'normal', 'X', 0, 100, 30, 'f:def-1'],
  ['swords', '칼날춤', 'normal', 'X', 0, 100, 20, 'u:atk+2'],
  ['nap', '꿀잠', 'normal', 'X', 0, 100, 10, 'rest'],
  ['recover', '숨고르기', 'normal', 'X', 0, 100, 10, 'heal'],
  ['bond', '정든 일격', 'normal', 'P', 100, 100, 20],
  ['cut', '베어내기', 'normal', 'P', 50, 95, 30],
  ['strength', '장사의힘', 'normal', 'P', 80, 100, 15],
  ['harden', '몸굳히기', 'normal', 'X', 0, 100, 30, 'u:def+1'],
  // 불
  ['ember', '불티', 'fire', 'S', 40, 100, 25, 'brn10'],
  ['flamewheel', '불수레', 'fire', 'P', 60, 100, 25, 'brn10'],
  ['firepunch', '불주먹', 'fire', 'P', 75, 100, 15, 'brn10'],
  ['flame', '불길뿜기', 'fire', 'S', 90, 100, 15, 'brn10'],
  ['inferno', '대화염', 'fire', 'S', 110, 85, 5, 'brn30'],
  ['wisp', '도깨비불씨', 'fire', 'X', 0, 85, 15, 'brn'],
  ['blaze', '불꽃돌격', 'fire', 'P', 120, 100, 15, 'recoil;brn10'],
  // 물
  ['watergun', '물총', 'water', 'S', 40, 100, 25],
  ['bubble', '거품줄기', 'water', 'S', 65, 100, 20, 'f:spe-1:10'],
  ['aquatail', '물꼬리치기', 'water', 'P', 90, 90, 10],
  ['surf', '파도타기', 'water', 'S', 90, 100, 15],
  ['torrent', '급류포', 'water', 'S', 110, 80, 5],
  ['waterfall', '폭포오르기', 'water', 'P', 80, 100, 15, 'flinch20'],
  ['shell', '껍데기숨기', 'water', 'X', 0, 100, 40, 'u:def+1'],
  ['whirl', '소용돌이', 'water', 'S', 35, 90, 15, 'multi'],
  ['brine', '짠물뿌리기', 'water', 'S', 65, 100, 10],
  ['razorshell', '조개칼', 'water', 'P', 75, 95, 10, 'crit'],
  ['scald', '끓는물', 'water', 'S', 80, 100, 15, 'brn30'],
  // 풀
  ['vine', '덩굴채찍', 'grass', 'P', 45, 100, 25],
  ['leafblade', '잎사귀칼', 'grass', 'P', 70, 100, 15, 'crit'],
  ['sip', '양분빨기', 'grass', 'S', 40, 100, 15, 'drain'],
  ['bigsip', '큰양분빨기', 'grass', 'S', 75, 100, 10, 'drain'],
  ['sunbeam', '햇살포', 'grass', 'S', 110, 100, 10],
  ['sleeppowder', '졸음가루', 'grass', 'X', 0, 75, 15, 'slp'],
  ['stunpowder', '찌릿가루', 'grass', 'X', 0, 75, 30, 'par'],
  ['poisonpowder', '독가루', 'grass', 'X', 0, 75, 35, 'psn'],
  ['petals', '꽃잎폭풍', 'grass', 'S', 120, 100, 10, 'u:spa-1'],
  // 전기
  ['shock', '찌릿', 'electric', 'S', 40, 100, 30, 'par10'],
  ['spark', '불똥튀기', 'electric', 'P', 65, 100, 20, 'par30'],
  ['bolt', '십만번개', 'electric', 'S', 90, 100, 15, 'par10'],
  ['thunder', '천둥벼락', 'electric', 'S', 110, 70, 10, 'par30'],
  ['wave', '저릿파동', 'electric', 'X', 0, 90, 20, 'par'],
  ['thunderpunch', '번개주먹', 'electric', 'P', 75, 100, 15, 'par10'],
  ['voltcrash', '벼락돌진', 'electric', 'P', 90, 100, 15, 'recoil'],
  // 얼음
  ['iceshard', '얼음조각', 'ice', 'P', 40, 100, 30, 'prio'],
  ['aurora', '오로라빛', 'ice', 'S', 65, 100, 20, 'f:atk-1:10'],
  ['icebeam', '얼음광선', 'ice', 'S', 90, 100, 10, 'frz10'],
  ['blizzard', '눈보라', 'ice', 'S', 110, 70, 5, 'frz10'],
  ['icepunch', '얼음주먹', 'ice', 'P', 75, 100, 15, 'frz10'],
  ['icicles', '고드름연사', 'ice', 'P', 25, 100, 30, 'multi'],
  // 격투
  ['chop', '손날치기', 'fight', 'P', 50, 100, 25, 'crit'],
  ['doublekick', '두발차기', 'fight', 'P', 30, 100, 30, 'twice'],
  ['breaker', '깨부수기', 'fight', 'P', 40, 100, 15, 'f:def-1:50'],
  ['aura', '기공탄', 'fight', 'S', 80, 100, 20, 'sure'],
  ['closecombat', '몸싸움', 'fight', 'P', 120, 100, 5, 'u:def-1,spd-1'],
  ['focus', '혼신의장풍', 'fight', 'S', 120, 70, 5, 'f:spd-1:10'],
  ['bulk', '근육키우기', 'fight', 'X', 0, 100, 20, 'u:atk+1,def+1'],
  ['wheel', '굴러치기', 'fight', 'P', 80, 80, 20, 'recoil'],
  // 독
  ['sting', '독바늘', 'poison', 'P', 15, 100, 35, 'psn30'],
  ['acid', '산성액', 'poison', 'S', 40, 100, 30, 'f:spd-1:10'],
  ['sludge', '독덩이폭탄', 'poison', 'S', 90, 100, 10, 'psn30'],
  ['poisonjab', '독찌르기', 'poison', 'P', 80, 100, 20, 'psn30'],
  ['toxic', '맹독', 'poison', 'X', 0, 90, 10, 'psn'],
  ['smog', '매연', 'poison', 'S', 30, 70, 20, 'psn40'],
  // 땅
  ['sand', '모래뿌리기', 'ground', 'X', 0, 100, 15, 'f:acc-1'],
  ['mud', '진흙던지기', 'ground', 'S', 20, 100, 10, 'f:acc-1'],
  ['bulldoze', '땅고르기', 'ground', 'P', 60, 100, 20, 'f:spe-1'],
  ['dig', '땅굴파기', 'ground', 'P', 80, 100, 10],
  ['quake', '땅울림', 'ground', 'P', 100, 100, 10],
  ['earthpower', '대지의기운', 'ground', 'S', 90, 100, 10, 'f:spd-1:10'],
  ['bone', '뼈부메랑', 'ground', 'P', 50, 90, 10, 'twice'],
  // 바람
  ['peck', '콕쪼기', 'wind', 'P', 35, 100, 35],
  ['wing', '날개치기', 'wind', 'P', 60, 100, 35],
  ['airslash', '바람칼날', 'wind', 'S', 75, 95, 15, 'flinch30'],
  ['fly', '하늘날기', 'wind', 'P', 90, 95, 15],
  ['gale', '돌개바람', 'wind', 'S', 110, 70, 10, 'cnf30'],
  ['bravebird', '용감한활강', 'wind', 'P', 120, 100, 15, 'recoil'],
  ['gust', '산들바람', 'wind', 'S', 40, 100, 35],
  ['aerial', '제비베기', 'wind', 'P', 60, 100, 20, 'sure'],
  ['tailwind', '순풍', 'wind', 'X', 0, 100, 15, 'u:spe+2'],
  // 마음
  ['confusion', '염력', 'mind', 'S', 50, 100, 25, 'cnf10'],
  ['psybeam', '환상광선', 'mind', 'S', 65, 100, 20, 'cnf10'],
  ['psychic', '마음의힘', 'mind', 'S', 90, 100, 10, 'f:spd-1:10'],
  ['psycut', '마음칼', 'mind', 'P', 70, 100, 20, 'crit'],
  ['dreamstrike', '꿈의일격', 'mind', 'S', 120, 90, 5],
  ['hypno', '최면', 'mind', 'X', 0, 60, 20, 'slp'],
  ['calm', '명상', 'mind', 'X', 0, 100, 20, 'u:spa+1,spd+1'],
  // 벌레
  ['bugbite', '벌레물기', 'bug', 'P', 60, 100, 20],
  ['silk', '실뿜기', 'bug', 'X', 0, 95, 40, 'f:spe-2'],
  ['signal', '신호광선', 'bug', 'S', 75, 100, 15, 'cnf10'],
  ['buzz', '윙윙소리', 'bug', 'S', 90, 100, 10, 'f:spd-1:10'],
  ['horn', '거대뿔찌르기', 'bug', 'P', 120, 85, 10],
  ['leech', '흡혈', 'bug', 'P', 80, 100, 10, 'drain'],
  ['flutter', '나비춤', 'bug', 'X', 0, 100, 20, 'u:spa+1,spd+1,spe+1'],
  // 바위
  ['rockthrow', '돌던지기', 'rock', 'P', 50, 90, 15],
  ['ancient', '태고의힘', 'rock', 'S', 60, 100, 5, 'u:atk+1,def+1,spa+1,spd+1,spe+1:10'],
  ['rockslide', '돌사태', 'rock', 'P', 75, 90, 10, 'flinch30'],
  ['stoneedge', '날선바위', 'rock', 'P', 100, 80, 5, 'crit'],
  ['gem', '보석빛', 'rock', 'S', 80, 100, 20],
  ['polish', '돌다듬기', 'rock', 'X', 0, 100, 20, 'u:spe+2'],
  // 귀신
  ['lick', '날름핥기', 'ghost', 'P', 30, 100, 30, 'par30'],
  ['nightshade', '밤그림자', 'ghost', 'S', 1, 100, 15, 'level'],
  ['shadowclaw', '그림자손톱', 'ghost', 'P', 70, 100, 15, 'crit'],
  ['shadowball', '그림자구슬', 'ghost', 'S', 80, 100, 15, 'f:spd-1:20'],
  ['confuseray', '홀림빛', 'ghost', 'X', 0, 100, 10, 'cnf'],
  ['scare', '깜짝놀래기', 'ghost', 'P', 30, 100, 15, 'flinch30'],
  // 용
  ['dragonbreath', '용의입김', 'dragon', 'S', 60, 100, 20, 'par30'],
  ['dragonclaw', '용발톱', 'dragon', 'P', 80, 100, 15],
  ['dragonpulse', '용의파동', 'dragon', 'S', 85, 100, 10],
  ['outrage', '용의분노', 'dragon', 'P', 120, 100, 10, 'cnf'],
  ['meteor', '유성낙하', 'dragon', 'S', 130, 90, 5, 'u:spa-2'],
  ['dragondance', '용의춤', 'dragon', 'X', 0, 100, 20, 'u:atk+1,spe+1'],
  // 어둠
  ['bite', '깨물기', 'dark', 'P', 60, 100, 25, 'flinch30'],
  ['crunch', '으스러뜨리기', 'dark', 'P', 80, 100, 15, 'f:def-1:20'],
  ['darkpulse', '어둠의파동', 'dark', 'S', 80, 100, 15, 'flinch20'],
  ['ambush', '뒤통수치기', 'dark', 'P', 70, 100, 5, 'prio'],
  ['plot', '나쁜꾀', 'dark', 'X', 0, 100, 20, 'u:spa+2'],
  ['feint', '속임수공격', 'dark', 'P', 60, 100, 20, 'sure'],
  // 강철
  ['metalclaw', '쇠발톱', 'steel', 'P', 50, 95, 35, 'u:atk+1:10'],
  ['ironhead', '쇠머리박기', 'steel', 'P', 80, 100, 15, 'flinch30'],
  ['flashcannon', '번쩍포', 'steel', 'S', 80, 100, 10, 'f:spd-1:10'],
  ['meteorpunch', '별똥주먹', 'steel', 'P', 90, 90, 10, 'u:atk+1:20'],
  ['irondefense', '무쇠방패', 'steel', 'X', 0, 100, 15, 'u:def+2'],
  ['steelwing', '쇠날개', 'steel', 'P', 70, 90, 25, 'u:def+1:10'],
  // 빛
  ['twinkle', '반짝바람', 'light', 'S', 40, 100, 30],
  ['shine', '눈부신빛', 'light', 'S', 80, 100, 10],
  ['moonbeam', '달빛줄기', 'light', 'S', 95, 100, 15, 'f:spa-1:30'],
  ['playrough', '장난치기', 'light', 'P', 90, 90, 10, 'f:atk-1:10'],
  ['moonlight', '달빛쬐기', 'light', 'X', 0, 100, 5, 'heal'],
  ['kiss', '홀딱입맞춤', 'light', 'X', 0, 75, 10, 'cnf'],
  ['fairywind', '꽃가루바람', 'light', 'S', 60, 100, 20, 'f:spa-1:10'],
  ['starpunch', '별빛주먹', 'light', 'P', 65, 100, 15, 'crit'],
  ['dazzle', '찬란한빛', 'light', 'S', 110, 85, 5, 'u:spa-1'],
  ['flash', '빛내기', 'light', 'X', 0, 100, 20, 'f:acc-1'],
];

function parseEffects(s?: string): Effect[] {
  if (!s) return [];
  return s.split(';').map((part) => {
    const m = /^(brn|psn|par|slp|frz)(\d+)?$/.exec(part);
    if (m) return { kind: 'status', status: m[1] as Status, chance: m[2] ? +m[2] : 100 };
    const c = /^(cnf|flinch)(\d+)?$/.exec(part);
    if (c) return { kind: c[1] as 'cnf' | 'flinch', chance: c[2] ? +c[2] : 100 };
    const st = /^(u|f):([a-z+\-0-9,]+)(?::(\d+))?$/.exec(part);
    if (st) {
      const stats = st[2].split(',').map((x) => {
        const mm = /^([a-z]+)([+-]\d)$/.exec(x)!;
        return [mm[1] as Stat, +mm[2]] as [Stat, number];
      });
      return { kind: 'stat', self: st[1] === 'u', stats, chance: st[3] ? +st[3] : 100 };
    }
    return { kind: part as Effect['kind'], chance: 100 };
  });
}

export const MOVES: Record<string, MoveDef> = {};
for (const [id, name, type, cat, power, acc, pp, eff] of ROWS) {
  MOVES[id] = { id, name, type, cat: C[cat], power, acc, pp, effects: parseEffects(eff) };
}
MOVES.cut.field = 'cut';
MOVES.flash.field = 'flash';
MOVES.strength.field = 'strength';
MOVES.surf.field = 'surf';
MOVES.fly.field = 'fly';
MOVES.waterfall.field = 'climb';

/** 비전 부적 (필드 기술) — 몇 번째 인장이 있어야 밖에서 쓸 수 있나 */
export const HMS: { move: string; badge: number; name: string }[] = [
  { move: 'cut', badge: 1, name: '비전 부적 01 베어내기' },
  { move: 'flash', badge: 2, name: '비전 부적 02 빛내기' },
  { move: 'strength', badge: 3, name: '비전 부적 03 장사의힘' },
  { move: 'surf', badge: 4, name: '비전 부적 04 파도타기' },
  { move: 'fly', badge: 5, name: '비전 부적 05 하늘날기' },
  { move: 'waterfall', badge: 6, name: '비전 부적 06 폭포오르기' },
];

/** 기술 부적 30종 (몇 번이고 쓸 수 있다) */
export const TMS: string[] = [
  'headbutt', 'bond', 'nap', 'swords', 'flame', 'inferno', 'torrent', 'bigsip', 'sunbeam', 'bolt',
  'thunder', 'icebeam', 'blizzard', 'aura', 'bulk', 'sludge', 'toxic', 'quake', 'dig', 'airslash',
  'psychic', 'calm', 'buzz', 'rockslide', 'shadowball', 'dragonpulse', 'crunch', 'darkpulse', 'flashcannon', 'shine',
];

/** 상태 이상 이름 */
export const STATUS_NAME: Record<Status, string> = { brn: '화상', psn: '독', par: '마비', slp: '잠듦', frz: '얼음' };
export const STAT_NAME: Record<Stat, string> = { atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', acc: '명중률', eva: '회피율' };

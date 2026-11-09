// 깨비 195종: 3단 진화 64계열 + 숨은 깨비 3종
import { MOVES, TMS, HMS } from './moves.ts';
import type { Type } from './types.ts';

export type Body = 'blob' | 'quad' | 'biped' | 'bird' | 'fish' | 'serpent' | 'bug' | 'plant' | 'rock' | 'ghost' | 'dragon';
type Arch = 'atk' | 'spa' | 'tank' | 'fast' | 'bal' | 'wall';
type Tier = 'early' | 'mid' | 'starter' | 'strong' | 'pseudo';

interface LineRow {
  names: [string, string, string];
  types: Type[];
  /** 3단계에서 바뀌는 속성 (없으면 같음) */
  t3?: Type[];
  body: Body;
  arch: Arch;
  tier: Tier;
  evo: [number, number];
  dex: string;
}

const L = (names: [string, string, string], types: Type[], body: Body, arch: Arch, tier: Tier, evo: [number, number], dex: string, t3?: Type[]): LineRow => ({ names, types, body, arch, tier, evo, dex, t3 });

const LINES: LineRow[] = [
  // 처음 고르는 세 마리
  L(['콩닢', '넝쿨노루', '고목사슴'], ['grass'], 'quad', 'bal', 'starter', [16, 36], '등에 난 새싹이 햇볕을 받으면 기분이 좋아진다. 다 자라면 뿔에서 꽃이 핀다.'),
  L(['불씨쥐', '화로담비', '용광범'], ['fire'], 'biped', 'atk', 'starter', [16, 36], '꼬리 끝 불씨가 기분에 따라 커졌다 작아졌다 한다.', ['fire', 'fight']),
  L(['물방울개구', '개울두꺼', '폭포두꺼비'], ['water'], 'biped', 'tank', 'starter', [16, 36], '배의 소용돌이 무늬를 보면 졸음이 온다는 말이 있다.'),
  // 들판·숲
  L(['털뭉치', '솜털곰', '구름곰'], ['normal'], 'blob', 'tank', 'mid', [18, 34], '털이 너무 많아 어디가 앞인지 모른다. 비 오는 날엔 두 배로 부푼다.'),
  L(['참새콩', '바람까치', '폭풍매'], ['normal', 'wind'], 'bird', 'fast', 'early', [12, 30], '아침마다 마을 지붕에 모여 시끄럽게 수다를 떤다.'),
  L(['애벌콩', '고치둥', '비단나방'], ['bug'], 'bug', 'spa', 'early', [7, 12], '실을 뿜어 잎을 엮어 집을 짓는다. 다 자라면 날개 가루가 반짝인다.', ['bug', 'wind']),
  L(['침벌레', '독침벌', '여왕침벌'], ['bug', 'poison'], 'bug', 'atk', 'early', [7, 14], '머리의 침은 겁먹었을 때만 쓴다. 겁이 많아 자주 쓴다.'),
  L(['다람콩', '줄무늬람', '대장다람'], ['normal'], 'quad', 'fast', 'early', [10, 26], '볼에 도토리를 열 개까지 넣는다. 열한 개째에 늘 떨어뜨린다.'),
  L(['찌릿쥐', '번개쥐', '천둥족제비'], ['electric'], 'quad', 'fast', 'mid', [18, 34], '볼의 전기 주머니를 비비면 정전기가 난다. 건조한 날엔 털이 곤두선다.'),
  L(['꽃봉오리', '독꽃방울', '독장미왕'], ['grass', 'poison'], 'plant', 'spa', 'mid', [16, 32], '머리의 꽃봉오리는 달이 밝은 밤에만 살짝 열린다.'),
  L(['보라젤리', '독늪젤', '독수렁'], ['poison'], 'blob', 'wall', 'mid', [22, 38], '지나간 자리에 보라색 자국이 남는다. 냄새는 의외로 포도 향.'),
  L(['두더콩', '굴파두더', '땅울림두더'], ['ground'], 'quad', 'atk', 'mid', [20, 36], '하룻밤에 밭 하나를 다 판다. 농부들은 반기기도 하고 울기도 한다.'),
  L(['조약돌이', '바위둥이', '산봉우리'], ['rock', 'ground'], 'rock', 'tank', 'mid', [20, 38], '굴러다니며 자란다. 너무 많이 구르면 동글동글해진다.'),
  L(['주먹콩', '씨름꾼', '천하장사'], ['fight'], 'biped', 'atk', 'mid', [22, 38], '하루에 팔굽혀펴기를 천 번 한다. 잠꼬대로도 한다.'),
  L(['송사리콩', '은빛잉어', '용문잉어'], ['water'], 'fish', 'fast', 'mid', [18, 40], '폭포를 거슬러 오르면 용이 된다는 전설의 주인공.', ['water', 'dragon']),
  L(['물개콩', '얼음물개', '빙산바다사자'], ['water', 'ice'], 'fish', 'tank', 'mid', [24, 40], '차가운 바다에서 배를 깔고 떠다니며 낮잠을 즐긴다.'),
  L(['꿈꾸리', '잠보', '몽환술사'], ['mind'], 'biped', 'spa', 'mid', [20, 38], '남의 꿈을 살짝 먹는다. 악몽은 맛이 없어서 뱉는다.'),
  L(['그림자콩', '도깨불', '어둠망령'], ['ghost'], 'ghost', 'spa', 'strong', [25, 40], '불을 끄면 나타나 이불을 살짝 당긴다. 장난이 심하다.', ['ghost', 'dark']),
  L(['연기콩', '독안개', '괴무'], ['ghost', 'poison'], 'ghost', 'fast', 'mid', [22, 38], '굴뚝 연기에 섞여 마을을 떠돈다. 몸이 기체라 잡기 어렵다.'),
  L(['성냥개비', '횃불여우', '구미불꽃'], ['fire'], 'quad', 'spa', 'mid', [22, 40], '꼬리가 하나씩 늘어날 때마다 불꽃이 따뜻해진다.'),
  L(['숯덩이', '용암두꺼', '화산거북'], ['fire', 'rock'], 'quad', 'tank', 'mid', [24, 42], '등의 숯이 식으면 기운이 빠진다. 겨울엔 화롯가를 떠나지 않는다.'),
  L(['나사콩', '자석돌', '전자석탑'], ['electric', 'steel'], 'rock', 'spa', 'mid', [24, 40], '나침반을 들고 다가가면 바늘이 빙글빙글 돈다.'),
  L(['도토리콩', '다람참나무', '천년목'], ['grass'], 'plant', 'wall', 'mid', [20, 40], '머리에 앉은 새들에게 집을 내준다. 천 년을 사는 깨비.'),
  L(['민들레솜', '홀씨구름', '바람꽃'], ['grass', 'wind'], 'plant', 'fast', 'early', [14, 28], '바람이 불면 홀씨를 날려 멀리 여행을 간다.'),
  L(['이끼벌레', '풀무당', '사마귀검객'], ['bug', 'grass'], 'bug', 'atk', 'mid', [20, 36], '앞발의 낫을 하루 종일 간다. 무엇을 벨지는 아직 모른다.'),
  L(['쇠똥구리', '강철풍뎅', '장수투구'], ['bug', 'steel'], 'bug', 'tank', 'mid', [22, 38], '자기보다 열 배 큰 돌을 굴린다. 이유는 아무도 모른다.'),
  L(['눈송이', '서리요정', '설녀'], ['ice'], 'ghost', 'spa', 'mid', [24, 42], '눈 오는 밤 창문에 얼음꽃을 그리고 간다.', ['ice', 'mind']),
  L(['눈멧콩', '털멧돼지', '빙하멧돼지'], ['ice', 'ground'], 'quad', 'atk', 'mid', [24, 40], '코로 눈을 파헤쳐 땅속 버섯을 찾는다.'),
  L(['아기용', '비늘용', '하늘용왕'], ['dragon'], 'dragon', 'atk', 'pseudo', [30, 55], '알에서 깬 지 백 년이 지나야 하늘을 난다. 몹시 드물다.', ['dragon', 'wind']),
  L(['모래상어', '사막룡', '사구룡'], ['dragon', 'ground'], 'dragon', 'atk', 'strong', [26, 46], '모래 속을 헤엄치듯 다닌다. 지느러미만 보이면 조심.'),
  L(['까마귀콩', '밤까마귀', '까마귀두목'], ['dark', 'wind'], 'bird', 'atk', 'mid', [20, 38], '반짝이는 것을 모은다. 둥지에서 잃어버린 반지가 나오기도 한다.'),
  L(['들고양', '그림자냥', '밤표범'], ['dark'], 'quad', 'fast', 'mid', [20, 38], '밤에는 그림자에 숨어 소리 없이 걷는다. 낮에는 하루 종일 잔다.'),
  L(['철갑콩', '쇠비늘', '강철요새'], ['steel', 'rock'], 'quad', 'tank', 'strong', [28, 44], '철광석을 먹고 자란다. 다 자라면 몸무게가 집 한 채.'),
  L(['반짝이', '별빛요정', '은하공주'], ['light'], 'blob', 'spa', 'mid', [20, 38], '별똥별이 떨어진 자리에서 태어난다고 한다.'),
  L(['솜사탕양', '구름양', '꿈양털'], ['light', 'normal'], 'quad', 'wall', 'mid', [18, 34], '털을 베개에 넣으면 좋은 꿈을 꾼다. 그래서 늘 털이 짧다.'),
  L(['연잎동동', '연꽃갓', '연못신령'], ['water', 'grass'], 'blob', 'spa', 'mid', [20, 38], '머리의 연잎에 빗물을 모아 마신다. 비 오는 날이면 춤을 춘다.'),
  L(['해파리콩', '독해파리', '대왕해파리'], ['water', 'poison'], 'ghost', 'wall', 'mid', [24, 40], '바다를 떠다니다 해변에 밀려와 낮잠을 잔다. 만지면 찌릿.'),
  L(['조개콩', '진주조개', '용궁소라'], ['water', 'rock'], 'rock', 'tank', 'mid', [22, 40], '껍데기 안에 진주를 품고 산다. 진주를 보여주면 친구가 된다.'),
  L(['쇠주먹', '무쇠권법사', '강철무사'], ['fight', 'steel'], 'biped', 'atk', 'strong', [26, 42], '주먹을 쇠로 덮어 단련한다. 박수를 치면 종소리가 난다.'),
  L(['명상콩', '수도승', '도인'], ['fight', 'mind'], 'biped', 'bal', 'mid', [24, 40], '산꼭대기에서 몇 날 며칠 눈을 감고 앉아 있다. 사실 잔다.'),
  L(['솔개콩', '회오리솔개', '태풍수리'], ['wind'], 'bird', 'atk', 'mid', [18, 36], '날개를 한 번 치면 바람이 분다. 빨래가 잘 마른다.'),
  L(['번개새콩', '천둥까치', '뇌조'], ['electric', 'wind'], 'bird', 'spa', 'mid', [22, 40], '먹구름 속에 둥지를 튼다. 번개가 치면 신이 나서 노래한다.'),
  L(['미꾸리', '진흙메기', '늪지왕메기'], ['water', 'ground'], 'fish', 'tank', 'mid', [20, 36], '진흙 속에서 수염으로 먹이를 찾는다. 지진이 오기 전에 날뛴다.'),
  L(['화석벌레', '삼엽투구', '고대투구'], ['rock', 'bug'], 'bug', 'tank', 'mid', [26, 42], '아주 먼 옛날 바다에 살던 깨비. 바위 속에서 깨어났다.'),
  L(['화석알', '뼈도마뱀', '고대용'], ['rock', 'dragon'], 'dragon', 'atk', 'strong', [28, 46], '화석에서 되살아난 용. 옛날 노래를 흥얼거린다.'),
  L(['독쥐', '하수구쥐', '독두목쥐'], ['poison', 'dark'], 'quad', 'fast', 'early', [14, 30], '도시 지하에 무리 지어 산다. 두목 쥐는 왕관 모양 귀를 가졌다.'),
  L(['방울콩', '풍경방울', '신령종'], ['mind', 'light'], 'blob', 'wall', 'mid', [24, 42], '바람이 불면 맑은 소리를 낸다. 그 소리를 들으면 마음이 편해진다.'),
  L(['초롱콩', '그믐초롱', '저승초롱'], ['ghost', 'dark'], 'ghost', 'spa', 'mid', [26, 42], '길 잃은 사람 앞에 나타나 길을 비춘다. 엉뚱한 길일 때도 있다.'),
  L(['아기반달', '반달곰', '장수곰'], ['normal', 'fight'], 'biped', 'atk', 'mid', [22, 38], '가슴의 반달 무늬가 클수록 힘이 세다. 꿀을 보면 정신을 잃는다.'),
  L(['토끼콩', '달토끼', '옥토끼'], ['normal', 'light'], 'quad', 'fast', 'mid', [18, 34], '보름달이 뜨면 방아를 찧는 흉내를 낸다.'),
  L(['죽순콩', '대나무판다', '무술판다'], ['grass', 'fight'], 'biped', 'atk', 'mid', [24, 40], '대나무를 먹으며 무술을 익힌다. 먹는 시간이 훨씬 길다.'),
  L(['가시콩', '엉겅퀴', '가시마왕'], ['grass', 'dark'], 'plant', 'atk', 'mid', [24, 40], '가시 사이로 빛나는 눈만 보인다. 다가가면 가시를 세운다.'),
  L(['불새콩', '화염매', '주홍봉새'], ['fire', 'wind'], 'bird', 'spa', 'mid', [24, 42], '날갯짓마다 불꽃이 흩날린다. 지나간 하늘이 노을빛이 된다.'),
  L(['혼불콩', '도깨비불', '염라불꽃'], ['fire', 'ghost'], 'ghost', 'spa', 'mid', [26, 42], '밤 무덤가를 둥둥 떠다닌다. 사실은 추위를 많이 탄다.'),
  L(['찌릿장어', '번개장어', '뇌룡장어'], ['electric', 'water'], 'serpent', 'spa', 'mid', [26, 42], '물속에서 몸을 번쩍이며 신호를 보낸다.'),
  L(['눈새콩', '서리두루미', '빙설학'], ['ice', 'wind'], 'bird', 'spa', 'mid', [24, 42], '한쪽 다리로 서서 하루 종일 눈을 맞는다.'),
  L(['동전콩', '엽전도사', '금전신선'], ['steel', 'mind'], 'blob', 'spa', 'mid', [24, 40], '몸에 박힌 엽전을 세며 논다. 한 개라도 모자라면 운다.'),
  L(['고드름니', '설원이리', '빙하늑대'], ['ice', 'dark'], 'quad', 'atk', 'mid', [24, 40], '눈보라 속에서 무리를 지어 달린다. 울음소리가 산을 울린다.'),
  L(['물뱀콩', '이무기', '청룡'], ['water', 'dragon'], 'serpent', 'spa', 'strong', [28, 48], '천 년을 기다린 이무기는 비 오는 날 하늘로 오른다.'),
  L(['전갈콩', '모래전갈', '사막전갈왕'], ['poison', 'ground'], 'bug', 'atk', 'mid', [24, 40], '꼬리를 세우고 모래 위를 걷는다. 밤이 되면 꼬리가 빛난다.'),
  L(['별가루', '빛의기사', '성기사'], ['light', 'fight'], 'biped', 'bal', 'strong', [26, 44], '약한 깨비를 보면 그냥 지나치지 못한다. 칼은 나뭇가지다.'),
  L(['매미허물', '허물귀신', '망령매미'], ['bug', 'ghost'], 'bug', 'spa', 'mid', [20, 38], '벗어 놓은 허물에 혼이 깃들었다. 여름밤에만 운다.'),
  L(['도마콩', '목도리도마', '왕도마뱀'], ['normal', 'dragon'], 'dragon', 'bal', 'mid', [24, 42], '놀라면 목도리를 활짝 펴고 두 발로 뛰어 달아난다.'),
  L(['반디콩', '반딧불이', '은하반디'], ['electric', 'light'], 'bug', 'spa', 'mid', [20, 38], '여름밤 강가에서 무리 지어 빛난다. 빛으로 대화를 한다.'),
];

// 숨은 깨비 3마리
const LEGENDS: { name: string; types: Type[]; body: Body; dex: string; moves: string[] }[] = [
  { name: '금빛봉황', types: ['fire', 'wind'], body: 'bird', dex: '금빛 탑 꼭대기에 내려앉는다는 전설의 새. 날개 한 장에 세상의 아침이 담겨 있다.', moves: ['inferno', 'bravebird', 'ancient', 'recover'] },
  { name: '은빛해룡', types: ['water', 'dragon'], body: 'serpent', dex: '소용돌이 동굴 깊은 곳에서 잠든 바다의 주인. 숨을 쉬면 파도가 친다.', moves: ['torrent', 'dragonpulse', 'icebeam', 'calm'] },
  { name: '달빛구미', types: ['light', 'ghost'], body: 'quad', dex: '그믐밤에만 숲에 나타나는 아홉 꼬리 여우. 달빛 방울 소리를 좋아한다.', moves: ['moonbeam', 'shadowball', 'psychic', 'moonlight'] },
];

export interface Species {
  no: number;
  name: string;
  types: Type[];
  body: Body;
  stage: 1 | 2 | 3;
  line: number;
  /** [HP, 공격, 방어, 특공, 특방, 스피드] */
  base: [number, number, number, number, number, number];
  catchRate: number;
  expYield: number;
  /** 이 레벨에 도달하면 다음 단계로 */
  evolveAt?: number;
  evolveTo?: number;
  learn: [number, string][];
  /** 기술 부적·비전 부적으로 배울 수 있는 기술 */
  tm: string[];
  dex: string;
  legend?: boolean;
  /** 도트 그림 씨앗 */
  seed: number;
}

const ARCH: Record<Arch, number[]> = {
  atk: [0.95, 1.4, 1.0, 0.7, 0.85, 1.1],
  spa: [0.9, 0.7, 0.85, 1.4, 1.1, 1.05],
  tank: [1.2, 1.05, 1.4, 0.7, 1.0, 0.65],
  fast: [0.85, 1.1, 0.8, 1.0, 0.8, 1.45],
  bal: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  wall: [1.25, 0.75, 1.15, 0.9, 1.35, 0.6],
};
const TOTAL: Record<Tier, [number, number, number]> = {
  early: [250, 335, 430],
  mid: [300, 410, 505],
  starter: [310, 405, 525],
  strong: [320, 430, 540],
  pseudo: [300, 420, 600],
};

function rngFrom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function statsFor(arch: Arch, total: number, rnd: () => number): Species['base'] {
  const w = ARCH[arch].map((x) => x * (0.92 + rnd() * 0.16));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => Math.max(15, Math.round((x / sum) * total))) as Species['base'];
}

/** 계열의 배울 기술 목록 만들기 */
function learnsetFor(types: Type[], arch: Arch, rnd: () => number, evo: [number, number], t3?: Type[]): [number, string][] {
  const all = Object.values(MOVES).filter((m) => !m.field);
  const pref = arch === 'atk' || arch === 'tank' ? 'phys' : arch === 'spa' || arch === 'wall' ? 'spec' : null;
  const pick = (t: Type, n: number) => {
    const pool = all.filter((m) => m.type === t && m.cat !== 'status').sort((a, b) => a.power - b.power);
    // 선호하는 종류(물리/특수)를 먼저, 그다음 나머지를 섞는다
    const fit = pool.filter((m) => !pref || m.cat === pref);
    const rest = pool.filter((m) => !fit.includes(m) && (fit.length < n || rnd() < 0.5));
    const list = [...fit, ...rest].sort((a, b) => a.power - b.power);
    if (list.length <= n) return list;
    const out = [];
    for (let i = 0; i < n; i++) out.push(list[Math.round((i / (n - 1)) * (list.length - 1))]);
    return out;
  };
  const dmg = [...pick(types[0], 6), ...(types[1] ? pick(types[1], 4) : []), ...(t3 && t3[1] && t3[1] !== types[1] ? pick(t3[1], 3) : [])];
  const uniq = [...new Map(dmg.map((m) => [m.id, m])).values()].sort((a, b) => a.power - b.power);
  const status = all.filter((m) => m.cat === 'status' && (types.includes(m.type) || m.type === 'normal'));
  const st1 = status[Math.floor(rnd() * status.length)];
  const st2 = status.filter((m) => m !== st1)[Math.floor(rnd() * (status.length - 1))];
  const first = pref === 'spec' ? 'tackle' : rnd() < 0.5 ? 'tackle' : 'scratch';
  const out: [number, string][] = [
    [1, first],
    [1, rnd() < 0.5 ? 'growl' : 'tailwhip'],
  ];
  const end = Math.max(evo[1] + 18, 52);
  uniq.forEach((m, i) => {
    const lv = Math.round(4 + (i / Math.max(1, uniq.length - 1)) * (end - 4));
    out.push([Math.min(lv, 90), m.id]);
  });
  out.push([Math.round(evo[0] * 0.7) + 2, st1.id]);
  if (st2) out.push([Math.round((evo[0] + evo[1]) / 2), st2.id]);
  // 보통 속성의 강한 기술 하나
  out.push([end + 6, rnd() < 0.5 ? 'bond' : 'headbutt']);
  return out.sort((a, b) => a[0] - b[0]).filter((x, i, arr) => arr.findIndex((y) => y[1] === x[1]) === i);
}

function tmFor(types: Type[], rnd: () => number): string[] {
  const out: string[] = [];
  for (const id of [...TMS, ...HMS.map((h) => h.move)]) {
    const m = MOVES[id];
    const own = types.includes(m.type) || m.type === 'normal';
    if (own || rnd() < 0.22) out.push(id);
  }
  return out;
}

export const SPECIES: Species[] = [];
LINES.forEach((ln, li) => {
  const rnd = rngFrom(li * 7919 + 17);
  const learn = learnsetFor(ln.types, ln.arch, rnd, ln.evo, ln.t3);
  for (let st = 0; st < 3; st++) {
    const no = SPECIES.length + 1;
    const types = st === 2 && ln.t3 ? ln.t3 : ln.types;
    SPECIES.push({
      no,
      name: ln.names[st],
      types,
      body: ln.body,
      stage: (st + 1) as 1 | 2 | 3,
      line: li,
      base: statsFor(ln.arch, TOTAL[ln.tier][st], rnd),
      catchRate: [190, 90, 45][st] - (ln.tier === 'pseudo' || ln.tier === 'strong' ? 20 : 0),
      expYield: [55, 140, 215][st] + (ln.tier === 'pseudo' ? 40 : 0),
      evolveAt: st < 2 ? ln.evo[st] : undefined,
      evolveTo: st < 2 ? no + 1 : undefined,
      learn,
      tm: tmFor(types, rnd),
      dex: ln.dex,
      seed: li * 131 + 7,
    });
  }
});
LEGENDS.forEach((lg, i) => {
  const rnd = rngFrom(99991 + i * 31);
  SPECIES.push({
    no: SPECIES.length + 1,
    name: lg.name,
    types: lg.types,
    body: lg.body,
    stage: 3,
    line: LINES.length + i,
    base: statsFor('bal', 640, rnd),
    catchRate: 3,
    expYield: 300,
    learn: [
      [1, lg.moves[3]],
      [1, lg.moves[0]],
      [1, lg.moves[1]],
      [1, lg.moves[2]],
    ],
    tm: tmFor(lg.types, rnd),
    dex: lg.dex,
    legend: true,
    seed: 50000 + i * 977,
  });
});

export const byNo = (no: number) => SPECIES[no - 1];
export const STARTERS = [1, 4, 7];
export const LEGEND_NOS = SPECIES.filter((s) => s.legend).map((s) => s.no);
export const speciesByName = (name: string) => SPECIES.find((s) => s.name === name)!;

// 주먹밥 용사전 ~여덟 개의 종~ : 캐릭터·몬스터·지도·대사 (새로 만든 이야기)
import type { Look, MonsterShape } from './pixel.ts';

// ---------------- 이야기 ----------------
export const TITLE = '주먹밥 용사전';
export const SUBTITLE = '~여덟 개의 종~';
export const PROLOGUE = [
  '아주 먼 옛날, 하늘에서 여덟 개의 종이 내려왔다.',
  '종이 울리는 동안, 땅 밑의 「밤의 왕」은 깊이 잠들어 있었다.',
  '그런데 어느 날 아침……',
  '솔방울 마을의 종이 사라졌다.',
];

export const CHAPTERS: { no: number; title: string; summary: string; ready: boolean }[] = [
  { no: 1, title: '솔방울 마을의 게으름뱅이', summary: '사라진 마을 종을 찾아 산적 곰발톱의 동굴로. 덜렁이 마법사 미르와 만난다.', ready: true },
  { no: 2, title: '소금 사막의 계산쟁이', summary: '돈이라면 사막 끝까지! 주판 든 상인 소녀 깨비가 동료가 된다.', ready: false },
  { no: 3, title: '물안개 항구의 유령선', summary: '밤마다 노래하는 유령선. 선장은 뱃멀미를 하는 유령이었다.', ready: false },
  { no: 4, title: '구름 절벽 사원', summary: '하루의 사부가 젊은 시절 쫓겨난 사원. 하루의 숨은 힘이 깨어난다.', ready: false },
  { no: 5, title: '태엽 장난감 왕국', summary: '태엽이 다 풀린 기사 톱니가 동료로. 장난감 왕이 종을 지키고 있다.', ready: false },
  { no: 6, title: '눈꽃 산맥의 잠꾸러기 용', summary: '종을 베개 삼아 자는 용을 깨우지 않고 종을 꺼내라!', ready: false },
  { no: 7, title: '거꾸로 탑', summary: '검은 깃털의 정체가 드러난다. 미르와 얽힌 뜻밖의 사연.', ready: false },
  { no: 8, title: '밤의 왕', summary: '여덟 번째 종이 울릴 때, 마지막 결전.', ready: false },
];

// ---------------- 사람 생김새 ----------------
export const LOOKS: Record<string, Look> = {
  haru: { skin: '#ffd2a8', hair: '#3a2a2a', hairStyle: 'spiky', top: '#f4f0e6', trim: '#e8c8a0', pants: '#f4f0e6', belt: '#2a2a2a', hat: 'headband', hatColor: '#e23a3a' },
  mir: { skin: '#ffe0c4', hair: '#ff8ac0', hairStyle: 'twin', top: '#4a6ae0', trim: '#ffd94a', pants: '#3a4ab0', hat: 'witch', hatColor: '#7a4ad0', prop: 'staff', robe: true },
  master: { skin: '#f0c8a0', hair: '#e8e8e8', hairStyle: 'bald', eyes: 'sleepy', top: '#9a6a3a', pants: '#7a4a2a', beard: '#f4f4f4', prop: 'staff', robe: true },
  chief: { skin: '#f0c8a0', hair: '#8a8a8a', hairStyle: 'short', top: '#3a8a5a', trim: '#e8d070', pants: '#4a3a2a', beard: '#b0b0b0' },
  aunt: { skin: '#ffd2a8', hair: '#6a3a2a', hairStyle: 'bun', top: '#e07a3a', pants: '#e07a3a', robe: true, prop: 'ladle' },
  kid: { skin: '#ffd2a8', hair: '#c86a2a', hairStyle: 'short', top: '#3aa0e0', pants: '#2a4a8a' },
  kid2: { skin: '#ffe0c4', hair: '#2a2a3a', hairStyle: 'twin', top: '#ff7aa0', pants: '#ff7aa0', robe: true },
  shop: { skin: '#ffd2a8', hair: '#4a3a2a', hairStyle: 'short', top: '#ffffff', trim: '#3a8ad0', pants: '#4a4a6a', hat: 'cap', hatColor: '#3a8ad0', prop: 'abacus' },
  guard: { skin: '#f0c8a0', hair: '#5a3a2a', hairStyle: 'short', top: '#8a9ab0', trim: '#d0d8e8', pants: '#4a4a5a', hat: 'helm', hatColor: '#b0b8c8', prop: 'spear' },
  woodcutter: { skin: '#e8b890', hair: '#6a3a1a', hairStyle: 'short', top: '#4a8a3a', trim: '#2a5a2a', pants: '#5a3a22', beard: '#6a3a1a', prop: 'axe' },
  inn: { skin: '#f0c8a0', hair: '#2a2a2a', hairStyle: 'short', top: '#a03a3a', pants: '#3a2a2a', beard: '#2a2a2a' },
  bandit: { skin: '#c8a080', hair: '#6a5a4a', hairStyle: 'none', ears: 'raccoon', eyes: 'mask', top: '#5a4a6a', pants: '#3a3040', hat: 'bandana', hatColor: '#c83a3a', prop: 'club' },
  bear: { skin: '#a8743a', hair: '#7a4a22', hairStyle: 'none', ears: 'bear', top: '#5a3a1a', trim: '#e8c070', pants: '#3a2a1a', belt: '#c8a040', beard: '#6a3a1a', prop: 'club' },
  crow: { skin: '#2a2030', hair: '#1a1020', hairStyle: 'none', eyes: 'glow', top: '#2a2038', pants: '#1a1428', hat: 'hood', hatColor: '#221a2e', robe: true },
};

// ---------------- 도구 ----------------
export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  hp?: number;
  mp?: number;
}
export const ITEMS: Record<string, ItemDef> = {
  onigiri: { id: 'onigiri', name: '주먹밥', desc: 'HP를 30 채운다. 하루의 힘의 원천.', price: 8, hp: 30 },
  candy: { id: 'candy', name: '별사탕', desc: 'MP를 12 채운다. 마법사의 간식.', price: 15, mp: 12 },
  honey: { id: 'honey', name: '꿀단지', desc: 'HP를 80 채운다. 곰이 아끼던 꿀.', price: 40, hp: 80 },
};

// ---------------- 장비 ----------------
export type Slot = 'weapon' | 'armor' | 'charm';
export const SLOT_NAME: Record<Slot, string> = { weapon: '무기', armor: '옷', charm: '장신구' };
export interface EquipDef {
  id: string;
  name: string;
  slot: Slot;
  /** 장착할 수 있는 동료 (없으면 누구나) */
  who?: string[];
  atk?: number;
  mag?: number;
  def?: number;
  spd?: number;
  hp?: number;
  /** 장착하면 쓸 수 있는 기술 */
  skill?: string;
  price: number;
  desc: string;
}
export const EQUIPS: Record<string, EquipDef> = {
  stick: { id: 'stick', name: '나무 목검', slot: 'weapon', who: ['haru'], atk: 4, price: 30, desc: '도장에서 쓰던 목검. 손에 익었다.' },
  wand: { id: 'wand', name: '견습 지팡이', slot: 'weapon', who: ['mir'], mag: 3, atk: 1, price: 30, desc: '마법학교 매점표. 끝이 살짝 휘었다.' },
  gi: { id: 'gi', name: '솜 도복', slot: 'armor', def: 3, hp: 6, price: 40, desc: '두툼한 솜을 넣은 도복.' },
  cape: { id: 'cape', name: '털실 망토', slot: 'armor', def: 2, spd: 1, price: 35, desc: '할머니가 떠 준 망토. 따뜻하다.' },
  band: { id: 'band', name: '바람 머리띠', slot: 'charm', spd: 2, skill: 'gale', price: 0, desc: '바람의 기운이 깃든 머리띠. 「질풍 돌려차기」를 쓸 수 있다.' },
  shell: { id: 'shell', name: '거북 등껍질', slot: 'armor', def: 6, spd: -1, skill: 'wall', price: 0, desc: '단단한 등껍질. 「등껍질 철벽」을 쓸 수 있다.' },
  starWand: { id: 'starWand', name: '별빛 지팡이', slot: 'weapon', who: ['mir'], mag: 6, skill: 'starfall', price: 0, desc: '별가루가 반짝이는 지팡이. 「별똥별 우수수」를 쓸 수 있다.' },
  claw: { id: 'claw', name: '곰발톱 장갑', slot: 'weapon', who: ['haru'], atk: 8, skill: 'bearClaw', price: 0, desc: '곰발톱이 떨군 장갑. 「곰발톱 연타」를 쓸 수 있다.' },
  acorn: { id: 'acorn', name: '도토리 부적', slot: 'charm', hp: 12, def: 1, price: 25, desc: '숲의 정령이 깃든 도토리. 튼튼해진다.' },
};

// ---------------- 기술 ----------------
export interface SkillDef {
  id: string;
  name: string;
  mp: number;
  /** 몇 칸 떨어진 곳까지 */
  range: number;
  /** 0 = 한 칸, 1 = 주변 십자 범위까지 */
  area: number;
  power: number;
  kind: 'dmg' | 'heal' | 'guard';
  stat: 'atk' | 'mag';
  target: 'foe' | 'ally';
  desc: string;
  /** 주문 실수 확률 */
  misfire?: number;
  /** 전투 이펙트 */
  fx: Fx;
}
export type Fx = 'slash' | 'fire' | 'ice' | 'heal' | 'wind' | 'spore' | 'quake' | 'star' | 'punch' | 'shield';
export const SKILLS: Record<string, SkillDef> = {
  whirl: { id: 'whirl', name: '회오리 발차기', mp: 4, range: 1, area: 1, power: 1.1, kind: 'dmg', stat: 'atk', target: 'foe', desc: '빙글 돌며 앞과 주변을 함께 찬다.' , fx: 'wind' },
  onigiriPower: { id: 'onigiriPower', name: '주먹밥 기합', mp: 3, range: 1, area: 0, power: 1.6, kind: 'heal', stat: 'atk', target: 'ally', desc: '주먹밥을 먹고 기합! 나나 옆 동료의 HP 회복.' , fx: 'heal' },
  fire: { id: 'fire', name: '불꽃 톡톡', mp: 3, range: 3, area: 0, power: 1.6, kind: 'dmg', stat: 'mag', target: 'foe', desc: '작은 불꽃을 날린다. 가끔 실수한다.', misfire: 0.12 , fx: 'fire' },
  ice: { id: 'ice', name: '얼음 와르르', mp: 7, range: 3, area: 1, power: 1.25, kind: 'dmg', stat: 'mag', target: 'foe', desc: '얼음 덩어리를 와르르. 주변에도 맞는다.', misfire: 0.12 , fx: 'ice' },
  heal: { id: 'heal', name: '반짝 치유', mp: 4, range: 2, area: 0, power: 2.2, kind: 'heal', stat: 'mag', target: 'ally', desc: '반짝반짝 상처를 낫게 한다.' , fx: 'heal' },
  // 장비에 달린 기술
  bearClaw: { id: 'bearClaw', name: '곰발톱 연타', mp: 5, range: 1, area: 0, power: 2.1, kind: 'dmg', stat: 'atk', target: 'foe', desc: '곰발톱 장갑으로 마구 할퀸다. 아주 세다.', fx: 'punch' },
  starfall: { id: 'starfall', name: '별똥별 우수수', mp: 9, range: 4, area: 1, power: 1.5, kind: 'dmg', stat: 'mag', target: 'foe', desc: '별빛 지팡이로 별을 쏟아붓는다. 범위 공격.', fx: 'star', misfire: 0.08 },
  wall: { id: 'wall', name: '등껍질 철벽', mp: 2, range: 0, area: 1, power: 0, kind: 'guard', stat: 'atk', target: 'ally', desc: '나와 주변 동료가 다음 차례까지 받는 피해 절반.', fx: 'shield' },
  gale: { id: 'gale', name: '질풍 돌려차기', mp: 4, range: 2, area: 0, power: 1.45, kind: 'dmg', stat: 'atk', target: 'foe', desc: '바람을 타고 두 칸 앞까지 날아 찬다.', fx: 'wind' },
  // 몬스터
  spore: { id: 'spore', name: '재채기 포자', mp: 0, range: 2, area: 0, power: 1.1, kind: 'dmg', stat: 'atk', target: 'foe', desc: '' , fx: 'spore' },
  bearPunch: { id: 'bearPunch', name: '곰발톱 펀치', mp: 0, range: 1, area: 0, power: 1.7, kind: 'dmg', stat: 'atk', target: 'foe', desc: '' , fx: 'punch' },
  bearRoar: { id: 'bearRoar', name: '땅 울리기', mp: 0, range: 2, area: 1, power: 0.9, kind: 'dmg', stat: 'atk', target: 'foe', desc: '' , fx: 'quake' },
  honeyTime: { id: 'honeyTime', name: '꿀 먹기', mp: 0, range: 0, area: 0, power: 2, kind: 'heal', stat: 'atk', target: 'ally', desc: '' , fx: 'heal' },
};

/** 미르의 주문 실수 (재미로) */
export const MISFIRES = ['펑! 불꽃 대신 꽃가루가 흩날렸다…', '주문을 거꾸로 외웠다! 미르의 모자에서 비둘기가 나왔다.', '"어라? 이게 아닌데!" 작은 무지개가 떴다.'];

// ---------------- 동료 ----------------
export interface HeroDef {
  id: string;
  name: string;
  title: string;
  look: Look;
  base: { hp: number; mp: number; atk: number; mag: number; def: number; spd: number; mv: number };
  grow: { hp: number; mp: number; atk: number; mag: number; def: number; spd: number };
  skills: [number, string][];
  profile: string;
}
export const HEROES: Record<string, HeroDef> = {
  haru: {
    id: 'haru',
    name: '하루',
    title: '게으른 무술 소년',
    look: LOOKS.haru,
    base: { hp: 44, mp: 8, atk: 12, mag: 2, def: 5, spd: 8, mv: 3 },
    grow: { hp: 7, mp: 2, atk: 2.4, mag: 0.3, def: 1.2, spd: 0.8 },
    skills: [[1, 'onigiriPower'], [2, 'whirl']],
    profile: '솔방울 도장의 막내 제자. 하루 열두 시간 잠, 주먹밥 열 개. 귀찮아하지만 친구 일엔 누구보다 먼저 뛰어든다.',
  },
  mir: {
    id: 'mir',
    name: '미르',
    title: '자칭 천재 마법사',
    look: LOOKS.mir,
    base: { hp: 27, mp: 20, atk: 5, mag: 12, def: 3, spd: 6, mv: 2 },
    grow: { hp: 4.5, mp: 3.5, atk: 0.8, mag: 2.4, def: 0.8, spd: 0.7 },
    skills: [[1, 'fire'], [1, 'heal'], [3, 'ice']],
    profile: '마법학교 입학시험에 일곱 번 떨어졌다. "여덟 번째는 붙어!" 재시험 비용을 벌려고 종 도둑을 쫓는 중. 주문이 가끔 엉뚱하게 나간다.',
  },
};

/** 다음 레벨까지 필요한 누적 경험치 */
export const expFor = (lv: number) => 8 * lv * lv + 4 * lv;

// ---------------- 몬스터 ----------------
export interface FoeDef {
  id: string;
  name: string;
  shape?: MonsterShape;
  colors?: [string, string];
  look?: Look;
  hp: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
  mv: number;
  exp: number;
  gold: number;
  skills?: string[];
  fly?: boolean;
  boss?: boolean;
  /** 쓰러뜨리면 가끔 떨어뜨리는 도구 */
  drop?: string;
}
export const FOES: Record<string, FoeDef> = {
  jelly: { id: 'jelly', name: '젤리방울', shape: 'jelly', colors: ['#5ac8ff', '#2a6ab0'], hp: 12, atk: 6, mag: 0, def: 2, spd: 4, mv: 2, exp: 4, gold: 3, drop: 'onigiri' },
  jellyRed: { id: 'jellyRed', name: '딸기젤리', shape: 'jelly', colors: ['#ff6a8a', '#b02a4a'], hp: 20, atk: 10, mag: 0, def: 3, spd: 5, mv: 2, exp: 7, gold: 6 },
  shroom: { id: 'shroom', name: '재채기버섯', shape: 'shroom', colors: ['#e84a4a', '#a87a4a'], hp: 20, atk: 9, mag: 0, def: 3, spd: 3, mv: 1, exp: 6, gold: 5, skills: ['spore'] },
  bat: { id: 'bat', name: '찍찍박쥐', shape: 'bat', colors: ['#6a4a8a', '#4a2a6a'], hp: 17, atk: 11, mag: 0, def: 2, spd: 11, mv: 4, exp: 8, gold: 6, fly: true },
  rock: { id: 'rock', name: '돌돌이', shape: 'rock', colors: ['#9a9aa8', '#6a6a78'], hp: 34, atk: 14, mag: 0, def: 10, spd: 2, mv: 1, exp: 13, gold: 11, drop: 'candy' },
  bandit: { id: 'bandit', name: '꼬마 산적', look: LOOKS.bandit, hp: 30, atk: 14, mag: 0, def: 5, spd: 7, mv: 3, exp: 14, gold: 16, drop: 'onigiri' },
  bear: { id: 'bear', name: '곰발톱', look: LOOKS.bear, hp: 220, atk: 20, mag: 0, def: 10, spd: 5, mv: 2, exp: 140, gold: 220, skills: ['bearPunch', 'bearRoar', 'honeyTime'], boss: true, drop: 'honey' },
};

// ---------------- 지도 ----------------
// . 풀  , 꽃  T 나무  ~ 물  = 흙길  # 바위벽  _ 동굴 바닥  R 지붕  H 집 벽  D 문  G 종탑  C 상자
// S 팻말  F 울타리  M 가게 판대  V 덩굴(막힘)  X 동굴 입구  L 종(제단)  b 덤불  B 다리
export type Terrain = 'grass' | 'forest' | 'cave';
export interface MapDef {
  id: string;
  name: string;
  song: 'town' | 'field' | 'boss';
  terrain: Terrain;
  rows: string[];
  /** 걸을 때 적과 만나는지와 나오는 무리 */
  encounters?: string[][];
  rate?: number;
}

export const MAPS: Record<string, MapDef> = {
  village: {
    id: 'village',
    name: '솔방울 마을',
    song: 'town',
    terrain: 'grass',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
      'T,.......RRRRRRR.......,.T',
      'T........RRRRRRR.........T',
      'T...b....HHHDHHH....b....T',
      'T.RRRR......=.......RRRR.T',
      'T.RRRR......=.......RRRR.T',
      'T.HHDH......=.......HDHH.T',
      'T....=......=........=...T',
      'T....========G========...T',
      'T.,.........=.........,..T',
      'T..MMM......=.....~~~~...T',
      'T...........=.....~~~~.,.T',
      'T.RRRR......=.....~~~~...T',
      'T.RRRR..,...=............T',
      'T.HDHH......=...FFFFFF...T',
      'T...=.......=............T',
      'T...=========.........b..T',
      'TTTTTTTTTTTT=TTTTTTTTTTTTT',
    ],
  },
  field: {
    id: 'field',
    name: '바람 언덕',
    song: 'field',
    terrain: 'grass',
    rows: [
      'TTTTTTTTTTTT=TTTTTTTTTTTTTTT',
      'T...........=.........,,...T',
      'T..,,.......=.....TT.......T',
      'T...........=....TTTT.....CT',
      'T....TT.....=.....TT...~~~.T',
      'T...TTTT....=.........~~~~.T',
      'T....TT.....======....~~~~.T',
      'T...........,....=.....~~..T',
      'T..S.............=.........T',
      'T...,,...........=.........T',
      'T........~~~~....=======....',
      'T.......~~~~~~.........=....',
      'T........~~~~..,,......=====',
      'T...TT..........,..........T',
      'T..TTTT.....b..........,...T',
      'T...TT.............TT......T',
      'T.................TTTT..b..T',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    encounters: [['jelly'], ['jelly', 'jelly'], ['jelly', 'jelly'], ['jelly', 'shroom'], ['jellyRed', 'jelly'], ['jelly', 'jelly', 'jelly']],
    rate: 0.06,
  },
  forest: {
    id: 'forest',
    name: '도토리 숲',
    song: 'field',
    terrain: 'forest',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTT....TTTTTT.....TTTTTTTTTT',
      'TT..,....TTT..C.....TTT##XTT',
      'TT....T..........T...TT#_VTT',
      'TTT..TTT...TT...TTT.....=.TT',
      'TTTT..T...TTTT...T......=.TT',
      'TT.........TT...........=..T',
      'TT..b...........,,......=..T',
      'TTT....TT.....,,,,,.....=.TT',
      '.....=TTTT.....,,,......=.TT',
      '.....=========.....======.TT',
      'TTTT..TT.....=.....=.....TTT',
      'TTT...T......======.......TT',
      'TT..............TT..b.....TT',
      'TT.C....TTT....TTTT.......TT',
      'TTT....TTTTT....TT....TT..TT',
      'TTTTT..TTTTTTT......TTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    encounters: [['shroom', 'jelly'], ['bat', 'jelly'], ['shroom', 'shroom', 'jelly'], ['bat', 'bat'], ['jellyRed', 'shroom']],
    rate: 0.07,
  },
  cave: {
    id: 'cave',
    name: '곰발톱 산적굴',
    song: 'field',
    terrain: 'cave',
    rows: [
      '##########################',
      '#########___L___##########',
      '#########_______##########',
      '#########_______####__C###',
      '##########__=__#####__####',
      '###C__#####_=_######__####',
      '###___#####_=_____======##',
      '###_=========_____=###_###',
      '###___####__=_____=###_###',
      '#######_##__=######___####',
      '#######_##__=######_######',
      '##___________###___=____##',
      '##_C####____=_____=____C##',
      '##__####____=====_=_______',
      '#####_______=____==___####',
      '#####__###__=______#######',
      '###X========_______#######',
      '##########################',
    ],
    encounters: [['bat', 'bandit'], ['rock', 'bat'], ['bandit', 'bandit'], ['rock', 'jellyRed', 'bat'], ['bandit', 'bat', 'bat']],
    rate: 0.075,
  },
};

/** 지도 사이 이동: (from 지도, 칸) → (to 지도, 칸, 방향) */
export interface Warp {
  from: string;
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  dir: 'down' | 'up' | 'left' | 'right';
  need?: string;
  /** 막혔을 때 대사 */
  blocked?: string;
}
export const WARPS: Warp[] = [
  { from: 'village', x: 12, y: 17, to: 'field', tx: 12, ty: 1, dir: 'down' },
  { from: 'field', x: 12, y: 0, to: 'village', tx: 12, ty: 16, dir: 'up' },
  { from: 'field', x: 27, y: 10, to: 'forest', tx: 1, ty: 10, dir: 'right' },
  { from: 'field', x: 27, y: 11, to: 'forest', tx: 1, ty: 10, dir: 'right' },
  { from: 'field', x: 27, y: 12, to: 'forest', tx: 1, ty: 10, dir: 'right' },
  { from: 'forest', x: 0, y: 9, to: 'field', tx: 26, ty: 11, dir: 'left' },
  { from: 'forest', x: 0, y: 10, to: 'field', tx: 26, ty: 11, dir: 'left' },
  { from: 'forest', x: 25, y: 2, to: 'cave', tx: 4, ty: 16, dir: 'right' },
  { from: 'cave', x: 3, y: 16, to: 'forest', tx: 25, ty: 4, dir: 'down' },
  { from: 'cave', x: 25, y: 13, to: 'forest', tx: 25, ty: 4, dir: 'down' },
];

// ---------------- 대사·사건 ----------------
export type Step =
  | { say: string; who?: string }
  | { battle: string[]; boss?: boolean; noFlee?: boolean }
  | { join: string }
  | { set: string }
  | { give: string; n?: number }
  | { equip: string }
  | { gold: number }
  | { healAll: true }
  | { shop: string[] }
  | { inn: number }
  | { save: true }
  | { warp: [string, number, number] }
  | { clear: number }
  | { song: 'town' | 'field' | 'boss' | 'battle' };

export type Flags = Record<string, boolean>;

export interface NpcDef {
  id: string;
  map: string;
  x: number;
  y: number;
  look: string;
  name: string;
  dir?: 'down' | 'up' | 'left' | 'right';
  /** 이 조건이면 안 보임 */
  hidden?: (f: Flags) => boolean;
  talk: (f: Flags) => Step[];
}

const S = (who: string, ...lines: string[]): Step[] => lines.map((say) => ({ who, say }));

export const NPCS: NpcDef[] = [
  {
    id: 'master',
    map: 'village',
    x: 11,
    y: 4,
    look: 'master',
    name: '동동 사부',
    talk: (f) =>
      f.bell
        ? S('동동 사부', '오오, 종을 찾아왔구나! …아직 꿈은 아니겠지? 하루야, 내 볼 좀 꼬집어 보거라.', '종탑에 종을 걸면 무슨 일이 일어날지도 모르지. 가 보거라.')
        : f.mir
          ? S('동동 사부', '쿨… 쿨… (서서 자고 있다)', '…음냐. 하루야… 친구가 생겼구나. 주먹밥은… 나눠 먹어라… 쿨…')
          : S('동동 사부', '쿨… 쿨…', '…음? 하루야, 아직도 안 갔느냐. 종 도둑은 남쪽 언덕을 지나 동쪽 숲으로 갔다더라.', '사부의 가르침 하나. 「배고프면 진다.」 주먹밥을 넉넉히 챙겨 가거라… 쿨…'),
  },
  {
    id: 'chief',
    map: 'village',
    x: 14,
    y: 9,
    look: 'chief',
    name: '촌장',
    talk: (f) =>
      f.clear1
        ? S('촌장', '종소리가 돌아오니 닭들이 알을 두 배로 낳는구려! 고맙네, 하루 군.')
        : f.bell
          ? S('촌장', '그, 그건 우리 마을 종! 어서 종탑에 걸어 주게! 종탑 앞에서 말을 걸면 되네.')
          : S('촌장', '큰일일세, 큰일! 백 년 동안 아침마다 울리던 종이 하룻밤 사이에 사라졌어.', '마을 사람들이 산적 「곰발톱」을 봤다더군. 동쪽 도토리 숲 너머 동굴에 산다는 녀석이지.', '하루 군, 부탁하네. 찾아오면 내가 아끼는 주먹밥 맛집 쿠폰을 주지!'),
  },
  {
    id: 'aunt',
    map: 'village',
    x: 6,
    y: 7,
    look: 'aunt',
    name: '국밥집 아주머니',
    talk: (f) =>
      f.mir
        ? S('국밥집 아주머니', '어머, 그 마법사 아가씨는 누구니? 하루 너도 다 컸구나~ 호호.')
        : S('국밥집 아주머니', '하루야, 또 늦잠 잤지? 사부님도 참, 너 같은 잠꾸러기한테 큰일을 맡기시다니.', '그래도 너 싸움 하나는 잘하잖니. 배고프면 언제든 오렴.'),
  },
  {
    id: 'kid',
    map: 'village',
    x: 9,
    y: 13,
    look: 'kid',
    name: '꼬마 돌쇠',
    talk: () => S('꼬마 돌쇠', '하루 형! 들판의 젤리방울은 말랑말랑해서 맨손으로 때려도 안 아파!', '근데 빨간 딸기젤리는 조심해. 걔는 좀 세.'),
  },
  {
    id: 'kid2',
    map: 'village',
    x: 21,
    y: 13,
    look: 'kid2',
    name: '꼬마 순이',
    talk: (f) =>
      f.bell ? S('꼬마 순이', '형 가방에서 반짝반짝 소리 나! 종이지? 종이지?') : S('꼬마 순이', '오리 연못에 동전 던지면 소원이 이뤄진대. 나는 종이 돌아오게 해 달라고 빌었어!'),
  },
  {
    id: 'shop',
    map: 'village',
    x: 4,
    y: 9,
    look: 'shop',
    name: '잡화점 장사꾼',
    talk: () => [{ who: '잡화점 장사꾼', say: '어서 옵쇼! 모험엔 주먹밥, 마법엔 별사탕! 장비도 있수다~' }, { shop: ['onigiri', 'candy', 'stick', 'wand', 'gi', 'cape', 'acorn'] }],
  },
  {
    id: 'inn',
    map: 'village',
    x: 4,
    y: 7,
    look: 'inn',
    name: '여관 주인',
    talk: () => [{ who: '여관 주인', say: '쉬어 가시게. 하룻밤 10G, 아침밥 주먹밥 포함!' }, { inn: 10 }],
  },
  {
    id: 'guard',
    map: 'village',
    x: 13,
    y: 16,
    look: 'guard',
    name: '마을 입구 아저씨',
    talk: () => S('마을 입구 아저씨', '남쪽 길로 나가면 바람 언덕이야. 풀숲을 걸으면 몬스터가 튀어나오니 조심해!', '힘들면 마을로 돌아와 여관에서 쉬렴. 여관에선 모험 기록도 남길 수 있단다.'),
  },
  {
    id: 'crow',
    map: 'village',
    x: 15,
    y: 7,
    look: 'crow',
    name: '검은 깃털',
    dir: 'left',
    hidden: (f) => !f.crowShow || !!f.crowGone,
    talk: () => [],
  },
  // ----- 숲 -----
  {
    id: 'mirForest',
    map: 'forest',
    x: 16,
    y: 7,
    look: 'mir',
    name: '???',
    hidden: (f) => !!f.mir,
    talk: () => [
      { who: '???', say: '으아아! 오지 마! 나는 천재 마법사 미르라고! 지, 지금 주문을 까먹었을 뿐이야!' },
      { who: '하루', say: '(재채기버섯들한테 둘러싸여 있다…) 어이, 괜찮아?' },
      { who: '미르', say: '괜찮고말고! …아니 사실 안 괜찮아. 도와줘!' },
      { join: 'mir' },
      { set: 'mir' },
      { battle: ['shroom', 'shroom', 'jellyRed'], noFlee: true },
      { who: '미르', say: '흠흠, 고마워. 내 이름은 미르. 마법학교 입학시험에… 일곱 번 떨어졌어.' },
      { who: '미르', say: '재시험 비용이 없어서, 종 도둑을 잡고 현상금을 받으려고! 너도 곰발톱을 쫓는 거지?' },
      { who: '하루', say: '응. 그 종 없으면 우리 사부님이 아침에 못 일어나거든. …뭐, 원래도 못 일어나지만.' },
      { who: '미르', say: '좋아, 같이 가자! 동굴 입구는 덩굴로 막혀 있던데, 내 불꽃 마법이면 한 방이야!' },
      { who: '', say: '미르가 동료가 되었다!' },
    ],
  },
  {
    id: 'squirrel',
    map: 'forest',
    x: 5,
    y: 13,
    look: 'woodcutter',
    name: '나무꾼',
    talk: () => S('나무꾼', '이 숲 동쪽 끝 동굴이 곰발톱 패거리 소굴이야. 박쥐가 많으니 회복약을 챙기게.', '상자는 가까이 가서 말을 걸면 열 수 있다네.'),
  },
  // ----- 동굴 -----
  {
    id: 'banditGuard',
    map: 'cave',
    x: 12,
    y: 9,
    look: 'bandit',
    name: '문지기 산적',
    hidden: (f) => !!f.guard,
    talk: () => [
      { who: '문지기 산적', say: '거기 서라! 암호를 대라! …「꿀」 하면?' },
      { who: '하루', say: '…「단지」?' },
      { who: '문지기 산적', say: '틀렸다! 정답은 「맛있다」다! 덤벼라!' },
      { battle: ['bandit', 'bandit', 'bat'], noFlee: true },
      { set: 'guard' },
      { who: '문지기 산적', say: '으윽… 두목님은 안쪽 제단에서 종을 닦고 계신다… 반짝반짝하게…' },
    ],
  },
  {
    id: 'boss',
    map: 'cave',
    x: 12,
    y: 2,
    look: 'bear',
    name: '곰발톱',
    hidden: (f) => !!f.bell,
    talk: () => [
      { who: '곰발톱', say: '크하하! 이 반짝이는 종을 노리고 왔느냐, 꼬맹이들!' },
      { who: '하루', say: '그거 우리 마을 거야. 돌려줘. 빨리 돌아가서 낮잠 자야 하거든.' },
      { who: '미르', say: '그리고 현상금도 내 거야!' },
      { who: '곰발톱', say: '검은 깃털 나리가 이 종만 갖다 바치면 꿀 천 단지를 준다고 하셨다! 절대 못 줘!' },
      { song: 'boss' },
      { battle: ['bear', 'bandit', 'bandit'], boss: true, noFlee: true },
      { who: '곰발톱', say: '끄응… 내 꿀 천 단지가… 엉엉…' },
      { who: '곰발톱', say: '검은 깃털 나리는 검은 두건을 쓴 새 머리였어. 「여덟 개의 종을 모두 모아 밤의 왕님을 깨운다」고 했지…' },
      { who: '미르', say: '여덟 개의 종…? 마법학교 교과서에 나오는 전설이잖아!' },
      { set: 'bell' },
      { give: 'honey' },
      { equip: 'claw' },
      { who: '', say: '솔방울 마을의 종을 되찾았다! 꿀단지와 「곰발톱 장갑」도 얻었다. (메뉴 → 장비)' },
      { song: 'field' },
    ],
  },
];

export interface ChestDef {
  map: string;
  x: number;
  y: number;
  item?: string;
  equip?: string;
  gold?: number;
}
export const CHESTS: ChestDef[] = [
  { map: 'forest', x: 14, y: 2, equip: 'band' },
  { map: 'forest', x: 3, y: 14, gold: 30 },
  { map: 'cave', x: 3, y: 5, item: 'onigiri' },
  { map: 'cave', x: 22, y: 3, equip: 'starWand' },
  { map: 'cave', x: 3, y: 12, equip: 'shell' },
  { map: 'field', x: 26, y: 3, gold: 40 },
  { map: 'cave', x: 23, y: 12, item: 'candy' },
];

export const SIGNS: { map: string; x: number; y: number; text: string }[] = [
  { map: 'field', x: 3, y: 8, text: '↑ 솔방울 마을   → 도토리 숲' },
];

/** 칸을 밟으면 일어나는 일 */
export interface TriggerDef {
  map: string;
  x: number;
  y: number;
  once: string;
  when?: (f: Flags) => boolean;
  steps: Step[];
}
export const TRIGGERS: TriggerDef[] = [
  {
    map: 'forest',
    x: 24,
    y: 4,
    once: 'vines',
    when: (f) => !!f.mir,
    steps: [
      { who: '미르', say: '내 차례군! 불꽃 톡톡~!' },
      { who: '', say: '펑! …덩굴 대신 하루의 앞머리가 살짝 그을렸다.' },
      { who: '하루', say: '앗 뜨거! 내 머리!' },
      { who: '미르', say: '헤헤, 연습이었어. 진짜는 이거야! 불꽃 톡톡!' },
      { who: '', say: '덩굴이 타 없어졌다. 동굴로 들어갈 수 있다!' },
    ],
  },
  {
    map: 'forest',
    x: 24,
    y: 4,
    once: 'vinesHint',
    when: (f) => !f.mir,
    steps: [{ who: '하루', say: '덩굴이 빽빽해서 못 지나가겠다… 불이라도 있으면 좋을 텐데. 숲 안쪽에서 누가 소리 지르던데?' }],
  },
];

/** 오프닝 (게임 시작) */
export const OPENING: Step[] = [
  { who: '', say: '솔방울 마을, 아침. 그런데 아침을 알리는 종소리가 들리지 않는다…' },
  { who: '촌장', say: '도, 동동 사부님! 큰일이오! 마을 종이 사라졌소!' },
  { who: '동동 사부', say: '쿨… 음냐… 종이 없으면… 늦잠 자기 딱 좋겠구먼…' },
  { who: '촌장', say: '사부님!!' },
  { who: '동동 사부', say: '알았네, 알았어. 우리 도장의 막내를 보내지. …하루야! 하루야~!' },
  { who: '하루', say: '으음… 5분만… 아니 5시간만…' },
  { who: '동동 사부', say: '종을 찾아오면 주먹밥 백 개를 주마.' },
  { who: '하루', say: '다녀오겠습니다!!!' },
  { give: 'onigiri', n: 3 },
  { gold: 30 },
  { who: '', say: '사부에게서 주먹밥 3개와 용돈 30G를 받았다.' },
  { who: '동동 사부', say: '마을 사람들에게 말을 걸면 도움이 될 게다. 도구나 상태는 메뉴(X 키)에서 볼 수 있느니라… 쿨…' },
];

/** 종탑에서 1장 끝 */
export const BELL_EVENT: Step[] = [
  { who: '', say: '하루는 종을 종탑에 걸었다.' },
  { who: '', say: '데엥—— 데엥——' },
  { who: '', say: '종이 하늘을 향해 빛을 뿜는다! 빛 속에 일곱 개의 종이 아른거린다……' },
  { set: 'crowShow' },
  { who: '???', say: '흐응. 첫 번째 종은 양보해 주지, 꼬마들.' },
  { who: '검은 깃털', say: '나는 「밤의 왕」님의 심부름꾼, 검은 깃털. 나머지 일곱 개의 종은 우리가 먼저 모은다.' },
  { who: '미르', say: '(…저 목소리, 어디서 들어 본 것 같은데?)' },
  { who: '검은 깃털', say: '밤의 왕님이 깨어나면 세상은 영원한 밤. 다들 영원히 잘 수 있겠지. 후후후…' },
  { who: '하루', say: '영원히 잘 수 있다고…? …솔깃한데.' },
  { who: '미르', say: '하루!!!' },
  { who: '하루', say: '농담이야. 아침밥을 못 먹잖아. 그건 안 되지.' },
  { set: 'crowGone' },
  { who: '', say: '검은 깃털은 깃털 한 장을 남기고 사라졌다.' },
  { who: '동동 사부', say: '…드디어 때가 왔구나. (사부가 눈을 번쩍 떴다!)' },
  { who: '동동 사부', say: '하루, 미르. 여덟 개의 종을 지켜야 한다. 다음 종은 서쪽 소금 사막에 있다고 전해지지.' },
  { who: '동동 사부', say: '…말했으니 이제 다시 자도 되겠지. 쿨…' },
  { set: 'clear1' },
  { clear: 1 },
];

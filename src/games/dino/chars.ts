// 햄스터 다이노 파이트: 캐릭터 8 + 히든 보스. 평소엔 햄스터, 게이지가 차면 공룡의 특징이 돋아난다.

export type Dino = 'trex' | 'tricera' | 'stego' | 'ankylo' | 'ptera' | 'brachio' | 'raptor' | 'spino' | 'meteor';
export type MoveType = 'shot' | 'rush' | 'rising' | 'spin' | 'slam' | 'dive' | 'counter' | 'meteor';
export type Slot = 'move1' | 'move2' | 'move3' | 'super';
export type Accessory = 'glasses' | 'headband' | 'bandana' | 'cap' | 'scarf' | 'bow' | 'goggles' | 'beanie' | 'crown';

export interface MoveDef {
  name: string;
  type: MoveType;
  damage: number;
  startup: number;
  active: number;
  recovery: number;
  /** 돌진·투사체 속도 */
  speed: number;
  /** 여러 번 때리는 수 */
  hits: number;
  knock: number;
  /** 시작할 때 무적 (대공기) */
  invuln?: boolean;
  /** 맞아도 밀리지 않음 */
  armor?: boolean;
}

export interface Fur {
  /** 등 털 */
  back: string;
  /** 배 털 */
  belly: string;
  /** 외곽선 */
  line: string;
  /** 변신 후 공룡 비늘 색 */
  scale: string;
  /** 공룡 특징 부위 색 (뿔·등판 등) */
  feature: string;
}

export interface CharDef {
  id: string;
  name: string;
  dino: Dino;
  dinoName: string;
  title: string;
  fur: Fur;
  accessory: Accessory;
  accent: string;
  hp: number;
  walk: number;
  jump: number;
  /** 공격력 배율 */
  power: number;
  /** 손발이 닿는 거리 보너스 */
  reach: number;
  /** 동작 속도 (작을수록 빠름) */
  tempo: number;
  /** 몸 크기 */
  size: number;
  moves: Record<Slot, MoveDef>;
  desc: string;
  bars: { power: number; speed: number; reach: number; defense: number };
  stage: StageId;
  hidden?: boolean;
}

export type StageId = 'jungle' | 'plains' | 'canyon' | 'beach' | 'volcano' | 'snow' | 'city' | 'crater';

const m = (name: string, type: MoveType, damage: number, o: Partial<MoveDef> = {}): MoveDef => ({
  name,
  type,
  damage,
  startup: 0.16,
  active: 0.25,
  recovery: 0.3,
  speed: 600,
  hits: 1,
  knock: 340,
  ...o,
});

export const ROSTER: CharDef[] = [
  {
    id: 'rex',
    name: '렉스',
    dino: 'trex',
    dinoName: '티라노사우루스',
    title: '꼬마 폭군',
    fur: { back: '#f29a4a', belly: '#fff4e3', line: '#6b3a1c', scale: '#5fae55', feature: '#3f8a3a' },
    accessory: 'glasses',
    accent: '#5fae55',
    hp: 105,
    walk: 240,
    jump: 690,
    power: 1.1,
    reach: 6,
    tempo: 1,
    size: 1,
    moves: {
      move1: m('해바라기씨 탄', 'shot', 9, { speed: 620 }),
      move2: m('렉스 어퍼', 'rising', 12, { invuln: true, startup: 0.05, active: 0.35 }),
      move3: m('으르렁 돌진', 'rush', 12, { speed: 820, active: 0.32 }),
      super: m('폭군의 대폭주', 'rush', 6, { speed: 900, hits: 6, active: 0.6, knock: 480 }),
    },
    desc: '공격과 방어가 고른 주인공. 커다란 턱으로 무는 힘이 세다.',
    bars: { power: 4, speed: 3, reach: 3, defense: 3 },
    stage: 'jungle',
  },
  {
    id: 'triko',
    name: '트리코',
    dino: 'tricera',
    dinoName: '트리케라톱스',
    title: '세 뿔 돌격대',
    fur: { back: '#d9a066', belly: '#fff8ec', line: '#5e3b1b', scale: '#c58f4f', feature: '#fff1cf' },
    accessory: 'headband',
    accent: '#e2653a',
    hp: 110,
    walk: 215,
    jump: 640,
    power: 1.15,
    reach: 8,
    tempo: 1.1,
    size: 1.06,
    moves: {
      move1: m('뿔 돌격', 'rush', 13, { speed: 760, armor: true, active: 0.35 }),
      move2: m('뿔 올려치기', 'rising', 12, { invuln: true, startup: 0.06 }),
      move3: m('프릴 방패', 'counter', 14, { startup: 0.05, active: 0.55, recovery: 0.25 }),
      super: m('삼중뿔 대돌격', 'rush', 7, { speed: 950, hits: 5, armor: true, active: 0.6, knock: 520 }),
    },
    desc: '묵직한 돌격형. 뿔 돌격 중에는 맞아도 멈추지 않는다.',
    bars: { power: 4, speed: 2, reach: 3, defense: 4 },
    stage: 'plains',
  },
  {
    id: 'stego',
    name: '스테고',
    dino: 'stego',
    dinoName: '스테고사우루스',
    title: '가시 꼬리',
    fur: { back: '#c9b28f', belly: '#fffaf0', line: '#5a4a32', scale: '#8aa865', feature: '#e2553f' },
    accessory: 'bandana',
    accent: '#e2553f',
    hp: 110,
    walk: 220,
    jump: 650,
    power: 1.05,
    reach: 16,
    tempo: 1.05,
    size: 1.04,
    moves: {
      move1: m('등판 날리기', 'shot', 10, { speed: 560 }),
      move2: m('꼬리 올려치기', 'rising', 11, { invuln: true, startup: 0.06 }),
      move3: m('가시 꼬리 회전', 'spin', 4, { hits: 4, active: 0.6 }),
      super: m('천둥 가시 폭풍', 'spin', 4, { hits: 9, active: 1, knock: 460 }),
    },
    desc: '꼬리 덕분에 손이 길다. 회전 공격으로 앞뒤를 모두 친다.',
    bars: { power: 3, speed: 3, reach: 4, defense: 3 },
    stage: 'canyon',
  },
  {
    id: 'anky',
    name: '안키',
    dino: 'ankylo',
    dinoName: '안킬로사우루스',
    title: '움직이는 요새',
    fur: { back: '#9e9e9e', belly: '#f7f7f7', line: '#3d3d3d', scale: '#7d8b6a', feature: '#5b6650' },
    accessory: 'beanie',
    accent: '#7d8b6a',
    hp: 118,
    walk: 190,
    jump: 590,
    power: 1.1,
    reach: 10,
    tempo: 1.2,
    size: 1.1,
    moves: {
      move1: m('곤봉 꼬리 쾅', 'slam', 13, { startup: 0.3, speed: 420 }),
      move2: m('갑옷 받아치기', 'counter', 16, { startup: 0.04, active: 0.6, recovery: 0.25 }),
      move3: m('데굴데굴 공격', 'rush', 4, { speed: 620, hits: 3, armor: true, active: 0.5 }),
      super: m('대지 망치', 'slam', 18, { startup: 0.35, speed: 520, hits: 2 }),
    },
    desc: '가장 튼튼하다. 느리지만 받아치기와 꼬리 곤봉이 무섭다.',
    bars: { power: 5, speed: 1, reach: 3, defense: 5 },
    stage: 'snow',
  },
  {
    id: 'ptera',
    name: '프테',
    dino: 'ptera',
    dinoName: '프테라노돈',
    title: '하늘의 사냥꾼',
    fur: { back: '#b39ddb', belly: '#fbf7ff', line: '#4a3770', scale: '#9575cd', feature: '#6a4fb3' },
    accessory: 'goggles',
    accent: '#9575cd',
    hp: 96,
    walk: 260,
    jump: 820,
    power: 1,
    reach: 2,
    tempo: 0.9,
    size: 0.95,
    moves: {
      move1: m('바람 날개', 'shot', 8, { speed: 700 }),
      move2: m('회오리 상승', 'rising', 10, { invuln: true, hits: 2, startup: 0.05 }),
      move3: m('급강하', 'dive', 13, { speed: 760 }),
      super: m('폭풍 급강하', 'dive', 7, { speed: 880, hits: 4, knock: 500 }),
    },
    desc: '가장 높이 뛰고 공중에서 강하다. 체력은 약한 편.',
    bars: { power: 2, speed: 5, reach: 2, defense: 2 },
    stage: 'beach',
  },
  {
    id: 'brachi',
    name: '브라키',
    dino: 'brachio',
    dinoName: '브라키오사우루스',
    title: '느긋한 거인',
    fur: { back: '#a5d6a7', belly: '#fbfff9', line: '#2f5a32', scale: '#7cb87f', feature: '#4f8f53' },
    accessory: 'scarf',
    accent: '#4f8f53',
    hp: 120,
    walk: 200,
    jump: 600,
    power: 1.05,
    reach: 30,
    tempo: 1.15,
    size: 1.08,
    moves: {
      move1: m('긴 목 휘두르기', 'spin', 5, { hits: 3, active: 0.5 }),
      move2: m('박치기 상승', 'rising', 12, { invuln: true, startup: 0.07 }),
      move3: m('쿵쿵 짓밟기', 'slam', 12, { startup: 0.28, speed: 400 }),
      super: m('거대 짓밟기', 'slam', 9, { startup: 0.3, speed: 520, hits: 3 }),
    },
    desc: '리치가 가장 길다. 멀리서 때리고 땅을 울린다.',
    bars: { power: 3, speed: 2, reach: 5, defense: 4 },
    stage: 'plains',
  },
  {
    id: 'raptor',
    name: '랩터',
    dino: 'raptor',
    dinoName: '벨로키랍토르',
    title: '번개 발톱',
    fur: { back: '#8d6e63', belly: '#f6ede8', line: '#3e2a24', scale: '#a1887f', feature: '#ffb300' },
    accessory: 'cap',
    accent: '#ffb300',
    hp: 95,
    walk: 285,
    jump: 720,
    power: 0.95,
    reach: 0,
    tempo: 0.78,
    size: 0.96,
    moves: {
      move1: m('발톱 연타', 'rush', 4, { speed: 700, hits: 4, active: 0.4 }),
      move2: m('회전 발톱', 'rising', 6, { invuln: true, hits: 2, startup: 0.04 }),
      move3: m('뒤돌아 베기', 'dive', 11, { speed: 900 }),
      super: m('사냥 본능', 'rush', 4, { speed: 1000, hits: 9, active: 0.7, knock: 480 }),
    },
    desc: '가장 빠르다. 쉬지 않고 몰아치는 연속 공격형.',
    bars: { power: 2, speed: 5, reach: 2, defense: 2 },
    stage: 'canyon',
  },
  {
    id: 'spino',
    name: '스피노',
    dino: 'spino',
    dinoName: '스피노사우루스',
    title: '파도의 왕',
    fur: { back: '#4fc3f7', belly: '#f4fcff', line: '#14506e', scale: '#4f8ab0', feature: '#1e88e5' },
    accessory: 'bow',
    accent: '#1e88e5',
    hp: 112,
    walk: 245,
    jump: 670,
    power: 1.15,
    reach: 10,
    tempo: 1,
    size: 1.03,
    moves: {
      move1: m('물대포', 'shot', 12, { speed: 680 }),
      move2: m('물기둥', 'rising', 11, { invuln: true, startup: 0.06, hits: 2 }),
      move3: m('돛 회전', 'spin', 4, { hits: 4, active: 0.55 }),
      super: m('대해일', 'shot', 26, { speed: 520 }),
    },
    desc: '물을 다루는 원거리형. 거리를 두고 싸우면 강하다.',
    bars: { power: 3, speed: 3, reach: 4, defense: 3 },
    stage: 'beach',
  },
  {
    id: 'meteor',
    name: '메테오',
    dino: 'meteor',
    dinoName: '운석룡',
    title: '하늘에서 떨어진 자',
    fur: { back: '#3a3350', belly: '#cfc8e8', line: '#120f1e', scale: '#2a2340', feature: '#ff6d2e' },
    accessory: 'crown',
    accent: '#ff6d2e',
    hp: 125,
    walk: 250,
    jump: 720,
    power: 1.2,
    reach: 12,
    tempo: 0.9,
    size: 1.08,
    moves: {
      move1: m('운석 낙하', 'meteor', 13, { startup: 0.3, speed: 700 }),
      move2: m('불꽃 상승', 'rising', 13, { invuln: true, startup: 0.05, hits: 2 }),
      move3: m('흑염 돌진', 'rush', 13, { speed: 880, armor: true }),
      super: m('대멸종', 'meteor', 9, { startup: 0.4, hits: 4, speed: 760 }),
    },
    desc: '공룡을 멸종시킨 운석의 힘을 가진 수수께끼의 햄스터. 스토리를 깨면 고를 수 있다.',
    bars: { power: 5, speed: 4, reach: 4, defense: 4 },
    stage: 'crater',
    hidden: true,
  },
];

export const BOSS = ROSTER.find((c) => c.id === 'meteor')!;
export const PLAYABLE = ROSTER.filter((c) => !c.hidden);

export function charById(id: string): CharDef {
  return ROSTER.find((c) => c.id === id) ?? ROSTER[0];
}

/** 기술표 (화면에 보여줄 커맨드) */
export const COMMANDS: Record<Slot | 'beast', string> = {
  move1: '↓ ↘ → + 펀치',
  move2: '→ ↓ ↘ + 펀치',
  move3: '↓ ↙ ← + 킥',
  super: '↓ ↘ → ↓ ↘ → + 펀치 (변신 중)',
  beast: '펀치 + 킥 동시에 (게이지 가득)',
};

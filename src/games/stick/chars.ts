// 막대 결투 캐릭터와 보스. 무기·능력치·기술이 저마다 다르다.

export type Weapon = 'fist' | 'hammer' | 'staff' | 'star' | 'sword' | 'club' | 'blades' | 'greatsword' | 'claw' | 'scythe';
export type SpecialKind = 'dash' | 'slam' | 'spin' | 'wave' | 'teleport';

export interface CharDef {
  id: string;
  name: string;
  /** 별명 */
  title: string;
  icon: string;
  color: string;
  band: string;
  weapon: Weapon;
  weaponName: string;
  hp: number;
  walk: number;
  jump: number;
  /** 몸 크기 */
  scale: number;
  /** 이 피해 이하의 공격에는 밀리지 않는다 (슈퍼아머) */
  armor: number;
  /** 공격력 배율 */
  power: number;
  /** 공격이 닿는 거리 보너스 */
  reach: number;
  /** 공격 동작 시간 배율 (작을수록 빠름) */
  tempo: number;
  /** 발차기 버튼: 발차기 또는 표창 던지기 */
  kick: 'kick' | 'throw';
  special: SpecialKind;
  specialName: string;
  /** 게이지가 차는 속도 배율 */
  meterGain: number;
  desc: string;
  /** 선택 화면 막대그래프 (1~5) */
  bars: { power: number; speed: number; reach: number; hp: number };
  hidden?: boolean;
}

export const HEROES: CharDef[] = [
  {
    id: 'rai',
    name: '라이',
    title: '번개 주먹',
    icon: '⚡',
    color: '#1b1f3b',
    band: '#3b82f6',
    weapon: 'fist',
    weaponName: '강철 너클',
    hp: 100,
    walk: 275,
    jump: 690,
    scale: 1,
    armor: 0,
    power: 0.9,
    reach: 0,
    tempo: 0.78,
    kick: 'kick',
    special: 'dash',
    specialName: '번개 돌진',
    meterGain: 1.1,
    desc: '가장 빠른 연타와 발놀림. 붙어서 몰아치는 타입.',
    bars: { power: 2, speed: 5, reach: 2, hp: 3 },
  },
  {
    id: 'gom',
    name: '곰돌',
    title: '바위 망치',
    icon: '🔨',
    color: '#4a3424',
    band: '#f59e0b',
    weapon: 'hammer',
    weaponName: '돌 해머',
    hp: 135,
    walk: 190,
    jump: 600,
    scale: 1.12,
    armor: 7,
    power: 1.45,
    reach: 12,
    tempo: 1.3,
    kick: 'kick',
    special: 'slam',
    specialName: '지진 내려찍기',
    meterGain: 1,
    desc: '느리지만 한 방이 크고, 약한 공격에는 밀리지 않는다. 지진은 점프로만 피할 수 있다.',
    bars: { power: 5, speed: 1, reach: 3, hp: 5 },
  },
  {
    id: 'sora',
    name: '소라',
    title: '회오리 봉',
    icon: '🌀',
    color: '#0f5132',
    band: '#34d399',
    weapon: 'staff',
    weaponName: '대나무 봉',
    hp: 105,
    walk: 245,
    jump: 780,
    scale: 1,
    armor: 0,
    power: 1.12,
    reach: 32,
    tempo: 0.9,
    kick: 'kick',
    special: 'spin',
    specialName: '회오리 돌리기',
    meterGain: 1,
    desc: '긴 봉으로 멀리서 찌르고, 가장 높이 뛴다. 회오리는 앞뒤를 모두 때린다.',
    bars: { power: 3, speed: 3, reach: 5, hp: 3 },
  },
  {
    id: 'kai',
    name: '카이',
    title: '불꽃 표창',
    icon: '🔥',
    color: '#7f1d1d',
    band: '#fb923c',
    weapon: 'star',
    weaponName: '불꽃 표창',
    hp: 92,
    walk: 255,
    jump: 710,
    scale: 0.95,
    armor: 0,
    power: 0.95,
    reach: -4,
    tempo: 0.95,
    kick: 'throw',
    special: 'wave',
    specialName: '대폭염파',
    meterGain: 1.15,
    desc: '발차기 대신 표창을 던지는 원거리형. 거리를 두고 싸우면 강하다.',
    bars: { power: 3, speed: 4, reach: 4, hp: 2 },
  },
  {
    id: 'harang',
    name: '하랑',
    title: '검성',
    icon: '⚔️',
    color: '#e5e7eb',
    band: '#a855f7',
    weapon: 'sword',
    weaponName: '달빛 장검',
    hp: 110,
    walk: 265,
    jump: 720,
    scale: 1.02,
    armor: 0,
    power: 1.2,
    reach: 22,
    tempo: 0.85,
    kick: 'kick',
    special: 'teleport',
    specialName: '그림자 베기',
    meterGain: 1.2,
    desc: '대마왕을 쓰러뜨린 자에게만 나타나는 전설의 검객. 빠르고 강하다.',
    bars: { power: 4, speed: 4, reach: 4, hp: 4 },
    hidden: true,
  },
];

export const BOSSES: CharDef[] = [
  {
    id: 'dokki',
    name: '골목대장 도끼',
    title: '1스테이지 보스',
    icon: '🏏',
    color: '#374151',
    band: '#ef4444',
    weapon: 'club',
    weaponName: '야구 방망이',
    hp: 150,
    walk: 200,
    jump: 620,
    scale: 1.08,
    armor: 0,
    power: 1.05,
    reach: 14,
    tempo: 1.15,
    kick: 'kick',
    special: 'dash',
    specialName: '박치기 돌격',
    meterGain: 1.1,
    desc: '동네 골목을 주름잡는 대장. 방망이를 휘두르며 돌진한다.',
    bars: { power: 3, speed: 2, reach: 3, hp: 3 },
  },
  {
    id: 'ryu',
    name: '쌍칼 검객 류',
    title: '2스테이지 보스',
    icon: '🗡️',
    color: '#1e3a8a',
    band: '#e5e7eb',
    weapon: 'blades',
    weaponName: '쌍단검',
    hp: 165,
    walk: 285,
    jump: 720,
    scale: 1,
    armor: 0,
    power: 0.9,
    reach: 8,
    tempo: 0.72,
    kick: 'kick',
    special: 'dash',
    specialName: '질풍 베기',
    meterGain: 1.3,
    desc: '대나무 숲의 검객. 눈에 보이지 않을 만큼 빠르게 벤다.',
    bars: { power: 2, speed: 5, reach: 3, hp: 3 },
  },
  {
    id: 'titan',
    name: '철가면 거인',
    title: '3스테이지 보스',
    icon: '🗿',
    color: '#52525b',
    band: '#facc15',
    weapon: 'greatsword',
    weaponName: '철근 대검',
    hp: 240,
    walk: 165,
    jump: 560,
    scale: 1.38,
    armor: 10,
    power: 1.45,
    reach: 30,
    tempo: 1.35,
    kick: 'kick',
    special: 'slam',
    specialName: '대지 가르기',
    meterGain: 1.2,
    desc: '공사장의 거인. 웬만한 공격에는 꿈쩍도 하지 않는다.',
    bars: { power: 5, speed: 1, reach: 5, hp: 5 },
  },
  {
    id: 'kage',
    name: '그림자 닌자',
    title: '4스테이지 보스',
    icon: '🥷',
    color: '#111827',
    band: '#8b5cf6',
    weapon: 'claw',
    weaponName: '그림자 손톱',
    hp: 165,
    walk: 290,
    jump: 800,
    scale: 0.98,
    armor: 0,
    power: 1,
    reach: 4,
    tempo: 0.8,
    kick: 'throw',
    special: 'teleport',
    specialName: '그림자 이동',
    meterGain: 1.25,
    desc: '밤의 지붕 위를 달리는 닌자. 표창을 던지고 등 뒤로 순간이동한다.',
    bars: { power: 3, speed: 5, reach: 3, hp: 3 },
  },
  {
    id: 'maou',
    name: '흑막 대마왕',
    title: '최종 보스',
    icon: '👹',
    color: '#3b0764',
    band: '#f43f5e',
    weapon: 'scythe',
    weaponName: '어둠의 낫',
    hp: 240,
    walk: 220,
    jump: 680,
    scale: 1.22,
    armor: 5,
    power: 1.15,
    reach: 32,
    tempo: 1,
    kick: 'kick',
    special: 'wave',
    specialName: '암흑파',
    meterGain: 1.4,
    desc: '모든 사건의 흑막. 체력이 절반 아래로 떨어지면 분노해 모든 기술을 쓴다.',
    bars: { power: 5, speed: 3, reach: 5, hp: 5 },
  },
];

export function charById(id: string): CharDef {
  return [...HEROES, ...BOSSES].find((c) => c.id === id) ?? HEROES[0];
}

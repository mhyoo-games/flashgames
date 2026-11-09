// 속성 18종과 상성
export const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fight', 'poison', 'ground', 'wind', 'mind', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'light'] as const;
export type Type = (typeof TYPES)[number];

export const TYPE_NAME: Record<Type, string> = {
  normal: '보통',
  fire: '불',
  water: '물',
  grass: '풀',
  electric: '전기',
  ice: '얼음',
  fight: '격투',
  poison: '독',
  ground: '땅',
  wind: '바람',
  mind: '마음',
  bug: '벌레',
  rock: '바위',
  ghost: '귀신',
  dragon: '용',
  dark: '어둠',
  steel: '강철',
  light: '빛',
};

export const TYPE_COLOR: Record<Type, string> = {
  normal: '#b8b090',
  fire: '#f0703a',
  water: '#4a90f0',
  grass: '#5ac04a',
  electric: '#f8d030',
  ice: '#90e0e8',
  fight: '#c03028',
  poison: '#a050b0',
  ground: '#d8b060',
  wind: '#a0b8f8',
  mind: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#605048',
  steel: '#b8b8d0',
  light: '#f8a8d8',
};

// 공격 속성 → [효과 굉장함, 효과 별로, 효과 없음]
const CHART: Record<Type, [Type[], Type[], Type[]]> = {
  normal: [[], ['rock', 'steel'], ['ghost']],
  fire: [['grass', 'ice', 'bug', 'steel'], ['fire', 'water', 'rock', 'dragon'], []],
  water: [['fire', 'ground', 'rock'], ['water', 'grass', 'dragon'], []],
  grass: [['water', 'ground', 'rock'], ['fire', 'grass', 'poison', 'wind', 'bug', 'dragon', 'steel'], []],
  electric: [['water', 'wind'], ['electric', 'grass', 'dragon'], ['ground']],
  ice: [['grass', 'ground', 'wind', 'dragon'], ['fire', 'water', 'ice', 'steel'], []],
  fight: [['normal', 'ice', 'rock', 'dark', 'steel'], ['poison', 'wind', 'mind', 'bug', 'light'], ['ghost']],
  poison: [['grass', 'light'], ['poison', 'ground', 'rock', 'ghost'], ['steel']],
  ground: [['fire', 'electric', 'poison', 'rock', 'steel'], ['grass', 'bug'], ['wind']],
  wind: [['grass', 'fight', 'bug'], ['electric', 'rock', 'steel'], []],
  mind: [['fight', 'poison'], ['mind', 'steel'], ['dark']],
  bug: [['grass', 'mind', 'dark'], ['fire', 'fight', 'poison', 'wind', 'ghost', 'steel', 'light'], []],
  rock: [['fire', 'ice', 'wind', 'bug'], ['fight', 'ground', 'steel'], []],
  ghost: [['mind', 'ghost'], ['dark'], ['normal']],
  dragon: [['dragon'], ['steel'], ['light']],
  dark: [['mind', 'ghost'], ['fight', 'dark', 'light'], []],
  steel: [['ice', 'rock', 'light'], ['fire', 'water', 'electric', 'steel'], []],
  light: [['fight', 'dragon', 'dark'], ['fire', 'poison', 'steel'], []],
};

/** 공격 속성이 방어 속성(1~2개)에 주는 배율 */
export function effectiveness(atk: Type, def: Type[]): number {
  let m = 1;
  const [sup, weak, none] = CHART[atk];
  for (const d of def) {
    if (none.includes(d)) return 0;
    if (sup.includes(d)) m *= 2;
    else if (weak.includes(d)) m *= 0.5;
  }
  return m;
}

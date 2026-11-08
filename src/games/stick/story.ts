// 스토리 모드: 스테이지마다 다른 장소와 보스. 이어하기 3번.
import { BOSSES, HEROES, type CharDef } from './chars.ts';
import type { Level } from './ai.ts';

export type StageBg = 'alley' | 'bamboo' | 'site' | 'roof' | 'castle';

export interface Stage {
  no: number;
  place: string;
  bg: StageBg;
  boss: CharDef;
  level: Level;
  /** 보스 등장 대사 */
  line: string;
  final?: boolean;
}

export const STAGES: Stage[] = [
  { no: 1, place: '해질녘 골목', bg: 'alley', boss: BOSSES[0], level: 'easy', line: '여기는 내 구역이다. 지나가려면 나를 쓰러뜨려라!' },
  { no: 2, place: '안개 낀 대나무 숲', bg: 'bamboo', boss: BOSSES[1], level: 'normal', line: '내 칼날이 보이기나 할까?' },
  { no: 3, place: '멈춘 공사장', bg: 'site', boss: BOSSES[2], level: 'normal', line: '…부숴 주마.' },
  { no: 4, place: '달밤의 지붕 위', bg: 'roof', boss: BOSSES[3], level: 'normal', line: '그림자는 등 뒤에서 온다.' },
  { no: 5, place: '어둠의 성', bg: 'castle', boss: BOSSES[4], level: 'normal', line: '여기까지 오다니. 이제 끝을 보자!', final: true },
];

export const CONTINUES = 3;

export interface StoryState {
  hero: string;
  stage: number;
  continues: number;
  /** 스테이지별 걸린 시간 (초) */
  times: number[];
  cleared: boolean;
}

export function newStory(hero: string): StoryState {
  return { hero, stage: 0, continues: CONTINUES, times: [], cleared: false };
}

/** 스테이지 결과 반영. 졌는데 이어하기가 없으면 'gameover' */
export function stageResult(s: StoryState, won: boolean, seconds: number): 'next' | 'clear' | 'retry' | 'gameover' {
  if (won) {
    s.times[s.stage] = Math.round(seconds);
    if (s.stage >= STAGES.length - 1) {
      s.cleared = true;
      return 'clear';
    }
    s.stage++;
    return 'next';
  }
  if (s.continues <= 0) return 'gameover';
  s.continues--;
  return 'retry';
}

/** 선택할 수 있는 캐릭터 (히든 캐릭터는 스토리를 깨면 열림) */
export function selectable(unlocked: boolean): CharDef[] {
  return HEROES.filter((h) => !h.hidden || unlocked);
}

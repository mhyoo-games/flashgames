// 스토리 모드: 나머지 7마리와 차례로 싸운 뒤, 마지막에 하늘에서 떨어진 보스가 나타난다.
import { BOSS, PLAYABLE, ROSTER, type CharDef, type StageId } from './chars.ts';
import type { Level } from './ai.ts';
import { seeded } from '../../core/rng.ts';

export interface StoryStage {
  no: number;
  rival: CharDef;
  stage: StageId;
  level: Level;
  final: boolean;
}

export interface StoryState {
  hero: string;
  stages: StoryStage[];
  index: number;
  continues: number;
  cleared: boolean;
}

const LADDER: Level[] = ['easy', 'easy', 'normal', 'normal', 'normal', 'hard', 'hard', 'hard'];

export function newStory(hero: string, seed = Date.now()): StoryState {
  const rng = seeded(seed);
  const others = PLAYABLE.filter((c) => c.id !== hero);
  // 순서는 판마다 섞는다
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const rivals = [...others, BOSS];
  const stages = rivals.map((rival, i) => ({ no: i + 1, rival, stage: rival.stage, level: rival === BOSS ? ('normal' as Level) : LADDER[i], final: rival === BOSS }));
  return { hero, stages, index: 0, continues: 0, cleared: false };
}

export function stageResult(s: StoryState, won: boolean): 'next' | 'clear' | 'retry' {
  if (!won) {
    s.continues++;
    return 'retry';
  }
  if (s.index >= s.stages.length - 1) {
    s.cleared = true;
    return 'clear';
  }
  s.index++;
  return 'next';
}

export function selectable(unlocked: boolean): CharDef[] {
  return ROSTER.filter((c) => !c.hidden || unlocked);
}

/** 보스 등장 대사 */
export const BOSS_LINES = ['하늘에서 떨어진 별이… 너희 공룡의 힘을 모두 가져가겠다!', '멸종의 날을 다시 보여 주마.'];

// 오락실에 있는 게임 목록. 새 게임은 여기에 한 줄 추가하고 src/games/<id>/ 에 만든다.
import type { SongId } from '../core/music.ts';

export interface GameInfo {
  id: string;
  title: string;
  /** 한 줄 소개 */
  tagline: string;
  genre: string;
  players: string;
  song: SongId;
  /** 카드 배경색 */
  colors: [string, string];
  controls: string[];
}

export const GAMES: GameInfo[] = [
  {
    id: 'dino',
    title: '햄스터 다이노 파이트',
    tagline: '햄스터 8마리의 공룡 변신 격투! 커맨드 기술로 싸우다 게이지가 차면 티라노·트리케라톱스·스테고사우루스로 변신!',
    genre: '격투',
    players: '1인 스토리 · 컴퓨터 대전 · 2인 대전',
    song: 'fight',
    colors: ['#ff9a5a', '#7fd8be'],
    controls: ['1P: WASD 이동, J 펀치, K 킥, L 변신', '2P: 방향키 이동, 1 펀치, 2 킥, 3 변신', '↓↘→+펀치 등 커맨드 기술'],
  },
  {
    id: 'maze',
    title: '도토리 미로',
    tagline: '밤의 숲 미로에서 도토리를 모으는 다람쥐. 고양이 넷을 피하고, 황금 도토리로 역전!',
    genre: '미로 추격',
    players: '1인',
    song: 'maze',
    colors: ['#2f6b3a', '#89c46a'],
    controls: ['방향키 / WASD 로 이동', '휴대폰은 화면을 밀어서 방향 바꾸기', 'Esc 일시정지'],
  },
];

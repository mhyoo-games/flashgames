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
    id: 'stick',
    title: '막대 결투',
    tagline: '옥상 위 졸라맨 1:1 격투. 3단 콤보와 기공파로 먼저 두 판 따면 승리!',
    genre: '격투',
    players: '1인 (컴퓨터) · 2인 (한 키보드)',
    song: 'fight',
    colors: ['#ff9a5a', '#ffd27a'],
    controls: ['1P: A·D 이동, W 점프, S 막기, J 주먹, K 발차기, L 기공파', '2P: ←·→ 이동, ↑ 점프, ↓ 막기, 1 주먹, 2 발차기, 3 기공파 (숫자패드도 가능)'],
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

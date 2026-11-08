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
    id: 'quest',
    title: '주먹밥 용사전',
    tagline: '게으른 무술 소년 하루와 덜렁이 마법사 미르의 도트 RPG! 마을 사람과 이야기하고, 칸 위에서 움직이며 싸우는 전략 전투로 사라진 종을 되찾아라.',
    genre: 'RPG',
    players: '1인 · 제1장',
    song: 'town',
    colors: ['#3a5ad0', '#ffd24a'],
    controls: ['방향키 이동, Z / Enter 확인·말 걸기', 'X / Esc 메뉴·취소', '휴대폰은 화면 아래 A·B 버튼'],
  },
  {
    id: 'dino',
    title: '햄스터 다이노 파이트',
    tagline: '햄스터 8마리의 공룡 변신 격투! 이어 치기와 커맨드 기술로 싸우고, 기를 모아 티라노·트리케라톱스·스테고사우루스로 변신!',
    genre: '격투',
    players: '1인 스토리 · 컴퓨터 대전 · 2인 대전',
    song: 'fight',
    colors: ['#ff9a5a', '#7fd8be'],
    controls: ['1P: WASD 이동, U·I 펀치, J·K 킥, L 기', '2P: 방향키 이동, 숫자패드 4·5 펀치, 1·2 킥, 3 기', '↓→+펀치 등 순서 입력 기술, 약→강 이어 치기'],
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

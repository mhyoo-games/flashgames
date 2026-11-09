import { useEffect, useState } from 'react';
import { sound } from './core/audio';
import { GAMES } from './games/registry';
import { MazeGame } from './games/maze/MazeGame';
import { DinoGame } from './games/dino/DinoGame';
import { QuestGame } from './games/quest/QuestGame';
import { KkaebiGame } from './games/kkaebi/KkaebiGame';
import { Home } from './ui/Home';

function route(): string {
  return location.hash.replace(/^#\/?/, '');
}

export default function App() {
  const [page, setPage] = useState(route());

  useEffect(() => {
    const on = () => setPage(route());
    window.addEventListener('hashchange', on);
    // 브라우저는 처음 누른 뒤에야 소리를 낼 수 있다
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const g = GAMES.find((x) => x.id === page);
    sound.play(g ? g.song : 'lobby');
    document.title = g ? `${g.title} · 추억의 오락실` : '추억의 오락실';
  }, [page]);

  const go = (id: string) => {
    location.hash = id ? `/${id}` : '';
  };
  const home = () => go('');

  if (page === 'kkaebi') return <KkaebiGame onBack={home} />;
  if (page === 'quest') return <QuestGame onBack={home} />;
  if (page === 'dino') return <DinoGame onBack={home} />;
  if (page === 'maze') return <MazeGame onBack={home} />;
  return <Home onPlay={go} />;
}

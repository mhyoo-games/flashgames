import { load } from '../core/storage';
import { GAMES, type GameInfo } from '../games/registry';
import { SoundControls } from './common';

function Art({ id }: { id: string }) {
  if (id === 'stick')
    return (
      <svg viewBox="0 0 200 110" className="art">
        <rect width="200" height="110" fill="#ffd9a0" />
        <rect y="88" width="200" height="22" fill="#8d6e63" />
        <g stroke="#1b1f3b" strokeWidth="5" strokeLinecap="round" fill="none">
          <circle cx="62" cy="28" r="9" fill="#1b1f3b" />
          <path d="M62 37 L58 62 M58 62 L46 86 M58 62 L70 86 M60 44 L82 40 L98 42 M60 44 L48 54 L56 60" />
        </g>
        <g stroke="#c0392b" strokeWidth="5" strokeLinecap="round" fill="none">
          <circle cx="140" cy="32" r="9" fill="#c0392b" />
          <path d="M140 41 L146 64 M146 64 L130 70 L108 60 M146 64 L154 88 M142 48 L130 52 M142 48 L156 44" />
        </g>
        <g stroke="#fff" strokeWidth="3">
          <path d="M102 36 l8 -6 M104 44 l10 0 M102 50 l8 6" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 200 110" className="art">
      <rect width="200" height="110" fill="#1a3a27" />
      <g fill="#2f6b3a">
        <rect x="8" y="8" width="184" height="10" rx="5" />
        <rect x="8" y="92" width="184" height="10" rx="5" />
        <rect x="40" y="34" width="50" height="12" rx="6" />
        <rect x="110" y="34" width="50" height="12" rx="6" />
        <rect x="40" y="64" width="120" height="12" rx="6" />
      </g>
      <g fill="#c8864a">
        {[20, 34, 48, 62, 76, 124, 138, 152, 166, 180].map((x) => (
          <circle key={x} cx={x} cy="27" r="3" />
        ))}
        {[20, 34, 48, 62, 138, 152, 166, 180].map((x) => (
          <circle key={x} cx={x} cy="56" r="3" />
        ))}
      </g>
      <circle cx="180" cy="84" r="6" fill="#ffd54a" />
      <circle cx="100" cy="56" r="10" fill="#d17a3a" />
      <ellipse cx="90" cy="52" rx="5" ry="8" fill="#b5652d" />
      <ellipse cx="140" cy="84" rx="9" ry="8" fill="#ff9f43" />
      <path d="M132 80 l2 -9 l4 6 M148 80 l-2 -9 l-4 6" fill="#ff9f43" />
    </svg>
  );
}

function Card({ g, onPlay }: { g: GameInfo; onPlay: () => void }) {
  const best =
    g.id === 'maze'
      ? load<{ score: number }[]>('maze-scores', [])[0]?.score
      : (() => {
          const r = load<{ clears?: Record<string, number> }>('stick-v2', {});
          const n = Object.keys(r.clears ?? {}).length;
          return n || undefined;
        })();
  return (
    <button className="game-card" onClick={onPlay} style={{ ['--c1' as string]: g.colors[0], ['--c2' as string]: g.colors[1] }}>
      <Art id={g.id} />
      <div className="game-info">
        <div className="game-title">
          <b>{g.title}</b>
          <span className="tag">{g.genre}</span>
        </div>
        <p>{g.tagline}</p>
        <small className="muted">
          {g.players}
          {best !== undefined && (g.id === 'maze' ? ` · 최고 ${best.toLocaleString()}점` : ` · 스토리 클리어 ${best}명`)}
        </small>
      </div>
      <span className="play">▶ 플레이</span>
    </button>
  );
}

export function Home({ onPlay }: { onPlay: (id: string) => void }) {
  return (
    <div className="home">
      <header className="home-head">
        <div className="logo">
          <span className="coin">🪙</span>
          <div>
            <h1>추억의 오락실</h1>
            <p>방과 후 컴퓨터실에서 하던 그 느낌 그대로, 새로 만든 웹 게임 모음</p>
          </div>
        </div>
        <SoundControls />
      </header>
      <div className="cards">
        {GAMES.map((g) => (
          <Card key={g.id} g={g} onPlay={() => onPlay(g.id)} />
        ))}
        <div className="game-card soon">
          <div className="art soon-art">🕹️</div>
          <div className="game-info">
            <b>다음 게임 준비 중</b>
            <p>새 게임이 계속 추가됩니다.</p>
          </div>
        </div>
      </div>
      <footer className="foot muted">모든 게임·그림·음악은 이 사이트를 위해 새로 만들었습니다. 기록은 이 브라우저에만 저장됩니다.</footer>
    </div>
  );
}

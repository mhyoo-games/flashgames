import { useEffect, useRef, useState } from 'react';
import { sound, type Sfx } from '../../core/audio';
import { random } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { AcornMaze, type Dir, type MazeEvent } from './engine';
import { renderMaze, VIEW_H, VIEW_W } from './render';

const KEYS: Record<string, Dir> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const SFX: Partial<Record<MazeEvent, Sfx>> = { acorn: 'acorn', power: 'power', catch: 'catch', bonus: 'bonus', death: 'death', clear: 'clear', start: 'start', extra: 'extra' };

interface Score {
  score: number;
  level: number;
  date: string;
}

export function MazeGame({ onBack }: { onBack: () => void }) {
  const [scores, setScores] = useState<Score[]>(() => load('maze-scores', []));
  const [game, setGame] = useState<AcornMaze | null>(null);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const lastAcornSfx = useRef(0);
  const best = scores[0]?.score ?? 0;
  const bestRef = useRef(best);
  bestRef.current = best;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const reported = useRef<AcornMaze | null>(null);

  const start = () => {
    sound.sfx('click');
    setOver(false);
    setPaused(false);
    setGame(new AcornMaze(random));
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) {
        if (e.code === 'Enter' || e.code === 'Space') start();
        return;
      }
      if (e.code in KEYS) {
        e.preventDefault();
        g.steer(KEYS[e.code]);
      }
      if (e.code === 'Escape' || e.code === 'KeyP') setPaused((p) => !p);
    };
    const blur = () => setPaused(true);
    window.addEventListener('keydown', down);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useLoop((dt) => {
    const g = gameRef.current;
    if (!g) return;
    if (!pausedRef.current) g.step(dt);
    for (const e of g.drainEvents()) {
      const s = SFX[e];
      if (!s) continue;
      // 도토리 소리는 너무 잦지 않게
      if (s === 'acorn') {
        if (g.time - lastAcornSfx.current < 0.09) continue;
        lastAcornSfx.current = g.time;
      }
      sound.sfx(s);
    }
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderMaze(ctx, g, bestRef.current);
    if (g.over && reported.current !== g) {
      reported.current = g;
      setOver(true);
      const entry: Score = { score: g.score, level: g.level, date: new Date().toLocaleDateString('ko-KR') };
      setScores((list) => {
        const next = [...list, entry].sort((a, b) => b.score - a.score).slice(0, 5);
        save('maze-scores', next);
        return next;
      });
    }
  }, !!game);

  return (
    <Shell title="🌰 도토리 미로" onBack={onBack}>
      {!game ? (
        <div className="menu-card">
          <h2>밤의 숲, 도토리를 모두 모으세요</h2>
          <p>
            다람쥐 <b>다람이</b>가 되어 미로의 도토리를 모으세요. 치즈·고등어·까망·코코, 고양이 넷은 저마다 다른 방법으로 쫓아옵니다.
            <b> 황금 도토리</b>를 먹으면 고양이들이 졸려서 잠깐 동안 잡을 수 있어요.
          </p>
          <ul className="controls">
            <li>
              <kbd>방향키</kbd> 또는 <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> 이동 · <kbd>Esc</kbd> 일시정지
            </li>
            <li>휴대폰은 화면을 원하는 방향으로 밀어 주세요.</li>
            <li>치즈는 곧장, 고등어는 앞길을 막고, 까망은 치즈와 협공, 코코는 가까이 가면 도망가요.</li>
          </ul>
          <button className="primary big" onClick={start}>
            ▶ 시작 (Enter)
          </button>
          <ScoreTable scores={scores} />
        </div>
      ) : (
        <div
          className="stage-wrap"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerMove={(e) => {
            const s = swipe.current;
            if (!s || !game) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.hypot(dx, dy) < 24) return;
            game.steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (swipe.current = null)}
        >
          <canvas ref={canvas} width={VIEW_W} height={VIEW_H} className="stage touch-none" />
          {paused && !over && (
            <div className="overlay">
              <h2>일시정지</h2>
              <button className="primary" onClick={() => setPaused(false)}>
                계속하기
              </button>
              <button onClick={() => setGame(null)}>그만하기</button>
            </div>
          )}
          {over && (
            <div className="overlay">
              <h2>게임 끝</h2>
              <p>
                점수 <b>{game.score.toLocaleString()}</b> · {game.level}단계
                {game.score >= best && game.score > 0 ? ' · 🏆 최고 기록!' : ''}
              </p>
              <button className="primary" onClick={start}>
                다시 하기
              </button>
              <button onClick={() => setGame(null)}>기록 보기</button>
            </div>
          )}
          <button className="pause-btn" onClick={() => setPaused(true)} aria-label="일시정지">
            ⏸
          </button>
        </div>
      )}
    </Shell>
  );
}

function ScoreTable({ scores }: { scores: Score[] }) {
  if (!scores.length) return null;
  return (
    <table className="scores">
      <caption>최고 기록</caption>
      <tbody>
        {scores.map((s, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>
              <b>{s.score.toLocaleString()}</b>
            </td>
            <td>{s.level}단계</td>
            <td className="muted">{s.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

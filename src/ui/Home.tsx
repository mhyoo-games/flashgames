import { useEffect, useRef } from 'react';
import { load } from '../core/storage';
import { charById } from '../games/dino/chars';
import { drawHamster, drawStage, idlePose } from '../games/dino/render';
import { blit } from '../games/quest/pixel';
import { SPECIES } from '../games/kkaebi/species';
import { drawKkaebi, kkaebiSprite } from '../games/kkaebi/sprite';
import { personSprite, renderWorld } from '../games/quest/render';
import { newWorld } from '../games/quest/world';
import { GAMES, type GameInfo } from '../games/registry';
import { SoundControls } from './common';

/** 첫 화면 카드: 햄스터 둘이 마주 보는 그림 */
function DinoArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawStage(ctx, 'jungle', t);
      drawHamster(ctx, charById('rex'), { x: 330, y: 465, facing: 1, size: 1.9, beast: Math.floor(t / 2.5) % 2 === 1, pose: idlePose(t, 'angry', 1), time: t, seed: 1 });
      drawHamster(ctx, charById('triko'), { x: 630, y: 465, facing: -1, size: 1.9, beast: true, pose: idlePose(t, 'angry', 2), time: t, seed: 2 });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={960} height={528} className="art" />;
}

function QuestArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const w = newWorld();
    w.x = 12;
    w.y = 8;
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderWorld(ctx, w, { px: 10.5, py: 7, dir: 'down', trail: [] }, t);
      const f = Math.floor(t * 3) % 2;
      blit(ctx, personSprite('mir', 'down', 1 - f).cv, 560, 420, 6);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 960, 528);
      ctx.globalAlpha = 1;
      blit(ctx, personSprite('haru', 'down', f).cv, 420, 420, 6);
      blit(ctx, personSprite('mir', 'down', 1 - f).cv, 560, 420, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={960} height={528} className="art pixel" />;
}

function KkaebiArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const show = [3, 6, 9, 87, 193, 60];
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - t0) / 1000;
      const g = ctx.createLinearGradient(0, 0, 0, 528);
      g.addColorStop(0, '#f8d060');
      g.addColorStop(1, '#88c868');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 960, 528);
      show.forEach((no, i) => drawKkaebi(ctx, kkaebiSprite(SPECIES[no - 1], false, Math.floor(t * 2 + i) % 2), 110 + i * 150, 400 + Math.sin(t * 2 + i) * 8, 3.2));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={960} height={528} className="art pixel" />;
}

function Art({ id }: { id: string }) {
  if (id === 'dino') return <DinoArt />;
  if (id === 'kkaebi') return <KkaebiArt />;
  if (id === 'quest') return <QuestArt />;
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
          if (g.id === 'kkaebi') return load<{ s?: { caught: number[] } } | null>('kkaebi-v1', null)?.s?.caught.length || undefined;
          if (g.id === 'quest') return load<{ w?: { flags: Record<string, boolean> } } | null>('quest-v1', null)?.w?.flags.clear1 ? 1 : undefined;
          const r = load<{ clears?: Record<string, number> }>('dino-v1', {});
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
          {best !== undefined && (g.id === 'maze' ? ` · 최고 ${best.toLocaleString()}점` : g.id === 'quest' ? ' · 제1장 클리어' : g.id === 'kkaebi' ? ` · 도감 ${best}종` : ` · 스토리 클리어 ${best}마리`)}
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

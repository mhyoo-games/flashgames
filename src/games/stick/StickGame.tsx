import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { sound, type Sfx } from '../../core/audio';
import { seeded } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { LEVELS, StickAI, type Level } from './ai';
import { H, NO_INPUT, StickFight, W, type GameEvent, type Input } from './engine';
import { renderStick } from './render';

type Mode = { kind: 'cpu'; level: Level } | { kind: 'versus' };
type Record_ = Record<Level, { win: number; lose: number }>;

const SFX: Partial<Record<GameEvent, Sfx>> = { hit: 'punch', bighit: 'bighit', block: 'block', swing: 'swing', jump: 'jump', special: 'special', ko: 'ko', fight: 'fight', win: 'win', lose: 'lose', timeup: 'ko' };

const P1: Record<string, keyof Input> = { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyJ: 'punch', KeyK: 'kick', KeyL: 'special' };
const P2: Record<string, keyof Input> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Digit1: 'punch',
  Numpad1: 'punch',
  Digit2: 'kick',
  Numpad2: 'kick',
  Digit3: 'special',
  Numpad3: 'special',
};

export function StickGame({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [record, setRecord] = useState<Record_>(() => load('stick-record', { easy: { win: 0, lose: 0 }, normal: { win: 0, lose: 0 }, hard: { win: 0, lose: 0 } }));

  return (
    <Shell title="🥋 막대 결투" onBack={mode ? () => setMode(null) : onBack}>
      {!mode ? (
        <div className="menu-card">
          <h2>상대를 고르세요</h2>
          <div className="mode-grid">
            {(Object.keys(LEVELS) as Level[]).map((lv) => (
              <button key={lv} className={`mode ${lv}`} onClick={() => (sound.sfx('click'), setMode({ kind: 'cpu', level: lv }))}>
                <b>컴퓨터 · {LEVELS[lv].name}</b>
                <small>
                  전적 {record[lv].win}승 {record[lv].lose}패
                </small>
              </button>
            ))}
            <button className="mode versus" onClick={() => (sound.sfx('click'), setMode({ kind: 'versus' }))}>
              <b>2인 대전</b>
              <small>한 키보드로 친구와</small>
            </button>
          </div>
          <ul className="controls">
            <li>
              <b>1P</b> <kbd>A</kbd>
              <kbd>D</kbd> 이동 · <kbd>W</kbd> 점프 · <kbd>S</kbd> 막기 · <kbd>J</kbd> 주먹 · <kbd>K</kbd> 발차기 · <kbd>L</kbd> 기공파
            </li>
            <li>
              <b>2P</b> <kbd>←</kbd>
              <kbd>→</kbd> 이동 · <kbd>↑</kbd> 점프 · <kbd>↓</kbd> 막기 · <kbd>1</kbd> 주먹 · <kbd>2</kbd> 발차기 · <kbd>3</kbd> 기공파
            </li>
            <li>주먹을 빠르게 세 번 누르면 3단 콤보. 맞히거나 맞으면 파란 게이지가 차고, 가득 차면 기공파를 쏠 수 있어요.</li>
            <li>컴퓨터와 할 때는 방향키로도 움직일 수 있습니다. 휴대폰은 화면 버튼으로.</li>
          </ul>
        </div>
      ) : (
        <Fight
          key={JSON.stringify(mode)}
          mode={mode}
          onEnd={(won) => {
            if (mode.kind !== 'cpu') return;
            const next = { ...record, [mode.level]: { win: record[mode.level].win + (won ? 1 : 0), lose: record[mode.level].lose + (won ? 0 : 1) } };
            setRecord(next);
            save('stick-record', next);
          }}
          onMenu={() => setMode(null)}
        />
      )}
    </Shell>
  );
}

function Fight({ mode, onEnd, onMenu }: { mode: Mode; onEnd: (won: boolean) => void; onMenu: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState(() => new StickFight(mode.kind === 'cpu' ? ['나', `컴퓨터 (${LEVELS[mode.level].name})`] : ['1P', '2P']));
  const ai = useRef(mode.kind === 'cpu' ? new StickAI(1, mode.level, seeded(Date.now() % 100000)) : null);
  const keys = useRef(new Set<string>());
  const touch = useRef<Input>({ ...NO_INPUT });
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const reported = useRef(false);
  const time = useRef(0);
  const gameRef = useRef(game);
  gameRef.current = game;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code in P1 || e.code in P2 || e.code === 'Space') e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') setPaused((p) => !p);
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      keys.current.clear();
      setPaused(true);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const read = (map: Record<string, keyof Input>): Input => {
    const inp = { ...NO_INPUT };
    for (const [code, k] of Object.entries(map)) if (keys.current.has(code)) inp[k] = true;
    return inp;
  };

  useLoop((dt) => {
    const g = gameRef.current;
    time.current += dt;
    if (!pausedRef.current) {
      let p1 = read(P1);
      const t = touch.current;
      p1 = Object.fromEntries(Object.keys(p1).map((k) => [k, p1[k as keyof Input] || t[k as keyof Input]])) as unknown as Input;
      let p2: Input;
      if (ai.current) {
        // 컴퓨터와 할 때는 방향키·숫자도 1P
        const alt = read(P2);
        p1 = Object.fromEntries(Object.keys(p1).map((k) => [k, p1[k as keyof Input] || alt[k as keyof Input]])) as unknown as Input;
        p2 = ai.current.input(g, dt);
      } else p2 = read(P2);
      g.step(dt, [p1, p2]);
      for (const e of g.drainEvents()) {
        const s = SFX[e];
        if (s) sound.sfx(s);
      }
    }
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderStick(ctx, g, time.current);
    if (g.over && !reported.current) {
      reported.current = true;
      onEndRef.current(g.winner === 0);
      setTimeout(() => setOver(true), 1500);
    }
  });

  const hold = (k: keyof Input) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      touch.current[k] = true;
    },
    onPointerUp: () => (touch.current[k] = false),
    onPointerLeave: () => (touch.current[k] = false),
    onPointerCancel: () => (touch.current[k] = false),
  });

  return (
    <>
    <div className="stage-wrap">
      <canvas ref={canvas} width={W} height={H} className="stage" />
      {paused && !over && (
        <div className="overlay">
          <h2>일시정지</h2>
          <button className="primary" onClick={() => setPaused(false)}>
            계속하기
          </button>
          <button onClick={onMenu}>상대 다시 고르기</button>
        </div>
      )}
      {over && (
        <div className="overlay">
          <h2>{game.winner === 0 ? (mode.kind === 'cpu' ? '승리! 🎉' : '1P 승리!') : mode.kind === 'cpu' ? '패배…' : '2P 승리!'}</h2>
          <button
            className="primary"
            onClick={() => {
              reported.current = false;
              setOver(false);
              setGame(new StickFight(game.fighters.map((f) => f.name) as [string, string]));
            }}
          >
            한 판 더
          </button>
          <button onClick={onMenu}>상대 다시 고르기</button>
        </div>
      )}
      <button className="pause-btn" onClick={() => setPaused(true)} aria-label="일시정지">
        ⏸
      </button>
    </div>
      <div className="touchpad">
        <div className="pad-left">
          <button className="l" {...hold('left')}>◀</button>
          <button className="u" {...hold('up')}>▲</button>
          <button className="d" {...hold('down')}>🛡️</button>
          <button className="r" {...hold('right')}>▶</button>
        </div>
        <div className="pad-right">
          <button {...hold('punch')}>👊</button>
          <button {...hold('kick')}>🦵</button>
          <button className="special" {...hold('special')}>🔥</button>
        </div>
      </div>
    </>
  );
}

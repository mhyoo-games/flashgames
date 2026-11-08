import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { sound, type Sfx } from '../../core/audio';
import { random, seeded } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { LEVELS, StickAI, type Level } from './ai';
import { HEROES, type CharDef } from './chars';
import { FLOOR, H, NO_INPUT, StickFight, W, type FightOptions, type Fighter, type GameEvent, type Input } from './engine';
import { drawFighter, drawStage, renderStick } from './render';
import { CONTINUES, newStory, selectable, stageResult, STAGES, type StageBg, type StoryState } from './story';

const SFX: Partial<Record<GameEvent, Sfx>> = {
  hit: 'punch',
  bighit: 'bighit',
  block: 'block',
  swing: 'swing',
  jump: 'jump',
  special: 'special',
  ko: 'ko',
  fight: 'fight',
  win: 'win',
  lose: 'lose',
  timeup: 'ko',
  throw: 'swing',
  slam: 'bighit',
  rage: 'special',
};

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

interface Saved {
  unlocked: boolean;
  /** 캐릭터별 스토리 최고 기록 (총 시간, 초) */
  clears: Record<string, number>;
  quick: Record<string, { win: number; lose: number }>;
}

const SAVE_KEY = 'stick-v2';

type Screen =
  | { kind: 'menu' }
  | { kind: 'select'; purpose: 'story' | 'quick' | 'versus'; p1?: string }
  | { kind: 'stage'; story: StoryState }
  | { kind: 'fight'; options: FightOptions; bg: StageBg; ai?: Level; story?: StoryState; song: 'fight' | 'boss' }
  | { kind: 'gameover'; story: StoryState }
  | { kind: 'ending'; story: StoryState; newUnlock: boolean };

export function StickGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useState<Saved>(() => load<Saved>(SAVE_KEY, { unlocked: false, clears: {}, quick: {} }));
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [level, setLevel] = useState<Level>('normal');

  const update = (fn: (s: Saved) => Saved) =>
    setSaved((s) => {
      const next = fn(s);
      save(SAVE_KEY, next);
      return next;
    });

  useEffect(() => {
    sound.play(screen.kind === 'fight' ? screen.song : 'fight');
  }, [screen]);

  const toMenu = () => setScreen({ kind: 'menu' });

  const startStage = (story: StoryState) => {
    const st = STAGES[story.stage];
    const hero = HEROES.find((h) => h.id === story.hero)!;
    setScreen({
      kind: 'fight',
      options: { chars: [hero, st.boss], names: [hero.name, st.boss.name], winsNeeded: 1, roundTime: 99 },
      bg: st.bg,
      ai: st.level,
      story,
      song: st.final ? 'boss' : 'fight',
    });
  };

  let body;
  if (screen.kind === 'menu') {
    body = (
      <div className="menu-card">
        <h2>모드를 고르세요</h2>
        <div className="mode-grid">
          <button className="mode story" onClick={() => (sound.sfx('click'), setScreen({ kind: 'select', purpose: 'story' }))}>
            <b>🏯 스토리 · 보스 5연전</b>
            <small>스테이지마다 다른 보스. 이어하기 {CONTINUES}번</small>
          </button>
          <button className="mode normal" onClick={() => (sound.sfx('click'), setScreen({ kind: 'select', purpose: 'quick' }))}>
            <b>🤖 컴퓨터와 한 판</b>
            <small>상대는 무작위, 3판 2선승</small>
          </button>
          <button className="mode versus" onClick={() => (sound.sfx('click'), setScreen({ kind: 'select', purpose: 'versus' }))}>
            <b>👥 2인 대전</b>
            <small>한 키보드로 친구와</small>
          </button>
        </div>
        {!saved.unlocked && <p className="muted">🔒 스토리를 끝까지 깨면 숨겨진 캐릭터가 나타납니다…</p>}
        <Controls />
      </div>
    );
  } else if (screen.kind === 'select') {
    const purpose = screen.purpose;
    const p1 = screen.p1;
    body = (
      <CharSelect
        title={purpose === 'versus' ? (p1 ? '2P 캐릭터를 고르세요' : '1P 캐릭터를 고르세요') : '캐릭터를 고르세요'}
        unlocked={saved.unlocked}
        clears={saved.clears}
        extra={
          purpose === 'quick' && (
            <div className="row">
              <span className="muted">컴퓨터 실력</span>
              {(['easy', 'normal', 'hard'] as Level[]).map((lv) => (
                <button key={lv} className={`chip ${level === lv ? 'on' : ''}`} onClick={() => setLevel(lv)}>
                  {LEVELS[lv].name}
                </button>
              ))}
            </div>
          )
        }
        onPick={(c) => {
          sound.sfx('click');
          if (purpose === 'story') {
            setScreen({ kind: 'stage', story: newStory(c.id) });
          } else if (purpose === 'quick') {
            const pool = selectable(saved.unlocked).filter((h) => h.id !== c.id);
            const op = pool[Math.floor(random() * pool.length)];
            const bgs: StageBg[] = ['alley', 'bamboo', 'site', 'roof'];
            setScreen({
              kind: 'fight',
              options: { chars: [c, op], names: [c.name, `${op.name} (컴퓨터)`], winsNeeded: 2, roundTime: 60 },
              bg: bgs[Math.floor(random() * bgs.length)],
              ai: level,
              song: 'fight',
            });
          } else if (!p1) {
            setScreen({ kind: 'select', purpose: 'versus', p1: c.id });
          } else {
            const a = HEROES.find((h) => h.id === p1)!;
            setScreen({ kind: 'fight', options: { chars: [a, c], names: [`1P ${a.name}`, `2P ${c.name}`], winsNeeded: 2, roundTime: 60 }, bg: 'alley', song: 'fight' });
          }
        }}
      />
    );
  } else if (screen.kind === 'stage') {
    body = <StageIntro story={screen.story} onStart={() => startStage(screen.story)} />;
  } else if (screen.kind === 'fight') {
    const sc = screen;
    body = (
      <Fight
        key={JSON.stringify([sc.options.names, sc.story?.stage, sc.story?.continues])}
        options={sc.options}
        bg={sc.bg}
        ai={sc.ai}
        story={!!sc.story}
        onMenu={toMenu}
        onEnd={(won, seconds) => {
          if (sc.story) {
            const story = structuredClone(sc.story);
            const r = stageResult(story, won, seconds);
            if (r === 'next' || r === 'retry') setScreen({ kind: 'stage', story });
            else if (r === 'gameover') setScreen({ kind: 'gameover', story });
            else {
              const total = story.times.reduce((a, b) => a + b, 0);
              const newUnlock = !saved.unlocked;
              update((s) => ({ ...s, unlocked: true, clears: { ...s.clears, [story.hero]: Math.min(s.clears[story.hero] ?? Infinity, total) } }));
              setScreen({ kind: 'ending', story, newUnlock });
            }
            return;
          }
          if (sc.ai) {
            const id = sc.options.chars![0].id;
            update((s) => {
              const q = s.quick[id] ?? { win: 0, lose: 0 };
              return { ...s, quick: { ...s.quick, [id]: { win: q.win + (won ? 1 : 0), lose: q.lose + (won ? 0 : 1) } } };
            });
          }
        }}
      />
    );
  } else if (screen.kind === 'gameover') {
    const st = STAGES[screen.story.stage];
    body = (
      <div className="menu-card center">
        <h2>게임 오버</h2>
        <p>
          {st.no}스테이지 {st.boss.name}에게 졌습니다. 이어하기를 모두 썼어요.
        </p>
        <div className="row">
          <button className="primary" onClick={() => setScreen({ kind: 'stage', story: newStory(screen.story.hero) })}>
            처음부터 다시
          </button>
          <button onClick={() => setScreen({ kind: 'select', purpose: 'story' })}>캐릭터 바꾸기</button>
          <button onClick={toMenu}>메뉴로</button>
        </div>
      </div>
    );
  } else {
    const hero = HEROES.find((h) => h.id === screen.story.hero)!;
    const total = screen.story.times.reduce((a, b) => a + b, 0);
    body = (
      <div className="menu-card center ending">
        <Portrait char={hero} size={160} win />
        <h2>🎉 대마왕을 쓰러뜨렸다!</h2>
        <p>
          {hero.name}의 {hero.weaponName}이(가) 마을에 평화를 되찾았습니다. 총 {Math.floor(total / 60)}분 {total % 60}초 · 이어하기 {CONTINUES - screen.story.continues}번 사용
        </p>
        {screen.newUnlock && (
          <div className="unlock pop">
            <Portrait char={HEROES.find((h) => h.hidden)!} size={110} win />
            <div>
              <b>숨겨진 캐릭터 등장!</b>
              <p>⚔️ 검성 하랑을 이제 고를 수 있습니다.</p>
            </div>
          </div>
        )}
        <div className="row">
          <button className="primary" onClick={() => setScreen({ kind: 'select', purpose: 'story' })}>
            다른 캐릭터로 도전
          </button>
          <button onClick={toMenu}>메뉴로</button>
        </div>
      </div>
    );
  }

  return (
    <Shell title="🥋 막대 결투" onBack={screen.kind === 'menu' ? onBack : toMenu}>
      {body}
    </Shell>
  );
}

function Controls() {
  return (
    <ul className="controls">
      <li>
        <b>1P</b> <kbd>A</kbd>
        <kbd>D</kbd> 이동 · <kbd>W</kbd> 점프 · <kbd>S</kbd> 막기 · <kbd>J</kbd> 공격 · <kbd>K</kbd> 발차기(표창) · <kbd>L</kbd> 필살기
      </li>
      <li>
        <b>2P</b> <kbd>←</kbd>
        <kbd>→</kbd> 이동 · <kbd>↑</kbd> 점프 · <kbd>↓</kbd> 막기 · <kbd>1</kbd> 공격 · <kbd>2</kbd> 발차기 · <kbd>3</kbd> 필살기
      </li>
      <li>공격을 빠르게 세 번 누르면 3단 콤보. 때리거나 맞으면 파란 게이지가 차고, 가득 차면 캐릭터마다 다른 필살기를 쓸 수 있어요.</li>
      <li>컴퓨터와 할 때는 방향키로도 움직일 수 있습니다. 휴대폰은 화면 아래 버튼으로.</li>
    </ul>
  );
}

/** 캐릭터 초상: 실제 게임 그림 그대로 캔버스에 그린다 */
function Portrait({ char, size = 120, locked, win }: { char: CharDef; size?: number; locked?: boolean; win?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - start) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 200, 200);
      const k = char.scale;
      ctx.translate(100, 190);
      ctx.scale(1 / Math.max(1, k * 0.95), 1 / Math.max(1, k * 0.95));
      ctx.translate(-100, -FLOOR);
      const f: Fighter = {
        id: 0, char, name: '', x: 100, y: FLOOR, vx: 0, vy: 0, facing: 1, hp: 1, maxHp: 1, meter: 0, action: win ? 'win' : 'idle', t, stun: 0, hitDone: false, nextTick: 0, comboWindow: 0, comboStep: 0, wins: 0, enraged: false, currentSpecial: char.special,
      };
      if (locked) {
        ctx.filter = 'brightness(0)';
        drawFighter(ctx, { ...f, char: { ...char, color: '#000', band: '#000' } }, t);
        ctx.filter = 'none';
      } else drawFighter(ctx, f, t);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [char, locked, win]);
  return <canvas ref={ref} width={200} height={200} style={{ width: size, height: size }} className="portrait" />;
}

function Bars({ c }: { c: CharDef }) {
  const rows: [string, number][] = [
    ['힘', c.bars.power],
    ['속도', c.bars.speed],
    ['리치', c.bars.reach],
    ['체력', c.bars.hp],
  ];
  return (
    <div className="bars">
      {rows.map(([l, v]) => (
        <div key={l}>
          <span>{l}</span>
          <span className="pips">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={i < v ? 'on' : ''} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function CharSelect({ title, unlocked, clears, onPick, extra }: { title: string; unlocked: boolean; clears: Record<string, number>; onPick: (c: CharDef) => void; extra?: ReactNode }) {
  return (
    <div className="menu-card">
      <h2>{title}</h2>
      {extra}
      <div className="char-grid">
        {HEROES.map((c) => {
          const locked = !!c.hidden && !unlocked;
          return (
            <button key={c.id} className={`char-card ${locked ? 'locked' : ''} ${c.hidden ? 'hidden-char' : ''}`} disabled={locked} onClick={() => onPick(c)} style={{ ['--band' as string]: c.band }}>
              <Portrait char={c} size={120} locked={locked} />
              {locked ? (
                <>
                  <b>???</b>
                  <small className="muted">스토리를 끝까지 깨면 나타납니다</small>
                </>
              ) : (
                <>
                  <b>
                    {c.icon} {c.name} <small className="muted">{c.title}</small>
                  </b>
                  <small>
                    무기 <b>{c.weaponName}</b> · 필살기 <b>{c.specialName}</b>
                    {c.kick === 'throw' ? ' · 표창 던지기' : ''}
                  </small>
                  <Bars c={c} />
                  <small className="muted">{c.desc}</small>
                  {clears[c.id] !== undefined && <small className="clear-badge">🏆 스토리 클리어</small>}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageIntro({ story, onStart }: { story: StoryState; onStart: () => void }) {
  const st = STAGES[story.stage];
  const bgRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const t = setTimeout(onStart, 4500);
    const ctx = bgRef.current?.getContext('2d');
    if (ctx) drawStage(ctx, st.bg, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') && onStart();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  return (
    <div className="stage-wrap intro-wrap" onClick={onStart}>
      <canvas ref={bgRef} width={W} height={H} className="stage dim" />
      <div className="stage-intro">
        <div className="stage-no pop">{st.final ? 'FINAL STAGE' : `STAGE ${st.no}`}</div>
        <div className="stage-place">{st.place}</div>
        <Portrait char={st.boss} size={170} />
        <b className="boss-name">
          {st.boss.icon} {st.boss.name}
        </b>
        <p className="boss-line">“{st.line}”</p>
        <small>
          이어하기 {'❤️'.repeat(story.continues)}
          {'🖤'.repeat(CONTINUES - story.continues)} · 아무 키나 누르면 시작
        </small>
      </div>
    </div>
  );
}

function Fight({ options, bg, ai: aiLevel, story, onEnd, onMenu }: { options: FightOptions; bg: StageBg; ai?: Level; story: boolean; onEnd: (won: boolean, seconds: number) => void; onMenu: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState(() => new StickFight(options));
  const ai = useRef(aiLevel ? new StickAI(1, aiLevel, seeded(Math.floor(random() * 1e6))) : null);
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
  const merge = (a: Input, b: Input): Input => Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Input] || b[k as keyof Input]])) as unknown as Input;

  useLoop((dt) => {
    const g = gameRef.current;
    time.current += dt;
    if (!pausedRef.current) {
      let p1 = merge(read(P1), touch.current);
      let p2: Input;
      if (ai.current) {
        p1 = merge(p1, read(P2));
        p2 = ai.current.input(g, dt);
      } else p2 = read(P2);
      g.step(dt, [p1, p2]);
      for (const e of g.drainEvents()) {
        const s = SFX[e];
        if (s) sound.sfx(s);
      }
    }
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderStick(ctx, g, time.current, bg);
    if (g.over && !reported.current) {
      reported.current = true;
      const won = g.winner === 0;
      // 스토리는 결과 화면 없이 바로 다음 장면으로
      if (story) setTimeout(() => onEndRef.current(won, time.current), 2200);
      else {
        onEndRef.current(won, time.current);
        setTimeout(() => setOver(true), 1500);
      }
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

  const me = game.fighters[0].char;
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
            <button onClick={onMenu}>메뉴로 (그만하기)</button>
          </div>
        )}
        {over && (
          <div className="overlay">
            <h2>{game.winner === 0 ? (ai.current ? '승리! 🎉' : '1P 승리!') : ai.current ? '패배…' : '2P 승리!'}</h2>
            <button
              className="primary"
              onClick={() => {
                reported.current = false;
                setOver(false);
                time.current = 0;
                setGame(new StickFight(options));
              }}
            >
              한 판 더
            </button>
            <button onClick={onMenu}>메뉴로</button>
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
          <button {...hold('kick')}>{me.kick === 'throw' ? '✴️' : '🦵'}</button>
          <button className="special" {...hold('special')}>
            {me.icon}
          </button>
        </div>
      </div>
    </>
  );
}

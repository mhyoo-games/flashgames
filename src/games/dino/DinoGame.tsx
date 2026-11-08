import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { sound, type Sfx } from '../../core/audio';
import { random, seeded } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { DinoAI, LEVELS, type Level } from './ai';
import { COMMANDS, ROSTER, type CharDef, type Slot, type StageId } from './chars';
import { DinoFight, H, NO_INPUT, W, type FightOptions, type GameEvent, type Input } from './engine';
import { CommandReader, NO_RAW, type Command, type RawInput } from './input';
import { drawPortrait, drawStage, renderFight } from './render';
import { BOSS_LINES, newStory, selectable, stageResult, type StoryState } from './story';

const SFX: Partial<Record<GameEvent, Sfx>> = {
  hit: 'punch',
  bighit: 'bighit',
  block: 'block',
  swing: 'swing',
  jump: 'jump',
  special: 'special',
  super: 'special',
  transform: 'power',
  charge: 'charge',
  full: 'full',
  burst: 'burst',
  revert: 'click',
  counter: 'catch',
  ko: 'ko',
  fight: 'fight',
  win: 'win',
  lose: 'lose',
  timeup: 'ko',
};

type Key = keyof RawInput;
const P1: Record<string, Key> = { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyU: 'lp', KeyI: 'hp', KeyJ: 'lk', KeyK: 'hk', KeyL: 'charge', KeyO: 'charge' };
const P2: Record<string, Key> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Numpad4: 'lp',
  Numpad5: 'hp',
  Numpad1: 'lk',
  Numpad2: 'hk',
  Numpad3: 'charge',
  Numpad6: 'charge',
  Digit7: 'lp',
  Digit8: 'hp',
  Digit9: 'lk',
  Digit0: 'hk',
  Minus: 'charge',
};
/** 컴퓨터와 할 때 방향키 + 숫자 1~5로도 1P 조작 */
const ALT1: Record<string, Key> = { ...P2, Digit1: 'lp', Digit2: 'hp', Digit3: 'lk', Digit4: 'hk', Digit5: 'charge' };

interface Saved {
  unlocked: boolean;
  clears: Record<string, number>;
}
const SAVE_KEY = 'dino-v1';
const QUICK_STAGES: StageId[] = ['jungle', 'plains', 'canyon', 'beach', 'volcano', 'snow', 'city'];

type Screen =
  | { kind: 'menu' }
  | { kind: 'select'; purpose: 'story' | 'quick' | 'versus'; p1?: string }
  | { kind: 'vs'; story: StoryState }
  | { kind: 'fight'; options: FightOptions; stage: StageId; ai?: Level; story?: StoryState; song: 'fight' | 'boss'; versus?: boolean }
  | { kind: 'ending'; story: StoryState; newUnlock: boolean };

export function DinoGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useState<Saved>(() => load<Saved>(SAVE_KEY, { unlocked: false, clears: {} }));
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [level, setLevel] = useState<Level>('normal');

  useEffect(() => {
    sound.play(screen.kind === 'fight' ? screen.song : screen.kind === 'vs' && screen.story.stages[screen.story.index].final ? 'boss' : 'fight');
  }, [screen]);

  const toMenu = () => setScreen({ kind: 'menu' });
  const startStory = (story: StoryState) => {
    const st = story.stages[story.index];
    const hero = ROSTER.find((c) => c.id === story.hero)!;
    setScreen({
      kind: 'fight',
      options: { chars: [hero, st.rival], winsNeeded: 2, roundTime: 60, hpScale: [1, st.final ? 1.2 : 1] },
      stage: st.stage,
      ai: st.level,
      story,
      song: st.final ? 'boss' : 'fight',
    });
  };

  let body: ReactNode;
  if (screen.kind === 'menu') {
    body = (
      <div className="menu-card">
        <h2>모드를 고르세요</h2>
        <div className="mode-grid">
          <button className="mode story" onClick={() => (sound.sfx('click'), setScreen({ kind: 'select', purpose: 'story' }))}>
            <b>🦖 스토리</b>
            <small>7마리와 싸운 뒤 마지막 보스와 대결</small>
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
        {!saved.unlocked && <p className="muted">🔒 스토리를 끝까지 깨면 숨겨진 캐릭터를 고를 수 있습니다…</p>}
        <HowTo />
      </div>
    );
  } else if (screen.kind === 'select') {
    const { purpose, p1 } = screen;
    body = (
      <CharSelect
        title={purpose === 'versus' ? (p1 ? '2P 캐릭터' : '1P 캐릭터') : '캐릭터를 고르세요'}
        unlocked={saved.unlocked}
        clears={saved.clears}
        extra={
          purpose === 'quick' && (
            <div className="row">
              <span className="muted">컴퓨터 실력</span>
              {(['easy', 'normal', 'hard', 'master'] as Level[]).map((lv) => (
                <button key={lv} className={`chip ${level === lv ? 'on' : ''}`} onClick={() => setLevel(lv)}>
                  {LEVELS[lv].name}
                </button>
              ))}
            </div>
          )
        }
        onPick={(c) => {
          sound.sfx('click');
          if (purpose === 'story') setScreen({ kind: 'vs', story: newStory(c.id) });
          else if (purpose === 'quick') {
            const pool = selectable(saved.unlocked).filter((x) => x.id !== c.id);
            const op = pool[Math.floor(random() * pool.length)];
            setScreen({ kind: 'fight', options: { chars: [c, op], winsNeeded: 2 }, stage: QUICK_STAGES[Math.floor(random() * QUICK_STAGES.length)], ai: level, song: 'fight' });
          } else if (!p1) setScreen({ kind: 'select', purpose: 'versus', p1: c.id });
          else {
            const a = ROSTER.find((x) => x.id === p1)!;
            setScreen({ kind: 'fight', options: { chars: [a, c], winsNeeded: 2 }, stage: a.stage, song: 'fight', versus: true });
          }
        }}
      />
    );
  } else if (screen.kind === 'vs') {
    body = <VersusIntro story={screen.story} onStart={() => startStory(screen.story)} />;
  } else if (screen.kind === 'fight') {
    const sc = screen;
    body = (
      <Fight
        key={JSON.stringify([sc.options.chars?.map((c) => c.id), sc.story?.index, sc.story?.continues])}
        options={sc.options}
        stage={sc.stage}
        ai={sc.ai}
        story={!!sc.story}
        versus={!!sc.versus}
        onMenu={toMenu}
        onEnd={(won) => {
          if (!sc.story) return;
          const story = structuredClone(sc.story);
          // structuredClone가 캐릭터 객체를 복사해도 id로 다시 찾으므로 괜찮다
          const r = stageResult(story, won);
          if (r === 'clear') {
            const newUnlock = !saved.unlocked;
            const next = { unlocked: true, clears: { ...saved.clears, [story.hero]: (saved.clears[story.hero] ?? 0) + 1 } };
            setSaved(next);
            save(SAVE_KEY, next);
            setScreen({ kind: 'ending', story, newUnlock });
          } else setScreen({ kind: 'vs', story });
        }}
      />
    );
  } else {
    const hero = ROSTER.find((c) => c.id === screen.story.hero)!;
    const boss = ROSTER.find((c) => c.hidden)!;
    body = (
      <div className="menu-card center ending">
        <Portrait char={hero} beast size={170} />
        <h2>🎉 {hero.name}, 공룡 대격돌 우승!</h2>
        <p>
          하늘에서 떨어진 메테오를 물리치고 공룡의 힘을 지켜냈습니다. 이어하기 {screen.story.continues}번
        </p>
        {screen.newUnlock && (
          <div className="unlock pop">
            <Portrait char={boss} size={110} beast />
            <div>
              <b>숨겨진 캐릭터 해금!</b>
              <p>
                {boss.name} ({boss.dinoName})를 이제 고를 수 있습니다.
              </p>
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
    <Shell title="🦖 햄스터 다이노 파이트" onBack={screen.kind === 'menu' ? onBack : toMenu}>
      {body}
    </Shell>
  );
}

function HowTo() {
  return (
    <ul className="controls">
      <li>
        <b>1P</b> <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> 이동 · <kbd>U</kbd> 약펀치 <kbd>I</kbd> 강펀치 · <kbd>J</kbd> 약킥 <kbd>K</kbd> 강킥 · <kbd>L</kbd> 기
      </li>
      <li>
        <b>2P</b> 방향키 · 숫자패드 <kbd>4</kbd> 약펀치 <kbd>5</kbd> 강펀치 <kbd>1</kbd> 약킥 <kbd>2</kbd> 강킥 <kbd>3</kbd> 기 (숫자패드가 없으면 <kbd>7</kbd>
        <kbd>8</kbd>
        <kbd>9</kbd>
        <kbd>0</kbd>
        <kbd>-</kbd>)
      </li>
      <li>컴퓨터와 할 때는 방향키 + <kbd>1</kbd>~<kbd>5</kbd>(약펀치·강펀치·약킥·강킥·기)로도 할 수 있어요.</li>
      <li>상대 반대쪽을 누르면 막기, 아래+뒤는 앉아 막기 (다리 공격은 앉아서 막아야 해요).</li>
      <li>
        <b>이어 치기</b>: 공격이 맞으면 다음 공격으로 끊어 이어져요. <b>{COMMANDS.chain}</b>
      </li>
      <li>
        기술 커맨드 (방향키를 하나씩 차례로, 바라보는 쪽 기준): <b>{COMMANDS.move1}</b> · <b>{COMMANDS.move2}</b> · <b>{COMMANDS.move3}</b>
      </li>
      <li>
        <b>기 모으기</b>: 기 버튼을 누르고 있으면 게이지가 차요 (그동안은 무방비). 때리면 맞을 때보다 더 많이 차요. 가득 차면 기 버튼을 한 번 더 눌러 공룡 변신! 변신 중에는 더 세지고 <b>{COMMANDS.super}</b> 초필살기를 쓸 수 있어요.
      </li>
    </ul>
  );
}

export function Portrait({ char, size = 120, locked, beast }: { char: CharDef; size?: number; locked?: boolean; beast?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (ctx) drawPortrait(ctx, char, !!beast, (now - start) / 1000, locked);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [char, locked, beast]);
  return <canvas ref={ref} width={240} height={240} style={{ width: size, height: size }} className="portrait" />;
}

function Bars({ c }: { c: CharDef }) {
  const rows: [string, number][] = [
    ['힘', c.bars.power],
    ['속도', c.bars.speed],
    ['리치', c.bars.reach],
    ['방어', c.bars.defense],
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

export function MoveList({ c }: { c: CharDef }) {
  return (
    <table className="movelist">
      <tbody>
        {(['move1', 'move2', 'move3', 'super'] as Slot[]).map((s) => (
          <tr key={s} className={s === 'super' ? 'super' : ''}>
            <td>{c.moves[s].name}</td>
            <td>
              <code>{COMMANDS[s]}</code>
            </td>
          </tr>
        ))}
        <tr>
          <td>{c.dinoName} 변신</td>
          <td>
            <code>{COMMANDS.beast}</code>
          </td>
        </tr>
        <tr>
          <td>기 모으기</td>
          <td>
            <code>{COMMANDS.charge}</code>
          </td>
        </tr>
        <tr>
          <td>이어 치기</td>
          <td>
            <code>{COMMANDS.chain}</code>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function CharSelect({ title, unlocked, clears, onPick, extra }: { title: string; unlocked: boolean; clears: Record<string, number>; onPick: (c: CharDef) => void; extra?: ReactNode }) {
  const [hover, setHover] = useState<CharDef>(ROSTER[0]);
  return (
    <div className="menu-card">
      <h2>{title}</h2>
      {extra}
      <div className="select-layout">
        <div className="char-grid dino">
          {ROSTER.map((c) => {
            const locked = !!c.hidden && !unlocked;
            return (
              <button
                key={c.id}
                className={`char-card ${locked ? 'locked' : ''} ${c.hidden ? 'hidden-char' : ''} ${hover.id === c.id ? 'focus' : ''}`}
                disabled={locked}
                onMouseEnter={() => !locked && setHover(c)}
                onFocus={() => !locked && setHover(c)}
                onClick={() => onPick(c)}
                style={{ ['--band' as string]: c.accent }}
              >
                <Portrait char={c} size={96} locked={locked} beast={hover.id === c.id && !locked} />
                <b>{locked ? '???' : c.name}</b>
                <small className="muted">{locked ? '스토리를 깨면 등장' : c.dinoName}</small>
                {clears[c.id] && <small className="clear-badge">🏆</small>}
              </button>
            );
          })}
        </div>
        <aside className="char-detail" style={{ ['--band' as string]: hover.accent }}>
          <div className="detail-head">
            <Portrait char={hover} size={150} beast />
            <div>
              <h3>
                {hover.name} <small className="muted">{hover.title}</small>
              </h3>
              <p>
                변신: <b>{hover.dinoName}</b>
              </p>
              <Bars c={hover} />
            </div>
          </div>
          <p className="small">{hover.desc}</p>
          <MoveList c={hover} />
        </aside>
      </div>
    </div>
  );
}

function VersusIntro({ story, onStart }: { story: StoryState; onStart: () => void }) {
  const st = story.stages[story.index];
  const hero = ROSTER.find((c) => c.id === story.hero)!;
  const rival = ROSTER.find((c) => c.id === st.rival.id)!;
  const bg = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = bg.current?.getContext('2d');
    if (ctx) drawStage(ctx, st.stage, 0);
    const t = setTimeout(onStart, 4500);
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ') onStart();
    };
    window.addEventListener('keydown', key);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);
  return (
    <div className="stage-wrap intro-wrap" onClick={onStart}>
      <canvas ref={bg} width={W} height={H} className="stage dim" />
      <div className="stage-intro vs">
        <div className="stage-no pop">{st.final ? 'FINAL BATTLE' : `STAGE ${st.no} / ${story.stages.length}`}</div>
        <div className="vs-row">
          <div className="vs-side">
            <Portrait char={hero} size={150} />
            <b>{hero.name}</b>
          </div>
          <div className="vs-mark">VS</div>
          <div className="vs-side flip">
            <Portrait char={rival} size={150} beast={st.final} />
            <b>{st.final ? `??? ${rival.name}` : rival.name}</b>
          </div>
        </div>
        {st.final && <p className="boss-line">“{BOSS_LINES[0]}”</p>}
        <small>
          상대 실력 {LEVELS[st.level].name} · 이어하기 {story.continues}번 · 아무 키나 누르면 시작
        </small>
      </div>
    </div>
  );
}

function Fight({ options, stage, ai: aiLevel, story, versus, onEnd, onMenu }: { options: FightOptions; stage: StageId; ai?: Level; story: boolean; versus: boolean; onEnd: (won: boolean) => void; onMenu: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState(() => new DinoFight(options));
  const ai = useRef(aiLevel ? new DinoAI(1, aiLevel, seeded(Math.floor(random() * 1e6))) : null);
  const readers = useRef([new CommandReader(), new CommandReader()]);
  const keys = useRef(new Set<string>());
  /** 아주 짧게 눌렀다 뗀 키도 한 프레임은 눌린 것으로 */
  const tapped = useRef(new Set<string>());
  const touch = useRef<RawInput & { cmd?: Command }>({ ...NO_RAW });
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
      tapped.current.add(e.code);
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

  const read = (...maps: Record<string, Key>[]) => {
    const r: RawInput = { ...NO_RAW };
    for (const map of maps) for (const [code, k] of Object.entries(map)) if (keys.current.has(code) || tapped.current.has(code)) r[k] = true;
    return r;
  };

  /** 키 입력 → 커맨드 해석 → 엔진 입력 */
  const human = (id: 0 | 1, r: RawInput, dt: number, extra?: Command): Input => {
    const g = gameRef.current;
    let cmd = readers.current[id].feed(r, g.fighters[id].facing, dt);
    if (extra) cmd = extra;
    return { ...r, cmd };
  };

  useLoop((dt) => {
    const g = gameRef.current;
    time.current += dt;
    if (!pausedRef.current) {
      const t = touch.current;
      const tcmd = t.cmd;
      t.cmd = undefined;
      const k1 = versus ? read(P1) : read(P1, ALT1);
      const r1: RawInput = { ...k1 };
      for (const k of Object.keys(NO_RAW) as Key[]) r1[k] = k1[k] || t[k];
      const p2 = versus ? human(1, read(P2), dt) : ai.current ? ai.current.input(g, dt) : NO_INPUT;
      const p1 = human(0, r1, dt, tcmd);
      tapped.current.clear();
      g.step(dt, [p1, p2]);
      for (const e of g.drainEvents()) {
        const s = SFX[e];
        if (s) sound.sfx(s);
      }
    }
    const ctx = canvas.current?.getContext('2d');
    if (ctx) renderFight(ctx, g, time.current, stage);
    if (g.over && !reported.current) {
      reported.current = true;
      const won = g.winner === 0;
      if (story) setTimeout(() => onEndRef.current(won), 2400);
      else setTimeout(() => setOver(true), 1500);
    }
  });

  const hold = (k: keyof RawInput) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      touch.current[k] = true;
    },
    onPointerUp: () => (touch.current[k] = false),
    onPointerLeave: () => (touch.current[k] = false),
    onPointerCancel: () => (touch.current[k] = false),
  });
  const tapCmd = (c: Command) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      touch.current.cmd = c;
    },
  });
  const me = game.fighters[0];

  return (
    <>
      <div className="stage-wrap">
        <canvas ref={canvas} width={W} height={H} className="stage" />
        {paused && !over && (
          <div className="overlay pause-menu">
            <h2>일시정지</h2>
            <MoveList c={me.char} />
            <div className="row">
              <button className="primary" onClick={() => setPaused(false)}>
                계속하기
              </button>
              <button onClick={onMenu}>메뉴로 (그만하기)</button>
            </div>
          </div>
        )}
        {over && (
          <div className="overlay">
            <h2>{game.winner === 0 ? (versus ? '1P 승리!' : '승리! 🎉') : versus ? '2P 승리!' : '패배…'}</h2>
            <button
              className="primary"
              onClick={() => {
                reported.current = false;
                setOver(false);
                setGame(new DinoFight(options));
              }}
            >
              한 판 더
            </button>
            <button onClick={onMenu}>메뉴로</button>
          </div>
        )}
        <button className="pause-btn" onClick={() => setPaused(true)} aria-label="일시정지 · 기술표">
          ⏸ 기술표
        </button>
      </div>
      <div className="touchpad">
        <div className="pad-left">
          <button className="l" {...hold('left')}>◀</button>
          <button className="u" {...hold('up')}>▲</button>
          <button className="d" {...hold('down')}>▼</button>
          <button className="r" {...hold('right')}>▶</button>
        </div>
        <div className="pad-right wide">
          <button className="atk" {...hold('lp')}>약펀치</button>
          <button className="atk strong" {...hold('hp')}>강펀치</button>
          <button className="mini" {...tapCmd('move1')}>
            기술1
          </button>
          <button className="atk" {...hold('lk')}>약킥</button>
          <button className="atk strong" {...hold('hk')}>강킥</button>
          <button className="mini" {...tapCmd('move2')}>
            기술2
          </button>
          <button className="mini" {...tapCmd('move3')}>
            기술3
          </button>
          {me.beast ? (
            <button className="special" {...tapCmd('super')}>
              필살
            </button>
          ) : (
            <button className="special" {...hold('charge')}>
              기
            </button>
          )}
        </div>
      </div>
    </>
  );
}

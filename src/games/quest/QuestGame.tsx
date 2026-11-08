import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { sound, type Sfx } from '../../core/audio';
import { random, seeded } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { Battle, BH, BW, type Action, type BEvent, type Unit } from './battle';
import { BELL_EVENT, CHAPTERS, expFor, HEROES, ITEMS, MAPS, OPENING, PROLOGUE, SKILLS, SUBTITLE, TITLE, type Step } from './data';
import { BOX, BOY, BT, dialogBox, H, mapBanner, personSprite, renderBattle, renderWorld, text, W, type BattleView, type View } from './render';
import { blit } from './pixel';
import { applyStep, gainExp, healAll, interact, newWorld, stats, step, useItem, wipeOut, type Dir, type WorldState } from './world';

const SAVE = 'quest-v1';
interface Saved {
  w: WorldState;
}

const KEYS: Record<string, string> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyZ: 'ok',
  Enter: 'ok',
  Space: 'ok',
  KeyX: 'cancel',
  Escape: 'cancel',
  Backspace: 'cancel',
};

export function QuestGame({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<'title' | 'play'>('title');
  const [world, setWorld] = useState<WorldState | null>(null);
  const saved = load<Saved | null>(SAVE, null);
  return (
    <Shell title={`🍙 ${TITLE}`} onBack={onBack}>
      {screen === 'title' || !world ? (
        <Title
          hasSave={!!saved}
          onNew={() => {
            setWorld(newWorld());
            setScreen('play');
          }}
          onLoad={() => {
            setWorld(saved!.w);
            setScreen('play');
          }}
        />
      ) : (
        <Play initial={world} fresh={!world.flags.started} onTitle={() => setScreen('title')} />
      )}
    </Shell>
  );
}

function Title({ hasSave, onNew, onLoad }: { hasSave: boolean; onNew: () => void; onLoad: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - t0) / 1000;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a1a4a');
      g.addColorStop(1, '#e88a5a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 별과 여덟 개의 종
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t + i))})`;
        ctx.fillRect((i * 151) % W, (i * 67) % 220, 3, 3);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.3;
        const x = W / 2 + Math.cos(a) * 300;
        const y = 150 + Math.sin(a) * 60;
        ctx.fillStyle = i === 0 ? '#ffd24a' : 'rgba(255,210,74,0.35)';
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 10);
        ctx.quadraticCurveTo(x - 10, y - 12, x, y - 12);
        ctx.quadraticCurveTo(x + 10, y - 12, x + 10, y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#3a6a3a';
      ctx.fillRect(0, H - 110, W, 110);
      text(ctx, TITLE, W / 2, 110, 64, '#ffffff', 'center');
      text(ctx, SUBTITLE, W / 2, 190, 30, '#ffd24a', 'center');
      const f = Math.floor(t * 3) % 2;
      blit(ctx, personSprite('haru', 'down', f).cv, W / 2 - 60, H - 70, 6);
      blit(ctx, personSprite('mir', 'down', 1 - f).cv, W / 2 + 60, H - 70, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="quest-title">
      <canvas ref={ref} width={W} height={H} className="stage pixel" />
      <div className="row">
        <button className="primary" onClick={onNew}>
          처음부터
        </button>
        <button disabled={!hasSave} onClick={onLoad}>
          이어하기
        </button>
      </div>
      <ol className="chapters">
        {CHAPTERS.map((c) => (
          <li key={c.no} className={c.ready ? '' : 'soon'}>
            <b>제{c.no}장 {c.title}</b> {c.ready ? '' : '(준비 중)'}
            <span>{c.summary}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------
type Overlay =
  | { kind: 'menu' }
  | { kind: 'status' }
  | { kind: 'items' }
  | { kind: 'shop'; items: string[] }
  | { kind: 'inn'; price: number }
  | { kind: 'end' }
  | { kind: 'battle'; sub: 'main' | 'skill' | 'item' }
  | null;

interface BattleRun {
  b: Battle;
  view: BattleView;
  phase: 'intro' | 'move' | 'menu' | 'target' | 'anim' | 'result';
  timer: number;
  action?: Action;
  targets: Unit[];
  ti: number;
  pending: { ev: BEvent; at: number }[];
  lines: string[];
  boss: boolean;
}

const SFX: Partial<Record<BEvent['t'], Sfx>> = { hit: 'punch', heal: 'bonus', miss: 'swing', die: 'death' };

function Play({ initial, fresh, onTitle }: { initial: WorldState; fresh: boolean; onTitle: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const w = useRef(initial).current;
  const rng = useRef(seeded(Math.floor(random() * 1e9))).current;
  const view = useRef<View>({ px: w.x, py: w.y, dir: w.dir, trail: [] });
  const walk = useRef<{ fx: number; fy: number; t: number; after?: () => void } | null>(null);
  const queue = useRef<Step[]>(fresh ? [...PROLOGUE.map((say) => ({ who: '', say })), ...OPENING, { set: 'started' }] : []);
  const dialog = useRef<{ who: string; say: string; shown: number } | null>(null);
  const battle = useRef<BattleRun | null>(null);
  const held = useRef(new Set<string>());
  const edge = useRef(new Set<string>());
  const time = useRef(0);
  const banner = useRef({ name: MAPS[w.map].name, t: 0 });
  const trans = useRef(0);
  const [overlay, setOverlayState] = useState<Overlay>(null);
  const overlayRef = useRef<Overlay>(null);
  const [note, setNote] = useState('');
  const [, force] = useState(0);
  const setOverlay = (o: Overlay) => {
    overlayRef.current = o;
    setOverlayState(o);
  };

  useEffect(() => {
    sound.play(MAPS[w.map].song);
    const down = (e: KeyboardEvent) => {
      const k = KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      if (!held.current.has(k)) edge.current.add(k);
      held.current.add(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYS[e.code];
      if (k) held.current.delete(k);
    };
    const blur = () => held.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const doSave = () => save(SAVE, { w } satisfies Saved);
  const say = (who: string, s: string) => queue.current.unshift({ who, say: s });

  // ------------- 사건 진행 -------------
  const runQueue = () => {
    while (queue.current.length && !dialog.current && !battle.current && !overlayRef.current) {
      const s = queue.current.shift()!;
      if ('say' in s) {
        dialog.current = { who: s.who ?? '', say: s.say, shown: 0 };
        sound.sfx('click');
      } else if ('battle' in s) startBattle(s.battle, !!s.boss, !!s.noFlee);
      else if ('shop' in s) setOverlay({ kind: 'shop', items: s.shop });
      else if ('inn' in s) setOverlay({ kind: 'inn', price: s.inn });
      else if ('save' in s) doSave();
      else if ('song' in s) sound.play(s.song);
      else if ('clear' in s) {
        doSave();
        sound.sfx('clear');
        setOverlay({ kind: 'end' });
      } else {
        applyStep(w, s);
        if ('join' in s) sound.sfx('bonus');
      }
    }
  };

  // ------------- 전투 -------------
  const startBattle = (foes: string[], boss: boolean, noFlee: boolean) => {
    const b = new Battle(w, foes, rng, { boss, noFlee });
    const pos = new Map(b.units.map((u) => [u.uid, { x: u.x, y: u.y }]));
    battle.current = { b, view: { pos, lunge: new Map(), flash: new Map(), fx: [], highlight: [], hlColor: '', message: `${b.alive('foe')[0].name}${foes.length > 1 ? ' 무리' : ''}이(가) 나타났다!` }, phase: 'intro', timer: 0, targets: [], ti: 0, pending: [], lines: [], boss };
    trans.current = 0.5;
    sound.play(boss ? 'boss' : 'battle');
    sound.sfx('start');
  };

  const beginTurn = () => {
    const r = battle.current!;
    const b = r.b;
    if (b.outcome) return finishBattle();
    const u = b.current;
    r.view.highlight = [];
    r.view.cursor = undefined;
    if (u.side === 'foe') {
      r.phase = 'anim';
      const { events } = b.aiTurn();
      r.view.message = `${u.name}의 차례.`;
      queueEvents(events, 0.35);
    } else {
      r.phase = 'move';
      r.view.highlight = b.reachable(u);
      r.view.hlColor = 'rgba(90,170,255,0.38)';
      r.view.cursor = [u.x, u.y];
      r.view.message = `${u.name}: 어디로 갈까? (그 자리면 한 번 더 누르기)`;
    }
    force((x) => x + 1);
  };

  const queueEvents = (events: BEvent[], start: number) => {
    const r = battle.current!;
    r.pending = events.map((ev, i) => ({ ev, at: start + i * 0.5 }));
    r.timer = 0;
    r.phase = 'anim';
    if (!events.length) r.pending = [{ ev: { t: 'msg', text: r.view.message }, at: start }];
  };

  const playEvent = (ev: BEvent) => {
    const r = battle.current!;
    const b = r.b;
    const v = r.view;
    const name = (uid: number) => b.unit(uid).name;
    switch (ev.t) {
      case 'act': {
        const u = b.unit(ev.uid);
        v.lunge.set(ev.uid, { dx: Math.sign(ev.tx - u.x) * (ev.tx !== u.x ? 1 : 0), dy: Math.sign(ev.ty - u.y), t: 0 });
        v.message = ev.name ? `${u.name}의 ${ev.name}!` : `${u.name}의 공격!`;
        sound.sfx(ev.name ? 'special' : 'swing');
        break;
      }
      case 'hit':
        v.flash.set(ev.uid, 0.45);
        v.fx.push({ uid: ev.uid, text: String(ev.dmg), color: ev.crit ? '#ffd24a' : '#ffffff', t: 0 });
        v.message = `${name(ev.uid)}에게 ${ev.dmg}의 피해!`;
        if (ev.crit) sound.sfx('bighit');
        break;
      case 'heal':
        v.fx.push({ uid: ev.uid, text: `+${ev.n}`, color: ev.mp ? '#9ad0ff' : '#7aff8a', t: 0 });
        v.message = `${name(ev.uid)}의 ${ev.mp ? 'MP' : 'HP'}가 ${ev.n} 회복되었다!`;
        break;
      case 'miss':
        v.fx.push({ uid: ev.uid, text: 'MISS', color: '#cccccc', t: 0 });
        v.message = '미스! 공격이 빗나갔다.';
        break;
      case 'die': {
        const u = b.unit(ev.uid);
        v.flash.set(ev.uid, 0.8);
        v.message = u.side === 'foe' ? `${u.name}을(를) 물리쳤다!` : `${u.name}이(가) 쓰러졌다…`;
        break;
      }
      case 'msg':
        v.message = ev.text;
        break;
    }
    const s = SFX[ev.t];
    if (s) sound.sfx(s);
  };

  const finishBattle = () => {
    const r = battle.current!;
    const b = r.b;
    r.phase = 'result';
    r.view.highlight = [];
    r.view.cursor = undefined;
    const lines: string[] = [];
    if (b.outcome === 'win') {
      const rw = b.reward();
      lines.push('적을 모두 물리쳤다!', `경험치 ${rw.exp}, ${rw.gold}G를 얻었다.`);
      b.writeBack(w);
      w.gold += rw.gold;
      for (const m of w.party) {
        const before = stats(m);
        const ups = gainExp(m, rw.exp);
        if (ups.length) {
          const after = stats(m);
          lines.push(`${HEROES[m.id].name}은(는) 레벨 ${m.lv}(으)로 올랐다! (공격 +${after.atk - before.atk} HP +${after.hp - before.hp})`);
          const newSkill = HEROES[m.id].skills.find(([lv]) => ups.includes(lv));
          if (newSkill) lines.push(`${HEROES[m.id].name}은(는) 「${SKILLS[newSkill[1]].name}」을(를) 익혔다!`);
        }
      }
      for (const d of rw.drops) {
        w.items[d] = (w.items[d] ?? 0) + 1;
        lines.push(`${ITEMS[d].name}을(를) 주웠다.`);
      }
      sound.sfx('win');
    } else if (b.outcome === 'fled') {
      b.writeBack(w);
      lines.push('무사히 도망쳤다!');
    } else {
      lines.push('하루 일행은 전멸했다……', '눈앞이 캄캄해졌다……');
      sound.sfx('lose');
    }
    r.lines = lines;
    r.view.message = lines.shift()!;
    force((x) => x + 1);
  };

  const closeBattle = () => {
    const r = battle.current!;
    const lost = r.b.outcome === 'lose';
    battle.current = null;
    if (lost) {
      wipeOut(w);
      view.current = { px: w.x, py: w.y, dir: w.dir, trail: [] };
      banner.current = { name: MAPS[w.map].name, t: 0 };
      // 진 뒤 이어질 사건은 취소
      queue.current = [{ who: '동동 사부', say: '쿨… 하루야, 바닥에서 자지 말고 일어나거라. 돈은 반을 흘렸더구나.' }];
    }
    sound.play(MAPS[w.map].song);
    trans.current = 0.4;
    force((x) => x + 1);
    runQueue();
  };

  const chooseAction = (a: Action) => {
    const r = battle.current!;
    const u = r.b.current;
    if (a.kind === 'wait' || a.kind === 'flee') {
      setOverlay(null);
      const ev = r.b.act(u, a, undefined, w);
      if (a.kind === 'wait') ev.push({ t: 'msg', text: `${u.name}은(는) 상황을 살핀다.` });
      queueEvents(ev, 0.05);
      return;
    }
    r.action = a;
    r.targets = r.b.targets(u, a);
    r.ti = 0;
    r.phase = 'target';
    r.view.highlight = r.targets.map((t) => [t.x, t.y]);
    r.view.hlColor = a.kind === 'attack' || (a.kind === 'skill' && SKILLS[a.id].kind === 'dmg') ? 'rgba(255,80,80,0.42)' : 'rgba(90,255,140,0.38)';
    r.view.cursor = [r.targets[0].x, r.targets[0].y];
    r.view.message = '누구에게? (방향키로 고르고 확인)';
    setOverlay(null);
  };

  const confirmTarget = (t: Unit) => {
    const r = battle.current!;
    const u = r.b.current;
    r.view.highlight = [];
    r.view.cursor = undefined;
    queueEvents(r.b.act(u, r.action!, t, w), 0.05);
  };

  // ------------- 매 프레임 -------------
  useLoop((dt) => {
    time.current += dt;
    banner.current.t += dt;
    trans.current = Math.max(0, trans.current - dt);
    const e = edge.current;
    const ok = e.has('ok');
    const cancel = e.has('cancel');
    const dirKey = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => e.has(d));
    const heldDir = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => held.current.has(d));
    edge.current = new Set();
    const ctx = canvas.current?.getContext('2d');
    const ov = overlayRef.current;

    // ---- 전투 ----
    const r = battle.current;
    if (r) {
      const b = r.b;
      const v = r.view;
      for (const u of b.units) {
        const p = v.pos.get(u.uid)!;
        p.x += (u.x - p.x) * Math.min(1, dt * 10);
        p.y += (u.y - p.y) * Math.min(1, dt * 10);
      }
      for (const [k, l] of v.lunge) {
        l.t += dt;
        if (l.t > 0.3) v.lunge.delete(k);
      }
      for (const [k, f] of v.flash) v.flash.set(k, f - dt);
      v.fx.forEach((f) => (f.t += dt));
      v.fx = v.fx.filter((f) => f.t < 1.2);
      if (r.phase === 'intro') {
        r.timer += dt;
        if (r.timer > 1.2 || ok) beginTurn();
      } else if (r.phase === 'anim') {
        r.timer += dt;
        while (r.pending.length && r.timer >= r.pending[0].at) playEvent(r.pending.shift()!.ev);
        if (!r.pending.length && r.timer > 0.6) {
          r.timer = -10;
          if (b.outcome) finishBattle();
          else {
            b.endTurn();
            beginTurn();
          }
        }
      } else if (r.phase === 'move' && !ov) {
        const u = b.current;
        const c = v.cursor!;
        if (dirKey) {
          const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dirKey];
          v.cursor = [Math.max(0, Math.min(BW - 1, c[0] + d[0])), Math.max(0, Math.min(BH - 1, c[1] + d[1]))];
          sound.sfx('click');
        }
        if (ok && v.highlight.some(([x, y]) => x === v.cursor![0] && y === v.cursor![1])) {
          b.moveTo(u, v.cursor![0], v.cursor![1]);
          v.highlight = [];
          v.cursor = undefined;
          r.phase = 'menu';
          v.message = `${u.name}: 무엇을 할까?`;
          setOverlay({ kind: 'battle', sub: 'main' });
        }
      } else if (r.phase === 'target') {
        if (dirKey && r.targets.length) {
          r.ti = (r.ti + (dirKey === 'up' || dirKey === 'left' ? r.targets.length - 1 : 1)) % r.targets.length;
          v.cursor = [r.targets[r.ti].x, r.targets[r.ti].y];
          sound.sfx('click');
        }
        if (ok) confirmTarget(r.targets[r.ti]);
        else if (cancel) {
          r.phase = 'menu';
          v.highlight = [];
          v.cursor = undefined;
          setOverlay({ kind: 'battle', sub: 'main' });
        }
      } else if (r.phase === 'result' && (ok || r.timer > 99)) {
        if (r.lines.length) v.message = r.lines.shift()!;
        else closeBattle();
      }
      if (ctx && battle.current) renderBattle(ctx, b, v, MAPS[w.map].terrain, time.current, r.phase === 'result' ? undefined : b.current);
      if (ctx && trans.current > 0) drawTransition(ctx, trans.current);
      return;
    }

    // ---- 필드 ----
    const vw = view.current;
    if (walk.current) {
      const k = walk.current;
      k.t += dt / 0.17;
      const t = Math.min(1, k.t);
      vw.px = k.fx + (w.x - k.fx) * t;
      vw.py = k.fy + (w.y - k.fy) * t;
      if (t >= 1) {
        walk.current = null;
        k.after?.();
      }
    } else if (dialog.current) {
      const d = dialog.current;
      d.shown += dt * 45;
      if (ok) {
        if (d.shown < d.say.length) d.shown = d.say.length;
        else {
          dialog.current = null;
          runQueue();
        }
      }
    } else if (queue.current.length && !ov) runQueue();
    else if (!ov) {
      if (cancel) {
        setOverlay({ kind: 'menu' });
        sound.sfx('click');
      } else if (ok) {
        const res = interact(w);
        vw.dir = w.dir;
        if (res === 'BELL') queue.current.push(...BELL_EVENT);
        else if (res) queue.current.push(...res);
        runQueue();
      } else if (heldDir) {
        const fx = w.x;
        const fy = w.y;
        const prevMap = w.map;
        const res = step(w, heldDir, rng);
        vw.dir = w.dir;
        if (res.kind === 'moved') {
          if (w.map !== prevMap) {
            vw.px = w.x;
            vw.py = w.y;
            vw.trail = [];
            banner.current = { name: MAPS[w.map].name, t: 0 };
            trans.current = 0.35;
            if (!battle.current) sound.play(w.flags.bell && w.map === 'cave' ? 'field' : MAPS[w.map].song);
          } else if (w.x !== fx || w.y !== fy) {
            vw.trail = [{ x: fx, y: fy, dir: heldDir }, ...vw.trail].slice(0, 2);
            walk.current = {
              fx,
              fy,
              t: 0,
              after: () => {
                if (res.steps) queue.current.push(...res.steps);
                if (res.encounter) startBattle(res.encounter, false, false);
                if (res.message) say('', res.message);
                runQueue();
              },
            };
          } else if (res.message) {
            say('', res.message);
            runQueue();
          }
        }
      }
    }
    if (!ctx) return;
    renderWorld(ctx, w, vw, time.current);
    mapBanner(ctx, banner.current.name, banner.current.t);
    if (dialog.current) dialogBox(ctx, dialog.current.who, dialog.current.say, dialog.current.shown, time.current);
    if (trans.current > 0) drawTransition(ctx, trans.current);
  });

  // 캔버스 누르기 (전투에서 칸 고르기 · 필드에서 확인)
  const onCanvas = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = battle.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    if (!r) {
      edge.current.add('ok');
      return;
    }
    const gx = Math.floor((x - BOX) / BT);
    const gy = Math.floor((y - BOY) / BT);
    if (r.phase === 'move') {
      if (r.view.highlight.some(([a, b]) => a === gx && b === gy)) {
        r.view.cursor = [gx, gy];
        edge.current.add('ok');
      }
    } else if (r.phase === 'target') {
      const t = r.targets.find((u) => u.x === gx && u.y === gy);
      if (t) confirmTarget(t);
    } else edge.current.add('ok');
  };

  const press = (k: string) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      edge.current.add(k);
      held.current.add(k);
    },
    onPointerUp: () => held.current.delete(k),
    onPointerLeave: () => held.current.delete(k),
    onPointerCancel: () => held.current.delete(k),
  });

  const close = () => {
    setOverlay(null);
    setNote('');
    runQueue();
  };
  const r = battle.current;

  return (
    <>
      <div className="stage-wrap">
        <canvas ref={canvas} width={W} height={H} className="stage pixel" onPointerDown={onCanvas} />
        {overlay?.kind === 'menu' && (
          <Menu
            title={`${w.gold}G`}
            onCancel={close}
            options={[
              { label: '상태', pick: () => setOverlay({ kind: 'status' }) },
              { label: '도구', pick: () => setOverlay({ kind: 'items' }) },
              {
                label: '기록하기',
                pick: () => {
                  doSave();
                  setNote('모험을 기록했다.');
                },
              },
              { label: '타이틀로', pick: onTitle },
              { label: '닫기', pick: close },
            ]}
            note={note || goal(w)}
          />
        )}
        {overlay?.kind === 'status' && (
          <div className="overlay quest-panel" onClick={() => setOverlay({ kind: 'menu' })}>
            {w.party.map((m) => {
              const s = stats(m);
              return (
                <div key={m.id} className="qstat">
                  <h3>
                    {HEROES[m.id].name} <small>{HEROES[m.id].title}</small> · Lv {m.lv}
                  </h3>
                  <p>
                    HP {m.hp}/{s.hp} · MP {m.mp}/{s.mp} · 공격 {s.atk} · 마력 {s.mag} · 방어 {s.def} · 빠르기 {s.spd} · 이동 {s.mv}칸
                  </p>
                  <p>다음 레벨까지 {expFor(m.lv) - m.exp}</p>
                  <p className="dim">{HEROES[m.id].profile}</p>
                </div>
              );
            })}
            <p className="dim">(누르면 돌아가기)</p>
          </div>
        )}
        {overlay?.kind === 'items' && (
          <Menu
            title="도구"
            onCancel={() => setOverlay({ kind: 'menu' })}
            options={[
              ...Object.entries(w.items).flatMap(([id, n]) =>
                w.party.map((m, i) => ({
                  label: `${ITEMS[id].name} ×${n} → ${HEROES[m.id].name} (HP ${m.hp}/${stats(m).hp})`,
                  pick: () => {
                    setNote(useItem(w, id, i) ?? '');
                    force((x) => x + 1);
                  },
                })),
              ),
              { label: '돌아가기', pick: () => setOverlay({ kind: 'menu' }) },
            ]}
            note={note || (Object.keys(w.items).length ? '누구에게 쓸까?' : '도구가 없다.')}
          />
        )}
        {overlay?.kind === 'shop' && (
          <Menu
            title={`가진 돈 ${w.gold}G`}
            onCancel={() => {
              say('잡화점 장사꾼', '또 오십쇼~!');
              close();
            }}
            options={[
              ...overlay.items.map((id) => ({
                label: `${ITEMS[id].name}  ${ITEMS[id].price}G  (가진 수 ${w.items[id] ?? 0})`,
                pick: () => {
                  if (w.gold < ITEMS[id].price) return setNote('돈이 모자라요!');
                  w.gold -= ITEMS[id].price;
                  w.items[id] = (w.items[id] ?? 0) + 1;
                  sound.sfx('catch');
                  setNote(`${ITEMS[id].name}을(를) 샀다. ${ITEMS[id].desc}`);
                },
              })),
              {
                label: '그만두기',
                pick: () => {
                  say('잡화점 장사꾼', '또 오십쇼~!');
                  close();
                },
              },
            ]}
            note={note || '무엇을 사시겠수?'}
          />
        )}
        {overlay?.kind === 'inn' && (
          <Menu
            title={`가진 돈 ${w.gold}G`}
            onCancel={close}
            options={[
              {
                label: `묵는다 (${overlay.price}G)`,
                pick: () => {
                  if (w.gold < overlay.price) {
                    say('여관 주인', '돈이 모자라는구먼. 마당에서 자고 가게. …농담일세.');
                    return close();
                  }
                  w.gold -= overlay.price;
                  healAll(w);
                  w.home = ['village', 4, 8];
                  doSave();
                  sound.sfx('clear');
                  queue.current.unshift({ who: '', say: '푹 잤다! HP와 MP가 모두 회복되었다. 모험을 기록했다.' });
                  close();
                },
              },
              { label: '그만두기', pick: close },
            ]}
            note="하룻밤 묵으면 기운이 돌아오고 모험이 기록된다네."
          />
        )}
        {overlay?.kind === 'end' && (
          <div className="overlay quest-panel end">
            <h2>제1장 「{CHAPTERS[0].title}」 끝</h2>
            <p>하루 Lv {w.party[0].lv}{w.party[1] ? ` · 미르 Lv ${w.party[1].lv}` : ''} · {w.gold}G</p>
            <p className="next">
              다음 이야기 — 제2장 「{CHAPTERS[1].title}」
              <br />
              <span>{CHAPTERS[1].summary}</span>
            </p>
            <p className="dim">(준비 중입니다. 기록은 저장되었어요.)</p>
            <div className="row">
              <button className="primary" onClick={close}>
                마을 둘러보기
              </button>
              <button onClick={onTitle}>타이틀로</button>
            </div>
          </div>
        )}
        {overlay?.kind === 'battle' && r && (
          <BattleMenu
            run={r}
            w={w}
            sub={overlay.sub}
            onSub={(sub) => setOverlay({ kind: 'battle', sub })}
            onPick={chooseAction}
            onCancel={() => {
              if (overlay.sub !== 'main') return setOverlay({ kind: 'battle', sub: 'main' });
              r.b.undoMove(r.b.current);
              setOverlay(null);
              beginTurn();
            }}
          />
        )}
      </div>
      <div className="touchpad quest-pad">
        <div className="pad-left">
          <button className="l" {...press('left')}>◀</button>
          <button className="u" {...press('up')}>▲</button>
          <button className="d" {...press('down')}>▼</button>
          <button className="r" {...press('right')}>▶</button>
        </div>
        <div className="pad-right">
          <button className="special" {...press('cancel')}>
            B
          </button>
          <button className="special a" {...press('ok')}>
            A
          </button>
        </div>
      </div>
      <p className="hint">방향키 이동 · Z / Enter 확인·말 걸기 · X / Esc 메뉴·취소 (휴대폰은 A·B 버튼)</p>
    </>
  );
}

function drawTransition(ctx: CanvasRenderingContext2D, t: number) {
  // 옛날 게임처럼 화면이 줄무늬로 닫혔다 열린다
  const k = Math.min(1, t / 0.4);
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 20) ctx.fillRect(0, y, W, 20 * k);
}

function goal(w: WorldState) {
  if (w.flags.clear1) return '제1장 완료! 다음 장을 기다려 주세요.';
  if (w.flags.bell) return '목표: 마을로 돌아가 종탑에 종을 걸자.';
  if (w.flags.mir) return '목표: 도토리 숲 동쪽 끝, 곰발톱의 동굴로!';
  return '목표: 남쪽 바람 언덕을 지나 동쪽 도토리 숲으로.';
}

// 키보드·터치로 고르는 메뉴
function Menu({ title, options, onCancel, note }: { title: string; options: { label: string; pick: () => void; disabled?: boolean }[]; onCancel: () => void; note?: string }) {
  const [sel, setSel] = useState(0);
  const ref = useRef({ options, sel, onCancel });
  ref.current = { options, sel, onCancel };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const { options: o, sel: s } = ref.current;
      const k = KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      if (k === 'up') setSel((s - 1 + o.length) % o.length);
      else if (k === 'down') setSel((s + 1) % o.length);
      else if (k === 'ok' && !o[s]?.disabled) {
        sound.sfx('click');
        o[s]?.pick();
      } else if (k === 'cancel') ref.current.onCancel();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);
  return (
    <div className="overlay qmenu-wrap">
      <div className="qmenu">
        <div className="qmenu-title">{title}</div>
        {options.map((o, i) => (
          <button key={o.label + i} className={i === sel ? 'on' : ''} disabled={o.disabled} onPointerEnter={() => setSel(i)} onClick={() => o.pick()}>
            {i === sel ? '▶ ' : '   '}
            {o.label}
          </button>
        ))}
        {note && <p className="qnote">{note}</p>}
      </div>
    </div>
  );
}

function BattleMenu({ run, w, sub, onSub, onPick, onCancel }: { run: BattleRun; w: WorldState; sub: 'main' | 'skill' | 'item'; onSub: (s: 'main' | 'skill' | 'item') => void; onPick: (a: Action) => void; onCancel: () => void }) {
  const b = run.b;
  const u = b.current;
  if (sub === 'skill')
    return (
      <Menu
        title={`${u.name}의 기술 (MP ${u.mp})`}
        onCancel={onCancel}
        options={u.skills.map((id) => {
          const s = SKILLS[id];
          const a: Action = { kind: 'skill', id };
          return { label: `${s.name}  MP${s.mp}  사거리 ${s.range}${s.area ? ' · 범위' : ''}`, disabled: !b.canUse(u, a), pick: () => onPick(a) };
        })}
        note={u.skills.map((id) => `${SKILLS[id].name}: ${SKILLS[id].desc}`).join(' / ')}
      />
    );
  if (sub === 'item')
    return (
      <Menu
        title="도구"
        onCancel={onCancel}
        options={Object.entries(w.items).map(([id, n]) => {
          const a: Action = { kind: 'item', id };
          return { label: `${ITEMS[id].name} ×${n}`, disabled: !b.canUse(u, a, w), pick: () => onPick(a) };
        })}
        note="나 또는 옆 칸의 동료에게 쓸 수 있다."
      />
    );
  return (
    <Menu
      title={`${u.name}  HP ${u.hp}/${u.maxHp}  MP ${u.mp}/${u.maxMp}`}
      onCancel={onCancel}
      options={[
        { label: '공격', disabled: !b.canUse(u, { kind: 'attack' }), pick: () => onPick({ kind: 'attack' }) },
        { label: '기술', disabled: !u.skills.length, pick: () => onSub('skill') },
        { label: '도구', disabled: !Object.keys(w.items).length, pick: () => onSub('item') },
        { label: '대기', pick: () => onPick({ kind: 'wait' }) },
        { label: '도망치기', disabled: b.noFlee, pick: () => onPick({ kind: 'flee' }) },
      ]}
      note={b.canUse(u, { kind: 'attack' }) ? '옆 칸의 적을 때릴 수 있다.' : '때릴 수 있는 적이 옆에 없다. (X: 다시 움직이기)'}
    />
  );
}

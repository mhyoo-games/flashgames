import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { sound } from '../../core/audio';
import type { SongId } from '../../core/music';
import { random, seeded } from '../../core/rng';
import { load, save } from '../../core/storage';
import { Shell, useLoop } from '../../ui/common';
import { Fight, type Action, type Ev } from './battle';
import { interact, push, resetTemp, tile, trainerFlag, useField, walk, type Ask } from './field';
import { ITEMS } from './items';
import { josa } from './josa';
import { gymReward, MAP_ORDER_FLY, MAPS, rivalOf, rivalTeam, TRAITS } from './maps';
import { addBond, canBondEvolve, canEvolve, canLearnTm, evolve, expAt, healMon, makeMon, maxHp, nameOf, sp, teach, type Mon } from './mon';
import { HMS, MOVES, TMS } from './moves';
import { banner, box, dialog, H, renderBattle, renderField, text, W, wrapText, type BattleAnim, type FieldView } from './render';
import { byNo, SPECIES, STARTERS } from './species';
import { drawKkaebi, kkaebiSprite, tinted } from './sprite';
import { TYPE_COLOR } from './types';
import { Dex, KEYS, Menu, PartyPick, Sprite, StatusView, TypeTag, useMenuKeys, type Opt } from './ui';
import { addItem, hmUser, newGame, receive, TIME_NAME, timeOfDay, type Dir, type GameState, type NpcDef, type Step } from './world';

const SAVE = 'kkaebi-v1';
interface Saved {
  s: GameState;
}

export function KkaebiGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<GameState | null>(null);
  const saved = load<Saved | null>(SAVE, null);
  return (
    <Shell title="🏺 깨비 도감 ~금빛 호리병~" onBack={onBack}>
      {state ? (
        <Play initial={state} onTitle={() => setState(null)} />
      ) : (
        <Title
          hasSave={!!saved}
          onNew={(name) => {
            resetTemp();
            setState(newGame(name));
          }}
          onLoad={() => {
            resetTemp();
            setState({ ...newGame(), ...saved!.s });
          }}
          saved={saved?.s}
        />
      )}
    </Shell>
  );
}

function Title({ hasSave, onNew, onLoad, saved }: { hasSave: boolean; onNew: (name: string) => void; onLoad: () => void; saved?: GameState }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState('하랑');
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const show = [1, 4, 7, 193, 194, 195, 87, 60, 27];
    const draw = (now: number) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) return;
      const t = (now - t0) / 1000;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#f8d060');
      g.addColorStop(0.5, '#f8f0c8');
      g.addColorStop(1, '#88c868');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 금빛 호리병
      ctx.save();
      ctx.translate(W / 2, 250 + Math.sin(t * 2) * 6);
      ctx.fillStyle = '#e8a838';
      ctx.strokeStyle = '#784010';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 40, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -40, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c83828';
      ctx.fillRect(-28, -10, 56, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-36, 10, 14, 30);
      ctx.restore();
      show.forEach((no, i) => {
        const a = (i / show.length) * Math.PI * 2 + t * 0.4;
        drawKkaebi(ctx, kkaebiSprite(byNo(no), false, Math.floor(t * 2 + i) % 2), W / 2 + Math.cos(a) * 370, 390 + Math.sin(a) * 70, 2.6);
      });
      text(ctx, '깨비 도감', W / 2, 40 + Math.sin(t * 1.5) * 3, 72, '#fff0a0', 'center', true);
      text(ctx, '~ 금빛 호리병 ~', W / 2, 128, 36, '#ffffff', 'center', true);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="ktitle">
      <canvas ref={ref} width={W} height={H} className="stage pixel" />
      <div className="row">
        <label>
          이름 <input value={name} maxLength={6} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="primary" onClick={() => onNew(name.trim() || '하랑')}>
          새로 시작
        </button>
        <button disabled={!hasSave} onClick={onLoad}>
          이어하기{saved ? ` (${saved.name} · 인장 ${saved.badges} · 도감 ${saved.caught.length})` : ''}
        </button>
      </div>
      <p className="hint">방향키 이동 · Shift(또는 X를 누른 채) 달리기 · Z/Enter 확인 · X/Esc 메뉴·취소 · 휴대폰은 화면 아래 버튼</p>
    </div>
  );
}

// ================================================================
type Q = Step | { _trainer: NpcDef } | { _after: () => void };

type Overlay =
  | { k: 'start' }
  | { k: 'party'; mode: 'view' | 'item' | 'tm' | 'swap'; item?: string; tm?: string; from?: number }
  | { k: 'monMenu'; idx: number }
  | { k: 'status'; idx: number }
  | { k: 'dex' }
  | { k: 'bag'; battle?: boolean }
  | { k: 'tms' }
  | { k: 'forget'; idx: number; move: string; then: () => void }
  | { k: 'shop'; items: string[] }
  | { k: 'pc' }
  | { k: 'starter' }
  | { k: 'ask'; text: string; yes: () => void; no?: () => void }
  | { k: 'fly' }
  | { k: 'ending' }
  | { k: 'bmain' }
  | { k: 'bmoves' }
  | { k: 'bparty'; forced: boolean }
  | { k: 'bitemTarget'; item: string }
  | null;

interface BattleRun {
  fight: Fight;
  a: BattleAnim;
  evq: Ev[];
  msg: string;
  wait: number;
  /** OK를 눌러야 넘어가는 메시지 */
  hold: boolean;
  phase: 'events' | 'command' | 'menu' | 'done';
  pIdx: number;
  fIdx: number;
  hpTarget: { p: number; f: number };
  trainer?: NpcDef;
  legendFlag?: string;
  terrain: string;
  intro: number;
  leveled: Set<number>;
  wild?: boolean;
}

const isSay = (q: Q): q is { say: string; who?: string } => 'say' in q;

function Play({ initial, onTitle }: { initial: GameState; onTitle: () => void }) {
  const s = useRef(initial).current;
  const canvas = useRef<HTMLCanvasElement>(null);
  const rng = useRef(seeded(Math.floor(random() * 1e9))).current;
  const view = useRef<FieldView>({ px: s.x, py: s.y, dir: s.dir, moving: false, hop: 0 });
  const walkAnim = useRef<{ fx: number; fy: number; t: number; dur: number; jump: boolean; after: () => void } | null>(null);
  const queue = useRef<Q[]>([]);
  const dlg = useRef<{ who: string; msg: string; shown: number } | null>(null);
  const battle = useRef<BattleRun | null>(null);
  const evo = useRef<{ idx: number; from: number; to: number; t: number; cancelled?: boolean; done?: boolean } | null>(null);
  const evoQueue = useRef<number[]>([]);
  const held = useRef(new Set<string>());
  const edge = useRef(new Set<string>());
  const time = useRef(0);
  const ban = useRef({ name: MAPS[s.map].name, t: 0 });
  const trans = useRef(0);
  const alert = useRef<{ npc: NpcDef; t: number } | null>(null);
  /** 전투로 넘어가는 장면: 느낌표 → 번쩍 → 화면 덮기 */
  /** 전투 배속: 1·2·3 (C 또는 Tab으로 바꾸고, 전투 중 Shift를 누르고 있으면 3배) */
  const speed = useRef(loadSpeed());
  const [, setSpeedShown] = useState(speed.current);
  const cycleSpeed = () => {
    speed.current = speed.current >= 3 ? 1 : speed.current + 1;
    try {
      localStorage.setItem(SPEED_KEY, String(speed.current));
    } catch {
      /* 저장 안 돼도 괜찮다 */
    }
    setSpeedShown(speed.current);
    sound.sfx('click');
  };
  const enc = useRef<{ t: number; style: Wipe; mark: boolean; go: () => void } | null>(null);
  const beginEncounter = (style: Wipe, mark: boolean, go: () => void) => {
    enc.current = { t: mark ? 0 : ENC_MARK, style, mark, go };
    if (mark) sound.sfx('special');
  };
  const [overlay, setOv] = useState<Overlay>(null);
  const ovRef = useRef<Overlay>(null);
  const [note, setNote] = useState('');
  const [, force] = useState(0);
  const setOverlay = (o: Overlay) => {
    ovRef.current = o;
    setOv(o);
    if (!o) setNote('');
  };
  const refresh = () => force((x) => x + 1);

  useEffect(() => {
    sound.play(MAPS[s.map].song as SongId);
    if (!s.flags.intro && !s.party.length) {
      queue.current.push({ who: '', say: '한빛 군도의 작은 섬, 새싹마을.' }, { who: '', say: `오늘은 ${s.name}이(가) 처음으로 깨비를 받는 날이다!` }, { set: 'intro' });
    }
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
    const tick = setInterval(() => (s.playSec += 1), 1000);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      clearInterval(tick);
    };
  }, []);

  const doSave = () => save(SAVE, { s } satisfies Saved);
  const map = () => MAPS[s.map];
  const say = (who: string, msg: string) => queue.current.unshift({ who, say: msg });
  const healAll = () => s.party.forEach(healMon);

  // ---------------- 사건 진행 ----------------
  const runQueue = () => {
    while (queue.current.length && !dlg.current && !battle.current && !ovRef.current && !evo.current) {
      const q = queue.current.shift()!;
      if (isSay(q)) {
        let msg = q.say;
        const m = /^ITEM:(\w+):(\d+)$/.exec(msg);
        if (m) {
          msg = `${ITEMS[m[1]].name}을(를) ${m[2] === '1' ? '' : m[2] + '개 '}주웠다!`;
          sound.sfx('catch');
        }
        dlg.current = { who: q.who ?? '', msg: josa(msg), shown: 0 };
      } else if ('_trainer' in q) {
        const n = q._trainer;
        beginEncounter('bars', false, () => startTrainer(n));
      }
      else if ('_after' in q) q._after();
      else if ('give' in q) addItem(s, q.give, q.n ?? 1);
      else if ('giveMon' in q) {
        const where = receive(s, makeMon(q.giveMon, q.lv, rng));
        queue.current.unshift({ who: '', say: `${byNo(q.giveMon).name}을(를) 받았다!${where === 'box' ? ' (보관함으로 보냈다)' : ''}` });
      } else if ('set' in q) s.flags[q.set] = true;
      else if ('unset' in q) delete s.flags[q.unset];
      else if ('heal' in q) {
        healAll();
        sound.sfx('clear');
        const town = s.map.split('-')[0];
        if (MAPS[town]?.heal) s.home = [town, ...MAPS[town].heal!];
        else if (s.map === 'home') s.home = ['saessak', 3, 7];
        else if (MAPS[s.map].heal) s.home = [s.map, ...MAPS[s.map].heal!];
        doSave();
      } else if ('shop' in q) setOverlay({ k: 'shop', items: q.shop });
      else if ('pc' in q) setOverlay({ k: 'pc' });
      else if ('starter' in q) setOverlay({ k: 'starter' });
      else if ('badge' in q) {
        s.badges = Math.max(s.badges, q.badge);
        sound.sfx('clear');
      } else if ('hm' in q) {
        if (!s.tms.includes(q.hm)) s.tms.push(q.hm);
      } else if ('tm' in q) {
        if (!s.tms.includes(q.tm)) s.tms.push(q.tm);
      } else if ('money' in q) s.money += q.money;
      else if ('wild' in q) {
        const w = q;
        beginEncounter('legend', false, () => startWild(w.wild, w.lv, w.flag));
      }
      else if ('warp' in q) [s.map, s.x, s.y] = q.warp;
      else if ('ending' in q) {
        doSave();
        setOverlay({ k: 'ending' });
      } else if ('home' in q) s.home = [s.map, s.x, s.y];
    }
  };

  // ---------------- 전투 시작 ----------------
  const newAnim = (me?: Mon, foe?: Mon): BattleAnim => ({ php: me?.hp ?? 0, fhp: foe?.hp ?? 0, pin: 0, fin: 0, psend: 1, fsend: 1, pshake: 0, fshake: 0, pflash: 0, fflash: 0, plunge: 0, flunge: 0, exp: me ? expFrac(me) : 0 });
  const terrainOf = () => {
    const m = map();
    if (s.surfing) return 'sea';
    if (m.terrain === 'route' && m.song === 'ksea') return 'sea';
    return m.terrain === 'town' ? 'route' : m.terrain;
  };
  const startWild = (no: number, lv: number, legendFlag?: string) => {
    const foe = makeMon(no, lv, rng);
    if (!s.seen.includes(no)) s.seen.push(no);
    const fight = new Fight(s.party, [foe], rng);
    fight.heroName = s.name;
    const me = fight.me;
    battle.current = { fight, a: { ...newAnim(me, foe), fin: 1 }, evq: [{ t: 'msg', s: `앗! 야생의 ${sp(foe).name}${foe.shiny ? '(반짝!)' : ''}이(가) 나타났다!` }, { t: 'msg', s: `가랏! ${nameOf(me)}!` }, { t: 'anim', side: 'p', kind: 'send' }], msg: '', wait: 0, hold: false, phase: 'events', pIdx: fight.p, fIdx: 0, hpTarget: { p: me.hp, f: foe.hp }, legendFlag, terrain: terrainOf(), intro: 0, leveled: new Set(), wild: true };
    battle.current.wait = 0.95;
    trans.current = 0;
    sound.sfx('start');
    sound.play(legendFlag ? 'boss' : 'kbattle');
    sound.sfx('start');
  };
  const startTrainer = (npc: NpcDef) => {
    const tr = npc.trainer!;
    let teamList = tr.team;
    if (tr.rival) teamList = rivalTeam(s, (npc.id === 'rival1' ? 1 : npc.id === 'rival2' ? 2 : npc.id === 'rival3' ? 3 : 4) as 1 | 2 | 3 | 4);
    const foes = teamList.map(([no, lv]) => makeMon(no, lv, rng));
    for (const f of foes.slice(0, 1)) if (!s.seen.includes(f.no)) s.seen.push(f.no);
    const fight = new Fight(s.party, foes, rng, { name: tr.name, smart: tr.smart, items: tr.items, prize: tr.prize });
    fight.heroName = s.name;
    const me = fight.me;
    const big = !!(tr.gym || tr.rival || /사천왕|깨비 왕|두목|간부/.test(tr.name));
    battle.current = {
      fight,
      a: newAnim(me, foes[0]),
      evq: [{ t: 'msg', s: `${tr.name}이(가) 승부를 걸어왔다!` }, { t: 'msg', s: `${tr.name}은(는) ${nameOf(foes[0])}을(를) 내보냈다!` }, { t: 'anim', side: 'f', kind: 'send' }, { t: 'msg', s: `가랏! ${nameOf(me)}!` }, { t: 'anim', side: 'p', kind: 'send' }],
      msg: '',
      wait: 0,
      hold: false,
      phase: 'events',
      pIdx: fight.p,
      fIdx: 0,
      hpTarget: { p: me.hp, f: foes[0].hp },
      trainer: npc,
      terrain: terrainOf(),
      intro: 0,
      leveled: new Set(),
    };
    battle.current.wait = 0.7;
    trans.current = 0;
    sound.play(big ? 'boss' : 'ktrainer');
    sound.sfx('start');
  };
  const expFrac = (m: Mon) => (m.lv >= 100 ? 1 : (m.exp - expAt(m.lv)) / Math.max(1, expAt(m.lv + 1) - expAt(m.lv)));

  /** 전투 한 차례 보내기 */
  const act = (a: Action) => {
    const r = battle.current!;
    setOverlay(null);
    r.evq.push(...r.fight.turn(a));
    r.phase = 'events';
  };

  const afterEvents = () => {
    const r = battle.current!;
    const f = r.fight;
    if (f.outcome) return endBattle();
    if (f.needSwitch) {
      r.phase = 'menu';
      setOverlay({ k: 'bparty', forced: true });
      return;
    }
    if (f.pendingLearn.length) {
      const { idx, move } = f.pendingLearn.shift()!;
      askLearn(idx, move, () => {
        if (battle.current) afterEvents();
      });
      r.phase = 'menu';
      return;
    }
    r.phase = 'command';
    r.msg = josa(`${nameOf(f.me)}은(는) 무엇을 할까?`);
    setOverlay({ k: 'bmain' });
  };

  const askLearn = (idx: number, move: string, then: () => void) => {
    const m = s.party[idx];
    const name = MOVES[move].name;
    setOverlay({
      k: 'ask',
      text: `${nameOf(m)}은(는) 「${name}」을(를) 배우고 싶어 한다! 하지만 기술이 이미 4개다. 다른 기술을 잊게 할까?`,
      yes: () => setOverlay({ k: 'forget', idx, move, then }),
      no: () => {
        setOverlay(null);
        say('', `${nameOf(m)}은(는) ${name}을(를) 배우지 않았다.`);
        then();
        runQueue();
      },
    });
  };

  const endBattle = () => {
    const r = battle.current!;
    const f = r.fight;
    r.phase = 'done';
    const lines: string[] = [];
    if (f.outcome === 'win' && r.trainer) {
      const tr = r.trainer.trainer!;
      s.flags[trainerFlag(s.map, r.trainer.id)] = true;
      s.money += tr.prize;
      lines.push(`${tr.name}: ${tr.after}`, `${tr.prize.toLocaleString()}냥을 받았다!`);
    } else if (f.outcome === 'caught') {
      const m = f.foe;
      const isNew = !s.caught.includes(m.no);
      const where = receive(s, m);
      if (isNew) lines.push(`${sp(m).name}의 정보가 깨비 도감에 새로 기록되었다!`);
      if (where === 'box') lines.push(`파티가 가득 차서 ${sp(m).name}을(를) 보관함으로 보냈다.`);
      if (r.legendFlag) s.flags[r.legendFlag] = true;
    } else if (f.outcome === 'lose' && r.trainer?.trainer?.soft) {
      s.flags[trainerFlag(s.map, r.trainer.id)] = true;
      lines.push('라이벌 차돌: 하하! 내 깨비가 더 세다고! …뭐, 너도 나쁘지 않았어.', '(깨비들이 기운을 되찾았다)');
    } else if (f.outcome === 'win' && r.legendFlag) lines.push(`${sp(f.foe).name}은(는) 쓰러져 어디론가 사라졌다… (다시 찾아오면 만날 수 있을 것 같다)`);
    r.evq.push(...lines.map((x) => ({ t: 'msg', s: x }) as Ev));
    r.hold = true;
  };

  const closeBattle = () => {
    const r = battle.current!;
    const f = r.fight;
    battle.current = null;
    setOverlay(null);
    trans.current = 0.4;
    if (f.outcome === 'lose' && r.trainer?.trainer?.soft) healAll();
    else if (f.outcome === 'lose') {
      s.money = Math.floor(s.money / 2);
      [s.map, s.x, s.y] = s.home;
      s.dir = 'up';
      s.surfing = false;
      healAll();
      resetTemp();
      view.current = { px: s.x, py: s.y, dir: s.dir, moving: false, hop: 0 };
      queue.current = [{ who: '', say: '깨비들을 데리고 서둘러 쉼터로 돌아왔다… (가진 돈의 절반을 잃었다)' }];
    } else if (r.trainer && f.outcome === 'win') {
      const tr = r.trainer.trainer!;
      if (tr.gym) queue.current.unshift(...gymReward(tr.gym));
      else if (r.trainer.talk) queue.current.unshift(...r.trainer.talk(s));
    }
    if (f.outcome === 'win' || f.outcome === 'caught') {
      // 함께 싸우면 유대가 깊어진다 (체육관·라이벌은 더)
      const big = !!(r.trainer?.trainer?.gym || r.trainer?.trainer?.rival);
      for (const m of s.party) if (m.hp > 0) addBond(m, big ? 4 : 1);
      // 숨은 유대 진화
      for (const m of s.party)
        if (canBondEvolve(m)) {
          const before = nameOf(m);
          m.bondForm = true;
          sound.sfx('clear');
          queue.current.push(
            { who: '', say: `……!? ${before}의 몸이 ${s.name}의 마음에 답하듯 금빛으로 빛난다!` },
            { who: '', say: `유대가 하늘에 닿았다! ${before}은(는) 숨겨진 모습, ${nameOf(m)}(으)로 바뀌었다!` },
            { who: '', say: '(유대 진화: 모든 능력이 크게 올랐다)' },
          );
        }
    }
    // 진화
    evoQueue.current = [...r.leveled].filter((i) => s.party[i] && s.party[i].hp > 0 && canEvolve(s.party[i]));
    sound.play(MAPS[s.map].song as SongId);
    startEvo();
    runQueue();
  };

  const startEvo = () => {
    const i = evoQueue.current.shift();
    if (i === undefined) return;
    const m = s.party[i];
    const to = canEvolve(m);
    if (!to) return startEvo();
    evo.current = { idx: i, from: m.no, to, t: 0 };
    sound.play('boss');
  };

  // ---------------- 매 프레임 ----------------
  useLoop((dt) => {
    time.current += dt;
    ban.current.t += dt;
    trans.current = Math.max(0, trans.current - dt);
    const e = edge.current;
    const ok = e.has('ok');
    const cancel = e.has('cancel');
    const heldDir = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => held.current.has(d));
    edge.current = new Set();
    if (e.has('speed')) cycleSpeed();
    const ctx = canvas.current?.getContext('2d');
    const ov = ovRef.current;

    // ---- 진화 ----
    const ev = evo.current;
    if (ev) {
      ev.t += dt;
      if (!ev.done && cancel && ev.t < 4) {
        ev.cancelled = true;
        ev.done = true;
        ev.t = 4;
      }
      if (!ev.done && ev.t > 4.5) {
        ev.done = true;
        const m = s.party[ev.idx];
        const before = nameOf(m);
        evolve(m);
        if (!s.seen.includes(m.no)) s.seen.push(m.no);
        if (!s.caught.includes(m.no)) s.caught.push(m.no);
        sound.sfx('clear');
        dlg.current = { who: '', msg: josa(`축하합니다! ${before}은(는) ${sp(m).name}(으)로 진화했다!`), shown: 0 };
      }
      if (ctx) drawEvo(ctx, ev, time.current);
      let close = false;
      if (dlg.current && ctx) {
        dlg.current.shown += dt * 45;
        if (ok && dlg.current.shown >= dlg.current.msg.length) {
          dlg.current = null;
          close = true;
        } else if (ok) dlg.current.shown = dlg.current.msg.length;
      }
      if (ev.done && ev.t > 5 && !dlg.current && (close || ok || ev.t > 12)) {
        if (ev.cancelled) queue.current.unshift({ who: '', say: '어라…? 진화가 멈췄다.' });
        evo.current = null;
        sound.play(MAPS[s.map].song as SongId);
        startEvo();
        runQueue();
      }
      if (dlg.current && ctx) dialog(ctx, dlg.current.who, dlg.current.msg, dlg.current.shown, time.current);
      return;
    }

    // ---- 전투로 넘어가는 중 ----
    const en = enc.current;
    if (en) {
      en.t += dt;
      const v = view.current;
      v.alertMe = en.mark && en.t < ENC_MARK ? en.t : undefined;
      if (ctx) {
        renderField(ctx, s, map(), v, time.current, s.forceTime ?? timeOfDay());
        encounterFx(ctx, en.style, en.t);
      }
      if (en.t >= ENC_END) {
        enc.current = null;
        v.alertMe = undefined;
        en.go();
      }
      return;
    }

    // ---- 전투 ----
    const r = battle.current;
    if (r) {
      const mult = Math.max(speed.current, held.current.has('run') ? 3 : 1);
      updateBattle(r, dt * mult, ok);
      if (ctx && battle.current) {
        const f = r.fight;
        const me = f.party[r.pIdx];
        const foe = f.foes[r.fIdx];
        renderBattle(ctx, me, foe, r.a, r.terrain, time.current, r.trainer ? (r.trainer.look as string) : undefined, r.intro, r.wild);
        // 덮였던 화면이 가운데부터 위아래로 열린다
        if (r.intro < 0.4) {
          const k = 1 - r.intro / 0.4;
          const hh = (H / 2) * k * k;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, W, hh);
          ctx.fillRect(0, H - hh, W, hh);
        }
        box(ctx, 16, H - 112, W - 32, 100);
        if (r.msg) wrapText(ctx, r.msg, 44, H - 90, W - 120, 30, 22, 2);
        if (r.hold && r.msg && Math.floor(time.current * 3) % 2) text(ctx, '▼', W - 64, H - 46, 20);
        if (mult > 1) speedBadge(ctx, mult);
      }
      if (ctx && trans.current > 0) stripes(ctx, trans.current);
      return;
    }

    // ---- 필드 ----
    const v = view.current;
    if (alert.current) {
      alert.current.t += dt;
      v.alert = alert.current.npc.id;
      if (alert.current.t > 0.8) {
        const n = alert.current.npc;
        alert.current = null;
        v.alert = undefined;
        n.dir = ({ down: 'up', up: 'down', left: 'right', right: 'left' } as const)[s.dir];
        queue.current.push({ who: n.trainer!.name, say: n.trainer!.before }, { _trainer: n });
        runQueue();
      }
    } else if (walkAnim.current) {
      const k = walkAnim.current;
      k.t += dt / k.dur;
      const t = Math.min(1, k.t);
      v.px = k.fx + (s.x - k.fx) * t;
      v.py = k.fy + (s.y - k.fy) * t;
      v.hop = k.jump ? Math.sin(t * Math.PI) * 30 : 0;
      if (t >= 1) {
        walkAnim.current = null;
        v.hop = 0;
        k.after();
      }
    } else if (dlg.current) {
      const d = dlg.current;
      d.shown += dt * 45 * (speed.current > 1 || held.current.has('run') ? 2.5 : 1);
      if (ok || (cancel && d.shown >= d.msg.length)) {
        if (d.shown < d.msg.length) d.shown = d.msg.length;
        else {
          dlg.current = null;
          runQueue();
        }
      }
    } else if (queue.current.length && !ov) runQueue();
    else if (!ov) {
      v.moving = false;
      if (heldDir) {
        const m = map();
        // 괴력: 돌 밀기
        if (s.dir === heldDir && push(s, m, heldDir)) sound.sfx('punch');
        const fx = s.x;
        const fy = s.y;
        const prevMap = s.map;
        const res = walk(s, MAPS, heldDir, rng);
        v.dir = s.dir;
        if (res.steps) {
          queue.current.push(...res.steps);
          runQueue();
        } else if (res.moved) {
          if (s.map !== prevMap) {
            v.px = s.x;
            v.py = s.y;
            onEnterMap(prevMap);
          } else {
            v.moving = true;
            if (s.steps % 80 === 0) {
              const lead = s.party.find((p) => p.hp > 0);
              if (lead) addBond(lead, 1);
            }
            const running = held.current.has('run') || held.current.has('cancel');
            walkAnim.current = {
              fx,
              fy,
              t: 0,
              dur: res.jump ? 0.34 : s.biking ? 0.08 : running && !s.surfing ? 0.11 : 0.19,
              jump: !!res.jump,
              after: () => {
                if (res.jump) sound.sfx('jump');
                if (res.trainer) {
                  alert.current = { npc: res.trainer, t: 0 };
                  sound.sfx('special');
                } else if (res.encounter) {
                  const e = res.encounter;
                  beginEncounter('swirl', true, () => startWild(e.no, e.lv));
                }
              },
            };
          }
        }
      } else if (ok) {
        const it = interact(s, map());
        if (it && 'steps' in it) {
          queue.current.push(...it.steps);
          runQueue();
        } else if (it && 'trainer' in it) {
          const n = it.trainer;
          n.dir = ({ down: 'up', up: 'down', left: 'right', right: 'left' } as const)[s.dir];
          queue.current.push({ who: n.trainer!.name, say: n.trainer!.before }, { _trainer: n });
          runQueue();
        } else if (it && 'ask' in it) askField(it.ask, it.text);
      } else if (cancel) {
        setOverlay({ k: 'start' });
        sound.sfx('click');
      }
    }
    if (!ctx) return;
    const tod = s.forceTime ?? timeOfDay();
    renderField(ctx, s, map(), v, time.current, tod);
    banner(ctx, ban.current.name, ban.current.t, TRAITS[s.map]);
    if (map().terrain !== 'indoor') {
      box(ctx, W - 132, 12, 120, 44);
      text(ctx, `${TIME_NAME[tod]} ${new Date().getHours()}시`, W - 72, 24, 18, '#202030', 'center');
    }
    if (dlg.current) dialog(ctx, dlg.current.who, dlg.current.msg, dlg.current.shown, time.current);
    if (trans.current > 0) stripes(ctx, trans.current);
  });

  const onEnterMap = (prev: string) => {
    const m = map();
    ban.current = { name: m.name, t: 0 };
    trans.current = 0.3;
    if (m.fly && !s.visited.includes(m.id)) s.visited.push(m.id);
    if (MAPS[prev].song !== m.song) sound.play(m.song as SongId);
    if (m.dark && !s.flags[`flash:${m.id}`] && hmUser(s, 'flash')) askField('flash', '굴 안이 깜깜하다. 빛내기를 쓸까?');
  };

  const askField = (kind: Ask, q: string) => {
    setOverlay({
      k: 'ask',
      text: q,
      yes: () => {
        setOverlay(null);
        const steps = useField(s, map(), kind);
        if (kind === 'surf' || kind === 'climb') {
          view.current.px = s.x;
          view.current.py = s.y;
        }
        sound.sfx('special');
        queue.current.push(...steps);
        runQueue();
      },
    });
  };

  // ---------------- 전투 진행 ----------------
  const updateBattle = (r: BattleRun, dt: number, ok: boolean) => {
    const a = r.a;
    const before = r.intro;
    r.intro = Math.min(1.6, r.intro + dt * 1.25);
    if (r.wild && before < 1 && r.intro >= 1) sound.sfx('power');
    a.psend = Math.min(1, a.psend + dt * 2.2);
    a.fsend = Math.min(1, a.fsend + dt * 2.2);
    const f = r.fight;
    const me = f.party[r.pIdx];
    const foe = f.foes[r.fIdx];
    // HP 막대가 천천히 줄어든다
    const step = dt * 60;
    if (me) a.php += Math.sign(r.hpTarget.p - a.php) * Math.min(Math.abs(r.hpTarget.p - a.php), (step * maxHp(me)) / 70);
    if (foe) a.fhp += Math.sign(r.hpTarget.f - a.fhp) * Math.min(Math.abs(r.hpTarget.f - a.fhp), (step * maxHp(foe)) / 70);
    for (const k of ['pshake', 'fshake', 'pflash', 'fflash'] as const) a[k] = Math.max(0, a[k] - dt);
    a.plunge = a.plunge > 0 ? Math.min(1.01, a.plunge + dt * 4) : 0;
    a.flunge = a.flunge > 0 ? Math.min(1.01, a.flunge + dt * 4) : 0;
    if (a.plunge > 1) a.plunge = 0;
    if (a.flunge > 1) a.flunge = 0;
    if (a.fx) {
      a.fx.t += dt * 1.6;
      if (a.fx.t > 1) a.fx = undefined;
    }
    if (a.stat) {
      a.stat.t += dt;
      if (a.stat.t > 0.8) a.stat = undefined;
    }
    if (a.ball) a.ball.t += dt;
    if (r.phase !== 'events' && r.phase !== 'done') return;
    // 기다리기
    if (r.wait > 0) {
      r.wait -= dt;
      if (r.hold && ok) r.wait = 0;
      else if (!r.hold && ok && r.wait < 0.6) r.wait = 0;
      return;
    }
    if (Math.abs(a.php - r.hpTarget.p) > 0.5 || Math.abs(a.fhp - r.hpTarget.f) > 0.5) return;
    const e = r.evq.shift();
    if (!e) {
      if (r.phase === 'done') {
        if (r.hold && !ok && r.msg) {
          r.wait = 0.1;
          return;
        }
        return closeBattle();
      }
      return afterEvents();
    }
    switch (e.t) {
      case 'msg':
        r.msg = josa(e.s);
        r.wait = r.phase === 'done' ? 99 : Math.max(0.9, e.s.length * 0.035);
        r.hold = r.phase === 'done';
        break;
      case 'hp':
        r.hpTarget[e.side] = e.hp;
        break;
      case 'swap':
        if (e.side === 'p') {
          r.pIdx = e.idx;
          a.pin = 0;
          a.php = e.hp;
          r.hpTarget.p = e.hp;
          a.exp = expFrac(f.party[e.idx]);
        } else {
          r.fIdx = e.idx;
          a.fin = 0;
          a.fhp = e.hp;
          r.hpTarget.f = e.hp;
          if (!s.seen.includes(f.foes[e.idx].no)) s.seen.push(f.foes[e.idx].no);
        }
        break;
      case 'exp':
        if (e.idx === r.pIdx) a.exp = e.lv >= 100 ? 1 : (e.exp - expAt(e.lv)) / Math.max(1, expAt(e.lv + 1) - expAt(e.lv));
        break;
      case 'level':
        r.leveled.add(e.idx);
        sound.sfx('bonus');
        r.wait = 0.3;
        break;
      case 'anim': {
        const side = e.side;
        switch (e.kind) {
          case 'send':
            if (side === 'p') {
              a.pin = 1;
              a.psend = 0;
            } else {
              a.fin = 1;
              a.fsend = 0;
            }
            sound.sfx('burst');
            r.wait = 0.45;
            break;
          case 'recall':
            if (side === 'p') a.pin = 0;
            r.wait = 0.3;
            break;
          case 'atk': {
            if (side === 'p') a.plunge = 0.01;
            else a.flunge = 0.01;
            const mv = e.move ? MOVES[e.move] : undefined;
            const selfOnly = mv?.cat === 'status' && mv.effects.every((x) => x.self || x.kind === 'heal' || x.kind === 'rest');
            if (mv) a.fx = { type: mv.type, t: 0, to: selfOnly ? side : side === 'p' ? 'f' : 'p', status: mv.cat === 'status' };
            sound.sfx(mv && mv.cat !== 'status' ? 'special' : 'swing');
            r.wait = 0.55;
            break;
          }
          case 'hit':
            if (side === 'p') {
              a.pshake = 0.3;
              a.pflash = 0.4;
            } else {
              a.fshake = 0.3;
              a.fflash = 0.4;
            }
            sound.sfx('punch');
            r.wait = 0.15;
            break;
          case 'faint':
            if (side === 'p') a.pin = 0;
            else a.fin = 0;
            sound.sfx('death');
            r.wait = 0.5;
            break;
          case 'stat':
            a.stat = { side, up: !!e.up, t: 0 };
            r.wait = 0.4;
            break;
          case 'status':
            a.fx = { type: 'poison', t: 0, to: side, status: true };
            r.wait = 0.3;
            break;
          case 'throw':
            a.ball = { t: 0, shakes: 0, caught: false };
            sound.sfx('swing');
            r.wait = 1.0;
            break;
          case 'shake':
            if (a.ball) a.ball.shakes++;
            sound.sfx('click');
            r.wait = 0.65;
            break;
          case 'caught':
            if (a.ball) a.ball.caught = true;
            sound.sfx('clear');
            r.wait = 0.8;
            break;
          case 'escape':
            a.ball = undefined;
            a.fin = 1;
            sound.sfx('block');
            r.wait = 0.3;
            break;
        }
        break;
      }
    }
  };

  // ---------------- 버튼·터치 ----------------
  const press = (k: string) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      edge.current.add(k);
      held.current.add(k);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: k === 'ok' ? 'KeyZ' : k === 'cancel' ? 'KeyX' : k === 'up' ? 'ArrowUp' : k === 'down' ? 'ArrowDown' : k === 'left' ? 'ArrowLeft' : 'ArrowRight' }));
    },
    onPointerUp: () => held.current.delete(k),
    onPointerLeave: () => held.current.delete(k),
    onPointerCancel: () => held.current.delete(k),
  });
  const close = () => {
    setOverlay(null);
    runQueue();
  };

  const r = battle.current;
  const fight = r?.fight;

  return (
    <>
      <div className="stage-wrap">
        <canvas ref={canvas} width={W} height={H} className="stage pixel" onPointerDown={() => edge.current.add('ok')} />
        {overlay?.k === 'start' && (
          <Menu
            title={`${s.name} · ${s.money.toLocaleString()}냥 · 인장 ${s.badges}`}
            onCancel={close}
            options={[
              { label: '도감', disabled: !s.flags.dex, pick: () => setOverlay({ k: 'dex' }) },
              { label: '깨비', disabled: !s.party.length, pick: () => setOverlay({ k: 'party', mode: 'view' }) },
              { label: '가방', pick: () => setOverlay({ k: 'bag' }) },
              { label: '부적함', sub: `${s.tms.length}장`, pick: () => setOverlay({ k: 'tms' }) },
              {
                label: '하늘날기',
                disabled: !hmUser(s, 'fly') || map().terrain === 'indoor' || map().terrain === 'cave',
                pick: () => setOverlay({ k: 'fly' }),
              },
              {
                label: '빛내기',
                disabled: !map().dark || !!s.flags[`flash:${s.map}`] || !hmUser(s, 'flash'),
                pick: () => {
                  setOverlay(null);
                  queue.current.push(...useField(s, map(), 'flash'));
                  runQueue();
                },
              },
              {
                label: '기록하기',
                pick: () => {
                  doSave();
                  setNote('모험을 기록했다!');
                },
              },
              { label: '타이틀로', pick: onTitle },
              { label: '닫기', pick: close },
            ]}
            note={note || `플레이 ${Math.floor(s.playSec / 3600)}시간 ${Math.floor((s.playSec % 3600) / 60)}분 · 도감 ${s.caught.length}/${SPECIES.length}`}
          />
        )}
        {overlay?.k === 'dex' && <Dex seen={s.seen} caught={s.caught} onClose={() => setOverlay({ k: 'start' })} />}
        {overlay?.k === 'party' && (
          <PartyPick
            party={s.party}
            title={overlay.mode === 'swap' ? '어느 깨비와 자리를 바꿀까?' : overlay.mode === 'item' ? `${ITEMS[overlay.item!].name}을(를) 누구에게?` : overlay.mode === 'tm' ? `「${MOVES[overlay.tm!].name}」을(를) 누구에게 가르칠까?` : '깨비'}
            note={note || (overlay.mode === 'tm' ? '배울 수 있는 깨비만 고를 수 있다.' : undefined)}
            disabled={(m) => overlay.mode === 'tm' && !canLearnTm(m, overlay.tm!)}
            onCancel={() => setOverlay(overlay.mode === 'item' ? { k: 'bag' } : overlay.mode === 'tm' ? { k: 'tms' } : { k: 'start' })}
            onPick={(i) => {
              const m = s.party[i];
              if (overlay.mode === 'view') return setOverlay({ k: 'monMenu', idx: i });
              if (overlay.mode === 'swap') {
                const j = overlay.from!;
                [s.party[i], s.party[j]] = [s.party[j], s.party[i]];
                return setOverlay({ k: 'party', mode: 'view' });
              }
              if (overlay.mode === 'item') return setNote(useBagItem(overlay.item!, m));
              if (overlay.mode === 'tm') {
                const mv = overlay.tm!;
                if (m.moves.some((x) => x.id === mv)) return setNote(`${nameOf(m)}은(는) 이미 알고 있다.`);
                if (m.moves.length < 4) {
                  teach(m, mv);
                  sound.sfx('bonus');
                  return setNote(`${nameOf(m)}은(는) ${MOVES[mv].name}을(를) 배웠다!`);
                }
                setOverlay({ k: 'forget', idx: i, move: mv, then: () => setOverlay({ k: 'tms' }) });
              }
            }}
          />
        )}
        {overlay?.k === 'monMenu' && (
          <Menu
            title={nameOf(s.party[overlay.idx])}
            onCancel={() => setOverlay({ k: 'party', mode: 'view' })}
            options={[
              { label: '상태 보기', pick: () => setOverlay({ k: 'status', idx: overlay.idx }) },
              { label: '순서 바꾸기', pick: () => setOverlay({ k: 'party', mode: 'swap', from: overlay.idx }) },
              { label: '돌아가기', pick: () => setOverlay({ k: 'party', mode: 'view' }) },
            ]}
          />
        )}
        {overlay?.k === 'status' && <StatusView m={s.party[overlay.idx]} onClose={() => setOverlay({ k: 'party', mode: 'view' })} />}
        {overlay?.k === 'bag' && <Bag s={s} battle={!!overlay.battle} wild={!!fight?.wild} onCancel={() => setOverlay(overlay.battle ? { k: 'bmain' } : { k: 'start' })} onUse={(id) => bagUse(id, !!overlay.battle)} />}
        {overlay?.k === 'tms' && (
          <Menu
            title="부적함"
            onCancel={() => setOverlay({ k: 'start' })}
            options={[
              ...[...HMS.map((h) => h.move), ...TMS]
                .filter((id) => s.tms.includes(id))
                .map((id) => {
                  const hm = HMS.find((h) => h.move === id);
                  return {
                    label: `${hm ? '비전' : '기술'} 부적 · ${MOVES[id].name}`,
                    sub: `${MOVES[id].power || '-'} / ${MOVES[id].acc}${hm ? ` · 인장 ${hm.badge}개부터 필드에서 사용` : ''}`,
                    color: TYPE_COLOR[MOVES[id].type],
                    pick: () => setOverlay({ k: 'party', mode: 'tm', tm: id }),
                  } as Opt;
                }),
              { label: '돌아가기', pick: () => setOverlay({ k: 'start' }) },
            ]}
            note={s.tms.length ? '부적은 몇 번이고 쓸 수 있다.' : '아직 부적이 없다. 관장을 이기거나 길에서 주울 수 있다.'}
          />
        )}
        {overlay?.k === 'forget' && (
          <Menu
            title={`「${MOVES[overlay.move].name}」 대신 잊을 기술은?`}
            options={[
              ...s.party[overlay.idx].moves.map((x, j) => ({
                label: MOVES[x.id].name,
                sub: `위력 ${MOVES[x.id].power || '-'} · PP ${x.pp}`,
                color: TYPE_COLOR[MOVES[x.id].type],
                pick: () => {
                  const m = s.party[overlay.idx];
                  const old = MOVES[x.id].name;
                  teach(m, overlay.move, j);
                  sound.sfx('bonus');
                  const then = overlay.then;
                  setOverlay(null);
                  say('', `하나, 둘, 짠! ${nameOf(m)}은(는) ${old}을(를) 잊고 ${MOVES[overlay.move].name}을(를) 배웠다!`);
                  then();
                  runQueue();
                },
              })),
              {
                label: '배우지 않는다',
                pick: () => {
                  const then = overlay.then;
                  setOverlay(null);
                  then();
                  runQueue();
                },
              },
            ]}
            note={`새 기술: ${MOVES[overlay.move].name} (${MOVES[overlay.move].power || '-'} / ${MOVES[overlay.move].acc})`}
          />
        )}
        {overlay?.k === 'shop' && <Shop s={s} items={overlay.items} onClose={close} />}
        {overlay?.k === 'pc' && <PC s={s} onClose={close} />}
        {overlay?.k === 'starter' && (
          <Starter
            onPick={(no) => {
              receive(s, makeMon(no, 5, rng));
              for (const x of STARTERS) if (!s.seen.includes(x)) s.seen.push(x);
              s.rival = rivalOf(no);
              setOverlay(null);
              sound.sfx('clear');
              queue.current.unshift({ who: '', say: `${byNo(no).name}을(를) 받았다! 잘 부탁해!` }, { who: '은행나무 박사', say: '좋은 짝이 되겠구나. 다시 말을 걸어 주렴, 줄 것이 있단다.' });
              runQueue();
            }}
          />
        )}
        {overlay?.k === 'ask' && (
          <Menu
            place="center"
            title={overlay.text}
            onCancel={() => (overlay.no ? overlay.no() : close())}
            options={[
              { label: '예', pick: overlay.yes },
              { label: '아니요', pick: () => (overlay.no ? overlay.no() : close()) },
            ]}
          />
        )}
        {overlay?.k === 'fly' && (
          <Menu
            title="어디로 날아갈까?"
            onCancel={() => setOverlay({ k: 'start' })}
            options={[
              ...MAP_ORDER_FLY.filter((id) => s.visited.includes(id)).map((id) => ({
                label: MAPS[id].name,
                pick: () => {
                  const [x, y] = MAPS[id].fly!;
                  const prev = s.map;
                  s.map = id;
                  s.x = x;
                  s.y = y;
                  s.dir = 'down';
                  s.surfing = false;
                  resetTemp();
                  view.current = { px: x, py: y, dir: 'down', moving: false, hop: 0 };
                  setOverlay(null);
                  sound.sfx('jump');
                  onEnterMap(prev);
                },
              })),
              { label: '그만두기', pick: () => setOverlay({ k: 'start' }) },
            ]}
          />
        )}
        {overlay?.k === 'ending' && <Ending s={s} onContinue={() => {
          [s.map, s.x, s.y] = ['saessak', 9, 10];
          s.dir = 'down';
          view.current = { px: s.x, py: s.y, dir: 'down', moving: false, hop: 0 };
          resetTemp();
          healAll();
          doSave();
          sound.play('ktown');
          close();
        }} onTitle={onTitle} />}
        {/* ---- 전투 메뉴 ---- */}
        {overlay?.k === 'bmain' && fight && (
          <Menu
            place="bottom"
            cols={2}
            options={[
              { label: '싸운다', pick: () => setOverlay({ k: 'bmoves' }) },
              { label: '가방', pick: () => setOverlay({ k: 'bag', battle: true }) },
              { label: '깨비', pick: () => setOverlay({ k: 'bparty', forced: false }) },
              { label: '도망', pick: () => act({ kind: 'run' }) },
            ]}
          />
        )}
        {overlay?.k === 'bmoves' && fight && (
          <Menu
            place="bottom"
            cols={2}
            onCancel={() => setOverlay({ k: 'bmain' })}
            options={fight.me.moves.map((x, j) => {
              const mv = MOVES[x.id];
              return { label: mv.name, sub: `${mv.power || '-'} · PP ${x.pp}/${mv.pp}`, color: TYPE_COLOR[mv.type], disabled: x.pp <= 0, pick: () => act({ kind: 'move', slot: j }) };
            })}
            note={fight.me.moves.every((x) => x.pp <= 0) ? '쓸 수 있는 기술이 없다!' : undefined}
          />
        )}
        {overlay?.k === 'bparty' && fight && (
          <PartyPick
            party={s.party}
            title={overlay.forced ? '다음에 내보낼 깨비는?' : '누구로 바꿀까?'}
            disabled={(m, i) => m.hp <= 0 || i === fight.p}
            onCancel={overlay.forced ? undefined : () => setOverlay({ k: 'bmain' })}
            onPick={(i) => {
              setOverlay(null);
              if (overlay.forced) {
                battle.current!.evq.push(...fight.forceSwitch(i));
                battle.current!.phase = 'events';
              } else act({ kind: 'switch', idx: i });
            }}
          />
        )}
        {overlay?.k === 'bitemTarget' && fight && (
          <PartyPick
            party={s.party}
            title={`${ITEMS[overlay.item].name}을(를) 누구에게?`}
            onCancel={() => setOverlay({ k: 'bag', battle: true })}
            onPick={(i) => {
              const id = overlay.item;
              const m = s.party[i];
              const it = ITEMS[id];
              const ok2 = (it.kind === 'heal' && m.hp > 0 && m.hp < maxHp(m)) || (it.kind === 'cure' && !!m.status && (it.cures === 'all' || it.cures?.includes(m.status))) || (it.kind === 'revive' && m.hp <= 0) || it.kind === 'pp';
              if (!ok2) return setNote('써도 효과가 없을 것 같다.');
              addItem(s, id, -1);
              const slot = it.kind === 'pp' ? m.moves.reduce((b, x, j) => (x.pp / MOVES[x.id].pp < m.moves[b].pp / MOVES[m.moves[b].id].pp ? j : b), 0) : undefined;
              act({ kind: 'item', id, target: i, moveSlot: slot });
            }}
            note={note}
          />
        )}
      </div>
      <div className="touchpad kpad">
        <div className="pad-left">
          <button className="l" {...press('left')}>◀</button>
          <button className="u" {...press('up')}>▲</button>
          <button className="d" {...press('down')}>▼</button>
          <button className="r" {...press('right')}>▶</button>
        </div>
        <div className="pad-right">
          <button className="special speed" onPointerDown={(e: PointerEvent) => (e.preventDefault(), cycleSpeed())}>
            ▶▶{speed.current}
          </button>
          <button className="special" {...press('cancel')}>
            B
          </button>
          <button className="special a" {...press('ok')}>
            A
          </button>
        </div>
      </div>
      <p className="hint">방향키 이동 · Shift 또는 X를 누른 채 달리기 · Z 확인·말 걸기 · X 메뉴·취소 · C(또는 Tab) 전투 배속 ×{speed.current} · 전투 중 Shift를 누르고 있으면 ×3</p>
    </>
  );

  function useBagItem(id: string, m: Mon): string {
    const it = ITEMS[id];
    if (!s.bag[id]) return '없다.';
    if (it.kind === 'heal') {
      if (m.hp <= 0 || m.hp >= maxHp(m)) return '써도 효과가 없을 것 같다.';
      m.hp = Math.min(maxHp(m), m.hp + (it.hp ?? 0));
    } else if (it.kind === 'cure') {
      if (!m.status || !(it.cures === 'all' || it.cures?.includes(m.status))) return '써도 효과가 없을 것 같다.';
      m.status = undefined;
    } else if (it.kind === 'revive') {
      if (m.hp > 0) return '써도 효과가 없을 것 같다.';
      m.hp = Math.floor(maxHp(m) / 2);
    } else if (it.kind === 'pp') {
      for (const x of m.moves) x.pp = Math.min(MOVES[x.id].pp, x.pp + 10);
    } else if (it.kind === 'candy') {
      if (m.lv >= 100) return '더는 레벨이 오르지 않는다.';
      const before = m.lv;
      m.exp = expAt(m.lv + 1);
      m.lv++;
      m.hp = Math.min(maxHp(m), m.hp + 3);
      addItem(s, id, -1);
      const learn = sp(m).learn.filter(([l]) => l === m.lv).map(([, x]) => x);
      for (const x of learn) if (m.moves.length < 4) teach(m, x);
      if (canEvolve(m)) {
        evoQueue.current.push(s.party.indexOf(m));
        setOverlay(null);
        startEvo();
      }
      return `${nameOf(m)}은(는) 레벨 ${before} → ${m.lv}!`;
    } else return '여기서는 쓸 수 없다.';
    addItem(s, id, -1);
    sound.sfx('bonus');
    refresh();
    return `${nameOf(m)}에게 ${it.name}을(를) 썼다!`;
  }

  function bagUse(id: string, inBattle: boolean) {
    const it = ITEMS[id];
    if (inBattle) {
      if (it.kind === 'ball') {
        if (!fight?.wild) return setNote('남의 깨비는 잡을 수 없다!');
        addItem(s, id, -1);
        return act({ kind: 'item', id });
      }
      if (it.kind === 'candy' || it.kind === 'repel' || it.kind === 'key') return setNote('지금은 쓸 수 없다.');
      return setOverlay({ k: 'bitemTarget', item: id });
    }
    if (it.kind === 'repel') {
      addItem(s, id, -1);
      s.repel = 100;
      setOverlay(null);
      say('', '쑥향을 피웠다! 한동안 약한 깨비가 다가오지 않는다.');
      return runQueue();
    }
    if (id === 'bike') {
      const m = map();
      if (s.surfing || m.terrain === 'indoor' || m.terrain === 'cave' || m.terrain === 'tower') return setNote('여기서는 두바퀴를 탈 수 없다.');
      s.biking = !s.biking;
      setOverlay(null);
      sound.sfx(s.biking ? 'jump' : 'click');
      say('', s.biking ? `${s.name}은(는) 두바퀴에 올라탔다! 씽씽~` : '두바퀴에서 내렸다.');
      return runQueue();
    }
    if (id === 'rod') {
      const m = map();
      const [dx, dy] = ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const)[s.dir];
      if (tile(m, s.x + dx, s.y + dy) !== '~' || !m.water?.length) return setNote('물가를 바라보고 써야 한다.');
      setOverlay(null);
      const now = s.forceTime ?? timeOfDay();
      const list = m.water.filter((e) => !e.time || e.time === now);
      queue.current.push({ who: '', say: '낚싯대를 드리웠다…… 찌가 살랑살랑……' });
      if (!list.length || rng() < 0.3) queue.current.push({ who: '', say: '아무것도 걸리지 않았다.' });
      else {
        let w = rng() * list.reduce((a, e) => a + e.w, 0);
        const e = list.find((x) => (w -= x.w) < 0) ?? list[0];
        sound.sfx('special');
        queue.current.push({ who: '', say: '앗! 무언가 걸렸다!' }, { wild: e.no, lv: e.min + Math.floor(rng() * (e.max - e.min + 1)) });
      }
      return runQueue();
    }
    if (it.kind === 'ball' || it.kind === 'key') return setNote(it.desc);
    setOverlay({ k: 'party', mode: 'item', item: id });
  }
}

const SPEED_KEY = 'kkaebi-speed';
function loadSpeed(): number {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    return v === 2 || v === 3 ? v : 1;
  } catch {
    return 1;
  }
}
/** 오른쪽 위 배속 표시 */
function speedBadge(ctx: CanvasRenderingContext2D, mult: number) {
  ctx.fillStyle = '#202030';
  ctx.fillRect(W - 112, 10, 100, 34);
  ctx.fillStyle = '#f8d048';
  ctx.fillRect(W - 108, 14, 92, 26);
  // 빨리감기 세모 두 개
  ctx.fillStyle = '#202030';
  for (const ox of [0, 14]) {
    ctx.beginPath();
    ctx.moveTo(W - 100 + ox, 19);
    ctx.lineTo(W - 88 + ox, 27);
    ctx.lineTo(W - 100 + ox, 35);
    ctx.fill();
  }
  text(ctx, `×${mult}`, W - 40, 16, 20, '#202030', 'center');
}

type Wipe = 'swirl' | 'bars' | 'legend';
/** 느낌표가 떠 있는 시간 · 번쩍임이 끝나는 때 · 덮기가 끝나는 때 */
const ENC_MARK = 0.5;
const ENC_FLASH = 0.78;
const ENC_END = 1.42;

function encounterFx(ctx: CanvasRenderingContext2D, style: Wipe, t: number) {
  // 두 번 번쩍
  if (t >= ENC_MARK && t < ENC_FLASH) {
    const k = (t - ENC_MARK) / (ENC_FLASH - ENC_MARK);
    const a = Math.max(0, Math.sin(k * Math.PI * 2)) * 0.85;
    ctx.fillStyle = style === 'legend' ? `rgba(255,240,180,${a})` : `rgba(255,255,255,${a})`;
    ctx.fillRect(0, 0, W, H);
    // 반전처럼 어둡게
    if (Math.sin(k * Math.PI * 2) < 0) {
      ctx.fillStyle = `rgba(0,0,30,${-Math.sin(k * Math.PI * 2) * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
  if (t < ENC_FLASH) return;
  const k = Math.min(1, (t - ENC_FLASH) / (ENC_END - ENC_FLASH - 0.06));
  ctx.fillStyle = '#000';
  const S = 32;
  if (style === 'bars') {
    // 줄무늬가 번갈아 좌우에서 밀려 들어온다
    for (let i = 0; i * S < H; i++) {
      const d = Math.min(1, Math.max(0, k * 1.5 - (i % 4) * 0.12));
      const w = W * d * d * (3 - 2 * d);
      if (i % 2) ctx.fillRect(W - w, i * S, w, S);
      else ctx.fillRect(0, i * S, w, S);
    }
    return;
  }
  // 소용돌이: 바깥에서 안쪽으로 빙글빙글 칸이 채워진다
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.hypot(cx, cy);
  for (let y = 0; y < H; y += S)
    for (let x = 0; x < W; x += S) {
      const dx = x + S / 2 - cx;
      const dy = y + S / 2 - cy;
      const ang = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      const rr = Math.hypot(dx, dy) / R;
      const order = style === 'legend' ? 1 - rr : (1 - rr) * 0.55 + ((ang + rr * 1.5) % 1) * 0.45;
      const d = Math.min(1, Math.max(0, (k * 1.18 - order) / 0.18));
      if (d <= 0) continue;
      const sz = S * d;
      ctx.fillRect(x + (S - sz) / 2, y + (S - sz) / 2, Math.ceil(sz), Math.ceil(sz));
    }
}

function stripes(ctx: CanvasRenderingContext2D, t: number) {
  const k = Math.min(1, t / 0.4);
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 24) ctx.fillRect(0, y, W, 24 * k);
}

function drawEvo(ctx: CanvasRenderingContext2D, ev: { from: number; to: number; t: number; done?: boolean; cancelled?: boolean }, time: number) {
  const t = ev.t;
  const cx = W / 2;
  const cy = H / 2 - 40;
  const glowing = !ev.done && t > 1;
  // 배경: 어두워졌다가 빛줄기가 돈다
  ctx.fillStyle = '#0c0c1c';
  ctx.fillRect(0, 0, W, H);
  const power = ev.done ? Math.max(0, 1 - (t - 4.5) * 0.8) : Math.min(1, Math.max(0, (t - 0.6) / 3));
  if (power > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.6);
    for (let i = 0; i < 16; i++) {
      ctx.rotate((Math.PI * 2) / 16);
      ctx.fillStyle = i % 2 ? `rgba(120,160,255,${0.16 * power})` : `rgba(255,240,170,${0.22 * power})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(700, -60);
      ctx.lineTo(700, 60);
      ctx.fill();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 300);
    g.addColorStop(0, `rgba(255,255,230,${0.7 * power})`);
    g.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const a = byNo(ev.from);
  const b = byNo(ev.to);
  if (glowing) {
    // 하얗게 빛나는 몸이 옛 모습과 새 모습 사이를 점점 빨리 오간다
    const speed = 1.6 + (t - 1) ** 2 * 1.4;
    const w = Math.sin((t - 1) * speed * Math.PI);
    const k = (w + 1) / 2;
    const sa = 6 * (1 - k * 0.35);
    const sb = 6 * (0.65 + k * 0.35);
    drawKkaebi(ctx, tinted(w > 0 ? b : a, '#ffffff'), cx, H / 2 + 80, w > 0 ? sb : sa);
    if (t < 1.4) {
      ctx.globalAlpha = 1 - (t - 1) / 0.4;
      drawKkaebi(ctx, kkaebiSprite(a), cx, H / 2 + 80, 6);
      ctx.globalAlpha = 1;
    }
  } else {
    const show = ev.done && !ev.cancelled ? b : a;
    const bounce = ev.done && !ev.cancelled ? Math.max(0, 1 - (t - 4.5) * 2) * Math.abs(Math.sin((t - 4.5) * 12)) * 0.12 : 0;
    drawKkaebi(ctx, kkaebiSprite(show, false, Math.floor(time * 1.6) % 2), cx, H / 2 + 80, 6, false, 1 - bounce);
  }
  // 빛 알갱이: 진화 중엔 빨려 들어가고, 끝나면 터져 나온다
  if (glowing) {
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + time * 1.5;
      const d = 320 - ((t * 110 + i * 37) % 320);
      ctx.fillStyle = i % 3 ? '#fff6b0' : '#a8c8ff';
      const sz = 3 + (d / 320) * 5;
      ctx.fillRect(cx + Math.cos(ang) * d - sz / 2, cy + Math.sin(ang) * d * 0.8 - sz / 2, sz, sz);
    }
  }
  if (ev.done && !ev.cancelled && t < 6.5) {
    const k = (t - 4.5) / 2;
    for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2;
      const d = 40 + k * (260 + (i % 5) * 30);
      const x = cx + Math.cos(ang) * d;
      const y = cy + Math.sin(ang) * d * 0.8 + k * k * 120;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = ['#fff6b0', '#ffb0d0', '#b0e0ff', '#c8ffb0'][i % 4];
      const sz = 10 * (1 - k) + 3;
      ctx.fillRect(x - sz / 2, y - 1.5, sz, 3);
      ctx.fillRect(x - 1.5, y - sz / 2, 3, sz);
    }
    ctx.globalAlpha = 1;
  }
  // 바뀌는 순간 하얗게 번쩍
  if (ev.done && t < 5.3) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (t - 4.5) / 0.8)})`;
    ctx.fillRect(0, 0, W, H);
  }
  box(ctx, 16, H - 112, W - 32, 100);
  text(ctx, ev.done ? (ev.cancelled ? '진화가 멈췄다.' : '') : t < 1 ? `어라…? ${a.name}의 모습이……!` : 'B 버튼(X)을 누르면 진화를 멈출 수 있다', 44, H - 84, 22);
}

// ---------------- 가방 ----------------
function Bag({ s, battle, wild, onCancel, onUse }: { s: GameState; battle: boolean; wild: boolean; onCancel: () => void; onUse: (id: string) => void }) {
  const ids = Object.keys(s.bag).filter((id) => s.bag[id] > 0 && ITEMS[id] && (!battle || (ITEMS[id].kind !== 'key' && ITEMS[id].kind !== 'repel' && ITEMS[id].kind !== 'candy' && (ITEMS[id].kind !== 'ball' || wild))));
  return (
    <Menu
      title={`가방 · ${s.money.toLocaleString()}냥`}
      onCancel={onCancel}
      options={[
        ...ids.map((id) => ({ label: `${ITEMS[id].name} ×${s.bag[id]}`, sub: ITEMS[id].desc, pick: () => onUse(id) })),
        { label: '돌아가기', pick: onCancel },
      ]}
      note={ids.length ? undefined : '가방이 비어 있다.'}
    />
  );
}

// ---------------- 가게 ----------------
function Shop({ s, items, onClose }: { s: GameState; items: string[]; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [, force] = useState(0);
  return (
    <Menu
      title={`가진 돈 ${s.money.toLocaleString()}냥`}
      onCancel={onClose}
      options={[
        ...items.map((raw) => {
          const tm = raw.startsWith('tm:') ? raw.slice(3) : undefined;
          const name = tm ? `기술 부적 · ${MOVES[tm].name}` : ITEMS[raw].name;
          const price = tm ? 3000 : ITEMS[raw].price;
          const owned = tm ? (s.tms.includes(tm) ? '가지고 있음' : '') : `가진 수 ${s.bag[raw] ?? 0}`;
          return {
            label: `${name}  ${price.toLocaleString()}냥`,
            sub: owned,
            color: tm ? TYPE_COLOR[MOVES[tm].type] : undefined,
            disabled: !!tm && s.tms.includes(tm),
            pick: () => {
              if (s.money < price) return setNote('돈이 모자랍니다!');
              s.money -= price;
              if (tm) s.tms.push(tm);
              else addItem(s, raw, 1);
              sound.sfx('catch');
              setNote(`${name}을(를) 샀다! ${tm ? '' : ITEMS[raw].desc}`);
              force((x) => x + 1);
            },
          };
        }),
        { label: '그만두기', pick: onClose },
      ]}
      note={note || '무엇을 사시겠어요?'}
    />
  );
}

// ---------------- 보관함 ----------------
function PC({ s, onClose }: { s: GameState; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'take' | 'put'>('menu');
  const [note, setNote] = useState('');
  const [, force] = useState(0);
  if (mode === 'take')
    return (
      <Menu
        title={`보관함 (${s.box.length}마리)`}
        onCancel={() => setMode('menu')}
        options={[
          ...s.box.map((m, i) => ({
            label: `${nameOf(m)} Lv${m.lv}`,
            sub: sp(m).types.map((t) => t).join('/'),
            pick: () => {
              if (s.party.length >= 6) return setNote('파티가 가득 찼다.');
              s.party.push(...s.box.splice(i, 1));
              setNote(`${nameOf(m)}을(를) 데려왔다.`);
              force((x) => x + 1);
            },
          })),
          { label: '돌아가기', pick: () => setMode('menu') },
        ]}
        note={note || (s.box.length ? undefined : '맡긴 깨비가 없다.')}
      />
    );
  if (mode === 'put')
    return (
      <PartyPick
        party={s.party}
        title="어느 깨비를 맡길까?"
        note={note}
        onCancel={() => setMode('menu')}
        onPick={(i) => {
          if (s.party.filter((m) => m.hp > 0).length <= 1 && s.party[i].hp > 0) return setNote('싸울 수 있는 깨비가 한 마리는 있어야 한다.');
          const m = s.party.splice(i, 1)[0];
          healMon(m);
          s.box.push(m);
          setNote(`${nameOf(m)}을(를) 맡겼다.`);
          force((x) => x + 1);
        }}
      />
    );
  return (
    <Menu
      title="깨비 보관함"
      onCancel={onClose}
      options={[
        { label: '깨비 데려오기', pick: () => setMode('take') },
        { label: '깨비 맡기기', disabled: s.party.length <= 1, pick: () => setMode('put') },
        { label: '끝내기', pick: onClose },
      ]}
      note="보관함에 맡긴 깨비는 기운을 되찾는다."
    />
  );
}

// ---------------- 첫 깨비 ----------------
function Starter({ onPick }: { onPick: (no: number) => void }) {
  const [sel, setSel] = useState(0);
  const [ask, setAsk] = useState(false);
  useMenuKeys((k) => {
    if (ask) return;
    if (k === 'left') setSel((sel + 2) % 3);
    else if (k === 'right') setSel((sel + 1) % 3);
    else if (k === 'ok') setAsk(true);
  });
  const no = STARTERS[sel];
  const spc = byNo(no);
  return (
    <div className="kpanel kstarter">
      <div className="kmenu-title">탁자 위에 호리병이 세 개 있다. 어느 깨비로 할까?</div>
      <div className="krow">
        {STARTERS.map((n, i) => (
          <button key={n} className={`kcard ${i === sel ? 'on' : ''}`} onClick={() => (i === sel ? setAsk(true) : setSel(i))}>
            <Sprite no={n} size={150} />
            <b>{byNo(n).name}</b>
            <span>
              {byNo(n).types.map((t) => (
                <TypeTag key={t} t={t} />
              ))}
            </span>
          </button>
        ))}
      </div>
      <p className="knote">{spc.dex}</p>
      {ask && (
        <Menu
          place="center"
          title={`${spc.name}(으)로 할까?`}
          onCancel={() => setAsk(false)}
          options={[
            { label: '이 깨비로 할래!', pick: () => onPick(no) },
            { label: '다시 생각할래', pick: () => setAsk(false) },
          ]}
        />
      )}
    </div>
  );
}

// ---------------- 엔딩 ----------------
function Ending({ s, onContinue, onTitle }: { s: GameState; onContinue: () => void; onTitle: () => void }) {
  return (
    <div className="kpanel kending">
      <h2>🏆 명예의 전당</h2>
      <p>
        새로운 깨비 왕 <b>{s.name}</b>! 플레이 {Math.floor(s.playSec / 3600)}시간 {Math.floor((s.playSec % 3600) / 60)}분 · 도감 {s.caught.length}/{SPECIES.length}
      </p>
      <div className="kparty hof">
        {s.party.map((m, i) => (
          <div key={i} className="kmon on">
            <Sprite no={m.no} size={88} shiny={m.shiny} />
            <span className="kname">
              {nameOf(m)} <small>Lv{m.lv}</small>
            </span>
          </div>
        ))}
      </div>
      <p className="kdim">
        아직 만나지 못한 숨은 깨비가 있을지도 몰라요. 금빛탑, 소용돌이동굴, 그믐숲… 그리고 도감 {SPECIES.length}종 완성에 도전해 보세요!
      </p>
      <div className="row">
        <button className="primary" onClick={onContinue}>
          계속 모험하기
        </button>
        <button onClick={onTitle}>타이틀로</button>
      </div>
    </div>
  );
}

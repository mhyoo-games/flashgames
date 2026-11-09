import { useEffect, useRef, useState } from 'react';
import { sound } from '../../core/audio';
import { expAt, maxHp, nameOf, sp, statOf, type Mon } from './mon';
import { josa } from './josa';
import { MOVES, STATUS_NAME } from './moves';
import { SPECIES } from './species';
import { kkaebiSprite, silhouette } from './sprite';
import { TYPE_COLOR, TYPE_NAME, type Type } from './types';

export const KEYS: Record<string, string> = {
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
  ShiftLeft: 'run',
  ShiftRight: 'run',
};

/** 메뉴 키 처리 (열려 있는 동안 게임보다 먼저 받는다) */
export function useMenuKeys(handler: (k: string) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = KEYS[e.code];
      if (!k || k === 'run') return;
      e.preventDefault();
      e.stopPropagation();
      ref.current(k);
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, []);
}

export interface Opt {
  label: string;
  sub?: string;
  disabled?: boolean;
  pick: () => void;
  color?: string;
}

export function Menu({ title, options, onCancel, note, place = 'right', cols = 1 }: { title?: string; options: Opt[]; onCancel?: () => void; note?: string; place?: 'right' | 'bottom' | 'center' | 'left'; cols?: number }) {
  const [sel, setSel] = useState(0);
  const cur = Math.min(sel, options.length - 1);
  useMenuKeys((k) => {
    const n = options.length;
    if (k === 'up') setSel((cur - cols + n) % n);
    else if (k === 'down') setSel((cur + cols) % n);
    else if (k === 'left' && cols > 1) setSel((cur - 1 + n) % n);
    else if (k === 'right' && cols > 1) setSel((cur + 1) % n);
    else if (k === 'ok' && options[cur] && !options[cur].disabled) {
      sound.sfx('click');
      options[cur].pick();
    } else if (k === 'cancel' && onCancel) onCancel();
  });
  return (
    <div className={`kmenu-wrap ${place}`}>
      <div className="kmenu" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {title && <div className="kmenu-title" style={{ gridColumn: `span ${cols}` }}>{josa(title)}</div>}
        {options.map((o, i) => (
          <button key={o.label + i} className={i === cur ? 'on' : ''} disabled={o.disabled} onPointerEnter={() => setSel(i)} onClick={() => !o.disabled && o.pick()} style={o.color ? { borderLeft: `6px solid ${o.color}` } : undefined}>
            <span>{i === cur ? '▶' : ' '}</span> {o.label}
            {o.sub && <small>{o.sub}</small>}
          </button>
        ))}
        {note && (
          <p className="knote" style={{ gridColumn: `span ${cols}` }}>
            {josa(note)}
          </p>
        )}
      </div>
    </div>
  );
}

export function Sprite({ no, back = false, size = 96, shiny = false, unknown = false }: { no: number; back?: boolean; size?: number; shiny?: boolean; unknown?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, size, size);
    c.imageSmoothingEnabled = false;
    const s = SPECIES[no - 1];
    c.drawImage(unknown ? silhouette(s) : kkaebiSprite(s, back, 0, shiny), 0, 0, size, size);
  }, [no, back, size, shiny, unknown]);
  return <canvas ref={ref} width={size} height={size} className="ksprite" />;
}

export function TypeTag({ t }: { t: Type }) {
  return (
    <span className="ktype" style={{ background: TYPE_COLOR[t] }}>
      {TYPE_NAME[t]}
    </span>
  );
}

export function HpBar({ m }: { m: Mon }) {
  const f = Math.max(0, m.hp / maxHp(m));
  return (
    <span className="khp">
      <i style={{ width: `${f * 100}%`, background: f > 0.5 ? '#40c860' : f > 0.2 ? '#e8c030' : '#e84838' }} />
    </span>
  );
}

/** 파티 목록 고르기 */
export function PartyPick({ party, title, onPick, onCancel, disabled, note }: { party: Mon[]; title: string; onPick: (i: number) => void; onCancel?: () => void; disabled?: (m: Mon, i: number) => boolean; note?: string }) {
  const [sel, setSel] = useState(0);
  useMenuKeys((k) => {
    if (k === 'up') setSel((sel - 1 + party.length) % party.length);
    else if (k === 'down') setSel((sel + 1) % party.length);
    else if (k === 'ok' && !disabled?.(party[sel], sel)) onPick(sel);
    else if (k === 'cancel') onCancel?.();
  });
  return (
    <div className="kpanel">
      <div className="kmenu-title">{josa(title)}</div>
      <div className="kparty">
        {party.map((m, i) => (
          <button key={i} className={`kmon ${i === sel ? 'on' : ''}`} disabled={disabled?.(m, i)} onPointerEnter={() => setSel(i)} onClick={() => !disabled?.(m, i) && onPick(i)}>
            <Sprite no={m.no} size={56} shiny={m.shiny} />
            <span className="kname">
              {nameOf(m)} <small>Lv{m.lv}</small>
              {m.status && <b className="kst">{STATUS_NAME[m.status]}</b>}
              {m.hp <= 0 && <b className="kst">기절</b>}
            </span>
            <HpBar m={m} />
            <small className="knum">
              {m.hp}/{maxHp(m)}
            </small>
          </button>
        ))}
      </div>
      {note && <p className="knote">{josa(note)}</p>}
      {onCancel && (
        <button className="kback" onClick={onCancel}>
          돌아가기 (X)
        </button>
      )}
    </div>
  );
}

const STAT_LABEL = ['HP', '공격', '방어', '특수공격', '특수방어', '스피드'];
export function StatusView({ m, onClose }: { m: Mon; onClose: () => void }) {
  useMenuKeys((k) => (k === 'ok' || k === 'cancel') && onClose());
  const s = sp(m);
  const next = m.lv >= 100 ? 0 : expAt(m.lv + 1) - m.exp;
  return (
    <div className="kpanel kstatus" onClick={onClose}>
      <div className="krow">
        <Sprite no={m.no} size={160} shiny={m.shiny} />
        <div>
          <h3>
            No.{String(s.no).padStart(3, '0')} {nameOf(m)} <small>Lv {m.lv}</small>
          </h3>
          <p>
            {s.types.map((t) => (
              <TypeTag key={t} t={t} />
            ))}{' '}
            {m.shiny && <b className="kshiny">★ 빛나는 깨비</b>}
          </p>
          <p>
            HP {m.hp}/{maxHp(m)} {m.status ? `· ${STATUS_NAME[m.status]}` : ''}
          </p>
          <p className="kdim">다음 레벨까지 {next.toLocaleString()} · {s.evolveAt ? `Lv ${s.evolveAt}에 진화` : s.legend ? '전설의 깨비' : '마지막 모습'}</p>
          <table className="kstats">
            <tbody>
              {STAT_LABEL.map((l, i) => (
                <tr key={l}>
                  <td>{l}</td>
                  <td>{statOf(m, i)}</td>
                  <td>
                    <i style={{ width: `${Math.min(100, statOf(m, i) / 3)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="kmoves">
        {m.moves.map((x) => {
          const mv = MOVES[x.id];
          return (
            <div key={x.id} className="kmove" style={{ borderColor: TYPE_COLOR[mv.type] }}>
              <b>{mv.name}</b> <TypeTag t={mv.type} /> <small>{mv.cat === 'phys' ? '물리' : mv.cat === 'spec' ? '특수' : '변화'}</small>
              <small>
                위력 {mv.power || '-'} · 명중 {mv.acc} · PP {x.pp}/{mv.pp}
              </small>
            </div>
          );
        })}
      </div>
      <p className="kdim">{s.dex}</p>
    </div>
  );
}

/** 도감 */
export function Dex({ seen, caught, onClose }: { seen: number[]; caught: number[]; onClose: () => void }) {
  const [sel, setSel] = useState(0);
  const [detail, setDetail] = useState(false);
  const cols = 8;
  const page = Math.floor(sel / (cols * 3));
  useMenuKeys((k) => {
    if (detail) {
      if (k === 'cancel' || k === 'ok') setDetail(false);
      else if (k === 'right' || k === 'down') setSel(Math.min(SPECIES.length - 1, sel + 1));
      else if (k === 'left' || k === 'up') setSel(Math.max(0, sel - 1));
      return;
    }
    if (k === 'right') setSel(Math.min(SPECIES.length - 1, sel + 1));
    else if (k === 'left') setSel(Math.max(0, sel - 1));
    else if (k === 'down') setSel(Math.min(SPECIES.length - 1, sel + cols));
    else if (k === 'up') setSel(Math.max(0, sel - cols));
    else if (k === 'ok' && seen.includes(sel + 1)) setDetail(true);
    else if (k === 'cancel') onClose();
  });
  const s = SPECIES[sel];
  if (detail)
    return (
      <div className="kpanel kdex-detail" onClick={() => setDetail(false)}>
        <div className="krow">
          <Sprite no={s.no} size={200} unknown={!caught.includes(s.no)} />
          <div>
            <h3>
              No.{String(s.no).padStart(3, '0')} {s.name}
            </h3>
            <p>
              {s.types.map((t) => (
                <TypeTag key={t} t={t} />
              ))}
            </p>
            {caught.includes(s.no) ? (
              <>
                <p>{s.dex}</p>
                <p className="kdim">
                  {s.stage === 1 ? '첫 모습' : s.stage === 2 ? '두 번째 모습' : s.legend ? '전설' : '마지막 모습'}
                  {s.evolveAt ? ` · Lv ${s.evolveAt}에 ${SPECIES[s.evolveTo! - 1].name}(으)로 진화` : ''}
                </p>
              </>
            ) : (
              <p className="kdim">아직 잡지 않았다. 잡으면 자세한 내용이 기록된다.</p>
            )}
          </div>
        </div>
        <p className="kdim">← → 다른 깨비 · X 돌아가기</p>
      </div>
    );
  const start = page * cols * 3;
  return (
    <div className="kpanel">
      <div className="kmenu-title">
        깨비 도감 — 본 깨비 {seen.length} · 잡은 깨비 {caught.length} / {SPECIES.length}
      </div>
      <div className="kdex" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {SPECIES.slice(start, start + cols * 3).map((x, i) => (
          <button key={x.no} className={start + i === sel ? 'on' : ''} onClick={() => (start + i === sel && seen.includes(x.no) ? setDetail(true) : setSel(start + i))}>
            {seen.includes(x.no) ? <Sprite no={x.no} size={64} unknown={!caught.includes(x.no)} /> : <span className="kq">?</span>}
            <small>
              {String(x.no).padStart(3, '0')} {seen.includes(x.no) ? x.name : '???'}
              {caught.includes(x.no) && ' ●'}
            </small>
          </button>
        ))}
      </div>
      <p className="knote">
        {page + 1} / {Math.ceil(SPECIES.length / (cols * 3))} 쪽 · 방향키로 고르기 · Z 자세히 · X 닫기
      </p>
    </div>
  );
}

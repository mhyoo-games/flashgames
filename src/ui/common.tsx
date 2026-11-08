import { useEffect, useState, type ReactNode } from 'react';
import { sound } from '../core/audio';

export function useSound() {
  const [, set] = useState(0);
  useEffect(() => sound.subscribe(() => set((n) => n + 1)), []);
  return sound.settings;
}

export function SoundControls() {
  const s = useSound();
  return (
    <div className="sound-controls">
      <button className={`chip ${s.music ? 'on' : ''}`} onClick={() => sound.set({ music: !s.music })} title="배경음악">
        {s.music ? '🎵' : '🔇'} 음악
      </button>
      <button className={`chip ${s.sfx ? 'on' : ''}`} onClick={() => sound.set({ sfx: !s.sfx })} title="효과음">
        {s.sfx ? '🔊' : '🔈'} 효과음
      </button>
      <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => sound.set({ volume: Number(e.target.value) })} aria-label="음량" />
    </div>
  );
}

export function Shell({ title, onBack, children, side }: { title: string; onBack: () => void; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell-head">
        <button className="back" onClick={onBack}>
          ← 오락실
        </button>
        <h1>{title}</h1>
        {side}
        <SoundControls />
      </header>
      {children}
    </div>
  );
}

/** 캔버스 게임 루프: 매 프레임 dt(초)를 넘겨준다 */
export function useLoop(fn: (dt: number) => void, active = true) {
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      fn(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // fn은 ref로 넘겨받는 것을 전제로 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

// 소리: 배경음악 연주 + 효과음. 모두 Web Audio로 합성 (음원 파일 없음)
import { composeBar, newComposer, SONGS, type Composer, type NoteEvent, type SongId } from './music.ts';
import { random } from './rng.ts';
import { load, save } from './storage.ts';

interface Settings {
  music: boolean;
  sfx: boolean;
  volume: number;
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Sfx =
  | 'punch'
  | 'bighit'
  | 'block'
  | 'swing'
  | 'jump'
  | 'special'
  | 'ko'
  | 'fight'
  | 'win'
  | 'lose'
  | 'acorn'
  | 'power'
  | 'catch'
  | 'bonus'
  | 'death'
  | 'clear'
  | 'start'
  | 'extra'
  | 'click';

class Track {
  readonly id: SongId;
  readonly bus: GainNode;
  readonly composer: Composer;
  next: number;
  constructor(ctx: BaseAudioContext, out: AudioNode, id: SongId, start: number) {
    this.id = id;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(out);
    this.composer = newComposer(SONGS[id]);
    this.next = start;
  }
}

export class Sound {
  ctx?: BaseAudioContext;
  private master?: GainNode;
  private musicOut?: GainNode;
  private sfxOut?: GainNode;
  private noise?: AudioBuffer;
  private waves = new Map<number, PeriodicWave>();
  track?: Track;
  private wanted: SongId | null = 'lobby';
  private listeners = new Set<() => void>();
  settings: Settings = load<Settings>('sound', { music: true, sfx: true, volume: 0.6 });

  unlock() {
    if (!this.ctx) {
      this.setup(new AudioContext());
      window.setInterval(() => this.schedule(), 150);
      this.play(this.wanted);
    }
    void (this.ctx as AudioContext).resume?.();
  }

  setup(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.volume * 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    this.master.connect(comp).connect(ctx.destination);
    this.musicOut = ctx.createGain();
    this.musicOut.gain.value = this.settings.music ? 1 : 0;
    this.musicOut.connect(this.master);
    this.sfxOut = ctx.createGain();
    this.sfxOut.gain.value = this.settings.sfx ? 1 : 0;
    this.sfxOut.connect(this.master);
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  /** 곡 바꾸기 (null이면 끄기) */
  play(id: SongId | null) {
    this.wanted = id;
    const ctx = this.ctx;
    if (!ctx || this.track?.id === id) return;
    const now = ctx.currentTime;
    const old = this.track;
    if (old) {
      old.bus.gain.cancelScheduledValues(now);
      old.bus.gain.setValueAtTime(old.bus.gain.value, now);
      old.bus.gain.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => old.bus.disconnect(), 4000);
    }
    this.track = undefined;
    if (!id) return;
    const t = new Track(ctx, this.musicOut!, id, now + 0.1);
    t.bus.gain.setValueAtTime(0, now);
    t.bus.gain.linearRampToValueAtTime(1, now + 0.8);
    this.track = t;
  }

  set(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    save('sound', this.settings);
    const ctx = this.ctx;
    if (ctx) {
      this.master!.gain.setTargetAtTime(this.settings.volume * 0.7, ctx.currentTime, 0.05);
      this.musicOut!.gain.setTargetAtTime(this.settings.music ? 1 : 0, ctx.currentTime, 0.05);
      this.sfxOut!.gain.setTargetAtTime(this.settings.sfx ? 1 : 0, ctx.currentTime, 0.02);
    }
    for (const fn of this.listeners) fn();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  schedule(ahead = 0.6) {
    const ctx = this.ctx;
    const t = this.track;
    if (!ctx || !t || ctx.state !== 'running') return;
    const song = SONGS[t.id];
    const beat = 60 / song.bpm;
    if (t.next < ctx.currentTime - 0.5) t.next = ctx.currentTime + 0.05;
    while (t.next < ctx.currentTime + ahead) {
      for (const e of composeBar(t.composer, random)) this.note(t.bus, e, t.next, beat, song.swing);
      t.next += beat * 4;
    }
  }

  // ---- 악기 ----
  /** 네모파 (펄스 폭 조절) */
  private pulse(duty: number): PeriodicWave {
    const key = Math.round(duty * 100);
    const cached = this.waves.get(key);
    if (cached) return cached;
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty));
    const w = this.ctx!.createPeriodicWave(real, imag);
    this.waves.set(key, w);
    return w;
  }

  private note(out: AudioNode, e: NoteEvent, bar: number, beat: number, swing: number) {
    const swung = Math.abs((e.beat % 1) - 0.5) < 0.01 ? e.beat + swing * 0.5 : e.beat;
    const t = bar + swung * beat;
    const d = e.dur * beat;
    const ctx = this.ctx!;
    switch (e.inst) {
      case 'lead':
        return this.tone(out, t, d, mtof(e.midi), e.vel * 0.11, this.pulse(0.25), 0.01, 0.6, true);
      case 'arp':
        return this.tone(out, t, d, mtof(e.midi), e.vel * 0.06, this.pulse(0.125), 0.002, 0.3, false);
      case 'bass': {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(e.midi);
        const g = ctx.createGain();
        g.gain.setValueAtTime(e.vel * 0.32, t);
        g.gain.setValueAtTime(e.vel * 0.32, t + d * 0.8);
        g.gain.linearRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + d + 0.02);
        return;
      }
      case 'kick': {
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(e.vel * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.2);
        return;
      }
      case 'snare':
        return this.noiseHit(out, t, 0.14, 1800, 'bandpass', e.vel * 0.3);
      case 'hat':
        return this.noiseHit(out, t, 0.04, 8000, 'highpass', e.vel * 0.12);
    }
  }

  private tone(out: AudioNode, t: number, d: number, freq: number, vol: number, wave: PeriodicWave, attack: number, sustain: number, vibrato: boolean) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.setPeriodicWave(wave);
    o.frequency.value = freq;
    if (vibrato && d > 0.25) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(freq * 0.008, t + d);
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + d + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.linearRampToValueAtTime(vol * sustain, t + Math.min(d, 0.15));
    g.gain.setValueAtTime(vol * sustain, t + d * 0.9);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.02);
  }

  private noiseHit(out: AudioNode, t: number, d: number, freq: number, type: BiquadFilterType, vol: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise!;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + d + 0.02);
  }

  /** 짧은 음 여러 개 (효과음용) */
  private blips(notes: [number, number][], step: number, vol: number, duty = 0.5) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const t0 = ctx.currentTime + 0.005;
    notes.forEach(([midi, len], i) => this.tone(this.sfxOut!, t0 + i * step, len, mtof(midi), vol, this.pulse(duty), 0.003, 0.7, false));
  }

  private sweep(from: number, to: number, d: number, vol: number, type: OscillatorType = 'square') {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(this.sfxOut!);
    o.start(t);
    o.stop(t + d + 0.02);
  }

  private thud(vol: number, d: number, freq: number) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    this.noiseHit(this.sfxOut!, ctx.currentTime + 0.003, d, freq, 'lowpass', vol);
  }

  sfx(name: Sfx) {
    switch (name) {
      case 'punch':
        this.thud(0.7, 0.1, 1400);
        return this.sweep(220, 80, 0.08, 0.25);
      case 'bighit':
        this.thud(0.9, 0.22, 900);
        return this.sweep(180, 40, 0.2, 0.35);
      case 'block':
        return this.blips([[88, 0.04], [83, 0.06]], 0.035, 0.12, 0.25);
      case 'swing':
        return this.ctx && this.settings.sfx ? this.noiseHit(this.sfxOut!, this.ctx.currentTime, 0.08, 3000, 'bandpass', 0.18) : undefined;
      case 'jump':
        return this.sweep(300, 700, 0.12, 0.1);
      case 'special':
        this.sweep(200, 1200, 0.3, 0.15, 'sawtooth');
        return this.thud(0.5, 0.3, 2000);
      case 'ko':
        return this.blips([[76, 0.15], [72, 0.15], [67, 0.15], [60, 0.5]], 0.14, 0.14);
      case 'fight':
        return this.blips([[72, 0.08], [79, 0.2]], 0.09, 0.14);
      case 'win':
      case 'clear':
        return this.blips([[72, 0.1], [76, 0.1], [79, 0.1], [84, 0.35]], 0.1, 0.14);
      case 'lose':
      case 'death':
        return this.blips([[71, 0.12], [70, 0.12], [69, 0.12], [68, 0.45]], 0.13, 0.12);
      case 'acorn':
        return this.blips([[84, 0.035]], 0, 0.06, 0.25);
      case 'power':
        return this.sweep(300, 1500, 0.35, 0.1, 'triangle');
      case 'catch':
        return this.blips([[79, 0.05], [84, 0.05], [91, 0.1]], 0.05, 0.12);
      case 'bonus':
      case 'extra':
        return this.blips([[84, 0.06], [88, 0.06], [91, 0.06], [96, 0.15]], 0.06, 0.1);
      case 'start':
        return this.blips([[67, 0.1], [72, 0.1], [76, 0.1], [79, 0.2]], 0.11, 0.1);
      case 'click':
        return this.blips([[90, 0.03]], 0, 0.05, 0.25);
    }
  }
}

export const sound = new Sound();

/** 미리 듣기용: 곡을 녹음한다 */
export async function renderSong(id: SongId, seconds: number): Promise<AudioBuffer> {
  const s = new Sound();
  s.settings = { music: true, sfx: true, volume: 0.8 };
  const ctx = new OfflineAudioContext(2, 44100 * seconds, 44100);
  s.setup(ctx);
  s.play(id);
  const t = s.track!;
  const song = SONGS[id];
  const beat = 60 / song.bpm;
  while (t.next < seconds) {
    for (const e of composeBar(t.composer, random)) s['note'](t.bus, e, t.next, beat, song.swing);
    t.next += beat * 4;
  }
  return ctx.startRendering();
}

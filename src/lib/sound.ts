// Synthesised sound effects using Web Audio API — no audio files shipped.
// Each effect is a short envelope-shaped oscillator with a specific timbre.
//
// Toggle is persisted in localStorage as 'ww:sound' = '1' (on) / '0' (off).

const SOUND_KEY = 'ww:sound';

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch { return true; }
}

export function setSoundEnabled(on: boolean): void {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  duration?: number;   // seconds
  attack?: number;
  release?: number;
  gain?: number;
  freqEnd?: number;    // for pitch sweeps
}

function tone({ freq, type = 'sine', duration = 0.15, attack = 0.005, release = 0.08, gain = 0.15, freqEnd }: ToneOpts) {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
  osc.connect(g).connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + release + 0.02);
}

function chord(freqs: number[], opts: Partial<ToneOpts> = {}) {
  freqs.forEach((f) => tone({ freq: f, ...opts }));
}

// ── Library ─────────────────────────────────────────────────────

export const sfx = {
  click() { tone({ freq: 800, type: 'square', duration: 0.04, gain: 0.07 }); },
  build() { chord([440, 660], { type: 'triangle', duration: 0.12, gain: 0.08 }); },
  speech() { tone({ freq: 520, type: 'sawtooth', duration: 0.25, gain: 0.06, freqEnd: 800 }); },
  daytick() { chord([220, 330, 440], { type: 'sine', duration: 0.4, gain: 0.06 }); },
  launch() { tone({ freq: 200, freqEnd: 1200, type: 'sawtooth', duration: 0.5, gain: 0.1 }); },
  impact() { tone({ freq: 100, freqEnd: 30, type: 'square', duration: 0.6, gain: 0.18 }); },
  nuke() {
    tone({ freq: 60, freqEnd: 20, type: 'sawtooth', duration: 2.2, gain: 0.25, release: 0.8 });
    setTimeout(() => tone({ freq: 80, freqEnd: 25, type: 'square', duration: 1.5, gain: 0.18 }), 200);
  },
  intercept() {
    tone({ freq: 1200, freqEnd: 200, type: 'triangle', duration: 0.35, gain: 0.12 });
  },
  notify() { chord([587.33, 739.99, 880], { type: 'sine', duration: 0.25, gain: 0.08 }); },
  capture() { chord([523.25, 659.25, 783.99, 1046.5], { type: 'triangle', duration: 0.4, gain: 0.12 }); },
  defeat() { tone({ freq: 200, freqEnd: 60, type: 'sawtooth', duration: 1.2, gain: 0.15 }); },
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => tone({ freq: f, type: 'triangle', duration: 0.3, gain: 0.15 }), i * 180);
    });
  },
};

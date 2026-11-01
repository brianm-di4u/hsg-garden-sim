// Small WebAudio blips. Quiet by default; nothing plays until the first user gesture.
let ac = null, master = null;
const A = { volume: 0.5, mute: false, played: 0 };
export const audioState = A;

function ensure() {
  if (ac) return true;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ac = new C(); master = ac.createGain(); master.connect(ac.destination);
    setVolume(A.volume, A.mute);
    return true;
  } catch { return false; }
}
export function setVolume(v, mute) { A.volume = v; A.mute = mute; if (master) master.gain.value = mute ? 0 : v * 0.35; }
export function unlock() { if (ensure() && ac.state === 'suspended') ac.resume().catch(() => {}); }

function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noiseBurst(dur, vol = 0.2, hp = 800, delay = 0) {
  const t = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const SOUNDS = {
  till: () => { noiseBurst(0.12, 0.25, 200); tone(90, 0.1, 'triangle', 0.2); },
  water: () => noiseBurst(0.25, 0.12, 1800),
  splash: () => { noiseBurst(0.3, 0.18, 900); tone(500, 0.15, 'sine', 0.08, -300); },
  plant: () => tone(420, 0.08, 'triangle', 0.15, 120),
  pickup: () => { tone(660, 0.07, 'square', 0.08); tone(990, 0.08, 'square', 0.07, 0, 0.06); },
  chop: () => { noiseBurst(0.07, 0.3, 400); tone(160, 0.08, 'triangle', 0.25, -60); },
  clink: () => { tone(1400, 0.12, 'triangle', 0.15); tone(2100, 0.08, 'sine', 0.08, 0, 0.02); },
  swish: () => noiseBurst(0.15, 0.12, 2500),
  coin: () => { tone(988, 0.08, 'square', 0.08); tone(1319, 0.14, 'square', 0.08, 0, 0.07); },
  drop: () => tone(300, 0.1, 'triangle', 0.15, -120),
  craft: () => { tone(523, 0.08, 'triangle', 0.15); tone(659, 0.08, 'triangle', 0.15, 0, 0.08); tone(784, 0.12, 'triangle', 0.15, 0, 0.16); },
  place: () => tone(220, 0.12, 'triangle', 0.2, -40),
  eat: () => { tone(330, 0.06, 'square', 0.06); tone(330, 0.06, 'square', 0.06, 0, 0.1); },
  nope: () => tone(160, 0.15, 'square', 0.08, -40),
  talk: () => tone(500 + Math.random() * 120, 0.06, 'triangle', 0.08),
  gift: () => { tone(660, 0.1, 'sine', 0.15); tone(880, 0.16, 'sine', 0.15, 0, 0.1); },
  quest: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, 0, i * 0.09)); },
  sleep: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, 0, i * 0.2)); },
  click: () => tone(700, 0.04, 'square', 0.05),
  mow: () => { noiseBurst(0.2, 0.14, 600); tone(110, 0.18, 'sawtooth', 0.05, 10); },
  snip: () => { tone(1800, 0.03, 'square', 0.06); noiseBurst(0.04, 0.12, 3000); },
  // A peacock's call: two loud rising wails (synthesized, not a recording).
  peacock: () => { tone(620, 0.32, 'sawtooth', 0.05, 380); tone(640, 0.36, 'sawtooth', 0.05, 420, 0.42); },
  bells: () => { [784, 659, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'sine', 0.07, 0, i * 0.22)); },
  bird: () => { tone(2200, 0.08, 'sine', 0.05, 400); tone(2600, 0.1, 'sine', 0.05, -300, 0.12); },
};
export function play(id) {
  if (A.mute || !ensure() || ac.state !== 'running') return;
  const f = SOUNDS[id];
  if (f) { try { f(); A.played++; } catch { /* ignore */ } }
}

// Tiny synthesized sound effects through WebAudio — no audio files, no network.
// Every effect is a short oscillator blip; the context starts on the first user gesture.

let context = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (context === null) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function blip(frequency, duration, type, gainValue, slideTo) {
  if (muted) return;
  const audio = ensureContext();
  if (audio === null) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration);
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

export function playPick() {
  blip(520, 0.07, 'triangle', 0.12);
}

export function playChop() {
  blip(180, 0.08, 'square', 0.1, 90);
}

export function playChopDone() {
  blip(660, 0.09, 'triangle', 0.12);
  setTimeout(() => blip(880, 0.1, 'triangle', 0.12), 70);
}

export function playSizzle() {
  blip(240, 0.12, 'sawtooth', 0.05, 320);
}

export function playCookDone() {
  blip(740, 0.1, 'triangle', 0.12);
  setTimeout(() => blip(990, 0.12, 'triangle', 0.12), 80);
}

export function playPlate() {
  blip(440, 0.08, 'triangle', 0.1, 620);
}

export function playServe() {
  blip(523, 0.1, 'triangle', 0.14);
  setTimeout(() => blip(659, 0.1, 'triangle', 0.14), 90);
  setTimeout(() => blip(784, 0.16, 'triangle', 0.14), 180);
}

export function playError() {
  blip(160, 0.16, 'square', 0.1, 110);
}

export function playTick() {
  blip(980, 0.05, 'square', 0.06);
}

export function playOrder() {
  blip(392, 0.09, 'triangle', 0.1);
  setTimeout(() => blip(523, 0.12, 'triangle', 0.1), 90);
}

'use strict';

let audioCtx = null;

function ensureAudio() {
  if (save.muted) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.05, slide = 0, delay = 0 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function sfxClick() { tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.02 }); }
function sfxPickup() { tone({ freq: 400, dur: 0.06, type: 'sine', gain: 0.03, slide: 60 }); }
function sfxMatch() {
  tone({ freq: 392, dur: 0.09, type: 'sine', gain: 0.04, slide: 40 });
  tone({ freq: 523, dur: 0.12, type: 'triangle', gain: 0.04, delay: 0.07 });
  // soft splash
  tone({ freq: 200, dur: 0.1, type: 'triangle', gain: 0.025, slide: 80, delay: 0.02 });
}
function sfxWrong() {
  tone({ freq: 240, dur: 0.1, type: 'sine', gain: 0.025, slide: -40 });
}
function sfxWin() {
  tone({ freq: 523, dur: 0.1, type: 'sine', gain: 0.04 });
  tone({ freq: 659, dur: 0.1, type: 'sine', gain: 0.04, delay: 0.09 });
  tone({ freq: 784, dur: 0.16, type: 'triangle', gain: 0.045, delay: 0.18 });
}

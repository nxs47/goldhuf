/* audio.js — Klänge über die Web Audio API. Keine Audiodateien nötig:
 * alles wird zur Laufzeit synthetisiert.
 */

let ctx = null;
let enabled = true;
let master = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Der Audio-Kontext, damit die Musik denselben Ausgang nutzt. */
export function audioContext() { return ac(); }
export function masterOut()    { ac(); return master; }

export function setSound(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.9 : 0;
}
export function isSoundOn() { return enabled; }

/* ---------------------------------------------------------------- Bausteine */

function tone({ freq = 440, dur = .15, type = 'sine', gain = .18, slide = 0, delay = 0, out = null }) {
  if (!enabled) return;
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(out || master);
  osc.start(t0);
  osc.stop(t0 + dur + .02);
}

/** Gefiltertes Rauschen — die Grundlage für Hufe, Bürste, Stroh, Schnauben. */
function noise({ dur = .12, gain = .12, filter = 1200, type = 'bandpass', q = 1, delay = 0, decay = true }) {
  if (!enabled) return null;
  const c = ac(); if (!c) return null;
  const t0 = c.currentTime + delay;

  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (decay ? (1 - i / len) : 1);
  }

  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = filter; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;

  src.connect(f).connect(g).connect(master);
  src.start(t0);
  return { src, g, t0 };
}

/* ---------------------------------------------------------------- Pferdelaute */

/**
 * Wiehern: ein absteigender Ton, dem ein schnelles Zittern aufmoduliert wird —
 * das erzeugt das typische "Flattern" eines Pferdelauts.
 */
function whinny({ pitch = 1, dur = 0.75, gain = 0.075 } = {}) {
  if (!enabled) return;
  const c = ac(); if (!c) return;
  const t0 = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(760 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(680 * pitch, t0 + dur * 0.25);
  osc.frequency.exponentialRampToValueAtTime(240 * pitch, t0 + dur);

  // Zittern: je tiefer der Ton wird, desto langsamer
  const trem = c.createOscillator();
  trem.type = 'square';
  trem.frequency.setValueAtTime(26, t0);
  trem.frequency.linearRampToValueAtTime(12, t0 + dur);
  const tremDepth = c.createGain();
  tremDepth.gain.value = gain * 0.75;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
  g.gain.setValueAtTime(gain, t0 + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2600, t0);
  lp.frequency.exponentialRampToValueAtTime(900, t0 + dur);

  trem.connect(tremDepth).connect(g.gain);
  osc.connect(lp).connect(g).connect(master);

  osc.start(t0); trem.start(t0);
  osc.stop(t0 + dur + 0.05); trem.stop(t0 + dur + 0.05);

  // etwas Atemluft dazu
  noise({ dur: dur * 0.8, gain: gain * 0.35, filter: 1500, q: 0.7 });
}

/** Schnauben: kurzer Luftstoß durch die Nüstern. */
function snort() {
  if (!enabled) return;
  const c = ac(); if (!c) return;
  const n = noise({ dur: 0.3, gain: 0.13, filter: 420, type: 'lowpass', q: 0.8 });
  if (n) {
    // leichtes Flattern der Nüstern
    n.g.gain.setValueAtTime(0.13, n.t0);
    n.g.gain.setValueAtTime(0.05, n.t0 + 0.05);
    n.g.gain.setValueAtTime(0.14, n.t0 + 0.09);
    n.g.gain.setValueAtTime(0.06, n.t0 + 0.15);
    n.g.gain.exponentialRampToValueAtTime(0.001, n.t0 + 0.3);
  }
  tone({ freq: 150, dur: 0.22, type: 'sine', gain: 0.05, slide: -50 });
}

/** Ruhiges Ausatmen — das Geräusch eines zufriedenen Pferdes. */
function blow() {
  noise({ dur: 0.55, gain: 0.055, filter: 700, type: 'lowpass', q: 0.6 });
}

/** Kauen: mehrere kurze Mahlgeräusche hintereinander. */
function chew(times = 5) {
  for (let i = 0; i < times; i++) {
    noise({ dur: 0.09, gain: 0.06, filter: 700 + (i % 2) * 400, delay: i * 0.19 });
  }
}

/** Trinken: Schlucke mit absteigender Tonhöhe. */
function drink(times = 4) {
  for (let i = 0; i < times; i++) {
    const d = i * 0.28;
    noise({ dur: 0.13, gain: 0.05, filter: 900, delay: d });
    tone({ freq: 420 - i * 30, dur: 0.16, type: 'sine', gain: 0.045, slide: 180, delay: d + 0.02 });
  }
}

/** Huf stampft auf den Boden. */
function stomp() {
  noise({ dur: 0.12, gain: 0.13, filter: 220, type: 'lowpass' });
  tone({ freq: 90, dur: 0.16, type: 'sine', gain: 0.1, slide: -35 });
}

/* ---------------------------------------------------------------- Register */

export const sfx = {
  /* Bedienung */
  click:  () => tone({ freq: 520, dur: .07, type: 'triangle', gain: .1 }),
  error:  () => tone({ freq: 200, dur: .18, type: 'square', gain: .1, slide: -60 }),
  buy:    () => { tone({ freq: 660, dur: .1, type: 'triangle', gain: .11 });
                  tone({ freq: 880, dur: .16, type: 'triangle', gain: .1, delay: .09 }); },
  coin:   () => { tone({ freq: 988, dur: .08, type: 'square', gain: .07 });
                  tone({ freq: 1319, dur: .12, type: 'square', gain: .06, delay: .06 }); },
  fanfare:() => [523, 659, 784, 1047].forEach((f, i) =>
                  tone({ freq: f, dur: .3, type: 'triangle', gain: .1, delay: i * .11 })),

  /* Parcours */
  jump:   () => { tone({ freq: 300, dur: .18, type: 'sine', gain: .12, slide: 260 }); stomp(); },
  land:   () => { noise({ dur: .09, gain: .09, filter: 320, type: 'lowpass' }); },
  hoof:   () => noise({ dur: .05, gain: .05, filter: 240, type: 'lowpass' }),
  crash:  () => { tone({ freq: 180, dur: .32, type: 'sawtooth', gain: .15, slide: -120 });
                  noise({ dur: .3, gain: .11, filter: 700 });
                  whinny({ pitch: 1.25, dur: .5, gain: .07 }); },

  /* Pflege */
  brush:  () => noise({ dur: .09, gain: .06, filter: 2400 }),
  straw:  () => noise({ dur: .14, gain: .08, filter: 3600 }),
  water:  () => tone({ freq: 640, dur: .2, type: 'sine', gain: .08, slide: 240 }),
  hammer: () => { tone({ freq: 1400, dur: .06, type: 'square', gain: .09 });
                  noise({ dur: .08, gain: .09, filter: 2000 }); },
  muck:   () => noise({ dur: .18, gain: .07, filter: 500, type: 'lowpass' }),

  /* Pferd */
  neigh:  () => whinny(),
  neighLong: () => whinny({ dur: 1.05, gain: .085 }),
  neighHigh: () => whinny({ pitch: 1.3, dur: .6 }),
  snort,
  blow,
  chew,
  drink,
  stomp,
  eat:    () => chew(5),
};

/** Ein zufälliger Stalllaut für die Hintergrundstimmung. */
export function randomHorseSound() {
  const pool = [sfx.snort, sfx.blow, sfx.stomp, sfx.neigh, sfx.blow, sfx.snort];
  pool[Math.floor(Math.random() * pool.length)]();
}

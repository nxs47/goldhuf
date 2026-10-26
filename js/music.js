/* music.js — Hintergrundmusik.
 *
 * Die Stücke stehen als Notendaten im Code (Tonhöhe, Länge, Instrument) und
 * werden über die Web Audio API gespielt — im Grunde MIDI ohne Datei und ohne
 * Klangbibliothek. Dadurch bleibt das Spiel eine einzige, ladefreie Einheit.
 *
 * Aufbau eines Stücks:
 *   bpm     Tempo
 *   length  Länge der Schleife in Zählzeiten
 *   parts   [{ inst, gain, notes: [[Zählzeit, Note|Akkord, Dauer], …] }]
 */

import { audioContext } from './util/audio.js';

/* ---------------------------------------------------------------- Tonhöhen */

const SEMITONES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function freq(note) {
  if (!note) return 0;
  const m = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + SEMITONES[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Dreiklang über einem Grundton: "C4" → ["C4","E4","G4"] (dur) bzw. moll. */
function chord(root, kind = 'maj') {
  const m = /^([A-G]#?)(-?\d)$/.exec(root);
  const base = SEMITONES[m[1]], oct = Number(m[2]);
  const steps = kind === 'min' ? [0, 3, 7] : kind === 'dom' ? [0, 4, 7, 10] : [0, 4, 7];
  const names = Object.keys(SEMITONES);
  return steps.map(s => {
    const v = base + s;
    return names.find(n => SEMITONES[n] === v % 12) + (oct + Math.floor(v / 12));
  });
}

/* ---------------------------------------------------------------- Stücke */

/** Ruhiger Walzer für den Stall — 3/4, langsam, warm. */
function stallTheme() {
  const bars = [
    ['C3', 'maj'], ['A2', 'min'], ['F2', 'maj'], ['G2', 'maj'],
    ['C3', 'maj'], ['E3', 'min'], ['F2', 'maj'], ['G2', 'dom'],
  ];
  const bass = [], pad = [];
  bars.forEach(([root, kind], i) => {
    const t = i * 3;
    bass.push([t, root, 1.0]);                       // "Oom"
    pad.push([t + 1, chord(root, kind), 0.8]);       // "pah"
    pad.push([t + 2, chord(root, kind), 0.8]);       // "pah"
  });

  const melody = [
    [0, 'G4', 1], [1, 'A4', 1], [2, 'B4', 1],
    [3, 'C5', 2], [5, 'A4', 1],
    [6, 'F4', 1], [7, 'G4', 1], [8, 'A4', 1],
    [9, 'G4', 2], [11, 'B4', 1],
    [12, 'C5', 1], [13, 'B4', 1], [14, 'A4', 1],
    [15, 'G4', 2], [17, 'E4', 1],
    [18, 'F4', 1], [19, 'A4', 1], [20, 'C5', 1],
    [21, 'B4', 2.4],
  ];

  return {
    bpm: 88, length: 24,
    parts: [
      { inst: 'bass', gain: 0.16, notes: bass },
      { inst: 'pad',  gain: 0.07, notes: pad },
      { inst: 'lead', gain: 0.11, notes: melody },
    ],
  };
}

/** Fröhliches Galopp-Stück für die Tagstrecken — 4/4, treibend. */
function rideTheme() {
  const bars = [['G2', 'maj'], ['E2', 'min'], ['C2', 'maj'], ['D2', 'dom']];
  const bass = [], pad = [], perc = [];

  bars.forEach(([root, kind], i) => {
    const t = i * 4;
    // Galopprhythmus: lang – kurz – kurz
    bass.push([t, root, 0.45], [t + 0.75, root, 0.2], [t + 1, root, 0.2]);
    bass.push([t + 2, root, 0.45], [t + 2.75, root, 0.2], [t + 3, root, 0.2]);
    pad.push([t + 1.5, chord(root, kind), 0.4], [t + 3.5, chord(root, kind), 0.4]);
    for (let b = 0; b < 4; b++) {
      perc.push([t + b, b % 2 === 0 ? 'kick' : 'hat', 0.2]);
      perc.push([t + b + 0.5, 'hat', 0.15]);
    }
  });

  const melody = [
    [0, 'G4', 1], [1, 'D5', 0.5], [1.5, 'E5', 0.5], [2, 'G5', 1], [3, 'A5', 1],
    [4, 'B5', 1.5], [5.5, 'A5', 0.5], [6, 'G5', 1], [7, 'E5', 1],
    [8, 'C5', 1], [9, 'E5', 0.5], [9.5, 'G5', 0.5], [10, 'A5', 1], [11, 'G5', 1],
    [12, 'F5', 1], [13, 'A5', 0.5], [13.5, 'F5', 0.5], [14, 'D5', 2],
  ];

  return {
    bpm: 138, length: 16,
    parts: [
      { inst: 'bass', gain: 0.15, notes: bass },
      { inst: 'pad',  gain: 0.05, notes: pad },
      { inst: 'lead', gain: 0.10, notes: melody },
      { inst: 'perc', gain: 0.09, notes: perc },
    ],
  };
}

/** Getragene Moll-Fassung für den Bergpfad bei Nacht. */
function nightTheme() {
  const bars = [['E2', 'min'], ['C2', 'maj'], ['A2', 'min'], ['B2', 'dom']];
  const bass = [], pad = [], perc = [];

  bars.forEach(([root, kind], i) => {
    const t = i * 4;
    bass.push([t, root, 0.9], [t + 1.5, root, 0.4], [t + 2, root, 0.9], [t + 3.5, root, 0.4]);
    pad.push([t + 0.5, chord(root, kind), 1.2], [t + 2.5, chord(root, kind), 1.2]);
    perc.push([t, 'kick', 0.2], [t + 2, 'kick', 0.2], [t + 1, 'hat', 0.15], [t + 3, 'hat', 0.15]);
  });

  const melody = [
    [0, 'B4', 1.5], [1.5, 'E5', 0.5], [2, 'G5', 1], [3, 'F#5', 1],
    [4, 'E5', 2], [6, 'D5', 1], [7, 'B4', 1],
    [8, 'C5', 1.5], [9.5, 'E5', 0.5], [10, 'A5', 1], [11, 'G5', 1],
    [12, 'F#5', 2], [14, 'E5', 2],
  ];

  return {
    bpm: 104, length: 16,
    parts: [
      { inst: 'bass', gain: 0.15, notes: bass },
      { inst: 'pad',  gain: 0.06, notes: pad },
      { inst: 'lead', gain: 0.10, notes: melody },
      { inst: 'perc', gain: 0.07, notes: perc },
    ],
  };
}

/** Kurze, warme Schleife für den Titelbildschirm. */
function titleTheme() {
  const t = stallTheme();
  return { ...t, bpm: 76 };
}

export const TRACKS = {
  stall: stallTheme(),
  ride:  rideTheme(),
  night: nightTheme(),
  title: titleTheme(),
};

/* ---------------------------------------------------------------- Abspieler */

const LOOKAHEAD_MS = 25;      // wie oft der Zeitplaner läuft
const SCHEDULE_AHEAD = 0.18;  // wie weit im Voraus Noten geplant werden

let out = null;               // Lautstärkeregler für die Musik
let timer = 0;
let current = null;           // aktuelles Stück
let currentId = null;
let nextNoteTime = 0;
let beat = 0;
let enabled = true;
let noiseBuffer = null;

function ensureOut() {
  const c = audioContext();
  if (!c) return null;
  if (!out) {
    out = c.createGain();
    out.gain.value = 0;
    out.connect(c.destination);
  }
  return c;
}

function getNoise(c) {
  if (!noiseBuffer) {
    const len = Math.floor(c.sampleRate * 0.3);
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/* --- Instrumente --- */

function playNote(c, inst, note, time, dur, gain) {
  if (inst === 'perc') return playPerc(c, note, time, gain);

  const notes = Array.isArray(note) ? note : [note];
  for (const n of notes) {
    const f = freq(n);
    if (!f) continue;

    const osc = c.createOscillator();
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';

    let attack = 0.02, release = 0.12, level = gain / notes.length;

    if (inst === 'bass') {
      osc.type = 'sine';
      lp.frequency.value = 900;
      attack = 0.008; release = 0.1;
      // leichter Oberton für Kontur
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = 'triangle';
      sub.frequency.value = f * 2;
      sg.gain.value = level * 0.22;
      sub.connect(sg).connect(out);
      sub.start(time); sub.stop(time + dur + 0.1);
      sg.gain.setValueAtTime(level * 0.22, time);
      sg.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);
    } else if (inst === 'pad') {
      osc.type = 'triangle';
      lp.frequency.value = 1600;
      attack = 0.05; release = 0.25;
    } else {   // lead
      osc.type = 'triangle';
      lp.frequency.value = 3000;
      attack = 0.015; release = 0.18;

      // sanftes Vibrato macht die Melodie lebendiger
      const vib = c.createOscillator();
      const vibGain = c.createGain();
      vib.frequency.value = 5.2;
      vibGain.gain.value = f * 0.006;
      vib.connect(vibGain).connect(osc.frequency);
      vib.start(time); vib.stop(time + dur + release);
    }

    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(level, time + attack);
    g.gain.setValueAtTime(level, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

    osc.connect(lp).connect(g).connect(out);
    osc.start(time);
    osc.stop(time + dur + release + 0.05);
  }
}

function playPerc(c, kind, time, gain) {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  const f = c.createBiquadFilter();
  const g = c.createGain();

  if (kind === 'kick') {
    // Trommel: kurzer Sinus-Abfall plus etwas Anschlag
    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.13);
    og.gain.setValueAtTime(gain * 1.5, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(og).connect(out);
    osc.start(time); osc.stop(time + 0.2);

    f.type = 'lowpass'; f.frequency.value = 300;
    g.gain.setValueAtTime(gain * 0.5, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
  } else {
    f.type = 'highpass'; f.frequency.value = 6000;
    g.gain.setValueAtTime(gain * 0.35, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  }

  src.connect(f).connect(g).connect(out);
  src.start(time);
  src.stop(time + 0.3);
}

/* --- Zeitplanung --- */

function scheduler() {
  const c = audioContext();
  if (!c || !current) return;

  const secondsPerBeat = 60 / current.bpm;

  while (nextNoteTime < c.currentTime + SCHEDULE_AHEAD) {
    const localBeat = beat % current.length;

    for (const part of current.parts) {
      for (const [t, note, dur] of part.notes) {
        // Alles, was genau auf dieser Zählzeit beginnt (Auflösung: 1/8)
        if (Math.abs(t - localBeat) < 1e-6) {
          playNote(c, part.inst, note, nextNoteTime, dur * secondsPerBeat, part.gain);
        }
      }
    }

    nextNoteTime += secondsPerBeat * 0.25;   // Raster: Sechzehntel
    beat = Math.round((beat + 0.25) * 1000) / 1000;
    if (beat >= current.length) beat = 0;
  }
}

/* ---------------------------------------------------------------- API */

/** Musikstück starten (oder wechseln). Gleiches Stück = nichts tun. */
export function playMusic(id) {
  if (!enabled) { currentId = id; return; }
  const track = TRACKS[id];
  if (!track) return;
  if (currentId === id && timer) return;

  const c = ensureOut();
  if (!c) return;

  currentId = id;
  current = track;
  beat = 0;
  nextNoteTime = c.currentTime + 0.08;

  clearInterval(timer);
  timer = setInterval(scheduler, LOOKAHEAD_MS);

  out.gain.cancelScheduledValues(c.currentTime);
  out.gain.setValueAtTime(out.gain.value, c.currentTime);
  out.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.2);
}

/** Musik ausblenden und anhalten. */
export function stopMusic(fade = 0.6) {
  const c = audioContext();
  if (!c || !out) { clearInterval(timer); timer = 0; current = null; return; }

  out.gain.cancelScheduledValues(c.currentTime);
  out.gain.setValueAtTime(out.gain.value, c.currentTime);
  out.gain.linearRampToValueAtTime(0, c.currentTime + fade);

  clearInterval(timer);
  timer = setTimeout(() => { clearInterval(timer); timer = 0; current = null; }, fade * 1000 + 50);
}

export function setMusic(on) {
  enabled = on;
  if (!on) { stopMusic(0.3); }
  else if (currentId) { const id = currentId; currentId = null; playMusic(id); }
}

export function isMusicOn() { return enabled; }

/** Welches Stück passt zu welcher Strecke? */
export function trackForLevel(levelId) {
  return levelId === 'bergpfad' ? 'night' : 'ride';
}

/* levels.js — die fünf Strecken.
 *
 * Die Parcours sind fest gebaut, nicht zufällig: Wer nach einem Sturz von vorn
 * startet, trifft dieselbe Reihenfolge wieder an und kann sie lernen.
 */

export const GROUND_Y = 430;          // Bodenlinie im Weltkoordinatensystem
export const HORSE_X = 200;           // feste Bildschirmposition des Pferdes

/** Maße der Hindernisarten. h = Höhe über dem Boden. */
export const OBSTACLES = {
  pole:  { w: 26,  h: 46, name: 'Stange'      },
  log:   { w: 44,  h: 40, name: 'Baumstamm'   },
  hedge: { w: 52,  h: 54, name: 'Hecke'       },
  oxer:  { w: 74,  h: 52, name: 'Oxer'        },
  wall:  { w: 38,  h: 66, name: 'Mauer'       },
  water: { w: 104, h: 0,  name: 'Wassergraben', pit: true },
  arch:  { w: 200, h: 0,  name: 'Torbogen',     duck: true, barLow: 64, barHigh: 128 },
};

/* ---------------------------------------------------------------- Baukasten */

class Builder {
  constructor() {
    this.x = 700;                 // etwas Anlauf vor dem ersten Hindernis
    this.obstacles = [];
    this.pickups = [];
    this.scenery = [];
  }
  run(px) { this.x += px; return this; }

  ob(type) {
    const def = OBSTACLES[type];
    this.obstacles.push({ x: this.x, type, w: def.w, h: def.h });
    this.x += def.w;
    return this;
  }

  /** Münzbogen über dem zuletzt gesetzten Hindernis — wer hoch springt, kassiert. */
  arcOverLast(count = 5, peak = 150) {
    const last = this.obstacles[this.obstacles.length - 1];
    if (!last) return this;
    const cx = last.x + last.w / 2;
    const span = 130;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const dx = (t - 0.5) * 2 * span;
      const y = GROUND_Y - peak + Math.pow(t - 0.5, 2) * 4 * (peak - last.h - 42);
      this.pickups.push({ x: cx + dx, y, type: 'coin' });
    }
    return this;
  }

  /** Waagerechte Münzreihe ab der aktuellen Position. */
  line(count = 4, height = 90, spacing = 62) {
    for (let i = 0; i < count; i++) {
      this.pickups.push({ x: this.x + i * spacing, y: GROUND_Y - height, type: 'coin' });
    }
    this.x += count * spacing;
    return this;
  }

  carrot(height = 130) {
    this.pickups.push({ x: this.x, y: GROUND_Y - height, type: 'carrot' });
    this.x += 60;
    return this;
  }

  /** Kulisse im Hintergrund (Bäume, Zuschauer, Felsen …). */
  deco(kind, count = 1, spacing = 300) {
    for (let i = 0; i < count; i++) this.scenery.push({ x: this.x + i * spacing, kind });
    return this;
  }

  finish(pad = 700) {
    return {
      obstacles: this.obstacles,
      pickups: this.pickups,
      scenery: this.scenery,
      length: this.x + pad,
    };
  }
}

/* ---------------------------------------------------------------- Strecken */

function reitplatz() {
  const b = new Builder();
  b.deco('fence', 30, 220);
  b.line(3, 95).run(120);
  b.ob('pole').arcOverLast(4, 140).run(430);
  b.ob('pole').arcOverLast(4, 145).run(380);
  b.line(3, 110).run(140);
  b.ob('log').arcOverLast(4, 140).run(420);
  b.carrot(140).run(300);
  b.ob('pole').arcOverLast(4, 155).run(300);
  b.ob('pole').arcOverLast(4, 145).run(430);
  b.line(3, 100).run(160);
  b.ob('hedge').arcOverLast(4, 165).run(500);
  return b.finish();
}

function waldweg() {
  const b = new Builder();
  b.deco('tree', 34, 190);
  b.line(3, 100).run(150);
  b.ob('log').arcOverLast(4, 145).run(420);
  b.ob('arch').run(360);                       // ducken
  b.line(3, 80).run(120);
  b.ob('log').arcOverLast(4, 150).run(300);
  b.ob('log').arcOverLast(4, 150).run(430);
  b.carrot(120).run(260);
  b.ob('arch').run(300);
  b.ob('hedge').arcOverLast(4, 165).run(420);
  b.line(3, 105).run(150);
  b.ob('log').arcOverLast(4, 140).run(280);
  b.ob('arch').run(380);
  b.ob('hedge').arcOverLast(4, 170).run(520);
  return b.finish();
}

function wiesenparcours() {
  const b = new Builder();
  b.deco('bush', 26, 250);
  b.line(3, 100).run(140);
  b.ob('hedge').arcOverLast(4, 160).run(400);
  b.ob('water').arcOverLast(4, 150).run(420);
  b.line(3, 115).run(140);
  b.ob('pole').arcOverLast(4, 150).run(230).ob('pole').arcOverLast(4, 150).run(460);  // Doppelsprung
  b.carrot(150).run(280);
  b.ob('water').arcOverLast(4, 155).run(400);
  b.ob('hedge').arcOverLast(4, 165).run(240).ob('log').arcOverLast(4, 155).run(480);
  b.line(3, 120).run(160);
  b.ob('wall').arcOverLast(4, 180).run(420);
  b.ob('water').arcOverLast(4, 160).run(560);
  return b.finish();
}

function turnierplatz() {
  const b = new Builder();
  b.deco('crowd', 40, 170);
  b.line(3, 105).run(150);
  b.ob('oxer').arcOverLast(4, 165).run(400);
  b.ob('wall').arcOverLast(4, 180).run(250).ob('pole').arcOverLast(4, 150).run(470);
  b.carrot(160).run(280);
  b.ob('arch').run(320);
  b.ob('oxer').arcOverLast(4, 170).run(430);
  b.line(3, 125).run(150);
  b.ob('water').arcOverLast(4, 160).run(240).ob('hedge').arcOverLast(4, 165).run(500);
  b.ob('wall').arcOverLast(4, 185).run(300).ob('wall').arcOverLast(4, 185).run(520);
  b.ob('arch').run(300);
  b.line(3, 110).run(170);
  b.ob('oxer').arcOverLast(4, 175).run(560);
  return b.finish();
}

function bergpfad() {
  const b = new Builder();
  b.deco('rock', 30, 230);
  b.line(3, 100).run(150);
  b.ob('log').arcOverLast(4, 150).run(340);
  b.ob('wall').arcOverLast(4, 180).run(260).ob('arch').run(430);
  b.ob('water').arcOverLast(4, 160).run(330);
  b.carrot(150).run(240);
  b.ob('oxer').arcOverLast(4, 170).run(250).ob('pole').arcOverLast(4, 150).run(250).ob('hedge').arcOverLast(4, 165).run(520);
  b.line(3, 130).run(170);
  b.ob('arch').run(280).ob('water').arcOverLast(4, 160).run(430);
  b.ob('wall').arcOverLast(4, 185).run(240).ob('wall').arcOverLast(4, 185).run(240).ob('oxer').arcOverLast(4, 175).run(520);
  b.carrot(170).run(300);
  b.ob('hedge').arcOverLast(4, 170).run(280).ob('arch').run(600);
  return b.finish();
}

/** Themenfarben pro Strecke. */
const THEMES = {
  reitplatz:     { sky: ['#a8d8f0', '#dff0fa'], hill: '#8fbf6a', hill2: '#6f9e50', ground: '#c9a86a', groundDark: '#a8874c', night: false },
  waldweg:       { sky: ['#bfe0ef', '#e8f4e2'], hill: '#6f9e50', hill2: '#4f7a38', ground: '#8a6b45', groundDark: '#6c5134', night: false },
  wiesenparcours:{ sky: ['#9fd4f5', '#e9f7ff'], hill: '#9ccf6f', hill2: '#7ab04f', ground: '#7fb356', groundDark: '#5f8c3e', night: false },
  turnierplatz:  { sky: ['#8ec9ee', '#dceffb'], hill: '#87b96a', hill2: '#679a4c', ground: '#d8b57e', groundDark: '#b8945f', night: false },
  bergpfad:      { sky: ['#1d2c4a', '#3b4f74'], hill: '#2c3d5c', hill2: '#1e2c44', ground: '#4a4437', groundDark: '#332f26', night: true },
};

export const LEVELS = [
  { id: 'reitplatz',      name: 'Reitplatz',        icon: '🏇', unlockAt: 0,    desc: 'Kurz und übersichtlich. Ideal zum Üben.',              build: reitplatz },
  { id: 'waldweg',        name: 'Waldweg',          icon: '🌲', unlockAt: 200,  desc: 'Baumstämme und tiefe Äste — hier musst du ducken.',    build: waldweg },
  { id: 'wiesenparcours', name: 'Wiesenparcours',   icon: '🌼', unlockAt: 600,  desc: 'Wassergräben und Doppelsprünge.',                      build: wiesenparcours },
  { id: 'turnierplatz',   name: 'Turnierplatz',     icon: '🏆', unlockAt: 1500, desc: 'Oxer, Mauern und Kombinationen vor Publikum.',         build: turnierplatz },
  { id: 'bergpfad',       name: 'Bergpfad bei Nacht',icon: '🌙', unlockAt: 3000, desc: 'Alles auf einmal — und wenig Licht.',                  build: bergpfad },
];

const cache = new Map();

/** Streckendaten holen (werden einmal gebaut und dann wiederverwendet). */
export function getLevel(id) {
  const def = LEVELS.find(l => l.id === id);
  if (!def) return null;
  if (!cache.has(id)) {
    cache.set(id, { ...def, ...def.build(), theme: THEMES[id] });
  }
  return cache.get(id);
}

export function isUnlocked(level, earned) {
  return earned >= level.unlockAt;
}

/* horse.js — Pferdemodell: Rassen, Farben, Bedürfnisse und die SVG-Darstellung.
 *
 * Das Pferd wird aus Ebenen gezeichnet (Schweif, Beine, Körper, Hals, Kopf, Mähne).
 * Alle Farben kommen aus der Konfiguration, damit jede Fell-/Mähnenkombination
 * aus derselben Grafik entsteht.
 */

/* ---------------------------------------------------------------- Konfiguration */

export const BREEDS = {
  shetland:   { name: 'Shetlandpony', jump: 2, speed: 2, hardy: 5, price: 0,    scale: 0.80, feather: true,  desc: 'Klein, zäh und anspruchslos — das perfekte erste Pferd.' },
  haflinger:  { name: 'Haflinger',    jump: 3, speed: 3, hardy: 4, price: 500,  scale: 0.94, feather: false, desc: 'Freundlicher Allrounder mit heller Mähne.' },
  islaender:  { name: 'Isländer',     jump: 3, speed: 4, hardy: 4, price: 800,  scale: 0.88, feather: true,  desc: 'Flink und ausdauernd, dichtes Fell.' },
  tinker:     { name: 'Tinker',       jump: 3, speed: 3, hardy: 5, price: 1000, scale: 1.02, feather: true,  desc: 'Ruhig, kräftig, mit üppigem Behang an den Beinen.' },
  araber:     { name: 'Araber',       jump: 4, speed: 5, hardy: 2, price: 1800, scale: 0.96, feather: false, desc: 'Das schnellste Pferd im Stall — braucht viel Pflege.' },
  andalusier: { name: 'Andalusier',   jump: 4, speed: 4, hardy: 3, price: 2200, scale: 1.02, feather: false, desc: 'Elegant und sprungstark, mit langer Mähne.' },
  friese:     { name: 'Friese',       jump: 5, speed: 3, hardy: 2, price: 3000, scale: 1.10, feather: true,  desc: 'Höchste Sprungkraft, sehr pflegeintensiv.' },
};

export const COATS = {
  fuchs:         { name: 'Fuchs',         body: '#b5651d', shade: '#8d4a12', light: '#cd8038' },
  rappe:         { name: 'Rappe',         body: '#332c28', shade: '#1c1815', light: '#4a413b' },
  schimmel:      { name: 'Schimmel',      body: '#e9e4dc', shade: '#c6bfb4', light: '#f7f4ef' },
  brauner:       { name: 'Brauner',       body: '#6d4524', shade: '#4b2e16', light: '#875a34' },
  falbe:         { name: 'Falbe',         body: '#c9a86a', shade: '#a3854c', light: '#dcc189' },
  palomino:      { name: 'Palomino',      body: '#e0b96b', shade: '#bd964b', light: '#f0d294' },
  apfelschimmel: { name: 'Apfelschimmel', body: '#d7d3cc', shade: '#b2aca2', light: '#eceae5', dapple: true },
};

export const MANE_COLORS = {
  blond:    { name: 'Blond',    color: '#f0e0b0' },
  schwarz:  { name: 'Schwarz',  color: '#241f1c' },
  silber:   { name: 'Silber',   color: '#d9d9d9' },
  kastanie: { name: 'Kastanie', color: '#7a4520' },
  weiss:    { name: 'Weiß',     color: '#f6f2ea' },
  rot:      { name: 'Rotblond', color: '#c8763a' },
};

export const MANE_STYLES = {
  offen:      { name: 'Offen'      },
  lang:       { name: 'Lang'       },
  geflochten: { name: 'Geflochten' },
  kurz:       { name: 'Kurz'       },
};

export const MARKINGS = {
  keine:   { name: 'Keine'        },
  stern:   { name: 'Stern'        },
  blesse:  { name: 'Blesse'       },
  schnippe:{ name: 'Schnippe'     },
  fesseln: { name: 'Weiße Fesseln'},
  schecke: { name: 'Schecke'      },
};

/** Reihenfolge und Beschriftung der fünf Bedürfnisse. */
export const NEEDS = [
  { key: 'food',   name: 'Futter',     icon: '🌾', decay: 8  },
  { key: 'water',  name: 'Wasser',     icon: '💧', decay: 10 },
  { key: 'clean',  name: 'Sauberkeit', icon: '🧹', decay: 6  },
  { key: 'coat',   name: 'Fell',       icon: '🪮', decay: 5  },
  { key: 'hooves', name: 'Hufe',       icon: '🧲', decay: 2  },
];

/** Was ein Parcourslauf das Pferd kostet (vor Genügsamkeits-Bonus). */
export const RIDE_COST = { food: 6, water: 11, clean: 5, coat: 9, hooves: 2 };

/* ---------------------------------------------------------------- Modell */

let idCounter = 0;
export function newHorseId() {
  return 'h' + Date.now().toString(36) + (idCounter++).toString(36);
}

export function makeHorse(opts = {}) {
  return {
    id: opts.id || newHorseId(),
    name: opts.name || 'Neues Pferd',
    breed: opts.breed || 'shetland',
    coat: opts.coat || 'fuchs',
    marking: opts.marking || 'blesse',
    maneColor: opts.maneColor || 'blond',
    maneStyle: opts.maneStyle || 'offen',
    needs: { food: 80, water: 80, clean: 70, coat: 65, hooves: 90 },
    lickStone: 0,
    lickPos: 88, lickPosY: 46,     // Platz des Lecksteins an der Wand
    trough: 70,                    // Wasservorrat in der Tränke (0–100)
    rack: 55,                      // Futtervorrat in der Raufe (0–100)
    decor: [],                     // Einrichtung dieses Stalls
    muck: [],                      // Pferdeäpfel in dieser Box
    rides: 0,
    ...(opts.needs ? { needs: { ...opts.needs } } : {}),
  };
}

/** Mittlerer Zustand 0–100 über alle Bedürfnisse. */
export function condition(horse) {
  const vals = NEEDS.map(n => horse.needs[n.key] ?? 0);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function conditionLabel(c) {
  if (c >= 80) return { label: 'bestens',    cls: 'good', mood: 'happy'  };
  if (c >= 50) return { label: 'gut',        cls: 'good', mood: 'normal' };
  if (c >= 25) return { label: 'schlapp',    cls: 'mid',  mood: 'normal' };
  return            { label: 'unzufrieden',  cls: 'bad',  mood: 'sad'    };
}

/** Genügsamkeit der Rasse als Multiplikator auf den Bedürfnisabbau. */
export function hardyFactor(horse) {
  return 1.4 - BREEDS[horse.breed].hardy * 0.12;   // 0.80 (Tinker) … 1.16 (Araber)
}

/**
 * Bedürfnisse über die Zeit abbauen.
 * @param hours vergangene Stunden
 * @param opts  { comfort, active, needMul } — Komfort des Stalls, aktives Pferd?,
 *              Einzelfaktoren pro Bedürfnis (z. B. Automatik-Tränke).
 */
export function decayNeeds(horse, hours, opts = {}) {
  if (hours <= 0) return;
  const { comfort = 0, active = true, needMul = {} } = opts;
  const comfortMul = 1 - Math.min(0.4, (comfort / 250) * 0.4);
  const mul = hours * hardyFactor(horse) * comfortMul * (active ? 1 : 0.5);

  for (const n of NEEDS) {
    horse.needs[n.key] = Math.max(0, horse.needs[n.key] - n.decay * mul * (needMul[n.key] ?? 1));
  }
  if (horse.lickStone > 0) {
    horse.lickStone = Math.max(0, horse.lickStone - 0.05 * hours);
    // Ein vorhandener Leckstein federt den Futter-Abbau leicht ab.
    horse.needs.food = Math.min(100, horse.needs.food + 2 * mul * horse.lickStone);
  }
}

/** Kosten eines Parcourslaufs verrechnen. */
export function applyRideCost(horse) {
  const f = hardyFactor(horse);
  for (const [k, v] of Object.entries(RIDE_COST)) {
    horse.needs[k] = Math.max(0, horse.needs[k] - v * f);
  }
  horse.rides = (horse.rides || 0) + 1;
}

export function addNeed(horse, key, amount) {
  const before = horse.needs[key];
  horse.needs[key] = Math.min(100, Math.max(0, before + amount));
  return horse.needs[key] - before;
}

/** Leistungswerte fürs Reiten, abhängig von Rasse und Zustand. */
export function ridingStats(horse) {
  const b = BREEDS[horse.breed];
  const c = condition(horse);
  let mul = 1;
  if (c < 50) mul = 0.85;
  if (c < 25) mul = 0.7;

  return {
    speed:     (240 + b.speed * 18) * mul,
    jumpPower: (620 + b.jump * 42) * mul,
    coinBonus: c >= 80 ? 1.5 : 1,
    canRide:   c >= 25,
    condition: c,
    scale:     b.scale,
  };
}

/* ---------------------------------------------------------------- Darstellung */

/**
 * Baut das Pferd als SVG-Markup.
 * @param {object} h     Pferdedaten
 * @param {object} opts  { pose:'stand'|'trot', width, showGround }
 */
export function horseSVG(h, opts = {}) {
  const coat = COATS[h.coat] || COATS.fuchs;
  const breed = BREEDS[h.breed] || BREEDS.shetland;
  const mane = (MANE_COLORS[h.maneColor] || MANE_COLORS.blond).color;
  const hoof = '#3b322a';
  const white = '#f6f2ea';
  const uid = 'hs' + Math.random().toString(36).slice(2, 8);

  const bodyFill  = `url(#${uid}-body)`;
  const legFill   = coat.shade;

  const feather = breed.feather;
  const isPony  = breed.scale < 0.9;

  /* --- Beine (hinten dunkler, damit Tiefe entsteht) ---
     Jedes Bein bekommt eine eigene Klasse und einen Drehpunkt an der Hüfte,
     damit der Stall daraus per CSS einen Schritt-Zyklus machen kann. */
  const legPart = (x, top, len, w, back, idx = 0) => {
    const fill = back ? coat.shade : coat.body;
    const stroke = back ? 'none' : coat.shade;
    return `
      <g class="horse-leg leg-${idx}" style="transform-box:view-box;transform-origin:${x}px ${top}px">
        <rect x="${x - w / 2}" y="${top}" width="${w}" height="${len}" rx="${w / 2}"
              fill="${fill}" ${stroke !== 'none' ? `stroke="${stroke}" stroke-width="1.5"` : ''}/>
        ${h.marking === 'fesseln' ? `<rect x="${x - w / 2}" y="${top + len - 26}" width="${w}" height="20" rx="${w / 2}" fill="${white}"/>` : ''}
        ${feather ? `<ellipse cx="${x}" cy="${top + len - 12}" rx="${w * 0.85}" ry="10" fill="${mane}" opacity=".9"/>` : ''}
        <rect x="${x - w / 2 - 1.5}" y="${top + len - 9}" width="${w + 3}" height="10" rx="3.5" fill="${hoof}"/>
      </g>`;
  };

  /* --- Mähne je nach Stil --- */
  function maneMarkup() {
    switch (h.maneStyle) {
      case 'kurz':
        return `<path d="M141,54 C156,34 174,21 190,17 L196,27 C180,32 163,45 150,63 Z" fill="${mane}"/>`;
      case 'geflochten': {
        let out = `<path d="M141,54 C156,34 174,21 190,17 L194,25 C178,30 161,43 148,60 Z" fill="${mane}"/>`;
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const x = 145 + t * 44, y = 50 - t * 30 + Math.sin(t * 3) * 2;
          out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.4" fill="${mane}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>`;
        }
        return out;
      }
      case 'lang':
        return `
          <path d="M138,56 C154,32 174,18 192,14 L200,26 C182,32 166,44 156,60
                   C150,72 146,86 148,98 L136,96 C132,80 132,66 138,56 Z" fill="${mane}"/>
          <path d="M150,60 C144,74 142,88 144,100 L138,99 C136,84 138,70 144,58 Z" fill="rgba(0,0,0,.12)"/>
          <path d="M196,20 C204,30 206,44 202,56 L192,50 C196,40 196,30 192,24 Z" fill="${mane}"/>`;
      default: /* offen */
        return `
          <path d="M139,55 C155,33 174,20 191,16 L198,27 C180,33 164,46 154,62
                   C149,71 146,80 147,89 L137,88 C134,75 134,64 139,55 Z" fill="${mane}"/>
          <path d="M194,19 C201,28 202,40 199,50 L190,45 C193,36 193,27 190,22 Z" fill="${mane}"/>`;
    }
  }

  /* --- Abzeichen im Gesicht (im gedrehten Kopf-Koordinatensystem) --- */
  function faceMarking() {
    switch (h.marking) {
      case 'stern':    return `<ellipse cx="3" cy="-13" rx="5" ry="6" fill="${white}"/>`;
      case 'schnippe': return `<ellipse cx="4" cy="17" rx="6" ry="5" fill="${white}"/>`;
      case 'blesse':   return `<path d="M1,-19 C7,-12 8,2 6,20 C3,24 -1,23 -2,19 C0,3 -3,-11 -4,-17 Z" fill="${white}"/>`;
      default:         return '';
    }
  }

  /* --- Schecken-Platten auf dem Körper --- */
  const pinto = h.marking === 'schecke' ? `
    <g clip-path="url(#${uid}-bodyclip)">
      <ellipse cx="92"  cy="66" rx="30" ry="22" fill="${white}"/>
      <ellipse cx="132" cy="96" rx="26" ry="17" fill="${white}"/>
      <ellipse cx="66"  cy="96" rx="18" ry="13" fill="${white}"/>
    </g>` : '';

  /* --- Apfelschimmel-Tupfen --- */
  let dapples = '';
  if (coat.dapple) {
    dapples = `<g clip-path="url(#${uid}-bodyclip)" opacity=".5">`;
    for (let i = 0; i < 14; i++) {
      const x = 55 + (i * 37) % 100, y = 58 + (i * 23) % 46;
      dapples += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${coat.shade}" stroke-width="2.5"/>`;
    }
    dapples += `</g>`;
  }

  const trot = opts.pose === 'trot';
  const legs = trot
    ? legPart(74, 96, 56, 15, true, 0) + legPart(152, 98, 54, 14, true, 1) +
      legPart(92, 96, 15, 15, false, 2) + legPart(140, 98, 20, 14, false, 3)
    : legPart(74, 96, 60, 15, true, 0) + legPart(150, 98, 58, 14, true, 1) +
      legPart(90, 96, 60, 15, false, 2) + legPart(164, 98, 58, 14, false, 3);

  return `
<svg viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Pferd ${escapeAttr(h.name)}, Rasse ${breed.name}, Fell ${coat.name}">
  <defs>
    <radialGradient id="${uid}-body" cx="42%" cy="34%" r="78%">
      <stop offset="0%"   stop-color="${coat.light}"/>
      <stop offset="62%"  stop-color="${coat.body}"/>
      <stop offset="100%" stop-color="${coat.shade}"/>
    </radialGradient>
    <clipPath id="${uid}-bodyclip">
      <path d="M62,58 C70,40 108,36 138,46 C160,53 168,70 166,88
               C164,110 140,120 108,120 C76,120 58,106 56,88 C55,74 57,66 62,58 Z"/>
    </clipPath>
  </defs>

  <g transform="translate(120,150) scale(${breed.scale}) translate(-120,-150)">

    <!-- Schweif (schwingt per CSS um den Ansatzpunkt) -->
    <g class="horse-tail" style="transform-box:view-box;transform-origin:70px 52px">
      <path d="M64,48 C42,54 27,80 25,110 C24,130 31,146 42,152
               C35,132 37,108 46,92 C55,76 68,64 78,58 Z" fill="${mane}"/>
      <path d="M66,52 C50,64 41,86 40,108 C39,124 43,138 48,146
               C45,128 47,106 54,90 C59,78 67,68 74,62 Z" fill="rgba(0,0,0,.16)"/>
    </g>

    ${legs}

    <!-- Körper -->
    <path d="M62,58 C70,40 108,36 138,46 C160,53 168,70 166,88
             C164,110 140,120 108,120 C76,120 58,106 56,88 C55,74 57,66 62,58 Z"
          fill="${bodyFill}" stroke="${coat.shade}" stroke-width="2"/>
    ${pinto}
    ${dapples}
    <!-- Bauchschatten -->
    <path d="M66,104 C88,118 140,118 162,98 C158,114 136,122 108,122 C82,122 70,116 66,104 Z"
          fill="rgba(0,0,0,.12)"/>

    <!-- Hals -->
    <path d="M139,56 C154,34 173,20 190,16 L208,40 C190,50 172,66 162,88
             C158,98 156,108 156,116 L128,110 C128,86 130,68 139,56 Z"
          fill="${bodyFill}" stroke="${coat.shade}" stroke-width="2"/>

    ${maneMarkup()}

    <!-- Kopf (senkt sich beim Grasen, Fressen und Trinken) -->
    <g class="horse-head" style="transform-box:view-box;transform-origin:186px 34px">
    <g transform="translate(199,36) rotate(20)">
      <path d="M-13,-20 C-4,-27 9,-24 13,-12 C16,-2 15,10 12,20
               C10,28 2,32 -4,29 C-10,26 -13,16 -13,4 Z"
            fill="${bodyFill}" stroke="${coat.shade}" stroke-width="2"/>
      ${faceMarking()}
      <!-- Ohren -->
      <path class="horse-ear ear-l" style="transform-box:view-box;transform-origin:194px 15px"
            d="M-11,-19 L-15,-34 L-3,-25 Z" fill="${coat.body}" stroke="${coat.shade}" stroke-width="1.5"/>
      <path class="horse-ear ear-r" style="transform-box:view-box;transform-origin:203px 13px"
            d="M2,-23 L3,-38 L12,-25 Z"    fill="${coat.body}" stroke="${coat.shade}" stroke-width="1.5"/>
      <path d="M-10,-21 L-12,-30 L-5,-25 Z" fill="rgba(0,0,0,.25)"/>
      <path d="M3,-25 L4,-33 L9,-26 Z"      fill="rgba(0,0,0,.25)"/>
      <!-- Auge -->
      <ellipse cx="-3" cy="-8" rx="3.6" ry="4.2" fill="#201914"/>
      <circle cx="-4.2" cy="-9.4" r="1.3" fill="#fff" opacity=".85"/>
      <!-- Nüstern und Maul -->
      <ellipse cx="4" cy="21" rx="2.6" ry="3.4" fill="rgba(0,0,0,.55)"/>
      <path d="M-3,26 C1,29 7,28 10,25" stroke="rgba(0,0,0,.35)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <!-- Stirnschopf -->
      <path d="M-13,-19 C-8,-28 2,-30 8,-24 C2,-22 -4,-18 -7,-12 Z" fill="${mane}"/>
    </g>
    </g>
  </g>
</svg>`;
}

function escapeAttr(s) {
  return String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

/** Kleines Vorschau-SVG für Listen (gleiche Grafik, feste Größe). */
export function horseThumb(h) {
  return horseSVG(h);
}

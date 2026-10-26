/* decorArt.js — gezeichnete Stallausstattung.
 *
 * Kronleuchter, Sitzmöbel, Teppich und Decke sind das Herz des „komfortablen
 * Stalls" und deshalb als richtige Grafik ausgeführt statt als Emoji.
 * Alles inline, damit keine Bilddateien nötig sind.
 */

const flame = (x, y, s = 1) => `
  <g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="3.4" ry="6" fill="#ffcf5c"/>
    <ellipse cx="0" cy="1.4" rx="1.7" ry="3.4" fill="#fff3c4"/>
  </g>`;

const candle = (x, y, h = 14, w = 5) => `
  <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="1.6" fill="#f6efdc"/>
  <rect x="${x - w / 2}" y="${y - h}" width="${w / 2}" height="${h}" fill="rgba(0,0,0,.07)"/>
  ${flame(x, y - h - 5)}`;

/** Kristalltropfen an einem Arm. */
const drop = (x, y, s = 1, col = '#dff0fa') => `
  <path d="M${x},${y} l${3.2 * s},${5 * s} l${-3.2 * s},${6 * s} l${-3.2 * s},${-6 * s} Z"
        fill="${col}" opacity=".9"/>`;

/* ---------------------------------------------------------------- Kronleuchter */

function kronleuchter1() {
  return `
<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" aria-label="Schlichter Kronleuchter">
  <line x1="60" y1="0" x2="60" y2="34" stroke="#4a3a25" stroke-width="3"/>
  <circle cx="60" cy="36" r="5" fill="#8a7038"/>
  <path d="M22,62 Q60,44 98,62" stroke="#8a7038" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M60,40 L60,62" stroke="#8a7038" stroke-width="4"/>
  <path d="M22,62 q0,10 6,14 M98,62 q0,10 -6,14" stroke="#8a7038" stroke-width="4" fill="none"/>
  ${candle(22, 62)} ${candle(60, 58)} ${candle(98, 62)}
  <ellipse cx="60" cy="80" rx="16" ry="6" fill="#8a7038"/>
</svg>`;
}

function kronleuchter2() {
  return `
<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" aria-label="Kristall-Kronleuchter">
  <defs>
    <radialGradient id="kl2glow" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="#fff3c4" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#fff3c4" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="75" cy="72" r="70" fill="url(#kl2glow)"/>
  <line x1="75" y1="0" x2="75" y2="26" stroke="#5b4a2c" stroke-width="3"/>
  <path d="M75,26 L60,44 L90,44 Z" fill="#b9a45c"/>
  <path d="M26,66 Q75,42 124,66" stroke="#c8b165" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M40,86 Q75,68 110,86" stroke="#c8b165" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M75,44 L75,96" stroke="#c8b165" stroke-width="5"/>
  ${candle(26, 66)} ${candle(75, 58)} ${candle(124, 66)}
  ${candle(40, 86, 11, 4)} ${candle(110, 86, 11, 4)}
  ${drop(38, 70)} ${drop(60, 76)} ${drop(75, 72)} ${drop(90, 76)} ${drop(112, 70)}
  ${drop(52, 92, .9)} ${drop(75, 100, 1.2)} ${drop(98, 92, .9)}
  <ellipse cx="75" cy="98" rx="13" ry="5" fill="#c8b165"/>
  ${drop(75, 104, 1.4)}
</svg>`;
}

function kronleuchter3() {
  return `
<svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg" aria-label="Goldener Kronleuchter">
  <defs>
    <radialGradient id="kl3glow" cx="50%" cy="46%" r="55%">
      <stop offset="0%" stop-color="#fff6d0" stop-opacity=".7"/>
      <stop offset="100%" stop-color="#fff6d0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="kl3gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe89a"/>
      <stop offset="55%" stop-color="#e8b736"/>
      <stop offset="100%" stop-color="#a97c12"/>
    </linearGradient>
  </defs>
  <circle cx="85" cy="82" r="84" fill="url(#kl3glow)"/>
  <line x1="85" y1="0" x2="85" y2="20" stroke="#6b5322" stroke-width="4"/>
  <path d="M85,20 L66,40 L104,40 Z" fill="url(#kl3gold)"/>
  <path d="M20,62 Q85,34 150,62" stroke="url(#kl3gold)" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M34,86 Q85,62 136,86" stroke="url(#kl3gold)" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M48,106 Q85,90 122,106" stroke="url(#kl3gold)" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M85,40 L85,116" stroke="url(#kl3gold)" stroke-width="6"/>
  ${candle(20, 62, 16)} ${candle(85, 52, 17)} ${candle(150, 62, 16)}
  ${candle(34, 86, 13, 4.5)} ${candle(136, 86, 13, 4.5)}
  ${candle(48, 106, 11, 4)} ${candle(122, 106, 11, 4)}
  ${drop(32, 68, 1, '#fff1c0')} ${drop(58, 74, 1, '#fff1c0')} ${drop(85, 70, 1.1, '#fff1c0')}
  ${drop(112, 74, 1, '#fff1c0')} ${drop(138, 68, 1, '#fff1c0')}
  ${drop(60, 96, 1, '#fff1c0')} ${drop(110, 96, 1, '#fff1c0')}
  ${drop(85, 122, 1.6, '#fff1c0')}
  <ellipse cx="85" cy="116" rx="14" ry="5" fill="url(#kl3gold)"/>
  <g fill="#fff8d8">
    <path d="M30,40 l2.5,6 l6,2.5 l-6,2.5 l-2.5,6 l-2.5,-6 l-6,-2.5 l6,-2.5 Z"/>
    <path d="M142,44 l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2 l5,-2 Z"/>
  </g>
</svg>`;
}

/* ---------------------------------------------------------------- Sitzmöbel */

function sitz1() {   // Heuballen-Bank
  return `
<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" aria-label="Heuballen-Bank">
  <rect x="6" y="34" width="128" height="58" rx="10" fill="#d9b463"/>
  <rect x="6" y="34" width="128" height="58" rx="10" fill="none" stroke="#a8894a" stroke-width="3"/>
  <g stroke="#c19c4d" stroke-width="2" opacity=".8">
    <path d="M14,46 h112 M14,58 h112 M14,70 h112 M14,82 h112"/>
  </g>
  <rect x="34" y="30" width="8" height="66" fill="#8a6a34" opacity=".7"/>
  <rect x="98" y="30" width="8" height="66" fill="#8a6a34" opacity=".7"/>
  <rect x="0" y="20" width="140" height="14" rx="5" fill="#8b6440"/>
  <rect x="0" y="20" width="140" height="5" rx="2.5" fill="#a37a50"/>
</svg>`;
}

function sitz2() {   // Sofa
  return `
<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" aria-label="Gemütliches Sofa">
  <rect x="14" y="20" width="132" height="46" rx="14" fill="#7a5a86"/>
  <rect x="22" y="28" width="52" height="34" rx="9" fill="#8e6b9c"/>
  <rect x="86" y="28" width="52" height="34" rx="9" fill="#8e6b9c"/>
  <rect x="4" y="42" width="152" height="38" rx="13" fill="#8e6b9c"/>
  <rect x="4" y="42" width="26" height="38" rx="11" fill="#6f5279"/>
  <rect x="130" y="42" width="26" height="38" rx="11" fill="#6f5279"/>
  <rect x="34" y="48" width="44" height="26" rx="8" fill="#a07eae"/>
  <rect x="82" y="48" width="44" height="26" rx="8" fill="#a07eae"/>
  <rect x="18" y="78" width="12" height="16" rx="4" fill="#5a3d24"/>
  <rect x="130" y="78" width="12" height="16" rx="4" fill="#5a3d24"/>
  <g fill="#f2d98a">
    <rect x="40" y="34" width="24" height="22" rx="6" transform="rotate(-12 52 45)"/>
  </g>
</svg>`;
}

function sitz3() {   // Chesterfield-Sessel
  return `
<svg viewBox="0 0 130 120" xmlns="http://www.w3.org/2000/svg" aria-label="Chesterfield-Sessel">
  <defs>
    <linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8c4a3a"/>
      <stop offset="100%" stop-color="#5e2f24"/>
    </linearGradient>
  </defs>
  <path d="M22,26 q43,-14 86,0 l6,44 h-98 Z" fill="url(#leather)"/>
  <rect x="10" y="52" width="110" height="42" rx="14" fill="#7a3f31"/>
  <rect x="10" y="52" width="24" height="42" rx="12" fill="#633227"/>
  <rect x="96" y="52" width="24" height="42" rx="12" fill="#633227"/>
  <rect x="32" y="60" width="66" height="26" rx="9" fill="#96513e"/>
  <g fill="#c58a5e" opacity=".75">
    <circle cx="45" cy="40" r="2.6"/><circle cx="65" cy="36" r="2.6"/><circle cx="85" cy="40" r="2.6"/>
    <circle cx="55" cy="52" r="2.6"/><circle cx="75" cy="52" r="2.6"/>
  </g>
  <rect x="22" y="92" width="12" height="16" rx="4" fill="#3f2718"/>
  <rect x="96" y="92" width="12" height="16" rx="4" fill="#3f2718"/>
</svg>`;
}

/* ---------------------------------------------------------------- Textilien */

function teppich() {
  return `
<svg viewBox="0 0 190 90" xmlns="http://www.w3.org/2000/svg" aria-label="Teppich">
  <ellipse cx="95" cy="45" rx="92" ry="40" fill="#a8332e"/>
  <ellipse cx="95" cy="45" rx="80" ry="33" fill="#c14a41"/>
  <ellipse cx="95" cy="45" rx="66" ry="26" fill="none" stroke="#e8c26a" stroke-width="4"/>
  <ellipse cx="95" cy="45" rx="46" ry="17" fill="#a8332e"/>
  <ellipse cx="95" cy="45" rx="20" ry="8" fill="#e8c26a"/>
  <g stroke="#8e2a26" stroke-width="3" stroke-linecap="round">
    <path d="M6,45 l-6,0 M184,45 l6,0"/>
  </g>
</svg>`;
}

function decke() {   // Pferdedecke auf Stroh
  return `
<svg viewBox="0 0 150 80" xmlns="http://www.w3.org/2000/svg" aria-label="Pferdedecke">
  <ellipse cx="75" cy="62" rx="72" ry="16" fill="#d9b463"/>
  <path d="M18,54 q14,-30 57,-30 q43,0 57,30 q-24,10 -57,10 q-33,0 -57,-10 Z" fill="#3f6b8a"/>
  <path d="M18,54 q14,-30 57,-30 q43,0 57,30" fill="none" stroke="#2c4f66" stroke-width="3"/>
  <g stroke="#e8c26a" stroke-width="4" opacity=".9">
    <path d="M40,50 q10,-24 35,-24 q25,0 35,24"/>
  </g>
  <g stroke="#a8332e" stroke-width="3" opacity=".85">
    <path d="M48,52 q9,-20 27,-20 q18,0 27,20"/>
  </g>
  <ellipse cx="75" cy="56" rx="58" ry="8" fill="rgba(0,0,0,.12)"/>
</svg>`;
}

/* ---------------------------------------------------------------- Register */

export const DECOR_ART = {
  kronleuchter1, kronleuchter2, kronleuchter3,
  sitz1, sitz2, sitz3,
  teppich, decke,
};

/** SVG-Markup für ein Deko-Stück, oder null wenn es nur ein Emoji hat. */
export function decorArt(id) {
  const fn = DECOR_ART[id];
  return fn ? fn() : null;
}

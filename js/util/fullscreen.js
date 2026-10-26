/* fullscreen.js — Vollbild und Bildschirmlage
 *
 * Auf dem Handy soll das Spiel den ganzen Schirm bekommen: Adressleiste und
 * Systemleisten weg, damit die Box und der Parcours nicht auf zwei Drittel
 * Hoehe gedraengt werden.
 *
 * Zwei Dinge machen das unbequem:
 *
 *   1. Vollbild gibt es nur direkt aus einer Nutzergeste heraus. Von selbst
 *      laesst sich der Modus nicht betreten — deshalb haengt der Aufruf am
 *      ersten Tippen im Titelmenue und am Start eines Parcours.
 *   2. iPhones koennen es gar nicht: Safari kennt die Vollbild-Schnittstelle
 *      auf dem iPhone nicht (nur fuer Video). Dort ist der Weg "Zum
 *      Home-Bildschirm hinzufuegen" — das Spiel startet dann ohne
 *      Browserleiste. Darauf weisen die Einstellungen hin.
 *
 * Alles hier scheitert leise: Wo es kein Vollbild gibt, laeuft das Spiel
 * einfach im Fenster weiter.
 */

const root = () => document.documentElement;

/** Kennt dieser Browser ueberhaupt Vollbild? (iPhone: nein) */
export function fullscreenSupported() {
  const el = root();
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/** Fordert Vollbild an. Muss aus einem Klick heraus gerufen werden. */
export function enterFullscreen() {
  const el = root();
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || isFullscreen()) return Promise.resolve(isFullscreen());
  // navigationUI: 'hide' bittet Android, auch die Systemleisten auszublenden.
  return Promise.resolve(req.call(el, { navigationUI: 'hide' }))
    .then(() => true)
    .catch(() => false);
}

export function exitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  if (!fn || !isFullscreen()) return Promise.resolve(false);
  return Promise.resolve(fn.call(document)).then(() => true).catch(() => false);
}

export function toggleFullscreen() {
  return isFullscreen() ? exitFullscreen() : enterFullscreen();
}

/** Wird gerufen, sobald der Nutzer den Modus verlaesst oder betritt. */
export function onFullscreenChange(fn) {
  document.addEventListener('fullscreenchange', fn);
  document.addEventListener('webkitfullscreenchange', fn);
}

/* ---------------------------------------------------------------- Lage */

/**
 * Bittet um Querformat — der Parcours lebt davon. Die Sperre gilt nur im
 * Vollbild und nur dort, wo der Browser sie kennt (Android/Chrome); sonst
 * bleibt es beim Hinweis im Bild, das Geraet zu drehen.
 */
export function lockLandscape() {
  const o = screen.orientation;
  if (!o?.lock) return Promise.resolve(false);
  return Promise.resolve(o.lock('landscape')).then(() => true).catch(() => false);
}

export function unlockOrientation() {
  try { screen.orientation?.unlock?.(); } catch { /* nicht unterstuetzt */ }
}

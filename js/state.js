/* state.js — zentraler Spielzustand, Speichern/Laden, Offline-Abbau */

import { makeHorse, decayNeeds, NEEDS } from './horse.js';
import { DECOR, comfortOf } from './catalog.js';

const SAVE_KEY = 'goldhuf.save';
const SAVE_VERSION = 1;

/** Wie viele Stunden Abwesenheit maximal angerechnet werden. */
const OFFLINE_CAP_HOURS = 8;

export const state = {
  version: SAVE_VERSION,
  coins: 120,
  lastSeen: Date.now(),
  activeHorseId: null,
  stableSlots: 2,
  horses: [],
  inventory: { hay: 3, oats: 0, carrots: 1, straw: 2, lickstone: 0, horseshoes: 1 },
  equipment: [],
  levels: {},
  talisman: false,
  lastDailyBonus: 0,
  pasture: { grass: 100, horses: [] },   // Weide: Grasstand und wer draußen ist
  settings: { sound: true, music: true, fullscreen: true },
};

/* ---------------------------------------------------------------- Abo */

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit() { for (const fn of listeners) fn(state); }

/* ---------------------------------------------------------------- Speichern / Laden */

export function save() {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen:', e);
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function load() {
  let raw;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return false; }
  if (!raw) return false;

  let data;
  try { data = JSON.parse(raw); } catch { return false; }
  if (!data || typeof data !== 'object') return false;

  data = migrate(data);

  // Zusammenführen, damit neue Felder aus künftigen Versionen Standardwerte behalten
  Object.assign(state, {
    ...state,
    ...data,
    inventory: { ...state.inventory, ...(data.inventory || {}) },
    settings:  { ...state.settings,  ...(data.settings  || {}) },
  });

  // Pferde reparieren (fehlende Bedürfnisse ergänzen)
  state.horses = (state.horses || []).map(h => {
    const base = makeHorse({ id: h.id });
    return { ...base, ...h, needs: { ...base.needs, ...(h.needs || {}) }, decor: h.decor || [] };
  });

  // Früher war die Deko für alle Ställe gemeinsam. Damit niemand etwas verliert,
  // bekommt jeder Stall eine eigene Kopie der bisherigen Einrichtung.
  if (Array.isArray(data.decor) && data.decor.length) {
    for (const h of state.horses) {
      if (!h.decor.length) h.decor = data.decor.map(d => ({ ...d }));
    }
  }
  delete state.decor;

  // Früher lagen die Pferdeäpfel im Spielstand statt in der Box.
  if (Array.isArray(data.muck) && data.muck.length) {
    const active = getActiveHorse() || state.horses[0];
    if (active && !(active.muck || []).length) active.muck = data.muck.map(m => ({ ...m }));
  }
  delete state.muck;

  // Weide ergänzen, falls der Spielstand sie noch nicht kennt
  state.pasture = { grass: 100, horses: [], ...(data.pasture || {}) };
  state.pasture.horses = (state.pasture.horses || []).filter(id => state.horses.some(h => h.id === id));

  if (!state.horses.length) return false;
  if (!getActiveHorse()) state.activeHorseId = state.horses[0].id;

  lastOfflineHours = applyOfflineDecay();
  return true;
}

/** Wie lange der Stall beim letzten Laden unbeaufsichtigt war (Stunden). */
let lastOfflineHours = 0;
export function getLastOfflineHours() { return lastOfflineHours; }

function migrate(data) {
  // Platz für spätere Formatänderungen: data.version prüfen und Felder umbauen.
  if (!data.version) data.version = SAVE_VERSION;
  return data;
}

export function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  Object.assign(state, {
    version: SAVE_VERSION,
    coins: 120,
    lastSeen: Date.now(),
    activeHorseId: null,
    stableSlots: 2,
    horses: [],
    inventory: { hay: 3, oats: 0, carrots: 1, straw: 2, lickstone: 0, horseshoes: 1 },
    equipment: [],
    levels: {},
    talisman: false,
    lastDailyBonus: 0,
    pasture: { grass: 100, horses: [] },
    settings: { ...state.settings },
  });
}

/* ---------------------------------------------------------------- Zeitablauf */

/**
 * Rechnet die Abwesenheit an — gedeckelt, damit nach längerer Pause
 * kein völlig verwahrlostes Pferd im Stall steht.
 */
export function applyOfflineDecay() {
  const hours = Math.min(OFFLINE_CAP_HOURS, (Date.now() - (state.lastSeen || Date.now())) / 3.6e6);
  if (hours <= 0.01) return 0;
  tickNeeds(hours);

  // Auch in der Abwesenheit sind Pferdeäpfel gefallen — etwa alle 40 Minuten
  // einer; in den Boxen der ruhenden Pferde halb so oft.
  for (const h of state.horses) {
    if (isOnPasture(h)) continue;          // draußen fällt nichts in die Box
    const rate = h.id === state.activeHorseId ? 1.5 : 0.75;
    const dropped = Math.floor(hours * rate);
    for (let i = 0; i < dropped; i++) dropMuck(null, h);
  }
  tickPasture(hours * 60);

  state.lastSeen = Date.now();
  return hours;
}

/* ---------------------------------------------------------------- Pferdeäpfel */

/* Auch die Äpfel gehören zur einzelnen Box: Wer in Stall A aufräumt, findet in
   Stall B trotzdem noch, was dort liegt. */

/** Wie viele Haufen höchstens gleichzeitig in einer Box liegen. */
const MUCK_MAX = 7;
/** Wie stark ein Haufen die Sauberkeit drückt. */
export const MUCK_DIRT = 7;

let muckSeq = 0;

export function getMuck(horse = getActiveHorse()) {
  if (!horse) return [];
  if (!horse.muck) horse.muck = [];
  return horse.muck;
}

/** Einen Haufen fallen lassen (optional an einer bestimmten Stelle in %). */
export function dropMuck(x = null, horse = getActiveHorse()) {
  if (!horse) return null;
  const list = getMuck(horse);
  if (list.length >= MUCK_MAX) return null;

  const pile = {
    id: 'm' + Date.now().toString(36) + (muckSeq++).toString(36),
    x: x == null ? 15 + Math.random() * 70 : Math.max(6, Math.min(94, x)),
    y: 4 + Math.random() * 26,          // Tiefe im Boden, in Pixeln
    size: 0.85 + Math.random() * 0.35,
  };
  list.push(pile);
  horse.needs.clean = Math.max(0, horse.needs.clean - MUCK_DIRT);
  return pile;
}

/** Einen Haufen wegräumen. Gibt zurück, ob es ihn gab. */
export function removeMuck(id, horse = getActiveHorse()) {
  const list = getMuck(horse);
  const i = list.findIndex(m => m.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

export function muckCount(horse = getActiveHorse()) { return getMuck(horse).length; }

/** Bedürfnisabbau für alle Pferde um `hours` Stunden.
 *  Jeder Stall zählt für sich: nur die Deko in der eigenen Box hilft. */
export function tickNeeds(hours) {
  const stallMul = hasEquip('traenke') ? { water: 0.5 } : {};
  // Draußen wird das Fell schneller schmutzig und der Durst größer, dafür
  // verschmutzt die Box nicht, solange das Pferd nicht darin steht.
  const pastureMul = { clean: 0, coat: 1.4, water: 1.3 };

  for (const h of state.horses) {
    const outside = isOnPasture(h);
    decayNeeds(h, hours, {
      comfort: outside ? 0 : comfortOf(h.decor || []),
      active: h.id === state.activeHorseId,
      needMul: outside ? pastureMul : stallMul,
    });
  }
}

/* ---------------------------------------------------------------- Pferde */

export function getActiveHorse() {
  return state.horses.find(h => h.id === state.activeHorseId) || null;
}

export function setActiveHorse(id) {
  if (state.horses.some(h => h.id === id)) {
    state.activeHorseId = id;
    save(); emit();
  }
}

export function addHorse(horse) {
  state.horses.push(horse);
  if (!state.activeHorseId) state.activeHorseId = horse.id;
  save(); emit();
  return horse;
}

export function freeStableSlots() {
  return state.stableSlots - state.horses.length;
}

/* ---------------------------------------------------------------- Münzen & Inventar */

export function addCoins(n) {
  state.coins = Math.max(0, Math.round(state.coins + n));
  save(); emit();
  return state.coins;
}

export function canAfford(price) { return state.coins >= price; }

export function spend(price) {
  if (!canAfford(price)) return false;
  state.coins -= price;
  save(); emit();
  return true;
}

export function invCount(key) { return state.inventory[key] || 0; }

export function addInv(key, n) {
  state.inventory[key] = Math.max(0, (state.inventory[key] || 0) + n);
  save(); emit();
}

export function useInv(key, n = 1) {
  if (invCount(key) < n) return false;
  state.inventory[key] -= n;
  save(); emit();
  return true;
}

export function hasEquip(id) { return state.equipment.includes(id); }

export function addEquip(id) {
  if (!hasEquip(id)) state.equipment.push(id);
  save(); emit();
}

/* ---------------------------------------------------------------- Deko */

/* Jeder Stall wird einzeln eingerichtet: Die Deko hängt am Pferd, nicht am
   Spielstand. Wer einen zweiten Kronleuchter will, kauft ihn also noch einmal. */

/** Die Deko-Liste eines Stalls (standardmäßig die des aktiven Pferdes). */
export function getDecor(horse = getActiveHorse()) {
  if (!horse) return [];
  if (!horse.decor) horse.decor = [];
  return horse.decor;
}

export function hasDecor(id, horse = getActiveHorse()) {
  return getDecor(horse).some(d => d.id === id);
}

export function addDecor(id, horse = getActiveHorse()) {
  const def = DECOR[id];
  if (!def || !horse || hasDecor(id, horse)) return;
  const list = getDecor(horse);

  // Ein Stück derselben Gruppe (z. B. Kronleuchter) ersetzt das vorherige —
  // die Position wird übernommen, damit nichts an eine neue Stelle springt.
  let pos = null;
  if (def.group) {
    const oldIdx = list.findIndex(d => DECOR[d.id]?.group === def.group);
    if (oldIdx >= 0) { pos = list[oldIdx]; list.splice(oldIdx, 1); }
  }
  list.push({
    id,
    x: pos?.x ?? def.defaultX ?? 50,
    y: pos?.y ?? def.defaultY ?? 50,
  });
  save(); emit();
}

export function moveDecor(id, x, y, horse = getActiveHorse()) {
  const d = getDecor(horse).find(d => d.id === id);
  if (!d) return;
  d.x = x; d.y = y;
  save();
}

/** Komfortpunkte des Stalls — wirkt nur auf das Pferd, das darin steht. */
export function comfort(horse = getActiveHorse()) {
  return comfortOf(getDecor(horse));
}

/* ---------------------------------------------------------------- Strecken */

export function levelRecord(levelId) {
  return state.levels[levelId] || { bestTime: null, bestCoins: 0, runs: 0, finished: false };
}

export function saveLevelRun(levelId, { time, coins, finished }) {
  const rec = { ...levelRecord(levelId) };
  const newTime  = finished && (rec.bestTime == null || time < rec.bestTime);
  const newCoins = coins > (rec.bestCoins || 0);

  rec.runs = (rec.runs || 0) + 1;
  if (finished) rec.finished = true;
  if (newTime)  rec.bestTime = time;
  if (newCoins) rec.bestCoins = coins;

  state.levels[levelId] = rec;
  save(); emit();
  return { newTime, newCoins };
}

/** Gesamtzahl je verdienter Münzen — Grundlage für die Freischaltung von Strecken. */
export function totalEarned() {
  return state.coins + (state.spentTotal || 0);
}

export function trackSpend(n) {
  state.spentTotal = (state.spentTotal || 0) + n;
}

/* ---------------------------------------------------------------- Weide */

/**
 * Die Weide ist ein gemeinsamer Vorrat: Gras wächst langsam nach und wird von
 * den Pferden abgefressen. Ist es alle, müssen sie zurück in den Stall.
 */
export const PASTURE = {
  eatPerMin: 15,        // Gras, das ein Pferd je Minute frisst
  foodPerMin: 25,       // Sattheit, die es dabei gewinnt
  regrowPerMin: 3.5,    // Nachwachsen auf leerer Weide
  grazedRegrow: 0.25,   // …anteilig, solange Pferde darauf stehen
  lowWarning: 25,       // ab hier wird gewarnt
};

export function isOnPasture(horse) {
  return !!horse && (state.pasture?.horses || []).includes(horse.id);
}

export function pastureHorses() {
  return (state.pasture?.horses || [])
    .map(id => state.horses.find(h => h.id === id))
    .filter(Boolean);
}

export function grassLevel() { return Math.round(state.pasture?.grass ?? 0); }

/** Ab so viel Gras lohnt sich der Weidegang überhaupt. */
export const PASTURE_MIN_GRASS = 10;

export function canGoOut() { return grassLevel() >= PASTURE_MIN_GRASS; }

export function sendToPasture(id) {
  if (!canGoOut()) return false;
  if (!state.pasture.horses.includes(id) && state.horses.some(h => h.id === id)) {
    state.pasture.horses.push(id);
    save(); emit();
    return true;
  }
  return false;
}

export function bringToStable(id) {
  const i = state.pasture.horses.indexOf(id);
  if (i < 0) return false;
  state.pasture.horses.splice(i, 1);
  save(); emit();
  return true;
}

/**
 * Weide um `minutes` Minuten weiterlaufen lassen.
 * Längere Zeiträume werden in Häppchen gerechnet, damit Abfressen und
 * Nachwachsen in der richtigen Reihenfolge passieren.
 * @returns {{eaten:number, returned:string[]}}
 */
export function tickPasture(minutes) {
  if (!state.pasture) state.pasture = { grass: 100, horses: [] };
  if (minutes <= 0) return { eaten: 0, returned: [] };

  let eatenTotal = 0;
  let returned = [];

  let left = minutes;
  while (left > 0) {
    const dt = Math.min(10, left);
    left -= dt;

    const list = pastureHorses();
    let starved = false;

    if (list.length) {
      const want = PASTURE.eatPerMin * dt * list.length;
      const eaten = Math.min(state.pasture.grass, want);
      state.pasture.grass -= eaten;
      eatenTotal += eaten;

      // Was jedes Pferd davon abbekommt
      const per = (eaten / list.length) / PASTURE.eatPerMin * PASTURE.foodPerMin;
      for (const h of list) {
        h.needs.food = Math.min(100, h.needs.food + per);
      }

      // Reichte das Gras nicht für alle? Dann ist die Weide abgefressen.
      if (eaten < want - 0.001) starved = true;
    }

    // Erst zurückschicken, dann nachwachsen lassen — sonst wäre die Weide
    // nie leer und die Pferde blieben ewig draußen.
    if (starved) {
      returned = list.map(h => h.name);
      state.pasture.horses = [];
    }

    const factor = state.pasture.horses.length ? PASTURE.grazedRegrow : 1;
    state.pasture.grass = Math.min(100, state.pasture.grass + PASTURE.regrowPerMin * dt * factor);
  }

  return { eaten: eatenTotal, returned };
}

/* ---------------------------------------------------------------- Tränke und Raufe */

/** Vorrat in Tränke bzw. Raufe verändern (0–100). */
export function addSupply(horse, key, amount) {
  const before = horse[key] ?? 0;
  horse[key] = Math.max(0, Math.min(100, before + amount));
  return horse[key] - before;
}

/* ---------------------------------------------------------------- Tagesbonus */

export function claimDailyBonus() {
  const today = new Date().toDateString();
  if (state.lastDailyBonus === today) return 0;
  state.lastDailyBonus = today;
  addCoins(25);
  return 25;
}

/* ---------------------------------------------------------------- Debug-Hilfe */

if (typeof window !== 'undefined') {
  window.__goldhuf = { state, save, load, resetGame, NEEDS };
}

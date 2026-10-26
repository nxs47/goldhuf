/* care.js — Pflege: Beschreibung der Aktionen und ihre Wirkung.
 *
 * Die Bedienung findet direkt in der Stallbox statt (siehe stableScene.js);
 * hier stehen nur die Daten und die Rechnerei: Was füllt wie viel auf, wann
 * gibt es Münzen, und wann ist eine Aktion überhaupt sinnvoll.
 */

import { toast } from './util/dom.js';
import { addCoins, invCount, save, emit, muckCount } from './state.js';
import { addNeed, NEEDS } from './horse.js';

/** Ab diesem Wert gilt ein Bedürfnis als erledigt — darüber gibt es keine Münzen mehr. */
const REWARD_THRESHOLD = 72;

/* ---------------------------------------------------------------- Aktionen */

/**
 * target: worauf geklickt/gezogen wird — 'horse', 'floor', 'muck', 'wall', 'hooves'
 * mode:   'click' (einmal antippen), 'drag' (streichen), 'sequence' (mehrere Punkte)
 */
export const ACTIONS = {
  feed: {
    name: 'Füttern', icon: '🌾', need: 'food', target: 'horse', mode: 'click',
    hint: 'Futter aussuchen — auf {name} tippen füttert direkt, auf die Raufe füllt den Vorrat.',
    pick: true,                                   // braucht vorher eine Futterauswahl
  },
  water: {
    name: 'Tränken', icon: '💧', need: 'water', target: 'horse', mode: 'click',
    hint: 'Auf die Tränke tippen füllt sie auf — auf {name} getippt, geht es gleich trinken.',
  },
  muck: {
    name: 'Ausmisten', icon: '🔱', need: 'clean', target: 'muck', mode: 'click',
    hint: 'Tippe die Pferdeäpfel an, um sie wegzuräumen.',
  },
  bed: {
    name: 'Einstreuen', icon: '🟨', need: 'clean', item: 'straw', target: 'floor', mode: 'drag',
    hint: 'Ziehe über den Boden und verteile das Stroh.',
  },
  lick: {
    name: 'Leckstein', icon: '🧂', need: 'food', item: 'lickstone', target: 'wall', mode: 'click',
    hint: 'Tippe an die Wand, wo der Leckstein hängen soll.',
  },
  groom: {
    name: 'Striegeln', icon: '🪮', need: 'coat', target: 'horse', mode: 'drag',
    hint: 'Streiche in Kreisen über das Fell.',
  },
  brush: {
    name: 'Putzen', icon: '🧽', need: 'coat', target: 'horse', mode: 'drag',
    hint: 'Bürste Fell und Hufe von {name} sauber.',
  },
  shoe: {
    name: 'Hufeisen', icon: '🧲', need: 'hooves', item: 'horseshoes', target: 'hooves', mode: 'sequence',
    hint: 'Tippe nacheinander auf alle vier Hufe.',
  },
};

/** Die drei Futtersorten. */
export const FOODS = {
  hay:     { name: 'Heu',    icon: '🌾', amount: 18, coins: 6 },
  oats:    { name: 'Hafer',  icon: '🥣', amount: 35, coins: 10 },
  carrots: { name: 'Möhre',  icon: '🥕', amount: 22, coins: 8, bonusCoat: 4 },
};

/* ---------------------------------------------------------------- Verfügbarkeit */

/**
 * Darf die Aktion gerade ausgeführt werden?
 * @returns {{ok:boolean, reason:string}}
 */
export function checkAction(key, horse) {
  const a = ACTIONS[key];
  if (!a) return { ok: false, reason: 'Unbekannt' };

  if (key === 'feed' && Object.keys(FOODS).every(k => invCount(k) <= 0))
    return { ok: false, reason: 'Kein Futter im Vorrat — im Shop kaufen.' };

  if (a.item && invCount(a.item) <= 0)
    return { ok: false, reason: `Kein Vorrat: ${a.name}. Im Shop nachkaufen.` };

  switch (key) {
    case 'water':
      if (horse.needs.water > 96 && (horse.trough ?? 0) > 96)
        return { ok: false, reason: 'Tränke voll — und das Pferd hat keinen Durst.' };
      break;
    case 'feed':
      if (horse.needs.food > 96 && (horse.rack ?? 0) > 92)
        return { ok: false, reason: 'Raufe voll — und das Pferd ist satt.' };
      break;
    case 'muck':
      if (muckCount() === 0) return { ok: false, reason: 'Es liegt nichts herum.' };
      break;
    case 'bed':
      if (horse.needs.clean > 92) return { ok: false, reason: 'Die Einstreu ist frisch.' };
      if (muckCount() > 2) return { ok: false, reason: 'Erst die Pferdeäpfel wegräumen.' };
      break;
    case 'groom':
    case 'brush':
      if (horse.needs.coat > 96) return { ok: false, reason: 'Das Fell glänzt schon.' };
      break;
    case 'shoe':
      if (horse.needs.hooves > 90) return { ok: false, reason: 'Die Eisen sitzen noch gut.' };
      break;
    case 'lick':
      if (horse.lickStone > 0.6) return { ok: false, reason: 'Der Leckstein hängt schon.' };
      break;
  }
  return { ok: true, reason: ACTIONS[key].hint };
}

/* ---------------------------------------------------------------- Wirkung */

/** Münzen für eine Pflegeaktion — abhängig davon, wie nötig sie war. */
export function rewardFor(before, gained, base) {
  if (before >= REWARD_THRESHOLD) return 0;
  const urgency = (REWARD_THRESHOLD - before) / REWARD_THRESHOLD;   // 0…1
  return Math.max(1, Math.round(base * (0.4 + 0.6 * urgency) * (gained / 100 + 0.5)));
}

export function needName(key) { return NEEDS.find(n => n.key === key)?.name || key; }

/**
 * Bedürfnis auffüllen, Münzen gutschreiben, Meldung zeigen.
 * @returns {{gained:number, coins:number}}
 */
export function applyCare(horse, needKey, amount, baseCoins, label, quiet = false) {
  const before = horse.needs[needKey];
  const gained = addNeed(horse, needKey, amount);
  const coins = rewardFor(before, gained, baseCoins);
  if (coins > 0) addCoins(coins);
  save(); emit();

  if (!quiet) {
    toast(coins > 0
      ? `${label} — +${Math.round(gained)} ${needName(needKey)}, 🪙 ${coins}`
      : `${label} — +${Math.round(gained)} ${needName(needKey)}`, 'good');
  }
  return { gained, coins };
}

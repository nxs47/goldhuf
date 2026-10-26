/* select.js — Streckenwahl und Ergebnisbildschirm */

import { el, formatTime, toast } from '../util/dom.js';
import { sfx } from '../util/audio.js';
import { state, levelRecord, saveLevelRun, addCoins, totalEarned, getActiveHorse } from '../state.js';
import { LEVELS, isUnlocked } from './levels.js';
import { ridingStats, conditionLabel, condition as horseCondition, BREEDS } from '../horse.js';

let nav = {};
export function initSelect(navigation) { nav = navigation; }

/* ---------------------------------------------------------------- Streckenwahl */

const BANNERS = {
  reitplatz:      'linear-gradient(#a8d8f0 0 55%, #8fbf6a 55%, #c9a86a 78%)',
  waldweg:        'linear-gradient(#bfe0ef 0 45%, #4f7a38 45%, #8a6b45 78%)',
  wiesenparcours: 'linear-gradient(#9fd4f5 0 50%, #9ccf6f 50%, #7fb356 76%)',
  turnierplatz:   'linear-gradient(#8ec9ee 0 48%, #87b96a 48%, #d8b57e 74%)',
  bergpfad:       'linear-gradient(#1d2c4a 0 58%, #2c3d5c 58%, #4a4437 80%)',
};

export function renderLevels(root) {
  root.innerHTML = '';
  const horse = getActiveHorse();
  const stats = ridingStats(horse);
  const earned = totalEarned();

  const cards = LEVELS.map(lv => {
    const unlocked = isUnlocked(lv, earned);
    const rec = levelRecord(lv.id);

    return el('div', {
      class: `card level-card clickable ${unlocked ? '' : 'locked'}`,
      onclick: () => {
        if (!unlocked) {
          sfx.error();
          toast(`Noch gesperrt — du brauchst insgesamt ${lv.unlockAt} Münzen.`, 'bad');
          return;
        }
        sfx.click();
        nav.startRide(lv.id);
      },
    }, [
      el('div', { class: 'card-art', style: { background: BANNERS[lv.id], fontSize: '3rem' } }, lv.icon),
      el('div', { class: 'card-title' }, [
        lv.name,
        rec.finished ? el('span', { class: 'badge owned', text: '✔ geschafft' }) : null,
        !unlocked ? el('span', { class: 'badge locked', text: '🔒' }) : null,
      ]),
      el('div', { class: 'card-desc', text: lv.desc }),
      el('div', { class: 'level-records' }, [
        el('span', {}, ['Bestzeit: ', el('b', { text: formatTime(rec.bestTime) })]),
        el('span', {}, ['Rekord: ', el('b', { text: `🪙 ${rec.bestCoins || 0}` })]),
      ]),
      !unlocked
        ? el('div', { class: 'card-desc', text: `Freigeschaltet ab ${lv.unlockAt} insgesamt verdienten Münzen (du hast ${earned}).` })
        : el('div', { class: 'card-foot' }, [
            el('div', { class: 'grow' }),
            el('button', { class: 'btn btn-sm btn-primary' }, '🏇 Starten'),
          ]),
    ]);
  });

  const info = conditionLabel(stats.condition);

  root.append(el('div', { class: 'page' }, [
    el('div', { class: 'page-head' }, [
      el('div', {}, [
        el('h2', { text: '🏇 Wohin soll es gehen?' }),
        el('p', { class: 'sub', text: `Du reitest ${horse.name} (${BREEDS[horse.breed].name}).` }),
      ]),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn', onclick: () => nav.go('stable') }, '↩ Zurück in den Stall'),
    ]),

    el('div', { class: 'panel', style: { marginBottom: '18px' } }, [
      el('div', { class: 'stat-row' }, [
        el('span', { text: 'Zustand des Pferdes' }),
        el('b', { text: `${stats.condition} % — ${info.label}` }),
      ]),
      el('div', { class: 'stat-row' }, [
        el('span', { text: 'Münzbonus' }),
        el('b', { text: stats.coinBonus > 1 ? `×${stats.coinBonus} (ab 80 % Zustand)` : 'kein Bonus — pflege dein Pferd für ×1,5' }),
      ]),
      el('div', { class: 'stat-row' }, [
        el('span', { text: 'Sprungkraft / Tempo' }),
        el('b', { text: stats.condition < 50 ? 'gemindert durch schlechten Zustand' : 'voll' }),
      ]),
      state.talisman
        ? el('div', { class: 'stat-row' }, [el('span', { text: 'Glückshufeisen' }), el('b', { text: '🍀 aktiv — rettet die Hälfte der Münzen' })])
        : null,
    ]),

    el('div', { class: 'grid' }, cards),
  ]));
}

/* ---------------------------------------------------------------- Ergebnis */

export function renderResult(root, data) {
  root.innerHTML = '';

  // Belohnung genau einmal gutschreiben
  let records = { newTime: false, newCoins: false };
  if (!data.applied) {
    data.applied = true;
    addCoins(data.total);
    records = saveLevelRun(data.levelId, { time: data.time, coins: data.total, finished: true });
    if (records.newTime) addCoins(25);
    data.records = records;
  } else {
    records = data.records || records;
  }

  const line = (label, value, cls = '') =>
    el('div', { class: `result-line ${cls}` }, [el('span', { text: label }), el('span', {}, value)]);

  root.append(el('div', { class: 'page' }, [
    el('div', { class: 'result-wrap' }, [
      el('h2', { class: 'result-title', text: '🏁 Geschafft!' }),
      el('p', { style: { color: '#d8c3a4' }, text: `${data.horse.name} hat den ${data.levelName} gemeistert.` }),

      el('div', { class: 'result-lines' }, [
        line('Zeit', [
          formatTime(data.time),
          records.newTime ? el('span', { class: 'new-record', text: '  ★ Bestzeit! (+25)' }) : null,
        ]),
        line('Eingesammelte Münzen', `🪙 ${data.coins}`),
        line(`Fehlerfreie Sprünge (${data.cleared} × 5)`, `🪙 ${data.clearBonus}`),
        data.multiplier > 1
          ? line('Bonus für gepflegtes Pferd', `×${data.multiplier.toFixed(2)}`)
          : line('Bonus', 'kein Bonus — pflege dein Pferd besser'),
        line('Gesamt', `🪙 ${data.total}`, 'total'),
      ]),

      el('p', { class: 'sub', style: { color: '#cbb392' },
        text: `${data.horse.name} ist nach dem Ritt hungrig und verschwitzt — Zustand jetzt ${horseCondition(data.horse)} %.` }),

      el('div', { class: 'result-actions' }, [
        el('button', { class: 'btn btn-primary', onclick: () => nav.startRide(data.levelId) }, '↻ Nochmal'),
        el('button', { class: 'btn', onclick: () => nav.go('levels') }, '🗺️ Andere Strecke'),
        el('button', { class: 'btn', onclick: () => nav.go('stable') }, '🏠 Zum Stall'),
      ]),
    ]),
  ]));
}

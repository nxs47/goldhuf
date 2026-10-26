/* stable.js — der Stallbildschirm: Bedürfnisleiste, lebendige Box, Werkzeugleiste.
 *
 * Die Box selbst steckt in stableScene.js und bleibt beim Auffrischen bestehen,
 * damit das Pferd nicht bei jeder Änderung an seinen Startplatz zurückspringt.
 */

import { el, toast, modal } from './util/dom.js';
import { sfx } from './util/audio.js';
import {
  state, getActiveHorse, setActiveHorse, invCount, comfort,
  muckCount, getDecor, freeStableSlots, isOnPasture, bringToStable, grassLevel,
} from './state.js';
import { NEEDS, condition, conditionLabel, BREEDS, ridingStats, horseSVG } from './horse.js';
import { lightTier } from './catalog.js';
import { ACTIONS, FOODS, checkAction } from './care.js';
import { createScene } from './stableScene.js';

let nav = {};
let ui = null;

export function initStable(navigation) { nav = navigation; }

/* ---------------------------------------------------------------- Aufbau */

export function renderStable(root) {
  const horse = getActiveHorse();
  if (!horse) { root.innerHTML = '<p class="empty-note">Kein Pferd im Stall.</p>'; return; }

  const away = isOnPasture(horse);

  // Nur neu bauen, wenn es sein muss — sonst bliebe die Box nicht am Leben.
  if (!ui || ui.horseId !== horse.id || ui.away !== away || !root.contains(ui.wrap)) {
    build(root, horse, away);
  } else {
    refresh();
  }
}

function build(root, horse, away) {
  ui?.scene?.destroy();
  root.innerHTML = '';

  const stripSlot = el('div', { class: 'strip-slot' }, stallStrip(horse));
  const needsSlot = el('div', { class: 'needs-slot' }, needsBar(horse));
  const head = el('div', { class: 'stable-head' }, [stripSlot, needsSlot]);

  // Ist das Pferd auf der Weide, steht die Box leer.
  const scene = away ? null : createScene({ onChange: () => refresh() });
  const middle = away ? emptyBox(horse) : scene.el;
  const toolSlot = el('div', { class: 'tool-slot' }, away ? awayBar(horse) : toolbar(horse, scene));

  const wrap = el('div', { class: 'stable-layout' }, [head, middle, toolSlot]);
  root.append(wrap);

  ui = { wrap, stripSlot, needsSlot, toolSlot, scene, horseId: horse.id, away };
}

/** Bedürfnisleiste und Werkzeuge neu zeichnen, Box aktualisieren. */
function refresh() {
  if (!ui) return;
  const horse = getActiveHorse();
  if (!horse) return;

  ui.stripSlot.replaceChildren(stallStrip(horse));
  ui.needsSlot.replaceChildren(needsBar(horse));
  if (ui.away) {
    ui.toolSlot.replaceChildren(awayBar(horse));
  } else {
    ui.toolSlot.replaceChildren(toolbar(horse, ui.scene));
    ui.scene.update();
  }
}

/** Vom Zeittakt gerufen. Geht über renderStable, damit auch ein Wechsel
 *  zwischen „auf der Weide" und „in der Box" bemerkt wird. */
export function refreshNeeds() {
  const root = document.getElementById('screen-stable');
  if (root) renderStable(root);
}

/** Wird beim Verlassen des Bildschirms gerufen. */
export function stableInactive() {
  ui?.scene?.setTool(null);
}

/* ---------------------------------------------------------------- Leere Box */

function emptyBox(horse) {
  return el('div', { class: 'box-scene empty-box' }, [
    el('div', { class: 'box-floor' }, el('div', { class: 'box-bedding' })),
    el('div', { class: 'away-note' }, [
      el('div', { class: 'away-icon', text: '🌿' }),
      el('h3', { text: `${horse.name} ist auf der Weide` }),
      el('p', { text: 'Draußen frisst es Gras und wird von selbst satt. '
                    + 'Gepflegt und geritten wird erst wieder, wenn es zurück im Stall ist.' }),
      el('div', { class: 'away-actions' }, [
        el('button', {
          class: 'btn btn-primary',
          onclick: () => { sfx.click(); bringToStable(horse.id); toast(`${horse.name} ist zurück im Stall.`, 'good'); refreshNeeds(); },
        }, '🏠 Zurückholen'),
        el('button', { class: 'btn', onclick: () => nav.go('pasture') }, '🌿 Zur Weide'),
      ]),
    ]),
  ]);
}

function awayBar(horse) {
  return el('div', { class: 'toolbar' }, [
    el('div', { class: 'big-actions' }, [
      el('button', {
        class: 'btn btn-primary',
        onclick: () => { sfx.click(); bringToStable(horse.id); toast(`${horse.name} ist zurück im Stall.`, 'good'); refreshNeeds(); },
      }, '🏠 Zurückholen'),
      el('button', { class: 'btn', onclick: () => nav.go('pasture') }, '🌿 Weide'),
      el('button', { class: 'btn', onclick: () => nav.go('shop') }, '🛒 Shop'),
      el('button', { class: 'btn', onclick: () => nav.go('horses') }, '🐎 Pferde'),
    ]),
  ]);
}

/* ---------------------------------------------------------------- Stallwechsel */

/**
 * Kleine Vorschau jeder Box. Ein Klick wechselt sofort dorthin — der Umweg
 * über den Pferdebildschirm entfällt.
 */
function stallStrip(active) {
  const free = freeStableSlots();
  if (state.horses.length <= 1 && free <= 0) return el('div');

  const tiles = state.horses.map(h => {
    const isActive = h.id === active.id;
    const c = condition(h);
    const info = conditionLabel(c);
    const piles = muckCount(h);
    const tier = lightTier(getDecor(h));
    const outside = isOnPasture(h);

    return el('button', {
      class: `stall-tile ${isActive ? 'active' : ''} ${outside ? 'outside' : ''}`,
      title: outside
        ? `${h.name} ist auf der Weide — Zustand ${c} %`
        : `${h.name} — Zustand ${c} %${piles ? `, ${piles} Pferdeäpfel` : ''}`,
      onclick: () => {
        if (isActive) return;
        sfx.click();
        ui?.scene.setTool(null);
        setActiveHorse(h.id);
        renderStable(document.getElementById('screen-stable'));
      },
    }, [
      el('span', { class: `tile-box lit-${tier}` }, [
        outside ? null : el('span', { class: 'tile-horse', html: horseSVG(h) }),
        outside ? el('span', { class: 'tile-away', text: '🌿' }) : null,
        piles && !outside ? el('span', { class: 'tile-muck', text: `💩${piles}` }) : null,
      ]),
      el('span', { class: 'tile-name', text: h.name }),
      el('span', { class: `tile-cond ${info.cls}`, text: `${c}%` }),
    ]);
  });

  for (let i = 0; i < free; i++) {
    tiles.push(el('button', {
      class: 'stall-tile empty',
      title: 'Freie Box — hier passt noch ein Pferd hinein',
      onclick: () => { sfx.click(); ui?.scene.setTool(null); nav.go('editor', { mode: 'buy' }); },
    }, [
      el('span', { class: 'tile-box' }, el('span', { class: 'tile-plus', text: '＋' })),
      el('span', { class: 'tile-name', text: 'Freie Box' }),
    ]));
  }

  return el('div', { class: 'stall-strip' }, [
    el('span', { class: 'strip-label', text: 'Ställe' }),
    el('div', { class: 'strip-tiles' }, tiles),
  ]);
}

/* ---------------------------------------------------------------- Bedürfnisleiste */

function needsBar(horse) {
  const c = condition(horse);
  const info = conditionLabel(c);
  const b = BREEDS[horse.breed];
  const piles = muckCount();

  const rings = NEEDS.map(n => {
    const v = Math.round(horse.needs[n.key]);
    const col = v >= 60 ? 'var(--green)' : v >= 30 ? 'var(--gold)' : 'var(--red)';
    return el('div', {
      class: `need ${v < 30 ? 'low' : ''}`,
      title: `${n.name}: ${v} von 100`,
    }, [
      el('div', { class: 'need-ring', style: { '--pct': v, '--col': col } },
        el('span', { class: 'need-icon', text: n.icon })),
      el('span', { class: 'need-val', text: `${v}%` }),
      el('span', { class: 'need-name', text: n.name }),
    ]);
  });

  return el('div', { class: 'needs-bar' }, [
    el('div', { class: 'needs-title' }, [
      horse.name,
      el('small', { text: `${b.name} · Komfort ${comfort()}` }),
    ]),
    ...rings,
    piles > 0
      ? el('div', { class: 'muck-warning', title: 'Pferdeäpfel in der Box — einfach anklicken' },
          `💩 ${piles}`)
      : null,
    el('div', { class: `condition-badge ${info.cls}`, title: 'Gesamtzustand — bestimmt die Leistung im Parcours' }, [
      el('span', { text: 'Zustand' }),
      el('span', { class: 'cnum', text: `${c}%` }),
      el('span', { text: info.label }),
    ]),
  ]);
}

/* ---------------------------------------------------------------- Werkzeugleiste */

function toolbar(horse, scene) {
  const active = scene.getTool();
  const chosenFood = scene.getFood();

  const tools = Object.entries(ACTIONS).map(([key, a]) => {
    const { ok, reason } = checkAction(key, horse);
    const val = Math.round(horse.needs[a.need]);
    const count = a.item ? invCount(a.item) : null;
    const urgent = ok && val < 35;
    const isActive = active === key;

    return el('button', {
      class: `tool ${urgent ? 'urgent' : ''} ${ok ? '' : 'done'} ${isActive ? 'picked' : ''}`,
      disabled: !ok,
      title: reason,
      onclick: () => {
        sfx.click();
        if (isActive) scene.setTool(null);
        else if (key === 'feed') scene.setTool('feed', firstAvailableFood());
        else scene.setTool(key);
        refresh();
      },
    }, [
      el('span', { class: 'tool-need', text: `${val}%` }),
      el('span', { class: 'tool-icon', text: a.icon }),
      el('span', { text: a.name }),
      count != null ? el('span', { class: 'tool-count', text: `×${count}` }) : null,
    ]);
  });

  const stats = ridingStats(horse);

  const rideBtn = el('button', {
    class: 'btn btn-primary',
    onclick: () => {
      if (!stats.canRide) {
        sfx.error();
        modal({
          title: '🐴 Dein Pferd mag nicht',
          body: el('div', {}, [
            el('p', { text: `${horse.name} ist zu unzufrieden für einen Parcours (Zustand ${stats.condition} %). Ab 25 % geht es los.` }),
            el('p', { class: 'field-hint', text: 'Füttern, tränken und putzen hilft am schnellsten.' }),
          ]),
          actions: [{ label: 'Verstanden', class: 'btn-primary' }],
        });
        return;
      }
      scene.setTool(null);
      nav.go('levels');
    },
  }, '🏇 Reiten');

  const decorOn = scene.isDecorMode();

  const rows = [];

  // Futterauswahl erscheint nur, solange das Futter-Werkzeug in der Hand ist
  if (active === 'feed') {
    rows.push(el('div', { class: 'food-row' }, [
      el('span', { class: 'food-label', text: 'Was soll es sein?' }),
      ...Object.entries(FOODS).map(([key, f]) => {
        const have = invCount(key);
        return el('button', {
          class: `chip food-chip ${chosenFood === key ? 'active' : ''}`,
          disabled: have <= 0,
          onclick: () => { sfx.click(); scene.setTool('feed', key); refresh(); },
        }, `${f.icon} ${f.name} · +${f.amount} (${have})`);
      }),
    ]));
  }

  rows.push(el('div', { class: 'toolbar' }, [
    ...tools,
    el('div', { class: 'toolbar-sep' }),
    el('div', { class: 'big-actions' }, [
      rideBtn,
      el('button', {
        class: 'btn',
        title: grassLevel() > 0 ? 'Pferde auf die Weide lassen' : 'Die Weide ist gerade abgefressen',
        onclick: () => { scene.setTool(null); nav.go('pasture'); },
      }, `🌿 Weide (${grassLevel()} %)`),
      el('button', { class: 'btn', onclick: () => { scene.setTool(null); nav.go('shop'); } }, '🛒 Shop'),
      el('button', { class: 'btn', onclick: () => { scene.setTool(null); nav.go('horses'); } }, '🐎 Pferde'),
      el('button', {
        class: `btn ${decorOn ? 'btn-danger' : ''}`,
        onclick: () => { scene.setDecorMode(!decorOn); refresh(); },
      }, decorOn ? '✔ Deko fertig' : '🕯️ Deko'),
    ]),
  ]));

  return el('div', {}, rows);
}

function firstAvailableFood() {
  return Object.keys(FOODS).find(k => invCount(k) > 0) || null;
}

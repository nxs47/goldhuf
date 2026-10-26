/* pasture.js — die Weide.
 *
 * Draußen fressen die Pferde Gras und werden von selbst satt. Das Gras ist
 * begrenzt: Ist es abgefressen, müssen alle zurück in den Stall, und die Weide
 * erholt sich mit der Zeit wieder.
 */

import { el, clamp, rnd, toast } from './util/dom.js';
import { sfx, randomHorseSound } from './util/audio.js';
import {
  state, isOnPasture, pastureHorses, grassLevel,
  sendToPasture, bringToStable, PASTURE, PASTURE_MIN_GRASS, canGoOut,
} from './state.js';
import { horseSVG, condition, conditionLabel, BREEDS } from './horse.js';

const X_MIN = 8, X_MAX = 88;
const WALK_SPEED = 4.5;              // Prozent der Weidenbreite je Sekunde
const SOUND_EVERY = [14, 32];

let nav = {};
let ui = null;

export function initPasture(navigation) { nav = navigation; }

/* ---------------------------------------------------------------- Bildschirm */

export function renderPasture(root) {
  const ids = (state.pasture?.horses || []).join(',');

  // Nur neu bauen, wenn sich die Besetzung geändert hat — sonst würden die
  // Pferde bei jedem Auffrischen an den Anfang zurückspringen.
  if (!ui || !root.contains(ui.wrap) || ui.ids !== ids) build(root, ids);
  else update();
}

function build(root, ids) {
  ui?.stop?.();
  root.innerHTML = '';

  const field = el('div', { class: 'pasture-field' });
  const grassLayer = el('div', { class: 'grass-layer' });
  const fence = el('div', { class: 'pasture-fence' });
  const emptyNote = el('div', { class: 'pasture-empty hidden' });
  field.append(grassLayer, fence, emptyNote);

  const bar = el('div', { class: 'grass-bar' }, el('div', { class: 'grass-fill' }));
  const barLabel = el('div', { class: 'grass-label' });

  const roster = el('div', { class: 'roster' });

  const wrap = el('div', { class: 'pasture-layout' }, [
    el('div', { class: 'pasture-head' }, [
      el('div', {}, [
        el('h2', { text: '🌿 Weide' }),
        el('p', { class: 'sub', text: 'Draußen fressen die Pferde Gras und werden von selbst satt.' }),
      ]),
      el('div', { class: 'grow' }),
      el('div', { class: 'grass-meter' }, [barLabel, bar]),
      el('button', { class: 'btn', onclick: () => nav.go('stable') }, '↩ Zum Stall'),
    ]),
    field,
    roster,
  ]);
  root.append(wrap);

  const horses = [];   // { horse, node, x, dir, behaviour, timer }

  ui = { wrap, field, grassLayer, emptyNote, bar, barLabel, roster, horses, ids, stop: null };

  buildGrass(grassLayer);
  placeHorses();
  update();
  startLoop();
}

/* ---------------------------------------------------------------- Gras */

function buildGrass(layer) {
  layer.innerHTML = '';
  // Grasbüschel in mehreren Reihen, damit die Fläche Tiefe bekommt
  for (let i = 0; i < 90; i++) {
    const row = i % 3;
    layer.append(el('span', {
      class: `tuft row-${row}`,
      style: {
        left: `${(i * 7.7) % 100}%`,
        bottom: `${4 + row * 12 + ((i * 13) % 9)}%`,
        transform: `scale(${0.7 + ((i * 17) % 10) / 14}) rotate(${((i * 29) % 20) - 10}deg)`,
      },
    }));
  }
}

/* ---------------------------------------------------------------- Pferde */

function placeHorses() {
  const list = pastureHorses();
  ui.horses = list.map((horse, i) => {
    const node = el('div', {
      class: 'box-horse pasture-horse breathing',
      title: `${horse.name} — klicken zum Streicheln`,
      html: horseSVG(horse),
      onclick: () => {
        sfx.neigh();
        node.classList.add('petted');
        setTimeout(() => node.classList.remove('petted'), 1400);
      },
    });
    ui.field.append(node);
    return {
      horse, node,
      x: 18 + (i * 21) % 60,
      dir: i % 2 ? -1 : 1,
      behaviour: 'graze',
      timer: rnd(2, 6),
      target: null,
      soundIn: rnd(...SOUND_EVERY),
    };
  });
  layoutHorses();
}

function layoutHorses() {
  for (const h of ui.horses) {
    h.node.style.left = `${h.x}%`;
    h.node.style.setProperty('--flip', h.dir);
    // Weiter hinten stehende Pferde etwas kleiner zeichnen
    h.node.style.setProperty('--depth', (0.9 + (h.x % 17) / 60).toFixed(2));
  }
}

function setBehaviour(h, b) {
  h.behaviour = b;
  h.node.classList.toggle('walking', b === 'walk');
  h.node.classList.toggle('grazing', b === 'graze');
  h.node.classList.toggle('breathing', b === 'idle');
}

/* ---------------------------------------------------------------- Schleife */

function startLoop() {
  let last = performance.now();
  let raf = 0;
  let running = true;

  const tick = now => {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (isVisible()) step(dt);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  ui.stop = () => { running = false; cancelAnimationFrame(raf); };
  ui.step = step;      // für Tests
}

function isVisible() {
  return !document.hidden && ui?.wrap.closest('.screen')?.classList.contains('active');
}

function step(dt) {
  const hasGrass = grassLevel() > 0;

  for (const h of ui.horses) {
    if (h.behaviour === 'walk' && h.target != null) {
      const dist = h.target - h.x;
      const move = WALK_SPEED * dt * Math.sign(dist);
      if (Math.abs(move) >= Math.abs(dist)) {
        h.x = h.target; h.target = null;
        setBehaviour(h, hasGrass ? 'graze' : 'idle');
        h.timer = rnd(4, 9);
      } else {
        h.x += move;
      }
      layoutHorses();
    }

    h.timer -= dt;
    if (h.timer <= 0) {
      // Ohne Gras wird nur noch herumgestanden und gewartet
      if (!hasGrass) { setBehaviour(h, 'idle'); h.timer = rnd(3, 6); }
      else if (Math.random() < 0.45) {
        h.target = clamp(rnd(X_MIN, X_MAX), X_MIN, X_MAX);
        h.dir = h.target > h.x ? 1 : -1;
        setBehaviour(h, 'walk');
        h.timer = 14;
      } else {
        setBehaviour(h, 'graze');
        h.timer = rnd(5, 11);
      }
    }

    h.soundIn -= dt;
    if (h.soundIn <= 0) { h.soundIn = rnd(...SOUND_EVERY); randomHorseSound(); }
  }
}

/* ---------------------------------------------------------------- Anzeige */

export function update() {
  if (!ui) return;
  const g = grassLevel();

  ui.bar.querySelector('.grass-fill').style.width = `${g}%`;
  ui.bar.classList.toggle('low', g <= PASTURE.lowWarning);
  ui.barLabel.textContent = `Gras: ${g} %` + (g <= 0 ? ' — abgefressen' : g <= PASTURE.lowWarning ? ' — wird knapp' : '');

  // Die Fläche verfärbt sich und die Büschel werden kürzer
  ui.field.style.setProperty('--grass', (g / 100).toFixed(2));
  ui.grassLayer.classList.toggle('bare', g <= 0);

  const outside = pastureHorses();
  ui.emptyNote.classList.toggle('hidden', !(g <= 0));
  if (g <= 0) {
    ui.emptyNote.innerHTML = '';
    ui.emptyNote.append(
      el('div', { class: 'ov-box' }, [
        el('h3', { text: '🌾 Die Weide ist abgefressen' }),
        el('p', { text: 'Hier wächst gerade nichts mehr. Die Pferde sind zurück im Stall — '
                      + 'gib dem Gras etwas Zeit, dann können sie wieder heraus.' }),
        el('div', { class: 'ov-actions' }, [
          el('button', { class: 'btn btn-primary', onclick: () => nav.go('stable') }, '🏠 Zum Stall'),
        ]),
      ]),
    );
  }

  // Wenn niemand draußen ist, einen Hinweis zeigen
  ui.field.classList.toggle('nobody', outside.length === 0 && g > 0);

  buildRoster();
}

function buildRoster() {
  const g = grassLevel();

  const cards = state.horses.map(h => {
    const out = isOnPasture(h);
    const c = condition(h);
    const info = conditionLabel(c);
    const canGo = canGoOut();

    return el('div', { class: `roster-card ${out ? 'outside' : ''}` }, [
      el('div', { class: 'roster-art', html: horseSVG(h) }),
      el('div', { class: 'roster-info' }, [
        el('div', { class: 'roster-name' }, [
          h.name,
          out ? el('span', { class: 'badge owned', text: '🌿 draußen' }) : null,
        ]),
        el('div', { class: 'roster-sub', text: `${BREEDS[h.breed].name} · Futter ${Math.round(h.needs.food)} %` }),
        el('div', { class: `roster-sub ${info.cls}`, text: `Zustand ${c} %` }),
      ]),
      el('button', {
        class: `btn btn-sm ${out ? '' : 'btn-primary'}`,
        disabled: !out && !canGo,
        title: !out && !canGo ? `Erst muss wieder Gras nachwachsen (mindestens ${PASTURE_MIN_GRASS} %).` : '',
        onclick: () => {
          sfx.click();
          if (out) { bringToStable(h.id); toast(`${h.name} ist zurück im Stall.`, 'good'); }
          else { sendToPasture(h.id); sfx.neighHigh(); toast(`${h.name} darf auf die Weide.`, 'good'); }
          nav.refresh();
        },
      }, out ? '🏠 In den Stall' : '🌿 Auf die Weide'),
    ]);
  });

  ui.roster.replaceChildren(
    el('div', { class: 'roster-head' }, [
      el('h3', { text: 'Wer darf hinaus?' }),
      el('p', {
        class: 'sub',
        text: canGoOut()
          ? 'Draußen füllt sich der Bauch von selbst — dafür werden Fell und Durst schneller zum Thema.'
          : `Die Weide braucht eine Pause. Ab ${PASTURE_MIN_GRASS} % Gras geht es wieder hinaus.`,
      }),
    ]),
    el('div', { class: 'roster-list' }, cards),
  );
}

/** Wird beim Verlassen des Bildschirms gerufen. */
export function pastureInactive() {
  ui?.stop?.();
  ui = null;
}

/** Für Tests: einen Zeitschritt der Weide-Animation erzwingen. */
if (typeof window !== 'undefined') {
  window.__pasture = { step: dt => ui?.step?.(dt), get horses() { return ui?.horses || []; } };
}

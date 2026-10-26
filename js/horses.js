/* horses.js — Pferdeauswahl: alle Pferde im Stall, aktives wechseln, neues kaufen */

import { el, toast } from './util/dom.js';
import { sfx } from './util/audio.js';
import { state, setActiveHorse, freeStableSlots } from './state.js';
import { BREEDS, COATS, condition, conditionLabel, horseSVG, NEEDS } from './horse.js';

let nav = {};
export function initHorses(navigation) { nav = navigation; }

export function renderHorses(root) {
  root.innerHTML = '';
  const free = freeStableSlots();

  const cards = state.horses.map(h => horseCard(h, root));

  // Freie Boxen als Platzhalter zeigen
  for (let i = 0; i < free; i++) {
    cards.push(el('div', {
      class: 'card clickable',
      onclick: () => nav.go('editor', { mode: 'buy' }),
    }, [
      el('div', { class: 'card-art', text: '➕' }),
      el('div', { class: 'card-title', text: 'Freie Box' }),
      el('div', { class: 'card-desc', text: 'Hier ist Platz für ein weiteres Pferd. Zum Pferdemarkt.' }),
      el('div', { class: 'card-foot' }, el('button', { class: 'btn btn-sm btn-primary' }, 'Pferd kaufen')),
    ]));
  }

  root.append(el('div', { class: 'page' }, [
    el('div', { class: 'page-head' }, [
      el('div', {}, [
        el('h2', { text: '🐎 Deine Pferde' }),
        el('p', { class: 'sub', text: `${state.horses.length} von ${state.stableSlots} Boxen belegt. Das aktive Pferd wird gepflegt und geritten.` }),
      ]),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn', onclick: () => nav.go('stable') }, '↩ Zurück in den Stall'),
    ]),
    el('div', { class: 'grid' }, cards),
  ]));
}

function horseCard(h, root) {
  const isActive = h.id === state.activeHorseId;
  const c = condition(h);
  const info = conditionLabel(c);
  const b = BREEDS[h.breed];

  const worst = [...NEEDS].sort((a, x) => h.needs[a.key] - h.needs[x.key])[0];

  return el('div', {
    class: `card clickable ${isActive ? 'selected' : ''}`,
    onclick: () => {
      if (!isActive) { setActiveHorse(h.id); sfx.neigh(); toast(`${h.name} ist jetzt dein aktives Pferd.`, 'good'); }
      renderHorses(root);
    },
  }, [
    el('div', { class: 'card-art', html: horseSVG(h) }),
    el('div', { class: 'card-title' }, [
      h.name,
      isActive ? el('span', { class: 'badge active', text: 'Aktiv' }) : null,
    ]),
    el('div', { class: 'card-desc', text: `${b.name} · ${COATS[h.coat].name}` }),
    el('div', { class: 'stat-row' }, [ el('span', { text: 'Zustand' }), el('b', { text: `${c} % (${info.label})` }) ]),
    el('div', { class: 'stat-row' }, [ el('span', { text: 'Braucht am dringendsten' }), el('b', { text: `${worst.icon} ${worst.name}` }) ]),
    el('div', { class: 'stat-row' }, [ el('span', { text: 'Sprungkraft' }), el('span', { class: 'stars', text: stars(b.jump) }) ]),
    el('div', { class: 'stat-row' }, [ el('span', { text: 'Tempo' }),        el('span', { class: 'stars', text: stars(b.speed) }) ]),
    el('div', { class: 'stat-row' }, [ el('span', { text: 'Genügsamkeit' }), el('span', { class: 'stars', text: stars(b.hardy) }) ]),
    el('div', { class: 'card-foot' }, [
      el('span', { class: 'card-desc', text: `${h.rides || 0} Ritte` }),
      el('div', { class: 'grow' }),
      el('button', {
        class: 'btn btn-sm',
        onclick: e => { e.stopPropagation(); nav.go('editor', { mode: 'edit', horseId: h.id }); },
      }, '✏️ Umgestalten'),
    ]),
  ]);
}

export function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

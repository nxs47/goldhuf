/* shop.js — Laden: Verbrauchsartikel, Ausrüstung, Deko, Stallausbau */

import { el, toast } from './util/dom.js';
import { sfx } from './util/audio.js';
import { CONSUMABLES, EQUIPMENT, DECOR, SPECIALS } from './catalog.js';
import { decorArt } from './decorArt.js';
import {
  state, canAfford, spend, addInv, addEquip, hasEquip,
  addDecor, hasDecor, trackSpend, invCount, comfort, getActiveHorse,
} from './state.js';

const TABS = [
  { id: 'care',  label: '🧺 Pflege' },
  { id: 'gear',  label: '🪮 Ausrüstung' },
  { id: 'decor', label: '🕯️ Stallausstattung' },
  { id: 'stall', label: '🚪 Stall & Besonderes' },
];

let activeTab = 'care';
let nav = {};

export function initShop(navigation) { nav = navigation; }

export function renderShop(root) {
  root.innerHTML = '';

  const list = el('div', { class: 'grid' });

  const page = el('div', { class: 'page' }, [
    el('div', { class: 'page-head' }, [
      el('div', {}, [
        el('h2', { text: '🛒 Sattelkammer' }),
        el('p', { class: 'sub', text: 'Alles für Pflege, Komfort und den Stallausbau.' }),
      ]),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn', onclick: () => nav.go('stable') }, '↩ Zurück in den Stall'),
    ]),
    el('div', { class: 'tabs' }, TABS.map(t =>
      el('button', {
        class: `tab ${t.id === activeTab ? 'active' : ''}`,
        onclick: () => { activeTab = t.id; sfx.click(); renderShop(root); },
      }, t.label)
    )),
    list,
  ]);

  root.append(page);
  fillTab(list, root);
}

function fillTab(list, root) {
  const redraw = () => renderShop(root);

  if (activeTab === 'care') {
    for (const [key, it] of Object.entries(CONSUMABLES)) {
      list.append(itemCard({
        icon: it.icon,
        title: it.name,
        desc: `${it.desc}`,
        note: `Vorrat: ${invCount(key)} · Kauf bringt ${it.amount} ${it.unit}`,
        price: it.price,
        buyLabel: 'Kaufen',
        onBuy: () => {
          if (!buy(it.price)) return;
          addInv(key, it.amount);
          toast(`${it.name} gekauft (+${it.amount})`, 'good');
          redraw();
        },
      }));
    }
  }

  if (activeTab === 'gear') {
    for (const [key, it] of Object.entries(EQUIPMENT)) {
      const owned = hasEquip(key);
      list.append(itemCard({
        icon: it.icon,
        title: it.name,
        desc: it.desc,
        price: it.price,
        owned,
        badge: owned ? 'Im Besitz' : null,
        onBuy: () => {
          if (!buy(it.price)) return;
          addEquip(key);
          toast(`${it.name} gekauft`, 'good');
          redraw();
        },
      }));
    }
  }

  if (activeTab === 'decor') {
    const horse = getActiveHorse();

    list.append(el('div', {
      class: 'panel',
      style: { gridColumn: '1 / -1' },
    }, [
      el('h3', { text: `Du richtest ein: Stall von ${horse.name}` }),
      el('p', {
        text: `Komfort in dieser Box: ${comfort()} Punkte. Komfort verlangsamt, wie schnell `
            + 'die Bedürfnisse sinken (bis zu 40 % weniger) und bringt einen kleinen Münzbonus im Parcours.',
      }),
      el('p', {
        style: { margin: 0, fontStyle: 'italic' },
        text: 'Jeder Stall wird einzeln eingerichtet. Willst du dasselbe Stück in einer anderen '
            + 'Box, kaufst du es dort noch einmal — den Stall wechselst du oben links im Stallbildschirm.',
      }),
    ]));

    for (const [key, it] of Object.entries(DECOR)) {
      const owned = hasDecor(key);
      const replaces = it.group
        ? Object.entries(DECOR).find(([k, d]) => d.group === it.group && hasDecor(k) && k !== key)
        : null;

      // In wie vielen anderen Ställen steht das Stück schon?
      const elsewhere = state.horses.filter(h => h.id !== horse.id && (h.decor || []).some(d => d.id === key)).length;

      const notes = [`Komfort +${it.comfort}`];
      if (replaces) notes.push(`ersetzt „${replaces[1].name}"`);
      if (elsewhere) notes.push(`steht schon in ${elsewhere} weiteren Stall${elsewhere > 1 ? 'en' : ''}`);

      list.append(itemCard({
        icon: it.icon,
        art: it.art ? decorArt(key) : null,
        title: it.name,
        desc: it.desc,
        note: notes.join(' · '),
        price: it.price,
        owned,
        badge: owned ? 'In dieser Box' : null,
        onBuy: () => {
          if (!buy(it.price)) return;
          addDecor(key);
          toast(`${it.name} steht jetzt in ${horse.name}s Stall`, 'good');
          redraw();
        },
      }));
    }
  }

  if (activeTab === 'stall') {
    const slot = SPECIALS.stableSlot;
    const full = state.stableSlots >= 6;
    list.append(itemCard({
      icon: slot.icon,
      title: slot.name,
      desc: slot.desc,
      note: `Boxen: ${state.horses.length} von ${state.stableSlots} belegt`,
      price: slot.price,
      owned: full,
      badge: full ? 'Ausgebaut' : null,
      onBuy: () => {
        if (full) return;
        if (!buy(slot.price)) return;
        state.stableSlots++;
        toast('Neue Box gebaut', 'good');
        redraw();
      },
    }));

    const tal = SPECIALS.talisman;
    list.append(itemCard({
      icon: tal.icon,
      title: tal.name,
      desc: tal.desc,
      price: tal.price,
      owned: state.talisman,
      badge: state.talisman ? 'Im Besitz' : null,
      onBuy: () => {
        if (!buy(tal.price)) return;
        state.talisman = true;
        toast('Das Glückshufeisen hängt über der Tür', 'good');
        redraw();
      },
    }));

    list.append(itemCard({
      icon: '🐎',
      title: 'Neues Pferd',
      desc: 'Rasse, Fell, Mähne und Namen frei wählen. Preise ab 500 Münzen.',
      note: state.horses.length >= state.stableSlots
        ? 'Alle Boxen belegt — erst eine Box dazukaufen.'
        : `${state.stableSlots - state.horses.length} freie Box(en)`,
      price: null,
      buyLabel: 'Zum Pferdemarkt',
      disabled: state.horses.length >= state.stableSlots,
      onBuy: () => nav.go('editor', { mode: 'buy' }),
    }));
  }
}

/** Kauf abwickeln; gibt false zurück, wenn das Geld nicht reicht. */
function buy(price) {
  if (!canAfford(price)) { sfx.error(); toast('Dafür reichen die Münzen nicht.', 'bad'); return false; }
  spend(price);
  trackSpend(price);
  sfx.buy();
  return true;
}

/* ---------------------------------------------------------------- Karte */

function itemCard({ icon, art, title, desc, note, price, onBuy, owned, badge, buyLabel = 'Kaufen', disabled }) {
  const affordable = price == null || canAfford(price);
  const isDisabled = disabled || owned || !affordable;

  return el('div', { class: `card ${owned ? 'locked' : ''}` }, [
    art ? el('div', { class: 'card-art drawn', html: art }) : el('div', { class: 'card-art', text: icon }),
    el('div', { class: 'card-title' }, [title, badge ? el('span', { class: 'badge owned', text: badge }) : null]),
    el('div', { class: 'card-desc', text: desc }),
    note ? el('div', { class: 'card-desc', style: { fontStyle: 'italic' }, text: note }) : null,
    el('div', { class: 'card-foot' }, [
      price != null
        ? el('span', { class: `price ${affordable ? '' : 'cant'}` }, `🪙 ${price}`)
        : el('span', { class: 'price' }, ''),
      el('div', { class: 'grow' }),
      el('button', {
        class: `btn btn-sm ${isDisabled ? '' : 'btn-primary'}`,
        disabled: isDisabled,
        onclick: onBuy,
      }, owned ? 'Schon da' : buyLabel),
    ]),
  ]);
}

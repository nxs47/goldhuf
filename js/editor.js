/* editor.js — Pferd erstellen, kaufen und umgestalten */

import { el, toast, modal } from './util/dom.js';
import { sfx } from './util/audio.js';
import {
  state, canAfford, spend, addHorse, setActiveHorse,
  freeStableSlots, trackSpend, save, emit,
} from './state.js';
import {
  BREEDS, COATS, MANE_COLORS, MANE_STYLES, MARKINGS,
  makeHorse, horseSVG,
} from './horse.js';
import { stars } from './horses.js';

/** Umfärben eines vorhandenen Pferdes kostet etwas — Name und Mähne sind gratis. */
const RECOLOR_PRICE = 120;

let nav = {};
export function initEditor(navigation) { nav = navigation; }

let draft = null;      // das Pferd, das gerade gebaut wird
let mode = 'first';    // 'first' | 'buy' | 'edit'
let editingId = null;
let originalCoat = null;

export function renderEditor(root, params = {}) {
  mode = params.mode || 'first';

  if (mode === 'edit') {
    const h = state.horses.find(x => x.id === params.horseId);
    if (!h) { nav.go('horses'); return; }
    editingId = h.id;
    draft = { ...h };
    originalCoat = h.coat;
  } else if (!draft || params.fresh !== false) {
    editingId = null;
    originalCoat = null;
    draft = makeHorse({
      name: mode === 'first' ? 'Keks' : '',
      breed: 'shetland', coat: 'fuchs', maneColor: 'blond',
      maneStyle: 'offen', marking: 'blesse',
    });
  }

  draw(root);
}

/* ---------------------------------------------------------------- Aufbau */

function draw(root) {
  root.innerHTML = '';

  const preview = el('div', { class: 'editor-preview' });
  const options = el('div', {});

  const title =
    mode === 'edit'  ? '✏️ Pferd umgestalten' :
    mode === 'first' ? '🐴 Dein erstes Pferd'  : '🐎 Pferdemarkt';

  const subtitle =
    mode === 'edit'  ? 'Name und Mähne änderst du kostenlos. Ein neues Fell kostet Münzen, die Rasse bleibt.' :
    mode === 'first' ? 'Such dir dein Pony aus und gib ihm einen Namen. Es gehört dir geschenkt.' :
                       'Wähle eine Rasse und gestalte dein neues Pferd.';

  root.append(el('div', { class: 'page' }, [
    el('div', { class: 'page-head' }, [
      el('div', {}, [ el('h2', { text: title }), el('p', { class: 'sub', text: subtitle }) ]),
      el('div', { class: 'grow' }),
      mode !== 'first'
        ? el('button', { class: 'btn', onclick: () => nav.go(mode === 'edit' ? 'horses' : 'stable') }, '↩ Abbrechen')
        : null,
    ]),
    el('div', { class: 'editor-layout' }, [preview, options]),
  ]));

  refresh(preview, options, root);
}

function refresh(preview, options, root) {
  const rerender = () => refresh(preview, options, root);

  /* --- Vorschau --- */
  const b = BREEDS[draft.breed];
  preview.innerHTML = '';
  preview.append(
    el('div', { html: horseSVG(draft) }),
    el('div', { class: 'pv-name', text: draft.name || 'Namenlos' }),
    el('div', { class: 'pv-breed', text: `${b.name} · ${COATS[draft.coat].name}` }),
    el('div', { class: 'stat-row', style: { marginTop: '10px' } },
      [el('span', { text: 'Sprungkraft' }), el('span', { class: 'stars', text: stars(b.jump) })]),
    el('div', { class: 'stat-row' }, [el('span', { text: 'Tempo' }), el('span', { class: 'stars', text: stars(b.speed) })]),
    el('div', { class: 'stat-row' }, [el('span', { text: 'Genügsamkeit' }), el('span', { class: 'stars', text: stars(b.hardy) })]),
  );

  /* --- Optionen --- */
  options.innerHTML = '';

  // Rasse (beim Umgestalten gesperrt)
  if (mode !== 'edit') {
    options.append(group('Rasse', Object.entries(BREEDS).map(([key, br]) => {
      const affordable = canAfford(br.price) || mode === 'first';
      const allowed = mode === 'first' ? br.price === 0 : true;
      return chip({
        active: draft.breed === key,
        disabled: !allowed || !affordable,
        title: allowed
          ? `${br.desc} ${br.price ? `— ${br.price} Münzen` : '— geschenkt'}`
          : 'Für den Anfang bekommst du ein Shetlandpony geschenkt.',
        label: `${br.name}${br.price ? ` · 🪙 ${br.price}` : ' · gratis'}`,
        onClick: () => { draft.breed = key; sfx.click(); rerender(); },
      });
    })));
    options.append(el('p', { class: 'field-hint', text: BREEDS[draft.breed].desc }));
  } else {
    options.append(group('Rasse', [
      el('span', { class: 'chip', style: { opacity: .8 } }, `${b.name} (bleibt)`),
    ]));
  }

  // Fellfarbe
  const coatChanged = mode === 'edit' && draft.coat !== originalCoat;
  options.append(group(
    mode === 'edit' ? `Fellfarbe (Wechsel: 🪙 ${RECOLOR_PRICE})` : 'Fellfarbe',
    Object.entries(COATS).map(([key, c]) => chip({
      active: draft.coat === key,
      swatch: c.body,
      label: c.name,
      onClick: () => { draft.coat = key; sfx.click(); rerender(); },
    }))
  ));

  // Abzeichen
  options.append(group('Abzeichen', Object.entries(MARKINGS).map(([key, mk]) => chip({
    active: draft.marking === key,
    label: mk.name,
    onClick: () => { draft.marking = key; sfx.click(); rerender(); },
  }))));

  // Mähnenfarbe
  options.append(group('Mähne & Schweif — Farbe', Object.entries(MANE_COLORS).map(([key, mc]) => chip({
    active: draft.maneColor === key,
    swatch: mc.color,
    label: mc.name,
    onClick: () => { draft.maneColor = key; sfx.click(); rerender(); },
  }))));

  // Mähnenstil
  options.append(group('Mähnenstil', Object.entries(MANE_STYLES).map(([key, ms]) => chip({
    active: draft.maneStyle === key,
    label: ms.name,
    onClick: () => { draft.maneStyle = key; sfx.click(); rerender(); },
  }))));

  // Name
  const nameInput = el('input', {
    class: 'text-input',
    type: 'text',
    maxlength: '16',
    placeholder: 'z. B. Blitz',
    value: draft.name,
    oninput: e => {
      draft.name = e.target.value;
      preview.querySelector('.pv-name').textContent = draft.name || 'Namenlos';
      updateSaveButton();
    },
  });
  options.append(el('div', { class: 'opt-group' }, [
    el('label', { class: 'opt-label', text: 'Name' }),
    nameInput,
    el('p', { class: 'field-hint', text: 'Höchstens 16 Zeichen.' }),
  ]));

  /* --- Aktion --- */
  const price = mode === 'edit'
    ? (coatChanged ? RECOLOR_PRICE : 0)
    : (mode === 'first' ? 0 : BREEDS[draft.breed].price);

  const saveBtn = el('button', { class: 'btn btn-big btn-primary', onclick: commit });
  const priceNote = el('p', { class: 'field-hint' });

  options.append(el('div', { class: 'editor-actions' }, [saveBtn]), priceNote);

  function updateSaveButton() {
    const nameOk = draft.name.trim().length > 0;
    const money = canAfford(price);
    saveBtn.disabled = !nameOk || !money;
    saveBtn.textContent =
      mode === 'edit'
        ? (price ? `Änderungen übernehmen · 🪙 ${price}` : 'Änderungen übernehmen')
        : (price ? `${draft.name.trim() || 'Pferd'} kaufen · 🪙 ${price}` : `${draft.name.trim() || 'Pferd'} in den Stall holen`);

    priceNote.textContent =
      !nameOk ? 'Gib deinem Pferd noch einen Namen.'
      : !money ? `Dir fehlen ${price - state.coins} Münzen.`
      : '';
  }
  updateSaveButton();

  function commit() {
    const name = draft.name.trim().slice(0, 16);
    if (!name) return;
    if (price > 0) {
      if (!canAfford(price)) { sfx.error(); return; }
      spend(price); trackSpend(price);
    }

    if (mode === 'edit') {
      const h = state.horses.find(x => x.id === editingId);
      Object.assign(h, {
        name, coat: draft.coat, marking: draft.marking,
        maneColor: draft.maneColor, maneStyle: draft.maneStyle,
      });
      save(); emit();
      sfx.buy();
      toast(`${name} sieht jetzt anders aus.`, 'good');
      draft = null;
      nav.go('horses');
      return;
    }

    if (freeStableSlots() <= 0) {
      toast('Alle Boxen sind belegt.', 'bad');
      return;
    }

    const horse = makeHorse({ ...draft, name });
    addHorse(horse);
    setActiveHorse(horse.id);
    draft = null;
    sfx.fanfare();

    modal({
      title: `🎉 Willkommen, ${name}!`,
      body: el('div', { style: { textAlign: 'center' } }, [
        el('div', { html: horseSVG(horse), style: { maxWidth: '300px', margin: '0 auto' } }),
        el('p', { text: mode === 'first'
          ? 'Kümmere dich gut um dein Pony: füttern, tränken, misten, striegeln. Danach geht es auf den Parcours.'
          : `${name} steht jetzt in deinem Stall.` }),
      ]),
      actions: [{ label: 'In den Stall', class: 'btn-primary', onClick: () => nav.go('stable') }],
      dismissable: false,
    });
  }
}

/* ---------------------------------------------------------------- Bausteine */

function group(label, children) {
  return el('div', { class: 'opt-group' }, [
    el('label', { class: 'opt-label', text: label }),
    el('div', { class: 'opt-row' }, children),
  ]);
}

function chip({ active, disabled, label, swatch, onClick, title }) {
  return el('button', {
    class: `chip ${active ? 'active' : ''}`,
    disabled,
    title: title || label,
    onclick: onClick,
  }, [
    swatch ? el('span', { class: 'swatch', style: { background: swatch } }) : null,
    label,
  ]);
}

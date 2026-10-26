/* main.js — Einstieg: Bildschirmwechsel, Zeittakt, Einstellungen */

import { $, $$, el, modal, toast, confirmDialog, amFinger } from './util/dom.js';
import {
  fullscreenSupported, isFullscreen, enterFullscreen, toggleFullscreen,
  onFullscreenChange, lockLandscape, unlockOrientation,
} from './util/fullscreen.js';
import { sfx, setSound, isSoundOn } from './util/audio.js';
import { playMusic, stopMusic, setMusic, isMusicOn, trackForLevel } from './music.js';
import {
  state, load, save, hasSave, resetGame, applyOfflineDecay,
  tickNeeds, onChange, getActiveHorse, claimDailyBonus, getLastOfflineHours,
  tickPasture, grassLevel,
} from './state.js';
import { horseSVG, makeHorse, condition, NEEDS } from './horse.js';

import { initStable, renderStable, refreshNeeds, stableInactive } from './stable.js';
import { initPasture, renderPasture, pastureInactive } from './pasture.js';
import { initShop, renderShop } from './shop.js';
import { initHorses, renderHorses } from './horses.js';
import { initEditor, renderEditor } from './editor.js';
import { initSelect, renderLevels, renderResult } from './ride/select.js';
import { initRide, startRide, stopRide } from './ride/game.js';

/* ---------------------------------------------------------------- Router */

const SCREENS = {
  title:  { id: 'screen-title',  topbar: false, music: 'title' },
  stable: { id: 'screen-stable', topbar: true,  music: 'stall', render: (r) => renderStable(r) },
  horses: { id: 'screen-horses', topbar: true,  music: 'stall', render: (r) => renderHorses(r) },
  editor: { id: 'screen-editor', topbar: true,  music: 'stall', render: (r, p) => renderEditor(r, p) },
  shop:   { id: 'screen-shop',   topbar: true,  music: 'stall', render: (r) => renderShop(r) },
  pasture:{ id: 'screen-pasture',topbar: true,  music: 'stall', render: (r) => renderPasture(r) },
  levels: { id: 'screen-levels', topbar: true,  music: 'stall', render: (r) => renderLevels(r) },
  result: { id: 'screen-result', topbar: true,  music: 'stall', render: (r, p) => renderResult(r, p) },
  ride:   { id: 'screen-ride',   topbar: false },
};

let current = 'title';
let currentParams = {};

/* ---------------------------------------------------------------- Vollbild */

/** Soll hier von selbst ins Vollbild gewechselt werden? Am Rechner nicht —
    dort ist ein Fenster, das sich unaufgefordert aufblaest, eine Zumutung. */
function wantsFullscreen() {
  return amFinger() && fullscreenSupported() && state.settings.fullscreen !== false;
}

/** Aus einem Tippen heraus ins Vollbild — sonst laesst der Browser es nicht zu. */
function fullscreenOnTap() {
  if (wantsFullscreen() && !isFullscreen()) enterFullscreen();
}

const nav = {
  go(name, params = {}) {
    if (current === 'ride' && name !== 'ride') { stopRide(); unlockOrientation(); }
    if (current === 'stable' && name !== 'stable') stableInactive();
    if (current === 'pasture' && name !== 'pasture') pastureInactive();

    current = name;
    currentParams = params;

    const def = SCREENS[name];
    $$('.screen').forEach(s => s.classList.remove('active'));
    const node = $('#' + def.id);
    node.classList.add('active');
    node.scrollTop = 0;

    $('#topbar').classList.toggle('hidden', !def.topbar);
    if (def.music) playMusic(def.music);
    def.render?.(node, params);
    updateCoins();
  },

  /** Aktuellen Bildschirm neu zeichnen (nach Käufen, Pflege usw.). */
  refresh() {
    const def = SCREENS[current];
    if (def?.render) def.render($('#' + def.id), currentParams);
    updateCoins();
  },

  startRide(levelId) {
    // Der Parcours braucht die Breite: erst Vollbild, dann quer festhalten.
    // Beides scheitert leise, wo der Browser es nicht kann.
    if (wantsFullscreen() && !isFullscreen()) enterFullscreen().then(() => lockLandscape());
    else if (amFinger() && isFullscreen()) lockLandscape();

    nav.go('ride');
    playMusic(trackForLevel(levelId));
    startRide(levelId);
  },

  showResult(data) {
    nav.go('result', data);
  },
};

/* ---------------------------------------------------------------- Münzanzeige */

let lastCoins = -1;
function updateCoins() {
  const node = $('#coin-count');
  if (!node) return;
  node.textContent = state.coins;
  if (lastCoins >= 0 && state.coins !== lastCoins) {
    const disp = $('#coin-display');
    disp.classList.remove('bump');
    void disp.offsetWidth;
    disp.classList.add('bump');
  }
  lastCoins = state.coins;
}

/* ---------------------------------------------------------------- Zeittakt */

const TICK_SECONDS = 30;

function startClock() {
  setInterval(() => {
    if (!state.horses.length) return;
    tickNeeds(TICK_SECONDS / 3600);
    const { returned } = tickPasture(TICK_SECONDS / 60);
    save();

    if (returned.length) announceReturn(returned);
    if (current === 'stable')  refreshNeeds();
    if (current === 'pasture') nav.refresh();
  }, TICK_SECONDS * 1000);

  // Beim Zurückkehren in den Tab die Pause anrechnen
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { save(); return; }
    applyOfflineDecay();
    if (current === 'stable') nav.refresh();
  });

  window.addEventListener('beforeunload', save);
}

/** Die Weide ist leer — die Pferde kommen von selbst zurück. */
function announceReturn(names) {
  const list = names.join(' und ');
  toast(`🌾 Die Weide ist abgefressen — ${list} ${names.length > 1 ? 'sind' : 'ist'} zurück im Stall.`, 'bad');
  sfx.neighLong();
}

/* ---------------------------------------------------------------- Titelbild */

function renderTitleHorse() {
  const demo = makeHorse({
    name: 'Goldhuf', breed: 'andalusier', coat: 'palomino',
    maneColor: 'blond', maneStyle: 'lang', marking: 'blesse',
  });
  $('#title-horse').innerHTML = horseSVG(demo);
}

/* ---------------------------------------------------------------- Einstellungen */

function openSettings() {
  modal({
    title: '⚙️ Einstellungen',
    body: el('div', {}, [
      el('div', { class: 'opt-group' }, [
        el('label', { class: 'opt-label', style: { color: 'var(--wood-dark)' }, text: 'Ton' }),
        el('div', { class: 'opt-row' }, [
          el('button', {
            class: 'chip',
            onclick: e => {
              const on = !isSoundOn();
              setSound(on);
              state.settings.sound = on;
              save();
              e.currentTarget.textContent = on ? '🔊 Geräusche an' : '🔇 Geräusche aus';
              $('#btn-sound').textContent = on ? '🔊' : '🔇';
            },
          }, isSoundOn() ? '🔊 Geräusche an' : '🔇 Geräusche aus'),
          el('button', {
            class: 'chip',
            onclick: e => {
              const on = !isMusicOn();
              setMusic(on);
              state.settings.music = on;
              save();
              e.currentTarget.textContent = on ? '🎵 Musik an' : '🎵 Musik aus';
            },
          }, isMusicOn() ? '🎵 Musik an' : '🎵 Musik aus'),
        ]),
      ]),

      // Vollbild gibt es nur, wo der Browser es kann — sonst der Hinweis dazu.
      el('div', { class: 'opt-group' }, [
        el('label', { class: 'opt-label', style: { color: 'var(--wood-dark)' }, text: 'Bildschirm' }),
        fullscreenSupported()
          ? el('div', { class: 'opt-row' }, [
              el('button', {
                class: 'chip',
                onclick: e => {
                  const btn = e.currentTarget;
                  toggleFullscreen().then(() => {
                    // Der Wunsch zaehlt, nicht der Zufall: wer hier ausschaltet,
                    // bekommt auch beim naechsten Start kein Vollbild mehr.
                    state.settings.fullscreen = isFullscreen();
                    save();
                    btn.textContent = isFullscreen() ? '⛶ Vollbild aus' : '⛶ Vollbild an';
                  });
                },
              }, isFullscreen() ? '⛶ Vollbild aus' : '⛶ Vollbild an'),
            ])
          : el('p', {
              class: 'field-hint',
              text: amFinger()
                ? 'Dieser Browser kennt kein Vollbild. Auf dem iPhone hilft „Teilen → Zum Home-Bildschirm“: Von dort startet das Spiel ohne Browserleiste.'
                : 'Dieser Browser kennt kein Vollbild.',
            }),
      ]),
      el('h3', { text: 'So funktioniert das Spiel' }),
      el('ul', { class: 'info-list' }, [
        el('li', { html: '<b>Pflege</b> hält den Zustand deines Pferdes oben. Ab 80 % gibt es im Parcours <b>×1,5 Münzen</b>, unter 25 % verweigert es den Start.' }),
        el('li', {
          html: amFinger()
            ? '<b>Reiten:</b> Tippen springt (halten = höher). Unten links duckst du dich, unten rechts sprintest du. Quer gehalten siehst du mehr von der Strecke. Wer ein Hindernis berührt, startet von vorn.'
            : '<b>Reiten:</b> Leertaste springt (halten = höher), ↓ duckt, Umschalt sprintet. Wer ein Hindernis berührt, startet von vorn.',
        }),
        el('li', { html: '<b>Alle Pflege findet direkt am Pferd statt:</b> Werkzeug unten auswählen, dann in der Box auf das Pferd, den Boden oder die Wand tippen.' }),
        el('li', { html: '<b>Pferdeäpfel</b> fallen von selbst — einfach antippen, dann sind sie weg. Sie drücken die Sauberkeit.' }),
        el('li', { html: '<b>Münzen</b> gibt es im Parcours und für nötige Pflege. Davon kaufst du Futter, Ausrüstung, Deko und neue Pferde.' }),
        el('li', { html: '<b>Stallausstattung</b> bringt Komfort: die Bedürfnisse sinken langsamer.' }),
      ]),
      el('h3', { text: 'Spielstand' }),
      el('p', { class: 'field-hint', text: 'Der Spielstand liegt nur in diesem Browser. Ein Zurücksetzen kann nicht rückgängig gemacht werden.' }),
      el('button', {
        class: 'btn btn-danger',
        onclick: () => confirmDialog(
          'Wirklich alles löschen?',
          'Alle Pferde, Münzen und Rekorde gehen verloren.',
          () => { resetGame(); location.reload(); },
          'Ja, zurücksetzen'
        ),
      }, '🗑️ Spielstand zurücksetzen'),
    ]),
    actions: [{ label: 'Schließen', class: 'btn-primary' }],
  });
}

/* ---------------------------------------------------------------- Begrüßung */

/** Nach einer Pause: was ist im Stall passiert? */
function welcomeBack(hours) {
  const horse = getActiveHorse();
  if (!horse) return;

  const bonus = claimDailyBonus();
  const worst = [...NEEDS].sort((a, b) => horse.needs[a.key] - horse.needs[b.key])[0];
  const c = condition(horse);

  if (hours < 0.5 && !bonus) return;

  const lines = [];
  if (hours >= 0.5) {
    lines.push(el('p', { text: `Du warst ${hours < 1 ? 'eine kurze Weile' : `etwa ${Math.round(hours)} Stunden`} weg. ${horse.name} hat gewartet.` }));
    lines.push(el('p', {}, [
      'Zustand: ', el('b', { text: `${c} %` }),
      c < 60 ? ` — am dringendsten fehlt ${worst.icon} ${worst.name}.` : ' — alles im grünen Bereich.',
    ]));
  }
  if (bonus) lines.push(el('p', { html: `🎁 Tagesbonus: <b>🪙 ${bonus} Münzen</b>` }));

  modal({
    title: '🌅 Willkommen zurück',
    body: el('div', { style: { textAlign: 'center' } }, [
      el('div', { html: horseSVG(horse), style: { maxWidth: '260px', margin: '0 auto' } }),
      ...lines,
    ]),
    actions: [{ label: 'In den Stall', class: 'btn-primary' }],
  });
}

/* ---------------------------------------------------------------- Start */

function boot() {
  initStable(nav);
  initPasture(nav);
  initShop(nav);
  initHorses(nav);
  initEditor(nav);
  initSelect(nav);
  initRide(nav);

  renderTitleHorse();
  onChange(updateCoins);

  /* Wer das Vollbild von Hand verlässt (Wischgeste, Zurück-Taste), will es
     nicht beim nächsten Parcours wieder aufgedrängt bekommen. */
  onFullscreenChange(() => {
    state.settings.fullscreen = isFullscreen();
    if (!isFullscreen()) unlockOrientation();
    save();
  });

  const saveExists = hasSave();
  $('#btn-continue').disabled = !saveExists;
  $('#btn-continue').classList.toggle('btn-primary', saveExists);
  $('#btn-newgame').classList.toggle('btn-primary', !saveExists);

  $('#btn-continue').addEventListener('click', () => {
    sfx.click();
    fullscreenOnTap();
    if (!load()) { toast('Kein Spielstand gefunden.', 'bad'); return; }
    setSound(state.settings.sound !== false);
    setMusic(state.settings.music !== false);
    $('#btn-sound').textContent = isSoundOn() ? '🔊' : '🔇';
    nav.go('stable');
    welcomeBack(getLastOfflineHours());
  });

  $('#btn-newgame').addEventListener('click', () => {
    sfx.click();
    fullscreenOnTap();
    const begin = () => { resetGame(); nav.go('editor', { mode: 'first' }); };
    if (saveExists) {
      confirmDialog('Neues Spiel starten?',
        'Dein bisheriger Spielstand wird dabei gelöscht.', begin, 'Neu anfangen');
    } else begin();
  });

  $('#btn-home').addEventListener('click', () => { sfx.click(); nav.go('stable'); });
  $('#btn-settings').addEventListener('click', () => { sfx.click(); openSettings(); });
  $('#btn-sound').addEventListener('click', e => {
    const on = !isSoundOn();
    setSound(on);
    state.settings.sound = on;
    save();
    e.currentTarget.textContent = on ? '🔊' : '🔇';
  });

  startClock();
  nav.go('title');
}

boot();

/* stableScene.js — die lebendige Stallbox.
 *
 * Das Pferd läuft umher, grast, wedelt mit dem Schweif, gibt Laute von sich und
 * lässt hin und wieder Pferdeäpfel fallen. Alle Pflegeaktionen finden direkt
 * hier statt: gefüttert, getränkt, gestriegelt und beschlagen wird am Pferd,
 * ausgemistet und eingestreut auf dem Boden.
 */

import { el, clamp, rnd, toast } from './util/dom.js';
import { sfx, randomHorseSound } from './util/audio.js';
import {
  getActiveHorse, invCount, hasEquip, useInv, addCoins, addSupply,
  dropMuck, removeMuck, muckCount, getMuck, getDecor, MUCK_DIRT, save, emit,
} from './state.js';
import { DECOR, lightTier } from './catalog.js';
import { decorArt } from './decorArt.js';
import { condition, conditionLabel, horseSVG, addNeed } from './horse.js';
import { ACTIONS, FOODS, applyCare, rewardFor } from './care.js';

/* ---------------------------------------------------------------- Einstellungen */

const X_MIN = 20, X_MAX = 80;        // wie weit das Pferd laufen darf (in %)
const WALK_SPEED = 6.5;              // Prozent der Boxbreite pro Sekunde
const MUCK_EVERY = [50, 110];        // Sekunden zwischen zwei Pferdeäpfeln
const SOUND_EVERY = [11, 26];        // Sekunden zwischen zwei Stalllauten
const BEHAVIOUR_EVERY = [3.5, 9];    // Sekunden bis zum nächsten Verhaltenswechsel
const BED_CELLS = 12;                // Bahnen beim Einstreuen
const LICK_ID = '__lickstone';       // Kennung des Lecksteins beim Verschieben
const TROUGH_X = 22, RACK_X = 79;    // wo Tränke und Raufe stehen (in %)
const THIRSTY = 55, HUNGRY = 55;     // ab hier bedient sich das Pferd selbst
const DRINK_RATE = 26;               // Wasser je Sekunde
const EAT_RATE = 16;                 // Futter je Sekunde

/* ---------------------------------------------------------------- Aufbau */

/**
 * Baut die Box und gibt eine Steuerung zurück.
 * @param {object} opts { onChange } — wird nach jeder Pflegeaktion gerufen
 */
export function createScene(opts = {}) {
  const onChange = opts.onChange || (() => {});

  let horse = getActiveHorse();
  let tool = null;            // aktives Werkzeug (Schlüssel aus ACTIONS)
  let food = null;            // gewähltes Futter, wenn tool === 'feed'
  let destroyed = false;

  /* --- Die Bühne --- */

  const scene = el('div', { class: 'box-scene' });

  const bedding = el('div', { class: 'box-bedding' });
  const bedCells = el('div', { class: 'bed-cells' });
  const floor = el('div', { class: 'box-floor' }, [bedding, bedCells]);

  const troughWater = el('div', { class: 'trough-water' });
  const trough = el('div', { class: 'prop trough', title: 'Tränke', dataset: { target: 'trough' } }, [
    el('div', { class: 'trough-body' }, troughWater),
    el('div', { class: 'prop-label', text: '💧' }),
  ]);

  const rackHay = el('div', { class: 'rack-hay' });
  const rack = el('div', { class: 'prop hayrack', title: 'Raufe', dataset: { target: 'rack' } }, [
    el('div', { class: 'rack-body' }, rackHay),
  ]);

  const muckLayer = el('div', { class: 'muck-layer' });
  const propLayer = el('div', { class: 'prop-layer' });

  const horseSvgWrap = el('div', { class: 'horse-svg' });
  const dirtLayer = el('div', { class: 'dirt-layer' });
  const hoofLayer = el('div', { class: 'hoof-layer' });
  const horseWrap = el('div', {
    class: 'box-horse breathing',
    dataset: { target: 'horse' },
  }, [horseSvgWrap, dirtLayer, hoofLayer]);

  const bubble = el('div', { class: 'action-bubble hidden' });
  const plate = el('div', { class: 'horse-nameplate' });
  const hintBar = el('div', { class: 'scene-hint hidden' });

  scene.append(floor, propLayer, trough, rack, muckLayer, horseWrap, plate, bubble, hintBar);

  /* --- Zustand der Bewegung --- */

  const anim = {
    x: 50,
    dir: 1,
    behaviour: 'idle',
    target: null,
    timer: 2,
    actionTimer: 0,
    soundIn: rnd(...SOUND_EVERY),
    muckIn: rnd(...MUCK_EVERY),
    onArrive: null,
  };

  /* --- Pflege im Gange --- */

  let progress = null;   // { key, done, total, label }
  let bedFilled = new Set();
  let hoofDone = 0;

  /* ---------------------------------------------------------------- Zeichnen */

  function drawHorse() {
    horse = getActiveHorse();
    if (!horse) return;
    horseSvgWrap.innerHTML = horseSVG(horse);
    plate.textContent = horse.name;
    drawDirt();
  }

  /** Schmutzflecken passend zum Fellzustand. */
  function drawDirt() {
    dirtLayer.innerHTML = '';
    const spots = Math.min(8, Math.floor((100 - horse.needs.coat) / 11));
    const places = [
      [36, 52], [48, 62], [30, 66], [56, 48], [42, 44],
      [24, 58], [52, 70], [62, 56],
    ];
    for (let i = 0; i < spots; i++) {
      const [lx, ly] = places[i];
      dirtLayer.append(el('div', {
        class: 'dirt-spot',
        dataset: { life: '2' },
        style: {
          left: `${lx}%`, top: `${ly}%`,
          transform: `rotate(${(i * 37) % 60 - 30}deg) scale(${0.7 + (i % 3) * 0.25})`,
        },
      }));
    }
  }

  function drawMuck() {
    muckLayer.innerHTML = '';
    for (const m of getMuck(horse)) {
      muckLayer.append(el('div', {
        class: 'muck-pile',
        dataset: { muckId: m.id },
        title: 'Wegräumen',
        style: {
          left: `${m.x}%`,
          bottom: `${m.y}px`,
          transform: `scale(${m.size})`,
        },
      }, [
        el('span', { class: 'muck-ball b1' }),
        el('span', { class: 'muck-ball b2' }),
        el('span', { class: 'muck-ball b3' }),
      ]));
    }
    updateMuckHighlight();
  }

  function drawDecor() {
    propLayer.innerHTML = '';
    for (const d of getDecor(horse)) {
      const def = DECOR[d.id];
      if (!def) continue;
      const art = def.art ? decorArt(d.id) : null;
      propLayer.append(el('div', {
        class: `decor-item ${def.cls || ''} ${art ? 'drawn' : ''}`,
        html: art || undefined,
        text: art ? undefined : def.icon,
        title: `${def.name} · Komfort +${def.comfort}`,
        dataset: { decorId: d.id },
        style: art
          ? { left: `${d.x}%`, top: `${d.y}%`, width: `${def.w}px` }
          : { left: `${d.x}%`, top: `${d.y}%` },
      }));
    }
    if (horse.lickStone > 0.05) {
      // Trägt bewusst auch die Klasse decor-item: dadurch lässt er sich im
      // Deko-Modus genauso verschieben wie alles andere an der Wand.
      propLayer.append(el('div', {
        class: 'decor-item lickstone-item',
        title: 'Leckstein — im Deko-Modus verschiebbar',
        dataset: { decorId: LICK_ID },
        style: {
          left: `${horse.lickPos ?? 88}%`,
          top: `${horse.lickPosY ?? 46}%`,
          opacity: 0.55 + horse.lickStone * 0.45,
        },
      }, '🧂'));
    }
  }

  /** Alles auffrischen, was vom Zustand abhängt. */
  function update() {
    horse = getActiveHorse();
    if (!horse) return;

    bedding.style.setProperty('--bedding', (horse.needs.clean / 100).toFixed(2));
    updateProps();

    scene.classList.remove('lit-1', 'lit-2', 'lit-3');
    const tier = lightTier(getDecor(horse));
    if (tier) scene.classList.add(`lit-${tier}`);

    horseWrap.classList.toggle('sad', conditionLabel(condition(horse)).mood === 'sad');

    drawMuck();
    drawDecor();
    // Während gestriegelt oder geputzt wird, die Flecken NICHT neu zeichnen —
    // sonst käme der schon weggewischte Schmutz sofort zurück.
    if (!progress) drawDirt();
    layout();
  }

  /** Nur die Füllstände von Tränke und Raufe — läuft während des Trinkens laufend. */
  function updateProps() {
    troughWater.style.height = `${clamp(horse.trough ?? 0, 0, 100)}%`;
    rackHay.style.height = `${clamp(horse.rack ?? 0, 0, 100)}%`;
    trough.classList.toggle('empty', (horse.trough ?? 0) < 8);
    rack.classList.toggle('empty', (horse.rack ?? 0) < 8);
  }

  /* ---------------------------------------------------------------- Bewegung */

  function layout() {
    horseWrap.style.left = `${anim.x}%`;
    horseWrap.style.setProperty('--flip', anim.dir);
    plate.style.left = `${anim.x}%`;
    bubble.style.left = `${anim.x}%`;
  }

  function setBehaviour(b) {
    anim.behaviour = b;
    horseWrap.classList.toggle('walking', b === 'walk');
    horseWrap.classList.toggle('grazing', b === 'graze');
    horseWrap.classList.toggle('breathing', b === 'idle' || b === 'busy');
    horseWrap.classList.toggle('drinking', b === 'drink');
    horseWrap.classList.toggle('eating', b === 'eat');
  }

  /** Hat das Pferd Durst und ist etwas in der Tränke? */
  function wantsDrink() { return horse.needs.water < THIRSTY && (horse.trough ?? 0) > 8; }
  /** Hunger und Futter in der Raufe? */
  function wantsFood()  { return horse.needs.food  < HUNGRY  && (horse.rack   ?? 0) > 8; }

  function pickBehaviour() {
    // Grundbedürfnisse gehen vor: das Pferd geht von selbst zur Tränke
    // oder zur Raufe, wenn dort etwas drin ist.
    if (wantsDrink()) { goTo('drink'); return; }
    if (wantsFood())  { goTo('eat');   return; }

    const r = Math.random();
    if (r < 0.42) {
      // ein Stück laufen
      let target = rnd(X_MIN, X_MAX);
      if (Math.abs(target - anim.x) < 8) target = anim.x < 50 ? anim.x + 18 : anim.x - 18;
      anim.target = clamp(target, X_MIN, X_MAX);
      anim.dir = anim.target > anim.x ? 1 : -1;
      setBehaviour('walk');
      anim.timer = 12;                 // Sicherheitsnetz, falls das Ziel nie erreicht wird
    } else if (r < 0.72) {
      setBehaviour('graze');
      anim.timer = rnd(4, 8);
    } else {
      setBehaviour('idle');
      anim.timer = rnd(3, 7);
    }
  }

  /** Zur Tränke oder zur Raufe gehen und sich dort bedienen. */
  function goTo(what) {
    const x = what === 'drink' ? TROUGH_X : RACK_X;
    walkTo(x, () => {
      setBehaviour(what);
      anim.actionTimer = what === 'drink' ? 6 : 8;
      showBubble(what === 'drink' ? '💧 schlürf' : '🌾 mampf');
      if (what === 'drink') sfx.drink(4); else sfx.chew(6);
    });
  }

  /** Das Pferd zu einer Stelle laufen lassen und danach etwas tun. */
  function walkTo(x, then) {
    anim.target = clamp(x, X_MIN, X_MAX);
    anim.dir = anim.target > anim.x ? 1 : -1;
    anim.onArrive = then;
    setBehaviour('walk');
    anim.timer = 12;
  }

  let lastTick = performance.now();

  function tick(now) {
    if (destroyed) return;
    const dt = Math.min(0.1, (now - lastTick) / 1000);
    lastTick = now;

    if (isVisible()) step(dt);
    requestAnimationFrame(tick);
  }

  function isVisible() {
    return !document.hidden && scene.closest('.screen')?.classList.contains('active');
  }

  function step(dt) {
    /* Laufen */
    if (anim.behaviour === 'walk' && anim.target != null) {
      const dist = anim.target - anim.x;
      const move = WALK_SPEED * dt * Math.sign(dist);
      if (Math.abs(move) >= Math.abs(dist)) {
        anim.x = anim.target;
        anim.target = null;
        const cb = anim.onArrive;
        anim.onArrive = null;
        setBehaviour('idle');
        anim.timer = rnd(1.5, 3);
        if (cb) cb();
      } else {
        anim.x += move;
      }
      layout();
    }

    /* Trinken und Fressen: Vorrat wandert nach und nach ins Pferd */
    if (anim.behaviour === 'drink' || anim.behaviour === 'eat') {
      const drinking = anim.behaviour === 'drink';
      const supply = drinking ? 'trough' : 'rack';
      const need = drinking ? 'water' : 'food';
      const rate = (drinking ? DRINK_RATE : EAT_RATE) * dt;

      const take = Math.min(rate, horse[supply] ?? 0, 100 - horse.needs[need]);
      if (take > 0.001) {
        addSupply(horse, supply, -take);
        addNeed(horse, need, take);
        updateProps();
      }

      anim.actionTimer -= dt;
      const done = anim.actionTimer <= 0 || take <= 0.001;
      if (done) {
        save(); emit();
        hideBubble();
        setBehaviour('idle');
        anim.timer = rnd(2, 4);
        if (Math.random() < 0.7) sfx.blow();
        onChange();
      }
    }

    /* Verhalten wechseln */
    if (anim.behaviour !== 'busy' && anim.behaviour !== 'drink' && anim.behaviour !== 'eat') {
      anim.timer -= dt;
      if (anim.timer <= 0) pickBehaviour();
    }

    /* Stalllaute */
    anim.soundIn -= dt;
    if (anim.soundIn <= 0) {
      anim.soundIn = rnd(...SOUND_EVERY);
      randomHorseSound();
      if (Math.random() < 0.35) flickEars();
    }

    /* Pferdeäpfel */
    anim.muckIn -= dt;
    if (anim.muckIn <= 0) {
      anim.muckIn = rnd(...MUCK_EVERY);
      if (muckCount() < 7) dropApple();
    }
  }

  function flickEars() {
    horseWrap.classList.add('ear-flick');
    setTimeout(() => horseWrap.classList.remove('ear-flick'), 700);
  }

  /** Das Pferd lässt einen Haufen fallen — mit kleiner Animation und Ton. */
  function dropApple() {
    // etwas hinter dem Pferd, je nach Blickrichtung
    const x = clamp(anim.x - anim.dir * 9, 8, 92);
    const pile = dropMuck(x);
    if (!pile) return;

    save(); emit();
    drawMuck();

    const node = muckLayer.querySelector(`[data-muck-id="${pile.id}"]`);
    if (node) {
      node.classList.add('dropping');
      setTimeout(() => node.classList.remove('dropping'), 700);
    }
    sfx.blow();
    setTimeout(() => sfx.muck(), 250);
    onChange();
  }

  /* ---------------------------------------------------------------- Werkzeuge */

  function setTool(key, foodKey = null) {
    tool = key;
    food = foodKey;
    progress = null;
    bedFilled = new Set();
    hoofDone = 0;

    scene.classList.toggle('tool-active', !!key);
    scene.dataset.tool = key || '';
    hoofLayer.innerHTML = '';
    hideBubble();

    if (!key) {
      hintBar.classList.add('hidden');
      setBehaviour('idle');
      updateMuckHighlight();
      return;
    }

    const a = ACTIONS[key];
    let text = a.hint.replaceAll('{name}', horse.name);
    if (key === 'feed' && food) text = `${FOODS[food].name} ausgewählt — tippe jetzt auf ${horse.name}.`;

    hintBar.innerHTML = '';
    hintBar.append(
      el('span', { class: 'hint-icon', text: key === 'feed' && food ? FOODS[food].icon : a.icon }),
      el('span', { text }),
      el('button', { class: 'hint-cancel', title: 'Werkzeug weglegen', onclick: () => { sfx.click(); setTool(null); onChange(); } }, '✕'),
    );
    hintBar.classList.remove('hidden');

    if (key === 'shoe') startShoeing();
    updateMuckHighlight();
  }

  function updateMuckHighlight() {
    const on = tool === 'muck' || muckCount() > 0;
    muckLayer.classList.toggle('highlight', on);
  }

  /* --- Fortschrittsblase über dem Pferd --- */

  function showBubble(text) {
    bubble.textContent = text;
    bubble.classList.remove('hidden');
  }
  function hideBubble() { bubble.classList.add('hidden'); }

  /* ---------------------------------------------------------------- Aktionen */

  /** Futter geben: Kopf runter, kauen, Bedürfnis auffüllen. */
  function doFeed() {
    if (!food) { toast('Wähle zuerst eine Futtersorte.', 'bad'); return; }
    const f = FOODS[food];
    if (!useInv(food, 1)) { sfx.error(); toast(`Kein ${f.name} mehr im Vorrat.`, 'bad'); return; }

    setBehaviour('eat');
    showBubble(`${f.icon} lecker!`);
    sfx.chew(5);

    applyCare(horse, 'food', f.amount, f.coins, `${f.name} gefüttert`);
    if (f.bonusCoat) addNeed(horse, 'coat', f.bonusCoat);

    setTimeout(() => {
      if (destroyed) return;
      hideBubble();
      setBehaviour('idle');
      if (Math.random() < 0.6) sfx.blow();
      // Kein Futter mehr? Werkzeug weglegen.
      if (invCount(food) <= 0) { food = null; setTool(null); }
      onChange();
    }, 1400);

    onChange();
  }

  /** Tränke auffüllen. Auf das Pferd geklickt, geht es anschließend gleich trinken. */
  function fillTrough(alsoDrink) {
    const before = horse.needs.water;
    const added = addSupply(horse, 'trough', 100);

    if (added <= 0 && !alsoDrink) { toast('Die Tränke ist randvoll.'); return; }
    if (added <= 0 && horse.needs.water > 96) { toast('Voll — und satt getrunken.'); return; }

    sfx.water();
    const coins = rewardFor(before, Math.min(100 - before, Math.max(added, 40)), 5);
    if (coins) addCoins(coins);
    save(); emit();
    updateProps();
    toast(coins ? `Frisches Wasser — 🪙 ${coins}` : 'Frisches Wasser in der Tränke', 'good');

    if (alsoDrink && horse.needs.water < 99) goTo('drink');
    setTool(null);
    onChange();
  }

  /** Futter in die Raufe füllen — davon bedient sich das Pferd später selbst. */
  function fillRack() {
    if (!food) { toast('Wähle zuerst eine Futtersorte.', 'bad'); return; }
    const f = FOODS[food];
    if ((horse.rack ?? 0) > 92) { toast('Die Raufe ist voll.'); return; }
    if (!useInv(food, 1)) { sfx.error(); toast(`Kein ${f.name} mehr im Vorrat.`, 'bad'); return; }

    const before = horse.needs.food;
    const added = addSupply(horse, 'rack', f.amount * 1.6);
    sfx.straw();

    const coins = rewardFor(before, added, f.coins);
    if (coins) addCoins(coins);
    save(); emit();
    updateProps();
    toast(coins ? `${f.name} in die Raufe — 🪙 ${coins}` : `${f.name} in die Raufe gefüllt`, 'good');

    if (invCount(food) <= 0) { food = null; setTool(null); }
    onChange();
  }

  /** Leckstein an die Wand hängen. */
  function doLick(xPct, yPct) {
    if (!useInv('lickstone', 1)) { sfx.error(); toast('Kein Leckstein im Vorrat.', 'bad'); return; }
    horse.lickStone = 1;
    horse.lickPos = clamp(xPct, 6, 94);
    horse.lickPosY = clamp(yPct, 10, 70);
    sfx.buy();
    applyCare(horse, 'food', 12, 5, 'Leckstein aufgehängt');
    setTool(null);
    update();
    onChange();
  }

  /** Einen Pferdeapfel wegräumen. */
  function doMuck(node) {
    const id = node.dataset.muckId;
    if (!removeMuck(id)) return;

    node.classList.add('cleared');
    setTimeout(() => node.remove(), 260);
    sfx.muck();

    const before = horse.needs.clean;
    addNeed(horse, 'clean', MUCK_DIRT);
    // Kleine Belohnung, wenn es wirklich nötig war
    const coins = before < 70 ? 2 : 0;
    if (coins) addCoins(coins);
    save(); emit();

    if (muckCount() === 0) {
      toast('Die Box ist wieder sauber! 🧹', 'good');
      sfx.neighHigh();
      if (tool === 'muck') setTool(null);
    }
    updateMuckHighlight();
    onChange();
  }

  /** Beim Striegeln/Putzen: Flecken unter dem Zeiger wegwischen. */
  let lastBrushSound = 0;

  function doBrush(clientX, clientY) {
    const radius = hasEquip(tool === 'groom' ? 'gummistriegel' : 'kardaetsche') ? 46 : 34;
    const spots = [...dirtLayer.querySelectorAll('.dirt-spot:not([data-done])')];
    if (!spots.length) return;

    if (!progress) {
      progress = { key: tool, done: 0, total: dirtLayer.children.length };
    }

    for (const s of spots) {
      const r = s.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (Math.hypot(clientX - cx, clientY - cy) > radius) continue;

      const life = Number(s.dataset.life) - 1;
      s.dataset.life = String(life);
      s.style.opacity = String(Math.max(0, life / 2));

      if (life <= 0) {
        s.dataset.done = '1';
        progress.done++;
        const per = (tool === 'groom' ? 42 : 30) / progress.total;
        addNeed(horse, 'coat', per);
        if (tool === 'brush') addNeed(horse, 'hooves', 10 / progress.total);
        showBubble(`${ACTIONS[tool].icon} ${progress.done}/${progress.total}`);
        save(); emit();
        onChange();
      }

      if (performance.now() - lastBrushSound > 100) {
        sfx.brush();
        lastBrushSound = performance.now();
      }
    }

    if (progress.done >= progress.total) finishBrush();
  }

  function finishBrush() {
    const label = tool === 'groom' ? 'Fell gestriegelt' : 'Blitzblank geputzt';
    const coins = Math.max(3, Math.round((tool === 'groom' ? 12 : 10) * (progress.total / 8)));
    addCoins(coins);
    toast(`${label} — 🪙 ${coins}`, 'good');
    sfx.neigh();
    progress = null;
    hideBubble();
    setTool(null);
    drawDirt();
    save(); emit();
    onChange();
  }

  /** Einstreuen: Bahnen auf dem Boden füllen. */
  function doBedding(clientX) {
    if (!bedCells.children.length) buildBedCells();
    const r = bedCells.getBoundingClientRect();
    const idx = clamp(Math.floor(((clientX - r.left) / r.width) * BED_CELLS), 0, BED_CELLS - 1);
    if (bedFilled.has(idx)) return;

    bedFilled.add(idx);
    bedCells.children[idx].classList.add('filled');
    sfx.straw();
    showBubble(`🟨 ${bedFilled.size}/${BED_CELLS}`);

    if (bedFilled.size >= BED_CELLS) {
      if (!useInv('straw', 1)) { sfx.error(); return; }
      applyCare(horse, 'clean', 45, 10, 'Frisch eingestreut');
      bedFilled = new Set();
      bedCells.innerHTML = '';
      hideBubble();
      setTool(null);
      sfx.blow();
      update();
      onChange();
    }
  }

  function buildBedCells() {
    bedCells.innerHTML = '';
    for (let i = 0; i < BED_CELLS; i++) {
      bedCells.append(el('div', {
        class: 'bed-cell',
        style: { left: `${(i / BED_CELLS) * 100}%`, width: `${100 / BED_CELLS + 0.5}%` },
      }));
    }
  }

  /** Hufeisen: vier Marken am Pferd, die nacheinander angeklickt werden. */
  function startShoeing() {
    setBehaviour('busy');
    hoofDone = 0;
    hoofLayer.innerHTML = '';
    // Positionen der vier Hufe im SVG (Prozent der Pferdegrafik)
    const hooves = [
      { x: 31, y: 90, name: 'Hinten links' },
      { x: 38, y: 92, name: 'Hinten rechts' },
      { x: 63, y: 92, name: 'Vorne links' },
      { x: 69, y: 90, name: 'Vorne rechts' },
    ];
    hooves.forEach((h, i) => {
      hoofLayer.append(el('div', {
        class: 'hoof-marker',
        title: h.name,
        dataset: { hoof: String(i) },
        style: { left: `${h.x}%`, top: `${h.y}%` },
      }, '🔨'));
    });
    showBubble('🧲 0/4 Hufe');
  }

  function doShoe(node) {
    if (node.dataset.done) return;
    node.dataset.done = '1';
    node.classList.add('done');
    node.textContent = '✔';
    hoofDone++;
    sfx.hammer();
    setTimeout(() => sfx.hammer(), 130);
    showBubble(`🧲 ${hoofDone}/4 Hufe`);

    if (hoofDone >= 4) {
      if (!useInv('horseshoes', 1)) { sfx.error(); setTool(null); return; }
      applyCare(horse, 'hooves', 100, 15, 'Neue Hufeisen');
      sfx.neigh();
      setTimeout(() => {
        if (destroyed) return;
        hideBubble();
        hoofLayer.innerHTML = '';
        setBehaviour('idle');
        setTool(null);
        onChange();
      }, 600);
      onChange();
    }
  }

  /* ---------------------------------------------------------------- Eingabe */

  let dragging = false;

  scene.addEventListener('pointerdown', e => {
    const muckNode = e.target.closest('.muck-pile');
    const hoofNode = e.target.closest('.hoof-marker');
    const onHorse = !!e.target.closest('.box-horse');
    const onTrough = !!e.target.closest('.trough');
    const onRack = !!e.target.closest('.hayrack');
    const onFloor = !!e.target.closest('.box-floor');

    // Pferdeäpfel darf man immer wegräumen — auch ohne Werkzeug in der Hand
    if (muckNode) { doMuck(muckNode); return; }
    if (hoofNode && tool === 'shoe') { doShoe(hoofNode); return; }

    if (!tool) {
      // Ohne Werkzeug: das Pferd streicheln
      if (onHorse) {
        sfx.neigh();
        horseWrap.classList.add('petted');
        setTimeout(() => horseWrap.classList.remove('petted'), 1400);
        flickEars();
      }
      return;
    }

    const a = ACTIONS[tool];

    if (a.mode === 'click') {
      if (tool === 'feed' && onHorse) doFeed();
      else if (tool === 'feed' && onRack) fillRack();
      else if (tool === 'water' && onTrough) fillTrough(false);
      else if (tool === 'water' && onHorse) fillTrough(true);
      else if (tool === 'lick' && !onHorse && !onFloor && !onRack) {
        const r = scene.getBoundingClientRect();
        doLick(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      }
      return;
    }

    if (a.mode === 'drag') {
      dragging = true;
      scene.setPointerCapture?.(e.pointerId);
      if (tool === 'bed' && onFloor) doBedding(e.clientX);
      if ((tool === 'groom' || tool === 'brush') && onHorse) {
        setBehaviour('busy');
        doBrush(e.clientX, e.clientY);
      }
    }
  });

  scene.addEventListener('pointermove', e => {
    if (!dragging || !tool) return;
    const a = ACTIONS[tool];
    if (a.mode !== 'drag') return;

    if (tool === 'bed') {
      const r = floor.getBoundingClientRect();
      if (e.clientY >= r.top - 20) doBedding(e.clientX);
    } else {
      doBrush(e.clientX, e.clientY);
    }
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (anim.behaviour === 'busy' && tool !== 'shoe') setBehaviour('idle');
  };
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointercancel', endDrag);
  scene.addEventListener('pointerleave', endDrag);

  /* ---------------------------------------------------------------- Deko-Modus */

  let decorMode = false;
  let draggingDecor = null;

  function setDecorMode(on) {
    decorMode = on;
    scene.classList.toggle('decor-mode', on);
    if (on) setTool(null);
  }

  scene.addEventListener('pointerdown', e => {
    if (!decorMode) return;
    const item = e.target.closest('.decor-item');
    if (!item) return;
    draggingDecor = item;
    item.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  scene.addEventListener('pointermove', e => {
    if (!draggingDecor) return;
    const r = scene.getBoundingClientRect();
    draggingDecor.style.left = `${clamp(((e.clientX - r.left) / r.width) * 100, 3, 97)}%`;
    draggingDecor.style.top = `${clamp(((e.clientY - r.top) / r.height) * 100, 4, 96)}%`;
  });

  const dropDecor = () => {
    if (!draggingDecor) return;
    const id = draggingDecor.dataset.decorId;
    const x = parseFloat(draggingDecor.style.left);
    const y = parseFloat(draggingDecor.style.top);

    if (id === LICK_ID) {
      horse.lickPos = x;
      horse.lickPosY = y;
      save();
    } else {
      const d = getDecor(horse).find(entry => entry.id === id);
      if (d) { d.x = x; d.y = y; save(); }
    }
    draggingDecor = null;
  };
  scene.addEventListener('pointerup', dropDecor);
  scene.addEventListener('pointercancel', dropDecor);

  /* ---------------------------------------------------------------- Start */

  drawHorse();
  update();
  buildBedCells();
  bedCells.innerHTML = '';
  requestAnimationFrame(tick);

  const api = {
    el: scene,
    update,
    rebuild() { drawHorse(); update(); },
    setTool,
    getTool: () => tool,
    getFood: () => food,
    setDecorMode,
    isDecorMode: () => decorMode,
    destroy() { destroyed = true; },
    /** Für Tests: das Pferd sofort einen Apfel fallen lassen. */
    dropApple,
    /** Für Tests: einen Zeitschritt erzwingen, ohne auf ein Bild zu warten. */
    step,
    anim,
  };

  // Einblick für automatisierte Tests (siehe README)
  if (typeof window !== 'undefined') window.__scene = api;

  return api;
}

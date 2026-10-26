/* game.js — Spielschleife des Parcours: Physik, Steuerung, Kollision, Münzen */

import { $, el, clamp } from '../util/dom.js';
import { sfx } from '../util/audio.js';
import { state, getActiveHorse, comfort } from '../state.js';
import { ridingStats, applyRideCost, addNeed } from '../horse.js';
import { GROUND_Y, HORSE_X, OBSTACLES, getLevel } from './levels.js';
import {
  VIEW_W, VIEW_H, drawBackground, drawScenery, drawObstacle,
  drawPickup, drawFinish, drawHorse, drawDust, drawNightMask,
} from './render.js';

/* ---------------------------------------------------------------- Konstanten */

const GRAVITY       = 2300;   // px/s²
const HOLD_GRAVITY  = 950;    // solange die Sprungtaste gehalten wird
const MAX_HOLD      = 0.22;   // Sekunden
const SPRINT_MUL    = 1.35;
const STAMINA_MAX   = 100;
const STAMINA_DRAIN = 38;     // pro Sekunde
const STAMINA_REGEN = 14;

const HORSE_W       = 96;
const HORSE_H       = 104;
const DUCK_H        = 56;
const COIN_VALUE    = 2;
const CARROT_VALUE  = 15;
const CLEAR_BONUS   = 5;      // pro fehlerfrei gesprungenem Hindernis

const FIXED_DT = 1 / 60;

/* ---------------------------------------------------------------- Zustand */

let canvas, ctx, hud;
let nav = {};
let running = false;
let raf = 0;
let acc = 0, lastTime = 0;

let level = null;
let horse = null;
let stats = null;
let coinMul = 1;

const player = {
  x: 0, y: 0, vy: 0,
  onGround: true, ducking: false,
  holdTime: 0, holding: false,
  stamina: STAMINA_MAX,
  phase: 0,
};

let runTime = 0;
let coins = 0;
let cleared = 0;
let dust = [];
let finished = false;
let crashed = false;
let hoofTimer = 0;

const keys = { jump: false, duck: false, sprint: false };

export function initRide(navigation) {
  nav = navigation;
  canvas = $('#ride-canvas');
  ctx = canvas.getContext('2d');
  hud = {
    coins: $('#hud-coins'),
    progress: $('#hud-progress-fill'),
    marker: $('#hud-marker'),
    stamina: $('#hud-stamina-fill'),
    staminaBar: $('.hud-stamina'),
    levelName: $('#hud-level-name'),
    overlay: $('#ride-overlay'),
    help: $('#hud-help'),
  };

  $('#hud-quit').addEventListener('click', quit);
  bindInput();
}

/* ---------------------------------------------------------------- Steuerung */

function bindInput() {
  document.addEventListener('keydown', e => {
    if (!running && !isRideScreen()) return;
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); pressJump(); }
    if (['ArrowDown', 'KeyS'].includes(e.code))        { e.preventDefault(); keys.duck = true; }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.sprint = true;
    if (e.code === 'Escape' && isRideScreen()) quit();
  });

  document.addEventListener('keyup', e => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) releaseJump();
    if (['ArrowDown', 'KeyS'].includes(e.code))        keys.duck = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.sprint = false;
  });

  /* Am Finger springt die ganze Fläche — Zielen kostet im Sprung zu viel Zeit.
     Ducken und Sprinten haben dafür eigene Knöpfe (siehe unten). Mit Maus oder
     Stift bleibt es bei der alten Aufteilung: oben springen, unten ducken. */
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture?.(e.pointerId);   // sonst geht das Loslassen verloren
    if (e.pointerType === 'touch') { pressJump(); return; }
    const r = canvas.getBoundingClientRect();
    if ((e.clientY - r.top) / r.height > 0.65) keys.duck = true;
    else pressJump();
  });

  const letGo = () => { releaseJump(); keys.duck = false; };
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);
  canvas.addEventListener('pointerleave', letGo);

  bindPad($('#hud-duck'),   on => { keys.duck = on; });
  bindPad($('#hud-sprint'), on => { keys.sprint = on; });
}

/** Ein Halteknopf für den Daumen: gedrückt = an, losgelassen = aus. */
function bindPad(node, set) {
  const press = e => {
    e.preventDefault();               // kein Mitscrollen, kein Doppeltipp-Zoom
    node.setPointerCapture?.(e.pointerId);
    node.classList.add('pressed');
    set(true);
  };
  const release = () => { node.classList.remove('pressed'); set(false); };

  node.addEventListener('pointerdown', press);
  node.addEventListener('pointerup', release);
  node.addEventListener('pointercancel', release);
  node.addEventListener('contextmenu', e => e.preventDefault());
}

function isRideScreen() { return $('#screen-ride').classList.contains('active'); }

function pressJump() {
  keys.jump = true;
  if (!running) return;
  if (player.onGround) {
    player.vy = -stats.jumpPower;
    player.onGround = false;
    player.holding = true;
    player.holdTime = 0;
    sfx.jump();
    spawnDust(6);
  }
}

function releaseJump() {
  keys.jump = false;
  player.holding = false;
}

/* ---------------------------------------------------------------- Start */

export function startRide(levelId) {
  horse = getActiveHorse();
  level = getLevel(levelId);
  if (!horse || !level) { nav.go('stable'); return; }

  stats = ridingStats(horse);
  if (!stats.canRide) { nav.go('stable'); return; }

  // Komfort im Stall gibt einen kleinen zusätzlichen Münzbonus
  coinMul = stats.coinBonus * (1 + Math.min(0.2, comfort() / 250 * 0.2));

  resetRun();
  hud.levelName.textContent = `${level.icon} ${level.name}`;
  hud.help.classList.remove('fade');
  setTimeout(() => hud.help.classList.add('fade'), 6000);

  countdown(3);
}

/** Lauf zurücksetzen — auch nach einem Sturz. */
function resetRun() {
  player.x = 0;
  player.y = GROUND_Y;
  player.vy = 0;
  player.onGround = true;
  player.ducking = false;
  player.holding = false;
  player.stamina = STAMINA_MAX;
  player.phase = 0;

  runTime = 0;
  coins = 0;
  cleared = 0;
  dust = [];
  finished = false;
  crashed = false;

  for (const p of level.pickups) p.taken = false;
  for (const o of level.obstacles) o.passed = false;

  updateHud();
}

function countdown(n) {
  running = false;
  showOverlay(el('div', { class: 'countdown', text: n > 0 ? String(n) : 'Los!' }));
  sfx.click();
  draw(0);   // Standbild im Hintergrund

  setTimeout(() => {
    if (!isRideScreen()) return;
    if (n > 0) countdown(n - 1);
    else {
      hideOverlay();
      running = true;
      lastTime = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    }
  }, n > 0 ? 650 : 420);
}

/* ---------------------------------------------------------------- Schleife */

function frame(now) {
  if (!running) return;
  const delta = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  acc += delta;

  while (acc >= FIXED_DT) {
    update(FIXED_DT);
    acc -= FIXED_DT;
    if (!running) break;
  }

  draw(now / 1000);
  if (running) raf = requestAnimationFrame(frame);
}

function update(dt) {
  runTime += dt;

  /* Tempo und Ausdauer */
  const wantSprint = keys.sprint && player.stamina > 1;
  let speed = stats.speed;
  if (wantSprint) {
    speed *= SPRINT_MUL;
    player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * dt);
  } else {
    player.stamina = Math.min(STAMINA_MAX, player.stamina + STAMINA_REGEN * dt);
  }
  player.x += speed * dt;

  /* Sprungphysik mit variabler Höhe */
  if (!player.onGround) {
    const holdingUp = player.holding && keys.jump && player.vy < 0 && player.holdTime < MAX_HOLD;
    if (holdingUp) player.holdTime += dt;
    player.vy += (holdingUp ? HOLD_GRAVITY : GRAVITY) * dt;
    player.y += player.vy * dt;

    if (player.y >= GROUND_Y) {
      player.y = GROUND_Y;
      player.vy = 0;
      player.onGround = true;
      player.holding = false;
      sfx.land();
      spawnDust(8);
    }
  }

  /* Ducken nur am Boden */
  player.ducking = keys.duck && player.onGround;

  /* Laufanimation und Hufgeräusch */
  const cadence = (speed / 260) * 11;
  player.phase += cadence * dt;
  if (player.onGround) {
    hoofTimer -= dt;
    if (hoofTimer <= 0) { sfx.hoof(); hoofTimer = 0.28 / (speed / 260); }
  }

  /* Staub */
  for (const p of dust) { p.x -= 60 * dt; p.y -= 18 * dt; p.life -= dt * 1.6; p.r += 12 * dt; }
  dust = dust.filter(p => p.life > 0);

  collectPickups();
  checkCollision();
  countCleared();

  if (!crashed && player.x >= level.length) return finishRun();

  updateHud();
}

/* ---------------------------------------------------------------- Kollision */

function hitbox() {
  const h = player.ducking ? DUCK_H : HORSE_H;
  return {
    left:   player.x - HORSE_W * 0.34,
    right:  player.x + HORSE_W * 0.42,
    top:    player.y - h,
    bottom: player.y,
  };
}

function checkCollision() {
  const box = hitbox();

  for (const o of level.obstacles) {
    if (o.x > player.x + 220) break;
    if (o.x + o.w < box.left - 60) continue;

    const def = OBSTACLES[o.type];
    const overlapX = box.right > o.x && box.left < o.x + o.w;
    if (!overlapX) continue;

    if (def.pit) {
      // Wassergraben: es zählt, wo die Hufe aufsetzen — nicht die ganze Pferdebreite.
      // Das macht den Absprungzeitpunkt deutlich gutmütiger.
      if (player.onGround && player.x > o.x - 10 && player.x < o.x + o.w + 10) return crash(o);
      continue;
    }

    if (def.duck) {
      // Torbogen: der Balken hängt zwischen barLow und barHigh über dem Boden
      const barBottom = GROUND_Y - def.barLow;
      const barTop = GROUND_Y - def.barHigh;
      if (box.top < barBottom && box.bottom > barTop) return crash(o);
      continue;
    }

    // Normales Hindernis: Kollision, wenn die Unterkante unter der Oberkante liegt
    const obTop = GROUND_Y - o.h;
    if (box.bottom > obTop + 6) return crash(o);
  }
}

function crash(obstacle) {
  if (crashed) return;
  crashed = true;
  running = false;
  cancelAnimationFrame(raf);
  sfx.crash();

  const def = OBSTACLES[obstacle.type];

  // Glückshufeisen rettet die Hälfte der Münzen
  let kept = 0;
  if (state.talisman && coins > 0) {
    kept = Math.floor(coins / 2);
    import('../state.js').then(m => m.addCoins(kept));
  }

  draw(performance.now() / 1000);

  showOverlay(el('div', { class: 'ov-box' }, [
    el('h3', { text: '💥 Das war zu eng!' }),
    el('p', { text: `${horse.name} ist am Hindernis „${def.name}" hängengeblieben.` }),
    coins > 0
      ? (kept > 0
          ? el('p', {}, [
              el('span', { class: 'ov-lost', text: `${coins} Münzen verloren — ` }),
              el('span', { class: 'ov-saved', text: `🍀 ${kept} durch das Glückshufeisen gerettet.` }),
            ])
          : el('p', { class: 'ov-lost', text: `${coins} gesammelte Münzen sind weg.` }))
      : el('p', { class: 'field-hint', text: 'Noch keine Münzen verloren — gleich nochmal.' }),
    el('p', { class: 'field-hint', text: `Geschafft bis Meter ${Math.round(player.x / 40)} von ${Math.round(level.length / 40)}.` }),
    el('div', { class: 'ov-actions' }, [
      el('button', { class: 'btn btn-primary', onclick: restart }, '↻ Von vorn (Leertaste)'),
      el('button', { class: 'btn', onclick: quit }, 'Zum Stall'),
    ]),
  ]));

  // Leertaste startet direkt neu
  const onKey = e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      document.removeEventListener('keydown', onKey);
      restart();
    }
  };
  setTimeout(() => document.addEventListener('keydown', onKey), 220);
}

function restart() {
  hideOverlay();
  resetRun();
  countdown(3);
}

/* ---------------------------------------------------------------- Sammeln & Ziel */

function collectPickups() {
  const box = hitbox();
  const reach = 26;

  for (const p of level.pickups) {
    if (p.taken) continue;
    if (p.x < box.left - 40) continue;
    if (p.x > box.right + 200) break;

    const cx = clamp(p.x, box.left, box.right);
    const cy = clamp(p.y, box.top, box.bottom);
    if (Math.hypot(p.x - cx, p.y - cy) > reach) continue;

    p.taken = true;
    if (p.type === 'carrot') {
      coins += CARROT_VALUE;
      addNeed(horse, 'food', 6);
      sfx.coin(); sfx.coin();
      popup(`+${CARROT_VALUE} 🥕`, p);
    } else {
      coins += COIN_VALUE;
      sfx.coin();
    }
  }
}

/** Sauber übersprungene Hindernisse zählen (für den Zielbonus). */
function countCleared() {
  for (const o of level.obstacles) {
    if (o.passed) continue;
    if (o.x + o.w < player.x - HORSE_W * 0.34) { o.passed = true; cleared++; }
  }
}

function finishRun() {
  finished = true;
  running = false;
  cancelAnimationFrame(raf);
  sfx.fanfare();

  const clearBonus = cleared * CLEAR_BONUS;
  const raw = coins + clearBonus;
  const total = Math.round(raw * coinMul);

  applyRideCost(horse);

  nav.showResult({
    levelId: level.id,
    levelName: level.name,
    time: runTime,
    coins,
    clearBonus,
    cleared,
    multiplier: coinMul,
    total,
    horse,
  });
}

function quit() {
  running = false;
  cancelAnimationFrame(raf);
  hideOverlay();
  nav.go('stable');
}

/* ---------------------------------------------------------------- Anzeige */

function updateHud() {
  hud.coins.textContent = coins;
  const pct = clamp((player.x / level.length) * 100, 0, 100);
  hud.progress.style.width = `${pct}%`;
  hud.marker.style.left = `${pct}%`;

  const sp = (player.stamina / STAMINA_MAX) * 100;
  hud.stamina.style.width = `${sp}%`;
  hud.staminaBar.classList.toggle('empty', sp < 20);
}

function showOverlay(node) {
  hud.overlay.innerHTML = '';
  hud.overlay.append(node);
  hud.overlay.classList.remove('hidden');
}
function hideOverlay() {
  hud.overlay.classList.add('hidden');
  hud.overlay.innerHTML = '';
}

/** Kleine fliegende Zahl beim Einsammeln. */
function popup(text, p) {
  const cam = player.x - HORSE_X;
  const r = canvas.getBoundingClientRect();
  const sx = ((p.x - cam) / VIEW_W) * r.width;
  const sy = (p.y / VIEW_H) * r.height;
  const node = el('div', { class: 'coin-pop', text, style: { left: `${sx}px`, top: `${sy}px` } });
  $('#ride-hud').append(node);
  setTimeout(() => node.remove(), 750);
}

function spawnDust(n) {
  for (let i = 0; i < n; i++) {
    dust.push({
      x: player.x - 20 + Math.random() * 30,
      y: GROUND_Y - 4 - Math.random() * 8,
      r: 3 + Math.random() * 5,
      life: 0.5 + Math.random() * 0.4,
    });
  }
}

/* ---------------------------------------------------------------- Zeichnen */

function draw(time) {
  const cam = player.x - HORSE_X;
  const theme = level.theme;

  drawBackground(ctx, cam, theme, time);
  drawScenery(ctx, level.scenery, cam);

  for (const o of level.obstacles) drawObstacle(ctx, o, cam);
  drawFinish(ctx, level.length, cam);
  for (const p of level.pickups) drawPickup(ctx, p, cam, time);

  drawDust(ctx, dust, cam);

  // Schatten unter dem Pferd
  const airHeight = GROUND_Y - player.y;
  const shadowScale = clamp(1 - airHeight / 400, 0.35, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(HORSE_X, GROUND_Y + 4, 46 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHorse(ctx, HORSE_X, player.y, {
    phase: player.phase,
    airborne: !player.onGround,
    ducking: player.ducking,
    coat: horse.coat,
    mane: horse.maneColor,
    scale: stats.scale,
  });

  if (theme.night) drawNightMask(ctx, HORSE_X + 60, GROUND_Y - 80, 330);

  if (crashed) {
    ctx.fillStyle = 'rgba(180,40,30,.18)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

/* Einblick für Tests und zum Nachjustieren der Balance (siehe README). */
if (typeof window !== 'undefined') {
  window.__ride = {
    get player()  { return player; },
    get level()   { return level; },
    get running() { return running; },
    get coins()   { return coins; },
    get crashed() { return crashed; },
    get finished(){ return finished; },
    keys, pressJump, releaseJump, OBSTACLES,
    /** Einen Physikschritt erzwingen — für automatisierte Testläufe. */
    step(dt = FIXED_DT) { if (running) update(dt); },
  };
}

/** Wird vom Router gerufen, wenn der Bildschirm verlassen wird. */
export function stopRide() {
  running = false;
  cancelAnimationFrame(raf);
  hideOverlay();

  // Ein Finger, der beim Verlassen noch auf einem Knopf lag, würde sonst beim
  // nächsten Start weiter "gedrückt" gelten.
  keys.jump = keys.duck = keys.sprint = false;
  document.querySelectorAll('.hud-pad.pressed').forEach(n => n.classList.remove('pressed'));
}

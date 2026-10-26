/* render.js — alles, was im Parcours auf die Leinwand gemalt wird */

import { GROUND_Y, OBSTACLES } from './levels.js';
import { COATS, MANE_COLORS, BREEDS } from '../horse.js';

export const VIEW_W = 960;
export const VIEW_H = 540;

/* ---------------------------------------------------------------- Hintergrund */

export function drawBackground(ctx, cam, theme, time) {
  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y);

  if (theme.night) drawStars(ctx, cam);
  else drawClouds(ctx, cam);

  // Hügel — zwei Ebenen mit unterschiedlichem Parallax
  drawHills(ctx, cam * 0.25, theme.hill2, GROUND_Y - 120, 90, 520);
  drawHills(ctx, cam * 0.45, theme.hill,  GROUND_Y - 70,  60, 380);

  // Boden
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = theme.groundDark;
  ctx.fillRect(0, GROUND_Y, VIEW_W, 7);

  // Bodenstruktur, die mitscrollt
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  const step = 70;
  const off = -(cam % step);
  for (let x = off; x < VIEW_W; x += step) {
    ctx.fillRect(x, GROUND_Y + 22, 34, 4);
    ctx.fillRect(x + 18, GROUND_Y + 54, 26, 4);
  }
}

function drawHills(ctx, off, color, baseY, amp, period) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 12) {
    const wx = x + off;
    const y = baseY - Math.sin(wx / period * Math.PI * 2) * amp * 0.5
                    - Math.sin(wx / (period * 0.41) * Math.PI * 2) * amp * 0.18;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawClouds(ctx, cam) {
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  const off = -(cam * 0.12) % 620;
  for (let i = -1; i < 3; i++) {
    const x = off + i * 620 + 90;
    puff(ctx, x, 78, 40);
    puff(ctx, x + 46, 66, 30);
    puff(ctx, x + 300, 120, 34);
    puff(ctx, x + 338, 108, 26);
  }
}
function puff(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.8, y + 6, r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.8, y + 8, r * 0.6, 0, Math.PI * 2); ctx.fill();
}

function drawStars(ctx, cam) {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  const off = -(cam * 0.06) % 900;
  for (let i = 0; i < 60; i++) {
    const x = (off + i * 137.5) % 1100 - 70;
    const y = 20 + (i * 53) % 260;
    const r = (i % 4 === 0) ? 1.8 : 1.1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Mond
  ctx.fillStyle = '#f4eecd';
  ctx.beginPath(); ctx.arc(790, 82, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(29,44,74,1)';
  ctx.beginPath(); ctx.arc(776, 72, 30, 0, Math.PI * 2); ctx.fill();
}

/* ---------------------------------------------------------------- Kulisse */

export function drawScenery(ctx, items, cam) {
  for (const s of items) {
    const x = s.x - cam * 0.75;
    if (x < -140 || x > VIEW_W + 140) continue;
    switch (s.kind) {
      case 'tree':  tree(ctx, x, GROUND_Y + 4); break;
      case 'bush':  bush(ctx, x, GROUND_Y + 4); break;
      case 'fence': fence(ctx, x, GROUND_Y + 4); break;
      case 'crowd': crowd(ctx, x, GROUND_Y - 6); break;
      case 'rock':  rock(ctx, x, GROUND_Y + 4); break;
    }
  }
}

function tree(ctx, x, y) {
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(x - 7, y - 76, 14, 76);
  ctx.fillStyle = '#3f6b32';
  ctx.beginPath(); ctx.arc(x, y - 96, 40, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 28, y - 74, 27, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 28, y - 76, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.arc(x - 10, y - 106, 20, 0, Math.PI * 2); ctx.fill();
}
function bush(ctx, x, y) {
  ctx.fillStyle = '#5b8f43';
  ctx.beginPath(); ctx.arc(x, y - 20, 22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 20, y - 14, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 19, y - 13, 14, 0, Math.PI * 2); ctx.fill();
}
function fence(ctx, x, y) {
  ctx.fillStyle = '#f3ecdc';
  ctx.fillRect(x, y - 62, 9, 62);
  ctx.fillRect(x - 100, y - 52, 210, 7);
  ctx.fillRect(x - 100, y - 30, 210, 7);
}
function crowd(ctx, x, y) {
  const cols = ['#d15a4a', '#4a7ad1', '#e0b02f', '#59a35c', '#9a5ad1', '#e07b3a'];
  for (let i = 0; i < 4; i++) {
    const cx = x + i * 34, cy = y - 46 - (i % 2) * 8;
    ctx.fillStyle = cols[(i + Math.floor(x)) % cols.length];
    ctx.fillRect(cx - 10, cy, 20, 42);
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath(); ctx.arc(cx, cy - 8, 9, 0, Math.PI * 2); ctx.fill();
  }
}
function rock(ctx, x, y) {
  ctx.fillStyle = '#4d4a44';
  ctx.beginPath();
  ctx.moveTo(x - 34, y); ctx.lineTo(x - 14, y - 42); ctx.lineTo(x + 8, y - 30);
  ctx.lineTo(x + 30, y - 54); ctx.lineTo(x + 46, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.09)';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 42); ctx.lineTo(x + 8, y - 30); ctx.lineTo(x - 2, y);
  ctx.lineTo(x - 20, y); ctx.closePath(); ctx.fill();
}

/* ---------------------------------------------------------------- Hindernisse */

export function drawObstacle(ctx, o, cam) {
  const x = o.x - cam;
  if (x < -200 || x > VIEW_W + 200) return;
  const def = OBSTACLES[o.type];
  const g = GROUND_Y;

  switch (o.type) {
    case 'pole': {
      standards(ctx, x - 8, g, def.h + 16, o.w + 16);
      for (let i = 0; i < 3; i++) {
        const y = g - 16 - i * ((def.h - 6) / 2);
        ctx.fillStyle = i % 2 ? '#e8e2d4' : '#d1564a';
        ctx.fillRect(x - 6, y - 7, o.w + 12, 11);
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 6, y - 7, o.w + 12, 11);
      }
      break;
    }
    case 'log': {
      ctx.fillStyle = '#7a5433';
      roundRect(ctx, x, g - def.h, o.w, def.h, 10);
      ctx.fill();
      ctx.fillStyle = '#5d3f26';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, g - def.h + 8 + i * 11, o.w - 8, 3);
      ctx.fillStyle = '#c9a26a';
      ctx.beginPath(); ctx.ellipse(x + o.w, g - def.h / 2, 7, def.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'hedge': {
      ctx.fillStyle = '#3f6b32';
      roundRect(ctx, x, g - def.h, o.w, def.h, 12); ctx.fill();
      ctx.fillStyle = '#4f8340';
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(x + 8 + (i * 13) % (o.w - 10), g - def.h + 10 + (i * 17) % (def.h - 14), 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e8d94a';
      ctx.beginPath(); ctx.arc(x + 14, g - def.h + 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + o.w - 16, g - def.h + 26, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'oxer': {
      standards(ctx, x - 8, g, def.h + 16, o.w + 16);
      for (const dx of [0, o.w - 14]) {
        for (let i = 0; i < 2; i++) {
          const y = g - 20 - i * (def.h - 24);
          ctx.fillStyle = i % 2 ? '#e8e2d4' : '#5b8bb5';
          ctx.fillRect(x + dx - 4, y - 7, 22, 11);
          ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
          ctx.strokeRect(x + dx - 4, y - 7, 22, 11);
        }
      }
      break;
    }
    case 'wall': {
      ctx.fillStyle = '#c98f6a';
      ctx.fillRect(x, g - def.h, o.w, def.h);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = g - def.h + 12 + i * 12;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + o.w, y); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + (i % 2 ? 12 : 26), y); ctx.lineTo(x + (i % 2 ? 12 : 26), y + 12); ctx.stroke();
      }
      ctx.fillStyle = '#a8724f';
      ctx.fillRect(x - 4, g - def.h - 7, o.w + 8, 8);
      break;
    }
    case 'water': {
      ctx.fillStyle = '#2f6d94';
      roundRect(ctx, x, g, o.w, 26, 6); ctx.fill();
      ctx.fillStyle = '#4a9ac4';
      roundRect(ctx, x + 4, g + 3, o.w - 8, 16, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 12 + i * 24, g + 8, 13, 3);
      ctx.fillStyle = '#e8e2d4';
      ctx.fillRect(x - 6, g - 12, 8, 14);
      ctx.fillRect(x + o.w - 2, g - 12, 8, 14);
      break;
    }
    case 'arch': {
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(x - 12, g - def.barHigh - 10, 12, def.barHigh + 10);
      ctx.fillRect(x + o.w, g - def.barHigh - 10, 12, def.barHigh + 10);
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(x - 12, g - def.barHigh, o.w + 24, def.barHigh - def.barLow);
      ctx.fillStyle = '#3f6b32';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(x + 4 + i * (o.w / 8), g - def.barLow + 4, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↓ ducken', x + o.w / 2, g - def.barHigh - 18);
      ctx.textAlign = 'left';
      break;
    }
  }
}

function standards(ctx, x, g, h, w) {
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(x - 8, g - h, 11, h);
  ctx.fillRect(x + w - 3, g - h, 11, h);
  ctx.fillStyle = '#8b6440';
  ctx.fillRect(x - 12, g - h - 6, 19, 8);
  ctx.fillRect(x + w - 7, g - h - 6, 19, 8);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------------------------------------------------------- Sammelbares */

export function drawPickup(ctx, p, cam, time) {
  if (p.taken) return;
  const x = p.x - cam;
  if (x < -60 || x > VIEW_W + 60) return;
  const bob = Math.sin(time * 3 + p.x * 0.01) * 4;

  if (p.type === 'carrot') {
    ctx.save();
    ctx.translate(x, p.y + bob);
    ctx.rotate(Math.sin(time * 2) * 0.15);
    ctx.fillStyle = '#e07b3a';
    ctx.beginPath();
    ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(0, 18);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4f8340';
    ctx.beginPath(); ctx.ellipse(-4, -16, 4, 8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -16, 4, 8, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  // Münze — Drehung durch schwankende Breite
  const wobble = Math.abs(Math.cos(time * 3.2 + p.x * 0.02));
  ctx.save();
  ctx.translate(x, p.y + bob);
  ctx.fillStyle = '#c98a13';
  ctx.beginPath(); ctx.ellipse(0, 0, 13 * wobble + 2, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2b632';
  ctx.beginPath(); ctx.ellipse(0, 0, 10 * wobble + 1.5, 10.5, 0, 0, Math.PI * 2); ctx.fill();
  if (wobble > 0.5) {
    ctx.fillStyle = '#ffdc84';
    ctx.beginPath(); ctx.ellipse(-2, -2, 3.5 * wobble, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- Ziel */

export function drawFinish(ctx, worldX, cam) {
  const x = worldX - cam;
  if (x < -260 || x > VIEW_W + 260) return;
  const g = GROUND_Y;

  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(x - 6, g - 210, 14, 210);
  ctx.fillRect(x + 180, g - 210, 14, 210);

  ctx.fillStyle = '#d1564a';
  ctx.fillRect(x - 14, g - 232, 216, 30);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ZIEL', x + 94, g - 211);
  ctx.textAlign = 'left';

  // Zielflagge
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#fff' : '#222';
      ctx.fillRect(x - 6 + i * 20, g - 200 + j * 14, 20, 14);
    }
  }
}

/* ---------------------------------------------------------------- Das Pferd */

/**
 * Zeichnet das Pferd von der Seite.
 * @param feetY  y-Position der Hufe
 * @param st     { phase, airborne, ducking, coat, mane, scale }
 */
export function drawHorse(ctx, x, feetY, st) {
  const coat = COATS[st.coat] || COATS.fuchs;
  const mane = (MANE_COLORS[st.mane] || MANE_COLORS.blond).color;
  const s = (st.scale || 1) * 0.92;

  ctx.save();
  ctx.translate(x, feetY);
  ctx.scale(s, s);
  if (st.ducking) ctx.scale(1.06, 0.72);

  const swing = st.phase;
  const air = st.airborne;

  /* Schweif */
  ctx.fillStyle = mane;
  ctx.beginPath();
  ctx.moveTo(-46, -68);
  ctx.quadraticCurveTo(-84, -56 + Math.sin(swing) * 6, -78, -8 + Math.sin(swing) * 8);
  ctx.quadraticCurveTo(-64, -30, -44, -50);
  ctx.closePath();
  ctx.fill();

  /* Hinterbeine */
  leg(ctx, -26, -46, air ? -0.9 : Math.sin(swing) * 0.75, coat.shade, coat.shade, air);
  leg(ctx, -16, -46, air ? -0.6 : Math.sin(swing + 2.4) * 0.75, coat.shade, coat.shade, air);

  /* Vorderbeine */
  leg(ctx, 26, -48, air ? 0.85 : Math.sin(swing + 3.1) * 0.8, coat.body, coat.shade, air);
  leg(ctx, 36, -48, air ? 1.1 : Math.sin(swing + 1.0) * 0.8, coat.body, coat.shade, air);

  /* Körper */
  const grd = ctx.createLinearGradient(0, -96, 0, -34);
  grd.addColorStop(0, coat.light);
  grd.addColorStop(0.6, coat.body);
  grd.addColorStop(1, coat.shade);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(0, -66, 48, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Hals */
  ctx.fillStyle = coat.body;
  ctx.beginPath();
  ctx.moveTo(24, -84);
  ctx.quadraticCurveTo(52, -104, 66, -128);
  ctx.lineTo(86, -116);
  ctx.quadraticCurveTo(70, -96, 54, -62);
  ctx.lineTo(24, -62);
  ctx.closePath();
  ctx.fill();

  /* Mähne */
  ctx.fillStyle = mane;
  ctx.beginPath();
  ctx.moveTo(22, -86);
  ctx.quadraticCurveTo(50, -108, 66, -130);
  ctx.lineTo(76, -122);
  ctx.quadraticCurveTo(56, -100, 36, -76);
  ctx.closePath();
  ctx.fill();

  /* Kopf */
  ctx.save();
  ctx.translate(80, -126);
  ctx.rotate(0.42 + (air ? -0.14 : Math.sin(swing) * 0.04));
  ctx.fillStyle = coat.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3, 20, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ohren
  ctx.fillStyle = coat.shade;
  ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-14, -36); ctx.lineTo(-2, -26); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3, -23);   ctx.lineTo(5, -38);   ctx.lineTo(13, -25); ctx.closePath(); ctx.fill();
  // Auge
  ctx.fillStyle = '#201914';
  ctx.beginPath(); ctx.ellipse(-3, -6, 3.4, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.arc(-4.4, -7.4, 1.2, 0, Math.PI * 2); ctx.fill();
  // Nüster
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.ellipse(5, 24, 2.4, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Stirnschopf
  ctx.fillStyle = mane;
  ctx.beginPath();
  ctx.moveTo(-13, -19); ctx.quadraticCurveTo(-4, -32, 8, -24);
  ctx.quadraticCurveTo(-2, -20, -8, -12); ctx.closePath(); ctx.fill();
  ctx.restore();

  /* Sattel und Zaumzeug — sichtbares Zeichen, dass geritten wird */
  ctx.fillStyle = '#5a3d24';
  roundRect(ctx, -16, -95, 34, 14, 5); ctx.fill();
  ctx.fillStyle = '#7a5433';
  roundRect(ctx, -12, -99, 26, 8, 4); ctx.fill();
  ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(2, -88); ctx.quadraticCurveTo(6, -66, 0, -52); ctx.stroke();

  ctx.restore();
}

/** Ein Bein mit Fessel und Huf. */
function leg(ctx, hipX, hipY, angle, fill, stroke, air) {
  const upper = 30, lower = 26;
  const kneeX = hipX + Math.sin(angle) * upper;
  const kneeY = hipY + Math.cos(angle) * upper;
  const lowAngle = air ? angle * 0.4 - 0.5 : angle * 0.35;
  const footX = kneeX + Math.sin(lowAngle) * lower;
  const footY = kneeY + Math.cos(lowAngle) * lower;

  ctx.strokeStyle = fill;
  ctx.lineCap = 'round';
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();

  ctx.fillStyle = '#3b322a';
  ctx.save();
  ctx.translate(footX, footY);
  ctx.rotate(lowAngle * 0.5);
  roundRect(ctx, -7, -4, 14, 10, 3); ctx.fill();
  ctx.restore();
}

/* ---------------------------------------------------------------- Effekte */

export function drawDust(ctx, particles, cam) {
  for (const p of particles) {
    ctx.fillStyle = `rgba(230,215,180,${p.life})`;
    ctx.beginPath();
    ctx.arc(p.x - cam, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Nachtstrecke: Sichtkegel um das Pferd. */
export function drawNightMask(ctx, x, y, radius) {
  const g = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.65, 'rgba(4,8,20,.35)');
  g.addColorStop(1, 'rgba(4,8,20,.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

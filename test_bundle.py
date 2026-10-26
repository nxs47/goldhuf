#!/usr/bin/env python3
"""Prueft, ob die gebaute Einzeldatei im Browser wirklich spielbar ist.

    python3 test_bundle.py        -> baut goldhuf.html und fahert es durch

Der Test startet Chromium ohne Fenster auf der fertigen Datei — und zwar ueber
file://, also genau so, wie das Spiel spaeter per Doppelklick geoeffnet wird.
Ein kleines Skript im Dokument klickt sich durch alle Bildschirme, laesst das
Pferd ein Stueck laufen und springen und schreibt sein Protokoll in den DOM.
Chromium gibt das Dokument mit --dump-dom aus, hier wird es wieder eingelesen.

Es laeuft zweimal: einmal als Rechner mit Maus, einmal als Handy. Fuer den
zweiten Lauf stellt Chromium das Fenster auf Handygroesse und meldet einen
groben Zeiger — damit greifen dieselben Media Queries wie auf einem echten
Geraet, und die Probe bedient das Spiel mit echten Touch-Ereignissen.

Warum die Physik ueber __ride.step() getaktet wird und nicht ueber die Zeit:
ohne Fenster liefert der Browser kaum Animationsbilder, echte Laufzeit waere
also nicht messbar. Der Schrittzaehler ist unabhaengig davon und deterministisch.
"""

from __future__ import annotations

import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import build

ROOT = Path(__file__).resolve().parent
BUDGET_MS = 40000

# Chromium heisst je nach Installation anders.
CANDIDATES = ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable')

PROBE = r"""
window.__errs = [];
window.addEventListener('error', e => window.__errs.push('ERROR: ' + e.message));
window.addEventListener('unhandledrejection', e => window.__errs.push('REJECT: ' + e.reason));

/* Am Rechner darf sich das Fenster nicht von selbst aufblasen. */
let vollbildRufe = 0;
document.documentElement.requestFullscreen = () => { vollbildRufe++; return Promise.resolve(); };

const log = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const active = () => [...document.querySelectorAll('.screen')]
  .filter(s => s.classList.contains('active')).map(s => s.id).join(',') || 'KEINER';
const byText = (txt) => [...document.querySelectorAll('button')]
  .find(n => n.textContent.includes(txt) && n.offsetParent);
const need = (txt) => {
  const b = byText(txt);
  if (!b) throw new Error('Knopf fehlt: ' + txt);
  b.click();
};

(async () => {
  try {
    await sleep(300);
    log.push('titel: ' + active());

    document.getElementById('btn-newgame').click();
    await sleep(300);
    byText('Neu anfangen')?.click();          // nur falls ein Spielstand existiert
    await sleep(400);
    log.push('editor: ' + active());

    need('in den Stall holen');               // Pferd anlegen
    await sleep(500);
    byText('In den Stall')?.click();
    await sleep(400);
    log.push('stall: ' + active() + ' / ' +
             document.getElementById('screen-stable').childElementCount + ' bausteine');

    for (const [name, knopf] of [['weide', 'Weide'], ['shop', 'Shop'], ['pferde', 'Pferde']]) {
      document.getElementById('btn-home').click();
      await sleep(300);
      need(knopf);
      await sleep(400);
      log.push(name + ': ' + active());
    }

    document.getElementById('btn-home').click();
    await sleep(300);
    need('Reiten');
    await sleep(400);
    log.push('levelwahl: ' + active());

    need('Starten');
    await sleep(2500);                        // Countdown abwarten
    const R = window.__ride;
    log.push('parcours: ' + active() + ' / laeuft: ' + R.running + ' / ' + R.level.name);

    const x0 = R.player.x;
    for (let i = 0; i < 60; i++) R.step();
    log.push('strecke: ' + x0.toFixed(0) + ' -> ' + R.player.x.toFixed(0));

    R.pressJump();
    for (let i = 0; i < 8; i++) R.step();
    R.releaseJump();
    const yLuft = R.player.y;
    for (let i = 0; i < 40; i++) R.step();
    log.push('sprung: hoehe ' + (R.player.y - yLuft).toFixed(0) + ' / wieder unten: ' +
             (Math.abs(R.player.y - yLuft) > 1));

    const c = document.getElementById('ride-canvas');
    const summe = c.getContext('2d').getImageData(0, 0, c.width, c.height)
      .data.reduce((a, b) => a + b, 0);
    log.push('canvas: ' + c.width + 'x' + c.height + ' / gezeichnet: ' + (summe > 0));

    document.getElementById('hud-quit').click();
    await sleep(400);
    log.push('verlassen: ' + active());
    log.push('spielstand: ' + (localStorage.getItem('goldhuf.save') ? 'gesichert' : 'FEHLT'));
    log.push('vollbild ungefragt: ' + (vollbildRufe ? 'JA, ' + vollbildRufe + 'x' : 'nein'));
  } catch (e) {
    log.push('ABBRUCH: ' + e.message);
  }

  log.push('fehler: ' + (window.__errs.length ? window.__errs.join(' ; ') : 'keine'));
  const out = document.createElement('pre');
  out.id = 'probe-out';
  out.textContent = log.join('\n');
  document.body.appendChild(out);
})();
"""


PROBE_TOUCH = r"""
window.__errs = [];
window.addEventListener('error', e => window.__errs.push('ERROR: ' + e.message));
window.addEventListener('unhandledrejection', e => window.__errs.push('REJECT: ' + e.reason));

/* Ein selbst erzeugter Zeiger ist dem Browser unbekannt — setPointerCapture
   wuerde darauf mit einer Ausnahme antworten und den echten Handler abbrechen.
   Fuer die Dauer des Tests wird die Methode deshalb stillgelegt; am echten
   Geraet bleibt sie unberuehrt. */
Element.prototype.setPointerCapture = function () {};

/* Vollbild und Lagesperre lassen sich ohne echte Nutzergeste nicht ausloesen.
   Getestet wird deshalb, ob das Spiel danach fragt — die Attrappen zaehlen mit. */
let vollbildRufe = 0, lageRufe = 0;
document.documentElement.requestFullscreen = () => { vollbildRufe++; return Promise.resolve(); };
if (screen.orientation) screen.orientation.lock = () => { lageRufe++; return Promise.resolve(); };

const log = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const byText = (txt) => [...document.querySelectorAll('button')]
  .find(n => n.textContent.includes(txt) && n.offsetParent);
const sichtbar = (sel) => { const n = document.querySelector(sel); return !!(n && n.offsetParent); };

/** Ein Finger: tippt, zieht, laesst los. */
function finger(node, type, x, y) {
  node.dispatchEvent(new PointerEvent(type, {
    pointerId: 1, pointerType: 'touch', isPrimary: true,
    bubbles: true, cancelable: true, clientX: x, clientY: y,
    button: type === 'pointermove' ? -1 : 0,
    buttons: type === 'pointerup' ? 0 : 1,
  }));
}
const mitte = node => { const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

(async () => {
  try {
    await sleep(300);
    log.push('geraet: grober zeiger ' + matchMedia('(pointer: coarse)').matches +
             ' / fenster ' + innerWidth + 'x' + innerHeight);

    document.getElementById('btn-newgame').click();
    await sleep(300);
    log.push('vollbild beim ersten tippen: ' +
             (vollbildRufe > 0 ? 'angefordert' : 'NICHT ANGEFORDERT'));
    byText('Neu anfangen')?.click();
    await sleep(400);
    (byText('in den Stall holen') || document.querySelector('#screen-editor .btn-big.btn-primary')).click();
    await sleep(500);
    byText('In den Stall')?.click();
    await sleep(500);

    /* Nichts darf seitlich hinausragen — der haeufigste Handy-Fehler. */
    const ueberlauf = document.documentElement.scrollWidth - innerWidth;
    log.push('seitlicher ueberlauf: ' + (ueberlauf > 1 ? ueberlauf + 'px ZU BREIT' : 'keiner'));

    /* Tippziele: alles unter 40 px trifft der Daumen schlecht. */
    const klein = [...document.querySelectorAll('#screen-stable button')]
      .filter(b => b.offsetParent && b.getBoundingClientRect().height < 40)
      .map(b => (b.textContent.trim().slice(0, 14) || b.id) + ' ' +
                Math.round(b.getBoundingClientRect().height) + 'px');
    log.push('zu kleine tippziele im stall: ' + (klein.length ? klein.join(', ') : 'keine'));

    /* Ohne Werkzeug muss der Finger die Seite scrollen duerfen, mit Werkzeug
       nicht — sonst rutscht die Box beim Striegeln weg. */
    const box = document.querySelector('.box-scene');
    log.push('box mit leerer hand: touch-action ' + getComputedStyle(box).touchAction);

    const fell0 = window.__goldhuf.state.horses[0].needs.coat;
    byText('Striegeln').click();
    await sleep(300);
    log.push('box mit werkzeug: touch-action ' + getComputedStyle(box).touchAction);

    /* Mit dem Finger ueber das Fell streichen */
    const pferd = document.querySelector('.box-horse');
    const p = mitte(pferd);
    finger(box, 'pointerdown', p.x, p.y);
    for (let i = 0; i < 24; i++) {
      finger(box, 'pointermove', p.x + Math.sin(i) * 40, p.y + Math.cos(i) * 25);
      await sleep(16);
    }
    finger(box, 'pointerup', p.x, p.y);
    await sleep(200);
    const fell1 = window.__goldhuf.state.horses[0].needs.coat;
    log.push('striegeln am finger: fell ' + fell0.toFixed(0) + ' -> ' + fell1.toFixed(0) +
             (fell1 > fell0 ? '' : ' KEINE WIRKUNG'));

    /* Parcours */
    document.getElementById('btn-home').click();
    await sleep(300);
    byText('Reiten').click();
    await sleep(400);
    byText('Starten').click();
    await sleep(2500);

    log.push('querformat beim parcours: ' +
             (lageRufe > 0 ? 'angefordert' : 'NICHT ANGEFORDERT'));

    const R = window.__ride;
    const canvas = document.getElementById('ride-canvas');
    log.push('canvas: ' + (getComputedStyle(canvas).objectFit === 'contain'
             ? 'behaelt sein seitenverhaeltnis' : 'VERZERRT'));
    log.push('daumenknoepfe: ' + (sichtbar('#hud-duck') && sichtbar('#hud-sprint')
             ? 'da' : 'FEHLEN') +
             ' | tastaturhinweis: ' + (sichtbar('#hud-help') ? 'STOERT' : 'ausgeblendet'));

    /* Tippen unten auf der Flaeche muss springen — am Finger wird nicht gezielt. */
    const c = canvas.getBoundingClientRect();
    R.player.onGround = true;
    finger(canvas, 'pointerdown', c.left + c.width / 2, c.bottom - 30);
    for (let i = 0; i < 6; i++) R.step();
    finger(canvas, 'pointerup', c.left + c.width / 2, c.bottom - 30);
    log.push('tipp unten springt: ' + (!R.player.onGround));
    for (let i = 0; i < 60; i++) R.step();

    /* Ducken per Daumenknopf */
    const duck = document.getElementById('hud-duck');
    const d = mitte(duck);
    finger(duck, 'pointerdown', d.x, d.y);
    for (let i = 0; i < 4; i++) R.step();
    const geduckt = R.player.ducking;
    finger(duck, 'pointerup', d.x, d.y);
    for (let i = 0; i < 4; i++) R.step();
    log.push('ducken am knopf: ' + geduckt + ' / danach wieder aufrecht: ' + (!R.player.ducking));

    /* Sprint zehrt an der Ausdauer */
    const sprint = document.getElementById('hud-sprint');
    const s = mitte(sprint);
    const aus0 = R.player.stamina;
    finger(sprint, 'pointerdown', s.x, s.y);
    for (let i = 0; i < 40; i++) R.step();
    const aus1 = R.player.stamina;
    finger(sprint, 'pointerup', s.x, s.y);
    log.push('sprint am knopf: ausdauer ' + aus0.toFixed(1) + ' -> ' + aus1.toFixed(1) +
             (aus1 < aus0 ? '' : ' KEINE WIRKUNG'));

    /* Beim Verlassen darf kein Knopf "gedrueckt" haengenbleiben. */
    document.getElementById('hud-quit').click();
    await sleep(300);
    log.push('knopf haengt nach dem verlassen: ' +
             (document.querySelector('.hud-pad.pressed') ? 'JA' : 'nein'));
  } catch (e) {
    log.push('ABBRUCH: ' + e.message);
  }

  log.push('fehler: ' + (window.__errs.length ? window.__errs.join(' ; ') : 'keine'));
  const out = document.createElement('pre');
  out.id = 'probe-out';
  out.textContent = log.join('\n');
  document.body.appendChild(out);
})();
"""

# Chromium meldet damit einen groben Zeiger ohne Schwebe-Zustand — also genau
# das, was ein Handy meldet. Ohne diese Schalter greifen die Media Queries
# fuer Fingerbedienung nicht und der Test liefe an der Wirklichkeit vorbei.
TOUCH_FLAGS = [
    '--touch-events=enabled',
    '--blink-settings=primaryPointerType=2,availablePointerTypes=1',
]


def find_browser() -> str:
    for name in CANDIDATES:
        path = shutil.which(name)
        if path:
            return path
    raise SystemExit('Kein Chromium/Chrome gefunden — '
                     f'gesucht wurde nach: {", ".join(CANDIDATES)}')


def run(doc: str, browser: str, probe: str, groesse: str, flags: list[str]) -> str:
    """Dokument mit Probe oeffnen und das fertige DOM zurueckgeben."""
    with tempfile.TemporaryDirectory() as tmp:
        # Die Datei muss neben goldhuf.html liegen: gleiche Herkunft, gleicher Pfad.
        page = ROOT / '_probelauf.html'
        page.write_text(doc.replace('</body>', f'<script>{probe}</script>\n</body>'),
                        encoding='utf-8')
        try:
            proc = subprocess.run(
                [browser, '--headless', '--disable-gpu', '--no-sandbox',
                 f'--user-data-dir={tmp}/profil', f'--window-size={groesse}',
                 *flags,
                 f'--virtual-time-budget={BUDGET_MS}', '--dump-dom',
                 page.as_uri()],
                capture_output=True, text=True, timeout=180)
        finally:
            page.unlink(missing_ok=True)
    return proc.stdout


def taugt_nicht(zeile: str) -> bool:
    if zeile.startswith('fehler: '):
        return zeile != 'fehler: keine'
    return any(w in zeile for w in
               ('ABBRUCH', 'FEHLT', 'FEHLEN', 'false', 'ZU BREIT',
                'KEINE WIRKUNG', 'VERZERRT', 'STOERT', ': JA'))


def durchlauf(doc: str, browser: str, titel: str, probe: str,
              groesse: str, flags: list[str]) -> bool:
    print(f'\n=== {titel} ===')
    dom = run(doc, browser, probe, groesse, flags)
    m = re.search(r'<pre id="probe-out">(.*?)</pre>', dom, re.S)
    if not m:
        print('Kein Protokoll — das Spiel ist vermutlich beim Start stehengeblieben.',
              file=sys.stderr)
        return False

    protokoll = html.unescape(m.group(1)).strip()
    print(protokoll)
    schlecht = [z for z in protokoll.splitlines() if taugt_nicht(z)]
    if schlecht:
        print('  ^ beanstandet: ' + ' | '.join(schlecht), file=sys.stderr)
    return not schlecht


def main() -> int:
    if build.main() != 0:
        return 1

    browser = find_browser()
    doc = build.OUT.read_text(encoding='utf-8')

    ok = durchlauf(doc, browser, 'Rechner mit Maus (1280x800)',
                   PROBE, '1280,800', [])
    ok &= durchlauf(doc, browser, 'Handy mit Finger (390x844)',
                    PROBE_TOUCH, '390,844', TOUCH_FLAGS)

    if not ok:
        print('\nFehlgeschlagen.', file=sys.stderr)
        return 1
    print('\nBestanden — die Einzeldatei laeuft ueber file://, am Rechner wie am Handy.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

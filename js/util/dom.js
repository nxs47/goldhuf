/* dom.js — kleine DOM-Helfer, Modals, Toasts */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Wird gerade mit dem Finger bedient? Entscheidet nur ueber Texte — die
    Bedienung selbst funktioniert immer auf beide Arten. */
export const amFinger = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

/** Element bauen: el('div', {class:'x', onclick:fn}, 'Text' | [kinder]) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class')        node.className = v;
    else if (k === 'html')    node.innerHTML = v;
    else if (k === 'text')    node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp  = (a, b, t) => a + (b - a) * t;
export const rnd   = (a, b) => a + Math.random() * (b - a);
export const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

/** Sekunden als 1:04,3 */
export function formatTime(s) {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const rest = (s - m * 60);
  return m > 0
    ? `${m}:${rest.toFixed(1).padStart(4, '0').replace('.', ',')}`
    : `${rest.toFixed(1).replace('.', ',')} s`;
}

/** Deterministischer Zufall — gleiche Strecke sieht immer gleich aus. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ---------- Toast ---------- */

export function toast(msg, kind = '') {
  const root = $('#toast-root');
  const node = el('div', { class: `toast ${kind}`, text: msg });
  root.append(node);
  setTimeout(() => node.remove(), 2300);
}

/* ---------- Modal ---------- */

let modalCleanup = null;

/**
 * Modal öffnen.
 * @param {{title?:string, body:Node|string, actions?:Array, onClose?:Function, wide?:boolean}} opts
 * @returns {{close:Function, root:HTMLElement}}
 */
export function modal({ title, body, actions = [], onClose, dismissable = true }) {
  closeModal();

  const box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
  if (title) box.append(el('h3', { text: title }));
  box.append(body.nodeType ? body : el('div', { html: body }));

  if (actions.length) {
    box.append(el('div', { class: 'modal-actions' },
      actions.map(a => el('button', {
        class: `btn ${a.class || ''}`,
        disabled: a.disabled,
        onclick: () => { if (a.keepOpen !== true) close(); a.onClick?.(); }
      }, a.label))
    ));
  }

  const backdrop = el('div', {
    class: 'modal-backdrop',
    onclick: e => { if (dismissable && e.target === backdrop) close(); }
  }, box);

  const onKey = e => { if (e.key === 'Escape' && dismissable) close(); };
  document.addEventListener('keydown', onKey);

  function close() {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    modalCleanup = null;
    onClose?.();
  }
  modalCleanup = close;

  $('#modal-root').append(backdrop);
  return { close, root: box };
}

export function closeModal() { modalCleanup?.(); }

/** Ja/Nein-Rückfrage. */
export function confirmDialog(title, text, onYes, yesLabel = 'Ja') {
  modal({
    title,
    body: el('p', { text }),
    actions: [
      { label: 'Abbrechen', class: 'btn-ghost' },
      { label: yesLabel, class: 'btn-primary', onClick: onYes }
    ]
  });
}

/** Zeigersteuerung (Maus + Touch) auf einem Element, normalisiert auf lokale Koordinaten. */
export function onDrag(node, { onStart, onMove, onEnd } = {}) {
  let active = false;

  const local = e => {
    const r = node.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };
  const down = e => {
    active = true;
    node.setPointerCapture?.(e.pointerId);
    onStart?.(local(e), e);
  };
  const move = e => {
    const p = local(e);
    if (active) onMove?.(p, e);
    else onMove?.(p, e, true);   // Hover: dritter Parameter = "nicht gedrückt"
  };
  const up = e => { if (!active) return; active = false; onEnd?.(local(e), e); };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('pointerleave', up);

  return () => {
    node.removeEventListener('pointerdown', down);
    node.removeEventListener('pointermove', move);
    node.removeEventListener('pointerup', up);
    node.removeEventListener('pointercancel', up);
    node.removeEventListener('pointerleave', up);
  };
}

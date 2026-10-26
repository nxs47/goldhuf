#!/usr/bin/env python3
"""Baut aus dem Projekt eine einzelne, eigenständige HTML-Datei.

    python3 build.py            -> goldhuf.html

Die erzeugte Datei enthält alle Stylesheets und alle ES-Module inline und
läuft per Doppelklick über file:// — ohne Webserver, ohne Terminal.

Warum überhaupt ein Bundler: ES-Module werden vom Browser einzeln nachgeladen,
und über file:// verbietet das die Same-Origin-Regel. Also werden die Module
hier zu einem klassischen Skript zusammengefasst. Statt der Import-Syntax
bekommt jedes Modul eine kleine Fabrikfunktion und eine Registry — die
Semantik bleibt dieselbe, weil das Projekt ausschliesslich benannte Importe
und unveraenderliche Exporte (const/function) benutzt.

Kein Parser, sondern Textersetzung: das traegt nur, solange sich das Projekt an
diesen Stil haelt. Alles, was darueber hinausgeht (export default, import * as,
Namensraum-Importe), meldet das Skript als Fehler, statt still etwas Kaputtes
zu bauen.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENTRY = 'js/main.js'
OUT = ROOT / 'goldhuf.html'

# import { a, b as c } from './pfad.js';   (auch ueber mehrere Zeilen)
RE_IMPORT = re.compile(
    r'^[ \t]*import[ \t]*\{(?P<names>[^}]*)\}[ \t]*from[ \t]*'
    r'[\'"](?P<path>[^\'"]+)[\'"][ \t]*;?[ \t]*\n?',
    re.MULTILINE,
)
# import('./pfad.js')  -> dynamischer Import
RE_DYNAMIC = re.compile(r'\bimport\s*\(\s*[\'"](?P<path>[^\'"]+)[\'"]\s*\)')
# export const NAME / export function NAME   (nur am Zeilenanfang = top-level)
RE_EXPORT = re.compile(
    r'^export[ \t]+(?P<kind>const|let|var|function|class)[ \t]+'
    r'(?P<name>[A-Za-z_$][\w$]*)',
    re.MULTILINE,
)
# alles andere an Export-Syntax, das wir nicht abbilden
RE_EXPORT_OTHER = re.compile(r'^export(?![ \t]+(const|let|var|function|class)[ \t])', re.MULTILINE)
# Import-Formen ausserhalb von "import { ... } from"
RE_IMPORT_OTHER = re.compile(r'^[ \t]*import[ \t]+(?!\{)', re.MULTILINE)


class BuildError(Exception):
    pass


def resolve(spec: str, importer: str) -> str:
    """'../state.js' aus 'js/ride/game.js'  ->  'js/state.js'"""
    if not spec.startswith('.'):
        raise BuildError(f'{importer}: nicht-relativer Import "{spec}" — '
                         f'externe Pakete kann dieser Build nicht aufloesen.')
    target = (ROOT / importer).parent / spec
    try:
        return target.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        raise BuildError(f'{importer}: "{spec}" zeigt aus dem Projekt heraus.')


class Module:
    def __init__(self, mid: str, source: str):
        self.id = mid
        self.deps: list[str] = []
        self.exports: list[str] = []
        self.body = self._transform(source)

    def _transform(self, src: str) -> str:
        if RE_IMPORT_OTHER.search(src):
            raise BuildError(f'{self.id}: nur "import {{ ... }} from" wird '
                             f'unterstuetzt (kein default-/namespace-Import).')
        if RE_EXPORT_OTHER.search(src):
            raise BuildError(f'{self.id}: nur "export const/function" wird '
                             f'unterstuetzt (kein export default / export {{ }}).')

        def swap_import(m: re.Match) -> str:
            dep = resolve(m.group('path'), self.id)
            self.deps.append(dep)
            bindings = []
            for part in m.group('names').split(','):
                part = part.strip()
                if not part:
                    continue
                if ' as ' in part:
                    outer, inner = (p.strip() for p in part.split(' as ', 1))
                    bindings.append(f'{outer}: {inner}')
                else:
                    bindings.append(part)
            # Ein-Zeiler, damit die Zeilennummern im Modul erhalten bleiben.
            return 'const { %s } = __req(%r);\n' % (', '.join(bindings), dep)

        out = RE_IMPORT.sub(swap_import, src)

        def swap_dynamic(m: re.Match) -> str:
            dep = resolve(m.group('path'), self.id)
            self.deps.append(dep)
            return 'Promise.resolve(__req(%r))' % dep

        out = RE_DYNAMIC.sub(swap_dynamic, out)

        self.exports = [m.group('name') for m in RE_EXPORT.finditer(out)]
        out = RE_EXPORT.sub(lambda m: f'{m.group("kind")} {m.group("name")}', out)
        return out


def collect(entry: str) -> dict[str, Module]:
    mods: dict[str, Module] = {}
    queue = [entry]
    while queue:
        mid = queue.pop()
        if mid in mods:
            continue
        path = ROOT / mid
        if not path.is_file():
            raise BuildError(f'Modul nicht gefunden: {mid}')
        mods[mid] = Module(mid, path.read_text(encoding='utf-8'))
        queue.extend(d for d in mods[mid].deps if d not in mods)
    return mods


def topo_order(mods: dict[str, Module], entry: str) -> list[str]:
    """Abhaengigkeiten zuerst. Zyklen sind ein harter Fehler: die Module werden
    beim Import sofort ausgewertet, ein Kreis wuerde also auf halbfertige
    Exporte zugreifen."""
    order: list[str] = []
    state: dict[str, int] = {}  # 1 = in Arbeit, 2 = fertig

    def visit(mid: str, trail: list[str]) -> None:
        if state.get(mid) == 2:
            return
        if state.get(mid) == 1:
            cycle = ' -> '.join(trail[trail.index(mid):] + [mid])
            raise BuildError(f'Zyklischer Import: {cycle}')
        state[mid] = 1
        for dep in dict.fromkeys(mods[mid].deps):
            visit(dep, trail + [mid])
        state[mid] = 2
        order.append(mid)

    visit(entry, [])
    return order


def bundle_js(mods: dict[str, Module], order: list[str], entry: str) -> str:
    parts = [
        '(function () {',
        "'use strict';",
        '',
        '/* Modul-Registry — ersetzt die Import-Mechanik des Browsers. */',
        'var __defs = {}, __cache = {};',
        'function __def(id, fn) { __defs[id] = fn; }',
        'function __req(id) {',
        '  if (__cache[id]) return __cache[id];',
        '  var exports = __cache[id] = {};',
        '  __defs[id](exports, __req);',
        '  return exports;',
        '}',
        '',
    ]
    for mid in order:
        mod = mods[mid]
        parts.append(f'/* ==== {mid} ==== */')
        parts.append(f'__def({mid!r}, function (__exports, __req) {{')
        parts.append(mod.body.rstrip())
        if mod.exports:
            names = ', '.join(sorted(set(mod.exports)))
            parts.append(f'Object.assign(__exports, {{ {names} }});')
        parts.append('});')
        parts.append('')
    parts.append(f'__req({entry!r});')
    parts.append('})();')
    return '\n'.join(parts)


def inline_html(js: str) -> str:
    doc = (ROOT / 'index.html').read_text(encoding='utf-8')

    def swap_css(m: re.Match) -> str:
        href = m.group('href')
        css = (ROOT / href).read_text(encoding='utf-8')
        return f'<style>\n/* ==== {href} ==== */\n{css.strip()}\n</style>'

    doc, n_css = re.subn(
        r'<link[^>]*rel=["\']stylesheet["\'][^>]*href=["\'](?P<href>[^"\']+)["\'][^>]*>',
        swap_css, doc)
    if not n_css:
        raise BuildError('Keine Stylesheets in index.html gefunden.')

    # </script> im Code wuerde das Skript-Tag vorzeitig beenden.
    safe = js.replace('</script>', '<\\/script>')
    doc, n_js = re.subn(
        r'<script[^>]*type=["\']module["\'][^>]*></script>',
        lambda _: '<script>\n' + safe + '\n</script>', doc)
    if n_js != 1:
        raise BuildError(f'Erwartet genau ein Modul-Skript in index.html, gefunden: {n_js}')

    doc = doc.replace('</title>', '</title>\n<!-- Erzeugt von build.py — nicht direkt bearbeiten. -->', 1)
    return doc


def main() -> int:
    try:
        mods = collect(ENTRY)
        order = topo_order(mods, ENTRY)
        doc = inline_html(bundle_js(mods, order, ENTRY))
    except BuildError as e:
        print(f'Build fehlgeschlagen: {e}', file=sys.stderr)
        return 1

    OUT.write_text(doc, encoding='utf-8')
    print(f'{OUT.name}  —  {len(mods)} Module, {len(doc) / 1024:.0f} KB')
    print(f'Im Browser oeffnen: file://{OUT}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

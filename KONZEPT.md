# Pferdespiel — Spielkonzept

**Titel (Arbeitstitel):** *Goldhuf — Stall & Sprung*
**Plattform:** Webbrowser (Desktop + Tablet), reines Frontend, offline lauffähig
**Zielgruppe:** Kinder & Jugendliche ab ca. 7 Jahren, Pferdefans
**Spielzeit:** Kurze Sessions von 5–15 Minuten, Langzeitmotivation über Sammeln & Ausbauen

---

## 1. Spielidee in einem Satz

Du pflegst deine Pferde in einem luxuriös ausgestatteten Stall und reitest Sprungparcours, in denen du Münzen sammelst — mit den Münzen kaufst du Pflegeartikel, Stall-Deko und neue Pferde.

---

## 2. Spielschleife (Core Loop)

```
   ┌──────────────┐      Pferd ist fit & glücklich      ┌──────────────┐
   │    STALL     │ ─────────────────────────────────►  │   PARCOURS   │
   │   (Pflege)   │                                     │   (Reiten)   │
   └──────────────┘  ◄─────────────────────────────────  └──────────────┘
          ▲              Münzen aus dem Ritt                   │
          │                                                    │
          └──────────────  SHOP (kaufen)  ◄────────────────────┘
```

1. **Pflegen** — Bedürfnisse des Pferdes erfüllen (Futter, Wasser, Fell, Hufe, Stall).
2. **Reiten** — Parcours springen, Münzen sammeln. Je gepflegter das Pferd, desto besser die Leistung.
3. **Kaufen** — Pflegeartikel verbrauchen sich, Stall-Deko und neue Pferde freischalten.
4. Zurück zu 1.

**Verbindung zwischen Pflege und Reiten:** Jedes Pferd hat einen **Zustandswert (0–100)**, gemittelt aus allen Pflege-Bedürfnissen. Er beeinflusst direkt:

| Zustand | Auswirkung im Parcours |
|---|---|
| 80–100 | Volle Sprungkraft, Münzen-Bonus ×1,5 |
| 50–79  | Normal |
| 25–49  | Langsamer, geringere Sprunghöhe |
| 0–24   | Pferd verweigert — Parcours nicht startbar |

Damit ist Pflege kein optionales Beiwerk, sondern Voraussetzung fürs Reiten.

---

## 3. Der Stall (Pflege-Modus)

Seitenansicht einer Stallbox, in der das aktive Pferd steht. Unten eine Werkzeugleiste; man wählt ein Werkzeug und klickt/zieht damit auf das Pferd oder die Box.

### 3.1 Pflege-Aktionen

| # | Aktion | Werkzeug/Verbrauch | Ziel | Dauer | Abbau pro Stunde Echtzeit* |
|---|---|---|---|---|---|
| 1 | **Füttern** | Heu / Hafer / Möhren | Sattheit | 2 s | −8 |
| 2 | **Tränken** | Wassereimer (gratis) | Durst | 2 s | −10 |
| 3 | **Stall ausmisten** | Mistgabel + Schubkarre | Sauberkeit | Mini-Spiel | −6 |
| 4 | **Einstreuen** | Stroh / Späne | Sauberkeit + Komfort | 3 s | (nach Ausmisten nötig) |
| 5 | **Leckstein** | Salzleckstein | Zufriedenheit | Platzieren | verbraucht sich langsam |
| 6 | **Striegeln** | Striegel (Gummi) | Fellpflege | Mini-Spiel | −5 |
| 7 | **Putzen** | Kardätsche + Hufkratzer | Sauberkeit Fell/Hufe | Mini-Spiel | −5 |
| 8 | **Hufeisen erneuern** | Hufeisen-Set | Hufzustand | Mini-Spiel | −2 (selten nötig) |

\* Der Abbau läuft nur, wenn das Spiel läuft, plus ein gedeckelter Offline-Abbau (max. 8 Stunden), damit man nach längerer Pause nicht vor einem verwahrlosten Pferd steht.

### 3.2 Pflege direkt am Pferd

Es gibt keine getrennten Mini-Spiel-Fenster: Man wählt unten ein Werkzeug und
arbeitet damit direkt in der Box. Eine Hinweisleiste sagt, was zu tun ist, das
Ziel leuchtet auf.

| Aktion | Bedienung |
|---|---|
| **Füttern** | Futtersorte wählen, dann das Pferd anklicken — es senkt den Kopf und kaut |
| **Tränken** | Pferd oder Tränke anklicken; das Pferd läuft zur Tränke und trinkt |
| **Ausmisten** | Pferdeäpfel anklicken (geht immer, auch ohne Werkzeug) |
| **Einstreuen** | Über den Boden ziehen, bis alle Bahnen voll sind |
| **Leckstein** | An die Wandstelle klicken, wo er hängen soll |
| **Striegeln / Putzen** | Über das Fell streichen; die Flecken verschwinden |
| **Hufeisen** | Vier Marken erscheinen an den Hufen und werden nacheinander angeklickt |

Ein Klick auf das Pferd ohne Werkzeug ist Streicheln — es wiehert und hüpft.

Jede abgeschlossene Pflege gibt **5–15 Münzen**, aber nur, wenn das Bedürfnis
vorher unter 72 % lag. So bleibt Pflege eine Einnahmequelle, ohne dass man
durch endloses Wiederholen Geld drucken kann.

### 3.3 Stallausstattung (Komfort)

Der Stall ist bewusst luxuriös. Deko-Objekte werden im Shop gekauft und per Drag & Drop platziert:

- **Kronleuchter** (3 Stufen: schlicht → Kristall → Gold) — Beleuchtung der Box
- **Sitzecke für Reiter:** Heuballen-Bank → Sofa → Chesterfield-Sessel + Teppich
- **Liegeplatz fürs Pferd:** Extra-Streu, Kissen, Fell-Decke
- Weitere: Wandbilder, Namensschild an der Box, Blumenkästen, Pokalregal, Musikbox

Kronleuchter, Sitzmöbel, Teppich und Pferdedecke sind als eigene Grafik
gezeichnet (`js/decorArt.js`), die übrigen Stücke nutzen Symbole.

**Komfort-Wert:** Jedes Objekt bringt Komfortpunkte. Der Gesamtkomfort **verlangsamt den Bedürfnis-Abbau** (bis −40 % bei Maximalausbau) und gibt einen kleinen Münz-Bonus im Parcours. Deko ist also nicht nur Kosmetik.

---

## 4. Der Parcours (Reit-Modus)

**Perspektive:** 2D-Seitenansicht, Auto-Runner — das Pferd läuft von links nach rechts, der Hintergrund scrollt.

### 4.1 Steuerung

| Aktion | Tastatur / Maus | Finger |
|---|---|---|
| Springen | Leertaste / ↑ / Klick obere Hälfte | Tippen, überall auf der Fläche |
| Höher springen | Leertaste halten | Tipp halten |
| Ducken (z. B. Torbogen) | Pfeil ↓ / Klick untere Hälfte | Knopf unten links halten |
| Galopp-Sprint (kostet Ausdauer) | Umschalt | Knopf unten rechts halten |

Am Finger wird nicht gezielt: Springen löst die ganze Fläche aus, Ducken und
Sprinten liegen als Knöpfe in den unteren Ecken — dort, wo die Daumen ohnehin
sind. Der Parcours ist auf 16:9 gezeichnet und behält sein Seitenverhältnis;
hochkant weist das Spiel darauf hin, das Gerät zu drehen.

### 4.2 Regeln

- **Hindernisse:** Stange, Baumstamm, Hecke, Oxer, Mauer (springen), Wassergraben
  (weit springen — es zählt, wo die Hufe aufsetzen, nicht die Pferdebreite) und
  Torbogen (rund 200 px lang, hier muss man gedrückt ducken; wer sehr hoch
  springt, kommt auch darüber).
- **Kollision = Neustart des Parcours von vorn.** Die in diesem Versuch gesammelten Münzen gehen verloren (Ausnahme: Hufeisen-Talisman, s. u.). Kurze Slow-Motion-Animation, dann Neustart-Button — kein Game-Over-Bildschirm mit Strafgefühl.
- **Münzen** liegen in Bögen über den Hindernissen — wer sauber und hoch springt, kassiert mehr. Das belohnt gutes Timing statt bloßem Überleben.
- **Karotten** als seltene Bonus-Items: +25 Münzen und ein Stück Sattheit.
- **Parcours-Ende:** Zielbogen. Abschluss-Bonus = Anzahl fehlerfreier Sprünge × 10.

### 4.3 Strecken & Schwierigkeit

| Level | Name | Freischaltung | Charakteristik |
|---|---|---|---|
| 1 | Reitplatz | Start | Kurz, niedrige Stangen, viele Münzen |
| 2 | Waldweg | 200 Münzen gesamt | Baumstämme, Duck-Äste |
| 3 | Wiesenparcours | 600 Münzen | Wassergraben, Doppelsprünge |
| 4 | Turnierplatz | 1500 Münzen | Oxer, Tempowechsel, Zuschauer |
| 5 | Bergpfad bei Nacht | 3000 Münzen | Eingeschränkte Sicht, Kronleuchter-Laterne hilft |

Jede Strecke besteht aus handgesetzten Segmenten, die in fester Reihenfolge kommen — so ist ein Parcours lernbar und der Neustart fair, nicht zufällig frustrierend.

**Bestzeit & Rekord** pro Strecke werden gespeichert und im Stall auf dem Pokalregal angezeigt.

---

## 5. Pferde

### 5.1 Anpassung bei Kauf/Erstellung

| Eigenschaft | Auswahl |
|---|---|
| **Name** | Freie Eingabe (max. 16 Zeichen, Filter für unpassende Wörter) |
| **Rasse** | Haflinger, Friese, Araber, Isländer, Shetlandpony, Andalusier, Tinker |
| **Fellfarbe** | Fuchs, Rappe, Schimmel, Brauner, Falbe, Palomino, Apfelschimmel |
| **Fellmuster/Abzeichen** | Blesse, Stern, Schnippe, weiße Fesseln, Schecke, keine |
| **Mähnen-/Haarfarbe** | Passend zum Fell oder Kontrast (blond, schwarz, silber, kastanie) |
| **Mähnenstil** | Offen, geflochten, kurz geschoren, lang gewellt |

Vorschau in Echtzeit im Charakter-Editor. Später jederzeit umgestaltbar (Mähne & Name gratis, Fellfarbe kostet Münzen — die Rasse bleibt fest).

### 5.2 Rassen-Eigenschaften

Jede Rasse hat ein leichtes Profil, damit die Wahl Bedeutung hat (Werte 1–5):

| Rasse | Sprungkraft | Tempo | Genügsamkeit* | Preis |
|---|---|---|---|---|
| Shetlandpony | 2 | 2 | 5 | 0 (Startpferd) |
| Haflinger | 3 | 3 | 4 | 500 |
| Isländer | 3 | 4 | 4 | 800 |
| Tinker | 3 | 3 | 5 | 1000 |
| Araber | 4 | 5 | 2 | 1800 |
| Andalusier | 4 | 4 | 3 | 2200 |
| Friese | 5 | 3 | 2 | 3000 |

\* Genügsamkeit = wie langsam die Bedürfnisse sinken. Teure Pferde springen besser, brauchen aber mehr Pflege — ein bewusster Zielkonflikt.

**Stallplätze:** Start mit 2 Boxen, weitere Box für 750 Münzen (bis max. 6). Nicht geritten wird immer nur mit einem aktiven Pferd; alle Pferde im Stall bauen Bedürfnisse ab (nicht aktive nur halb so schnell).

---

## 6. Wirtschaft & Shop

### 6.1 Münzquellen

- **Im Parcours:** jede Münze 2, jede Möhre 15
- **Zielbonus:** 5 pro fehlerfrei gesprungenem Hindernis
- **Gesamt pro erfolgreichem Lauf:** ca. 95 (Reitplatz) bis 170 (Bergpfad),
  mit gepflegtem Pferd ×1,5 und bis zu weiteren +20 % durch Stallkomfort
- Pflege-Mini-Spiele: 5–15 Münzen — aber nur, wenn das Bedürfnis unter 72 % lag
- Tagesbonus beim ersten Start: 25 Münzen
- Bestzeit-Rekord geknackt: 25 Münzen

Die Münzen im Parcours liegen bewusst in Bögen über den Hindernissen: Wer nur
überlebt, kommt langsam voran; wer sauber und hoch springt, verdient das Doppelte.

### 6.2 Shop-Kategorien

**Verbrauchsartikel (Pflege)**

| Artikel | Preis | Menge |
|---|---|---|
| Heuballen | 10 | 5 Portionen |
| Hafer | 25 | 5 Portionen |
| Möhren | 15 | 3 Portionen |
| Stroh / Späne | 20 | 4 Einstreuungen |
| Salzleckstein | 40 | 1 (hält lange) |
| Hufeisen-Set | 60 | 1 Satz |

**Ausrüstung (dauerhaft, bessere Wirkung)**

| Artikel | Preis | Effekt |
|---|---|---|
| Gummistriegel | 80 | Striegeln 30 % schneller |
| Kardätsche (Profi) | 120 | Putzen wirkt +20 % |
| Mistgabel (leicht) | 100 | Ausmisten 30 % schneller |
| Automatik-Tränke | 300 | Durst sinkt nur halb so schnell |

**Stall-Deko** — Kronleuchter (150/400/900), Sitzecke (200/500/1200), Teppich (150), Pferdedecke (250), Namensschild (50), Pokalregal (300), Blumenkästen (100), Musikbox (350)

**Pferde & Boxen** — siehe Tabelle oben

**Talisman** — *Glückshufeisen* (600 Münzen): Bei einer Kollision behältst du die Hälfte der gesammelten Münzen. Einmal pro Lauf.

Preise sind so gesetzt, dass ein erstes zusätzliches Pferd nach ca. 30–45 Minuten Spielzeit erreichbar ist.

---

## 7. Benutzeroberfläche

**Bildschirme:**

1. **Startbildschirm** — Logo, „Weiterspielen“, „Neues Spiel“, Einstellungen
2. **Stall (Hauptbildschirm)** — Box mit Pferd, Bedürfnis-Anzeigen oben links, Werkzeugleiste unten, Münzstand oben rechts, Buttons: Reiten / Shop / Pferdewechsel / Deko-Modus
3. **Pferdewahl** — Karussell aller Pferde mit Zustandsampel; hier auch „Neues Pferd kaufen“
4. **Charakter-Editor** — Live-Vorschau + Auswahlreiter (Rasse, Fell, Mähne, Abzeichen, Name)
5. **Streckenwahl** — Karten der 5 Strecken mit Bestzeit und Schloss-Symbol
6. **Parcours-HUD** — Münzen, Distanzbalken, Ausdauer, Zustand des Pferdes
7. **Ergebnisbildschirm** — Münzen, Sprünge, Rekord, Buttons „Nochmal“ / „Zum Stall“
8. **Shop** — Reiter nach Kategorie, Karten mit Bild/Preis/Effekt

**Bedürfnis-Anzeige:** Fünf runde Icons (Futter, Wasser, Sauberkeit, Fell, Hufe) mit Ringfüllung. Unter 30 % pulsiert das Icon rot — das Pferd zeigt zusätzlich eine Stimmungsanimation (Ohren angelegt, Kopf hängen lassen).

**Barrierearmut:** Große Klickflächen (min. 44 px), Text ab 16 px, keine reine Farbcodierung (immer Icon + Zahl), Ton abschaltbar, Pausenfunktion, keine Zeitlimits im Stall.

---

## 8. Technik

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Sprache | **HTML + CSS + Vanilla JavaScript (ES-Module)** | Kein Build-Schritt, direkt im Browser lauffähig, leicht wartbar |
| Rendering Parcours | **Canvas 2D** | Flüssiges Scrolling, viele bewegte Objekte |
| Rendering Stall/UI | **DOM + CSS** | Formulare, Shop, Drag & Drop sind im DOM einfacher |
| Grafik | **SVG-Sprites**, Pferd aus Ebenen (Körper, Mähne, Abzeichen, Hufe) | Einfärbbar per CSS-Variable → alle Fellfarben aus einem Asset |
| Speicherung | **localStorage** (JSON, versioniert) | Kein Server, kein Login, keine Datenschutzfragen |
| Audio | Web Audio API, kurze Samples | Wiehern, Hufgetrappel, Münz-Ping, Ambient-Stallmusik |
| Spielschleife | `requestAnimationFrame` mit fixem Zeitschritt (60 Hz) | Gleiche Physik unabhängig von der Bildrate |

**Kein Backend, keine Konten, keine Werbung, keine Echtgeldkäufe.**

### 8.1 Projektstruktur

```
pferdespiel/
├─ index.html
├─ css/
│  ├─ base.css          Reset, Variablen, Typografie
│  ├─ stall.css         Stallbildschirm & Deko
│  ├─ ui.css            Shop, Menüs, Editor
│  └─ hud.css           Parcours-Overlay
├─ js/
│  ├─ main.js           Einstieg, Bildschirm-Router
│  ├─ state.js          Zentraler Spielzustand + Speichern/Laden
│  ├─ horse.js          Pferdemodell, Bedürfnisse, Zustandsberechnung
│  ├─ care.js           Pflege-Aktionen & Mini-Spiele
│  ├─ stable.js         Stallansicht, Deko-Platzierung, Komfortwert
│  ├─ shop.js           Katalog, Kauflogik
│  ├─ editor.js         Pferde-Anpassung
│  ├─ ride/
│  │  ├─ game.js        Spielschleife, Physik, Kollision
│  │  ├─ levels.js      Segment-Definitionen der 5 Strecken
│  │  └─ render.js      Canvas-Zeichnung, Parallax
│  └─ util/
│     ├─ audio.js
│     └─ dom.js
├─ assets/
│  ├─ horses/           SVG-Ebenen je Rasse
│  ├─ items/            Pflegeartikel, Deko
│  ├─ levels/           Hintergründe, Hindernisse
│  └─ audio/
└─ KONZEPT.md
```

### 8.2 Datenmodell (Speicherstand)

```js
{
  version: 1,
  coins: 340,
  lastSeen: 1754740000000,        // für gedeckelten Offline-Abbau
  activeHorseId: "h1",
  stableSlots: 2,
  horses: [{
    id: "h1",
    name: "Blitz",
    breed: "haflinger",
    coat: "fuchs",                // Fellfarbe
    marking: "blesse",            // Abzeichen
    maneColor: "blond",
    maneStyle: "offen",
    needs: { food: 72, water: 55, clean: 80, coat: 40, hooves: 90 },
    lickStone: 0.6                // Restanteil
  }],
  inventory: { hay: 3, oats: 0, carrots: 2, straw: 4, horseshoes: 1 },
  equipment: ["gummistriegel"],
  decor: [ { id: "kronleuchter2", x: 50, y: 12 } ],
  levels: { reitplatz: { unlocked: true, bestTime: 41.2, bestCoins: 120 } },
  talisman: false
}
```

---

## 9. Entwicklungsplan

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **1 — Grundgerüst** | index.html, Bildschirm-Router, state.js mit localStorage, Platzhalter-Grafiken | Man kann zwischen Stall und Parcours wechseln |
| **2 — Parcours** | Canvas-Loop, Physik, Sprung, ein Hindernistyp, Kollision + Neustart, Münzen | Level 1 komplett spielbar |
| **3 — Stall & Pflege** | Bedürfnis-System, alle 8 Pflege-Aktionen, Mini-Spiele, Verknüpfung Zustand → Sprungkraft | Kernschleife geschlossen |
| **4 — Shop & Wirtschaft** | Katalog, Kauf, Inventar, Verbrauch | Münzen haben Zweck |
| **5 — Pferde** | Editor, Rassen, Fellfarben als SVG-Ebenen, mehrere Boxen | Sammelmotivation |
| **6 — Stallausstattung** | Kronleuchter, Sitzecken, Drag & Drop, Komfortwert | Luxus-Stall |
| **7 — Inhalte** | Strecken 2–5, weitere Hindernisse, Audio | Volles Spiel |
| **8 — Feinschliff** | Balancing, Animationen, Barrierearmut, Speicher-Migration, Tests | Veröffentlichungsreif |

Nach jeder Phase ist das Spiel lauffähig und testbar.

---

## 10. Bewusst nicht enthalten (Abgrenzung)

- Kein Mehrspieler, kein Online-Ranking (keine Serverkosten, keine Moderation nötig)
- Keine Zuchtmechanik (Umfang), keine Turniere gegen KI-Gegner — mögliche Erweiterungen
- Keine Verletzungs-/Krankheitsmechanik über schlechte Pflege hinaus; das Pferd kann nie „sterben“ oder verloren gehen
- Keine Echtzeit-Wartezeiten, keine Energie-Leiste, keine Kaufanreize

## 11. Mögliche Erweiterungen (nach Version 1.0)

- Ausritt-Modus ohne Zeitdruck zum Erkunden
- Sattel, Trense, Decken als sichtbare Ausrüstung
- Streckeneditor zum Bauen eigener Parcours
- Fotomodus mit Stall-Kulisse
- Jahreszeiten im Hintergrund

---

## 12. Umsetzungsstand

Das Spiel ist vollständig umgesetzt und lauffähig (Start: siehe README.md).
Alle acht Phasen aus Abschnitt 9 sind fertig; der Feinschliff aus Phase 8 ist
angefangen, aber nicht abgeschlossen.

**Fertig:** Stall mit allen acht Pflegeaktionen und ihren Mini-Spielen,
Bedürfnis- und Zustandssystem samt gedeckeltem Offline-Abbau, alle fünf
Strecken mit Sprung-, Duck- und Sprintsteuerung, Kollision mit Neustart,
Sattelkammer, Stallausstattung mit Komfortwirkung, Pferde-Editor mit sieben
Rassen und allen Farbkombinationen, Speichern im localStorage.

**Abweichungen vom Konzept, die sich beim Umsetzen ergeben haben:**

1. **Münzwerte deutlich gesenkt** (siehe 6.1). Mit den ursprünglichen 10 Münzen
   pro Stück brachte ein einziger Lauf über 500 Münzen — ein zweites Pferd wäre
   nach dem ersten Ritt bezahlt gewesen.
2. **Der Wassergraben prüft nur die Hufposition.** Mit der vollen Pferdebreite
   war das Absprungfenster für ein Shetlandpony nur 0,2 Sekunden groß.
3. **Der Torbogen ist 200 px lang** statt eines schmalen Balkens, damit die
   gezeichnete Breite und die Kollision übereinstimmen.
4. **Grafik komplett im Code** statt als SVG-Dateien im `assets/`-Ordner —
   dadurch braucht das Spiel keinerlei Zusatzdateien.

**Geprüft:** Alle fünf Strecken wurden automatisiert durchsimuliert und sind
auch mit dem schwächsten Pferd (Shetlandpony, Sprungkraft 2) zu schaffen;
ein Lauf dauert 18 bis 30 Sekunden.

**Noch offen aus Phase 8:** Balancing über längere Spielzeit, Musik.

**Touch und Vollbild:** umgesetzt und automatisiert geprüft — allerdings im
emulierten Handy (Chromium mit grobem Zeiger in Handygröße), nicht auf echter
Hardware. Am Handy geht das Spiel beim ersten Tippen ins Vollbild und bittet
zum Parcours um Querformat; beides scheitert leise, wo der Browser es nicht
kann (iPhone: dort führt nur „Zum Home-Bildschirm“ zum randlosen Start).
Was eine Emulation grundsätzlich nicht zeigt: Griffigkeit der Knopfgrößen in
echten Händen, Bildrate auf schwächeren Geräten und die Eigenheiten von iOS
Safari.

---

## 13. Erweiterung: lebendiger Stall, Ton und Musik

### 13.1 Das Pferd lebt

Das Pferd steht nicht mehr still. Ein Verhaltenszyklus wechselt alle paar
Sekunden zwischen **Herumlaufen**, **Grasen** und **Dösen**; beim Laufen dreht
es sich in Gehrichtung, die Beine machen einen Schrittzyklus, der Schweif wedelt
durchgehend, die Ohren zucken gelegentlich. Beim Fressen, Trinken und Grasen
senkt sich der Kopf.

Technisch: Die Pferdegrafik bekam Klassen an Kopf, Schweif, Ohren und den vier
Beinen (`js/horse.js`); die Bewegung entsteht per CSS-Animation, gesteuert über
Klassen am Umschlag-Element. Position und Verhalten verwaltet `js/stableScene.js`.

### 13.2 Pferdeäpfel

Alle 50 bis 110 Sekunden lässt das Pferd hinter sich einen Haufen fallen — mit
kleiner Fallanimation und Geräusch. Jeder Haufen zieht **7 Punkte Sauberkeit**
ab; ein Klick räumt ihn weg und gibt sie zurück. Höchstens sieben Haufen liegen
gleichzeitig da. Während der Abwesenheit fällt etwa alle 40 Minuten einer, im
Rahmen der gedeckelten acht Stunden.

Die Haufen stehen im Spielstand (`state.muck`) und überleben damit einen
Neustart.

### 13.3 Klang

Alle Geräusche werden weiterhin zur Laufzeit erzeugt, es gibt keine Audiodateien.
Neu sind echte Pferdelaute: **Wiehern** (absteigender Ton mit aufmoduliertem
Zittern — das erzeugt das typische Flattern), **Schnauben**, **Ausatmen**,
**Kauen**, **Trinken** und **Hufstampfen**. Im Stall kommt alle 11 bis 26
Sekunden von selbst einer davon.

### 13.4 Musik

Vier Stücke: ein ruhiger Walzer für Stall und Menüs, ein treibendes
Galoppstück für die Tagstrecken, eine getragene Moll-Fassung für den Bergpfad
bei Nacht und eine langsamere Titelversion.

Die Musik steht als **Notendaten im Code** (`js/music.js`): Tonhöhe, Länge,
Instrument und Lautstärke je Stimme, abgespielt über einen kleinen Zeitplaner
der Web Audio API. Das ist inhaltlich dasselbe wie eine MIDI-Datei, nur ohne
Datei und ohne Klangbibliothek.

**Warum keine echten MIDI-Dateien:** Frei nutzbare CC0-MIDI gibt es durchaus
(OmniCreamo und SenseZera auf itch.io, Kenney-Jingles, OpenGameArt). Um sie im
Browser hörbar zu machen, braucht man aber einen MIDI-Player und einen
SoundFont — zusammen mehrere Megabyte Fremddaten. Das widerspricht dem
Grundsatz, dass das Spiel ohne Zusatzdateien auskommt. Falls echte MIDI-Musik
gewünscht ist, wäre der Weg: `midi-player-js` plus `soundfont-player` und ein
kleiner SoundFont im `assets/`-Ordner.

Geräusche und Musik lassen sich in den Einstellungen getrennt abschalten.

---

## 14. Erweiterung: mehrere Ställe nebeneinander

### 14.1 Schneller Stallwechsel

Über der Bedürfnisleiste steht eine Reihe kleiner Boxvorschauen: Wandfarbe,
Einstreu, das Pferd in Miniatur, sein Zustand in Prozent und ein Hinweis, wenn
Pferdeäpfel herumliegen. Ein Klick wechselt sofort in diesen Stall — der Umweg
über den Pferdebildschirm entfällt. Freie Boxen erscheinen als gestrichelte
Kachel mit „＋" und führen direkt zum Pferdemarkt.

Die Kachel des aktiven Stalls ist golden umrandet. Bei nur einem Pferd und
keiner freien Box wird die Leiste ausgeblendet.

### 14.2 Einrichtung je Stall

Deko gehörte bisher dem Spielstand und stand damit in allen Boxen gleichzeitig.
Jetzt hängt sie am Pferd (`horse.decor`), und das hat drei Folgen:

- **Kaufen wirkt nur auf die offene Box.** Wer denselben Kronleuchter in einem
  zweiten Stall will, kauft ihn dort noch einmal. Der Laden nennt im Kopf den
  Stall, den er gerade einrichtet, und zeigt bei jedem Stück, in wie vielen
  anderen Boxen es schon steht.
- **Komfort zählt je Box.** Nur die Einrichtung der eigenen Box verlangsamt den
  Bedürfnisabbau des Pferdes, das darin steht. Ein Luxusstall nützt dem
  Nachbarpferd nichts.
- **Die Lichtstufe des Kronleuchters** gilt ebenfalls nur für die eigene Box und
  ist in der Vorschaukachel zu erkennen.

**Pferdeäpfel wurden mitumgestellt** (`horse.muck`). Sonst wäre beim Stallwechsel
der Mist mitgewandert: Man hätte in Stall A aufgeräumt und in Stall B genau
dieselben Haufen wieder vorgefunden. Während der Abwesenheit verschmutzt jede
Box für sich, ruhende Ställe halb so schnell wie der aktive.

### 14.3 Leckstein

Der Leckstein trägt jetzt dieselbe Kennzeichnung wie die übrige Deko und lässt
sich im Deko-Modus frei an der Wand verschieben. Seine Stelle steht beim Pferd
(`lickPos`, `lickPosY`) und bleibt erhalten, bis er aufgebraucht ist.

### 14.4 Alte Spielstände

Beim Laden wird die bisher gemeinsame Einrichtung **an jeden Stall kopiert** —
so verliert niemand etwas, was er bezahlt hat. Die alten, gemeinsamen Felder
`state.decor` und `state.muck` werden danach entfernt; die Äpfel landen beim
zuletzt aktiven Pferd.

---

## 15. Erweiterung: Selbstversorgung und Weide

### 15.1 Tränke und Raufe sind Vorräte

Bisher zeigten Tränke und Raufe nur die Bedürfnisse des Pferdes an. Jetzt sind
es echte Vorräte (`horse.trough`, `horse.rack`, jeweils 0–100), und das ändert
die Aufgabe des Spielers: Nicht mehr das Pferd wird bedient, sondern der Vorrat
gefüllt — den Rest erledigt das Pferd selbst.

- Sinkt der Durst unter 55 % und ist Wasser in der Tränke, **geht das Pferd von
  allein hin** und trinkt. Dasselbe gilt für Hunger und Raufe.
- Getrunken und gefressen wird nach und nach: Der Vorrat fließt mit 26 bzw. 16
  Punkten je Sekunde ins Pferd, und man sieht den Füllstand dabei sinken.
- Ist ein Vorrat leer, bekommt er einen roten Rand.

Beide Wege der Pflege bleiben erhalten:

| Klick mit dem Werkzeug | Wirkung |
|---|---|
| Füttern → auf das Pferd | füttert sofort aus der Hand (wie bisher) |
| Füttern → in die Raufe | füllt den Vorrat (Menge × 1,6) |
| Tränken → auf die Tränke | füllt sie randvoll |
| Tränken → auf das Pferd | füllt die Tränke **und** schickt das Pferd hin |

### 15.2 Die Weide

Ein eigener Bildschirm mit Wiese, Zaun, Sonne und grasenden Pferden. Wer
draußen ist, wird von selbst satt.

**Gras als gemeinsamer Vorrat** (`state.pasture.grass`, 0–100):

| Größe | Wert |
|---|---|
| Verbrauch je Pferd | 15 Gras pro Minute |
| Sättigung dafür | 25 Futterpunkte pro Minute |
| Nachwachsen ohne Pferde | 3,5 pro Minute (leer → voll in ~30 min) |
| Nachwachsen mit Pferden | ein Viertel davon |
| Weidegang erlaubt ab | 10 % Gras |

Eine volle Weide gibt also rund 165 Futterpunkte ab — genug, um ein bis zwei
Pferde satt zu machen, danach braucht sie eine Pause.

**Draußen gelten andere Regeln:** Der Bauch füllt sich von selbst, dafür sinken
Wasser (×1,3) und Fell (×1,4) schneller — Sonne und Wälzen im Gras. Die Box
verschmutzt nicht, solange das Pferd nicht darin steht, und es fallen dort auch
keine Pferdeäpfel. Der Komfort der Einrichtung wirkt draußen nicht.

**Wenn das Gras alle ist,** kommen alle Pferde automatisch zurück in den Stall,
mit Meldung und Wiehern. Genau dafür war die Reihenfolge im Code wichtig: Erst
wird gefressen, dann geprüft, ob es gereicht hat, **dann** zurückgeschickt und
erst zuletzt nachwachsen gelassen. Andernfalls wäre die Weide nie leer — das
frisch nachgewachsene Gras hätte den leeren Zustand sofort wieder überdeckt und
die Pferde hätten für immer am Existenzminimum weitergegrast.

**Solange ein Pferd draußen ist,** steht seine Box leer: Der Stallbildschirm
zeigt statt der Box einen Hinweis mit „Zurückholen", die Pflegewerkzeuge und
der Reiten-Knopf sind nicht erreichbar, und die Kachel in der Stallleiste zeigt
ein Weidesymbol statt des Pferdes.

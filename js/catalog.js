/* catalog.js — alle kaufbaren Dinge an einem Ort (Daten, keine Logik-Abhängigkeiten) */

/** Verbrauchsartikel: füllen das Inventar auf. */
export const CONSUMABLES = {
  hay:        { name: 'Heuballen',      icon: '🌾', price: 10, amount: 5, unit: 'Portionen',    desc: 'Grundfutter. Füllt den Bauch solide.' },
  oats:       { name: 'Hafer',          icon: '🥣', price: 25, amount: 5, unit: 'Portionen',    desc: 'Kraftfutter — sättigt deutlich stärker als Heu.' },
  carrots:    { name: 'Möhren',         icon: '🥕', price: 15, amount: 3, unit: 'Stück',        desc: 'Lieblingssnack. Sättigt und macht gute Laune.' },
  straw:      { name: 'Stroh',          icon: '🟨', price: 20, amount: 4, unit: 'Einstreuungen',desc: 'Frische Einstreu für eine weiche Box.' },
  lickstone:  { name: 'Salzleckstein',  icon: '🧂', price: 40, amount: 1, unit: 'Stück',        desc: 'Hält lange und bremst den Hunger.' },
  horseshoes: { name: 'Hufeisen-Set',   icon: '🧲', price: 60, amount: 1, unit: 'Satz',         desc: 'Vier neue Eisen samt Nägeln.' },
};

/** Dauerhafte Ausrüstung: verbessert Pflege oder bremst Bedürfnisse. */
export const EQUIPMENT = {
  gummistriegel: { name: 'Gummistriegel',      icon: '🪮', price: 80,  desc: 'Striegeln geht 30 % schneller.' },
  kardaetsche:   { name: 'Kardätsche (Profi)', icon: '🧽', price: 120, desc: 'Putzen wirkt 20 % stärker.' },
  mistgabel:     { name: 'Leichte Mistgabel',  icon: '🔱', price: 100, desc: 'Ausmisten geht 30 % schneller.' },
  traenke:       { name: 'Automatik-Tränke',   icon: '🚰', price: 300, desc: 'Der Durst sinkt nur halb so schnell.' },
};

/**
 * Stall-Deko. `comfort` verlangsamt den Bedürfnisabbau (bis −40 % bei viel Komfort),
 * `group` bedeutet: ein neues Stück ersetzt das alte derselben Gruppe.
 * x/y sind Prozentwerte in der Stallbox.
 */
export const DECOR = {
  kronleuchter1: { art: true, w: 120, name: 'Schlichter Kronleuchter', icon: '💡', price: 150,  comfort: 10, group: 'chandelier', tier: 1, cls: 'chandelier big',  defaultX: 50, defaultY: 16, desc: 'Warmes Licht über der Box.' },
  kronleuchter2: { art: true, w: 165, name: 'Kristall-Kronleuchter',   icon: '🕯️', price: 400,  comfort: 25, group: 'chandelier', tier: 2, cls: 'chandelier huge', defaultX: 50, defaultY: 17, desc: 'Funkelt über dem Pferd. Ersetzt den kleinen Leuchter.' },
  kronleuchter3: { art: true, w: 200, name: 'Goldener Kronleuchter',   icon: '✨', price: 900,  comfort: 45, group: 'chandelier', tier: 3, cls: 'chandelier huge', defaultX: 50, defaultY: 17, desc: 'Der Stall strahlt. Höchste Lichtstufe.' },
  sitz1: { art: true, w: 150, name: 'Heuballen-Bank',   icon: '🟫', price: 200,  comfort: 8,  group: 'seating', tier: 1, cls: 'big',  defaultX: 17, defaultY: 72, desc: 'Sitzplatz für Reiterinnen und Reiter.' },
  sitz2: { art: true, w: 185, name: 'Gemütliches Sofa', icon: '🛋️', price: 500,  comfort: 20, group: 'seating', tier: 2, cls: 'big',  defaultX: 17, defaultY: 71, desc: 'Weich und warm. Ersetzt die Bank.' },
  sitz3: { art: true, w: 155, name: 'Chesterfield-Sessel', icon: '🪑', price: 1200, comfort: 38, group: 'seating', tier: 3, cls: 'big', defaultX: 17, defaultY: 71, desc: 'Edler Ledersessel — der Stall wird zum Salon.' },
  teppich:     { art: true, w: 230, name: 'Teppich',        icon: '🟥', price: 150, comfort: 10, cls: 'huge', defaultX: 26, defaultY: 84, desc: 'Warmer Boden für die Sitzecke.' },
  decke:       { art: true, w: 175, name: 'Pferdedecke',    icon: '🧣', price: 250, comfort: 16, cls: 'big',  defaultX: 78, defaultY: 78, desc: 'Kuscheliger Liegeplatz fürs Pferd.' },
  namensschild:{ name: 'Namensschild',   icon: '🪧', price: 50,  comfort: 4,  cls: '',     defaultX: 86, defaultY: 22, desc: 'Schild an der Boxentür.' },
  pokalregal:  { name: 'Pokalregal',     icon: '🏆', price: 300, comfort: 14, cls: 'big',  defaultX: 88, defaultY: 45, desc: 'Zeigt deine Bestleistungen.' },
  blumen:      { name: 'Blumenkästen',   icon: '🌻', price: 100, comfort: 8,  cls: '',     defaultX: 10, defaultY: 34, desc: 'Frische Farbe an der Wand.' },
  musikbox:    { name: 'Musikbox',       icon: '📻', price: 350, comfort: 18, cls: '',     defaultX: 33, defaultY: 34, desc: 'Ruhige Musik entspannt das Pferd.' },
  wandbild:    { name: 'Wandbild',       icon: '🖼️', price: 120, comfort: 7,  cls: 'big',  defaultX: 68, defaultY: 30, desc: 'Ein Reitmotiv für die Rückwand.' },
  spiegel:     { name: 'Stallspiegel',   icon: '🪞', price: 180, comfort: 9,  cls: 'big',  defaultX: 62, defaultY: 55, desc: 'Pferde mögen Gesellschaft — auch die eigene.' },
};

/** Besondere Käufe (kein Inventar, keine Deko). */
export const SPECIALS = {
  stableSlot: { name: 'Zusätzliche Box', icon: '🚪', price: 750, desc: 'Platz für ein weiteres Pferd im Stall (max. 6).' },
  talisman:   { name: 'Glückshufeisen',  icon: '🍀', price: 600, desc: 'Bei einem Sturz behältst du die Hälfte der gesammelten Münzen.' },
};

/** Summe aller Komfortpunkte der aufgestellten Deko. */
export function comfortOf(decorList = []) {
  return decorList.reduce((sum, d) => sum + (DECOR[d.id]?.comfort || 0), 0);
}

/** Lichtstufe 0–3 aus dem stärksten vorhandenen Kronleuchter. */
export function lightTier(decorList = []) {
  let tier = 0;
  for (const d of decorList) {
    const def = DECOR[d.id];
    if (def?.group === 'chandelier') tier = Math.max(tier, def.tier);
  }
  return tier;
}

// The Caddy's face: a pure function from the dock's state to what the 792 × 272 e-paper panel shows (the regions, the lines, the icons) and the cradle lamps, plus the
// panel's refresh scheduler. Shared by the play page's drawing and by the tests and renders in Node; nothing here touches a page, a clock or a file.
//
// The panel: 144 dpi, no front light, the picture stays with no power. v1 is two-ink throughout, G0 ink (0) and G3 paper (255): every change is one partial refresh
// (about 0.8 s) over the regions that changed, and a full refresh (about 4 s, with a flash) is housekeeping only: at boot, after 5 partials at a quiet moment, at 00:05
// every day, and never within 10 s of a dock beat. The type is Mibi 7×9 (mibi.mjs) at whole scales: 4× line 1, 3× lines 2 and 3 and the ledger, 2× the stamp.
// Every word is a placeholder for the copywriter; every string must fit its slot, and the layout throws on an overflow with the string.
//
// The frame (x, y, w, h); every partial window starts and ends on an 8 px boundary, and the three rules lie outside every window:
//   HERO (24, 24, 176, 184)   a two-ink picture of the cradle: caddy-hero-seated or caddy-hero-empty, placeholder drawings (no caption) until the art lands
//   MSG (224, 24, 424, 184)   L1 icon (224, 52, 32, 32), text x 264 (slot 264, 46, 384, 44), 4×; L2 slot (224, 102, 424, 33), 3×, crate icons 32 × 32 at y 102,
//                             12 after the text and 8 apart, at most 3; L3 slot (224, 146, 424, 33), 3×
//   LEDGER (672, 24, 96, 184) rows at y 40, 96, 152: the icon (672, y, 32, 32), the number at x 708, 3×, "999+" past 999
//   STATUS (24, 224, 744, 24) Companion cradle mark (24, 226, 20, 20), Station cradle mark (52, 226, 20, 20): filled seated, a 2 px outline lifted; the stamp at x 84,
//                             2×, 300 px; the link mark (720, 226, 20, 20), crossed when the Station is quiet
//   rules V1 (211, 32, 1, 168), V2 (659, 32, 1, 168), H (24, 215, 744, 1), in ink (the gray waits for four-gray pictures)
import { GLYPHS, ROWS } from "./mibi.mjs";

export const W = 792, H = 272, INK = 0, PAPER = 255;
export const REGIONS = { hero: [24, 24, 176, 184], msg: [224, 24, 424, 184], ledger: [672, 24, 96, 184], status: [24, 224, 744, 24] };
export const RULES = [[211, 32, 1, 168], [659, 32, 1, 168], [24, 215, 744, 1]];
export const SLOTS = {
  l1: { x: 264, capTop: 54, scale: 4, end: 648 },        // with the Companion icon at (224, 52)
  l1Wide: { x: 224, capTop: 54, scale: 4, end: 648 },    // with no icon (the fault)
  l2: { x: 224, capTop: 108, scale: 3, end: 648 },
  l3: { x: 224, capTop: 152, scale: 3, end: 648 },
  stamp: { x: 84, capTop: 229, scale: 2, end: 384 },
  ledger: { x: 708, scale: 3, end: 768, rows: [40, 96, 152] },
};
export const ICON = { size: 32, l1: [224, 52], crateY: 102, gapText: 12, gap: 8, max: 3, mark: 20, marks: { companion: [24, 226], station: [52, 226], link: [720, 226] } };
export const IDS = { companion: "caddy-companion-32", crate: "caddy-crate-32", energy: "caddy-energy-32", data: "caddy-data-32", essence: "caddy-essence-32", seated: "caddy-hero-seated", empty: "caddy-hero-empty" };
export const HOLD_MS = 1000, SILENT_MS = 10000, QUIET_MS = 15000;   // C1 after 1 s with no hold for the seat, C4a after 10 s, C4b after 15 s with no word from the Station

// ---- the type ----
// The width of a string at a scale: (the sum of the advances - 1) × scale, the trailing pixel of tracking not counted. A character the face lacks throws.
export function measure(text, scale) {
  let w = 0; for (const ch of text) { const g = GLYPHS[ch]; if (!g) throw new Error(`the Caddy's type has no "${ch}" (in "${text}")`); w += g[0]; }
  return text.length ? (w - 1) * scale : 0;
}

// ---- words (placeholders) ----
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const spelled = (n) => WORDS[n] ?? String(n);
const count = (n, one, many) => spelled(n) + " " + (n === 1 ? one : many);
export const hm = (at, tz = 0) => new Date(at + tz * 60000).toISOString().slice(11, 16);   // the Caddy's clock, local by tz minutes; times are absolute, never "2 h ago"
export const ledgerText = (n) => (n > 999 ? "999+" : String(Math.max(0, n | 0)));

// ---- the state ----
// input: {
//   now, tz (minutes east of UTC), bootAt,
//   cradles: { companion: { state: "seated" | "lifted", seats, at }, station: { state } }   the service's cradles (as sensed, when the service refused the write)
//   who: { name } | null                     whose Companion the cradle last held (the service's face state)
//   hold: { seat, crates, left } | null      the Companion's word for a seat: the crates it carried at that seat, and how many it still carries
//   station: { at, partner, along, opened: { crates, newPods } | null, crates, ledger: { e, d, s } } | null   the Station's last word and its facts
//   fault: bool                              the service could not store a write
// }
// The states, each one partial over the regions that change:
//   C0  Idle, out             the cradle empty (also at boot): "Companion out" · "with Moss" or "exploring" · "since 14:05"
//   C1  Seated, taking        seated, and 1 s after the seat no hold for it: "Companion home" · "taking the hold" · "leave it seated"
//   C2  Seated                the hold for this seat landed: "Companion home" · "two crates" + icons, or "charging" · "open them at the Station", or "since 14:05"
//   C3  Done                  every crate of this seat opened at the Station and cleared on the Companion: "two crates home" · "three new pods" · "Fig goes along" or "ready for the next trip"
//   C4a Companion silent      seated 10 s with no hold for this seat: "Companion seated" · "no word from it" · "lift it and seat it again"
//   C4b Station quiet         no word from the Station for 15 s: the state under it, L3 "the crates wait here", the link crossed, the stamp gains the time
//   C4c Caddy fault           the service cannot store a write: "Caddy fault" · "nothing was taken" · "the crates stay aboard", the marks as sensed
// Under 1 s after a seat with no hold yet the face keeps its last picture (`keep`): the lamp is already mint.
export function faceOf(input) {
  const { now = 0, tz = 0, cradles = {}, who = null, hold = null, station = null, fault = false } = input;
  const comp = cradles.companion || { state: "lifted", seats: 0, at: input.bootAt ?? now }, seated = comp.state === "seated";
  const stationSeated = cradles.station?.state === "seated";
  const heardAt = station?.at ?? input.bootAt ?? now, quiet = now - heardAt >= QUIET_MS;
  const landed = !!hold && hold.seat === comp.seats;
  let id, hero, l1, l2 = null, l3 = null, crates = 0, icon = "solid", lamp, keep = false;
  if (fault) {
    id = "C4c"; hero = IDS.empty; l1 = "Caddy fault"; l2 = "nothing was taken"; l3 = "the crates stay aboard"; icon = null; lamp = "hand";
  } else if (!seated) {
    id = "C0"; hero = IDS.empty; icon = "outline"; l1 = "Companion out"; l2 = station?.partner ? "with " + station.partner : "exploring"; l3 = comp.at != null ? "since " + hm(comp.at, tz) : null; lamp = "off";
  } else if (landed) {
    const opened = station?.opened, done = !!opened && opened.crates > 0 && (station.crates | 0) === 0 && (hold.left ?? 0) === 0;
    hero = IDS.seated;
    if (done) { id = "C3"; l1 = count(opened.crates, "crate", "crates") + " home"; l2 = opened.newPods > 0 ? count(opened.newPods, "new pod", "new pods") : null; l3 = station.along ? station.along + " goes along" : "ready for the next trip"; lamp = "done"; }
    else { id = "C2"; l1 = "Companion home"; const n = hold.crates | 0; if (n > 0) { l2 = count(n, "crate", "crates"); crates = Math.min(ICON.max, n); l3 = "open them at the Station"; } else { l2 = "charging"; l3 = "since " + hm(comp.at, tz); } lamp = "seated"; }
  } else {
    const t = now - comp.at; hero = IDS.seated;
    if (t >= SILENT_MS) { id = "C4a"; l1 = "Companion seated"; l2 = "no word from it"; l3 = "lift it and seat it again"; lamp = "hand"; }
    else { id = "C1"; l1 = "Companion home"; l2 = "taking the hold"; l3 = "leave it seated"; lamp = "taking"; keep = t < HOLD_MS; if (keep) lamp = "seated"; }
  }
  const name = who?.name ?? null;
  let stamp = name || "", link = "ok", under = null;
  if (quiet && !fault) { under = id; id = "C4b"; l3 = "the crates wait here"; link = "lost"; stamp = (name ? name + " · " : "") + "as of " + hm(heardAt, tz); if (lamp === "taking" || lamp === "done") lamp = "seated"; }
  const ledger = station?.ledger && !fault ? [["energy", station.ledger.e], ["data", station.ledger.d], ["essence", station.ledger.s]].map(([k, n]) => ({ icon: IDS[k], text: ledgerText(n) })) : null;
  const marks = { companion: seated ? "seated" : "lifted", station: stationSeated ? "seated" : "lifted", link };
  const lines = { l1, l2, l3, stamp };
  const face = { id, under, keep, hero, lines, icon, crates, ledger, marks, lamp: { companion: lamp, station: stationSeated ? "seated" : "off" } };
  face.icons = layoutFace(face).icons;
  face.regions = regionKeys(face);
  return face;
}
// What each region holds, as a key: the scheduler repaints a region only when its key changes.
export function regionKeys(f) {
  return { hero: f.hero, msg: JSON.stringify([f.icon, f.lines.l1, f.lines.l2, f.lines.l3, f.crates]), ledger: JSON.stringify(f.ledger), status: JSON.stringify([f.marks, f.lines.stamp]) };
}

// ---- the layout: where every string and icon goes; throws when a string passes its slot ----
export function layoutFace(f) {
  const texts = [], icons = [];
  const put = (slot, text, name, after = 0) => {
    if (text == null || text === "") return null;
    const w = measure(text, slot.scale), end = slot.x + w + after;
    if (end > slot.end) throw new Error(`the Caddy's ${name} "${text}" ends at ${end}, past its slot's ${slot.end}`);
    const t = { text, x: slot.x, capTop: slot.capTop, scale: slot.scale, w, region: name === "stamp" ? "status" : "msg" }; texts.push(t); return t;
  };
  if (f.icon) icons.push({ id: IDS.companion, variant: f.icon, rect: [...ICON.l1, ICON.size, ICON.size], region: "msg" });
  put(f.icon ? SLOTS.l1 : SLOTS.l1Wide, f.lines.l1, "line 1");
  const crateRun = f.crates ? ICON.gapText + f.crates * ICON.size + (f.crates - 1) * ICON.gap : 0;
  const t2 = put(SLOTS.l2, f.lines.l2, "line 2", crateRun);
  if (t2) for (let i = 0, x = t2.x + t2.w + ICON.gapText; i < f.crates; i++, x += ICON.size + ICON.gap) icons.push({ id: IDS.crate, rect: [x, ICON.crateY, ICON.size, ICON.size], region: "msg" });
  put(SLOTS.l3, f.lines.l3, "line 3");
  put(SLOTS.stamp, f.lines.stamp, "stamp");
  if (f.ledger) f.ledger.forEach((row, i) => { const y = SLOTS.ledger.rows[i]; icons.push({ id: row.icon, rect: [672, y, ICON.size, ICON.size], region: "ledger" }); const t = put({ ...SLOTS.ledger, capTop: y + 6 }, row.text, "ledger number"); t.region = "ledger"; });
  for (const k of ["companion", "station", "link"]) icons.push({ id: "mark-" + k, variant: f.marks[k], rect: [...ICON.marks[k], ICON.mark, ICON.mark], region: "status" });
  return { texts, icons, hero: { id: f.hero, rect: REGIONS.hero } };
}

// ---- the raster: the face as 792 × 272 gray values, ink and paper only ----
function fill(px, x, y, w, h, v = INK) { for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) px.fill(v, j * W + Math.max(0, x), j * W + Math.min(W, x + w)); }
function edge(px, x, y, w, h, t = 2) { fill(px, x, y, w, t); fill(px, x, y + h - t, w, t); fill(px, x, y, t, h); fill(px, x + w - t, y, t, h); }
export function drawText(px, text, x, capTop, scale) {
  let pen = x;
  for (const ch of text) { const [adv, rows] = GLYPHS[ch], rr = rows.split("|"); for (let r = 0; r < ROWS; r++) for (let c = 0; c < 5; c++) if (rr[r][c] === "#") fill(px, pen + c * scale, capTop + r * scale, scale, scale); pen += adv * scale; }
}
const SIGN = { [IDS.energy]: "⚡", [IDS.data]: "◆", [IDS.essence]: "❀" };
// The placeholders (a paper plate, a 2 px ink edge, an ink hint), two-ink, until the art director's icons land.
function drawIcon(px, ic) {
  const [x, y, w, h] = ic.rect;
  if (ic.id.startsWith("mark-")) {
    const v = ic.variant;
    if (ic.id === "mark-link") { edge(px, x, y, w, h); fill(px, x + 5, y + 8, 4, 4); fill(px, x + 11, y + 8, 4, 4); fill(px, x + 8, y + 9, 4, 2); if (v === "lost") for (let i = 0; i < w; i++) fill(px, x + i, y + h - 1 - i, 2, 2); return; }
    if (v === "seated") fill(px, x, y, w, h); else edge(px, x, y, w, h);
    return;
  }
  fill(px, x, y, w, h, PAPER); edge(px, x, y, w, h);
  if (ic.id === IDS.companion) { if (ic.variant === "solid") fill(px, x + 10, y + 6, 12, 20); else edge(px, x + 10, y + 6, 12, 20); fill(px, x + 13, y + 9, 6, 2, ic.variant === "solid" ? PAPER : INK); }
  else if (ic.id === IDS.crate) { edge(px, x + 6, y + 9, 20, 16); fill(px, x + 6, y + 13, 20, 2); }
  else if (SIGN[ic.id]) { const s = SIGN[ic.id]; drawText(px, s, x + Math.floor((w - measure(s, 3)) / 2), y + 5, 3); }
}
function drawHero(px, id) {
  const [x, y, w, h] = REGIONS.hero;
  fill(px, x + 16, y + 152, w - 32, 12);   // the cradle's base
  fill(px, x + 56, y + 146, w - 112, 6);   // its slot
  if (id === IDS.seated) { edge(px, x + 58, y + 46, w - 116, 100); fill(px, x + 66, y + 56, w - 132, 36); }   // the Companion standing in it
}
// Draws the face whole. `regions` limits the draw to those regions (a partial); the rules are drawn with every full picture.
export function rasterFace(f, out = new Uint8Array(W * H).fill(PAPER)) {
  const L = layoutFace(f);
  for (const r of RULES) fill(out, ...r);
  drawHero(out, f.hero);
  for (const t of L.texts) drawText(out, t.text, t.x, t.capTop, t.scale);
  for (const ic of L.icons) drawIcon(out, ic);
  return out;
}

// ---- the lamps: one RGB lamp per cradle, driven at the sensed edge; the colours and levels are the art director's, placeholders here ----
export const LAMPS = {
  off: { colour: null, level: 0 },
  seated: { colour: "mint", level: 0.5 },                         // seated, all well (C2, C3, C4b): steady, soft
  taking: { colour: "mint", level: 0.5, breathMs: 1600 },         // C1: a slow breath
  done: { colour: "mint", level: 1, swellMs: 400, then: "seated" }, // the moment of C3: one brighter swell, then seated
  hand: { colour: "amber", level: 0.8 },                          // C4a, C4c: amber only for a real need
};
export const STATION_LAMPS = { off: { colour: null, level: 0 }, seated: { colour: "warm", level: 0.25 } };   // the Station cradle: a dim warm white; no game behaviour yet
// The lamp at t ms after its state began: { colour, level }.
export function lampAt(state, t, table = LAMPS) {
  const L = table[state] || table.off;
  if (L.breathMs) return { colour: L.colour, level: +(L.level * (0.4 + 0.6 * (1 - Math.cos((2 * Math.PI * t) / L.breathMs)) / 2)).toFixed(3) };
  if (L.swellMs) { if (t >= L.swellMs) return lampAt(L.then, t - L.swellMs, table); const base = table[L.then].level; return { colour: L.colour, level: +(base + (L.level - base) * Math.sin((Math.PI * t) / L.swellMs)).toFixed(3) }; }
  return { colour: L.colour, level: L.level };
}

// ---- the refresh scheduler ----
export const TIMING = { partialMs: 800, fullMs: 4000, fullAfter: 5, beatMs: 10000, untouchedMs: 120000, dailyAt: 5, ledgerMs: 600000 };
const dayOf = (now, tz) => new Date(now + tz * 60000).toISOString().slice(0, 10);
const minuteOf = (now, tz) => { const d = new Date(now + tz * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
// push(face, now, { beat }) for every new face (a beat is a seat or a lift), tick(now) on the clock, press(now) for a key. Each returns the panel's next operation or null:
//   { kind: "partial", regions: [names], at, until, face }   the changed regions, drawn 0.8 s on
//   { kind: "full", at, until, face, why }                    the whole panel, black, white, then the picture, over 4 s
// One partial per change; a face that changes nothing draws nothing; while the panel is busy the newest face waits and goes as one partial when it is free.
// A change only to the ledger waits until 10 min after the last ledger partial (the supply batch). A full is due after 5 partials and once a day at 00:05; it runs
// at the first quiet moment (10 s after the last beat, 2 min after the last key press), never sooner. Every full resets the count.
export function createScheduler(opts = {}) {
  const T = { ...TIMING, ...opts }, tz = opts.tz ?? 0;
  const s = { shown: null, pending: null, busyUntil: -Infinity, partials: 0, count: { partial: 0, full: 0 }, lastBeat: -Infinity, lastPress: -Infinity, ledgerAt: -Infinity, dailyDay: null, log: [] };
  const op = (o) => { s.log.push({ kind: o.kind, at: o.at, regions: o.regions, why: o.why, id: o.face.id }); return o; };
  const quiet = (now) => now - s.lastBeat >= T.beatMs && now - s.lastPress >= T.untouchedMs;
  const dailyDue = (now) => s.dailyDay !== dayOf(now, tz) && minuteOf(now, tz) >= T.dailyAt;
  function full(face, now, why) {
    s.shown = face; s.pending = null; s.partials = 0; s.count.full++; s.busyUntil = now + T.fullMs; s.ledgerAt = now;
    if (minuteOf(now, tz) >= T.dailyAt) s.dailyDay = dayOf(now, tz);
    return op({ kind: "full", at: now, until: now + T.fullMs, face, why });
  }
  function draw(face, now) {
    const changed = Object.keys(REGIONS).filter((r) => s.shown.regions[r] !== face.regions[r]);
    if (!changed.length) { s.pending = null; return null; }
    if (changed.length === 1 && changed[0] === "ledger" && now - s.ledgerAt < T.ledgerMs) { s.pending = face; return null; }
    s.shown = face; s.pending = null; s.partials++; s.count.partial++; s.busyUntil = now + T.partialMs; if (changed.includes("ledger")) s.ledgerAt = now;
    return op({ kind: "partial", regions: changed, at: now, until: now + T.partialMs, face });
  }
  return {
    state: s,
    push(face, now, { beat = false } = {}) {
      if (beat) s.lastBeat = now;
      if (face.keep) return null;
      if (!s.shown) return full(face, now, "boot");
      if (now < s.busyUntil) { s.pending = face; return null; }
      return draw(face, now);
    },
    press(now) { s.lastPress = now; },
    tick(now) {
      if (!s.shown || now < s.busyUntil) return null;
      if (s.pending) { const o = draw(s.pending, now); if (o) return o; }
      if ((s.partials >= T.fullAfter || dailyDue(now)) && quiet(now)) return full(s.shown, now, s.partials >= T.fullAfter ? "after " + T.fullAfter + " partials" : "daily");
      return null;
    },
    get counts() { return { ...s.count }; },
  };
}

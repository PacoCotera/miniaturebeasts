// Pods' intents: the rule call behind each ✓ and ← of the inventory and the reading room, the state it moves to and where the ring goes (the pod inventory's design, the read's design). The pad's moves are the
// face's (the focus graph, run in C, over the host's selectors); the keys that reach the host are the intents: ✓ (confirm) on a focused target, ← (back), the room keys, and Compare's ◀ ▶ (step:left, step:right).
//   h.ui.pods: { view: inventory | filter | find | room | trait, sort, chips, word, first, panelPod, from, choosing, ask, flash, spent, done, find, recent, findSeen, ci, trait, cmp, focus, lastCard, roomFrom, firstMove }
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { listOf, trayOf, findOf, compareKin, podsBuild } from "../views/pods-props.mjs";
import { recommendedLane, sealedShut } from "../views/reading-props.mjs";
import { fill } from "../views/words.mjs";
import { openCreate } from "./create.mjs";

export const FLASH_MS = 3000, SCROLL_MS = 200;
const SORTS = ["use", "species", "arrival", "drying"];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const spec = (h) => h.specs.pods;
const pods = (h) => h.ui.pods;
const cardOf = (h, podId) => { const p = pods(h), ids = listOf(h.st, spec(h), p, h.settings).map((e) => e.p.id), k = ids.indexOf(podId); return k >= 0 ? "card." + k : null; };
const podAt = (h, target) => { const k = +String(target).slice(5), e = listOf(h.st, spec(h), pods(h), h.settings)[k]; return e ? e.p : null; };
const flash = (h, text) => { pods(h).flash = { text, until: h.now() + FLASH_MS }; };

// ---- the ways in ----
// The inventory (Where the ring starts): on the card it was on when the player last left, else the first; `opts.first` puts it on the first card (from Choose a pod, sorted by use).
export function openInventory(h, opts = {}) {
  const p = pods(h); p.cmp = null; p.view = "inventory"; p.ask = null; p.choosing = !!opts.choosing; p.from = opts.from ?? (p.choosing ? "room" : "home");
  if (opts.sort) p.sort = opts.sort;
  if (opts.chips) { p.chips = [...opts.chips]; p.word = null; }
  const at = opts.pod ? cardOf(h, opts.pod) : opts.first ? null : p.lastCard ? cardOf(h, p.lastCard) : null;
  p.first = 0; p.focus.set(at ?? (h.st.tray.length ? "card.0" : "sort"));
  h.goto("pods");
}
// The reading screen on the pod on the bench (§2.6, 1): a cut in, the bracket on the recommended lane (the key on an unidentified pod).
export function openRoom(h, from = "home") {
  const p = pods(h), q = S.benchPod(h.st); p.cmp = null; p.view = "room"; p.ask = null; p.roomFrom = from; p.from = from; p.choosing = false;
  enterRead(h, q);
  h.goto("pods");
}
// Home's Research key has two faces (the pods design): the first press opens the bench on its pod, a second turns to the inventory; with nothing on the bench it opens the inventory.
export function researchKey(h) {
  const p = pods(h), here = h.ui.screen === "pods";
  if (here && (p.view === "room" || p.view === "trait")) return backToInventory(h);   // the second face, from anywhere on the reading screen (the detail too): the inventory, the ring on this pod's card
  if (here) return openRoom(h, "home");
  if (S.benchPod(h.st)) return openRoom(h, "home");
  return openInventory(h, { from: "home" });
}
// A pod onto the bench and the room open on it (✓ on a card, "Take to the reading room", "Bring onto the bench"): the old one goes back to its niche, nothing spent.
function toRoom(h, q, from = "inventory") {
  const p = pods(h); S.putOnBench(h.st, q); q.seen = 1; p.lastCard = q.id; h.save();
  p.view = "room"; p.ask = null; p.choosing = false; p.from = "inventory"; p.roomFrom = "inventory"; void from;
  enterRead(h, q);   // a cut in (§2.6, 1)
}
// Leaving the inventory: the husks shown once are gone; the ring's card is kept for the next visit.
function leaveInventory(h) { const p = pods(h); if (S.unshownHusks(h.st).length) { S.husksShown(h.st); h.save(); } const q = p.panelPod; if (q) p.lastCard = q; }

// ---- ✓ and ← ----
export function intent(h, target, verb) {
  const p = pods(h);
  if (p.cmp) return compareIntent(h, target, verb);
  if (p.view === "room" || p.view === "trait") return readIntent(h, target, verb);
  if (p.view === "filter") return trayIntent(h, target, verb);
  if (p.view === "find") return findIntent(h, target, verb);
  return inventoryIntent(h, target, verb);
}
function inventoryIntent(h, target, verb) {
  const p = pods(h), st = h.st;
  if (verb === "back") {
    leaveInventory(h); p.ask = null;
    if (p.choosing) { p.choosing = false; p.view = "room"; enterRead(h, S.benchPod(st)); return; }   // ← back to the reading screen with the same pod, nothing changed
    if (p.from === "create" && h.ui.create) return h.goto("create");
    return h.goto("home");
  }
  if (verb !== "confirm" || !target) return;
  if (target === "sort") { if (!st.tray.length) return h.say(spec(h).strings.inv.nothingToSort); const i = SORTS.indexOf(p.sort ?? "use"); p.sort = SORTS[(i + 1) % SORTS.length]; p.first = 0; return; }   // the list returns to its top and the ring stays on Sort
  if (target === "filter") { if (!st.tray.length) return h.say(spec(h).strings.inv.nothingToFilter); p.view = "filter"; p.focus.set("tchip.0.0"); return; }
  if (target === "find") { if (!st.tray.length) return h.say(spec(h).strings.inv.nothingToFind); p.view = "find"; const f = findOf({ st, ui: p }, spec(h)); p.find = { letter: f.letter }; p.focus.set(f.letters.length ? "letter." + Math.max(0, f.letters.findIndex((l) => l.lit)) : "find"); return; }
  if (target.startsWith("chip.")) {   // ✕ on an active chip removes it
    const i = +target.slice(5), chips = p.chips ?? []; if (i < chips.length) p.chips = chips.filter((_, j) => j !== i); else p.word = null;
    p.first = 0; const n = (p.chips?.length ?? 0) + (p.word ? 1 : 0); p.focus.set(n ? "chip." + Math.min(i, n - 1) : "find"); return;
  }
  if (target.startsWith("card.")) { const q = podAt(h, target); if (!q) return; p.panelPod = q.id; return toRoom(h, q, p.choosing ? "choosing" : "inventory"); }   // ✓ on a card: the reading room at once
  if (target.startsWith("act.")) {
    const q = S.podById(st, p.panelPod); if (!q) return; const i = +target.slice(4);
    if (i === 0) return toRoom(h, q, p.choosing ? "choosing" : "inventory");
    if (i === 1) { const b = S.growBlock(st, q, {}, h.settings, []); if (b) return h.say(b); p.lastCard = q.id; h.ui.createFrom = "inventory"; return openCreate(h, q); }
    if (i === 2) { const r = S.freshen(st, q, h.settings); if (!r.ok) return h.say(r.why); h.play({ kind: "tick", target: "s", ms: 300 }); flash(h, fill(spec(h).strings.inv.freshened, { n: r.cost })); h.save(); return; }
    if (i === 3) { const k = q.idd ? st.tray.find((x) => x !== q && S.canCompare(st, q, x)) : null; if (!k) return; p.cmp = { a: q.id, b: k.id, ci: 0, from: "inventory", card: q.id }; p.focus.set("takeA"); return; }
    if (i === 4) return letGo(h, q, target);
  }
}
// Letting a pod go: it pays nothing; a pod that carries the goal, or the only one of its species, asks once on the button's own face and a second ✓ confirms; any move puts the button back.
function letGo(h, q, target) {
  const p = pods(h), st = h.st, Sg = spec(h).strings.inv;
  if (S.letGoGuard(st, q) && p.ask !== q.id) { p.ask = q.id; return; }
  const list = listOf(st, spec(h), p, h.settings).map((e) => e.p.id), k = list.indexOf(q.id);
  p.ask = null; S.returnPod(st, q); h.save();
  flash(h, q.idd ? fill(Sg.letGone, { Species: S.cap(S.spName(q)) }) : Sg.letGoneSealed);
  const after = listOf(st, spec(h), p, h.settings); if (!after.length) { p.panelPod = null; p.focus.set(st.tray.length ? "chip.0" : "sort"); return; }
  const nk = Math.min(k, after.length - 1); p.panelPod = after[nk].p.id; p.focus.set(target.startsWith("act.") ? "card." + nk : target);   // the card closes up, the ring lands on the next card
}
// The ring moved: a move puts a guard's question back, the panel follows the ring's card, the letter strip redraws on the letter the ring is on.
export function focus(h, target) {
  const p = pods(h); p.focus.set(target);
  if (p.ask && p.ask !== "letThese") p.ask = null; else if (p.ask === "letThese" && target !== "tchip.3.2") p.ask = null;
  if (p.view === "inventory" && target.startsWith("card.")) {
    const q = podAt(h, target); if (q) { p.panelPod = q.id; if (!q.seen) { q.seen = 1; h.save(); } }
    // the 200 ms scroll: when the ring's card moves the first row on screen, the cabinet slides there (a cut with reduced motion: the face ends the event at once)
    const before = p.first ?? 0, v = podsBuild({ st: h.st, settings: h.settings, ui: p, focus: target, now: h.now ? h.now() : 0 }, spec(h));
    if (v.first != null && v.first !== before) { p.first = v.first; if (h.play) h.play({ kind: "wipe", target: "cabinet", ms: SCROLL_MS, from: before, to: v.first, hold: 0 }); }
  }
  if (p.view === "find" && target.startsWith("letter.")) { const f = findOf({ st: h.st, ui: p }, spec(h)), l = f.letters[+target.slice(7)]; if (l) p.find = { letter: l.ch }; }
  if (p.view === "room" && target.startsWith("plate.")) p.plate = +target.slice(6);   // the foot names the plate's trait
}

// ---- the filter tray ----
function trayIntent(h, target, verb) {
  const p = pods(h), st = h.st;
  if (verb === "back") { p.view = "inventory"; p.ask = null; p.first = 0; const n = (p.chips?.length ?? 0) + (p.word ? 1 : 0); p.focus.set(n && !listOf(st, spec(h), p, h.settings).length ? "chip." + (n - 1) : "filter"); return; }   // ← closes the tray in one press and keeps the filter; with no pod matching, the ring on the last chip (the one most likely undone)
  if (verb !== "confirm") return;
  const at = /^tchip\.(\d+)\.(\d+)$/.exec(target ?? ""); if (!at) return;
  const rows = trayOf({ st, settings: h.settings, ui: p }, spec(h)), chip = rows[+at[1]]?.chips[+at[2]]; if (!chip) return;
  if (chip.dim && chip.id !== "letThese") return h.say(spec(h).strings.inv.tray.none);
  if (chip.id === "clear") { p.chips = []; p.word = null; p.first = 0; return; }
  if (chip.id === "freshenThese") { const shown = listOf(st, spec(h), p, h.settings).map((e) => e.p).filter((q) => !S.onBench(st, q)); const r = S.freshenAll(st, shown, h.settings); if (r.ok) { h.play({ kind: "tick", target: "s", ms: 300 }); h.save(); } return; }
  if (chip.id === "letThese") {
    const group = listOf(st, spec(h), p, h.settings).map((e) => e.p).filter((q) => !S.onBench(st, q)); if (!group.length) return h.say(spec(h).strings.inv.tray.none);
    if (p.ask !== "letThese") { p.ask = "letThese"; return; }   // the number first; the second ✓ confirms
    for (const q of group) S.returnPod(st, q); p.ask = null; h.save(); p.view = "inventory"; p.chips = []; p.word = null; p.first = 0; p.focus.set(st.tray.length ? "card.0" : "sort"); return;
  }
  const chips = p.chips ?? []; p.chips = chips.includes(chip.id) ? chips.filter((c) => c !== chip.id) : [...chips, chip.id]; p.first = 0;   // ✓ toggles a chip; the cards under the tray re-sort at once
}
// ---- Find ----
function findIntent(h, target, verb) {
  const p = pods(h), st = h.st;
  if (verb === "back") { p.view = "inventory"; p.focus.set("find"); return; }   // ← closes the panel with nothing changed
  if (verb !== "confirm" || !target) return;
  const f = findOf({ st, ui: p }, spec(h));
  const pick = (w) => { p.word = { word: w.word, kind: w.kind }; p.recent = [w, ...(p.recent ?? []).filter((r) => !(r.word === w.word && r.kind === w.kind))].slice(0, 4); p.findSeen = true; p.view = "inventory"; p.first = 0; p.focus.set("chip." + (p.chips?.length ?? 0)); };
  if (target.startsWith("recent.")) { const r = f.recentKeys[+target.slice(7)]; if (r) pick(r); return; }
  if (target.startsWith("letter.")) { const l = f.letters[+target.slice(7)]; if (l) { p.find = { letter: l.ch }; if (f.words.length) p.focus.set("word.0"); } return; }
  if (target.startsWith("word.")) { const w = f.words[+target.slice(5)]; if (w) pick(w); }
}

// ---- the reading screen (the reading screen spec §2.6, §2.7) ----
export const READ_MS = 800, PLACE_MS = 200, NUDGE_MS = 120, SHAKE_MS = 120, MOMENT_MS = 1150, FOLD_MS = 300, MOMENT_DELAY = 400;
const motionOn = (h) => (h.motion ? h.motion() : true);
// the chamber's picture as the screen shows it now (the 200 ms dither's source when the place moves)
const chamberNow = (h) => { const v = podsBuild({ st: h.st, settings: h.settings, ui: pods(h), focus: pods(h).focus.cur, now: h.now() }, spec(h)); return v.read?.chamber ?? null; };
function moveTo(h, change) {   // a change of the pod level that may move the specimen: the dither from the old picture to the new
  const p = pods(h), before = chamberNow(h); change(); const after = chamberNow(h);
  if (before && after && before !== after && motionOn(h)) { p.fromChamber = before; h.play({ kind: "dither", target: "chamber", from: before, ms: PLACE_MS, hold: 0 }); h.at(PLACE_MS, () => { if (p.fromChamber === before) p.fromChamber = null; }); }
}
function enterRead(h, q) { const p = pods(h); p.at = "rail"; p.trait = 0; p.plate = 0; p.reading = null; p.moment = null; p.fromChamber = null; p.nudge = null; p.lane = q && q.idd ? recommendedLane(h.st, q, h.settings) : 0; p.focus.set(q && !q.idd ? "key" : "rail"); }
function backToInventory(h) {   // ← on the pod level, or the Research key's second face: the inventory, the ring on this pod's card (its mini rail shows what was just read)
  const p = pods(h), q = S.benchPod(h.st); p.view = "inventory"; p.at = "rail"; p.reading = null; p.moment = null; p.choosing = false; p.from = "home"; p.first = 0;
  const at = q ? cardOf(h, q.id) : null; p.focus.set(at ?? (h.st.tray.length ? "card.0" : "sort")); if (q) { p.panelPod = q.id; p.lastCard = q.id; }
}
function endRead(h) { const p = pods(h); if (!p.reading) return; const r = p.reading; p.reading = null; p.at = "right"; p.plate = 0; p.focus.set("plate.0"); if (r.moment) h.at(motionOn(h) ? MOMENT_DELAY : 0, () => startMoment(h, r.pod, r.chapter)); }
function startMoment(h, podId, chapter) {   // the stamp's one-time moment, 400 ms after the first read ever ends: held until any key, the save marks it taught
  const p = pods(h), q = S.benchPod(h.st); if (!q || q.id !== podId || h.st.stampTaught) return;
  h.st.stampTaught = true; h.save(); p.moment = { pod: podId, chapter }; p.focus.set("hold"); h.play({ kind: "moment", target: "stamp", ms: MOMENT_MS, hold: 0 });
}
function foldStamp(h, target) {   // the moment or the view folds back (the moment in 300 ms, the view at double speed); the key that does it is used up
  const p = pods(h); const was = p.moment ? "moment" : "view"; p.folding = { until: h.now() + (was === "moment" ? FOLD_MS : FOLD_MS / 2), was }; p.moment = null; p.at = was === "moment" ? "right" : "rail";
  h.play({ kind: "moment", target: was === "moment" ? "fold" : "unview", ms: was === "moment" ? FOLD_MS : FOLD_MS / 2, hold: 0 }); h.at(was === "moment" ? FOLD_MS : FOLD_MS / 2, () => { p.folding = null; });
  p.focus.set(was === "moment" ? "plate.0" : "rail"); void target;
}
function readIntent(h, target, verb) {
  const p = pods(h), st = h.st, q = S.benchPod(st);
  if (!q) { if (verb === "back") backToInventory(h); return; }
  if (p.reading) { endRead(h); return; }   // any key during the read cuts to its end and does nothing else (the face cut the event)
  if (p.moment) { foldStamp(h, target); return; }   // the moment holds until any key; that key is used up
  if (!q.idd) {   // an unidentified pod: Identify on the key, then the pod's rail
    if (verb === "back") return backToInventory(h);
    if (verb === "confirm" && target === "key") { const r = S.identify(st, q, h.settings); if (!r.ok) { h.play({ kind: "wipe", target: "keyShake", ms: SHAKE_MS, hold: 0 }); return; } h.save(); enterRead(h, q); }
    return;
  }
  const chs = frameOf(S.speciesOf(q)).chapters, k = clamp(p.lane ?? 0, 0, chs.length - 1), ch = chs[k], sealed = sealedShut(ch, h.settings) && !q.read.includes(ch.id), isRead = q.read.includes(ch.id);
  const at = p.at ?? "rail";
  if (at === "stamp") { if (verb === "back" || verb === "confirm" || verb === "step:down") foldStamp(h, target); return; }
  if (at === "detail") {
    if (verb === "back") return moveTo(h, () => { p.at = "right"; p.plate = p.trait ?? 0; p.focus.set("plate." + p.plate); });   // B up: the pod level, the ring on the trait's plate
    if (verb === "step:up" || verb === "step:down") { p.trait = clamp((p.trait ?? 0) + (verb === "step:down" ? 1 : -1), 0, ch.traits.length - 1); }   // the chapter's next trait (both cut)
    return;
  }
  if (at === "right") {
    if (verb === "back") return backToInventory(h);
    if (verb === "step:left") return moveTo(h, () => { p.at = "rail"; p.focus.set("rail"); });   // ◀ back to the rail, the specimen back to the overview
    if (verb !== "confirm") return;
    if (target === "key") return readChapter(h, q, ch);
    if (target && target.startsWith("plate.")) return moveTo(h, () => { p.trait = +target.slice(6); p.at = "detail"; p.focus.set("trait"); });   // the detail
    return;
  }
  // the rail
  if (verb === "back") return backToInventory(h);
  if (verb === "step:left" || verb === "step:right") {   // the bracket moves one lane, no wrap; at an end it nudges 2 px (the stop)
    const d = verb === "step:right" ? 1 : -1, n = k + d;
    if (n < 0 || n >= chs.length) { p.nudge = { dir: d, until: h.now() + NUDGE_MS }; h.play({ kind: "wipe", target: "nudge", ms: NUDGE_MS, hold: 0 }); return; }
    p.lane = n; p.trait = 0; return;   // the part, the right frame and the foot cut to the new chapter on the same frame
  }
  if (verb === "step:up") { if (!st.stampTaught) return; p.at = "stamp"; p.focus.set("stamp"); h.play({ kind: "moment", target: "view", ms: Math.round(MOMENT_MS / 2), hold: 0 }); return; }   // ▲ shows the stamp, once taught
  if (verb !== "confirm" || sealed) return;   // a sealed lane gives no ✓: nothing happens
  moveTo(h, () => { p.at = "right"; p.plate = 0; p.focus.set(isRead ? "plate.0" : "key"); });   // the chapter opens: the ring crosses to the right frame (Face dithers to the close place)
}
// The read, one press (§2.6, 4): ◆ ticks down on the press frame, the key shows pressed, the lamp lights; the sweep, the tag fill and the discs run 0 to 600 ms and end by 800. Not enough Data: the key shakes, nothing spent.
function readChapter(h, q, ch) {
  const p = pods(h), before = q.read.slice(), first = !h.st.readEver, r = S.read(h.st, q, ch.id, h.settings);
  if (!r.ok) { if (!r.again) h.play({ kind: "wipe", target: "keyShake", ms: SHAKE_MS, hold: 0 }); return; }
  if (r.cost) h.play({ kind: "tick", target: "d", ms: 300 });
  h.save(); p.plate = 0;
  if (!motionOn(h)) { p.at = "right"; p.focus.set("plate.0"); if (first && !h.st.stampTaught) startMoment(h, q.id, ch.id); return; }   // with reduced motion the read is a cut
  p.reading = { pod: q.id, chapter: ch.id, read: before, until: h.now() + READ_MS, reward: r.reward ?? 0, cost: r.cost, moment: first && !h.st.stampTaught };
  p.focus.set("hold"); h.play({ kind: "read", target: "read", ms: READ_MS, hold: 0, cut: true }); h.at(READ_MS, () => { if (p.reading && p.reading.pod === q.id) endRead(h); });
}

// ---- Compare ----
function compareIntent(h, target, verb) {
  const p = pods(h);
  if (verb === "back") {   // ← closes it in one press, the ring back on what opened it
    const c = p.cmp; p.cmp = null;
    if (c.from === "room") { p.view = "room"; enterRead(h, S.benchPod(h.st)); return; }
    p.view = "inventory"; p.focus.set(cardOf(h, c.card ?? c.a) ?? "card.0"); p.focus.set(p.focus.cur); p.panelPod = c.card ?? c.a; p.focus.set(cardOf(h, c.card ?? c.a) ?? "card.0"); return;
  }
  if (verb === "step:up" || verb === "step:down") {   // ▲▼: the chapter on both papers, never past the ends
    const n = frameOf(S.speciesOf(S.podById(h.st, p.cmp.a))).chapters.length, d = verb === "step:down" ? 1 : -1, to = p.cmp.ci + d;
    if (to < 0 || to >= n) { p.cmp.nudge = { dir: d, until: h.now() + NUDGE_MS }; h.play({ kind: "wipe", target: "nudge", ms: NUDGE_MS, hold: 0 }); return; }   // at the first or last chapter both brackets nudge 2 px with the stop tick (▲ left, ▼ right), as the reading rail's
    p.cmp.ci = to; return;
  }
  if (verb === "step:right" && target === "takeB") {   // ▶ on the right-hand paper: the next kin of the species, round them
    const a = S.podById(h.st, p.cmp.a), kin = compareKin(h.st, a); if (kin.length < 2) return;
    p.cmp.b = kin[(kin.findIndex((q) => q.id === p.cmp.b) + 1) % kin.length].id; return;
  }
  if (verb === "confirm" && (target === "takeA" || target === "takeB")) {   // Take to the reading room: that pod onto the bench, the room open on it
    const c = p.cmp, q = S.podById(h.st, target === "takeA" ? c.a : c.b); if (!q) return; p.cmp = null; toRoom(h, q, c.from === "room" ? "choosing" : "inventory");
  }
}

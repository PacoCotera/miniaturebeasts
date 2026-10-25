// One mibi up close, the Vivarium's closest level (the habitat identifier stays; habitat.json): ✓ on the resident, the name, the species word, the story's origin lines (See the family), a chapter plate, the Companion, Portrait, Cross, Wild or a tile. The events are the spec's
// (events.moment, read, release, back): no constant of time lives here. ✓ on Wild opens the Return panel (`returnNow` is its Return card). The meet's first ✓ opens the namer (intents/namer.mjs).
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { habitatShown, watchFrame } from "../trickle.mjs";
import { openNamer } from "./namer.mjs";
import { openSpecies, openFamily } from "./library.mjs";
import { openPanel } from "./panel.mjs";
import { doorOpen } from "../nav.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
// The mibi up close: the chosen one, else the first the Companion does not carry, else the first.
export const shown = (h) => habitatShown(h.st, h.sv, h.ui.hab.id);
// The event of the spec, as the host plays it: reduced motion sends hold 0 (the key's own frame runs what follows).
const play = (h, name, over = {}) => { const e = h.specs.habitat.events[name], hold = h.motion() ? e.hold : 0; h.play({ kind: e.kind, target: e.target, ms: e.ms, hold, ...(e.cut ? { cut: true } : {}), ...(e.levels ? { levels: e.levels } : {}), ...over }); };
// A pick of the Cross screen: the first partner not out with the Companion while it is away.
export function openCross(h, a) { h.ui.cross = { aId: a.id, bId: null, state: 0, fc: null, clash: [] }; const p = S.crossPartners(h.st, h.sv, a, h.settings).find((x) => !x.away); if (p) h.ui.cross.bId = p.id; h.goto("cross"); }
// The mibi's chapter ids in ring order: the plate a target names.
const chapterAt = (m, target) => frameOf(S.speciesOf(m))?.chapters[+target.slice(6)];
// A way into one mibi up close (the whole's resident or tile, the hatch, Home's ✓ Meet): the first draw after a refusal at the dock says it once (events.refused).
export function enter(h, o = {}) {
  const sh = shown(h); if (sh && h.ui.meet != null && String(h.ui.meet) === String(sh.id)) play(h, "moment", { hold: o.meetHold ?? 0 });   // the meet plays its moment once (habitat.json events.meet); input is not held, but after the hatch's cutting key 300 ms (events.meet)
  const r = S.seenCarryRefusal(h.st, h.sv); if (!r) return;
  const m = S.mibiById(h.st, r.id); if (m) { h.say(fill(h.specs.habitat.strings.carryRefused, { name: m.name })); h.save(); }
}
// The meet is over at the first press (a cut); the focus message and the intent both end it.
export function endMeet(h) { if (h.ui.meet != null) { h.ui.meet = null; return true; } return false; }

// `target`: resident | name | species | plate.<i> | door | portrait | cross | wild | tile.<mibi id>.
export function intent(h, target, verb) {
  const a = h.ui.hab, m = shown(h);
  if (!m) { if (verb === "back") h.goto("vivarium"); return; }
  if (verb === "back") {   // the Vivarium's whole, the ring on this mibi's resident (its tile while it is out); the dither is held 180 ms
    if (a.id == null) a.id = m.id; endMeet(h); const e = h.specs.habitat.events.back; h.goto("vivarium", h.motion() ? e.hold : 0); return;
  }
  if (verb !== "confirm") return;
  const meet = h.ui.meet != null && String(h.ui.meet) === String(m.id); endMeet(h);
  a.f = target;
  if (target === "resident" || target.startsWith("tile.")) {
    if (meet) { openNamer(h, m, "meet"); return; }
    if (h.ui.hab.asleep) { const e = h.specs.habitat.events.moment, a = e.asleep; h.play({ kind: e.kind, target: e.target, ms: a.ms, hold: h.motion() ? a.hold : 0, ...(a.cut ? { cut: true } : {}) }); }   // a sleeper's Greet (Station M1 §2.4): wake, the hops, curl again
    else play(h, "moment");   // Greet: the species' moment (its moving set's hops, or the placeholder's two until a set lands); nothing rewarded, nothing said
  }
  else if (target === "name") openNamer(h, m, "rename");
  else if (target === "species") openSpecies(h, S.speciesOf(m));   // ✓ Open the guide (frame.json navigation.jumps): the Library's Level 2 of this species
  else if (target === "family") openFamily(h, m.id);   // ✓ See the family (frame.json navigation.jumps): Level 3 of its species, close on this mibi
  else if (target.startsWith("plate.")) {
    const ch = chapterAt(m, target); if (!ch) return;
    const r = S.readMibi(h.st, m, ch.id, h.settings);
    if (r.ok) { play(h, "read", { target }); h.save(); }
  }
  else if (target === "door") {   // ✓ takes the resident with you or brings it home, whichever the set as it will be offers; a request for it already waits: nothing
    if (S.pendingCarry(h.st, h.sv).some((r) => r.id === m.id)) return;
    const bring = S.projectCarried(h.st, h.sv).includes(m.id), r = bring ? S.carryHome(h.st, h.sv, m) : S.carryAdd(h.st, h.sv, m);
    if (r.ok) h.save(); else if (r.why === "full") h.say(fill(h.specs.habitat.strings.carryRefused, { name: m.name }));
  }
  else if (target === "portrait") { if (doorOpen("sitting") && !S.isAway(h.st, h.sv, m) && (m.portrait || h.st.sitting) && h.enterSitting) h.enterSitting(m, { state: m.portrait ? "portrait" : "pose", from: "habitat" }); }   // the sitting (its door shut until the screen is listed in nav.mjs BUILT): Portray opens the pose step; portrayed, the portrait, only while its picture is held (host.mjs enterSitting)
  else if (target === "cross") {
    if (!doorOpen("cross") || !S.isAdult(h.st, m, h.settings) || S.isAway(h.st, h.sv, m)) return;
    if (S.crossPartners(h.st, h.sv, m, h.settings).some((p) => !p.away)) openCross(h, m);   // only partners at home can be picked
  }
  else if (target === "wild") {
    if (S.returnMibiBlock(h.st, h.sv, m)) return;   // the block is the Wild module's context (bottomLine.wild.blocked): the intent says nothing
    openPanel(h, "habitat", "wildMibi");   // ✓ opens the Return panel (decision panel spec §1.6); its Return card runs returnNow
  }
}
// The Return card's act: the rule gives the mibi back to the wild (+2 Essence), the plate says where, and the resident dithers out to the next housed mibi in bay order, or the whole shows empty.
export function returnNow(h) {
  const a = h.ui.hab, m = shown(h); if (!m) return;
  const r = S.returnMibi(h.st, h.sv, m, h.settings);
  if (!r.ok) return;
  h.save(); const next = S.housed(h.st).sort((x, y) => x.bay - y.bay)[0] ?? null, ev = h.specs.habitat.events.release;
  h.say(fill(h.specs.habitat.strings.releasePlate, { name: m.name, place: S.PLACE_WORD[m.from?.g] || "wild" }));
  if (next) { a.id = next.id; a.f = S.isAway(h.st, h.sv, next) ? "name" : "resident"; play(h, "release"); }
  else { a.id = null; h.goto("vivarium", h.motion() ? ev.hold : 0); }
}
// What the watch says (events: a host rule, not an event): the shown mibi is watched while this level shows and the face is awake; the first habit it has not been seen doing is recorded at 60 s, once a mibi a day, with the Data trickle and the plate.
export function watch(h, dt) {
  const m = shown(h), d0 = h.st.d;
  const w = watchFrame({ st: h.st, sv: h.sv, settings: h.settings, screen: h.ui.screen, idle: h.ui.idle, habId: h.ui.hab.id, dt, now: h.now() });
  if (!w || !m) return null;
  const habit = w.habit ? h.specs.habitat.strings.watchHabits[w.habit] : null;   // a habit with no words shows no plate (it is still recorded, the tick counts)
  if (habit) h.say(fill(h.specs.habitat.strings.watchPlate, { name: m.name, habit }));
  if (w.earned || w.habit || h.st.d !== d0) h.save();
  return w;
}

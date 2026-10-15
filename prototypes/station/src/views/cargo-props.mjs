// The Cargo props (lvgl-switch.md §2.1, §4 L2.2; cargo.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Cargo words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags and which crate and pod goes to which well; no rectangle, no measure, no layout rule, no colour (the words place everything from cargo.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need }.
// Runs in Node, tested there (tests/cargo-props.test.mjs); the shape is cargo.props.json.
//   m: { st, sv, settings, docked, ui: { cargo: { state, crate, at, run }, meet }, spec cargo.json, home home.json, frame frame.json }
//   ui.cargo.run is what ✓ Open the bay made when it opened the crates (intents/cargo.mjs `openRun`): the crates in the order they opened, each with its ribbon key, its pods and the well each went to, and the report.
import * as S from "../state.mjs";
import { wordsOf } from "./home-props.mjs";
import { shellSpecies } from "./pods-props.mjs";

const SPELL = ["no", "one", "two", "three", "four", "five", "six"];
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The reach of a crate's walk in the words of the spec (strings.report.reach): thirds of the land, "all" when the whole of it; a crate with no map says nothing.
export const reachWord = (spec, c) => { const band = S.reachBand(c); return band ? spec.strings.report.reach[band] : ""; };
// A crate's ribbon: a developer crate reads like any later crate and is not counted; the ordinal counts walk crates only (first, second, third; a walk crate past the third, never from play, reads later). `walk`: the crate's place among the walk crates opened, from 0.
export const ribbonOf = (spec, c, walk) => (c.dev ? spec.strings.ribbon.later : [spec.strings.ribbon.first, spec.strings.ribbon.second, spec.strings.ribbon.third][walk] ?? spec.strings.ribbon.later);
// A report row's lead, by the same ordinal: First, Second, Third crate, Another crate (a developer crate is uncounted: Another crate).
export const leadOf = (spec, c, walk) => (c.dev ? spec.strings.report.laterCrate : spec.strings.report.crate[walk] ?? spec.strings.report.laterCrate);
// The crates ready to open in the bay: the walk crates while docked, at most the bay's three shown.
export const walkCrates = (st, sv, docked) => (docked ? S.bayCrates(st, sv) : []);

export function cargoBuild(m, spec, home, frame) {
  const { st, sv, settings } = m, c = m.ui.cargo, requests = [], req = (r) => { requests.push(r); return r.id; };
  const R = spec.regions, docked = !!m.docked, state = c.state;
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (cargo.json placeholders)" });
  // a painted piece of the bay: the master at exactly its size, else an empty slot that draws nothing (a missing master is a labelled placeholder in the register, never code-drawn art)
  const slot = (id, size, until) => req({ kind: "slot", id, master: id, size, until: until || "its master (cargo.json placeholders)" });
  const podSize = R.rack.pod.size, anyPod = (id) => S.podById(st, id) ?? st.waiting.find((q) => q.id === id);
  const podPic = (q) => { const sp = shellSpecies(st, q); return req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${podSize.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size: podSize }); };

  // the rack: the six wells, as Pods' collection: its pod or an empty well; `from` names the crate and the place in its order that brought a pod this opening, so the face lands it at its time
  const slots = R.rack.wells.slots, rack = Math.min(S.rackSize(settings), slots), run = c.run;
  const fromOf = (q) => { if (!run) return null; for (let k = 0; k < run.crates.length; k++) { const j = run.crates[k].pods.findIndex((p) => p.id === q.id); if (j >= 0) return { crate: k, order: j }; } return null; };
  const wells = Array.from({ length: slots }, (_, i) => {
    const q = i < rack ? st.tray[i] : null;
    return { pod: q ? podPic(q) : "", from: q ? fromOf(q) : null };
  });
  const regions = { rack: { insert: slot(R.rack.slice, R.rack.rect.slice(2)), wells } };

  // the bay (R1, R2): the signed painting in every state; its door goes over it when the bay holds nothing, and always in the report. The bay holds a walk crate while docked, or a pod waiting for a well, docked or away
  const crates = state === "bay" ? walkCrates(st, sv, docked).slice(0, R.crates.max) : [];
  const holds = state === "opening" || (state === "bay" && (crates.length > 0 || st.waiting.length > 0)), shut = !holds;
  regions.bay = { state: shut ? "shut" : "open", open: slot(R.bay.slices.open, R.bay.rect.slice(2), "the signed bay (cargo.json bay)"), door: shut ? slot(R.bay.slices.shut, R.bay.door.slice(2), "the signed bay door (cargo.json bay)") : "" };
  if (state === "bay") {
    regions.crates = { places: crates.map(() => ph(`crate-sealed-${R.crates.crate.join("x")}`, R.crates.crate)), shadow: slot(R.crates.shadow.slice, R.crates.shadow.size) };
    if (st.waiting.length) regions.waitingPods = { pods: st.waiting.slice(0, R.waitingPods.max).map(podPic), shadow: slot(R.waitingPods.shadow.slice, R.waitingPods.shadow.size) };   // the pods themselves on the floor, oldest first; the context counts all
  }
  if (state === "opening") {
    const slice = (name) => ph(`crate-${name}-${R.crate.rect[2]}x${R.crate.rect[3]}`, R.crate.rect.slice(2));
    regions.opening = {
      crate: c.crate, at: c.at,
      crates: run.crates.map((k) => ({ ribbon: k.ribbon, sealed: slice("sealed"), opening: slice("opening"), open: slice("open"), shadow: slot(R.crate.shadow.slice, R.crate.shadow.rect.slice(2)), storeShadow: slot(R.stores.shadow.slice, R.stores.shadow.size), stores: ["energy", "data", "essence"].filter((m, i) => k.gained["eds"[i]] > 0).map((m) => ph(`cargo-${m}-${R.stores.size.join("x")}`, R.stores.size)), pods: k.pods.map((p) => ({ picture: podPic(anyPod(p.id)), well: p.well })) })),
    };
  }
  if (state === "report") regions.report = reportOf(run.report, spec, ph, slot);

  // the line: the action, the subject, the notice and the way back of the state (cargo.json line)
  const Sg = spec.strings, spelled = (n) => SPELL[n] ?? "many";
  let line, need = null;
  const afterCrates = S.needKey(st, sv, settings, m.ui, true), wordsAfter = afterCrates && { ...afterCrates, module: home.strings.needs[afterCrates.key].module };
  const notice = wordsOf(wordsAfter, home).notice;
  if (state === "opening") line = { ok: null, back: null, subject: Sg.subjects.opening, need: "" };
  else if (state === "report") line = { ok: run.report.newPods ? (run.report.newPods === 1 ? Sg.newPods.one : Sg.newPods.few) : Sg.done, back: "Cargo", subject: Sg.subjects.report, need: "" };
  else if (crates.length) { const all = walkCrates(st, sv, docked).length, n = c.drawn == null ? all : Math.min(c.drawn, all); line = { ok: Sg.open, back: "Home", subject: n === 1 ? Sg.subjects.cratesOne : fill(Sg.subjects.crates, { count: spelled(n) }), need: notice }; }
  else if (st.waiting.length) { const w = st.waiting.length; line = { ok: null, back: "Home", subject: w === 1 ? Sg.subjects.waitingOne : fill(Sg.subjects.waiting, { count: spelled(w) }), need: notice }; }   // before the away line: the open bay shows the waiting pods (cargo.json line.bay.order)
  else if (!docked) line = { ok: null, back: "Home", subject: Sg.subjects.away, need: notice };
  else line = { ok: null, back: "Home", subject: Sg.subjects.empty, need: notice };

  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests, need };
}

// The report card's rows as the face sets them, from what the opening made (c.run.report, in words): the heading, one row a crate, what was gathered, the Probe, and the world's turn.
// The card never passes maxHeight (cargo.json regions.report.height): when the goal rows would take it past, the world lines drop from the last until it fits.
function trimWorld(rp, spec) {
  if (!rp.world) return null; const R = spec.regions.report, rowH = R.rows.h, goal = rp.goal ? R.goal.gapAbove + rowH * (1 + (rp.meanwhile ? 1 : 0)) : 0;
  const base = R.rows.first + R.gathered.gapAbove + rowH + R.pad, fixed = base + rowH * (rp.crates.length + (rp.probe ? 1 : 0)) + goal;
  let n = rp.world.lines.length; while (n > 0 && fixed + R.world.gapAbove + rowH + rowH * n > R.maxHeight) n--;
  return n ? { lead: rp.world.lead, lines: rp.world.lines.slice(0, n) } : null;
}
// The plate's height (cargo.json regions.report.height): a multiple of 8, from 128 to 288, so the signed plate of that exact height is the one drawn. The face computes the same from the props it is given.
export function reportHeight(rp, world, spec) {
  const R = spec.regions.report, rowH = R.rows.h, goal = rp.goal ? R.goal.gapAbove + rowH * (1 + (rp.meanwhile ? 1 : 0)) : 0;
  return R.rows.first + R.gathered.gapAbove + rowH + R.pad + rowH * (rp.crates.length + (rp.probe ? 1 : 0)) + (world ? R.world.gapAbove + rowH + rowH * world.lines.length : 0) + goal;
}
function reportOf(rp, spec, ph, slot) {
  const S1 = spec.regions.report, icon = S1.crates.podIcon, world = trimWorld(rp, spec), h = Math.min(reportHeight(rp, world, spec), S1.maxHeight);
  const podIcon = ph(`icon-pod-${icon}`, [icon, icon]), shieldIcon = ph(`icon-shield-${S1.probe.plateIcon}`, [S1.probe.plateIcon, S1.probe.plateIcon]);
  return {
    plate: slot(S1.slice.replace("{h}", h), [S1.rect[2], h], "the signed report plate of this height (cargo.json report)"), heading: rp.heading, podIcon, shieldIcon,
    crates: rp.crates.map((r) => ({ lead: r.lead, pods: r.pods, text: r.text, reach: r.reach })),
    gathered: rp.gathered, probe: rp.probe, world,
    goal: rp.goal ? { lead: spec.strings.report.goal.lead, ...rp.goal } : null, meanwhile: rp.goal && rp.meanwhile ? { lead: spec.strings.report.goal.meanwhileLead, ...rp.meanwhile } : null,
  };
}

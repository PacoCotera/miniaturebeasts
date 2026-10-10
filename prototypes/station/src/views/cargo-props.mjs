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
export const reachWord = (spec, c) => {
  const of = c.of | 0, x = c.explored | 0; if (of <= 0) return "";
  const W = spec.strings.report.reach;
  return x * 3 < of ? W.underThird : x * 3 < 2 * of ? W.underTwoThirds : x < of ? W.underAll : W.all;
};
// A crate's ribbon: every dev crate reads dev; the ordinal counts walk crates only (first, second, third; a walk crate past the third, never from play, reads later). `walk`: the crate's place among the walk crates opened, from 0.
export const ribbonOf = (spec, c, walk) => (c.dev ? spec.strings.ribbon.dev : [spec.strings.ribbon.first, spec.strings.ribbon.second, spec.strings.ribbon.third][walk] ?? spec.strings.ribbon.later);
// A report row's lead, by the same ordinal: Developer crate, First, Second, Third crate, Another crate.
export const leadOf = (spec, c, walk) => (c.dev ? spec.strings.report.devCrate : spec.strings.report.crate[walk] ?? spec.strings.report.laterCrate);
// The crates ready to open in the bay: the walk crates while docked, at most the bay's three shown.
export const walkCrates = (st, sv, docked) => (docked ? S.bayCrates(st, sv) : []);

export function cargoBuild(m, spec, home, frame) {
  const { st, sv, settings } = m, c = m.ui.cargo, requests = [], req = (r) => { requests.push(r); return r.id; };
  const R = spec.regions, docked = !!m.docked, state = c.state;
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (cargo.json placeholders)" });
  const podSize = R.rack.pod.size, anyPod = (id) => S.podById(st, id) ?? st.waiting.find((q) => q.id === id);
  const podPic = (q) => { const sp = shellSpecies(st, q); return req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${podSize.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size: podSize }); };

  // the rack: the six wells, as Pods' collection: its pod or an empty well; `from` names the crate and the place in its order that brought a pod this opening, so the face lands it at its time
  const slots = R.rack.wells.slots, rack = Math.min(settings.rack || S.RACK, slots), run = c.run;
  const wellPic = ph(`cargo-well-${R.rack.wells.first[2]}x${R.rack.wells.first[3]}`, R.rack.wells.first.slice(2), true);
  const fromOf = (q) => { if (!run) return null; for (let k = 0; k < run.crates.length; k++) { const j = run.crates[k].pods.findIndex((p) => p.id === q.id); if (j >= 0) return { crate: k, order: j }; } return null; };
  const wells = Array.from({ length: slots }, (_, i) => {
    const q = i < rack ? st.tray[i] : null;
    return { well: wellPic, pod: q ? podPic(q) : "", from: q ? fromOf(q) : null };
  });
  const regions = { rack: { wells } };
  const waiting = st.waiting.length ? req({ kind: "waiting", id: "waiting:24" }) : "";

  if (state === "bay" || state === "report") {
    regions.bay = { state: docked ? "open" : "shut", lid: docked ? "" : ph(`cargo-bay-shut-${R.bay.inside[2]}x${R.bay.inside[3]}`, R.bay.inside.slice(2)) };
    regions.waiting = waiting;
  }
  const crates = state === "bay" ? walkCrates(st, sv, docked).slice(0, R.crates.max) : [];
  if (state === "bay") regions.crates = { places: crates.map(() => ph(`crate-sealed-${R.crates.crate.join("x")}`, R.crates.crate)) };
  if (state === "opening") {
    const slice = (name) => ph(`crate-${name}-${R.crate.rect[2]}x${R.crate.rect[3]}`, R.crate.rect.slice(2));
    regions.opening = {
      crate: c.crate, at: c.at,
      crates: run.crates.map((k) => ({ ribbon: k.ribbon, sealed: slice("sealed"), opening: slice("opening"), open: slice("open"), pods: k.pods.map((p) => ({ picture: podPic(anyPod(p.id)), well: p.well })) })),
    };
  }
  if (state === "report") regions.report = reportOf(run.report, spec, ph);

  // the line: the action, the subject, the notice and the way back of the state (cargo.json line)
  const Sg = spec.strings, spelled = (n) => SPELL[n] ?? "many";
  let line, need = null;
  const afterCrates = S.needKey(st, sv, settings, m.ui, true), wordsAfter = afterCrates && { ...afterCrates, module: home.strings.needs[afterCrates.key].module };
  const notice = wordsOf(wordsAfter, home).notice;
  if (state === "opening") line = { ok: null, back: null, subject: Sg.subjects.opening, need: "" };
  else if (state === "report") line = { ok: run.report.newPods ? (run.report.newPods === 1 ? Sg.newPods.one : Sg.newPods.few) : Sg.done, back: "Cargo", subject: Sg.subjects.report, need: "" };
  else if (crates.length) { const n = walkCrates(st, sv, docked).length; line = { ok: Sg.open, back: "Home", subject: n === 1 ? Sg.subjects.cratesOne : fill(Sg.subjects.crates, { count: spelled(n) }), need: notice }; }
  else if (!docked) line = { ok: null, back: "Home", subject: Sg.subjects.away, need: notice };
  else if (st.waiting.length) { const w = st.waiting.length; line = { ok: null, back: "Home", subject: w === 1 ? Sg.subjects.waitingOne : fill(Sg.subjects.waiting, { count: spelled(w) }), need: notice }; }
  else line = { ok: null, back: "Home", subject: Sg.subjects.empty, need: notice };

  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests, need };
}

// The report card's rows as the face sets them, from what the opening made (c.run.report, in words): the heading, one row a crate, what was gathered, the Probe, and the world's turn.
function reportOf(rp, spec, ph) {
  const S1 = spec.regions.report, icon = S1.crates.podIcon;
  const podIcon = ph(`icon-pod-${icon}`, [icon, icon]), shieldIcon = ph(`icon-shield-${S1.probe.plateIcon}`, [S1.probe.plateIcon, S1.probe.plateIcon]);
  return {
    heading: rp.heading, podIcon, shieldIcon,
    crates: rp.crates.map((r) => ({ lead: r.lead, pods: r.pods, text: r.text, reach: r.reach })),
    gathered: rp.gathered, probe: rp.probe, world: rp.world,
  };
}

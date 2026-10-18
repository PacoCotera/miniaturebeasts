// The Cargo props (lvgl-switch.md §2.1, §4 L2.2; cargo.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Cargo words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags and which crate and pod goes to which well; no rectangle, no measure, no layout rule, no colour (the words place everything from cargo.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need }.
// Runs in Node, tested there (tests/cargo-props.test.mjs); the shape is cargo.props.json.
//   m: { st, sv, settings, docked, ui: { cargo: { state, crate, at, run, drawn }, meet }, spec cargo.json, home home.json, frame frame.json }
//   ui.cargo.run is what ✓ Open the bay made when it opened the crates (intents/cargo.mjs `openRun`): the crates in the order they opened, each with its ribbon key, its pods and the well each went to, and the report.
import * as S from "../state.mjs";
import { wordsOf, mibiReq } from "./home-props.mjs";
import { shellSpecies } from "./pods-props.mjs";

const SPELL = ["no", "one", "two", "three", "four", "five", "six"];
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

// The reach of a crate's walk as a step 0 to 4 (cargo.json regions.report.crates.reach): thirds of the land, 4 when the whole of it; 0 for a crate with no map (no map icon, no pips).
const BANDS = ["", "underThird", "underTwoThirds", "underAll", "all"];
export const reachStep = (c) => BANDS.indexOf(S.reachBand(c));
// A crate's ribbon: a developer crate reads like any later crate and is not counted; the ordinal counts walk crates only (first, second, third; a walk crate past the third, never from play, reads later). `walk`: the crate's place among the walk crates opened, from 0.
export const ribbonOf = (spec, c, walk) => (c.dev ? spec.strings.ribbon.later : [spec.strings.ribbon.first, spec.strings.ribbon.second, spec.strings.ribbon.third][walk] ?? spec.strings.ribbon.later);
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
  const crates = state === "bay" || state === "arrival" ? walkCrates(st, sv, docked).slice(0, R.crates.max) : [];
  const holds = state === "opening" || state === "arrival" || (state === "bay" && (crates.length > 0 || st.waiting.length > 0)), shut = !holds;
  regions.bay = { state: shut ? "shut" : "open", open: slot(R.bay.slices.open, R.bay.rect.slice(2), "the signed bay (cargo.json bay)"), door: shut ? slot(state === "report" ? R.bay.slices.report : R.bay.slices.shut, R.bay.door.slice(2), state === "report" ? "the report door: the shut door with its plain sage panel (GB-R6)" : "the signed bay door (cargo.json bay)") : "" };
  if (state === "bay" || state === "arrival") {
    regions.crates = { places: crates.map(() => ph(`crate-sealed-${R.crates.crate.join("x")}`, R.crates.crate)), shadow: slot(R.crates.shadow.slice, R.crates.shadow.size) };
    if (state === "bay" && st.waiting.length) regions.waitingPods = { pods: st.waiting.slice(0, R.waitingPods.max).map(podPic), shadow: slot(R.waitingPods.shadow.slice, R.waitingPods.shadow.size) };   // the pods themselves on the floor, oldest first; the context counts all
  }
  if (state === "opening") {
    const slice = (name) => ph(`crate-${name}-${R.crate.rect[2]}x${R.crate.rect[3]}`, R.crate.rect.slice(2));
    regions.opening = {
      crate: c.crate, at: c.at,
      crates: run.crates.map((k) => ({ ribbon: k.ribbon, sealed: slice("sealed"), opening: slice("opening"), open: slice("open"), shadow: slot(R.crate.shadow.slice, R.crate.shadow.rect.slice(2)), storeShadow: slot(R.stores.shadow.slice, R.stores.shadow.size), stores: ["energy", "data", "essence"].filter((m, i) => k.gained["eds"[i]] > 0).map((m) => ph(`cargo-${m}-${R.stores.size.join("x")}`, R.stores.size)), pods: k.pods.map((p) => ({ picture: podPic(anyPod(p.id)), well: p.well })) })),
    };
  }
  if (state === "report") regions.report = reportOf(run.report, spec, ph, slot, req);
  if (state === "arrival") regions.arrival = arrivalRegion(m, spec, ph, slot, req);

  // the line: the action, the subject, the notice and the way back of the state (cargo.json line)
  const Sg = spec.strings, spelled = (n) => SPELL[n] ?? "many";
  let line, need = null;
  const afterCrates = S.needKey(st, sv, settings, m.ui, true), wordsAfter = afterCrates && { ...afterCrates, module: home.strings.needs[afterCrates.key].module };
  const notice = wordsOf(wordsAfter, home).notice;
  if (state === "arrival") { const a = c.arrival, n = a.crates; line = a.phase === "show" ? { ok: m.ui.skip ? Sg.arrival.skip : null, back: null, subject: n ? (n === 1 ? Sg.subjects.cratesOne : fill(Sg.subjects.crates, { count: spelled(n) })) : Sg.subjects.empty, need: "" } : { ok: null, back: null, subject: "", need: "" }; }   // the choice's line is the panel's (host.mjs cargoBody)
  else if (state === "opening") line = { ok: m.ui.skip ? Sg.skip : null, back: null, subject: Sg.subjects.opening, need: "" };   // ✓ Skip only while the skippable hold runs (the host's ui.skip)
  else if (state === "report") line = { ok: run.report.newPods ? (run.report.newPods === 1 ? Sg.newPods.one : Sg.newPods.few) : Sg.done, back: "Cargo", subject: Sg.subjects.report, need: "" };
  else if (crates.length) { const all = walkCrates(st, sv, docked).length, n = c.drawn == null ? all : Math.min(c.drawn, all); line = { ok: Sg.open, back: "Home", subject: n === 1 ? Sg.subjects.cratesOne : fill(Sg.subjects.crates, { count: spelled(n) }), need: notice }; }
  else if (st.waiting.length) { const w = st.waiting.length; line = { ok: null, back: "Home", subject: w === 1 ? Sg.subjects.waitingOne : fill(Sg.subjects.waiting, { count: spelled(w) }), need: notice }; }   // before the away line: the open bay shows the waiting pods (cargo.json line.bay.order)
  else if (!docked) line = { ok: null, back: "Home", subject: Sg.subjects.away, need: notice };
  else line = { ok: null, back: "Home", subject: Sg.subjects.empty, need: notice };

  const props = { state, regions, focus: { cur: "room", targets: [] } };
  return { props, line, requests, need };
}

// The report card as the face sets it, from what the opening made (c.run.report): a tile for each of the first three crates (its pods, its reach step), what was gathered, the Probe's plates and cost, the goal and the read to suggest.
// The plate's height (cargo.json regions.report.height) is 136, 176 or 208, so the signed plate of that exact height is the one drawn; the face computes the same from the props it is given.
export function reportHeight(rp) {
  return 16 + 64 + 16 + 24 + 16 + (rp.goal ? 24 + 16 : 0) + (rp.goal && rp.meanwhile ? 32 : 0);
}
function reportOf(rp, spec, ph, slot, req) {
  const S1 = spec.regions.report, h = reportHeight(rp), icon = S1.crates.pods.icon, pl = S1.probe.plateIcon;
  return {
    plate: slot(S1.slice.replace("{h}", h), [S1.rect[2], h], "the signed report plate of this height (cargo.json report)"),
    crate: slot(S1.crates.crate.slice, S1.crates.crate.size, "the walk crate's picture (T-20261016-149)"), map: slot(S1.crates.reach.map.slice, S1.crates.reach.map.size, "the map icon (T-20261016-149)"),
    podIcon: ph(`icon-pod-${icon}`, [icon, icon]), emptyPod: ph(`icon-pod-empty-${icon}`, [icon, icon], true), shieldIcon: ph(`icon-shield-${pl}`, [pl, pl]), probeIcon: ph(`icon-probe-${S1.probe.icon[0]}`, S1.probe.icon), arrow: ph(`icon-arrow-${S1.goal.arrow[0]}`, S1.goal.arrow),
    crates: rp.crates.map((r) => ({ pods: r.pods, more: r.more ? "+" + r.more : "", reach: r.reach })),
    gathered: rp.gathered, probe: rp.probe ? { plates: rp.probe.plates, spent: rp.probe.spent ? String(rp.probe.spent) : "" } : null,
    goal: rp.goal ?? null,
    meanwhile: rp.goal && rp.meanwhile ? { emblem: req({ kind: "emblem", id: `emblem:${rp.meanwhile.chapter}:unread:${S1.meanwhile.emblem[0]}`, chapter: rp.meanwhile.chapter, state: "unread" }), glint: rp.meanwhile.glint ? req({ kind: "star", id: "star:12" }) : "", price: rp.meanwhile.price } : null,
  };
}

// The dock arrival's region (cargo.json regions.arrival): the pictures and the words of the show, with the beats' times the face's (its own clock) or `at`, the host's stage with reduced motion. The numbers are the spec's; this names *what*.
function arrivalRegion(m, spec, ph, slot, req) {
  const { st, settings } = m, c = m.ui.cargo, a = c.arrival, A = spec.regions.arrival, Sg = spec.strings.arrival, SPELL1 = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const mibis = a.back.slice(0, 3).map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => mibiReq(req, st, mb, A.mibis.size, settings, m.light));
  const faces = a.leaving.map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => ph(`face-${S.speciesOf(mb)}-${A.band.leaving.faceSize[0]}`, A.band.leaving.faceSize));
  const plates = a.plates, words = plates.mended ? Sg.mended.replace("{n in words}", SPELL1[plates.mended] ?? String(plates.mended)) : "";
  return {
    phase: a.phase, at: c.at ?? 0, ribbon: a.broke ? Sg.broken : Sg.ribbon,
    apron: slot(A.apron.slice, A.apron.rect.slice(2)), light: slot(A.light.slice, A.light.rect.slice(2)),
    glint: a.newCrates.some(Boolean) ? slot(A.crates.glint.slice, A.crates.glint.size) : "", glints: a.newCrates,
    mibis, plates: { icon: ph(A.band.probe.icon, A.band.probe.size), max: plates.max, whole: plates.whole, mended: plates.mended, words },
    leaving: { mark: faces.length ? slot(A.band.leaving.mark, A.band.leaving.markSize) : "", faces },
  };
}

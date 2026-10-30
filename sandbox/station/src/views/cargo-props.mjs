// The Cargo props (lvgl-switch.md §2.1, §4 L2.2; cargo.json, build spec 1 to 6): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Cargo words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags and which crate and pod goes to which well or place of the mat; no rectangle, no measure, no layout rule, no colour (the words place everything from cargo.json). The output is plain JSON:
// { props (state, berths, sittingCrate, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need }.
// Runs in Node, tested there (tests/cargo-props.test.mjs); the shape is cargo.props.json.
//   m: { st, sv, settings, docked, ui: { cargo: { state, crate, at, run, shown, arrival }, skip }, spec cargo.json, home home.json, frame frame.json, sittingSpec sitting.json (the end's ✓ See the portrait, keys.confirm.end) }
//   ui.cargo.run is what ✓ Open them all made (cargo-run.mjs planRun, intents/cargo.mjs openBay): the crates in the order they open, each with what it holds and the well or the mat place each pod lands in.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { wordsOf, mibiReq } from "./home-props.mjs";
import { shellSpecies } from "./pods-props.mjs";
import { readyList, MATS } from "../cargo-run.mjs";
import { fill, spell, plural } from "./words.mjs";
import { portraitOffered } from "./sitting-props.mjs";
import { req as reqOf, slot as slotOf, ph as phOf, slotAt } from "./requests.mjs";

// The crates ready to open in the bay: the walk crates while docked.
export const walkCrates = (st, sv, docked) => (docked ? S.bayCrates(st, sv) : []);

// Cargo's end (keys.confirm.end): the mibi whose sitting crate this run opened, while sitting.json regions.portrait.offeredFrom lists cargo-end and its 528×392 opening is kept (sitting-props portraitOffered:
// portrait-source.mjs portraitOpening); else null, and ✓ is Look at the pods. With no sitting spec, null.
export function endPortrait(st, run, sittingSpec) {
  if (!run || !(sittingSpec?.regions?.portrait?.offeredFrom ?? []).includes("cargo-end")) return null;
  const it = run.items.find((x) => x.kind === "sitting" && x.st && x.st.applied), mb = it ? S.mibiById(st, it.portrait.mibi) : null;
  return mb && portraitOffered(mb) ? mb : null;
}

export function cargoBuild(m, spec, home, frame, sittingSpec = null) {
  const { st, sv, settings } = m, c = m.ui.cargo, requests = [], req = reqOf(requests);
  const R = spec.regions, docked = !!m.docked, state = c.state, Sg = spec.strings, spelled = (n) => spell(n, "many");
  const slot = slotOf(req, "the signed master or its cut (cargo.json, cargo-cuts.py)");
  const ph = phOf(req, "its master (cargo.json placeholders)");
  const sizeOfSlice = (id) => id.match(/(\d+)x(\d+)(?:-done)?$/).slice(1, 3).map(Number);
  const pic = (id) => slot(id, sizeOfSlice(id));
  const podPic = (q, size) => { const sp = shellSpecies(st, q); return req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size }); };
  const wait = (n) => plural(n, Sg.subjects.waitingOne, fill(Sg.subjects.waiting, { count: spelled(n) }));
  const notice = () => { const a = S.needKey(st, sv, settings, m.ui, true), w = a && { ...a, module: home.strings.needs[a.key]?.module }; return wordsOf(w, home).notice; };
  const props = { state, berths: 3, sittingCrate: null, regions: {}, focus: { cur: "room", targets: [] } };

  if (state === "arrival") {   // the dock arrival keeps its own pictures and regions (cargo.json regions.dock*), as station-gate drew them
    const dock = {}, crates = walkCrates(st, sv, docked).slice(0, R.dockCrates.max);
    dock.bay = { state: "open", open: slot(R.dockBay.slices.open, R.dockBay.rect.slice(2), "the signed bay (cargo.json bay)"), door: "" };
    dock.crates = { places: crates.map(() => ph(`crate-sealed-${R.dockCrates.crate.join("x")}`, R.dockCrates.crate)), shadow: slot(R.dockCrates.shadow.slice, R.dockCrates.shadow.size) };
    const podSize = R.dockRack.pod.size, slots = R.dockRack.wells.slots, rackN = Math.min(S.rackSize(settings), slots);
    dock.rack = { insert: slot(R.dockRack.slice, R.dockRack.rect.slice(2)), wells: Array.from({ length: slots }, (_, i) => { const q = i < rackN ? st.tray[i] : null; return { pod: q ? podPic(q, podSize) : "" }; }) };
    props.regions = { dockBay: dock.bay, dockCrates: dock.crates, dockRack: dock.rack, arrival: arrivalRegion(m, spec, ph, slot, req) };
    const a = c.arrival, n = a.crates;
    const AS = Sg.arrival.subjects, line = a.phase === "show" ? { ok: m.ui.skip ? Sg.arrival.skip : null, back: null, subject: n ? plural(n, AS.cratesOne, fill(AS.crates, { count: spelled(n) })) : AS.empty, need: "" } : { ok: null, back: null, subject: "", need: "" };   // the choice's line is the panel's (host.mjs cargoBody)
    return { props, line, requests, need: null };
  }

  // ---- the layout: three berths of 256, or four of 188 with a portrait crate in (build spec 3) ----
  const run = c.run, B = R.berths, ready = readyList(st, sv, settings, m.now ?? Date.now());
  const sitting = state === "bay" ? ready.find((e) => e.kind === "sitting") : run && run.items.find((it) => it.kind === "sitting");
  const four = !!sitting; props.berths = four ? 4 : 3;
  const geo = four ? B.four : B.three, nWalk = 3;
  const berthOf = (k) => ({ crate: "", shadow: "", lifting: "", done: "", k: -1, kind: "walk", ...(k || {}) });
  const berths = Array.from({ length: props.berths }, () => berthOf());
  const walkPics = () => ({ crate: pic(geo.sealed.slice), lifting: pic(geo.lifting.slice), done: pic(geo.done.slice), shadow: slot(geo.shadow.slice, geo.shadow.size) });
  const sitPics = () => ({ crate: pic(B.four.portrait.sealed), lifting: pic(B.four.lifting.slice), done: pic(B.four.portrait.done), shadow: slot(B.four.shadow.slice, B.four.shadow.size), kind: "sitting" });
  if (state === "bay") {
    ready.filter((e) => e.kind === "walk").slice(0, nWalk).forEach((e, i) => { berths[i] = berthOf({ ...walkPics(), k: -1 }); });
    if (sitting) berths[3] = berthOf(sitPics());
  } else {
    let w = 0;
    run.items.forEach((it, k) => { if (it.kind === "sitting") berths[3] = berthOf({ ...sitPics(), k }); else if (w < nWalk) berths[w++] = berthOf({ ...walkPics(), k }); });
  }
  if (sitting) {
    const mb = state === "bay" ? S.mibiById(st, sitting.sc.mibiId) : S.mibiById(st, sitting.portrait.mibi), dg = state === "bay" ? (mb && mb.portrait && mb.portrait.digest) : sitting.portrait.digest;
    props.sittingCrate = { id: sitting.id, mibi: mb ? mb.id : (state === "bay" ? sitting.sc.mibiId : sitting.portrait.mibi), frame: slotAt(req, "sitting-frame-portrait-48x40", [0, 0, ...R.display.portrait.frameSize], "the sitting frame master (AD)"), picture: dg ? req({ kind: "portrait", id: `portrait:${String(dg).slice(0, 16)}:40x30`, digest: dg, size: R.display.portrait.picture }) : "" };
  }
  const geoSlices = { recess: pic(geo.recess), shut: pic(geo.shut), edge: pic(geo.edge.slice), gilt: four ? pic(B.four.portrait.gilt.slice) : "" };
  const regions = props.regions;
  regions.bay = { picture: slot(R.bay.slice, R.bay.rect.slice(2), "the bay (cargo-cuts.py)") };
  regions.berths = { ...geoSlices, list: berths };

  // ---- the hatch and the mat ----
  const H = R.hatch, W = R.waiting, wellSize = H.wells.pod.size, bigSize = R.display.pod.size;
  regions.hatch = { shut: pic(H.slices.shut), open: pic(H.slices.open), frame: pic(H.frame.slice), ring: pic(H.ring.slice), lit: pic(H.wells.lit.slice), wells: [] };
  regions.waiting = { mat: pic(W.mat.slice), shadow: slot(W.pods.shadow.slice, W.pods.shadow.size), pods: [] };
  const fromOf = (q) => { if (!run) return null; for (let k = 0; k < run.items.length; k++) { const j = run.items[k].pods.findIndex((p) => p.id === q.id); if (j >= 0) return { crate: k, order: j }; } return null; };
  const trayOf = state === "bay" ? st.tray : run.plan.sim.tray, waitOf = state === "bay" ? st.waiting : run.plan.sim.waiting, rack = Math.min(S.rackSize(settings), H.wells.centres.length);
  if (state !== "bay") regions.hatch.wells = H.wells.centres.map((_, i) => { const q = i < rack ? trayOf[i] : null; return { pod: q ? podPic(q, wellSize) : "", from: q ? fromOf(q) : null }; });
  regions.waiting.pods = waitOf.map((q) => ({ pod: podPic(q, wellSize), from: fromOf(q) }));

  // ---- the opening: the contents of each crate, the times (build spec 4, 8.3) ----
  if (state === "opening" || state === "end") {
    let slotN = 0;
    const items = run.items.map((it, k) => {
      const fs = it.finds.map((kind) => ({ kind, big: pic(`find-${kind}-112x112`), small: pic(`find-${kind}-16x16`), slot: slotN++ })), berth = berths.findIndex((b) => b.k === k);
      if (state === "end" || k < run.base) return { kind: it.kind, berth, mats: [], pods: [], finds: fs.map((f) => ({ kind: f.kind, big: "", small: f.small, slot: f.slot })), portrait: null };   // done: what the strip and the berths keep
      return {
        kind: it.kind, berth,
        mats: it.mats.map((mt) => ({ name: mt.name, amount: "+" + mt.amount, big: pic(`cargo-${mt.name}-72x96`), small: pic(`cargo-${mt.name}-48x64`) })),
        pods: it.pods.map((p) => ({ big: podPic(p.rec, bigSize), small: podPic(p.rec, wellSize), well: p.well, mat: p.mat, isNew: !!p.isNew })),
        finds: fs,
        portrait: it.kind === "sitting" ? { frame: props.sittingCrate.frame, picture: props.sittingCrate.picture } : null,
      };
    });
    regions.opening = { crate: c.crate, at: c.at, base: state === "end" ? items.length : run.base, starts: state === "end" ? [] : run.starts, lens: state === "end" ? [] : run.lens, crates: items };
    if (state === "opening") Object.assign(regions.opening, { shadowBig: slot(R.display.material.big.shadow.slice, R.display.material.big.shadow.size), shadowSmall: slot(R.display.material.small.shadow.slice, R.display.material.small.shadow.size), glint: req({ kind: "star", id: "star:12" }) });
  }

  // ---- the line: the action, the subject, the notice and the way back of the state (cargo.json line) ----
  let line, need = null;
  const waitingNow = state === "bay" ? st.waiting.length : state === "end" ? run.plan.sim.waiting.length : run.pre.waiting.length + run.items.reduce((a, it) => a + it.st.mat.size, 0);
  const came = run ? run.items.some((it) => it.pods.some((p) => p.well >= 0)) : false, nPods = run ? run.items.reduce((a, it) => a + it.pods.filter((p) => p.well >= 0).length, 0) : 0;
  if (state === "opening") line = { ok: m.ui.skip ? Sg.skip : null, back: "Home", subject: waitingNow > run.pre.waiting.length ? wait(waitingNow) : "", need: "" };
  else if (state === "end") line = { ok: endPortrait(st, run, sittingSpec) && Sg.end?.confirm ? Sg.end.confirm : came ? plural(nPods, Sg.newPods.one, Sg.newPods.few) : waitingNow ? Sg.newPods.few : null, back: "Home", subject: waitingNow ? wait(waitingNow) : "", need: "" };   // keys.confirm.end: the portrait first, then Look at the pods (a pod came, or the rack is full)
  else { const n = ready.length; line = { ok: n ? plural(n, Sg.openOne, Sg.open) : st.waiting.length ? Sg.newPods.few : null, back: "Home", subject: st.waiting.length ? wait(st.waiting.length) : "", need: notice() }; }
  return { props, line, requests, need };
}

// The dock arrival's region (cargo.json regions.arrival): the pictures and the words of the show, with the beats' times the face's (its own clock) or `at`, the host's stage with reduced motion. The numbers are the spec's; this names *what*.
function arrivalRegion(m, spec, ph, slot, req) {
  const { st, settings } = m, c = m.ui.cargo, a = c.arrival, A = spec.regions.arrival, Sg = spec.strings.arrival;
  const mibis = a.back.slice(0, 3).map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => mibiReq(req, st, mb, A.mibis.size, settings, m.light));
  const faces = a.leaving.map((id) => S.mibiById(st, id)).filter(Boolean).map((mb) => ph(`face-${S.speciesOf(mb)}-${A.band.leaving.faceSize[0]}`, A.band.leaving.faceSize));
  const plates = a.plates, words = plates.mended ? fill(Sg.mended, { "n in words": spell(plates.mended) }) : "";
  return {
    phase: a.phase, at: c.at ?? 0, ribbon: a.broke ? Sg.broken : Sg.ribbon,
    apron: slot(A.apron.slice, A.apron.rect.slice(2)), light: slot(A.light.slice, A.light.rect.slice(2)),
    glint: a.newCrates.some(Boolean) ? slot(A.crates.glint.slice, A.crates.glint.size) : "", glints: a.newCrates,
    mibis, plates: { icon: ph(A.band.probe.icon, A.band.probe.size), max: plates.max, whole: plates.whole, mended: plates.mended, words },
    leaving: { mark: faces.length ? slot(A.band.leaving.mark, A.band.leaving.markSize) : "", faces },
  };
}

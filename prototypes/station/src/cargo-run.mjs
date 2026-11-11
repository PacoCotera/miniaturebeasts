// The Cargo run (cargo.json events.opening; build spec 4, 8.3 to 8.5): which crates open, in what order, what each holds, and the time of each. Pure functions of the state and the spec; no clock, no DOM.
//   ready list   the crates ✓ opens, in the order they open: the walk crates (while docked), then the portrait crate (the oldest ready sitting crate)
//   plan         the run played on a copy of the state: for each crate its pods (with the well or the mat place each lands in), finds, materials and portrait, so the whole opening is known before the first crate opens;
//                the real rules are applied crate by crate (intents/cargo.mjs), so the crates not yet opened stay sealed when the player leaves
//   times        each crate's length and start (the host's per-crate start table, props regions.opening.starts) and the event's ms and hold
import * as S from "./state.mjs";
import * as T from "./sitting.mjs";
import { speciesId } from "./genome.mjs";

export const MATS = [{ key: "e", name: "energy" }, { key: "d", name: "data" }, { key: "s", name: "essence" }];
export const FIND_KINDS = ["crystal", "pearl", "shard"];
export const HOLD_MAX = 30000;   // lvgl-switch.md §2.7

// The Station has never stored a pod: nothing in the tray or on the mat, no mibi, no bud, no species known (the same facts as the goal's firstPod, state.mjs). The first crate's inside view then holds for ✓ Take the pod.
export const neverStoredPod = (st) => !st.tray.length && !st.waiting.length && !st.mibis.length && !st.bud && !(st.knownIds || []).length;

// The crates that ✓ opens, in the order they open: the walk crates while docked, then the portrait crate, one at a time (build spec 8.5: the oldest ready, by start).
export function readyList(st, sv, settings, now) {
  const walk = S.docked(st) ? S.bayCrates(st, sv).map((c) => ({ kind: "walk", id: c.id, c })) : [];
  const sit = T.readyCrates(st, settings, now).slice().sort((a, b) => a.start - b.start)[0];
  return sit ? [...walk, { kind: "sitting", id: sit.id, sc: sit }] : walk;
}

// What a walk crate shows: its finds (kinds in the crate record), by the order they were packed; none when the record names none.
export const findsOf = (c) => (Array.isArray(c.finds) ? c.finds.filter((k) => FIND_KINDS.includes(k)) : []);

// One crate's length in ms (build spec 4): with a pod or a find, the first goes at `pods` and 300 apart, each travelling 600 and swapping 180, then 300; with neither, the materials go 150 apart from 700, then 300; the portrait crate 700 + 600 + 300.
// The order of an ordinary crate (cargo.json events.opening.order): inside for I = it.inside ms, then the pods, then the supplies, then the finds. The face has the same three starts (screens/cargo.c).
export const insideOf = (it) => it.inside || 0;
export const podAt = (steps, it, j) => insideOf(it) + steps.pods + steps.podEach * j;
export const matAt = (steps, it, q) => insideOf(it) + steps.pods + steps.podEach * it.pods.length + steps.materialEach * q;
export const findAt = (steps, it, f) => insideOf(it) + steps.pods + steps.podEach * it.pods.length + steps.materialEach * it.mats.length + steps.podEach * f;
export function lengthOf(steps, it) {
  if (it.kind === "sitting") return steps.portrait + steps.travel + steps.tail;
  const np = it.pods.length, nm = it.mats.length, nf = it.finds.length;
  let end = insideOf(it) + steps.pods + steps.travel;   // a crate holding nothing is read as holding one supply
  if (np) end = Math.max(end, podAt(steps, it, np - 1) + steps.travel + steps.swap);
  if (nm) end = Math.max(end, matAt(steps, it, nm - 1) + steps.travel);
  if (nf) end = Math.max(end, findAt(steps, it, nf - 1) + steps.travel + steps.swap);
  return end + steps.tail;
}
// The starts, lengths, event ms and hold of the items from `from` on (the first start is 0): the event's ms is the last start plus the last length, the hold 20 longer.
export function timesOf(steps, items, from = 0) {
  const lens = [], starts = []; let t = 0;
  for (const it of items.slice(from)) { starts.push(t); const L = lengthOf(steps, it); lens.push(L); t += L; }
  return { starts, lens, ms: t, hold: t + 20 };
}
// How many of the items play: as many as fit the hold's ceiling (at least one); the rest are taken in by the rule when the run ends.
export function fitCount(steps, items) { let n = items.length; while (n > 1 && timesOf(steps, items.slice(0, n)).hold > HOLD_MAX) n--; return n; }

// The step times at which reduced motion stages `at` for one item (build spec 8.3): 0, 200, 500, each material's go time, 1500, each pod's and find's start, the last + 300.
export function stepTimes(steps, it) {
  const out = new Set([0]);
  if (it.kind === "sitting") { out.add(steps.display); out.add(steps.portrait); }
  else {
    out.add(insideOf(it) + steps.hatch);
    it.pods.forEach((_, j) => out.add(podAt(steps, it, j))); it.mats.forEach((_, q) => out.add(matAt(steps, it, q))); it.finds.forEach((_, f) => out.add(findAt(steps, it, f)));
  }
  out.add(lengthOf(steps, it));
  return [...out].sort((a, b) => a - b);
}

// The run played on a copy of the state. `list` is the ready list's entries to play; the real state is not touched. Items:
//   { kind, id, c | sc, pods: [{ id, rec, well, mat, isNew }], finds: [kind], mats: [{ key, name, amount }], play, portrait: { mibi, digest } | null }
// well is the tray place the pod lands in, else -1 and mat is its place among the waiting pods (oldest first).
export function planRun(st, sv, settings, now, list) {
  const sim = JSON.parse(JSON.stringify(st)), known = new Set(st.knownIds || []), items = [];
  for (const e of list) {
    if (e.kind === "walk") {
      const r = S.openCrates(sim, sv, settings, now, [e.c]), p = r.plays[0];
      const pods = p.ids.map((id) => {
        const w = sim.tray.findIndex((q) => q.id === id), rec = w >= 0 ? sim.tray[w] : sim.waiting.find((q) => q.id === id), sp = rec ? rec.species ?? speciesId(rec.sp) : null;
        return { id, rec, well: w, mat: w >= 0 ? -1 : sim.waiting.findIndex((q) => q.id === id), isNew: !!sp && !known.has(sp) };
      });
      items.push({ kind: "walk", id: e.c.id, c: e.c, play: p, pods, finds: findsOf(e.c), mats: MATS.filter((m) => p.gained[m.key] > 0).map((m) => ({ ...m, amount: p.gained[m.key] })), portrait: null });
    } else {
      const m = S.mibiById(sim, e.sc.mibiId);
      items.push({ kind: "sitting", id: e.sc.id, sc: e.sc, play: null, pods: [], finds: [], mats: [], portrait: { mibi: e.sc.mibiId, digest: m && m.portrait && m.portrait.digest ? m.portrait.digest : null } });
    }
  }
  return { items, sim, pre: { tray: st.tray.map((q) => q.id), waiting: st.waiting.map((q) => q.id) } };
}

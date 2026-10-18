// Cargo's intents (cargo.json: the keys, the line, events.opening, handoff): the rule call behind ✓ and ← in the bay, the opening and the end, and the opening's timeline. Cargo has no targets: the ring is on nothing and the pad does nothing.
//   h.ui.cargo: { state: "bay" | "opening" | "end" | "arrival", crate, at, run, shown, arrival }
//   run: what ✓ Open them all made (cargo-run.mjs planRun): { items, plan, pre, rest, base, starts, lens, gen, newest } — the crates in the order they open, each with what it holds and where each pod lands; item.st is its progress.
//   shown: the counters and the turn as the top bar shows them while the crates open.
// The rules are applied one crate at a time, at its start (S.openCrates, T.openSittingCrate), so the crates not yet opened stay sealed when the player leaves (build spec 8.4). The timeline is the spec's (events.opening.steps).
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { readyList, planRun, timesOf, fitCount, stepTimes } from "../cargo-run.mjs";
import { toPods } from "./home.mjs";
import { skipShow } from "./arrival.mjs";

// The crates ready to open: the walk crates while docked and the portrait crate (docked or away).
export const readyCount = (h) => readyList(h.st, h.sv, h.settings, h.now()).length;

// ✓ Open them all (Open it): the run plays the ready crates one at a time, left to right, the portrait crate last (events.opening); the counters and the turn reach the top bar crate by crate.
export function openBay(h) {
  const c = h.ui.cargo, spec = h.specs.cargo, steps = spec.events.opening.steps, now = h.now();
  const list = readyList(h.st, h.sv, h.settings, now); if (!list.length) return { ok: false, plays: [] };
  const maxN = spec.events.opening.crates.max, first = list.slice(0, maxN), plan = planRun(h.st, h.sv, h.settings, now, first), n = fitCount(steps, plan.items);
  const run = { items: plan.items.slice(0, n), plan, pre: plan.pre, rest: [...first.slice(n), ...list.slice(maxN)], base: 0, starts: [], lens: [], gen: 0, newest: null };
  for (const it of run.items) it.st = { applied: false, given: [], mat: new Set(), done: false };
  c.run = run; c.state = "opening"; c.shown = { e: h.st.e, d: h.st.d, s: h.st.s, turn: h.st.turn };
  startEvent(h, run, 0);
  return { ok: true, plays: run.items };
}

// The event for the items from `base` on, its times rebased to 0, and the host's steps for each (counters, flashes, the mat's line, the crate's end).
function startEvent(h, run, base) {
  const c = h.ui.cargo, steps = h.specs.cargo.events.opening.steps, motion = h.motion ? h.motion() : true;
  const gen = ++run.gen, tm = timesOf(steps, run.items, base); run.base = base; run.starts = tm.starts; run.lens = tm.lens;
  const at = (ms, fn) => h.at(ms, () => { if (c.run === run && run.gen === gen) fn(); });
  c.crate = base; c.at = 0; if (h.skip) h.skip();
  h.play({ kind: "arrival", target: "crate", ms: tm.ms, hold: tm.hold, skip: true });
  run.items.slice(base).forEach((it, i) => {
    const k = base + i, t0 = tm.starts[i], L = tm.lens[i];
    if (i === 0) begin(h, run, k); else at(t0, () => begin(h, run, k));
    it.mats.forEach((m, q) => {
      const go = steps.materials + steps.materialEach * q;
      at(t0 + go + (motion ? steps.travel : 0), () => give(h, run, k, q));   // the object arrives (or with reduced motion is gone at its step) and the counter ticks
    });
    if (motion && it.mats.length) at(t0 + steps.flash, () => { for (const m of it.mats) h.play({ kind: "flash", target: m.key, ms: steps.flashMs }); });   // the materials answer: each present material's top-bar figure flashes (frame.json materials.flashMs)
    it.pods.forEach((p, j) => { if (p.mat >= 0) at(t0 + steps.pods + steps.podEach * j + (motion ? steps.travel : 0), () => it.st.mat.add(j)); });   // a pod has gone to the mat: the middle slot says so
    if (!motion) for (const s of stepTimes(steps, it)) { if (s === 0) continue; at(t0 + s, () => { c.crate = k; c.at = s; }); }
    at(t0 + L, () => { finish(h, run, k); c.at = L; });
  });
  at(tm.ms + 20, () => endRun(h));
}
// A crate starts: its rule is applied now (the pods find their wells or the mat; the counters wait for their steps).
function begin(h, run, k) {
  const c = h.ui.cargo; c.crate = k; c.at = 0; apply(h, run, k);
}
function apply(h, run, k) {
  const it = run.items[k], s = it.st; if (s.applied) return; s.applied = true;
  if (it.kind === "walk") S.openCrates(h.st, h.sv, h.settings, h.now(), [it.c]);
  else T.openSittingCrate(h.st, it.id, h.settings, h.now());
  for (const p of it.pods) if (p.well >= 0) run.newest = p.id;
  h.save();
}
// The counter ticks with the house flash (the presenter sees the figure rise): the amount the crate brought for this material, less the plates it paid for.
function give(h, run, k, q) {
  const it = run.items[k], s = it.st; if (s.given[q]) return; s.given[q] = true;
  const c = h.ui.cargo, m = it.mats[q]; if (!c.shown) return;
  c.shown[m.key] += it.play.gained[m.key] - (m.key === "e" ? it.play.spent : 0);
}
// A crate's end: everything of it has arrived (also what Skip does at once): the counters at their final values, the pods in their wells or on the mat, the world turn, the crate done.
function finish(h, run, k) {
  const it = run.items[k], s = it.st, c = h.ui.cargo; if (s.done) return;
  apply(h, run, k); it.mats.forEach((_, q) => give(h, run, k, q)); it.pods.forEach((p, j) => { if (p.mat >= 0) s.mat.add(j); });
  if (c.shown && it.play) c.shown.turn = Math.max(c.shown.turn, it.play.turnTo);
  s.done = true;
}
const openedOf = (run) => ({ crates: run.items.filter((it) => it.st.done).length, newPods: run.items.reduce((a, it) => a + (it.st.done ? it.pods.filter((p) => p.well >= 0).length : 0), 0) });

// ✓ Skip (build spec 8.4): the current crate's end state at once, then the next crate starts with the times rebased to 0; on the last crate, the end.
export function skipCrate(h) {
  const c = h.ui.cargo, run = c.run; if (c.state !== "opening" || !run) return false;
  const k = c.crate; finish(h, run, k);
  if (k >= run.items.length - 1) { endRun(h); return true; }
  startEvent(h, run, k + 1); return true;
}
// The run ends after its last crate: the leftover crates (past the hold's ceiling) are taken in by the rule, the counters and the turn are the rules', the end shows until a key.
export function endRun(h) {
  const c = h.ui.cargo, run = c.run; if (c.state !== "opening" || !run) return;
  run.gen++; if (h.skip) h.skip();
  for (let k = 0; k < run.items.length; k++) finish(h, run, k);
  const walk = run.rest.filter((e) => e.kind === "walk"); if (walk.length) S.openCrates(h.st, h.sv, h.settings, h.now(), walk.map((e) => e.c));
  c.state = "end"; c.shown = null; c.crate = 0; c.at = 0; h.ui.caddyOpened = openedOf(run); h.save();
}
// ← (or a room key) during the opening: the current crate's end state as Skip makes it, no further crate opens, the run is over. The crates not yet opened stay sealed in the bay (their rules were never applied).
export function abortRun(h) {
  const c = h.ui.cargo, run = c.run; if (c.state !== "opening" || !run) return;
  finish(h, run, c.crate); run.gen++; if (h.skip) h.skip();
  h.ui.caddyOpened = openedOf(run); c.state = "bay"; c.run = null; c.shown = null; c.crate = 0; c.at = 0; h.save();
}
// The end closes (the next key, after its action): the bay shows again.
export function closeEnd(h) { const c = h.ui.cargo; if (c.state === "end") { c.state = "bay"; c.run = null; } }
// A room key or any other way out of Cargo: an opening in progress finishes as a cut (nothing half taken), the end closes.
export function leaveCargo(h) { const c = h.ui.cargo; if (c.state === "opening") abortRun(h); else closeEnd(h); }

// The keys the face says while the opening holds (build spec 8.4): ✓ is Skip, ← ends the run and goes Home, a room key does what ← does and then opens its room. Called by the host before its hold drops the key.
export function held(h, verb, roomKey) {
  if (verb === "confirm") return skipCrate(h);
  if (verb === "back") { abortRun(h); h.ui.home.f = "cargo"; h.goto("home"); return true; }
  if (verb && verb.startsWith("room:")) { abortRun(h); return roomKey(h, verb.slice(5)); }
  return false;
}

// `target`: "room" (Cargo has no other); `verb`: confirm | back | pad (any of the four directions, in the end only) | room:<key> (the frame's).
export function intent(h, target, verb) {
  const c = h.ui.cargo;
  if (c.state === "arrival") { skipShow(h); return; }   // a key in the show (reduced motion, or after the face's hold): the show cuts to its choice
  if (c.state === "opening") { if (verb === "confirm") skipCrate(h); else if (verb === "back") { abortRun(h); h.ui.home.f = "cargo"; h.goto("home"); } return; }   // the face says ✓ and ← on the room while the opening holds; the pad does nothing
  if (c.state === "end") {   // any key does what it does, and then the bay shows again: ✓ follows the bottom line, ← is Home, the pad only closes it
    const run = c.run, newest = run?.newest ?? null, came = run ? run.items.some((it) => it.pods.some((p) => p.well >= 0)) : false;
    closeEnd(h);
    if (verb === "confirm" && came) toPods(h, newest);
    else if (verb === "back") { h.ui.home.f = "cargo"; h.goto("home"); }
    return;
  }
  if (verb === "back") { h.ui.home.f = "cargo"; h.goto("home"); return; }   // ← Home, the ring on the Bay module
  if (verb === "confirm" && readyCount(h)) return openBay(h);
}

// Cargo's intents (cargo.json: the keys, the line): the rule call behind ✓, ▼ and ← at the Bay. The Bay is one sorting table: the crates that crossed at the dock wait sealed, the first on the table.
//   h.ui.cargo: { state: "bay", open, sum, portrait }
//   open      the crate in hand (the first that waits) is open on the table: ✓ opened it, ✓ again puts it away
//   sum       what this visit unloaded: { crates, pods, newest }; the table says it when nothing waits any more, and ✓ goes to the Nursery
//   portrait  the mibi whose sitting crate this visit opened (✓ then offers the portrait first)
// The rules are applied one crate at a time, when it is put away (S.openCrates, T.openSittingCrate), so a crate not yet put away stays sealed when the player leaves. Cargo has no targets: the ring is on nothing; the pad down is ▼ All at once.
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { readyList } from "../cargo-run.mjs";
import { toPods, toPodsWaiting } from "./home.mjs";
import { portraitOffered } from "../views/sitting-props.mjs";

// The crates that wait at the Bay: the walk crates the dock crossed (docked or not) and a ready portrait crate.
export const readyCount = (h) => readyList(h.st, h.sv, h.settings, h.now()).length;

// One crate is put away: its rule is applied now (its pods join the Nursery's shelf, its supplies the counters) and the visit's sum grows.
function putAway(h, e) {
  const c = h.ui.cargo; let pods = [];
  if (e.kind === "walk") { const r = S.openCrates(h.st, h.sv, h.settings, h.now(), [e.c]); pods = r.plays[0] ? r.plays[0].ids : []; }
  else { T.openSittingCrate(h.st, e.id, h.settings, h.now()); c.portrait = e.sc.mibiId; }
  c.sum = { crates: (c.sum ? c.sum.crates : 0) + 1, pods: (c.sum ? c.sum.pods : 0) + pods.length, newest: pods.length ? pods[pods.length - 1] : c.sum ? c.sum.newest : null };
  c.open = false; h.ui.caddyOpened = { crates: c.sum.crates, newPods: c.sum.pods };   // what the visit brought, for the Caddy's "after the opening" lines (the next dock or lift clears it)
  h.save();
}
// ✓ on a waiting crate: the first ✓ opens the crate in hand, the second puts it away and the next crate comes down.
export function openBay(h) {
  const c = h.ui.cargo, list = readyList(h.st, h.sv, h.settings, h.now()); if (!list.length) return { ok: false, plays: [] };
  if (!c.open) { c.open = true; return { ok: true, plays: [] }; }
  putAway(h, list[0]); return { ok: true, plays: [list[0]] };
}
// ▼ All at once: every crate that waits is put away, one after the other, from wherever the table is.
export function putAll(h) {
  const c = h.ui.cargo, plays = [];
  for (let list = readyList(h.st, h.sv, h.settings, h.now()); list.length; list = readyList(h.st, h.sv, h.settings, h.now())) { putAway(h, list[0]); plays.push(list[0]); }
  c.open = false; return { ok: plays.length > 0, plays };
}
// A room key or any other way out of Cargo: an open crate is put away at once (nothing is left half taken); the visit's sum is over.
export function leaveCargo(h) {
  const c = h.ui.cargo, list = c.open ? readyList(h.st, h.sv, h.settings, h.now()) : [];
  if (list.length) putAway(h, list[0]);
  c.open = false; c.sum = null; c.portrait = null;
}
// The end closes (kept for the frame's callers): the visit's sum is over.
export function closeEnd(h) { h.ui.cargo.sum = null; }

// `target`: "room" (Cargo has no other); `verb`: confirm | back | all (the pad down) | room:<key> (the frame's).
export function intent(h, target, verb) {
  const c = h.ui.cargo;
  if (verb === "back") { leaveCargo(h); h.ui.home.f = "bay"; h.goto("home"); return; }   // ← Home, the ring on the Bay module
  if (verb === "all") { putAll(h); return; }
  if (verb !== "confirm") return;
  if (readyCount(h)) { openBay(h); return; }
  if (c.sum) {   // nothing waits: the end's ✓, the portrait first, then the Nursery
    const newest = c.sum.newest, mb = c.portrait != null ? S.mibiById(h.st, c.portrait) : null, pm = mb && portraitOffered(mb) && h.specs.cargo.strings.end?.confirm ? mb : null;
    c.sum = null; c.portrait = null;
    if (pm && h.enterSitting && h.enterSitting(pm, { state: "portrait", from: "cargo" })) return;
    toPods(h, newest);
    return;
  }
  if (h.st.waiting.length) toPodsWaiting(h);   // nothing to open and a pod waits on the mat: ✓ Look at the pods
}

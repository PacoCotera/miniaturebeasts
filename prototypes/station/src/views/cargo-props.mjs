// The Cargo props (lvgl-switch.md §2.1; cargo.json; bay-design-1 design.md 2): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Bay. Props name *what*, never *where*: words, counts,
// asset ids and flags; no rectangle, no measure, no layout rule, no colour (the face places everything from cargo.json). The output is plain JSON:
// { props (state, bay), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), need }.
// Runs in Node, tested there (tests/cargo-props.test.mjs).
//   m: { st, sv, settings, docked, ui: { cargo: { state, open, sum, portrait, arrival } }, now }
// The Bay is one sorting table: the Companion on the ledge, the crates that crossed at the dock (the first on the table, two on the ledge, the rest behind them), the Nursery's shelf and the three counters.
import * as S from "../state.mjs";
import { speciesId } from "../genome.mjs";
import { shellSpecies } from "./pods-props.mjs";
import { readyList, MATS } from "../cargo-run.mjs";
import { fill, plural } from "./words.mjs";
import { portraitOffered } from "./sitting-props.mjs";
import { req as reqOf, slot as slotOf } from "./requests.mjs";

// The crates that wait at the Bay: the walk crates the dock crossed (cargo-run.mjs readyList has the portrait crate after them).
export const walkCrates = (st) => S.bayCrates(st);
const SHELF_MAX = 12;   // the shelf's strip: the face shows the newest 6 on the narrow form and 12 on the wide one; the count carries the rest

export function cargoBuild(m, spec, home, frame) {
  const { st, sv, settings } = m, c = m.ui.cargo, requests = [], req = reqOf(requests), Sg = spec.strings, P = spec.pictures;
  const slot = slotOf(req, "the signed master (cargo.json pictures)");
  const podPic = (q, size) => { const sp = shellSpecies(st, q); return req({ kind: "pod", id: `pod:${sp ?? "-"}:${q.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size }); };
  const sidePic = (q, size) => { const sp = shellSpecies(st, q); return req({ kind: "podside", id: `podside:${sp ?? "-"}:${q.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state: q.idd ? "identified" : "sealed", size }); };
  const ready = readyList(st, sv, settings, m.now ?? Date.now()), docked = !!m.docked, sum = c.sum;
  const crates = (n) => plural(n, Sg.crates.one, fill(Sg.crates.many, { n }));

  // ---- the Companion on the ledge: its state in two lines (design 2.6); away, the cradle stands empty ----
  const aboard = S.aboardCrates(st, sv).length, split = (s) => s.split(" · ");
  const words = !docked ? [] : split(aboard > 0 ? fill(Sg.companion.full, { crates: crates(aboard) }) : Sg.companion.empty);
  const companion = { docked, mark: docked ? slot(P.cradleMark, [28, 46]) : "", l1: words[0] ?? "", l2: words[1] ?? "" };

  // ---- the crates: the first is on the table, the next two on the ledge ----
  const crateView = (e, size) => {
    const walk = e.kind === "walk", tag = walk && e.c.n != null ? e.c.n : null;
    return { parcel: !walk, picture: walk ? slot(size === "table" ? P.sealed : P.crate, size === "table" ? [256, 176] : [64, 64]) : slot(size === "table" ? "crate-sitting-256x176" : "crate-sitting-80x56", size === "table" ? [256, 176] : [80, 56]),
      tag: tag == null ? "" : fill(Sg.tag, { n: tag }), tagShort: tag == null ? "" : fill(Sg.tagShort, { n: tag }), ring: walk && (e.c.pods || []).length > 0 };
  };
  const hand = ready[0] ?? null, table = hand && { ...crateView(hand, "table"), open: !!c.open };
  if (table && c.open) {
    const c0 = hand.kind === "walk" ? hand.c : null;
    table.pods = (c0 ? c0.pods || [] : []).map((q, j) => { const rec = { ...q, species: q.species ?? speciesId(q.sp), idd: 0 }; return j === 0 ? { pic: podPic(rec, P.pod.big), side: false } : { pic: sidePic(rec, P.pod.side), side: true }; });
    table.mats = c0 ? MATS.filter((x) => (c0[x.key] | 0) > 0).map((x) => ({ name: x.name, amount: "+" + (c0[x.key] | 0), pic: slot(`cargo-${x.name}-${P.mat.size.join("x")}`, P.mat.size) })) : [];
  }
  const ledge = ready.slice(1, 3).map((e) => crateView(e, "ledge"));

  // ---- the stores: the Nursery's shelf (the newest pods, the count) and the counters ----
  const tray = st.tray, shelf = { title: Sg.shelf.title, count: fill(Sg.shelf.count, { n: tray.length }), pods: tray.slice(-SHELF_MAX).reverse().map((q) => podPic(q, P.pod.shelf)) };
  const counters = [["e", st.e], ["d", st.d], ["s", st.s]].map(([k, v]) => ({ key: k, label: Sg.counters[k], value: String(v) }));

  // ---- the end: nothing waits and this visit unloaded: the sum ----
  const end = !ready.length && sum ? [fill(sum.crates === 1 ? Sg.done.one : Sg.done.many, { n: sum.crates }), sum.pods === 0 ? Sg.done.pods.none : sum.pods === 1 ? Sg.done.pods.one : fill(Sg.done.pods.many, { n: sum.pods })].join(" · ") : "";

  const props = { state: "bay", berths: 0, regions: {}, focus: { cur: "room", targets: [] }, bay: { companion, table, ledge, behind: Math.max(0, ready.length - 3), all: ready.length ? Sg.all : "", shelf, counters, end } };

  // ---- the line: the action, the middle (▼ All at once while a crate waits), the way back ----
  let line, need = null;
  if (ready.length) line = { ok: c.open ? Sg.putAway : Sg.open, back: "Home", subject: "", need: "" };
  else if (sum) { const mb = c.portrait != null ? S.mibiById(st, c.portrait) : null, offer = mb && Sg.end?.confirm && portraitOffered(mb); line = { ok: offer ? Sg.end.confirm : Sg.toNursery, back: "Home", subject: "", need: "" }; }
  else line = { ok: st.waiting.length ? Sg.newPods.few : null, back: "Home", subject: "", need: "" };
  return { props, line, requests, need };
}

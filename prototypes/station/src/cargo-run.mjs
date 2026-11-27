// The Bay's crates (cargo.json; bay-design-1 design.md 2.3 to 2.5): which crates wait at the Bay and in what order they come to the table. Pure functions of the state and the spec; no clock, no DOM.
//   ready list   the crates that wait, in the order they come to the table: the walk crates the dock crossed (st.bayHeld), then the portrait crate (the oldest ready sitting crate)
//   the first of the list is the crate in hand (on the table); the next two are on the ledge; a third walk crate and a ready portrait crate wait behind
import * as S from "./state.mjs";
import * as T from "./sitting.mjs";

export const MATS = [{ key: "e", name: "energy" }, { key: "d", name: "data" }, { key: "s", name: "essence" }];

// The Station has never stored a pod: nothing in the tray or on the mat, no mibi, no bud, no species known (the same facts as the goal's firstPod, state.mjs).
export const neverStoredPod = (st) => !st.tray.length && !st.waiting.length && !st.mibis.length && !st.bud && !(st.knownIds || []).length;

// The crates that wait, in the order they come to the table: the walk crates the dock crossed, then the portrait crate, one at a time (the oldest ready, by start).
export function readyList(st, sv, settings, now) {
  const walk = S.bayCrates(st).map((c) => ({ kind: "walk", id: c.id, c }));
  const sit = T.readyCrates(st, settings, now).slice().sort((a, b) => a.start - b.start)[0];
  return sit ? [...walk, { kind: "sitting", id: sit.id, sc: sit }] : walk;
}

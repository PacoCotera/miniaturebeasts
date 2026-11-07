// What the Companion's dock shows (specs/station-dock-arrival-spec.md; cargo.json regions.arrival): read from the dock's result and the rules, never from the strings. A pure function of the state: the crates in the bay, the ones
// holding a species new to the player, the Probe's plates and the mend, the mibis who came home (care merged, or asked to come home) and who leaves (asked to go). It never shows what is inside a crate.
import * as S from "./state.mjs";
import { speciesId } from "./genome.mjs";

// The species a crate holds that the player has not identified yet: a crate "holds a new species" when one of its pods is of a species outside `knownIds` (state.mjs: identify records the species there).
export const holdsNewSpecies = (st, c) => (c.pods || []).some((q) => { const sp = q.species ?? speciesId(q.sp); return sp && !st.knownIds.includes(sp); });

// r: the dock's result ({ home, mend: { free, paid, broke } }); `crates` are the walk crates in bay order (the first three are drawn).
export function arrivalOf(st, sv, r, max = 3) {
  const crates = S.bayCrates(st, sv), shown = Math.min(crates.length, max), pr = st.probe, mended = r && r.mend ? (r.mend.free | 0) + (r.mend.paid | 0) : 0;
  const pending = S.pendingCarry(st, sv), ids = (xs) => xs.filter((id) => { const m = S.mibiById(st, id); return m && !m.released; });
  const back = ids([...new Set([...(r && r.home || []), ...pending.filter((q) => q.op === "home").map((q) => q.id)])]);
  const leaving = ids([...new Set(pending.filter((q) => q.op === "add").map((q) => q.id))]).filter((id) => !back.includes(id));
  return {
    crates: crates.length, shown, newCrates: crates.slice(0, shown).map((c) => holdsNewSpecies(st, c)),
    plates: { max: pr ? pr.smax : 0, whole: pr ? Math.max(0, pr.shield - mended) : 0, mended },
    broke: !!(r && r.mend && r.mend.broke), back, leaving,
  };
}

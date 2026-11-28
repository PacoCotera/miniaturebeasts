// Where a pod may lie in a region, and the shed pod of a returned mibi's line. The world G and the saved game S are handed in; nothing here changes them.
import { L, cxy, cheb, groundName, passableIn } from "../world.mjs";
import { reachCellsIn } from "./map-rules.mjs";

// A cell a pod may be buried in: passable land of the main component, no island, never a start, the gate, the deep or the swim cell, and holding no buried pod yet.
export function podSite(G, c, buried) { return !G.spawns.includes(c) && c !== G.gate && c !== G.deep && c !== G.swim && !G.island[c] && G.land[c] !== L.WATER && G.comp[c] === 1 && passableIn(G, c) && !buried.some(p => p.k === String(c)); }

// The cell of a line's shed pod: the nearest pod site to the start within reach (Chebyshev, ties by lower index) whose ground is the record's (g), else the nearest pod site. null when no cell is fit.
// opts: what the partner can cross (the reach's own).
export function shedCell(G, cell, range, pods, g, opts) {
  const s0 = cxy(cell), buried = pods.filter(p => p.h === 1 && p.bur === 1), fit = reachCellsIn(G, cell, range, opts).sort((a, b) => a - b).filter(c => podSite(G, c, buried)), d = c => cheb(cxy(c), s0);
  const near = list => list.reduce((b, c) => (b == null || d(c) < d(b) ? c : b), null);
  return near(fit.filter(c => groundName(G.land[c], false) === g)) ?? near(fit);
}

// A shed pod is known once any pod of the Companion carries its record's id: in the region, in the hold, in a crate of the bay or in the expedition's cargo.
export function shedKnown(S, id) {
  const has = a => (a || []).some(p => p.shed === id);
  return has(S.pods) || has(S.hold && S.hold.pods) || S.bay.some(c => has(c.pods)) || has(S.exp && S.exp.cargo && S.exp.cargo.pods);
}

// What a pod keeps wherever it is copied: a shed pod its line, a wild one's own pod its mother.
export const shedOf = p => p.shed != null ? { shed: p.shed, of: p.of, genome: p.genome } : p.own != null ? { own: p.own, of: p.of } : {};

// The two shapes of a trait (station-walk-4, "a trait is a set or a scale"; build step 1): what a component needs to know, read only from the kind's rules (the species framework's loci and the frame's
// looks) and a mibi's genome. No per-trait table: which shape a trait is, its range, its ends and its looks all come from the engine.
//   - A SET: a few separate looks, nothing between; a mibi has exactly one (a switch, a pair map, a layout). Cards, one a look.
//   - A SCALE: one continuous range (a copy-mean locus whose alleles are numbers); a mibi can be anywhere on it. One bar.
// Both models are pure data: positions are 0..1 along the kind's own range (the pool the kind draws its copies from), never a count of steps.
//   scale { shape, id, name, ends: [low look, high look], mid, shows, copies: [a, b], others: [pos], rough }
//     shows  where she is (the mean of her two copies); copies the two she carries, each 0..1 (the engine stores both copies of a blend; a trait whose copies agree has both marks on one place)
//     others  where each of the player's other mibis is; rough a wide stretch [from, to] for "roughly known" (a pod's parent seen from afar), or null
//   set   { shape, id, name, looks: [{ look, shows, hidden, others, none }] }
//     shows the look she shows (gold); hidden the one look she carries and does not show (dashed blue rim); others how many of the player's other mibis show it; none true where no mibi of the player's shows or carries it (dashed rim)
import { LOCI, isContinuous, valueRange, copyValue, resolveCopies } from "../../species/framework/catalogue.mjs";
import { traitState } from "./genome.mjs";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// A trait's shape, from its locus: a continuous (numeric copy-mean) locus is a scale, anything else a set.
export function shapeOf(frame, trait) {
  if (trait.loci.length !== 1) return "set";
  const l = LOCI.get(trait.loci[0]);
  return l && isContinuous(l) ? "scale" : "set";
}

// The kind's range of a scale: the values its pool can reach (the catalogue's own range when the frame names no pool).
function rangeOf(frame, trait) {
  const id = trait.loci[0], locus = LOCI.get(id), pool = frame.pools?.[id];
  const [lo, hi] = valueRange(locus, pool && pool.length ? pool : undefined);
  return { locus, lo, hi };
}
const at = (lo, hi, v) => (hi > lo ? clamp01((v - lo) / (hi - lo)) : 0.5);

// Where a genome stands on a scale: its two copies and their mean (0..1 of the kind's range).
export function scalePlace(frame, trait, genome) {
  const { locus, lo, hi } = rangeOf(frame, trait), cs = genome.loci[trait.loci[0]];
  if (!Array.isArray(cs) || !cs.length) return null;
  const vals = (cs.length === 1 ? [cs[0], cs[0]] : cs).map((c) => copyValue(locus, c));
  return { copies: vals.map((v) => at(lo, hi, v)), shows: at(lo, hi, resolveCopies(locus, cs.length === 1 ? [cs[0], cs[0]] : cs)) };
}

// The words at the ends and the middle of a scale: the frame's looks, which run in order of value (describe.binLooks).
export function scaleEnds(trait) {
  const ls = trait.looks ?? [];
  if (!ls.length) return { ends: ["", ""], mid: "" };
  return { ends: [ls[0], ls[ls.length - 1]], mid: ls.length % 2 ? ls[(ls.length - 1) / 2] : "" };
}

// `others`: the genomes of the player's other mibis of the kind whose chapter is read; `rough`: a stretch [from, to] on 0..1, or null.
export function scaleModel(frame, trait, genome, others = [], rough = null) {
  const p = genome ? scalePlace(frame, trait, genome) : null, { ends, mid } = scaleEnds(trait);
  return { shape: "scale", id: trait.id, name: trait.name, ends, mid, shows: p ? p.shows : null, copies: p ? p.copies : null,
    others: others.map((g) => scalePlace(frame, trait, g)).filter(Boolean).map((q) => q.shows), rough: rough ? [clamp01(rough[0]), clamp01(rough[1])] : null };
}

export function setModel(frame, trait, genome, others = []) {
  const st = genome ? traitState(frame, trait, genome) : null, looks = trait.looks ?? [];
  const theirs = others.map((g) => traitState(frame, trait, g));
  return { shape: "set", id: trait.id, name: trait.name, looks: looks.map((look) => {
    const shows = !!st && st.shows === look, hidden = !!st && st.hides === look, n = theirs.filter((o) => o.shows === look || o.hides === look).length;
    return { look, shows, hidden, others: n, none: !shows && !hidden && n === 0 };
  }) };
}

// The one entry the screens use.
export function shapeModel(frame, trait, genome, others = [], rough = null) {
  return shapeOf(frame, trait) === "scale" ? scaleModel(frame, trait, genome, others, rough) : setModel(frame, trait, genome, others);
}

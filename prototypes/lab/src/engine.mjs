// The lab bench's thin layer on the real genetics engine (prototypes/species/framework), as lab-sim-1 used it (PR 412, tools/lab-sim/engine.mjs). Every genetic fact comes from the engine:
// draws from sampleIndividual, children from `children`, what a cross can give from `forecast`, kinship and direct kin from cross.mjs. Nothing here copies a rule.
// The frame is passed in (the page fetches species-S01.json; a node test reads the file), so this module runs in the browser and in node alike.
import { sampleIndividual, typeSpecimen } from "../../species/framework/species.mjs";
import { children, forecast, kinship, directKin, SELF_KINSHIP } from "../../species/framework/cross.mjs";
import { rng } from "../../species/framework/draws.mjs";

export { rng, SELF_KINSHIP, kinship, directKin };

// The two switch traits of the Loika frame the deduction is about. "on" is the pale copy (Markings: two copies show pale) and the crest copy (Crown: one copy shows).
export const TRAITS = {
  M: { locus: "appearance.marking-switch", trait: "markings" },
  C: { locus: "anatomy.crown-presence", trait: "crown" },
};
// The three blends: [locus, the allele that reads as the second word]. Eyes: huge = wide; Drive: high cycle rate = bursts; Efficiency: high = thrifty.
export const BLENDS = {
  E: { locus: "growth.exterior-eye-size-ratio", hi: "huge" },
  D: { locus: "movement.cycle-rate", hi: "high" },
  F: { locus: "energy.action-efficiency", hi: "high" },
};
export const P_ON = { M: 0.35, C: 0.5 };   // wild alleles drawn per copy (the sim's setting)

export const countOn = (genome, T) => genome.loci[TRAITS[T].locus].filter((c) => c === "on").length;
export const blendHi = (genome, B) => genome.loci[BLENDS[B].locus].some((c) => c === BLENDS[B].hi);
const pairOf = (n) => (n === 0 ? ["off", "off"] : n === 1 ? ["off", "on"] : ["on", "on"]);

// A wild Loika's genome: the engine's own draw, then the two switch loci at the population shares (the frame's Markings pool holds only "on": every new Loika is marked; the "off" copy is legal for
// inheritance, frame.legacy, so a recessive pale is drawn here, as the sim did).
export function drawGenome(frame, r, origin) {
  const g = sampleIndividual(frame, r, origin);
  for (const T of ["M", "C"]) g.loci[TRAITS[T].locus] = [r() < P_ON[T] ? "on" : "off", r() < P_ON[T] ? "on" : "off"];
  return g;
}

// What a cross of parents holding na and nb "on" copies can give, by the engine's forecast: the chance of a child with 0, 1, 2 "on" copies.
const memo = new Map();
export function outcomes(frame, T, na, nb, k) {
  const key = `${frame.species.id}|${T}|${na}|${nb}|${Math.round(k * 1e6)}`;
  let out = memo.get(key);
  if (out) return out;
  const mk = (n) => { const g = typeSpecimen(frame); g.loci[TRAITS[T].locus] = pairOf(n); g.origin = { kind: "random" }; return g; };
  const fc = forecast(frame, mk(na), mk(nb), { kinship: k });
  const t = fc.traits.find((x) => x.trait === TRAITS[T].trait);
  out = [0, 0, 0];
  for (const s of t.seeds) out[s.copies.filter((c) => c === "on").length] += s.weight;
  memo.set(key, out);
  return out;
}

// One child of two records, built and validated by the engine; null when the body does not build.
export function crossChild(frame, a, b, r, lookup) {
  const res = children(frame, a, b, 1, { rng: r, lookup });
  return res.children.length ? res.children[0].genome : null;
}
export const kinOf = (a, b, lookup) => kinship(a, b, lookup);
export const refuses = (a, b, lookup) => directKin(a, b, lookup) !== null;

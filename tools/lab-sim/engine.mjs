// lab-sim-1: the thin layer between the simulator and the real genetics engine
// (prototypes/species/framework). Every genetic fact here comes from the engine: draws from
// sampleIndividual, children from cross/children, the pod from shedPod, kinship and direct kin from
// cross.mjs, and what a cross can give (for the Station's deduction) from forecast. Nothing copies a rule.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sampleIndividual, typeSpecimen } from "../../prototypes/species/framework/species.mjs";
import { cross, children, forecast, kinship, directKin, shedPod, SELF_KINSHIP } from "../../prototypes/species/framework/cross.mjs";
import { rng } from "../../prototypes/species/framework/draws.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FRAME = JSON.parse(readFileSync(path.resolve(here, "../../prototypes/species/frames/species-S01.json"), "utf8"));
export { rng, SELF_KINSHIP, kinship, directKin };

// The two switch traits of the Loika frame the deduction is about.
export const TRAITS = {
  M: { locus: "appearance.marking-switch", trait: "markings", on: "pale" },   // pale needs two copies (recessive)
  C: { locus: "anatomy.crown-presence", trait: "crown", on: "crest" },        // one copy shows (dominant)
};
export const BLENDS = { E: "growth.exterior-eye-size-ratio", D: "movement.cycle-rate", F: "energy.action-efficiency" };

export const countOn = (genome, T) => genome.loci[TRAITS[T].locus].filter((c) => c === "on").length;
const pairOf = (n) => (n === 0 ? ["off", "off"] : n === 1 ? ["off", "on"] : ["on", "on"]);

// A genome of a wild Loika: the engine's own draw, then the two switch loci drawn at the population
// frequencies (the frame's Markings pool holds only "on": every new Loika is marked; the version-3
// "off" copy is legal for inheritance, frame.legacy, so a recessive pale is drawn here).
export const P_ON = { M: 0.35, C: 0.5 };
export function drawGenome(r, origin) {
  const g = sampleIndividual(FRAME, r, origin);
  for (const T of ["M", "C"]) g.loci[TRAITS[T].locus] = [r() < P_ON[T] ? "on" : "off", r() < P_ON[T] ? "on" : "off"];
  return g;
}

// What a cross of parents holding n_a and n_b "on" copies can give, by the engine's own forecast
// (the four pairings and the kinship penalty): probability of a child with 0, 1, 2 "on" copies.
const memo = new Map();
export function outcomes(T, na, nb, k) {
  const key = `${T}|${na}|${nb}|${Math.round(k * 1e6)}`;
  let out = memo.get(key);
  if (out) return out;
  const mk = (n) => { const g = typeSpecimen(FRAME); g.loci[TRAITS[T].locus] = pairOf(n); g.origin = { kind: "random" }; return g; };
  const fc = forecast(FRAME, mk(na), mk(nb), { kinship: k });
  const t = fc.traits.find((x) => x.trait === TRAITS[T].trait);
  out = [0, 0, 0];
  for (const s of t.seeds) out[s.copies.filter((c) => c === "on").length] += s.weight;
  memo.set(key, out);
  return out;
}

// One child of two records, built and validated by the engine; null when the body does not build.
export function crossChild(a, b, r, lookup) {
  const res = children(FRAME, a, b, 1, { rng: r, lookup });
  return res.children.length ? res.children[0].genome : null;
}
export const podOf = (rec, r) => shedPod(FRAME, rec, { rng: r });
export const kinOf = (a, b, lookup) => kinship(a, b, lookup);
export const refuses = (a, b, lookup) => directKin(a, b, lookup) !== null;
export { cross };

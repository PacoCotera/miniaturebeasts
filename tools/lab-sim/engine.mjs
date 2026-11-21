// lab-sim-1: the thin layer between the simulator and the real genetics engine
// (prototypes/species/framework). Every genetic fact here comes from the engine: draws from
// sampleIndividual, children from cross/children, the pod from shedPod, kinship and direct kin from
// cross.mjs, and what a cross can give (for the Station's deduction) from forecast. Nothing copies a rule.
// gdd-bot-round-1: the frame is switchable (useFrame): the Loika frame (default, exactly as lab-sim-1) or the test
// frame of ten traits of frames.mjs, which adds a second one-copy look (C2, the muzzle) to the traits the lab reads.
import { children, kinship, directKin, shedPod, SELF_KINSHIP, cross } from "../../prototypes/species/framework/cross.mjs";
import { rng } from "../../prototypes/species/framework/draws.mjs";
import { LOIKA, TEST, P_ON as FRAME_P_ON } from "./frames.mjs";

export const FRAME = LOIKA.fr;
export { rng, SELF_KINSHIP, kinship, directKin };

let CUR = LOIKA;
export const currentFrame = () => CUR;

// The switch traits of the frame the lab game reads: pale (needs two copies), crown (one copy shows), and on the test frame the muzzle.
export const TRAITS = {
  M: { locus: "appearance.marking-switch", trait: "markings", on: "pale" },   // pale needs two copies (recessive)
  C: { locus: "anatomy.crown-presence", trait: "crown", on: "crest" },        // one copy shows (dominant)
};
export const BLENDS = { E: "growth.exterior-eye-size-ratio", D: "movement.cycle-rate", F: "energy.action-efficiency" };
export function useFrame(F) {
  CUR = F;
  if (F === TEST) TRAITS.C2 = { locus: "anatomy.muzzle-presence", trait: "muzzle", on: "muzzle" };
  else delete TRAITS.C2;
  memo.clear();
}
export const traitKeys = () => Object.keys(TRAITS);
export const dominantKeys = () => traitKeys().filter((T) => T !== "M");

export const countOn = (genome, T) => genome.loci[TRAITS[T].locus].filter((c) => c === "on").length;

// A genome of a wild one: the engine's own draw, then the switch loci drawn at the population frequencies.
export const P_ON = FRAME_P_ON;
export function drawGenome(r, origin) { return CUR.draw(r, origin); }

// What a cross of parents holding n_a and n_b "on" copies can give, by the engine's own forecast
// (the four pairings and the kinship penalty): probability of a child with 0, 1, 2 "on" copies.
const memo = new Map();
export function outcomes(T, na, nb, k) {
  const key = `${CUR.name}|${T}|${na}|${nb}|${Math.round(k * 1e6)}`;
  let out = memo.get(key);
  if (out) return out;
  out = CUR.outcomes(T, na, nb, k);
  memo.set(key, out);
  return out;
}

// One child of two records, built and validated by the engine; null when the body does not build.
// (The test frame has no body to build: its child is the engine's cross.)
export function crossChild(a, b, r, lookup) {
  if (CUR === TEST) return cross(CUR.fr, a, b, { rng: r, lookup });
  const res = children(FRAME, a, b, 1, { rng: r, lookup });
  return res.children.length ? res.children[0].genome : null;
}
// The pod of a returned or wild one: the engine's shedPod on the Loika frame; on the test frame the engine's cross of the
// mibi with a clone of itself at SELF_KINSHIP (shedPod's own draw, minus its body check, which needs a built species).
export function podOf(rec, r) {
  if (CUR !== TEST) return shedPod(FRAME, rec, { rng: r });
  const twin = { id: -rec.id, genome: rec.genome, parents: [] };
  const g = cross(CUR.fr, rec, twin, { rng: r, kinship: SELF_KINSHIP });
  g.origin = { ...g.origin, kind: "shed", parentIds: [rec.id, rec.id] };
  return g;
}
export const kinOf = (a, b, lookup) => kinship(a, b, lookup);
export const refuses = (a, b, lookup) => directKin(a, b, lookup) !== null;
export { cross };

// The pairing screen's rules (station step 8; owner 2026-11-22 10:4x, the line game's aim). No DOM and no state.mjs: plain functions over mibi records
// ({ id, genome }) and the species frame, so the screen's props, the tests and the B0 check read the same numbers. Every genetic fact is the engine's:
// copies are the two entries of a locus on a genome, a young takes one copy of each parent at random (cross.mjs), vigour is vigour.mjs's. Nothing here keeps a rule of its own.
//
// The aim is the line game's two hidden traits: a marking (the Markings switch: the look shows on two "on" copies) and the eyes (a step of the scale, shown by the mean of two copies, so a pair of
// unequal copies can show a step without holding it). It is shown as a target look none of the starting mibis show. Per mibi, per aim trait, the count is how many of its two copies are on the aim (0, 1, 2).
// The pair's chance for a young to hold a trait on both copies is (copies of one parent / 2) x (copies of the other / 2): the four pairings of the screen. Both together is the product of the two.
// The pin (the player choosing their own aim) is P1's and is not built: `pin` is its named place, always null here.
import { LOCI, copyValue, scaleSteps } from "../../species/framework/catalogue.mjs";
import { blendRange } from "../../species/framework/cross.mjs";
import { vigourOfF, VIGOUR_SLOPE, VIGOUR_FLOOR } from "../../species/framework/vigour.mjs";

export const MARKING = "appearance.marking-switch";
export const EYES = "growth.exterior-eye-size-ratio";
const EPS = 1e-7;
// the aim never asks for a step lower than the fourth of the seven (as the rounds' aim: a low step is nothing to aim for)
const MIN_STEP = 3;

const copiesOf = (m, id) => m?.genome?.loci?.[id] ?? [];
const frameLocus = (frame, id) => frame.loci.find((l) => l.id === id);
export const eyeSteps = (frame) => scaleSteps(LOCI.get(EYES), blendRange(frame, frameLocus(frame, EYES)));

// The aim for a household, or null when it has none to offer (the frame lacks a trait, or no founder carries it): a marking at "on" and an eye step, chosen so that nobody shows it yet and at least two
// copies of each are carried (else it can never be bred): the eye step is the highest at least two copies hold that no mibi holds on both copies.
export function makeAim(frame, mibis) {
  if (!frameLocus(frame, MARKING) || !frameLocus(frame, EYES)) return null;
  const mk = mibis.reduce((s, m) => s + copiesOf(m, MARKING).filter((c) => c === "on").length, 0);
  if (mk < 2 || mibis.some((m) => copiesOf(m, MARKING).length === 2 && copiesOf(m, MARKING).every((c) => c === "on"))) return null;
  const steps = eyeSteps(frame), held = new Map(), both = new Set(), locus = LOCI.get(EYES);
  for (const m of mibis) {
    const vs = copiesOf(m, EYES).map((c) => copyValue(locus, c));
    for (const v of vs) held.set(v, (held.get(v) ?? 0) + 1);
    if (vs.length === 2 && Math.abs(vs[0] - vs[1]) < EPS) both.add(vs[0]);
  }
  let best = null;
  steps.forEach((s, i) => { if ((held.get(s) ?? 0) >= 2 && i >= MIN_STEP && ![...both].some((b) => Math.abs(b - s) < EPS)) best = { step: s, idx: i, of: steps.length }; });
  if (!best) return null;
  return { traits: [{ id: MARKING, kind: "set", look: "on" }, { id: EYES, kind: "scale", ...best }], pin: null };
}

// How many of a mibi's two copies are on the aim at one trait: 0, 1 or 2.
export function copyCount(aim, trait, m) {
  const cs = copiesOf(m, trait.id);
  if (trait.kind === "set") return cs.filter((c) => c === trait.look).length;
  const locus = LOCI.get(trait.id);
  return cs.filter((c) => Math.abs(copyValue(locus, c) - trait.step) < EPS).length;
}
export const countsOf = (aim, m) => aim.traits.map((t) => copyCount(aim, t, m));
export const heldTwice = (aim, m) => countsOf(aim, m).every((n) => n === 2);   // two of two on both traits

// The pair's chance for a young to hold each trait on both copies, and both together (the engine passes one copy of each parent at random; no mutation). Exact fractions of four: n/4 each.
export function chances(aim, a, b) {
  const per = aim.traits.map((t) => copyCount(aim, t, a) * copyCount(aim, t, b));   // in quarters of quarters: x/4
  const each = per.map((q) => q / 4), both = each.reduce((x, y) => x * y, 1);
  return { each, both, quarters: per };
}
// "1 in 2", "1 in 4", "1 in 16", "never", "always": the chance as the screen says it, only where it is a clean fraction.
export function inWords(p) {
  if (p <= 0) return "never"; if (p >= 1) return "always";
  const n = Math.round(1 / p); return Math.abs(1 / n - p) < 1e-9 ? `1 in ${n}` : `${Math.round(p * 100)} in 100`;
}

// Done reads when two mibis that may pair (the caller says who may) both hold two of two on both traits.
export function done(aim, mibis, mayPair) {
  const fixed = mibis.filter((m) => heldTwice(aim, m));
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) if (mayPair(fixed[i], fixed[j])) return { a: fixed[i], b: fixed[j] };
  return null;
}

// The kin and vigour line, in the engine's numbers: how related the pair is (F, the kinship the engine counts) and what it costs in vigour for the young (1 - 1.6F, floor 0.5).
export function kinLine(F) {
  const k = Math.max(0, F || 0), v = vigourOfF(k);
  return { kinship: k, vigour: v, costs: v < 1, atFloor: v <= VIGOUR_FLOOR + 1e-9, slope: VIGOUR_SLOPE };
}
// The young's vigour in one word, as the page keeps it (the engine's number said once): full at 1, otherwise lower down to the floor.
export const vigourWord = (v) => (v >= 0.995 ? "full" : v > VIGOUR_FLOOR + 1e-9 ? "lower" : "lowest");

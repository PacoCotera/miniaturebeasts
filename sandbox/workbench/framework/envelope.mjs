// The cute envelope: rules that hold for every species and every open locus value, so that no genome
// expression leaves the shape a pet reads as (the owner's decision 2026-10-08: the rig is structure
// and proportion; it is calibrated to the accepted art, with Pip's measures as one calibration point,
// not the target). Each rule is a clamp or a derived ratio in the rig (rig.mjs reads these helpers),
// or a pool bound in the frames (species.mjs), and is recorded here with its reason.
import { KINDS } from "./proportions.mjs";

export const ENVELOPE_VERSION = "mb-envelope/1";

export const RULES = [
  { id: "E1", rule: "Body roundness: every region's section is an ellipse (cross exponent 2), never a rounded square; a region is at most twice as long as its larger cross radius and at least 0.85 of it.", where: "rig: regionRadii, primary()", reason: "a block or a log is not a pet; Pip's body is 0.92 as tall as it is long" },
  { id: "E2", rule: "Head floor: each head radius is at least 0.36 of the body's matching cross radius (the head is scaled up uniformly until it is).", where: "rig: headR", reason: "a head under a third of the body reads as a lizard or an insect, not a pet; Pip's is two thirds, the otter's and the raccoon's a third" },
  { id: "E3", rule: "Eye floors: the eye radius is at least 0.30 of the head's smaller cross radius; the eyes sit at least 0.45 of the head's half width apart and between the head's middle and a quarter above it.", where: "rig: eye placement", reason: "small or high-set eyes read as a reptile; Pip's rings are 0.43 of the head's height, set wide at its middle" },
  { id: "E4", rule: "Muzzle cap by kind: the muzzle's projection is at most 0.65 of the head's half length, or 1.0 for a long-muzzled kind (proportions.mjs KINDS muzzle ≥ 0.45: the lizard, the fox, the deer); its depth is at least 0.3 of the head's half depth. A beak is at most 1.2 head lengths.", where: "rig: muzzle, beak", reason: "a snout longer than the head is a crocodile; a thin snout is a stick" },
  { id: "E5", rule: "Limb caps: a leg's radius is between 0.12 and 0.45 of the body's smaller cross radius; its drop is between 0.2 and 1.2 of the body's depth.", where: "rig: legs", reason: "stick legs and tree-trunk legs both leave the pet; legs longer than the body are a stork" },
  { id: "E6", rule: "Foot floor: a foot is at least 1.15 leg radii long and 0.4 of its length deep, and at most 0.35 of the body's half length.", where: "rig: terminal()", reason: "a foot a leg can stand on; a paw smaller than the leg reads as a hoof on a stick" },
  { id: "E7", rule: "Crest and ear parts are soft sheets: a pointed or leaf crown is a leaf sheet, never a pyramid; a rounded crown is an ellipsoid; ears are sheets.", where: "rig: crown, ears", reason: "spikes read as armour; Pip's crest is three leaves" },
  { id: "E9", rule: "A wing pair at rest is part of the body outline: each blade lies tucked along its flank from the shoulder ridge down to the body's widest line and back to the body's end (a little past it at most), the hind pair under the fore pair; never a plane standing out from the thorax, never a plank reaching past the abdomen.", where: "rig: flaps at rest (plans with flapRest flat); the controls and the painting prompt's plan line", reason: "a plane reads as a board with legs in the portrait and the token, and a wing that stands out from the body is a wing the painter re-lays or spreads; a wing inside the body outline leaves nothing to spread" },
  { id: "E8", rule: "Pool bounds: an open head-ratio trait never offers the tiny alleles outside the turtle's clan (C11); an open leg-bulk trait on a legged plan never offers fine legs.", where: "frames: species.mjs pools", reason: "the rig's clamps keep the shape, but a pool should not offer what the clamp will undo: the player would see no difference" },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// E1
export const REGION_LENGTH_MAX = 2.0, REGION_LENGTH_MIN = 0.85;
export function clampRegionLength(radii) {
  const cross = Math.max(radii[1], radii[2]);
  radii[0] = clamp(radii[0], REGION_LENGTH_MIN * cross, REGION_LENGTH_MAX * cross);
  return radii;
}
// E2
export const HEAD_FLOOR = 0.36;
export function clampHead(headR, rootRadii) {
  const need = Math.max(HEAD_FLOOR * rootRadii[1] / headR[1], HEAD_FLOOR * rootRadii[2] / headR[2], HEAD_FLOOR * rootRadii[1] / headR[0]);
  return need > 1 ? headR.map((r) => r * need) : headR;
}
// E3
export const EYE_RADIUS_FLOOR = 0.3, EYE_SET_FLOOR = 0.45, EYE_HEIGHT = [-0.1, 0.25];
export function clampEye(r, y, z, headR) {
  const m = Math.min(headR[1], headR[2]);
  return { r: Math.max(r, EYE_RADIUS_FLOOR * m), y: Math.sign(y) * Math.max(Math.abs(y), EYE_SET_FLOOR * headR[1]), z: clamp(z, EYE_HEIGHT[0] * headR[2], EYE_HEIGHT[1] * headR[2]) };
}
// E4
export const MUZZLE_CAP = 0.65, MUZZLE_CAP_LONG = 1.0, MUZZLE_DEPTH_FLOOR = 0.3, BEAK_CAP = 1.2;
export const longMuzzled = (species) => (KINDS[species]?.muzzle ?? 0) >= 0.45;
export function clampMuzzle(proj, species) { return Math.min(proj, longMuzzled(species) ? MUZZLE_CAP_LONG : MUZZLE_CAP); }
// E5
export const LEG_RADIUS = [0.12, 0.45], LEG_DROP = [0.2, 1.2];
export function clampLeg(radius, drop, rootRadii) {
  const m = Math.min(rootRadii[1], rootRadii[2]);
  return { radius: clamp(radius, LEG_RADIUS[0] * m, LEG_RADIUS[1] * m), drop: clamp(drop, LEG_DROP[0] * 2 * rootRadii[2], LEG_DROP[1] * 2 * rootRadii[2]) };
}
// E6
export const FOOT_OVER_LEG = 1.15, FOOT_DEPTH = 0.4, FOOT_CAP = 0.35;
export function clampFoot(tr, legRadius, L) {
  const rx = clamp(Math.max(tr[0], FOOT_OVER_LEG * legRadius), 0, FOOT_CAP * L);
  const scale = rx / tr[0];
  return [rx, tr[1] * scale, Math.max(tr[2] * scale, FOOT_DEPTH * rx)];
}
// E8
export function poolBound(id, alleles, { clan, limbSet } = {}) {
  if (/^growth\.head-(length|width|depth)-ratio$/.test(id) && clan !== "C11") return alleles.filter((a) => a !== "tiny");
  if (id === "growth.support-radius-ratio" && limbSet === "legs") return alleles.filter((a) => a !== "fine");
  return alleles;
}

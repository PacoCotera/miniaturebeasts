// Proportions by kind. The taxonomy says what each roster species resembles; from that animal an
// artist takes a handful of measures in side view (body length to depth, head to body, leg to body
// depth, neck, tail length and thickness, ear height, set and width, muzzle length). Here each measure
// becomes the rig ratio that draws it (rig.mjs volume conventions) and then the copies of the locus
// that carries that ratio: the species' proportions live in its genome, not in a drawing convention.
// Where the species keeps the trait closed the copies are locked; where it opens the trait they are
// the type specimen's typical copies and the pool still varies round them.
//
// The measures are the animal's, rounded toward the toy proportions of the style guide (bigger
// heads, shorter legs, fuller bodies), as fractions:
//   depth  body depth over body length (trunk, no head)      width  body width over body length
//   head   head length over body length                       shape  head shape: round, long, or mid
//   lift   head centre above the body axis: low, mid, high    neck   neck length over head length
//   legs   leg length over body depth                         legR   leg thickness over body depth
//   tail   tail length over body length                       tailR  tail thickness over body depth
//   waist  the join between body regions over body depth: thin (a wasp waist), mid, thick (one body with a dip)
//   mass   where the body mass sits over its regions: even, central, anterior
//   form   a region's longitudinal form: ovoid (an egg), barrel (blends with its neighbours), tapered (a pear)
//   carry  how the tail is carried: down, level, up            stance legs under the body (narrow) or out to the sides (wide)
//   ears   ear height over head height; set 0 side … 1 crown; earW ear width over ear height
//   muzzle muzzle length over head length; muzzleW narrow or broad
//   eyes   small or big; eyeSet close or wide
//   wings  big or small (span and chord)                       antennae long or short
//   fur    how far the fur reaches: body, tail (a brush), ears   crest  crest height over head height
//   back   the back line: dipping, level, arched                 horns  straight or curled
// A measure a species has no part for is left out (no ears on a bird, no legs on a slug), and a locus
// the plan does not carry is simply not in its genome.
import { LOCI } from "./catalogue.mjs";

const GIRTH = 1.35, HEAD = 1.15, LEG = 1.6; // rig.mjs volume conventions

export const KINDS = {
  S01: { resembles: "a round frog-hare", stance: "narrow", depth: 0.72, width: 0.68, head: 0.5, shape: "round", lift: "low", legs: 0.45, legR: 0.2, muzzle: 0.25, muzzleW: "broad", eyes: "big", eyeSet: "wide" },
  S02: { resembles: "a puffball under a cap", head: 0.3, shape: "round", lift: "low", eyes: "big", eyeSet: "wide" },
  S03: { resembles: "a lizard with a lantern tail", crest: 0.4, mass: "even", carry: "up", stance: "wide", waist: "mid", depth: 0.34, width: 0.4, head: 0.36, shape: "mid", lift: "low", neck: 0.2, legs: 0.55, legR: 0.16, tail: 1.2, tailR: 0.14, muzzle: 0.5, muzzleW: "broad", eyes: "small", eyeSet: "wide" },
  S04: { resembles: "a cat", fur: "body", mass: "even", carry: "up", stance: "narrow", waist: "thick", depth: 0.55, width: 0.42, head: 0.42, shape: "round", lift: "mid", neck: 0.25, legs: 1.0, legR: 0.22, tail: 0.95, tailR: 0.13, ears: 0.48, set: 0.9, earW: 0.5, muzzle: 0.22, muzzleW: "broad", eyes: "big", eyeSet: "wide" },
  S05: { resembles: "a fox", fur: "tail", mass: "even", carry: "level", stance: "narrow", waist: "thick", depth: 0.46, width: 0.36, head: 0.4, shape: "long", lift: "mid", neck: 0.35, legs: 1.05, legR: 0.18, tail: 1.05, tailR: 0.3, ears: 0.9, set: 0.9, earW: 0.5, muzzle: 0.5, muzzleW: "narrow", eyes: "small", eyeSet: "close" },
  S06: { resembles: "a raccoon", fur: "tail", mass: "central", carry: "down", stance: "narrow", waist: "thick", depth: 0.5, width: 0.44, head: 0.36, shape: "mid", lift: "low", neck: 0.15, legs: 0.75, legR: 0.22, tail: 0.5, tailR: 0.24, ears: 0.3, set: 0.3, earW: 0.75, muzzle: 0.42, muzzleW: "narrow", eyes: "big", eyeSet: "close" },
  S07: { resembles: "a badger or small bear", fur: "body", stance: "narrow", depth: 0.62, width: 0.6, head: 0.32, shape: "mid", lift: "low", legs: 0.65, legR: 0.3, ears: 0.3, set: 0.4, earW: 0.8, muzzle: 0.42, muzzleW: "broad", eyes: "small", eyeSet: "wide" },
  S08: { resembles: "a goat or deer", horns: "straight", fur: "body", mass: "even", carry: "up", stance: "narrow", waist: "thick", depth: 0.44, width: 0.34, head: 0.34, shape: "long", lift: "high", neck: 0.9, legs: 1.5, legR: 0.14, tail: 0.3, tailR: 0.08, ears: 0.45, set: 0.2, earW: 0.5, muzzle: 0.65, muzzleW: "narrow", eyes: "small", eyeSet: "wide" },
  S09: { resembles: "a big bird", crest: 0.55, wings: "big", mass: "central", carry: "level", stance: "narrow", waist: "thick", depth: 0.55, width: 0.5, head: 0.28, shape: "round", lift: "high", neck: 0.9, legs: 1.1, legR: 0.1, tail: 0.55, tailR: 0.22, eyes: "small", eyeSet: "wide" },
  S10: { resembles: "an otter", fur: "body", form: "barrel", mass: "anterior", carry: "level", stance: "narrow", waist: "thick", depth: 0.3, width: 0.34, head: 0.26, shape: "mid", lift: "low", neck: 0.25, legs: 0.5, legR: 0.2, tail: 0.6, tailR: 0.28, ears: 0.14, set: 0.1, earW: 0.8, muzzle: 0.5, muzzleW: "broad", eyes: "small", eyeSet: "wide" },
  S11: { resembles: "a turtle", stance: "wide", depth: 0.5, width: 0.64, head: 0.2, shape: "long", lift: "low", neck: 0.5, legs: 0.5, legR: 0.3, muzzle: 0.3, muzzleW: "broad", eyes: "small", eyeSet: "wide" },
  S12: { resembles: "a moth or butterfly", wings: "big", antennae: "long", mass: "even", stance: "wide", waist: "thin", depth: 0.34, width: 0.34, head: 0.26, shape: "round", lift: "low", neck: 0.1, legs: 0.45, legR: 0.06, eyes: "big", eyeSet: "wide" },
  S13: { resembles: "a beetle", back: "level", antennae: "short", mass: "central", stance: "wide", waist: "thick", form: "barrel", depth: 0.55, width: 0.6, head: 0.26, shape: "mid", lift: "low", neck: 0.1, legs: 0.35, legR: 0.1, eyes: "small", eyeSet: "wide" },
  S14: { resembles: "a slug", antennae: "long", form: "barrel", mass: "anterior", waist: "thick", depth: 0.4, width: 0.44, head: 0.3, shape: "round", lift: "low", eyes: "small", eyeSet: "wide" },
  S15: { resembles: "a walking plant", stance: "wide", head: 0.3, shape: "round", lift: "low", legs: 0.7, legR: 0.12, eyes: "big", eyeSet: "wide" },
  S16: { resembles: "a wisp of lightning", mass: "even", waist: "thin", depth: 0.34, width: 0.3, head: 0.3, shape: "long", lift: "mid", neck: 0.3, eyes: "big", eyeSet: "close" },
};

// The rig ratios the measures ask for (null where the measure is absent).
export function rigTargets(k) {
  const t = {};
  const rz = k.depth !== undefined ? k.depth / GIRTH : null; // body depth = 2·GIRTH·rz·L over body length 2L
  if (k.width !== undefined) t["growth.core-width-ratio"] = k.width / GIRTH;
  if (rz !== null) t["growth.core-depth-ratio"] = rz;
  if (k.head !== undefined) t["growth.head-length-ratio"] = k.head / HEAD; // head length 2·HEAD·ratio·L over 2L
  if (k.shape) { t["growth.head-width-ratio"] = { round: 0.46, mid: 0.39, long: 0.31 }[k.shape]; t["growth.head-depth-ratio"] = { round: 0.5, mid: 0.43, long: 0.36 }[k.shape]; } // HEAD 1.15 sits on top
  if (k.lift) t["growth.head-lift-ratio"] = { low: 0.5, mid: 0.61, high: 0.72 }[k.lift];
  if (k.neck !== undefined) t["structure.join-neck-ratio"] = 0.65 + 0.3 * Math.min(1, k.neck); // rig: 0.3…0.8 of the join extent
  const depthL = rz !== null ? 2 * GIRTH * rz : 1; // body depth over L
  if (k.legs !== undefined) t["growth.support-drop-ratio"] = k.legs * depthL; // drop over L
  if (k.legR !== undefined) t["growth.support-radius-ratio"] = (k.legR * depthL) / LEG;
  if (k.tail !== undefined) t["growth.axial-tail-length-ratio"] = 2 * k.tail; // over L, half the body length
  if (k.tailR !== undefined) t["growth.axial-tail-width-ratio"] = (k.tailR * depthL) / (1.5 * Math.min(t["growth.core-width-ratio"] ?? 0.45, rz ?? 0.5) * GIRTH);
  if (k.mass) t["development.regional-growth"] = k.mass; // categorical: one allele, homozygous
  if (k.form) t["anatomy.region-longitudinal-form"] = k.form;
  if (k.carry) t["growth.axial-tail-bend"] = { down: -0.6, level: 0, up: 0.6 }[k.carry];
  if (k.stance) t["growth.support-splay-ratio"] = k.stance === "wide" ? 0.7 : 0.07;
  if (k.waist) t["growth.join-throat-ratio"] = { thin: 0.3, mid: 0.525, thick: 0.75 }[k.waist];
  if (k.ears !== undefined) t["growth.auricular-length-ratio"] = (2 * k.ears) / 1.3; // over the head's half height, the rig's 1.3 on top
  if (k.set !== undefined) t["growth.auricular-set-ratio"] = 0.78 - 0.36 * k.set;
  if (k.earW !== undefined) t["growth.auricular-width-ratio"] = k.earW;
  if (k.muzzle !== undefined) t["growth.muzzle-projection-ratio"] = 0.58 + 1.2 * (k.muzzle - 0.25); // a 0.25 muzzle is the short allele; the snout protrudes 1.5·rx − 0.15·headRx
  if (k.wings) { t["growth.wing-span-ratio"] = k.wings === "big" ? 1.5 : 0.8; t["growth.wing-chord-ratio"] = k.wings === "big" ? 0.85 : 0.45; }
  if (k.antennae) t["growth.antenna-length-ratio"] = k.antennae === "long" ? 1.5 : 0.7;
  if (k.fur) t["appearance.fur-reach"] = k.fur; // categorical: body, tail (a bushy tail) or ears
  if (k.back) t["growth.region-bend"] = { dipping: -0.6, level: 0, arched: 0.6 }[k.back];
  if (k.horns) t["growth.horn-curl"] = k.horns === "straight" ? 0.2 : 1.4;
  if (k.crest !== undefined) t["growth.crown-height-ratio"] = 2 * k.crest; // crest height over the head's half height
  if (k.muzzleW) t["growth.muzzle-width-ratio"] = k.muzzleW === "broad" ? 0.69 : 0.62;
  if (k.eyes) t["growth.exterior-eye-size-ratio"] = k.eyes === "big" ? 0.32 : 0.24;
  if (k.eyeSet) t["growth.exterior-eye-spacing-ratio"] = k.eyeSet === "wide" ? 0.55 : 0.4;
  return t;
}

// The copy pair of a copy-mean locus closest to a target value: homozygous or a mixed pair.
export function nearestPair(id, target) {
  const locus = LOCI.get(id);
  if (!locus) throw new Error(`no locus ${id}`);
  const alleles = locus.alleles.filter((a) => typeof a.value === "number");
  let best = null, bestD = Infinity;
  for (let i = 0; i < alleles.length; i++) for (let j = i; j < alleles.length; j++) {
    const value = (alleles[i].value + alleles[j].value) / 2, d = Math.abs(value - target);
    if (d < bestD - 1e-12) { bestD = d; best = [alleles[i].id, alleles[j].id].sort(); }
  }
  return best;
}

// The locus copies a species' kind asks for: { locus: [copy, copy] }.
export function proportionPairs(id) {
  const k = KINDS[id];
  if (!k) return {};
  return Object.fromEntries(Object.entries(rigTargets(k)).map(([locus, target]) => [locus, typeof target === "number" ? nearestPair(locus, target) : [target, target]]));
}
